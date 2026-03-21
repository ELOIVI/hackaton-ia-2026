'use client';
import React, { useState } from 'react';
import { Heart, MapPin, Clock, Users, Star, LogOut } from 'lucide-react';
import { getStoredLang } from '@/lib/i18n';

// Dades sintètiques de demo per mostrar el dashboard
// En producció vindrien de S3 via el backend
const CASOS_DEMO = [
  { id: '001', nom: 'Família García', necessitat: 'Habitatge', urgencia: 'alta', data: '2026-03-18', estat: 'actiu' },
  { id: '002', nom: 'Persona B.', necessitat: 'Alimentació', urgencia: 'mitjana', data: '2026-03-15', estat: 'actiu' },
  { id: '003', nom: 'Sr. Martínez', necessitat: 'Acompanyament', urgencia: 'baixa', data: '2026-03-10', estat: 'tancat' },
];

const PROJECTES_DEMO = [
  { nom: 'Acollida i Acompanyament', horari: 'Caps de setmana 10h-13h', persones: 12, compatibilitat: 98 },
  { nom: 'Banc d\'Aliments', horari: 'Dissabtes 9h-13h', persones: 8, compatibilitat: 85 },
  { nom: 'Suport Escolar', horari: 'Divendres 17h-19h', persones: 5, compatibilitat: 60 },
];

const URGENCY_COLORS: Record<string, string> = {
  alta: 'bg-red-50 text-red-700 border-red-200',
  mitjana: 'bg-amber-50 text-amber-700 border-amber-200',
  baixa: 'bg-green-50 text-green-700 border-green-200',
};

export default function VolunteerDashboard({ user, onLogout }: { user: Record<string,unknown>; onLogout: () => void }) {
  const expedients = CASOS_DEMO;
  const [tab, setTab] = useState<'casos' | 'projectes'>('casos');
  const lang = getStoredLang();
  const dateLocale = lang === 'es' ? 'es-ES' : lang === 'en' ? 'en-US' : 'ca-ES';

  const actius = expedients.filter(e => e.estat === 'actiu').length;
  const tancats = expedients.filter(e => e.estat === 'tancat').length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Capçalera */}
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: 'rgba(200,16,46,0.1)' }}>
              <Heart size={28} style={{ color: '#C8102E' }} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{String(user.nom || 'Voluntari/a')}</h1>
              <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ background: 'rgba(200,16,46,0.08)', color: '#C8102E' }}>
                Voluntari/a Càritas
              </span>
            </div>
          </div>
          <button onClick={onLogout} className="p-2 text-gray-400 hover:text-red-600 transition-colors">
            <LogOut size={20} />
          </button>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-extrabold text-gray-900">{actius + tancats}</div>
            <div className="text-xs text-gray-500 mt-1">Total ajudades</div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-extrabold" style={{ color: '#C8102E' }}>{actius}</div>
            <div className="text-xs text-gray-500 mt-1">Casos actius</div>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-center">
            <div className="text-2xl font-extrabold text-green-600">{tancats}</div>
            <div className="text-xs text-gray-500 mt-1">Completats</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setTab('casos')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'casos' ? 'text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          style={tab === 'casos' ? { background: '#C8102E' } : {}}>
          Persones que ajudo
        </button>
        <button onClick={() => setTab('projectes')}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${tab === 'projectes' ? 'text-white' : 'bg-white text-gray-500 border border-gray-200'}`}
          style={tab === 'projectes' ? { background: '#C8102E' } : {}}>
          Projectes recomanats
        </button>
      </div>

      {/* Casos actius */}
      {tab === 'casos' && (
        <div className="space-y-3">
          {expedients.map(cas => (
            <div key={cas.id} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900">{cas.nom}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${URGENCY_COLORS[cas.urgencia]}`}>
                    {cas.urgencia.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><MapPin size={10} />{cas.necessitat}</span>
                  <span className="flex items-center gap-1"><Clock size={10} />{new Date(cas.data).toLocaleDateString(dateLocale)}</span>
                </div>
              </div>
              <div className={`text-xs font-medium px-2 py-1 rounded-lg ${cas.estat === 'actiu' ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {cas.estat === 'actiu' ? 'Actiu' : 'Tancat'}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Projectes recomanats per compatibilitat */}
      {tab === 'projectes' && (
        <div className="space-y-3">
          <p className="text-xs text-gray-400 px-1">Ordenats per compatibilitat amb el teu perfil i disponibilitat</p>
          {PROJECTES_DEMO.map((proj, i) => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Star size={14} style={{ color: '#C8102E' }} />
                    <span className="text-sm font-semibold text-gray-900">{proj.nom}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                    <span className="flex items-center gap-1"><Clock size={10} />{proj.horari}</span>
                    <span className="flex items-center gap-1"><Users size={10} />{proj.persones} persones</span>
                  </div>
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-lg font-extrabold" style={{ color: proj.compatibilitat > 80 ? '#C8102E' : '#6b7280' }}>
                    {proj.compatibilitat}%
                  </span>
                  <span className="text-[10px] text-gray-400">compatibilitat</span>
                </div>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5">
                <div className="h-1.5 rounded-full" style={{ width: `${proj.compatibilitat}%`, background: '#C8102E' }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
