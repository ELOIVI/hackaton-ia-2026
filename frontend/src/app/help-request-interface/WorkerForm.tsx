'use client';
import React, { useState } from 'react';
import { ArrowLeft, Shield, Eye, EyeOff, ScanFace, CheckCircle } from 'lucide-react';
import { authLogin, authRegister } from '@/lib/api';
import FaceIdLogin from '@/components/FaceIdLogin';

function getWorkerFaceIdKey(email: string): string {
  return `faceid:treballador:${email.trim().toLowerCase()}`;
}

export default function WorkerForm({ onBack, onLogin }: { onBack: () => void; onLogin: (data: unknown) => void }) {
  const [mode, setMode] = useState<'login' | 'register' | 'register-faceid'>('login');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: 'Tarragona',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [showFaceId, setShowFaceId] = useState(false);
  const [faceMode, setFaceMode] = useState<'login' | 'register'>('login');
  const [registeredUser, setRegisteredUser] = useState<Record<string, unknown> | null>(null);
  const [biometricConfigured, setBiometricConfigured] = useState(false);

  const handlePasswordLogin = async () => {
    const auth = await authLogin(formData.email, formData.password);
    if (auth.user.role !== 'treballador') {
      setError('Aquest compte no és de treballador/a');
      return;
    }
    onLogin({
      role: auth.user.role,
      name: auth.user.nom,
      email: auth.user.email,
      location: auth.user.location,
      token: auth.token,
    });
  };

  const handleWorkerRegister = async () => {
    const auth = await authRegister({
      role: 'treballador',
      nom: formData.name,
      location: formData.location,
      email: formData.email,
      password: formData.password,
    });
    
    setRegisteredUser({
      id: auth.user.id,
      role: auth.user.role,
      name: auth.user.nom,
      email: auth.user.email,
      location: auth.user.location,
      token: auth.token,
    });
    
    setMode('register-faceid');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (mode === 'login') {
      try {
        await handlePasswordLogin();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Credencials corporatives no vàlides');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!formData.name || !formData.email || !formData.password) {
      setError('Omple tots els camps');
      setSubmitting(false);
      return;
    }

    try {
      await handleWorkerRegister();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No s\'ha pogut completar el registre');
      setSubmitting(false);
    }
  };

  const openFaceId = (targetMode: 'login' | 'register') => {
    setError('');

    if (targetMode === 'register') {
      setFaceMode('register');
      setShowFaceId(true);
      return;
    }

    // Login mode
    if (!formData.email.trim()) {
      setError('Introdueix l\'email per fer servir Face ID');
      return;
    }

    if (!formData.password.trim()) {
      setError('Introdueix la contrasenya abans de validar amb Face ID');
      return;
    }

    setFaceMode('login');
    setShowFaceId(true);
  };

  const handleFaceSuccess = async (descriptor: Float32Array) => {
    if (faceMode === 'register') {
      // Registro: guardar localmente y en backend
      if (!registeredUser) return;

      try {
        setSubmitting(true);
        const response = await fetch(`/api/user/${registeredUser.id}/biometric`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${registeredUser.token}`,
          },
          body: JSON.stringify({
            faceDescriptor: Array.from(descriptor),
          }),
        });

        if (response.ok) {
          // Guardar también en localStorage como respaldo
          localStorage.setItem(
            getWorkerFaceIdKey(formData.email),
            JSON.stringify(Array.from(descriptor))
          );
          setBiometricConfigured(true);
          setShowFaceId(false);
          setSubmitting(false);
        } else {
          setError('Error guardant dades biomètriques');
          setSubmitting(false);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error de connexió');
        setSubmitting(false);
      }
      return;
    }

    // Login mode
    setShowFaceId(false);
    setSubmitting(true);
    setError('');

    try {
      // Primero validar contraseña (requerida para login con Face ID)
      await handlePasswordLogin();
      
      // Si llegamos aquí, las credenciales son válidas
      // Guardar Face ID en backend para futuras validaciones
      if (formData.email) {
        try {
          const auth = await authLogin(formData.email, formData.password);
          await fetch(`/api/user/${auth.user.id}/biometric`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${auth.token}`,
            },
            body: JSON.stringify({
              faceDescriptor: Array.from(descriptor),
            }),
          }).catch(() => {}); // No fallar si no se guarda
        } catch {}
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credencials corporatives no vàlides');
      setSubmitting(false);
    }
  };

  const skipBiometric = () => {
    if (registeredUser) {
      onLogin(registeredUser);
    }
  };

  // ── MODO LOGIN ─────────────────────────────────────────
  if (mode === 'login') {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800">
          <ArrowLeft size={20} /> Tornar
        </button>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          {showFaceId ? (
            <FaceIdLogin
              mode={faceMode}
              onSuccess={(descriptor) => { void handleFaceSuccess(descriptor); }}
              onCancel={() => setShowFaceId(false)}
            />
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-emerald-50">
                <Shield size={28} className="text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Accés Intern</h1>
              <p className="text-sm text-gray-500 mb-6">Àrea restringida per a personal de Càritas</p>

              <div className="bg-emerald-50 p-3 rounded-xl text-emerald-700 text-xs mb-6 font-medium">
                Aquesta àrea és exclusiva per a treballadors contractats de Càritas.
              </div>

              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  required
                  type="email"
                  placeholder="Email corporatiu"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <div className="relative">
                  <input
                    required
                    type={showPass ? 'text' : 'password'}
                    placeholder="Contrasenya"
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-3 text-gray-400"
                  >
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Shield size={18} /> {submitting ? 'Validant...' : 'Iniciar Sessió Segura'}
                </button>
                <button
                  type="button"
                  onClick={() => openFaceId('login')}
                  disabled={submitting}
                  className="w-full py-3 rounded-xl font-bold text-sm border border-emerald-100 text-emerald-700 hover:bg-emerald-50 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ScanFace size={18} /> Entrar amb Face ID
                </button>
              </form>

              <p className="text-xs text-gray-400 mt-4">Si has registrat Face ID al crear el compte, pots entrar directament.</p>

              <button
                onClick={() => { setMode('register'); setError(''); setFormData({ name: '', location: 'Tarragona', email: '', password: '' }); }}
                className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 underline"
              >
                Crear compte intern
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── MODO REGISTER ──────────────────────────────────────
  if (mode === 'register') {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <button
          onClick={() => { setMode('login'); setError(''); setFormData({ name: '', location: 'Tarragona', email: '', password: '' }); }}
          className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800"
        >
          <ArrowLeft size={20} /> Tornar
        </button>
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Alta de treballador/a</h1>
          <p className="text-sm text-gray-500 mb-6">Crea el teu compte corporatiu</p>

          <div className="bg-emerald-50 p-3 rounded-xl text-emerald-700 text-xs mb-6 font-medium">
            Aquesta àrea és exclusiva per a treballadors contractats de Càritas.
          </div>

          {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            <input
              required
              type="text"
              placeholder="Nom complet"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <input
              type="text"
              placeholder="Ubicació"
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
              className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <input
              required
              type="email"
              placeholder="Email corporatiu"
              value={formData.email}
              onChange={e => setFormData({...formData, email: e.target.value})}
              className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200"
            />
            <div className="relative">
              <input
                required
                type={showPass ? 'text' : 'password'}
                placeholder="Contrasenya"
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-3 text-gray-400"
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50"
            >
              <Shield size={18} /> {submitting ? 'Registrant...' : 'Crear Compte'}
            </button>
          </form>

          <button
            onClick={() => { setMode('login'); setError(''); setFormData({ name: '', location: 'Tarragona', email: '', password: '' }); }}
            className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Ja tens compte? Inicia sessió
          </button>
        </div>
      </div>
    );
  }

  // ── MODO REGISTER-FACEID ───────────────────────────────
  if (mode === 'register-faceid') {
    return (
      <div className="max-w-md mx-auto px-4 py-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          {!showFaceId && !biometricConfigured && (
            <>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-emerald-50">
                <ScanFace size={28} className="text-emerald-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-1">Configurar Face ID</h1>
              <p className="text-sm text-gray-500 mb-6">Opcional: Registra la teva cara per a inicis de sessió més ràpids</p>

              {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}

              <div className="bg-blue-50 p-4 rounded-xl mb-6">
                <p className="text-sm text-blue-900">
                  📌 <strong>Recorda:</strong> Si configures Face ID ara, podràs entrar en futures sessions només amb la teva cara. Si lo omitats, podràs sempre usar la contrasenya.
                </p>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => openFaceId('register')}
                  disabled={submitting}
                  className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <ScanFace size={18} /> Configurar Face ID Ara
                </button>
                <button
                  onClick={skipBiometric}
                  disabled={submitting}
                  className="w-full py-3 rounded-xl font-bold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
                >
                  Omitir per Ara
                </button>
              </div>
            </>
          )}

          {showFaceId && (
            <FaceIdLogin
              mode="register"
              onSuccess={(descriptor) => { void handleFaceSuccess(descriptor); }}
              onCancel={() => setShowFaceId(false)}
            />
          )}

          {biometricConfigured && (
            <>
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Face ID Configurat!</h2>
                <p className="text-sm text-gray-500 text-center mb-6">La teva biometria s'ha registrat correctament</p>
              </div>
              <button
                onClick={() => { if (registeredUser) onLogin(registeredUser); }}
                className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-700"
              >
                Continuar al Dashboard
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}