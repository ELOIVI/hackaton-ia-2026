'use client';
import React, { useState } from 'react';
import { ArrowLeft, Building2, Eye, EyeOff } from 'lucide-react';
import { authLogin, authRegister } from '@/lib/api';

export default function CompanyForm({ onBack, onLogin }: { onBack: () => void; onLogin: (data: unknown) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [showPass, setShowPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    companyName: '', email: '', password: '', helpType: 'recursos', level: 'mitjà'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    if (mode === 'login') {
      try {
        const auth = await authLogin(formData.email, formData.password);
        if (auth.user.role !== 'empresa') {
          setError('Aquest compte no és d\'empresa');
          return;
        }
        onLogin({
          role: auth.user.role,
          companyName: auth.user.companyName,
          email: auth.user.email,
          token: auth.token,
          helpType: formData.helpType,
          level: formData.level,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Credencials incorrectes');
      } finally {
        setSubmitting(false);
      }
    } else {
      if (!formData.companyName || !formData.email || !formData.password) {
        setError('Omple tots els camps');
        setSubmitting(false);
        return;
      }

      try {
        const auth = await authRegister({
          role: 'empresa',
          companyName: formData.companyName,
          email: formData.email,
          password: formData.password,
        });
        onLogin({
          role: auth.user.role,
          companyName: auth.user.companyName,
          email: auth.user.email,
          token: auth.token,
          helpType: formData.helpType,
          level: formData.level,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'No s\'ha pogut completar el registre');
      } finally {
        setSubmitting(false);
      }
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-800">
        <ArrowLeft size={20} /> Tornar
      </button>
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 bg-blue-50">
          <Building2 size={28} className="text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          {mode === 'login' ? 'Accés empresa' : 'Registre empresa'}
        </h1>
        <p className="text-sm text-gray-500 mb-6">
          {mode === 'login' ? 'Entra amb les credencials corporatives' : 'Uneix-te a Empreses amb Cor'}
        </p>

        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-xl">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-3">
          {mode === 'register' && (
            <>
              <input required type="text" placeholder="Nom de l'empresa"
                className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200"
                onChange={e => setFormData({...formData, companyName: e.target.value})} />
              <select className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none"
                onChange={e => setFormData({...formData, helpType: e.target.value})}>
                <option value="recursos">Donació de recursos</option>
                <option value="monetaria">Ajuda monetària</option>
                <option value="formacio">Formació laboral</option>
                <option value="voluntariat">Voluntariat corporatiu</option>
              </select>
              <select className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none"
                onChange={e => setFormData({...formData, level: e.target.value})}>
                <option value="baix">Compromís baix</option>
                <option value="mitjà">Compromís mitjà</option>
                <option value="alt">Compromís alt</option>
              </select>
            </>
          )}
          <input required type="email" placeholder="Email corporatiu"
            className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200"
            onChange={e => setFormData({...formData, email: e.target.value})} />
          <div className="relative">
            <input required type={showPass ? 'text' : 'password'} placeholder="Contrasenya"
              className="w-full p-3 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-200"
              onChange={e => setFormData({...formData, password: e.target.value})} />
            <button type="button" onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-3 text-gray-400">
              {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          <button type="submit" disabled={submitting}
            className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2">
            <Building2 size={18} />
            {submitting ? 'Enviant...' : mode === 'login' ? 'Entrar' : 'Registrar empresa'}
          </button>
        </form>

        <button onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(''); }}
          className="w-full mt-4 text-sm text-gray-400 hover:text-gray-600 underline">
          {mode === 'login' ? "Vols col·laborar? Registra la teva empresa" : "Ja registrats? Accediu aquí"}
        </button>

      </div>
    </div>
  );
}
