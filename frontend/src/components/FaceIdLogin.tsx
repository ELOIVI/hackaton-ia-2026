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

  // --- Refs per controlar el loop sense race conditions ---
  const isRunning = useRef(false);      // true mentre el loop ha d'executar-se
  const isMounted = useRef(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanCount = useRef(0);

  // ── Carregar models i iniciar càmera ──
  useEffect(() => {
    isMounted.current = true;

    const init = async () => {
      try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        setProgressMsg('Carregant model de detecció facial...');
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        setProgressMsg('Carregant model de punts clau...');
        await faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL);
        setProgressMsg('Carregant xarxa neuronal...');
        await faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL);

        if (!isMounted.current) return;
        setProgressMsg('Models carregats! Iniciant càmera...');
        await startCamera();
      } catch (err) {
        console.error('Error carregant models:', err);
        if (isMounted.current) {
          setStatus('error');
          setProgressMsg('No s\'han pogut carregar els models d\'IA.');
        }
      }
    };

    init();

    return () => {
      isMounted.current = false;
      stopEverything();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
      if (!isMounted.current) {
        stream.getTracks().forEach(t => t.stop());
        return;
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await new Promise<void>(resolve => {
          if (!videoRef.current) return resolve();
          videoRef.current.onloadedmetadata = () => resolve();
        });
        videoRef.current.play();
        if (isMounted.current) {
          setStatus('scanning');
          setProgressMsg('Buscant rostre...');
          isRunning.current = true;
          scheduleDetect();
        }
      }
    } catch {
      if (isMounted.current) {
        setStatus('error');
        setProgressMsg('No s\'ha pogut accedir a la càmera.');
      }
    }
  };

  const stopEverything = () => {
    isRunning.current = false;
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(t => t.stop());
    }
  };

  // ── Planifica la pròxima iteració de detecció ──
  const scheduleDetect = () => {
    if (!isRunning.current || !isMounted.current) return;
    timeoutRef.current = setTimeout(() => {
      detect().catch(console.error);
    }, 120);
  };

  // ── Lògica de detecció (una sola execució per crida) ──
  const detect = async () => {
    if (!isRunning.current || !isMounted.current) return;
    if (!videoRef.current || !canvasRef.current) { scheduleDetect(); return; }

    try {
      const detection = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 }))
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!isMounted.current || !isRunning.current) return;

      const canvas = canvasRef.current;
      const displaySize = {
        width: videoRef.current.videoWidth,
        height: videoRef.current.videoHeight,
      };

      if (displaySize.width > 0 && displaySize.height > 0) {
        faceapi.matchDimensions(canvas, displaySize);
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);

        if (detection) {
          // Dibuixar detecció
          const resized = faceapi.resizeResults(detection, displaySize);
          faceapi.draw.drawDetections(canvas, resized);
          faceapi.draw.drawFaceLandmarks(canvas, resized);

          if (mode === 'register') {
            // ── Mode registre: acumular frames fins 100% ──
            scanCount.current = Math.min(scanCount.current + 5, 100);
            setLearningProgress(scanCount.current);
            setProgressMsg(`Aprenent trets facials... ${scanCount.current}%`);

            if (scanCount.current >= 100) {
              isRunning.current = false;
              setStatus('success');
              setProgressMsg('Rostre guardat correctament!');
              stopEverything();
              setTimeout(() => { if (isMounted.current) onSuccess(detection.descriptor); }, 1200);
              return; // ← Para el loop definitivament
            }
          } else {
            // ── Mode login: comparar amb descriptor guardat ──
            setProgressMsg('Rostre detectat. Verificant identitat...');
            const storedRaw = localStorage.getItem(`${role}_descriptors`);

            if (!storedRaw) {
              setStatus('error');
              setProgressMsg(`No hi ha dades biometriques per a ${role}.`);
              isRunning.current = false;
              return;
            }

            const storedArray: number[][] = JSON.parse(storedRaw);
            const storedDescriptor = new Float32Array(storedArray[0]);
            const distance = faceapi.euclideanDistance(storedDescriptor, detection.descriptor);

            if (distance < 0.55) {
              isRunning.current = false;
              setStatus('success');
              setProgressMsg('Identitat verificada!');
              stopEverything();
              setTimeout(() => { if (isMounted.current) onSuccess(detection.descriptor); }, 1200);
              return; // ← Para el loop definitivament
            } else {
              // Cara detectada però no coincideix → continuar escanejant
              setStatus('not-recognized');
              setProgressMsg('La cara no coincideix. Torna-ho a intentar.');
            }
          }
        } else {
          // Cap rostre detectat → reiniciar indicadors
          if (isMounted.current) {
            setProgressMsg('Si us plau, mira directament a la càmera...');
            // Si estàvem en "not-recognized" i s'ha allunyat la cara, tornem a scanning
            setStatus(prev => prev === 'not-recognized' ? 'scanning' : prev);
            if (mode === 'register') {
              // Reiniciem el progrés si perd la cara durant el registre
              scanCount.current = Math.max(0, scanCount.current - 2);
              setLearningProgress(scanCount.current);
            }
          }
        }
      }
    } catch (e) {
      console.error('Error en la detecció:', e);
    }

    // Planificar la pròxima iteració (si tot va bé)
    scheduleDetect();
  };

  const handleCancel = () => {
    stopEverything();
    onCancel();
  };

  // ── Renderitzat ──
  const borderColor =
    status === 'success' ? '#22c55e'
    : status === 'error' || status === 'not-recognized' ? '#ef4444'
    : '#3b82f6';

  return (
    <div className="flex flex-col items-center justify-center py-6 bg-gray-900 rounded-3xl w-full">
      {/* Visor càmera */}
      <div
        className="relative mb-6 w-full max-w-sm aspect-video rounded-2xl overflow-hidden bg-black shadow-2xl border-4"
        style={{ borderColor }}
      >
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
          <div className="absolute inset-0 flex items-center justify-center bg-red-500/10 z-10 pointer-events-none">
            <AlertTriangle size={48} className="text-red-400 opacity-70" />
          </div>
        )}
      </div>

      {/* Títol */}
      <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
        {(status === 'scanning' || status === 'not-recognized') && (
          <ScanFace className="text-blue-400 animate-pulse" />
        )}
        {mode === 'register' ? 'Registre Biomètric' : 'Control d\'Accés'}
      </h2>

      {/* Missatge d'estat */}
      <div className="bg-gray-800 rounded-xl p-3 w-full max-w-sm mb-6 border border-gray-700">
        <p className={`text-center font-medium ${
          status === 'error' || status === 'not-recognized' ? 'text-red-400'
          : status === 'success' ? 'text-green-400'
          : 'text-blue-300'
        }`}>
          {progressMsg}
        </p>
        {mode === 'register' && (status === 'scanning' || status === 'not-recognized') && (
          <div className="w-full bg-gray-700 rounded-full h-2 mt-3 overflow-hidden">
            <div
              className="bg-blue-500 h-2 transition-all duration-300 ease-out"
              style={{ width: `${learningProgress}%` }}
            />
          </div>
        )}
      </div>

      <button
        onClick={handleCancel}
        className="flex items-center gap-2 px-8 py-3 rounded-xl bg-gray-800 text-gray-300 font-bold hover:bg-red-600 hover:text-white transition-all"
      >
        <X size={20} /> Cancel·lar Operació
      </button>
    </div>
  );
}