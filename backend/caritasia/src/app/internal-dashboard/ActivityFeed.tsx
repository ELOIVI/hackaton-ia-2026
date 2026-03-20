'use client';

import React from 'react';
import { UserPlus, MapPin, Building2, AlertTriangle, CheckCircle2 } from 'lucide-react';

const ACTIVITY_ITEMS = [
  { id: 1, type: 'volunteer_join', message: 'Nova voluntària incorporada', detail: 'Marta Vilanova → Reforç Escolar', time: 'Fa 12 min', icon: UserPlus, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
  { id: 2, type: 'need_alert', message: 'Nova sol·licitud urgent', detail: 'Família de 3 persones sense habitatge', time: 'Fa 28 min', icon: AlertTriangle, iconBg: 'bg-red-50', iconColor: 'text-red-600' },
  { id: 3, type: 'company_renewal', message: 'Conveni renovat', detail: 'Grup Sagessa — Empreses amb Cor', time: 'Fa 1h', icon: Building2, iconBg: 'bg-blue-50', iconColor: 'text-blue-600' },
  { id: 4, type: 'center_open', message: 'Punt d\'atenció obert', detail: 'Càritas Altafulla — primer servei', time: 'Fa 2h', icon: MapPin, iconBg: 'bg-purple-50', iconColor: 'text-purple-600' },
  { id: 5, type: 'need_resolved', message: 'Necessitat resolta', detail: 'Família Ramos — habitatge trobat', time: 'Fa 3h', icon: CheckCircle2, iconBg: 'bg-green-50', iconColor: 'text-green-600' },
];

export default function ActivityFeed() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-5">
        <div><h2 className="text-base font-bold text-gray-900">Activitat recent</h2><p className="text-sm text-gray-500 mt-0.5">Últimes 24 hores</p></div>
        <span className="flex items-center gap-1.5 text-[11px] font-medium text-green-700 bg-green-50 px-2.5 py-1 rounded-full"><span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />En viu</span>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1 -mx-2 px-2">
        {ACTIVITY_ITEMS.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={item.id} className="flex items-start gap-3 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50/50 rounded-xl px-2 -mx-2 animate-fade-in" style={{ animationDelay: `${index * 50}ms` }}>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${item.iconBg}`}><Icon size={14} className={item.iconColor} /></div>
              <div className="flex-1 min-w-0"><p className="text-sm font-semibold text-gray-900 leading-tight">{item.message}</p><p className="text-xs text-gray-500 mt-0.5 leading-snug">{item.detail}</p></div>
              <span className="text-[10px] text-gray-400 flex-shrink-0 mt-0.5 font-medium whitespace-nowrap">{item.time}</span>
            </div>
          );
        })}
      </div>
      <button className="mt-4 w-full text-xs font-semibold py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">Veure tot l'historial</button>
    </div>
  );
}