'use client';
import React, { useState } from 'react';
import { Heart, Building2, ChevronRight, Sparkles, HandHeart, Shield } from 'lucide-react';
import ChatbotVoluntari from './ChatbotVoluntari';
import ChatbotPersona from './ChatbotPersona';
import CompanyForm from './CompanyForm';
import WorkerForm from './WorkerForm';

type FlowType = 'voluntari' | 'persona' | 'empresa' | 'treballador' | null;

export default function HelpRequestFlow() {
  const [flowType, setFlowType] = useState<FlowType>(null);
  const [workerData, setWorkerData] = useState<Record<string,unknown> | null>(null);

  if (flowType === 'voluntari') return <ChatbotVoluntari onBack={() => setFlowType(null)} />;
  if (flowType === 'persona') return <ChatbotPersona onBack={() => setFlowType(null)} />;
  if (flowType === 'empresa') return <CompanyForm onBack={() => setFlowType(null)} />;
  if (flowType === 'treballador') return <WorkerForm onBack={() => setFlowType(null)} onLogin={(data) => { setWorkerData(data); setFlowType(null); }} />;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12 pb-24 md:pb-12">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6" style={{ background: 'rgba(200,16,46,0.08)', color: '#C8102E' }}>
          <Sparkles size={14} /><span>Powered by Intel·ligència Artificial</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">Com podem <span style={{ color: '#C8102E' }}>ajudar-te</span>?</h1>
        <p className="text-lg text-gray-600 leading-relaxed">L'IA de Càritas t'acompanyarà i trobarà els recursos o projectes que millor s'adapten a la teva situació.</p>
        {workerData && <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold bg-emerald-50 text-emerald-700"><Shield size={14} />Sessió activa: {String(workerData.name)}</div>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 w-full max-w-5xl">
        <button onClick={() => setFlowType('persona')} className="group relative bg-white rounded-2xl p-7 border-2 border-gray-100 hover:border-red-200 hover:shadow-xl transition-all duration-200 text-left cursor-pointer active:scale-95">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(200,16,46,0.1)' }}><HandHeart size={24} style={{ color: '#C8102E' }} /></div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Necessito ajuda</h2>
          <p className="text-gray-500 text-xs leading-relaxed mb-3">Persona en situació de vulnerabilitat que busca recursos i acompanyament.</p>
          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#C8102E' }}>Trobar recursos <ChevronRight size={14} /></div>
          <div className="absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(200,16,46,0.08)', color: '#C8102E' }}>9.818 ateses</div>
        </button>
        <button onClick={() => setFlowType('voluntari')} className="group relative bg-white rounded-2xl p-7 border-2 border-gray-100 hover:border-red-200 hover:shadow-xl transition-all duration-200 text-left cursor-pointer active:scale-95">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(200,16,46,0.1)' }}><Heart size={24} style={{ color: '#C8102E' }} /></div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Vull fer voluntariat</h2>
          <p className="text-gray-500 text-xs leading-relaxed mb-3">Persona que vol dedicar temps i habilitats als projectes socials de Càritas.</p>
          <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: '#C8102E' }}>Trobar projecte <ChevronRight size={14} /></div>
          <div className="absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full" style={{ background: 'rgba(200,16,46,0.08)', color: '#C8102E' }}>1.177 voluntaris</div>
        </button>
        <button onClick={() => setFlowType('empresa')} className="group relative bg-white rounded-2xl p-7 border-2 border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-200 text-left cursor-pointer active:scale-95">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-blue-50"><Building2 size={24} className="text-blue-600" /></div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Soc empresa</h2>
          <p className="text-gray-500 text-xs leading-relaxed mb-3">Empresa o organització que vol col·laborar via Empreses amb Cor.</p>
          <div className="flex items-center gap-1 text-xs font-semibold text-blue-600">Col·laborar <ChevronRight size={14} /></div>
          <div className="absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">73 empreses</div>
        </button>
        <button onClick={() => setFlowType('treballador')} className="group relative bg-white rounded-2xl p-7 border-2 border-gray-100 hover:border-emerald-200 hover:shadow-xl transition-all duration-200 text-left cursor-pointer active:scale-95">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4 bg-emerald-50"><Shield size={24} className="text-emerald-600" /></div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">Soc treballador</h2>
          <p className="text-gray-500 text-xs leading-relaxed mb-3">Personal intern de Càritas per gestionar casos i accedir al dashboard.</p>
          <div className="flex items-center gap-1 text-xs font-semibold text-emerald-600">Accés intern <ChevronRight size={14} /></div>
          <div className="absolute top-3 right-3 text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">Restringit</div>
        </button>
      </div>
    </div>
  );
}
