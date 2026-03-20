'use client';

import React, { useState } from 'react';
import { ArrowLeft, UserPlus, LogIn } from 'lucide-react';

export default function VolunteerForm({ onBack, onLogin }: { onBack: () => void, onLogin: (data: any) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({ name: '', age: '', location: '', helpType: 'psicologica', email: '', password: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const stored = JSON.parse(localStorage.getItem('volunteers_db') || '[]');
    
    if (mode === 'register') {
      const newUser = { ...formData, role: 'voluntari' };
      stored.push(newUser);
      localStorage.setItem('volunteers_db', JSON.stringify(stored));
      onLogin(newUser);
    } else {
      const user = stored.find((u: any) => u.email === formData.email && u.password === formData.password);
      if (user) onLogin(user);
      else alert('Dades incorrectes');
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800"><ArrowLeft size={20} /> Tornar</button>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">{mode === 'login' ? 'Inici Sessió' : 'Registre Voluntari'}</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <>
              <input required type="text" placeholder="Nom complet" className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setFormData({...formData, name: e.target.value})} />
              <input required type="number" placeholder="Edat" className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setFormData({...formData, age: e.target.value})} />
              <input required type="text" placeholder="Localització" className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setFormData({...formData, location: e.target.value})} />
              <select className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setFormData({...formData, helpType: e.target.value})}>
                <option value="psicologica">Ajuda Psicològica</option>
                <option value="donacions">Repartiment Subministraments</option>
                <option value="monetaria">Ajuda Monetària</option>
              </select>
            </>
          )}
          <input required type="email" placeholder="Email" className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setFormData({...formData, email: e.target.value})} />
          <input required type="password" placeholder="Contrasenya" className="w-full p-3 bg-gray-50 rounded-xl" onChange={e => setFormData({...formData, password: e.target.value})} />
          
          <button type="submit" className="w-full bg-red-600 text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2">
            {mode === 'login' ? <LogIn size={18}/> : <UserPlus size={18}/>}
            {mode === 'login' ? 'Entrar' : 'Registrar-me'}
          </button>
        </form>
        
        <button onClick={() => setMode(mode === 'login' ? 'register' : 'login')} className="w-full mt-6 text-sm text-gray-400 font-medium">
          {mode === 'login' ? "No tens compte? Registra't aquí" : "Ja tens compte? Inicia sessió"}
        </button>
      </div>
    </div>
  );
}