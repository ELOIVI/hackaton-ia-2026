'use client';
import React from 'react';
import { Building2, TrendingUp, Users, Package, Heart, LogOut } from 'lucide-react';

// Dades de demo — en producció vindrien de /dashboard/empresa/:id
const IMPACTE_DEMO = {
  persones_impactades: 127,
  recursos_distribuits: 43,
  cistelles_alimentaries: 28,
  sessions_formacio: 15,
  distribucio: [
    { tipus: 'Alimentació', valor: 45, color: '#C8102E' },
    { tipus: 'Formació laboral', valor: 30, color: '#3b82f6' },
    { tipus: 'Material oficina', valor: 15, color: '#10b981' },
    { tipus: 'Altres', valor: 10, color: '#f59e0b' },
  ],
  evolucio: [
    { mes: 'Gen', persones: 18 },
    { mes: 'Feb', persones: 24 },
    { mes: 'Mar', persones: 32 },
  ]
};

export default function CompanyDashboard({ user, onLogout }: { user: Record<string,unknown>; onLogout: () => void }) {
  const maxVal = Math.max(...IMPACTE_DEMO.evolucio.map(e => e.persones));

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-blue-50">
              <Building2 size={28} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{String(user.companyName || 'Empresa')}</h1>
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-600">
                Empresa amb Cor
              </span>
            </div>
          </div>
          <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
            <LogOut size={20} />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-blue-50 rounded-2xl p-4 text-center">
            <div className="text-3xl font-extrabold text-blue-700">{IMPACTE_DEMO.persones_impactades}</div>
            <div className="text-xs text-blue-500 mt-1 flex items-center justify-center gap-1">
              <Users size={10} />Persones impactades
            </div>
          </div>
          <div className="bg-red-50 rounded-2xl p-4 text-center">
            <div className="text-3xl font-extrabold" style={{ color: '#C8102E' }}>{IMPACTE_DEMO.recursos_distribuits}</div>
            <div className="text-xs mt-1 flex items-center justify-center gap-1" style={{ color: '#C8102E' }}>
              <Package size={10} />Recursos distribuïts
            </div>
          </div>
          <div className="bg-green-50 rounded-2xl p-4 text-center">
            <div className="text-3xl font-extrabold text-green-700">{IMPACTE_DEMO.cistelles_alimentaries}</div>
            <div className="text-xs text-green-500 mt-1 flex items-center justify-center gap-1">
              <Heart size={10} />Cistelles alimentàries
            </div>
          </div>
          <div className="bg-amber-50 rounded-2xl p-4 text-center">
            <div className="text-3xl font-extrabold text-amber-700">{IMPACTE_DEMO.sessions_formacio}</div>
            <div className="text-xs text-amber-500 mt-1 flex items-center justify-center gap-1">
              <TrendingUp size={10} />Sessions formació
            </div>
          </div>
        </div>
      </div>

      {/* Distribució recursos */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Distribució de recursos</h2>
        <div className="space-y-3">
          {IMPACTE_DEMO.distribucio.map((d, i) => (
            <div key={i}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-700 font-medium">{d.tipus}</span>
                <span className="font-bold" style={{ color: d.color }}>{d.valor}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${d.valor}%`, background: d.color }} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Evolució mensual */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">Evolució mensual</h2>
        <div className="flex items-end gap-4 h-24">
          {IMPACTE_DEMO.evolucio.map((e, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1">
              <span className="text-xs font-bold text-gray-600">{e.persones}</span>
              <div className="w-full rounded-t-lg transition-all duration-500"
                style={{ height: `${(e.persones / maxVal) * 80}px`, background: '#C8102E', opacity: 0.7 + i * 0.15 }} />
              <span className="text-xs text-gray-400">{e.mes}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
