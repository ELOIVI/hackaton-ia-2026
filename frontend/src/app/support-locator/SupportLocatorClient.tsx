'use client';

import React, { useState } from 'react';
import { Loader2, Sparkles, MapPin, X, ChevronRight, Search } from 'lucide-react';
import dynamic from 'next/dynamic';

export const ATTENTION_CENTERS = [
  { id: 1, name: 'Càritas Tarragona Centre', address: 'C/ Apodaca 14, Tarragona', phone: '977 21 00 36', lat: 41.1189, lng: 1.2445, services: ['habitatge', 'economia', 'alimentació', 'documentació', 'salut'], hours: 'Dl–Dv 9h–13h i 16h–19h', district: 'Tarragona Centre' },
  { id: 2, name: 'Càritas Bonavista', address: 'C/ Riu Ebre s/n, Tarragona', phone: '977 55 12 43', lat: 41.0980, lng: 1.2180, services: ['alimentació', 'economia', 'documentació'], hours: 'Dl, Dc, Dv 9h–12h', district: 'Bonavista' },
  { id: 3, name: 'Càritas Sant Pere i Sant Pau', address: 'Av. Vidal i Barraquer 2, Tarragona', phone: '977 20 88 71', lat: 41.1050, lng: 1.2350, services: ['habitatge', 'educació', 'economia'], hours: 'Dl–Dv 10h–13h', district: 'Sant Pere i Sant Pau' },
  { id: 4, name: 'Càritas Reus', address: 'C/ Ample 12, Reus', phone: '977 31 44 22', lat: 41.1561, lng: 1.1065, services: ['habitatge', 'economia', 'alimentació', 'documentació', 'salut', 'educació'], hours: 'Dl–Dv 9h–13h i 16h–19h', district: 'Reus' },
  { id: 5, name: 'Càritas Cambrils', address: 'C/ Consolat de Mar 3, Cambrils', phone: '977 36 12 88', lat: 41.0651, lng: 1.0593, services: ['alimentació', 'economia', 'documentació'], hours: 'Dl, Dc 10h–13h', district: 'Cambrils' },
];

const SERVICE_LABELS: Record<string, { label: string; cls: string }> = {
  habitatge: { label: 'Habitatge', cls: 'badge-habitatge' }, alimentació: { label: 'Alimentació', cls: 'badge-alimentacio' },
  economia: { label: 'Economia', cls: 'badge-economia' }, documentació: { label: 'Documentació', cls: 'badge-documentacio' },
  salut: { label: 'Salut', cls: 'badge-salut' }, educació: { label: 'Educació', cls: 'badge-solitud' },
  general: { label: 'General', cls: 'bg-gray-100 text-gray-700' },
};
const ALL_SERVICES = Object.keys(SERVICE_LABELS);

const SERVICE_KEYWORDS: Record<string, string[]> = {
  habitatge: ['habitatge', 'vivienda', 'housing', 'pis', 'casa', 'hogar', 'dormir', 'lloguer', 'alquiler', 'rent'],
  alimentació: ['alimentació', 'alimentacion', 'food', 'menjar', 'comida', 'aliments', 'alimentos'],
  economia: ['economia', 'economía', 'money', 'diners', 'dinero', 'deute', 'deuda', 'factura', 'facturas'],
  documentació: ['documentació', 'documentacion', 'documentation', 'papers', 'papeles', 'dni', 'nie', 'permiso'],
  salut: ['salut', 'salud', 'health', 'metge', 'medico', 'médico', 'hospital', 'medicina'],
  educació: ['educació', 'educacion', 'education', 'escola', 'escuela', 'school', 'estudi', 'estudio'],
};

const SupportMap = dynamic(() => import('./SupportMap'), { ssr: false, loading: () => (
  <div className="w-full h-full flex items-center justify-center bg-gray-100 rounded-2xl animate-pulse">
    <div className="text-center text-gray-400"><MapPin size={32} className="mx-auto mb-2 opacity-40" /><p className="text-sm">Carregant mapa...</p></div>
  </div>
) });

interface AIResult { tipo_necessitat: string; urgencia: number; descripcio_breu: string; servei_recomanat: string; }

function detectServiceFromQuery(query: string): string | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  for (const [service, keywords] of Object.entries(SERVICE_KEYWORDS)) {
    if (keywords.some((keyword) => normalized.includes(keyword))) {
      return service;
    }
  }

  return null;
}

function searchCenters(query: string, service: string | null) {
  const normalized = query.trim().toLowerCase();

  return ATTENTION_CENTERS.filter((center) => {
    const matchesService = !service || center.services.includes(service);
    const haystack = `${center.name} ${center.address} ${center.district} ${center.services.join(' ')}`.toLowerCase();
    const matchesText = !normalized || haystack.includes(normalized);
    return matchesService && matchesText;
  });
}

export default function SupportLocatorClient() {
  const [filterService, setFilterService] = useState<string | null>(null);
  const [selectedCenter, setSelectedCenter] = useState<typeof ATTENTION_CENTERS[0] | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [highlightedCenters, setHighlightedCenters] = useState<typeof ATTENTION_CENTERS>([]);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [queryInput, setQueryInput] = useState('');
  const [textFilter, setTextFilter] = useState('');

  const filteredCenters = ATTENTION_CENTERS.filter((c) => {
    const matchesService = !filterService || c.services.includes(filterService);
    const matchesText = !textFilter || c.name.toLowerCase().includes(textFilter.toLowerCase()) || c.address.toLowerCase().includes(textFilter.toLowerCase());
    return matchesService && matchesText;
  });

  const analyzeNeed = async () => {
    if (!queryInput.trim()) return;
    setIsAnalyzing(true); setShowAiPanel(true);

    try {
      await new Promise((r) => setTimeout(r, 280));
      const detectedService = detectServiceFromQuery(queryInput);
      const centers = searchCenters(queryInput, detectedService);
      setTextFilter(queryInput.trim());

      if (centers.length > 0) {
        const servei = detectedService
          ? SERVICE_LABELS[detectedService]?.label || 'Atenció general'
          : 'Atenció general';
        const result: AIResult = {
          tipo_necessitat: detectedService || 'general',
          urgencia: detectedService ? 2 : 1,
          descripcio_breu: detectedService
            ? `Hem detectat necessitat de ${detectedService}. Podem ajudar-te.`
            : `Hem trobat ${centers.length} centre(s) relacionat(s) amb la teva cerca.`,
          servei_recomanat: servei,
        };
        setAiResult(result);
        setHighlightedCenters(centers.slice(0, 3));
        setFilterService(detectedService);
      } else {
        setAiResult({
          tipo_necessitat: 'general',
          urgencia: 1,
          descripcio_breu: 'Ho sentim, no hem trobat la teva cerca.',
          servei_recomanat: 'Atenció general',
        });
        setHighlightedCenters([]);
        setFilterService(null);
      }
    } catch {
      setAiResult({ tipo_necessitat: 'general', urgencia: 1, descripcio_breu: 'Podem ajudar-te. Contacta amb el centre més proper.', servei_recomanat: 'Atenció general' });
      setHighlightedCenters(ATTENTION_CENTERS.slice(0, 3));
    } finally { setIsAnalyzing(false); }
  };

  const urgencyConfig = (u: number) => u === 3 ? { label: 'Alta', cls: 'urgency-3', icon: '🔴' } : u === 2 ? { label: 'Moderada', cls: 'urgency-2', icon: '🟡' } : { label: 'Baixa', cls: 'urgency-1', icon: '🟢' };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] pb-16 md:pb-0">
      <div className="bg-white border-b border-gray-100 px-4 py-4 shadow-sm flex-shrink-0">
        <div className="max-w-screen-2xl mx-auto flex flex-col gap-3">
          <div className="flex gap-2">
            <textarea value={queryInput} onChange={(e) => setQueryInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); analyzeNeed(); } }} placeholder="Explica la teva situació (p.ex. 'No tinc on dormir')" rows={2} className="w-full resize-none text-sm border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#C8102E]" />
            <button onClick={analyzeNeed} disabled={!queryInput.trim() || isAnalyzing} className="flex-shrink-0 flex flex-col items-center justify-center gap-1 px-4 py-3 rounded-xl text-white hover:opacity-90 disabled:opacity-40" style={{ background: '#C8102E' }}>
              {isAnalyzing ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}<span className="text-[10px] hidden sm:block">Analitzar</span>
            </button>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <div className="relative flex-shrink-0"><Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" /><input type="text" value={textFilter} onChange={(e) => setTextFilter(e.target.value)} placeholder="Cerca centre..." className="pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg w-36" /></div>
            <button onClick={() => setFilterService(null)} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${!filterService ? 'text-white' :'bg-gray-100 text-gray-600'}`} style={!filterService ? { background: '#C8102E' } : {}}>Tots</button>
            {ALL_SERVICES.map((s) => (
              <button key={s} onClick={() => setFilterService(filterService === s ? null : s)} className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium ${filterService === s ? 'text-white' :'bg-gray-100 text-gray-600'}`} style={filterService === s ? { background: '#C8102E' } : {}}>{SERVICE_LABELS[s].label}</button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 xl:w-96 flex-shrink-0 bg-white border-r border-gray-100 overflow-y-auto hidden md:block">
          {showAiPanel && (
            <div className="m-3 rounded-xl p-4 border animate-fade-in-up" style={{ background: 'rgba(200,16,46,0.04)', borderColor: 'rgba(200,16,46,0.2)' }}>
              <div className="flex justify-between mb-2"><div className="flex items-center gap-1.5"><Sparkles size={14} style={{ color: '#C8102E' }} /><span className="text-xs font-semibold text-gray-400">Resultat de cerca</span></div><button onClick={() => setShowAiPanel(false)}><X size={14} className="text-gray-400" /></button></div>
              {isAnalyzing ? <div className="flex items-center gap-2 text-sm text-gray-500 py-2"><Loader2 size={14} className="animate-spin" />Cercant...</div> : aiResult && (
                <><div className="flex gap-2 mb-2"><span className={`text-xs px-2 py-0.5 rounded-full ${SERVICE_LABELS[aiResult.tipo_necessitat]?.cls}`}>{aiResult.tipo_necessitat}</span><span className={`text-xs px-2 py-0.5 rounded-full ${urgencyConfig(aiResult.urgencia).cls}`}>{urgencyConfig(aiResult.urgencia).icon} {urgencyConfig(aiResult.urgencia).label}</span></div><p className="text-sm text-gray-700">{aiResult.descripcio_breu}</p></>
              )}
            </div>
          )}
          <div className="px-4 py-3 flex justify-between border-b border-gray-100"><span className="text-sm font-semibold">{filteredCenters.length} centres</span></div>
          <div className="divide-y divide-gray-50">
            {filteredCenters.length === 0 && (
              <div className="px-4 py-6 text-sm text-gray-500">Ho sentim, no hem trobat la teva cerca.</div>
            )}
            {filteredCenters.map((center) => (
              <button key={center.id} onClick={() => setSelectedCenter(selectedCenter?.id === center.id ? null : center)} className={`w-full text-left px-4 py-4 hover:bg-gray-50 ${selectedCenter?.id === center.id ? 'bg-red-50' : ''}`}>
                <div className="flex justify-between mb-1.5">
                  <div><h3 className="text-sm font-semibold">{center.name}</h3><div className="flex items-center gap-1 text-xs text-gray-500"><MapPin size={11} />{center.address}</div></div>
                  <ChevronRight size={14} className="text-gray-400 mt-0.5" />
                </div>
                <div className="flex flex-wrap gap-1 mb-2">
                  {center.services.slice(0, 3).map((s) => <span key={s} className={`text-[10px] px-1.5 py-0.5 rounded-full ${SERVICE_LABELS[s]?.cls}`}>{SERVICE_LABELS[s]?.label}</span>)}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 relative">
          <SupportMap centers={filteredCenters} highlightedCenters={highlightedCenters} selectedCenter={selectedCenter} onSelectCenter={setSelectedCenter} />
        </div>
      </div>
    </div>
  );
}