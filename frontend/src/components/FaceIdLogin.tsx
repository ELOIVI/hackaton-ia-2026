'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, X, AlertTriangle, Loader2, ScanFace } from 'lucide-react';
import * as faceapi from 'face-api.js';

interface FaceIdLoginProps {
  onSuccess: (faceDescriptor: Float32Array) => void;
  onCancel: () => void;
  userId?: string;
  mode: 'register' | 'login';
}

const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';
const FACE_DISTANCE_THRESHOLD = 0.55;
const SCAN_SAMPLES = 5;

function safeParseDescriptor(raw: string | Float32Array | number[] | null): Float32Array | null {
  if (!raw) return null;

  try {
    let parsed: number[];
    
    if (raw instanceof Float32Array) {
      return raw;
    } else if (Array.isArray(raw)) {
      parsed = raw.map((value) => Number(value));
    } else if (typeof raw === 'string') {
      parsed = JSON.parse(raw) as unknown as number[];
      if (!Array.isArray(parsed)) return null;
      parsed = parsed.map((value) => Number(value));
    } else {
      return null;
    }

    if (parsed.some((value) => Number.isNaN(value))) return null;
    return new Float32Array(parsed);
  } catch (err) {
    console.error('Error parsing descriptor:', err);
    return null;
  }
}

function euclideanDistance(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    console.error(`Descriptor length mismatch: ${a.length} vs ${b.length}`);
    return Infinity;
  }
  
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const diff = a[i] - b[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

function averageDescriptors(descriptors: Float32Array[]): Float32Array {
  if (descriptors.length === 0) {
    throw new Error('No descriptors to average');
  }

  const result = new Float32Array(descriptors[0].length);
  for (let i = 0; i < result.length; i++) {
    let sum = 0;
    for (const desc of descriptors) {
      sum += desc[i];
    }
    result[i] = sum / descriptors.length;
  }
  return result;
}

export default function FaceIdLogin({ onSuccess, onCancel, userId, mode }: FaceIdLoginProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [status, setStatus] = useState<'initializing' | 'scanning' | 'success' | 'error' | 'not-recognized'>('initializing');
  const [progressMsg, setProgressMsg] = useState('Preparant reconeixement facial...');
  const [learningProgress, setLearningProgress] = useState(0); 
  
  const isComponentMounted = useRef(true);
  const timeoutId = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanCount = useRef(0);
  const statusRef = useRef(status);
  const descriptorsRef = useRef<Float32Array[]>([]);
  const lastDetectionTime = useRef(0);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    isComponentMounted.current = true;
    const loadModels = async () => {
      try {
        setProgressMsg('Carregant models de detecció facial...');
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        
        if (isComponentMounted.current) {
          setProgressMsg('Models carregats! Iniciant càmera...');
          await startCamera();
        }
      } catch (err) {
        console.error("Error carregant models:", err);
        if (isComponentMounted.current) {
          setStatus('error');
          setProgressMsg('Error carregant models. Intenta més tard.');
        }
      }
    };
    loadModels();

    return () => { 
      isComponentMounted.current = false; 
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      if (videoRef.current && isComponentMounted.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(err => console.error("Play error:", err));
          setStatus('scanning');
          setProgressMsg(mode === 'register' ? 'Buscant rostre per registre...' : 'Buscant rostre per verificar...');
          descriptorsRef.current = [];
          detectLoop(); 
        };
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      if (isComponentMounted.current) {
        setStatus('error');
        setProgressMsg('No es pot accedir a la càmera. Comprova els permisos.');
      }
    }
  };

  const detectLoop = async () => {
    if (!videoRef.current || !canvasRef.current || !isComponentMounted.current) return;
    if (statusRef.current === 'success' || statusRef.current === 'error') return;

    try {
      const detection = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.SsdMobilenetv1Options({ minConfidence: 0.6 })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

      const canvas = canvasRef.current;
      const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
      
      if (displaySize.width > 0 && displaySize.height > 0) {
        faceapi.matchDimensions(canvas, displaySize);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }

        if (detection) {
          const resizedDetections = faceapi.resizeResults(detection, displaySize);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

          const faceDescriptor = detection.descriptor;

          if (mode === 'register') {
            handleRegisterMode(faceDescriptor);
          } else {
            await handleLoginMode(faceDescriptor);
          }
        } else {
          setProgressMsg('Si us plau, mira directament a la càmera...');
        }
      }
    } catch (e) {
      console.error("Error en la detecció:", e);
    }

    if (isComponentMounted.current) {

      timeoutId.current = setTimeout(() => {

        detectLoop().catch(console.error);

      }, 100);

    }

  };

  const handleRegisterMode = (faceDescriptor: Float32Array) => {
    const now = Date.now();
    if (now - lastDetectionTime.current < 300) return; // Throttle detections
    lastDetectionTime.current = now;

    if (descriptorsRef.current.length < SCAN_SAMPLES) {
      descriptorsRef.current.push(faceDescriptor);
      scanCount.current = (descriptorsRef.current.length / SCAN_SAMPLES) * 100;
      setLearningProgress(scanCount.current);
      setProgressMsg(`Capturant mostres... ${descriptorsRef.current.length}/${SCAN_SAMPLES}`);

      if (descriptorsRef.current.length === SCAN_SAMPLES) {
        const averagedDescriptor = averageDescriptors(descriptorsRef.current);
        setStatus('success');
        setProgressMsg('Rostre registrat correctament!');
        stopCamera();
        setTimeout(() => {
          if (isComponentMounted.current) {
            onSuccess(averagedDescriptor);
          }
        }, 1200);
      }
    }
  };

  const handleLoginMode = async (faceDescriptor: Float32Array) => {
    const now = Date.now();
    if (now - lastDetectionTime.current < 500) return; // Throttle detections
    lastDetectionTime.current = now;

    setProgressMsg('Rostre detectat. Verificant identitat...');
    
    try {
      if (!userId) {
        setProgressMsg('Error: ID d\'usuari no proporcionat.');
        setStatus('error');
        return;
      }

      const response = await fetch(`/api/user/${userId}/biometric`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          setProgressMsg('Aquesta persona no té rostre registrat. Registra\'t primer.');
          setStatus('not-recognized');
        } else {
          setProgressMsg('Error verificant identitat.');
          setStatus('error');
        }
        setTimeout(() => {
          if (!isComponentMounted.current || statusRef.current !== 'scanning') return;
          setStatus('scanning');
          setProgressMsg('Buscant rostre...');
        }, 2000);
        return;
      }

      const data = await response.json();
      const storedDescriptor = safeParseDescriptor(data.faceDescriptor);
      
      if (!storedDescriptor) {
        setProgressMsg('Error descodificant dades biomètriques.');
        setStatus('error');
        setTimeout(() => {
          if (!isComponentMounted.current || statusRef.current !== 'scanning') return;
          setStatus('scanning');
          setProgressMsg('Buscant rostre...');
        }, 2000);
        return;
      }

      const distance = euclideanDistance(storedDescriptor, faceDescriptor);
      console.log(`Face distance: ${distance} (threshold: ${FACE_DISTANCE_THRESHOLD})`);
      
      if (distance < FACE_DISTANCE_THRESHOLD) { 
        setStatus('success');
        setProgressMsg('Identitat verificada!');
        stopCamera();
        setTimeout(() => {
          if (isComponentMounted.current) {
            onSuccess(faceDescriptor);
          }
        }, 1200);
      } else {
        setProgressMsg('La cara no coincideix. Torna-ho a intentar.');
        setStatus('not-recognized');
        setTimeout(() => {
          if (!isComponentMounted.current || statusRef.current !== 'scanning') return;
          setStatus('scanning');
          setProgressMsg('Buscant rostre...');
        }, 2000);
      }
    } catch (error) {
      console.error("Error fetching biometric data:", error);
      setProgressMsg('Error de connexió. Intenta més tard.');
      setStatus('error');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    if (timeoutId.current) clearTimeout(timeoutId.current);
  };

  const handleManualCancel = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 bg-gray-900 rounded-3xl w-full max-w-2xl mx-auto">
      <div className="relative mb-6 w-full max-w-sm aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border-4" style={{ borderColor: status === 'success' ? '#22c55e' : status === 'error' || status === 'not-recognized' ? '#ef4444' : '#3b82f6' }}>
        
        <video 
          ref={videoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${status === 'success' ? 'opacity-30' : 'opacity-100'}`} 
        />
        
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />

        {status === 'initializing' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/90 z-10">
            <Loader2 className="animate-spin text-blue-500 mb-4" size={40} />
            <p className="text-white text-sm font-bold animate-pulse text-center px-4">{progressMsg}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/30 backdrop-blur-sm z-10">
            <CheckCircle2 size={80} className="text-green-500 bg-white rounded-full shadow-lg" />
          </div>
        )}

        {(status === 'error' || status === 'not-recognized') && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/30 backdrop-blur-sm z-10">
            <AlertTriangle size={60} className="text-red-500 bg-white rounded-full p-2 shadow-lg" />
          </div>
        )}
      </div>
      
      <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
        {status === 'scanning' && <ScanFace className="text-blue-400 animate-pulse" />}
        {mode === 'register' ? 'Registre biomètric' : 'Verificació facial'}
      </h2>
      
      <div className="bg-gray-800 rounded-xl p-4 w-full max-w-sm mb-6 border border-gray-700">
        <p className={`text-center font-medium text-sm ${status === 'error' || status === 'not-recognized' ? 'text-red-400' : status === 'success' ? 'text-green-400' : 'text-blue-300'}`}>
          {progressMsg}
        </p>
        
        {mode === 'register' && status === 'scanning' && (
          <div className="w-full bg-gray-700 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-blue-500 h-2 transition-all duration-300 ease-out" style={{ width: `${learningProgress}%` }}></div>
          </div>
        )}
      </div>

      <button 
        onClick={handleManualCancel}
        disabled={status === 'success'}
        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gray-800 text-gray-300 font-bold hover:bg-red-600 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <X size={20} /> Cancel·lar operació
      </button>
    </div>
  );
}