'use client';
import React, { useState } from 'react';
import { ArrowLeft, Shield, Eye, EyeOff } from 'lucide-react';
import { authLogin, authRegister } from '@/lib/api';

export default function WorkerForm({ onBack, onLogin }: { onBack: () => void; onLogin: (data: unknown) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    location: 'Tarragona',
    email: '',
    password: '',
  });
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    if (mode === 'login') {
      try {
        const auth = await authLogin(formData.email, formData.password);
        if (auth.user.role !== 'treballador') {
          setError('Aquest compte no és de treballador/a');
          return;
        }
        onLogin({
          role: auth.user.role,
          name: auth.user.nom,
          email: auth.user.email,
          location: auth.user.location,
          token: auth.token,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Credencials corporatives no vàlides');
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (!formData.name || !formData.email || !formData.password) {
      setError('Omple tots els camps');
      setSubmitting(false);
      return;
    }

    try {
      const auth = await authRegister({
        role: 'treballador',
        nom: formData.name,
        location: formData.location,
        email: formData.email,
        password: formData.password,
      });
      onLogin({
        role: auth.user.role,
        name: auth.user.nom,
        email: auth.user.email,
        location: auth.user.location,
        token: auth.token,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No s\'ha pogut completar el registre');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800">
        <ArrowLeft size={20} /> Tornar
      </button>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-emerald-50">
          <Shield size={28} className="text-emerald-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{mode === 'login' ? 'Accés Intern' : 'Alta de treballador/a'}</h1>
        <p className="text-sm text-gray-500 mb-6">Àrea restringida per a personal de Càritas</p>

        <div className="bg-emerald-50 p-3 rounded-xl text-emerald-700 text-xs mb-6 font-medium">
          Aquesta àrea és exclusiva per a treballadors contractats de Càritas.
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <input required type="text" placeholder="Nom complet" value={formData.name}
                onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200" />
              <input type="text" placeholder="Ubicació" value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
                className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200" />
            </>
          )}
          <input required type="email" placeholder="Email corporatiu" value={formData.email}
            onChange={e => setFormData({...formData, email: e.target.value})}
            className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200" />
          <div className="relative">
            <input required type={showPass ? 'text' : 'password'} placeholder="Contrasenya" value={formData.password}
              onChange={e => setFormData({...formData, password: e.target.value})}
              className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-emerald-200" />
            <button type="button" onClick={() => setShowPass(!showPass)} className="absolute right-3 top-3 text-gray-400">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button type="submit" disabled={submitting}
            className="w-full bg-emerald-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
            <Shield size={18} /> {submitting ? 'Enviant...' : mode === 'login' ? 'Iniciar Sessió Segura' : 'Registrar treballador/a'}
          </button>
        </form>

        <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 underline">
          {mode === 'login' ? 'Crear compte intern' : 'Ja tens compte? Inicia sessió'}
        </button>
      </div>
    </div>
  );
}
