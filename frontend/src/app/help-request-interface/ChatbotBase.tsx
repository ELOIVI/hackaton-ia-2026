'use client';

// Component base per als dos chatbots de Càritas (persona atesa i voluntari).
// Gemini condueix la conversa de forma dinàmica fins que té prou informació
// per fer el matching i retornar els recursos adequats.

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, Sparkles, MapPin, Phone, Clock } from 'lucide-react';

interface Message {
  role: 'assistant' | 'user';
  content: string;
}

interface MatchResult {
  urgencia: string;
  perfil_resum: string;
  projectes_recomanats: string[];
  recursos: Array<{ nom: string; tipus: string; unitat: string }>;
  voluntaris: Array<{ nom: string; habilitats: string[]; municipi: string }>;
  centre_mes_proper: { nom: string; adreça: string; email: string; horari: string; municipi: string };
  justificacio: string;
}

interface ChatbotBaseProps {
  onBack: () => void;
  endpoint: string;
  title: string;
  subtitle: string;
  welcomeMessage: string;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://54.163.22.58:5000';

export default function ChatbotBase({
  onBack, endpoint, title, subtitle, welcomeMessage
}: ChatbotBaseProps) {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: welcomeMessage }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMessage = input.trim();
    setInput('');

    // Afegim el missatge de l'usuari a la conversa
    const newMessages: Message[] = [...messages, { role: 'user', content: userMessage }];
    setMessages(newMessages);
    setLoading(true);

    try {
      // Enviem tot l'historial al backend perquè Gemini mantingui el context
      const res = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          history: newMessages.slice(0, -1),
          message: userMessage,
        }),
      });
      const data = await res.json();

      setMessages([...newMessages, { role: 'assistant', content: data.response }]);

      // Si Gemini ha recollit prou informació, mostrem el resultat del matching
      if (data.ready && data.match) {
        setMatchResult(data.match);
      }
    } catch {
      setMessages([...newMessages, {
        role: 'assistant',
        content: 'Ho sentim, hi ha hagut un problema de connexió. Torna-ho a intentar.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  const urgencyColor = (u: string) =>
    u === 'crítica' || u === 'alta' ? '#C8102E' : u === 'mitjana' ? '#f59e0b' : '#22c55e';

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-28 md:pb-8">

      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500">{subtitle}</p>
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 mt-1"
                style={{ background: 'rgba(200,16,46,0.1)' }}>
                <Sparkles size={14} style={{ color: '#C8102E' }} />
              </div>
            )}
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed
              ${msg.role === 'assistant'
                ? 'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-sm'
                : 'text-white rounded-tr-sm'}`}
              style={msg.role === 'user' ? { background: '#C8102E' } : {}}>
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2"
              style={{ background: 'rgba(200,16,46,0.1)' }}>
              <Sparkles size={14} style={{ color: '#C8102E' }} />
            </div>
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl shadow-sm flex gap-1.5 items-center">
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} />
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {matchResult && (
        <div className="mb-6 rounded-2xl border-2 p-6"
          style={{ borderColor: '#C8102E', background: 'rgba(200,16,46,0.02)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} style={{ color: '#C8102E' }} />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">
              Resultat del matching
            </span>
            <span className="ml-auto text-xs font-bold px-3 py-1 rounded-full text-white"
              style={{ background: urgencyColor(matchResult.urgencia) }}>
              {matchResult.urgencia?.toUpperCase()}
            </span>
          </div>

          <p className="text-sm text-gray-700 mb-4">{matchResult.perfil_resum}</p>

          {matchResult.recursos?.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Recursos recomanats</p>
              {matchResult.recursos.map((r, i) => (
                <div key={i} className="text-sm text-gray-700 flex items-center gap-2 mb-1">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: '#C8102E' }} />
                  {r.nom} — {r.unitat}
                </div>
              ))}
            </div>
          )}

          {matchResult.centre_mes_proper && (
            <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-2 mt-3">
              <div className="flex items-start gap-2 text-sm">
                <MapPin size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="font-semibold">{matchResult.centre_mes_proper.nom}</div>
                  <div className="text-gray-500">{matchResult.centre_mes_proper.adreça}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone size={14} className="text-gray-400" />
                <span className="text-gray-600">{matchResult.centre_mes_proper.email}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Clock size={14} className="text-gray-400" />
                <span className="text-gray-600">
                  {matchResult.centre_mes_proper.horari || 'Consulta horari al centre'}
                </span>
              </div>
            </div>
          )}

          <p className="text-xs text-gray-500 mt-3 italic">{matchResult.justificacio}</p>

          <button onClick={onBack}
            className="mt-4 w-full py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Tornar a l'inici
          </button>
        </div>
      )}

      {!matchResult && (
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
          <textarea value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Escriu aquí..."
            rows={2} disabled={loading}
            className="w-full resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none leading-relaxed" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">Prem Enter per enviar</span>
            <button onClick={sendMessage} disabled={!input.trim() || loading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: '#C8102E' }}>
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
