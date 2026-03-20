'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Loader2, Sparkles, MapPin, Phone, Clock, User } from 'lucide-react';

const VOLUNTEER_PROJECTS = [
  { id: 1, name: 'Programa d\'Acompanyament a Gent Gran', description: 'Visites setmanals a persones majors en situació de soledat. Ideal per a persones empàtiques amb disponibilitat de tarda.', center: 'Càritas Tarragona Centre', address: 'C/ Apodaca 14, Tarragona', phone: '977 21 00 36', hours: 'Dimarts i dijous 16h–19h', skills: ['empatia', 'comunicació', 'paciència'], urgency: 'alta', volunteers_needed: 8 },
  { id: 2, name: 'Banc d\'Aliments i Distribució', description: 'Classificació i distribució d\'aliments als punts de recollida. Treball en equip en un ambient molt positiu.', center: 'Càritas Bonavista', address: 'C/ Riu Ebre s/n, Tarragona', phone: '977 55 12 43', hours: 'Dissabtes 9h–13h', skills: ['treball en equip', 'organització'], urgency: 'alta', volunteers_needed: 12 },
  { id: 3, name: 'Reforç Escolar i Alfabetització Digital', description: 'Suport educatiu a menors i adults en risc d\'exclusió. Especialment valuós si tens formació en educació o tecnologia.', center: 'Càritas Sant Pere i Sant Pau', address: 'Av. Vidal i Barraquer 2, Tarragona', phone: '977 20 88 71', hours: 'Dilluns, dimecres i divendres 17h–19h', skills: ['educació', 'paciència', 'tecnologia'], urgency: 'mitjana', volunteers_needed: 5 },
  { id: 4, name: 'Assessorament Jurídic i Laboral', description: 'Orientació legal i laboral a persones en situació vulnerable. Necessitem professionals del dret i RRHH.', center: 'Càritas Tarragona Centre', address: 'C/ Apodaca 14, Tarragona', phone: '977 21 00 36', hours: 'Dimecres 10h–13h', skills: ['dret', 'recursos humans', 'orientació laboral'], urgency: 'alta', volunteers_needed: 3 },
  { id: 5, name: 'Suport Psicosocial i Escolta Activa', description: 'Acompanyament emocional a persones en situació de crisi. Requereix formació en psicologia o treball social.', center: 'Càritas Reus', address: 'C/ Ample 12, Reus', phone: '977 31 44 22', hours: 'Dilluns i dijous 10h–13h', skills: ['psicologia', 'treball social', 'empatia'], urgency: 'alta', volunteers_needed: 6 },
];

interface Message { id: string; role: 'assistant' | 'user'; content: string; timestamp: Date; }
interface MatchResult { project: typeof VOLUNTEER_PROJECTS[0]; matchScore: number; reasoning: string; }

const QUESTIONS = [
  'Hola! Sóc l\'assistent de Càritas. Estic aquí per ajudar-te a trobar el projecte de voluntariat perfecte per a tu. 😊\n\nPrimer de tot, quina disponibilitat horària tens? (p.ex. caps de setmana, tardes entre setmana, matins...)',
  'Gràcies! Ara m\'agradaria saber una mica més sobre tu. Quines habilitats o experiència professional tens? (p.ex. educació, salut, tecnologia, administració, idiomes...)',
  'Perfecte! I per acabar, per quin motiu vols fer voluntariat a Càritas? Quina és la teva motivació principal?',
];

export default function VolunteerForm({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([{ id: '0', role: 'assistant', content: QUESTIONS[0], timestamp: new Date() }]);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // AQUESTA ÉS LA LÍNIA QUE HE CANVIAT
  const addMessage = (role: 'assistant' | 'user', content: string) => {
    setMessages((prev) => [...prev, { id: Date.now().toString() + Math.random().toString(36).substring(2, 9), role, content, timestamp: new Date() }]);
  };

  const callAnthropicAPI = async (userAnswers: string[]): Promise<MatchResult> => {
    const prompt = `Ets un assistent de Càritas Diocesana de Tarragona. El teu objectiu és connectar persones que volen ajudar amb els projectes adequats. Analitza el perfil de l'usuari i recomana el millor encaix. Respon sempre en català, de manera càlida i propera.\n\nPerfil del voluntari:\n- Disponibilitat: ${userAnswers[0]}\n- Habilitats: ${userAnswers[1]}\n- Motivació: ${userAnswers[2]}\n\nProjectes disponibles:\n${VOLUNTEER_PROJECTS.map((p, i) => `${i + 1}. ${p.name}: ${p.description}`).join('\n')}\n\nRetorna un JSON amb aquest format exacte (sense markdown, només JSON pur):\n{"project_id": número, "match_score": percentatge 0-100, "reasoning": "explicació càlida de 2-3 frases en català"}`;
    
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
      body: JSON.stringify({ model: 'claude-opus-4-5', max_tokens: 512, messages: [{ role: 'user', content: prompt }] }),
    });

    if (!response.ok) throw new Error('Error connecting to AI');
    const data = await response.json();
    const parsed = JSON.parse(data.content[0].text.trim());
    return { project: VOLUNTEER_PROJECTS.find((p) => p.id === parsed.project_id) || VOLUNTEER_PROJECTS[0], matchScore: parsed.match_score, reasoning: parsed.reasoning };
  };

  const mockMatch = (userAnswers: string[]): MatchResult => {
    const combined = userAnswers.join(' ').toLowerCase();
    let best = VOLUNTEER_PROJECTS[0];
    if (combined.includes('educaci') || combined.includes('tecnolog') || combined.includes('digital')) best = VOLUNTEER_PROJECTS[2];
    else if (combined.includes('dret') || combined.includes('juridic') || combined.includes('laboral')) best = VOLUNTEER_PROJECTS[3];
    else if (combined.includes('psicolog') || combined.includes('social')) best = VOLUNTEER_PROJECTS[4];
    else if (combined.includes('dissabte') || combined.includes('aliment')) best = VOLUNTEER_PROJECTS[1];
    return { project: best, matchScore: 87, reasoning: `Basant-nos en la teva disponibilitat i habilitats, el projecte "${best.name}" és el que millor s'adapta al teu perfil. Estem segurs que faràs una contribució molt valuosa!` };
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
        let result = apiKey ? await callAnthropicAPI(newAnswers) : (await new Promise((r) => setTimeout(r, 1800)), mockMatch(newAnswers));
        setMatchResult(result);
      } catch {
        setMatchResult(mockMatch(newAnswers));
      } finally {
        setIsLoading(false);
      }
    }
  };

  const urgencyLabel = (u: string) => u === 'alta' ? { label: 'Urgència ALTA', cls: 'bg-red-50 text-red-700 border border-red-200' } : u === 'mitjana' ? { label: 'Urgència MITJANA', cls: 'bg-amber-50 text-amber-700 border border-amber-200' } : { label: 'Urgència BAIXA', cls: 'bg-green-50 text-green-700 border border-green-200' };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-28 md:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 transition-all text-gray-500 hover:text-gray-800"><ArrowLeft size={20} /></button>
        <div><h1 className="text-2xl font-bold text-gray-900">Voluntari/a</h1><p className="text-sm text-gray-500">3 preguntes · ~2 minuts</p></div>
        <div className="ml-auto"><button onClick={() => setShowApiKeyInput(!showApiKeyInput)} className="text-xs text-gray-400 underline">{showApiKeyInput ? 'Amagar' : 'API Key'}</button></div>
      </div>

      {showApiKeyInput && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl animate-fade-in">
          <p className="text-xs text-amber-700 mb-2 font-medium">Clau API d'Anthropic (opcional)</p>
          <input type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} placeholder="sk-ant-..." className="w-full text-sm px-3 py-2 border border-amber-300 rounded-lg bg-white" />
        </div>
      )}

      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5"><span>Pregunta {Math.min(currentQuestion + 1, 3)} de 3</span><span>{Math.round(((currentQuestion + (answers.length > currentQuestion ? 1 : 0)) / 3) * 100)}%</span></div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all duration-500" style={{ background: '#C8102E', width: `${((Math.min(answers.length, 3)) / 3) * 100}%` }} /></div>
      </div>

      <div className="space-y-4 mb-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex chat-bubble ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2 mt-1" style={{ background: 'rgba(200,16,46,0.1)' }}><Sparkles size={14} style={{ color: '#C8102E' }} /></div>}
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant' ?'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-sm' :'text-white rounded-tr-sm'}`} style={msg.role === 'user' ? { background: '#C8102E' } : {}}>
              {msg.content.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</React.Fragment>)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start chat-bubble">
            <div className="w-8 h-8 rounded-full flex items-center justify-center mr-2" style={{ background: 'rgba(200,16,46,0.1)' }}><Sparkles size={14} style={{ color: '#C8102E' }} /></div>
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5 items-center">
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {matchResult && (
        <div className="mb-6 animate-fade-in-up">
          <div className="rounded-2xl border-2 p-6" style={{ borderColor: '#C8102E', background: 'rgba(200,16,46,0.02)' }}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1"><Sparkles size={16} style={{ color: '#C8102E' }} /><span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Millor encaix</span></div>
                <h3 className="text-xl font-bold text-gray-900">{matchResult.project.name}</h3>
              </div>
              <div className="flex-shrink-0 w-14 h-14 rounded-2xl flex flex-col items-center justify-center" style={{ background: '#C8102E' }}>
                <span className="text-white font-extrabold text-lg leading-none">{matchResult.matchScore}%</span><span className="text-white/70 text-[9px] font-medium">encaix</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">{matchResult.reasoning}</p>
            <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-2.5 mb-4">
              <div className="flex items-start gap-2.5 text-sm"><MapPin size={15} className="text-gray-400 mt-0.5 flex-shrink-0" /><div><div className="font-semibold text-gray-800">{matchResult.project.center}</div><div className="text-gray-500">{matchResult.project.address}</div></div></div>
              <div className="flex items-center gap-2.5 text-sm"><Phone size={15} className="text-gray-400 flex-shrink-0" /><a href={`tel:${matchResult.project.phone.replace(/\s/g, '')}`} className="text-gray-700 hover:underline font-medium">{matchResult.project.phone}</a></div>
              <div className="flex items-center gap-2.5 text-sm"><Clock size={15} className="text-gray-400 flex-shrink-0" /><span className="text-gray-600">{matchResult.project.hours}</span></div>
              <div className="flex items-center gap-2.5 text-sm"><User size={15} className="text-gray-400 flex-shrink-0" /><span className="text-gray-600">Es necessiten <strong className="text-gray-900">{matchResult.project.volunteers_needed} voluntaris</strong></span></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={`tel:${matchResult.project.phone.replace(/\s/g, '')}`} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white transition-all duration-150 hover:opacity-90 active:scale-95" style={{ background: '#C8102E' }}><Phone size={15} />Contactar ara</a>
              <button onClick={onBack} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm border-2 border-gray-200 text-gray-700 hover:bg-gray-50 transition-all duration-150 active:scale-95">Veure altres projectes</button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2"><span className={`text-xs font-semibold px-3 py-1 rounded-full ${urgencyLabel(matchResult.project.urgency).cls}`}>{urgencyLabel(matchResult.project.urgency).label}</span></div>
          </div>
        </div>
      )}

      {!matchResult && (
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
          <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Escriu aquí la teva resposta..." rows={2} disabled={isLoading} className="w-full resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none leading-relaxed" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">Prem Enter per enviar</span>
            <button onClick={handleSend} disabled={!userInput.trim() || isLoading} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-150 hover:opacity-90 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed" style={{ background: '#C8102E' }}>
              {isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}