'use client';

import React, { useState } from 'react';
import { Heart, Building2, ChevronRight, Sparkles, HandHeart } from 'lucide-react';
import ChatbotVoluntari from './ChatbotVoluntari';
import ChatbotPersona from './ChatbotPersona';
import CompanyForm from './CompanyForm';

type FlowType = 'voluntari' | 'persona' | 'empresa' | null;

export default function HelpRequestFlow() {
  const [flowType, setFlowType] = useState<FlowType>(null);

  if (flowType === 'voluntari') return <ChatbotVoluntari onBack={() => setFlowType(null)} />;
  if (flowType === 'persona') return <ChatbotPersona onBack={() => setFlowType(null)} />;
  if (flowType === 'empresa') return <CompanyForm onBack={() => setFlowType(null)} />;

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 py-12 pb-24 md:pb-12">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6"
          style={{ background: 'rgba(200,16,46,0.08)', color: '#C8102E' }}>
          <Sparkles size={14} />
          <span>Powered by Intel·ligència Artificial</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 mb-4 leading-tight">
          Com podem <span style={{ color: '#C8102E' }}>ajudar-te</span>?
        </h1>
        <p className="text-lg text-gray-600 leading-relaxed">
          L'IA de Càritas t'acompanyarà i trobarà els recursos o projectes que millor s'adapten a la teva situació.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl">

        <button onClick={() => setFlowType('persona')}
          className="group relative bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-red-200 hover:shadow-xl transition-all duration-200 text-left cursor-pointer active:scale-95">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-200 group-hover:scale-110"
            style={{ background: 'rgba(200,16,46,0.1)' }}>
            <HandHeart size={28} style={{ color: '#C8102E' }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Necessito ajuda</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Persona en situació de vulnerabilitat que busca recursos i acompanyament de Càritas.
          </p>
          <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#C8102E' }}>
            Trobar recursos <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
          </div>
          <div className="absolute top-4 right-4 text-xs font-medium px-2 py-1 rounded-full"
            style={{ background: 'rgba(200,16,46,0.08)', color: '#C8102E' }}>9.818 persones ateses</div>
        </button>

        <button onClick={() => setFlowType('voluntari')}
          className="group relative bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-red-200 hover:shadow-xl transition-all duration-200 text-left cursor-pointer active:scale-95">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 transition-all duration-200 group-hover:scale-110"
            style={{ background: 'rgba(200,16,46,0.1)' }}>
            <Heart size={28} style={{ color: '#C8102E' }} />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Vull fer voluntariat</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Persona que vol dedicar temps i habilitats als projectes socials de Càritas.
          </p>
          <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: '#C8102E' }}>
            Trobar el meu projecte <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
          </div>
          <div className="absolute top-4 right-4 text-xs font-medium px-2 py-1 rounded-full"
            style={{ background: 'rgba(200,16,46,0.08)', color: '#C8102E' }}>1.177 voluntaris actius</div>
        </button>

        <button onClick={() => setFlowType('empresa')}
          className="group relative bg-white rounded-2xl p-8 border-2 border-gray-100 hover:border-blue-200 hover:shadow-xl transition-all duration-200 text-left cursor-pointer active:scale-95">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-blue-50 transition-all duration-200 group-hover:scale-110">
            <Building2 size={28} className="text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Soc empresa</h2>
          <p className="text-gray-500 text-sm leading-relaxed mb-4">
            Empresa o organització que vol col·laborar a través del programa Empreses amb Cor.
          </p>
          <div className="flex items-center gap-1 text-sm font-semibold text-blue-600">
            Explorar col·laboració <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
          </div>
          <div className="absolute top-4 right-4 text-xs font-medium px-2 py-1 rounded-full bg-blue-50 text-blue-600">
            73 empreses col·laboren</div>
        </button>

      </div>
    </div>
  );
}
