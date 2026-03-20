'use client';

import React, { useState } from 'react';
import { Building2, ChevronRight, AlertCircle, CheckCircle2, Clock, TrendingUp } from 'lucide-react';

const PARTNERS = [
  { id: 1, name: 'Repsol Tarragona', sector: 'Energia', type: 'Voluntariat corporatiu + Patrocini', status: 'actiu', employees_volunteered: 42, contribution: '12.500€/any', renewal: '2026-12-31', daysToRenewal: 285 },
  { id: 2, name: 'Grup Sagessa', sector: 'Salut', type: 'Inserció laboral', status: 'actiu', employees_volunteered: 18, contribution: '8.000€/any', renewal: '2026-06-30', daysToRenewal: 102 },
  { id: 3, name: 'Caixa d\'Enginyers', sector: 'Finances', type: 'Patrocini econòmic', status: 'renovacio', employees_volunteered: 0, contribution: '5.000€/any', renewal: '2026-04-01', daysToRenewal: 12 },
  { id: 4, name: 'Bon Preu Supermercats', sector: 'Alimentació', type: 'Donació d\'aliments', status: 'actiu', employees_volunteered: 8, contribution: '15t aliments/any', renewal: '2026-09-30', daysToRenewal: 194 },
];

const statusConfig: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
  actiu: { label: 'Actiu', cls: 'bg-green-50 text-green-700 border border-green-200', icon: <CheckCircle2 size={11} /> },
  renovacio: { label: 'Pendent renovació', cls: 'bg-amber-50 text-amber-700 border border-amber-200', icon: <Clock size={11} /> },
};

export default function CorporatePartners() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const pendingRenewal = PARTNERS.filter((p) => p.status === 'renovacio').length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-0.5"><Building2 size={18} className="text-blue-600" /><h2 className="text-base font-bold text-gray-900">Empreses amb Cor</h2></div>
          <p className="text-sm text-gray-500">73 empreses col·laboradores · {pendingRenewal} convenis per renovar</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingRenewal > 0 && <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200"><AlertCircle size={11} />{pendingRenewal} renovacions pendents</span>}
          <button className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: '#C8102E' }}>+ Afegir empresa</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {PARTNERS.map((partner) => {
          const sc = statusConfig[partner.status];
          const isExpanded = expanded === partner.id;
          const isUrgent = partner.daysToRenewal <= 14;

          return (
            <div key={partner.id} className={`rounded-xl border p-4 cursor-pointer transition-all duration-200 hover:shadow-sm ${isUrgent ? 'border-amber-200 bg-amber-50/30' :'border-gray-100 hover:border-gray-200'} ${isExpanded ? 'shadow-md' : ''}`} onClick={() => setExpanded(isExpanded ? null : partner.id)}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0 pr-2"><p className="text-sm font-bold text-gray-900 leading-tight">{partner.name}</p><p className="text-xs text-gray-400 mt-0.5">{partner.sector}</p></div>
                <div className="flex items-center gap-1 flex-shrink-0"><span className={`flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full ${sc.cls}`}>{sc.icon}{sc.label}</span></div>
              </div>
              <p className="text-xs text-gray-600 mb-3 leading-snug">{partner.type}</p>
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  {partner.employees_volunteered > 0 && <span className="flex items-center gap-1 text-gray-500"><TrendingUp size={11} className="text-green-500" />{partner.employees_volunteered} empleats voluntaris</span>}
                </div>
                <ChevronRight size={14} className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
              </div>
              {isExpanded && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2 animate-fade-in">
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Contribució</span><span className="font-semibold text-gray-800">{partner.contribution}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-gray-500">Renovació conveni</span><span className={`font-semibold ${isUrgent ? 'text-amber-600' : 'text-gray-800'}`}>{partner.renewal} {isUrgent && `(${partner.daysToRenewal} dies)`}</span></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}