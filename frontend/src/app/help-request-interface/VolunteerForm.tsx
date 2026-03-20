'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, Sparkles, MapPin, Phone, Clock, User } from 'lucide-react';
import { matchText } from '@/lib/api';

interface Message { id: string; role: 'assistant' | 'user'; content: string; timestamp: Date; }

const QUESTIONS = [
  'Hola! Sóc l\'assistent de Càritas. Estic aquí per ajudar-te a trobar el projecte de voluntariat perfecte per a tu. 😊\n\nPrimer de tot, quina disponibilitat horària tens? (p.ex. caps de setmana, tardes entre setmana, matins...)',
  'Gràcies! Ara m\'agradaria saber una mica més sobre tu. Quines habilitats o experiència professional tens? (p.ex. educació, salut, tecnologia, administració, idiomes...)',
  'Perfecte! I per acabar, per quin motiu vols fer voluntariat a Càritas? Quina és la teva motivació principal?',
];

export default function VolunteerForm({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '0', role: 'assistant', content: QUESTIONS[0], timestamp: new Date() }
  ]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [matchResult, setMatchResult] = useState<Record<string, unknown> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const addMessage = (role: 'assistant' | 'user', content: string) => {
    setMessages((prev) => [...prev, {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 9),
      role, content, timestamp: new Date()
    }]);
  };

  const handleSend = async () => {
    if (!userInput.trim() || isLoading) return;
    const userMessage = userInput.trim();
    setUserInput('');
    addMessage('user', userMessage);
    const newAnswers = [...answers, userMessage];
    setAnswers(newAnswers);

    if (currentQuestion < QUESTIONS.length - 1) {
      setIsLoading(true);
      await new Promise((r) => setTimeout(r, 800));
      addMessage('assistant', QUESTIONS[currentQuestion + 1]);
      setCurrentQuestion((q) => q + 1);
      setIsLoading(false);
    } else {
      setIsLoading(true);
      addMessage('assistant', 'Perfecte! Ara analitzo el teu perfil per trobar el millor encaix... ✨');
      try {
        // Construïm un text complet amb totes les respostes per enviar al backend
        const textComplet = `Voluntari/a amb disponibilitat: ${newAnswers[0]}. Habilitats: ${newAnswers[1]}. Motivació: ${newAnswers[2]}.`;
        const result = await matchText(textComplet);
        setMatchResult(result);
        const projecte = result.projectes_recomanats?.[0] || 'Acollida i Acompanyament';
        addMessage('assistant', `He trobat el projecte ideal per a tu: **${projecte}**. ${result.justificacio || ''}`);
      } catch {
        addMessage('assistant', 'Ho sentim, hi ha hagut un error connectant amb el servidor. Torna-ho a provar en uns instants.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-28 md:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 transition-all text-gray-500 hover:text-gray-800">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voluntari/a</h1>
          <p className="text-sm text-gray-500">3 preguntes · ~2 minuts</p>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5">
          <span>Pregunta {Math.min(currentQuestion + 1, 3)} de 3</span>
          <span>{Math.round((Math.min(answers.length, 3) / 3) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ background: '#C8102E', width: `${(Math.min(answers.length, 3) / 3) * 100}%` }} />
        </div>
      </div>

      <div className="space-y-4 mb-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
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
        {isLoading && (
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
        <div className="mb-6 rounded-2xl border-2 p-6" style={{ borderColor: '#C8102E', background: 'rgba(200,16,46,0.02)' }}>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles size={16} style={{ color: '#C8102E' }} />
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Resultat del matching</span>
          </div>
          <p className="text-sm font-semibold text-gray-800 mb-1">Urgència: {String(matchResult.urgencia || '').toUpperCase()}</p>
          <p className="text-sm text-gray-600 mb-3">{String(matchResult.perfil_resum || '')}</p>
          <div className="space-y-1">
            {((matchResult.projectes_recomanats as string[]) || []).map((p: string) => (
              <div key={p} className="flex items-center gap-2 text-sm">
                <User size={13} className="text-gray-400" />
                <span className="text-gray-700">{p}</span>
              </div>
            ))}
          </div>
          {matchResult.centre_mes_proper && (
            <div className="mt-4 bg-white rounded-xl p-4 border border-gray-100 space-y-2">
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
          <button onClick={onBack} className="mt-4 w-full py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Veure altres projectes
          </button>
        </div>
      )}

      {!matchResult && (
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
          <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Escriu aquí la teva resposta..." rows={2} disabled={isLoading}
            className="w-full resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none leading-relaxed" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">Prem Enter per enviar</span>
            <button onClick={handleSend} disabled={!userInput.trim() || isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-40"
              style={{ background: '#C8102E' }}>
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}