'use client';

import React from 'react';
import { ArrowLeft, HandHelping, Search } from 'lucide-react';

export default function AttendedForm({ onBack }: { onBack: () => void }) {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="p-2 rounded-xl hover:bg-gray-100 transition-all text-gray-500 hover:text-gray-800">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Necessito Ajuda</h1>
          <p className="text-sm text-gray-500">Digue'ns com et podem recolzar</p>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
        <div className="text-center p-4">
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <HandHelping className="text-purple-600" size={32} />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-2">En què et podem ajudar?</h2>
          <p className="text-sm text-gray-500">Explica'ns breument la teva situació i et derivarem al centre més proper.</p>
        </div>
        
        <div className="relative">
          <textarea 
            rows={5} 
            placeholder="Exemple: Necessito informació sobre el banc d'aliments o ajuda amb l'habitatge..."
            className="w-full px-4 py-4 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-purple-500 resize-none"
          ></textarea>
        </div>

        <button className="w-full bg-purple-600 text-white py-4 rounded-xl font-bold hover:bg-purple-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-100">
          <Search size={18} />
          Cercar recursos disponibles
        </button>
      </div>
    </div>
  );
}