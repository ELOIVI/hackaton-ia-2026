'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, Sparkles, MapPin, Phone, Clock, Eye, EyeOff, ScanFace } from 'lucide-react';
import { API_BASE, authLogin, authRegister, getAuthHeaders } from '@/lib/api';
import FaceIdLogin from '@/components/FaceIdLogin';

interface Message { role: 'assistant' | 'user'; content: string; }

type Step = 'login' | 'register' | 'chatbot' | 'dashboard';

function getVolunteerFaceIdKey(email: string): string {
  return `faceid:voluntari:${email.trim().toLowerCase()}`;
}

export default function VolunteerForm({ onBack, onLogin }: { onBack: () => void; onLogin: (data: unknown) => void }) {
  const [step, setStep] = useState<Step>('login');
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ nom: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hola! Sóc l'assistent de Càritas. Per trobar el projecte ideal per a tu, necessito fer-te unes preguntes. En quin municipi vius?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<Record<string, unknown> | null>(null);
  const [userData, setUserData] = useState<Record<string, unknown> | null>(null);
  const [showFaceId, setShowFaceId] = useState(false);
  const [faceMode, setFaceMode] = useState<'login' | 'register'>('login');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const openFaceId = (mode: 'login' | 'register') => {
    setError('');

    if (!form.email.trim()) {
      setError('Introdueix l\'email per fer servir Face ID');
      return;
    }

    if (mode === 'login' && !form.password.trim()) {
      setError('Introdueix la contrasenya abans de validar amb Face ID');
      return;
    }

    setFaceMode(mode);
    setShowFaceId(true);
  };

  const handleFaceSuccess = async (faceDescriptor: Float32Array) => {
    const storageKey = getVolunteerFaceIdKey(form.email);

    if (faceMode === 'register') {
      localStorage.setItem(storageKey, JSON.stringify(Array.from(faceDescriptor)));
      setShowFaceId(false);
      return;
    }

    setShowFaceId(false);
    await handleLogin();
  };

  const handleLogin = async () => {
    setError('');
    if (!form.email || !form.password) {
      setError('Omple email i contrasenya');
      return;
    }

    setAuthLoading(true);
    try {
      const auth = await authLogin(form.email, form.password);
      if (auth.user.role !== 'voluntari') {
        setError('Aquest compte no és de voluntari/a');
        return;
      }

      const data = {
        role: auth.user.role,
        nom: auth.user.nom,
        email: auth.user.email,
        token: auth.token,
      };
      setUserData(data);
      onLogin(data);
      setStep('dashboard');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Credencials incorrectes');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRegister = async () => {
    setError('');
    if (!form.nom || !form.email || !form.password) { setError('Omple tots els camps'); return; }

    setAuthLoading(true);
    try {
      const auth = await authRegister({
        role: 'voluntari',
        nom: form.nom,
        email: form.email,
        password: form.password,
      });

      const data = {
        role: auth.user.role,
        nom: auth.user.nom,
        email: auth.user.email,
        token: auth.token,
      };
      setUserData(data);
      setStep('chatbot');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No s\'ha pogut completar el registre');
    } finally {
      setAuthLoading(false);
    }
  };

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
        headers: getAuthHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ history: newMessages.slice(0, -1), message: userMessage }),
      });
      const data = await res.json().catch(() => ({}));
      const responseText = typeof data?.response === 'string' ? data.response : 'No hi ha resposta disponible.';
      setMessages([...newMessages, { role: 'assistant', content: responseText }]);
      if (data.ready && data.match) {
        setMatchResult(data.match);
        const perfil = {
          ...userData,
          projecte_assignat: data.match.projectes_recomanats?.[0] || '',
          municipi: data.match.centre_mes_proper?.municipi || 'Tarragona',
          match: data.match,
        };
        onLogin(perfil);
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Error de connexió. Torna-ho a intentar.' }]);
    } finally { setLoading(false); }
  };

  // ── LOGIN ─────────────────────────────────────────────
  if (step === 'login') return (
    <div className="max-w-md mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800">
        <ArrowLeft size={20} /> Tornar
      </button>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        {showFaceId ? (
          <FaceIdLogin
            storageKey={getVolunteerFaceIdKey(form.email)}
            mode={faceMode}
            onSuccess={(descriptor) => { void handleFaceSuccess(descriptor); }}
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

        <div className="space-y-3">
          <input type="email" placeholder="Email" value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-red-200 outline-none" />
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} placeholder="Contrasenya" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              onKeyDown={e => { if (e.key === 'Enter') handleLogin(); }}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm border-none focus:ring-2 focus:ring-red-200 outline-none" />
            <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button onClick={handleLogin} disabled={authLoading}
            className="w-full py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: '#C8102E' }}>
            {authLoading ? 'Validant...' : 'Iniciar sessió'}
          </button>
          <button onClick={() => openFaceId('login')} disabled={authLoading}
            className="w-full py-3 rounded-xl font-bold text-sm border border-red-100 text-red-700 hover:bg-red-50 flex items-center justify-center gap-2">
            <ScanFace size={18} /> Verificar amb Face ID
          </button>
        </div>

        <div className="mt-4 text-center">
          <button onClick={() => { setStep('register'); setError(''); }}
            className="text-sm text-gray-500 hover:text-gray-800 underline">
            Nou voluntari? Registra&apos;t aquí
          </button>
        </div>

          </>
        )}
      </div>
    </div>
  );

  // ── REGISTRE ──────────────────────────────────────────
  if (step === 'register') return (
    <div className="max-w-md mx-auto px-4 py-8">
      <button onClick={() => setStep('login')} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800">
        <ArrowLeft size={20} /> Tornar
      </button>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        {showFaceId ? (
          <FaceIdLogin
            storageKey={getVolunteerFaceIdKey(form.email)}
            mode={faceMode}
            onSuccess={(descriptor) => { void handleFaceSuccess(descriptor); }}
            onCancel={() => setShowFaceId(false)}
          />
        ) : (
          <>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Nou voluntari/a</h1>
        <p className="text-sm text-gray-500 mb-6">La IA trobarà el projecte ideal per a tu</p>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}

        <div className="space-y-3">
          <input type="text" placeholder="Nom complet" value={form.nom}
            onChange={e => setForm({...form, nom: e.target.value})}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200" />
          <input type="email" placeholder="Email" value={form.email}
            onChange={e => setForm({...form, email: e.target.value})}
            className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200" />
          <div className="relative">
            <input type={showPass ? 'text' : 'password'} placeholder="Contrasenya" value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200" />
            <button onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button onClick={handleRegister} disabled={authLoading}
            className="w-full py-3 rounded-xl font-bold text-white text-sm"
            style={{ background: '#C8102E' }}>
            {authLoading ? 'Registrant...' : 'Continuar amb la IA →'}
          </button>
          <button onClick={() => openFaceId('register')} type="button" disabled={authLoading}
            className="w-full py-3 rounded-xl font-bold text-sm border border-red-100 text-red-700 hover:bg-red-50 flex items-center justify-center gap-2">
            <ScanFace size={18} /> Registrar Face ID (opcional)
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-4">La verificació facial es vincula a l&apos;email d&apos;aquest formulari.</p>
          </>
        )}
      </div>
    </div>
  );

  // ── CHATBOT ───────────────────────────────────────────
  if (step === 'chatbot') return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-28 md:pb-8">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setStep('register')} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Hola, {String(userData?.nom || '')}!</h1>
          <p className="text-sm text-gray-500">L&apos;IA t&apos;assignarà el projecte ideal</p>
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
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant' ? 'bg-white border border-gray-100 text-gray-800 shadow-sm' : 'text-white'}`}
              style={msg.role === 'user' ? { background: '#C8102E' } : {}}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2" style={{ background: 'rgba(200,16,46,0.1)' }}>
              <Sparkles size={14} style={{ color: '#C8102E' }} />
            </div>
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl shadow-sm flex gap-1.5 items-center">
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" />
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {matchResult && (
        <div className="mb-6 rounded-2xl border-2 p-6" style={{ borderColor: '#C8102E', background: 'rgba(200,16,46,0.02)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} style={{ color: '#C8102E' }} />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Projecte assignat</span>
          </div>
          <p className="text-sm text-gray-700 mb-3">{String(matchResult.perfil_resum || '')}</p>
          {(matchResult.projectes_recomanats as string[])?.slice(0,2).map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-700 mb-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#C8102E' }} />{String(p)}
            </div>
          ))}
          {matchResult.centre_mes_proper && (
            <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-2 mt-3">
              <div className="flex items-start gap-2 text-sm">
                <MapPin size={14} className="text-gray-400 mt-0.5" />
                <div>
                  <div className="font-semibold">{String((matchResult.centre_mes_proper as Record<string,unknown>)?.nom || '')}</div>
                  <div className="text-gray-500">{String((matchResult.centre_mes_proper as Record<string,unknown>)?.adreça || '')}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-gray-400" />
                <span>{String((matchResult.centre_mes_proper as Record<string,unknown>)?.email || '')}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className="text-gray-400" />
                <span>{String((matchResult.centre_mes_proper as Record<string,unknown>)?.horari || 'Consulta horari')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!matchResult && (
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Escriu aquí..." rows={2} disabled={loading}
            className="w-full resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none leading-relaxed" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">Prem Enter per enviar</span>
            <button onClick={sendMessage} disabled={!input.trim() || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: '#C8102E' }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return null;
}
