'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import GenerateChargesModal from '@/app/components/GenerateChargesModal';

export default function GenerateChargesWrapper() {
    const [isOpen, setIsOpen] = useState(false);
    const router = useRouter();

    const handleSuccess = () => {
        setIsOpen(false);
        router.refresh();
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="bg-apro-green hover:bg-emerald-600 transition-colors text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-apro-green/20 flex items-center gap-2"
            >
                <Plus className="w-5 h-5" />
                צור חיובים
            </button>
            <GenerateChargesModal
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                onSuccess={handleSuccess}
            />
        </>
    );
}
