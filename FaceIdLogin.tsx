'use client';

import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, X, AlertTriangle, Loader2, ScanFace } from 'lucide-react';
import * as faceapi from 'face-api.js';

interface FaceIdLoginProps {
  onSuccess: (faceDescriptor: Float32Array) => void;
  onCancel: () => void;
  role: string;
  mode: 'register' | 'login';
}

export default function FaceIdLogin({ onSuccess, onCancel, role, mode }: FaceIdLoginProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [status, setStatus] = useState<'initializing' | 'scanning' | 'success' | 'error' | 'not-recognized'>('initializing');
  const [progressMsg, setProgressMsg] = useState('Connectant amb els servidors d\'IA...');
  const [learningProgress, setLearningProgress] = useState(0); 
  
  const isComponentMounted = useRef(true);
  const timeoutId = useRef<NodeJS.Timeout | null>(null); // Canviat a Timeout
  const scanCount = useRef(0);
  const statusRef = useRef(status);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    isComponentMounted.current = true;
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        setProgressMsg('Carregant model de detecció facial...');
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        
        setProgressMsg('Carregant model de punts clau...');
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        
        setProgressMsg('Carregant xarxa neuronal...');
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);
        
        if (isComponentMounted.current) {
          setProgressMsg('Models carregats! Iniciant càmera...');
          startCamera();
        }
      } catch (err) {
        console.error("Error carregant models:", err);
        if (isComponentMounted.current) setStatus('error');
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
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (videoRef.current && isComponentMounted.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setStatus('scanning');
          setProgressMsg('Buscant rostre...');
          detectLoop(); 
        };
      }
    } catch (err) {
      if (isComponentMounted.current) setStatus('error');
    }
  };

  const detectLoop = async () => {
    if (!videoRef.current || !canvasRef.current || !isComponentMounted.current) return;
    if (statusRef.current === 'success' || statusRef.current === 'error') return;

    try {
      const detection = await faceapi.detectSingleFace(
        videoRef.current, 
        new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 })
      )
      .withFaceLandmarks()
      .withFaceDescriptor();

      const canvas = canvasRef.current;
      const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
      
      if (displaySize.width > 0 && displaySize.height > 0) {
        faceapi.matchDimensions(canvas, displaySize);
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
          const resizedDetections = faceapi.resizeResults(detection, displaySize);
          faceapi.draw.drawDetections(canvas, resizedDetections);
          faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

          const faceDescriptor = detection.descriptor;

          if (mode === 'register') {
            scanCount.current += 5; 
            setLearningProgress(scanCount.current);
            setProgressMsg(`Aprenent trets facials... ${scanCount.current}%`);

            if (scanCount.current >= 100) {
              setStatus('success');
              setProgressMsg('Rostre guardat correctament!');
              stopCamera();
              setTimeout(() => onSuccess(faceDescriptor), 1500);
              return; 
            }
          } else {
            setProgressMsg('Rostre detectat. Verificant identitat...');
            const storedData = localStorage.getItem(`${role}_descriptors`);
            
            if (storedData) {
              const storedDescriptors = JSON.parse(storedData);
              const storedArray = Array.isArray(storedDescriptors[0]) ? storedDescriptors[0] : Object.values(storedDescriptors[0]);
              const storedDescriptor = new Float32Array(storedArray as number[]);
              
              const distance = faceapi.euclideanDistance(storedDescriptor, faceDescriptor);
              
              if (distance < 0.55) { 
                setStatus('success');
                setProgressMsg('Identitat verificada!');
                stopCamera();
                setTimeout(() => onSuccess(faceDescriptor), 1500);
                return; 
              } else {
                setProgressMsg('La cara no coincideix. Torna-ho a intentar.');
                setStatus('not-recognized');
              }
            } else {
              setProgressMsg(`No hi ha dades per a ${role}.`);
              setStatus('error');
              return;
            }
          }
        } else {
          setProgressMsg('Si us plau, mira directament a la càmera...');
          if (mode === 'register') {
             scanCount.current = 0; 
             setLearningProgress(0);
          }
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

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    if (timeoutId.current) clearTimeout(timeoutId.current);
  };

  const handleManualCancel = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="flex flex-col items-center justify-center py-6 bg-gray-900 rounded-3xl w-full">
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
        {mode === 'register' ? 'Registre Biomètric' : 'Control d\'Accés'}
      </h2>
      
      <div className="bg-gray-800 rounded-xl p-3 w-full max-w-sm mb-6 border border-gray-700">
        <p className={`text-center font-medium ${status === 'error' || status === 'not-recognized' ? 'text-red-400' : status === 'success' ? 'text-green-400' : 'text-blue-300'}`}>
          {progressMsg}
        </p>
        
        {mode === 'register' && status === 'scanning' && (
          <div className="w-full bg-gray-700 rounded-full h-2 mt-3 overflow-hidden">
            <div className="bg-blue-500 h-2 transition-all duration-300 ease-out" style={{ width: `${learningProgress}%` }}></div>
          </div>
        )}
      </div>

      <button onClick={handleManualCancel} className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gray-800 text-gray-300 font-bold hover:bg-red-600 hover:text-white transition-all">
        <X size={20} /> Cancel·lar Operació
      </button>
    </div>
  );
}