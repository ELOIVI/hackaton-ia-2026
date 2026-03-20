'use client';

import React, { useState } from 'react';
import { ArrowLeft, Shield } from 'lucide-react';

export default function WorkerForm({ onBack, onLogin }: { onBack: () => void, onLogin: (data: any) => void }) {
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@caritas.org' && pass === '1234') {
      onLogin({ name: 'Personal Càritas', role: 'treballador', email, location: 'Tarragona Seu' });
    } else {
      alert('Credencials corporatives no vàlides');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800"><ArrowLeft size={20} /> Tornar</button>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Accés Intern</h1>
        <div className="bg-emerald-50 p-4 rounded-2xl text-emerald-700 text-xs mb-6 font-medium">
          Aquesta àrea és restringida exclusivament per a personal contractat.
        </div>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <input required type="email" placeholder="Email corporatiu" className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setEmail(e.target.value)} />
          <input required type="password" placeholder="Contrasenya" className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setPass(e.target.value)} />
          
          <button type="submit" className="w-full bg-emerald-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
            <Shield size={18}/> Iniciar Sessió Segura
          </button>
        </form>
      </div>
    </div>
  );
}