'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, Sparkles, MapPin, Phone, Clock, Eye, EyeOff, ScanFace, CheckCircle } from 'lucide-react';
import { API_BASE, authLogin, authRegister, getAuthHeaders } from '@/lib/api';
import FaceIdLogin from '@/components/FaceIdLogin';

// ─── Constants de localStorage per al rol voluntari ───────────────────────────
const LS_DESCRIPTORS   = 'voluntari_descriptors';    // Float32Array serialitzat
const LS_USER          = 'voluntari_current_user';   // Dades de sessió (sense token sensible)
const LS_FACE_READY    = 'voluntari_face_configured';// "true" quan la biometria ja està configurada

// ─── Helpers ─────────────────────────────────────────────────────────────────
const isFaceConfigured = () => localStorage.getItem(LS_FACE_READY) === 'true';

const saveBiometrics = (descriptor: Float32Array, userData: Record<string, unknown>) => {
  localStorage.setItem(LS_DESCRIPTORS, JSON.stringify([Array.from(descriptor)]));
  // Guardem les dades sense el token (el token és de sessió, no ha de persistir per Face ID)
  const { token: _omit, ...safeData } = userData as any;
  localStorage.setItem(LS_USER, JSON.stringify(safeData));
  localStorage.setItem(LS_FACE_READY, 'true');
};

const clearBiometrics = () => {
  localStorage.removeItem(LS_DESCRIPTORS);
  localStorage.removeItem(LS_USER);
  localStorage.removeItem(LS_FACE_READY);
};

// ─── Tipus ───────────────────────────────────────────────────────────────────
interface Message { role: 'assistant' | 'user'; content: string; }
type Step = 'login' | 'register' | 'register-faceid' | 'chatbot' | 'dashboard';

// ─────────────────────────────────────────────────────────────────────────────
export default function VolunteerForm({ onBack, onLogin }: { onBack: () => void; onLogin: (data: unknown) => void }) {
  // Llegim l'estat de biometria UNA sola vegada en muntar el component
  const [faceReady, setFaceReady] = useState<boolean>(() => isFaceConfigured());

  const [step, setStep]           = useState<Step>('login');
  const [showPass, setShowPass]   = useState(false);
  const [form, setForm]           = useState({ nom: '', email: '', password: '' });
  const [error, setError]         = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  // Face ID UI state
  const [showFaceId, setShowFaceId]               = useState(false);
  const [faceMode, setFaceMode]                   = useState<'login' | 'register'>('login');
  const [registeredUser, setRegisteredUser]       = useState<Record<string, unknown> | null>(null);
  const [biometricConfigured, setBiometricConfigured] = useState(false);

  // Chatbot
  const [messages, setMessages]   = useState<Message[]>([
    { role: 'assistant', content: "Hola! Sóc l'assistent de Càritas. Per trobar el projecte ideal per a tu, necessito fer-te unes preguntes. En quin municipi vius?" }
  ]);
  const [input, setInput]         = useState('');
  const [loading, setLoading]     = useState(false);
  const [matchResult, setMatchResult] = useState<Record<string, unknown> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ─── LOGIN AMB CONTRASENYA ────────────────────────────────────────────────
  const handleLogin = async () => {
    setError('');
    if (!form.email || !form.password) { setError('Omple email i contrasenya'); return; }
    setAuthLoading(true);
    try {
      const auth = await authLogin(form.email, form.password);
      if (auth.user.role !== 'voluntari') { setError('Aquest compte no és de voluntari/a'); return; }
      const data = { role: auth.user.role, nom: auth.user.nom, email: auth.user.email, token: auth.token };
      onLogin(data);
      setStep('dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Credencials incorrectes');
    } finally { setAuthLoading(false); }
  };

  // ─── REGISTRE NOU VOLUNTARI ───────────────────────────────────────────────
  const handleRegister = async () => {
    setError('');
    if (!form.nom || !form.email || !form.password) { setError('Omple tots els camps'); return; }
    setAuthLoading(true);
    try {
      const auth = await authRegister({ role: 'voluntari', nom: form.nom, email: form.email, password: form.password });
      setRegisteredUser({ id: auth.user.id, role: auth.user.role, nom: auth.user.nom, email: auth.user.email, token: auth.token });
      setStep('register-faceid');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No s\'ha pogut completar el registre');
    } finally { setAuthLoading(false); }
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
      // ── Cas A: biometria ja configurada → login pur sense credencials ──
      setFaceMode('login');
      setShowFaceId(true);
      return;
    }

    // ── Cas B: primera vegada → necessitem credencials per vincular ──
    if (!form.email || !form.password) {
      setError('Per vincular el Face ID per primera vegada, introdueix el teu email i contrasenya.');
      return;
    }
    setFaceMode('register'); // escanegem la cara nova per guardar-la
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
      setAuthLoading(true);
      try {
        const auth = await authLogin(form.email, form.password);
        if (auth.user.role !== 'voluntari') throw new Error('No és voluntari/a');
        const userData = { role: auth.user.role, nom: auth.user.nom, email: auth.user.email, token: auth.token };
        saveBiometrics(descriptor, userData);
        setFaceReady(true);
        onLogin(userData);
        setStep('dashboard');
      } catch {
        setError('Credencials incorrectes. No s\'ha pogut vincular el Face ID.');
        clearBiometrics();
      } finally { setAuthLoading(false); }
      return;
    }

    // ── LOGIN PUR AMB LA CARA (faceMode === 'login') ──
    const saved = localStorage.getItem(LS_USER);
    if (saved) {
      try {
        const userData = JSON.parse(saved);
        // Nota: el token no es persisteix per seguretat; si el backend el requereix
        // caldria reautenticar silenciosament. Per al prototip, passem les dades guardades.
        onLogin(userData);
        setStep('dashboard');
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

  // ─── CHATBOT ──────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/chat/voluntari`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ history: newMessages.slice(0, -1), message: userMessage }),
      });
      const data = await res.json().catch(() => ({}));
      const responseText = typeof data?.response === 'string' ? data.response : 'No hi ha resposta.';
      setMessages([...newMessages, { role: 'assistant', content: responseText }]);
      if (data.ready && data.match) setMatchResult(data.match);
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: `No hi ha connexió amb el backend (${API_BASE}).` }]);
    } finally { setLoading(false); }
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDERITZAT
  // ═══════════════════════════════════════════════════════════════════════════

  // ── PANTALLA DE LOGIN ──
  if (step === 'login') return (
    <div className="max-w-md mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800">
        <ArrowLeft size={20} /> Tornar
      </button>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        {showFaceId ? (
          <FaceIdLogin
            mode={faceMode}
            role="voluntari"
            onSuccess={(d) => { void handleFaceSuccess(d); }}
            onCancel={() => setShowFaceId(false)}
          />
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(200,16,46,0.1)' }}>
              <Sparkles size={28} style={{ color: '#C8102E' }} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Accés voluntari/a</h1>
            <p className="text-sm text-gray-500 mb-6">Entra amb les teves credencials de Càritas</p>

            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}

            {/* ── Si ja té Face ID configurat, mostrem el botó com a opció principal ── */}
            {faceReady && (
              <div className="mb-4">
                <button
                  onClick={openFaceIdForLogin}
                  disabled={authLoading}
                  className="w-full py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                  style={{ background: '#C8102E' }}
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
            <div className="space-y-3">
              <input
                type="email"
                placeholder={faceReady ? 'Email (opcional)' : 'Email'}
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none"
              />
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="Contrasenya"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none"
                />
                <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <button
                onClick={handleLogin}
                disabled={authLoading}
                className="w-full py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 disabled:opacity-50"
                style={{ background: faceReady ? undefined : '#C8102E', background2: faceReady ? '#6b7280' : undefined } as React.CSSProperties}
              >
                {authLoading ? 'Validant...' : 'Iniciar sessió'}
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
                    onClick={openFaceIdForLogin}
                    disabled={authLoading}
                    className="w-full py-3 rounded-xl font-bold text-sm border border-red-100 text-red-700 hover:bg-red-50 flex items-center justify-center gap-2"
                  >
                    <ScanFace size={18} /> Vincular Face ID (requereix credencials)
                  </button>
                </>
              )}
            </div>

            <div className="mt-4 text-center">
              <button
                onClick={() => { setStep('register'); setError(''); }}
                className="text-sm text-gray-500 hover:text-gray-800 underline"
              >
                Nou voluntari? Registra&apos;t aquí
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );

  // ── PANTALLA DE REGISTRE ──
  if (step === 'register') return (
    <div className="max-w-md mx-auto px-4 py-8">
      <button onClick={() => setStep('login')} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800">
        <ArrowLeft size={20} /> Tornar
      </button>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Nou voluntari/a</h1>
        <p className="text-sm text-gray-500 mb-6">La IA trobarà el projecte ideal per a tu</p>
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}
        <div className="space-y-3">
          <input type="text" placeholder="Nom complet" value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm" />
          <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm" />
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} placeholder="Contrasenya" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm" />
            <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button onClick={handleRegister} disabled={authLoading} className="w-full py-3 rounded-xl font-bold text-white text-sm hover:opacity-90 disabled:opacity-50" style={{ background: '#C8102E' }}>
            {authLoading ? 'Registrant...' : 'Continuar →'}
          </button>
        </div>
      </div>
    </div>
  );

  // ── PANTALLA CONFIGURACIÓ FACE ID DESPRÉS DEL REGISTRE ──
  if (step === 'register-faceid') return (
    <div className="max-w-md mx-auto px-4 py-8">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        {showFaceId && (
          <FaceIdLogin
            mode="register"
            role="voluntari"
            onSuccess={(d) => { void handleFaceSuccess(d); }}
            onCancel={() => setShowFaceId(false)}
          />
        )}

        {!showFaceId && !biometricConfigured && (
          <>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(200,16,46,0.1)' }}>
              <ScanFace size={28} style={{ color: '#C8102E' }} />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-1">Configurar Face ID</h1>
            <p className="text-sm text-gray-500 mb-6">Entra sense contrasenya les pròximes vegades</p>
            {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}
            <div className="space-y-3">
              <button
                onClick={() => setShowFaceId(true)}
                className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{ background: '#C8102E' }}
              >
                <ScanFace size={18} /> Escanejar Cara Ara
              </button>
              <button
                onClick={() => { if (registeredUser) { onLogin(registeredUser); setStep('chatbot'); } }}
                className="w-full py-3 rounded-xl font-bold text-sm border border-gray-200 text-gray-700"
              >
                No vull usar Face ID
              </button>
            </div>
          </>
        )}

        {biometricConfigured && (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(34,197,94,0.1)' }}>
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-1">Face ID Configurat!</h2>
            <p className="text-sm text-gray-500 mb-6 text-center">A partir d'ara podràs entrar directament amb la teva cara.</p>
            <button
              onClick={() => { if (registeredUser) { onLogin(registeredUser); setStep('chatbot'); } }}
              className="w-full py-3 rounded-xl font-bold text-white text-sm"
              style={{ background: '#C8102E' }}
            >
              Començar Assistent
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── CHATBOT (step === 'chatbot' | 'dashboard') ──
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Assistent de Voluntariat</h1>
          <p className="text-sm text-gray-500">La IA et trobarà el projecte ideal</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 mt-1" style={{ background: 'rgba(200,16,46,0.1)' }}>
                <Sparkles size={14} style={{ color: '#C8102E' }} />
              </div>
            )}
            <div
              className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-white border border-gray-100 text-gray-800 shadow-sm' : 'text-white'}`}
              style={msg.role === 'user' ? { background: '#C8102E' } : {}}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 pl-10">
            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" />
            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {matchResult && (
        <div className="mb-6 rounded-2xl border-2 p-5" style={{ borderColor: '#C8102E' }}>
          <p className="font-semibold text-gray-800 mb-2">Projecte recomanat</p>
          <div className="flex items-start gap-2 text-sm text-gray-600">
            <MapPin size={14} className="mt-0.5 text-gray-400" />
            <span>{String((matchResult.centre_mes_proper as Record<string,unknown>)?.nom || '')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <Phone size={14} className="text-gray-400" />
            <span>{String((matchResult.centre_mes_proper as Record<string,unknown>)?.email || '')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
            <Clock size={14} className="text-gray-400" />
            <span>{String((matchResult.centre_mes_proper as Record<string,unknown>)?.horari || 'Consulta horari al centre')}</span>
          </div>
        </div>
      )}

      {!matchResult && (
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Escriu aquí..."
            rows={2}
            disabled={loading}
            className="w-full resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none"
          />
          <div className="flex justify-end mt-2">
            <button
              onClick={sendMessage}
              disabled={!input.trim() || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: '#C8102E' }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}