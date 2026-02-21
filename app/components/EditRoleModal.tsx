'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface EditRoleModalProps {
    isOpen: boolean;
    onClose: () => void;
    buildingId: string;
    role: any; // The full unit_role object with joined people
    onSuccess: () => void;
}

export default function EditRoleModal({ isOpen, onClose, buildingId, role, onSuccess }: EditRoleModalProps) {
    // Role Details State
    const [roleType, setRoleType] = useState<'owner' | 'tenant' | 'guarantor'>('tenant');
    const [effectiveFrom, setEffectiveFrom] = useState('');
    const [isFeePayer, setIsFeePayer] = useState(false);

    // Submission State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Initialize state from the passed role prop
    useEffect(() => {
        if (isOpen && role) {
            setRoleType(role.role_type);
            setEffectiveFrom(role.effective_from ? role.effective_from.split('T')[0] : '');
            setIsFeePayer(role.is_fee_payer || false);
            setError(null);
        }
    }, [isOpen, role]);

    const getLocalDateStr = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleSubmit = async () => {
        if (!role) return;
        setError(null);

        // Validation
        if (!effectiveFrom) {
            setError('יש לבחור תאריך התחלה');
            return;
        }

        const selectedDate = new Date(effectiveFrom);
        const today = new Date(getLocalDateStr());

        if (selectedDate > today) {
            setError('תאריך התחלה לא יכול להיות עתידי');
            return;
        }

        setIsSubmitting(true);
        try {
            const isMakingFeePayer = isFeePayer && !role.is_fee_payer;

            // First attempt to update
            let res = await fetch(`/api/v1/buildings/${buildingId}/units/${role.unit_id}/roles/${role.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    roleType,
                    effectiveFrom,
                    isFeePayer
                })
            });

            let data = await res.json();

            // Handle duplicate fee payer
            if (!res.ok && data.error === 'DUPLICATE_FEE_PAYER') {
                // In EditRoleModal, we just show an error message and refuse to update.
                // The prompt says "כבר קיים משלם דמי ניהול פעיל ליחידה זו. לא ניתן להגדיר יותר מאחד כרגע."
                setError(`כבר קיים משלם דמי ניהול פעיל ליחידה זו. לא ניתן להגדיר יותר מאחד כרגע.`);
                setIsSubmitting(false);
                return;
            } else if (!res.ok) {
                throw new Error(data.error || 'Failed to update role');
            }

            onSuccess();
        } catch (err: any) {
            console.error('Error updating role:', err);
            setError(err.message || 'אירעה שגיאה בעדכון התפקיד. אנא נסה שוב.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen || !role) return null;

    const personName = role.people ? role.people.full_name : 'משתמש לא ידוע';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans backdrop-blur-sm" dir="rtl">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-apro-navy">
                            עריכת תפקיד
                        </h2>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">
                            {personName}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600 shadow-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
                    <div className="space-y-6">
                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">תפקיד ביחידה</label>
                            <div className="grid grid-cols-3 gap-2">
                                {[
                                    { id: 'tenant', label: 'שוכר' },
                                    { id: 'owner', label: 'בעלים' },
                                    { id: 'guarantor', label: 'ערב' }
                                ].map((r) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        onClick={() => setRoleType(r.id as any)}
                                        className={`py-2.5 px-4 rounded-xl text-sm font-bold transition-all border ${roleType === r.id
                                            ? 'bg-apro-navy text-white border-apro-navy shadow-md shadow-apro-navy/10'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-apro-navy/30'
                                            }`}
                                    >
                                        {r.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">תאריך התחלה</label>
                            <input
                                type="date"
                                value={effectiveFrom}
                                max={getLocalDateStr()}
                                onChange={(e) => setEffectiveFrom(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-apro-green/20 focus:border-apro-green text-left font-sans"
                                dir="ltr"
                            />
                        </div>

                        {/* RTL Custom Toggle */}
                        <div className="flex items-center justify-between bg-gray-50 border border-gray-200 p-4 rounded-xl">
                            <div>
                                <p className="text-sm font-bold text-gray-800">משלם דמי ניהול?</p>
                                <p className="text-xs text-gray-500 mt-0.5">האם אדם זה אחראי על תשלום הועד</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsFeePayer(!isFeePayer)}
                                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-apro-green focus:ring-offset-2 ${isFeePayer ? 'bg-apro-green' : 'bg-gray-200'
                                    }`}
                                role="switch"
                                aria-checked={isFeePayer}
                            >
                                <span
                                    aria-hidden="true"
                                    className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isFeePayer ? '-translate-x-5' : 'translate-x-0'
                                        }`}
                                />
                            </button>
                        </div>

                        {isFeePayer && !role.is_fee_payer && (
                            <div className="flex items-start gap-2 bg-yellow-50 text-yellow-800 p-3 rounded-lg text-xs font-medium border border-yellow-100">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <p>שים לב: ייתכן שקיים כבר משלם דמי ניהול אחר ליחידה זו. המערכת תתריע במידה וכן.</p>
                            </div>
                        )}

                        {error && (
                            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm border border-red-100 font-medium">
                                <AlertCircle className="w-5 h-5 shrink-0" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-3xl">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                        ביטול
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={isSubmitting || !effectiveFrom}
                        className="px-8 py-2.5 bg-apro-navy text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition-all shadow-md shadow-apro-navy/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            "שמור שינויים"
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}
