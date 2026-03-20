'use client';

import React from 'react';
import { RadialBarChart, RadialBar, Tooltip, ResponsiveContainer } from 'recharts';

const COVERAGE_DATA = [
  { name: 'Acompanyament Gent Gran', coverage: 62, needed: 45, active: 28, fill: '#C8102E' },
  { name: 'Banc d\'Aliments', coverage: 78, needed: 60, active: 47, fill: '#E8415A' },
  { name: 'Reforç Escolar', coverage: 45, needed: 30, active: 13, fill: '#F4748A' },
  { name: 'Inserció Laboral', coverage: 88, needed: 25, active: 22, fill: '#9E0D24' },
  { name: 'Suport Psicosocial', coverage: 33, needed: 18, active: 6, fill: '#FCA5A5' },
];

const RADIAL_DATA = COVERAGE_DATA.map((item) => ({ ...item, value: item.coverage }));

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d = payload[0].payload;
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-lg px-4 py-3 max-w-[200px]">
        <p className="text-xs font-bold text-gray-900 mb-2 leading-tight">{d.name}</p>
        <div className="space-y-1">
          <div className="flex justify-between gap-4 text-xs"><span className="text-gray-500">Cobertura</span><span className="font-bold tabular-nums" style={{ color: '#C8102E' }}>{d.coverage}%</span></div>
          <div className="flex justify-between gap-4 text-xs"><span className="text-gray-500">Actius</span><span className="font-semibold tabular-nums text-gray-800">{d.active}</span></div>
          <div className="flex justify-between gap-4 text-xs"><span className="text-gray-500">Necessaris</span><span className="font-semibold tabular-nums text-gray-800">{d.needed}</span></div>
        </div>
      </div>
    );
  }
  return null;
};

export default function VolunteerCoverageChart() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-start justify-between mb-6">
        <div><h2 className="text-base font-bold text-gray-900">Cobertura de voluntariat</h2><p className="text-sm text-gray-500 mt-0.5">% de places cobertes · Actualitzat avui</p></div>
        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-600 border border-red-100">2 projectes en risc</span>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={RADIAL_DATA} startAngle={180} endAngle={0}>
          <RadialBar background={{ fill: '#F5F4F2' }} dataKey="value" cornerRadius={4} />
          <Tooltip content={<CustomTooltip />} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="mt-2 space-y-2.5">
        {COVERAGE_DATA.map((project) => (
          <div key={project.name} className="flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-gray-700 truncate pr-2">{project.name}</span>
                <span className={`text-xs font-bold tabular-nums flex-shrink-0 ${project.coverage >= 70 ? 'text-green-600' : project.coverage >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{project.coverage}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${project.coverage}%`, background: project.coverage >= 70 ? '#16A34A' : project.coverage >= 50 ? '#D97706' : '#C8102E' }} />
              </div>
            </div>
            <div className="text-right flex-shrink-0"><span className="text-[10px] text-gray-400 block">{project.active}/{project.needed}</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}