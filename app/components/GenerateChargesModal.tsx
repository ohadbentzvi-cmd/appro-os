'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Calendar, Loader2, AlertCircle } from 'lucide-react';

interface GenerateChargesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function GenerateChargesModal({ isOpen, onClose, onSuccess }: GenerateChargesModalProps) {
    // Default to first day of next month
    const getDefaultMonthStr = () => {
        const d = new Date();
        d.setMonth(d.getMonth() + 1);
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        return `${yyyy}-${mm}`;
    };

    const [monthStr, setMonthStr] = useState(getDefaultMonthStr());
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            const secret = process.env.NEXT_PUBLIC_CHARGE_GENERATION_SECRET;
            if (!secret) throw new Error('הגדרות מערכת חסרות (חסר סוד)');

            const periodMonth = `${monthStr}-01`;

            const res = await fetch('/api/v1/charges/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-generate-secret': secret
                },
                body: JSON.stringify({ period_month: periodMonth }),
            });

            const { data, error: apiError } = await res.json();

            if (!res.ok || apiError) {
                throw new Error(apiError?.message || 'שגיאה ביצירת החיובים');
            }

            onSuccess();
        } catch (err: any) {
            setError(err.message || 'אירעה שגיאה לא צפויה');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
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
                                <Calendar className="w-5 h-5 text-apro-green" />
                            </div>
                            <h2 className="text-xl font-bold text-apro-navy">הפקת חיובים</h2>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 hover:bg-white rounded-lg text-gray-400 hover:text-gray-600 transition-colors shadow-sm border border-transparent hover:border-gray-200"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar">
                        <form id="generate-form" onSubmit={handleSubmit} className="space-y-4">
                            {error && (
                                <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm flex items-start gap-2 border border-red-100">
                                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                                    <span>{error}</span>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">
                                    חודש חיוב
                                </label>
                                <input
                                    type="month"
                                    required
                                    value={monthStr}
                                    onChange={(e) => setMonthStr(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-apro-navy focus:outline-none focus:ring-2 focus:ring-apro-green/20 focus:border-apro-green transition-all"
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    בחר את החודש שעבורו ברצונך לייצר את החיובים. בדרך כלל חיובים מופקים עבור החודש הבא.
                                </p>
                                <div className="mt-4 p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-start gap-2">
                                    <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                                    <p className="text-sm text-blue-800 font-medium">
                                        החיובים ייווצרו לכלל היחידות בכל הבניינים לתקופה הנבחרת
                                    </p>
                                </div>
                            </div>
                        </form>
                    </div>

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
                            form="generate-form"
                            disabled={isLoading}
                            className="px-8 py-2.5 text-sm font-bold bg-apro-green text-white rounded-xl shadow-lg shadow-apro-green/20 hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    מפיק חיובים...
                                </>
                            ) : (
                                'צור'
                            )}
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
