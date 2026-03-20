'use client';

import React from 'react';
import { Users, Heart, MapPin, Building2, TrendingUp, TrendingDown, AlertTriangle, Clock } from 'lucide-react';

const KPI_DATA = [
  { id: 'ateses', label: 'Persones ateses', sublabel: 'Any 2025', value: '9.818', trend: '+4,2%', trendDirection: 'up', trendLabel: 'vs any anterior', icon: Users, bgColor: 'bg-red-50', iconColor: 'text-red-600', borderColor: 'border-red-100', trendColor: 'text-red-600', isHero: true },
  { id: 'voluntaris', label: 'Voluntaris actius', sublabel: 'Incorporació: 3 mesos', value: '1.177', trend: '+12', trendDirection: 'up', trendLabel: 'nous aquest mes', icon: Heart, bgColor: 'bg-rose-50', iconColor: 'text-rose-600', borderColor: 'border-rose-100', trendColor: 'text-green-600', isHero: false },
  { id: 'punts', label: 'Punts d\'atenció', sublabel: 'Província de Tarragona', value: '78', trend: '+2', trendDirection: 'up', trendLabel: 'oberts aquest any', icon: MapPin, bgColor: 'bg-blue-50', iconColor: 'text-blue-600', borderColor: 'border-blue-100', trendColor: 'text-green-600', isHero: false },
  { id: 'empreses', label: 'Empreses amb Cor', sublabel: 'Col·laboradores actives', value: '73', trend: '-3', trendDirection: 'down', trendLabel: 'vs trimestre anterior', icon: Building2, bgColor: 'bg-amber-50', iconColor: 'text-amber-600', borderColor: 'border-amber-100', trendColor: 'text-red-500', isHero: false, note: 'Cal renovar convenis' },
  { id: 'urgents', label: 'Necessitats urgents', sublabel: 'Sense cobertura avui', value: '34', trend: '+8', trendDirection: 'up', trendLabel: 'vs ahir', icon: AlertTriangle, bgColor: 'bg-red-50', iconColor: 'text-red-600', borderColor: 'border-red-200', trendColor: 'text-red-600', isHero: false, note: 'Acció urgent requerida', isAlert: true },
  { id: 'incorporacio', label: 'Temps incorporació', sublabel: 'Voluntaris nous', value: '74 dies', trend: '-16 dies', trendDirection: 'down_good', trendLabel: 'vs objectiu 90 dies', icon: Clock, bgColor: 'bg-green-50', iconColor: 'text-green-600', borderColor: 'border-green-100', trendColor: 'text-green-600', isHero: false, note: 'Objectiu: < 30 dies' },
];

export default function DashboardKPIs() {
  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-4 gap-4">
        {KPI_DATA.map((kpi, index) => {
          const Icon = kpi.icon;
          const isHero = index === 0;
          return (
            <div key={kpi.id} className={`relative bg-white rounded-2xl border p-5 transition-all duration-200 hover:shadow-md ${isHero ? 'col-span-2 md:col-span-2' : 'col-span-1'} ${(kpi as any).isAlert ? 'border-red-200 animate-pulse-red' : kpi.borderColor}`}>
              {(kpi as any).isAlert && <div className="absolute top-3 right-3"><span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700 border border-red-200 uppercase tracking-wider">Urgent</span></div>}
              <div className="flex items-start gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${kpi.bgColor}`}><Icon size={isHero ? 22 : 18} className={kpi.iconColor} /></div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider leading-none mb-0.5">{kpi.label}</p>
                  <p className="text-[11px] text-gray-400">{kpi.sublabel}</p>
                </div>
              </div>
              <div className={`font-extrabold text-gray-900 tabular-nums ${isHero ? 'text-4xl md:text-5xl' : 'text-2xl md:text-3xl'}`}>{kpi.value}</div>
              <div className="flex items-center gap-1.5 mt-2">
                {kpi.trendDirection === 'up' ? <TrendingUp size={13} className={kpi.trendColor} /> : kpi.trendDirection === 'down_good' ? <TrendingDown size={13} className="text-green-600" /> : <TrendingDown size={13} className={kpi.trendColor} />}
                <span className={`text-xs font-semibold ${kpi.trendColor}`}>{kpi.trend}</span><span className="text-xs text-gray-400">{kpi.trendLabel}</span>
              </div>
              {kpi.note && <p className={`text-[11px] font-medium mt-1.5 ${(kpi as any).isAlert ? 'text-red-600' : 'text-gray-400'}`}>{kpi.note}</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}