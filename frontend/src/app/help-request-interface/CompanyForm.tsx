'use client';

import React, { useState } from 'react';
import { ArrowLeft, Building2 } from 'lucide-react';

export default function CompanyForm({ onBack, onLogin }: { onBack: () => void, onLogin: (data: any) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({ companyName: '', email: '', password: '', helpType: 'recursos', level: 'mitjà' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stored = JSON.parse(localStorage.getItem('companies_db') || '[]');
    
    if (mode === 'register') {
      const newComp = { ...formData, role: 'empresa' };
      stored.push(newComp);
      localStorage.setItem('companies_db', JSON.stringify(stored));
      onLogin(newComp);
    } else {
      const comp = stored.find((c: any) => c.email === formData.email && c.password === formData.password);
      if (comp) onLogin(comp);
      else alert('Dades incorrectes');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800"><ArrowLeft size={20} /> Tornar</button>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{mode === 'login' ? 'Login Empresa' : 'Registre Empresa'}</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <input required type="text" placeholder="Nom de l'empresa" className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setFormData({...formData, companyName: e.target.value})} />
              <select className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setFormData({...formData, helpType: e.target.value})}>
                <option value="recursos">Donació de Recursos</option>
                <option value="monetaria">Ajuda Monetària</option>
                <option value="psicologica">Suport Psicològic</option>
              </select>
              <select className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setFormData({...formData, level: e.target.value})}>
                <option value="baix">Compromís Baix</option>
                <option value="mitjà">Compromís Mitjà</option>
                <option value="alt">Compromís Alt</option>
              </select>
            </>
          )}
          <input required type="email" placeholder="Email corporatiu" className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setFormData({...formData, email: e.target.value})} />
          <input required type="password" placeholder="Contrasenya" className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setFormData({...formData, password: e.target.value})} />
          
          <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
            <Building2 size={18}/> {mode === 'login' ? 'Entrar' : 'Registrar Empresa'}
          </button>
        </form>
        
        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-sm text-gray-400 font-medium">
          {mode === 'login' ? "Vols col·laborar? Registra la teva empresa" : "Ja registrats? Accediu aquí"}
        </button>
      </div>
    </div>
  );
}