'use client';

import React, { useState } from 'react';
import { AlertTriangle, Users, MapPin, ChevronRight, Clock, CheckCircle2 } from 'lucide-react';

const URGENT_NEEDS = [
  { id: 1, project: 'Acompanyament Gent Gran — Tarragona Nord', center: 'Càritas Tarragona Centre', district: 'Tarragona', voluntarisMissing: 8, voluntarisActius: 3, urgency: 3, deadline: 'Avui', needType: 'Empatia, disponibilitat de tarda', status: 'critic' },
  { id: 2, project: 'Suport Psicosocial — Reus', center: 'Càritas Reus', district: 'Reus', voluntarisMissing: 6, voluntarisActius: 2, urgency: 3, deadline: 'Aquesta setmana', needType: 'Psicologia o treball social', status: 'critic' },
  { id: 3, project: 'Reforç Escolar — Bonavista', center: 'Càritas Bonavista', district: 'Bonavista', voluntarisMissing: 5, voluntarisActius: 4, urgency: 2, deadline: 'Proper mes', needType: 'Educació, paciència', status: 'atencio' },
  { id: 4, project: 'Banc d\'Aliments — El Vendrell', center: 'Càritas El Vendrell', district: 'El Vendrell', voluntarisMissing: 4, voluntarisActius: 8, urgency: 2, deadline: 'Proper mes', needType: 'Treball en equip', status: 'atencio' },
];

export default function UrgentNeedsPanel() {
  const [resolved, setResolved] = useState<number[]>([]);
  const activeNeeds = URGENT_NEEDS.filter((n) => !resolved.includes(n.id));

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-start justify-between mb-5">
        <div>
          <div className="flex items-center gap-2 mb-0.5"><AlertTriangle size={18} style={{ color: '#C8102E' }} /><h2 className="text-base font-bold text-gray-900">Necessitats urgents de voluntariat</h2></div>
          <p className="text-sm text-gray-500">{activeNeeds.length} projectes necessiten voluntaris ara</p>
        </div>
        <span className="text-xs font-bold px-3 py-1.5 rounded-full" style={{ background: 'rgba(200,16,46,0.1)', color: '#C8102E' }}>{activeNeeds.filter((n) => n.urgency === 3).length} crítiques</span>
      </div>

      {activeNeeds.length === 0 ? (
        <div className="text-center py-12"><CheckCircle2 size={40} className="mx-auto mb-3 text-green-500" /><p className="text-base font-semibold text-gray-700">Tot cobert!</p></div>
      ) : (
        <div className="space-y-3">
          {activeNeeds.map((need) => (
            <div key={need.id} className={`rounded-xl border p-4 transition-all duration-200 hover:shadow-sm ${need.status === 'critic' ?'border-red-200 bg-red-50/40' :'border-amber-100 bg-amber-50/30'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${need.urgency === 3 ? 'bg-red-100 text-red-700' :'bg-amber-100 text-amber-700'}`}>{need.urgency === 3 ? 'Crític' : 'Atenció'}</span>
                    <span className="text-[11px] text-gray-400 flex items-center gap-1"><Clock size={10} />{need.deadline}</span>
                  </div>
                  <h3 className="text-sm font-bold text-gray-900 leading-tight mb-1">{need.project}</h3>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                    <span className="flex items-center gap-1"><MapPin size={10} />{need.center}</span>
                    <span className="flex items-center gap-1"><Users size={10} />{need.voluntarisActius} actius · falta {need.voluntarisMissing}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: '#C8102E' }}>Publicar <ChevronRight size={12} /></button>
                  <button className="flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50" onClick={() => setResolved((prev) => [...prev, need.id])}><CheckCircle2 size={11} />Resolt</button>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-gray-400 mb-1"><span>Cobertura actual</span><span className="font-semibold">{Math.round((need.voluntarisActius / (need.voluntarisActius + need.voluntarisMissing)) * 100)}%</span></div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${Math.round((need.voluntarisActius / (need.voluntarisActius + need.voluntarisMissing)) * 100)}%`, background: need.urgency === 3 ? '#C8102E' : '#D97706' }} /></div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}