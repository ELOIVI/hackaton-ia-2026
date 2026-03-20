'use client';

import React, { useState } from 'react';
import { ArrowLeft, Send, Loader2, Sparkles, MapPin, Phone, Building2, Users, Euro } from 'lucide-react';

const COMPANY_PROGRAMS = [
  { id: 1, name: 'Empreses amb Cor — Voluntariat Corporatiu', description: 'Els teus empleats fan voluntariat en equip als nostres projectes. Activitats de team building amb impacte social real.', impact: 'Fins a 50 hores/any per empleat', contact: 'empreses@caritastarragona.org', phone: '977 21 00 36', center: 'Càritas Tarragona Centre', address: 'C/ Apodaca 14, Tarragona', type: 'Voluntariat corporatiu' },
  { id: 2, name: 'Programa de Donació d\'Aliments', description: 'Recollida periòdica d\'excedents alimentaris de la teva empresa per als bancs d\'aliments de Càritas.', impact: 'Reducció de residus + impacte social directe', contact: 'aliments@caritastarragona.org', phone: '977 21 00 36', center: 'Càritas Tarragona Centre', address: 'C/ Apodaca 14, Tarragona', type: 'Donació en espècie' },
  { id: 3, name: 'Inserció Laboral — Segones Oportunitats', description: 'Ofereix pràctiques o llocs de treball a persones en procés de reinserció social. Acompanyament complet de Càritas.', impact: 'Contractació amb suport tècnic de Càritas', contact: 'insercio@caritastarragona.org', phone: '977 21 00 36', center: 'Càritas Tarragona Centre', address: 'C/ Apodaca 14, Tarragona', type: 'Inserció laboral' },
  { id: 4, name: 'Patrocini de Projectes Específics', description: 'Finança un projecte concret de Càritas (habitatge, educació, alimentació) amb visibilitat de marca i informe d\'impacte.', impact: 'Des de 1.000€/any · Informe d\'impacte trimestral', contact: 'patrocini@caritastarragona.org', phone: '977 21 00 36', center: 'Càritas Tarragona Centre', address: 'C/ Apodaca 14, Tarragona', type: 'Patrocini econòmic' },
];

const COMPANY_QUESTIONS = [
  'Benvingut/da! Estic aquí per ajudar-te a trobar la millor manera de col·laborar amb Càritas. 🤝\n\nPrimer, quin és el sector de la teva empresa i quants empleats teniu aproximadament?',
  'Gràcies! Quin tipus de col·laboració us interessa més? (p.ex. voluntariat corporatiu dels empleats, donació d\'aliments, inserció laboral, patrocini...)',
  'Excel·lent! I quin impacte voleu aconseguir? Quins valors o causes socials s\'alineen amb la vostra cultura d\'empresa?',
];

interface Message { id: string; role: 'assistant' | 'user'; content: string; }

export default function CompanyForm({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<Message[]>([{ id: '0', role: 'assistant', content: COMPANY_QUESTIONS[0] }]);
  const [currentQ, setCurrentQ] = useState(0);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<typeof COMPANY_PROGRAMS[0] | null>(null);

  const addMessage = (role: 'assistant' | 'user', content: string) => setMessages((prev) => [...prev, { id: Date.now().toString(), role, content }]);

  const mockMatch = (ans: string[]) => {
    const combined = ans.join(' ').toLowerCase();
    if (combined.includes('aliment') || combined.includes('excedent')) return COMPANY_PROGRAMS[1];
    if (combined.includes('inserci') || combined.includes('laboral')) return COMPANY_PROGRAMS[2];
    if (combined.includes('patrocin') || combined.includes('econòm')) return COMPANY_PROGRAMS[3];
    return COMPANY_PROGRAMS[0];
  };

  const handleSend = async () => {
    if (!userInput.trim() || isLoading) return;
    const msg = userInput.trim(); setUserInput(''); addMessage('user', msg);
    const newAnswers = [...answers, msg]; setAnswers(newAnswers);

    if (currentQ < COMPANY_QUESTIONS.length - 1) {
      setIsLoading(true); await new Promise((r) => setTimeout(r, 700));
      addMessage('assistant', COMPANY_QUESTIONS[currentQ + 1]); setCurrentQ((q) => q + 1); setIsLoading(false);
    } else {
      setIsLoading(true); addMessage('assistant', 'Analitzant el perfil de la vostra empresa per trobar la col·laboració ideal... ✨');
      await new Promise((r) => setTimeout(r, 1600)); setResult(mockMatch(newAnswers)); setIsLoading(false);
    }
  };

  const typeIcon = (type: string) => type.includes('Voluntariat') ? <Users size={14} /> : type.includes('econòmic') ? <Euro size={14} /> : <Building2 size={14} />;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-28 md:pb-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-800"><ArrowLeft size={20} /></button>
        <div><h1 className="text-2xl font-bold text-gray-900">Empreses amb Cor</h1><p className="text-sm text-gray-500">3 preguntes · ~3 minuts</p></div>
        <div className="ml-auto"><span className="text-xs font-medium px-3 py-1.5 rounded-full bg-blue-50 text-blue-600">73 empreses col·laboren</span></div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between text-xs text-gray-400 mb-1.5"><span>Pregunta {Math.min(currentQ + 1, 3)} de 3</span><span>{Math.round((Math.min(answers.length, 3) / 3) * 100)}%</span></div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${(Math.min(answers.length, 3) / 3) * 100}%` }} /></div>
      </div>

      <div className="space-y-4 mb-6">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex chat-bubble ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-2 mt-1"><Building2 size={14} className="text-blue-600" /></div>}
            <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${msg.role === 'assistant' ?'bg-white border border-gray-100 text-gray-800 shadow-sm rounded-tl-sm' :'bg-blue-600 text-white rounded-tr-sm'}`}>
              {msg.content.split('\n').map((line, i) => <React.Fragment key={i}>{line}{i < msg.content.split('\n').length - 1 && <br />}</React.Fragment>)}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start chat-bubble">
            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center mr-2"><Loader2 size={14} className="text-blue-600 animate-spin" /></div>
            <div className="bg-white border border-gray-100 px-4 py-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1.5 items-center">
              <div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} /><div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '150ms' }} /><div className="w-2 h-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        )}
      </div>

      {result && (
        <div className="mb-6 animate-fade-in-up">
          <div className="rounded-2xl border-2 border-blue-200 p-6 bg-blue-50/30">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1"><Sparkles size={16} className="text-blue-600" /><span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Millor col·laboració</span></div>
                <h3 className="text-xl font-bold text-gray-900">{result.name}</h3>
                <span className="inline-flex items-center gap-1 mt-1 text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">{typeIcon(result.type)}{result.type}</span>
              </div>
            </div>
            <p className="text-gray-600 text-sm leading-relaxed mb-4">{result.description}</p>
            <div className="bg-white rounded-xl p-4 border border-gray-100 space-y-2.5 mb-4">
              <div className="flex items-center gap-2.5 text-sm"><Sparkles size={14} className="text-blue-500" /><span className="text-gray-700 font-medium">{result.impact}</span></div>
              <div className="flex items-start gap-2.5 text-sm"><MapPin size={14} className="text-gray-400 mt-0.5" /><div><div className="font-semibold text-gray-800">{result.center}</div><div className="text-gray-500">{result.address}</div></div></div>
              <div className="flex items-center gap-2.5 text-sm"><Phone size={14} className="text-gray-400" /><a href={`tel:${result.phone.replace(/\s/g, '')}`} className="text-gray-700 hover:underline font-medium">{result.phone}</a></div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <a href={`mailto:${result.contact}`} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white bg-blue-600 hover:bg-blue-700">Contactar per email</a>
              <a href={`tel:${result.phone.replace(/\s/g, '')}`} className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm border-2 border-gray-200 text-gray-700 hover:bg-gray-50"><Phone size={14} />Trucar</a>
            </div>
          </div>
        </div>
      )}

      {!result && (
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
          <textarea value={userInput} onChange={(e) => setUserInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} placeholder="Escriu aquí la vostra resposta..." rows={2} disabled={isLoading} className="w-full resize-none text-sm text-gray-800 placeholder-gray-400 focus:outline-none leading-relaxed" />
          <div className="flex items-center justify-between mt-2">
            <span className="text-xs text-gray-400">Prem Enter per enviar</span>
            <button onClick={handleSend} disabled={!userInput.trim() || isLoading} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-40">{isLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}Enviar</button>
          </div>
        </div>
      )}
    </div>
  );
}