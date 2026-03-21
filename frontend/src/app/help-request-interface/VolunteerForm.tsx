'use client';
import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, Sparkles, MapPin, Phone, Clock } from 'lucide-react';

interface Message { role: 'assistant' | 'user'; content: string; }
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://54.163.22.58:5000';

export default function VolunteerForm({ onBack, onLogin }: { onBack: () => void; onLogin: (data: unknown) => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hola! Sóc l'assistent de Càritas i t'ajudaré a trobar el projecte de voluntariat perfecte per a tu. 😊 En quin municipi vius?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<Record<string,unknown> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ history: newMessages.slice(0, -1), message: userMessage }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: 'assistant', content: data.response }]);
      if (data.ready && data.match) {
        setMatchResult(data.match);
        // Guardem el perfil del voluntari per al login
        onLogin({
          name: 'Voluntari/a',
          role: 'voluntari',
          email: '',
          location: data.match.centre_mes_proper?.municipi || 'Tarragona',
          helpType: data.match.projectes_recomanats?.[0] || 'Acollida',
        });
      }
    } catch {
      setMessages([...newMessages, { role: 'assistant', content: 'Ho sentim, error de connexió. Torna-ho a intentar.' }]);
    } finally { setLoading(false); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-28 md:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500"><ArrowLeft size={20} /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voluntari/a</h1>
          <p className="text-sm text-gray-500">L'IA de Càritas et guiarà per trobar el projecte ideal</p>
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
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Projecte recomanat</span>
          </div>
          <p className="text-sm text-gray-700 mb-4">{String(matchResult.perfil_resum || '')}</p>
          {(matchResult.projectes_recomanats as string[])?.slice(0,2).map((p, i) => (
            <div key={i} className="flex items-center gap-2 text-sm text-gray-700 mb-1">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#C8102E' }} />{p}
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
          <button onClick={onBack} className="mt-4 w-full py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">Tornar</button>
        </div>
      )}

      {!matchResult && (
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
          <textarea value={input} onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Escriu aquí la teva resposta..." rows={2} disabled={loading}
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
}
