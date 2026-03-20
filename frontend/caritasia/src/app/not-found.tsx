'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Icon from '@/components/ui/AppIcon';

export default function NotFound() {
    const router = useRouter();

    const handleGoHome = () => {
        router?.push('/');
    };

    const handleGoBack = () => {
        if (typeof window !== 'undefined') {
            window.history?.back();
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4">
            <div className="text-center max-w-md">
                <div className="flex justify-center mb-6">
                    <div className="relative">
                        <h1 className="text-9xl font-bold opacity-20" style={{ color: '#C8102E' }}>404</h1>
                    </div>
                </div>

                <h2 className="text-2xl font-medium text-gray-900 mb-2">Pàgina no trobada</h2>
                <p className="text-gray-500 mb-8">
                    La pàgina que busques no existeix o ha estat moguda.
                </p>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={handleGoBack}
                        className="inline-flex items-center justify-center gap-2 text-white px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-colors duration-200"
                        style={{ background: '#C8102E' }}
                    >
                        <Icon name="ArrowLeftIcon" size={16} />
                        Tornar enrere
                    </button>

                    <button
                        onClick={handleGoHome}
                        className="inline-flex items-center justify-center gap-2 border border-gray-200 bg-white text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
                    >
                        <Icon name="HomeIcon" size={16} />
                        Inici
                    </button>
                </div>
            </div>
        </div>
    );
}