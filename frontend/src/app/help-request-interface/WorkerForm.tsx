'use client';
import React, { useState } from 'react';
import { ArrowLeft, Shield, Eye, EyeOff, ScanFace, CheckCircle } from 'lucide-react';
import { authLogin, authRegister } from '@/lib/api';
import FaceIdLogin from '@/components/FaceIdLogin';

// ─── Constants de localStorage per al rol treballador ─────────────────────────
const LS_DESCRIPTORS = 'treballador_descriptors';
const LS_USER        = 'treballador_current_user';
const LS_FACE_READY  = 'treballador_face_configured';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isFaceConfigured = () => localStorage.getItem(LS_FACE_READY) === 'true';

const saveBiometrics = (descriptor: Float32Array, userData: Record<string, unknown>) => {
  localStorage.setItem(LS_DESCRIPTORS, JSON.stringify([Array.from(descriptor)]));
  // Guardem les dades sense el token per seguretat
  const { token: _omit, ...safeData } = userData as any;
  localStorage.setItem(LS_USER, JSON.stringify(safeData));
  localStorage.setItem(LS_FACE_READY, 'true');
};

const clearBiometrics = () => {
  localStorage.removeItem(LS_DESCRIPTORS);
  localStorage.removeItem(LS_USER);
  localStorage.removeItem(LS_FACE_READY);
};

// ─────────────────────────────────────────────────────────────────────────────
export default function WorkerForm({ onBack, onLogin }: { onBack: () => void; onLogin: (data: unknown) => void }) {
  // Estat de biometria llegit una sola vegada en muntar
  const [faceReady, setFaceReady] = useState<boolean>(() => isFaceConfigured());

  const [mode, setMode]           = useState<'login' | 'register' | 'register-faceid'>('login');
  const [showPass, setShowPass]   = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState('');
  const [formData, setFormData]   = useState({ name: '', location: 'Tarragona', email: '', password: '' });

  // Face ID UI state
  const [showFaceId, setShowFaceId]               = useState(false);
  const [faceMode, setFaceMode]                   = useState<'login' | 'register'>('login');
  const [registeredUser, setRegisteredUser]       = useState<Record<string, unknown> | null>(null);
  const [biometricConfigured, setBiometricConfigured] = useState(false);

  // ─── LOGIN AMB CONTRASENYA ────────────────────────────────────────────────
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const auth = await authLogin(formData.email, formData.password);
      if (auth.user.role !== 'treballador') throw new Error('Aquest compte no és de treballador/a');
      onLogin({ role: auth.user.role, name: auth.user.nom, email: auth.user.email, location: auth.user.location, token: auth.token });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Credencials corporatives no vàlides');
    } finally { setSubmitting(false); }
  };

  // ─── REGISTRE NOU TREBALLADOR ─────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!formData.name || !formData.email || !formData.password) { setError('Omple tots els camps'); return; }
    setSubmitting(true);
    try {
      const auth = await authRegister({ role: 'treballador', nom: formData.name, location: formData.location, email: formData.email, password: formData.password });
      setRegisteredUser({ id: auth.user.id, role: auth.user.role, name: auth.user.nom, email: auth.user.email, location: auth.user.location, token: auth.token });
      setMode('register-faceid');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No s\'ha pogut completar el registre');
    } finally { setSubmitting(false); }
  };

  // ─── OBRIR FACE ID ────────────────────────────────────────────────────────
  /**
   * Dos casos:
   *   A) faceReady === true  → login directe per biometria, sense credencials
   *   B) faceReady === false → primera vegada; cal email+password per vincular
   */
  const openFaceIdForLogin = () => {
    setError('');

    if (faceReady) {
      // ── Cas A: biometria ja configurada → login pur ──
      setFaceMode('login');
      setShowFaceId(true);
      return;
    }

    // ── Cas B: primera vegada → necessitem credencials per vincular ──
    if (!formData.email || !formData.password) {
      setError('Per vincular el Face ID per primera vegada, introdueix el teu email i contrasenya.');
      return;
    }
    setFaceMode('register');
    setShowFaceId(true);
  };

  // ─── CALLBACK DE FACE ID ──────────────────────────────────────────────────
  const handleFaceSuccess = async (descriptor: Float32Array) => {
    setShowFaceId(false);

    if (faceMode === 'register') {
      // ── Prové del pas de REGISTRE (alta nova) ──
      if (registeredUser) {
        saveBiometrics(descriptor, registeredUser);
        setFaceReady(true);
        setBiometricConfigured(true);
        return;
      }

      // ── Prové del LOGIN (vinculació per primera vegada) ──
      setSubmitting(true);
      try {
        const auth = await authLogin(formData.email, formData.password);
        if (auth.user.role !== 'treballador') throw new Error('No és treballador/a');
        const userData = { role: auth.user.role, name: auth.user.nom, email: auth.user.email, location: auth.user.location, token: auth.token };
        saveBiometrics(descriptor, userData);
        setFaceReady(true);
        onLogin(userData);
      } catch {
        setError('Credencials incorrectes. No s\'ha pogut vincular el Face ID.');
        clearBiometrics();
      } finally { setSubmitting(false); }
      return;
    }

    // ── LOGIN PUR AMB LA CARA (faceMode === 'login') ──
    const saved = localStorage.getItem(LS_USER);
    if (saved) {
      try {
        onLogin(JSON.parse(saved));
      } catch {
        setError('Error carregant el perfil. Inicia sessió manualment.');
        clearBiometrics();
        setFaceReady(false);
      }
    } else {
      setError('S\'ha reconegut la cara però falten dades del perfil. Torna a vincular el compte.');
      clearBiometrics();
      setFaceReady(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERITZAT
  // ═══════════════════════════════════════════════════════════════════════════

  // ── PANTALLA DE LOGIN ──
  if (mode === 'login') return (
    <div className="max-w-md mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800">
        <ArrowLeft size={20} /> Tornar
      </button>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        {showFaceId ? (
          <FaceIdLogin
            mode={faceMode}
            role="treballador"
            onSuccess={(d) => { void handleFaceSuccess(d); }}
            onCancel={() => setShowFaceId(false)}
          />
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-emerald-50">
              <Shield size={28} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Accés Intern</h1>
            <p className="text-sm text-gray-500 mb-6">Àrea restringida per a personal de Càritas</p>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}

            {/* ── Si ja té Face ID configurat, mostrem el botó com a opció principal ── */}
            {faceReady && (
              <div className="mb-4">
                <button
                  onClick={openFaceIdForLogin}
                  disabled={submitting}
                  className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 text-sm bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50"
                >
                  <ScanFace size={20} /> Entrar amb Face ID
                </button>
                <div className="relative flex py-3 items-center">
                  <div className="flex-grow border-t border-gray-200" />
                  <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">o usa contrasenya</span>
                  <div className="flex-grow border-t border-gray-200" />
                </div>
              </div>
            )}

            {/* ── Formulari contrasenya ── */}
            <form onSubmit={handlePasswordLogin} className="space-y-3">
              <input
                type="email"
                placeholder={faceReady ? 'Email corporatiu (opcional)' : 'Email corporatiu'}
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200"
              />
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Contrasenya"
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400">
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

              {/* ── Si NO té Face ID configurat, ofrim vincular-lo ── */}
              {!faceReady && (
                <>
                  <div className="relative flex py-2 items-center">
                    <div className="flex-grow border-t border-gray-200" />
                    <span className="flex-shrink-0 mx-4 text-gray-400 text-xs">o entra ràpid amb</span>
                    <div className="flex-grow border-t border-gray-200" />
                  </div>
                  <button
                    type="button"
                    onClick={openFaceIdForLogin}
                    disabled={submitting}
                    className="w-full py-3 rounded-xl font-bold text-sm border border-emerald-100 text-emerald-700 hover:bg-emerald-50 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <ScanFace size={18} /> Vincular Face ID (requereix credencials)
                  </button>
                </>
              )}
            </form>

            <button
              onClick={() => { setMode('register'); setError(''); setFormData({ name: '', location: 'Tarragona', email: '', password: '' }); }}
              className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 underline"
            >
              Nou treballador? Crear compte intern
            </button>
          </>
        )}
      </div>
    </div>
  );

  // ── PANTALLA DE REGISTRE ──
  if (mode === 'register') return (
    <div className="max-w-md mx-auto px-4 py-8">
      <button onClick={() => { setMode('login'); setError(''); }} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800">
        <ArrowLeft size={20} /> Tornar
      </button>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Alta de treballador/a</h1>
        <p className="text-sm text-gray-500 mb-6">Crea el teu compte corporatiu</p>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}
        <form onSubmit={handleRegister} className="space-y-3">
          <input required type="text" placeholder="Nom complet" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200" />
          <input required type="email" placeholder="Email corporatiu" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200" />
          <div className="relative">
            <input required type={showPass ? 'text' : 'password'} placeholder="Contrasenya" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200" />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button type="submit" disabled={submitting} className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-emerald-700 disabled:opacity-50">
            <Shield size={18} /> {submitting ? 'Registrant...' : 'Crear Compte'}
          </button>
        </form>
      </div>
    </div>
  );

  // ── PANTALLA CONFIGURACIÓ FACE ID DESPRÉS DEL REGISTRE ──
  if (mode === 'register-faceid') return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        {showFaceId && (
          <FaceIdLogin
            mode="register"
            role="treballador"
            onSuccess={(d) => { void handleFaceSuccess(d); }}
            onCancel={() => setShowFaceId(false)}
          />
        )}

        {!showFaceId && !biometricConfigured && (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-emerald-50">
              <ScanFace size={28} className="text-emerald-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Configurar Face ID</h1>
            <p className="text-sm text-gray-500 mb-6">Opcional: Entra sense contrasenya les pròximes vegades</p>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}
            <div className="space-y-3">
              <button
                onClick={() => setShowFaceId(true)}
                className="w-full py-3 rounded-xl font-bold text-sm bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-2"
              >
                <ScanFace size={18} /> Configurar Face ID Ara
              </button>
              <button
                onClick={() => { if (registeredUser) onLogin(registeredUser); }}
                className="w-full py-3 rounded-xl font-bold text-sm border border-gray-200 text-gray-700 hover:bg-gray-50"
              >
                Omitir per Ara
              </button>
            </div>
          </>
        )}

        {biometricConfigured && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Face ID Configurat!</h2>
            <p className="text-sm text-gray-500 mb-6 text-center">A partir d'ara podràs entrar directament amb la teva cara.</p>
            <button
              onClick={() => { if (registeredUser) onLogin(registeredUser); }}
              className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-emerald-700"
            >
              Continuar al Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return null;
}