'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Loader2, AlertCircle, Building2 } from 'lucide-react';

interface EditBuildingModalProps {
    isOpen: boolean;
    onClose: () => void;
    building: {
        id: string;
        addressStreet?: string | null;
        addressCity?: string | null;
        numFloors?: number | null;
    } | null;
    onSuccess: (updated: any) => void;
}

export default function EditBuildingModal({ isOpen, onClose, building, onSuccess }: EditBuildingModalProps) {
    const [addressStreet, setAddressStreet] = useState('');
    const [addressCity, setAddressCity] = useState('');
    const [numFloors, setNumFloors] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && building) {
            setAddressStreet(building.addressStreet || '');
            setAddressCity(building.addressCity || '');
            setNumFloors(building.numFloors ? String(building.numFloors) : '');
            setError(null);
        }
    }, [isOpen, building]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!building) return;

        setIsLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/v1/buildings/${building.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    address: addressStreet || undefined,
                    city: addressCity || undefined,
                    floors: numFloors ? parseInt(numFloors, 10) : undefined,
                }),
            });

            const json = await res.json();
            if (!res.ok) throw new Error(json.error?.message || 'שגיאה בעדכון הבניין');

            onSuccess(json.data);
        } catch (err: any) {
            setError(err.message || 'אירעה שגיאה לא צפויה');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-apro-navy/40 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
                    >
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                            <div className="flex items-center gap-2">
                                <div className="bg-apro-green/10 p-2 rounded-lg">
                                    <Building2 className="w-5 h-5 text-apro-green" />
                                </div>
                                <h2 className="text-xl font-bold text-apro-navy">עריכת פרטי בניין</h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-gray-600 transition-colors shadow-sm border border-transparent hover:border-gray-200"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form id="edit-building-form" onSubmit={handleSubmit} className="p-6 space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2 border border-red-100">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">כתובת / רחוב</label>
                                <input
                                    type="text"
                                    value={addressStreet}
                                    onChange={(e) => setAddressStreet(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-apro-navy focus:outline-none focus:ring-2 focus:ring-apro-green/20 focus:border-apro-green transition-all"
                                    placeholder="רחוב הרצל 5"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">עיר</label>
                                <input
                                    type="text"
                                    value={addressCity}
                                    onChange={(e) => setAddressCity(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-apro-navy focus:outline-none focus:ring-2 focus:ring-apro-green/20 focus:border-apro-green transition-all"
                                    placeholder="תל אביב"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">מספר קומות</label>
                                <input
                                    type="number"
                                    min="1"
                                    value={numFloors}
                                    onChange={(e) => setNumFloors(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-apro-navy focus:outline-none focus:ring-2 focus:ring-apro-green/20 focus:border-apro-green transition-all"
                                    placeholder="6"
                                />
                            </div>
                        </form>

                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-2xl shrink-0">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2.5 text-sm font-bold border border-gray-200 rounded-xl text-gray-600 hover:bg-gray-100 transition-colors"
                            >
                                ביטול
                            </button>
                            <button
                                type="submit"
                                form="edit-building-form"
                                disabled={isLoading}
                                className="px-8 py-2.5 text-sm font-bold bg-apro-green text-white rounded-xl shadow-lg shadow-apro-green/20 hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        שומר...
                                    </>
                                ) : (
                                    'שמור שינויים'
                                )}
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
