'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, AlertCircle, CreditCard, Calendar, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PaymentHistoryRow {
    id: string;
    amount: number;
    payment_method: string;
    paid_at: string;
    notes: string | null;
}

interface ChargeDetailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    chargeId: string | null;
    unitIdentifier: string;
    floor: number;
    feePayerName?: string | null;
    feePayerRole?: string | null;
    onPaymentSuccess?: (newStatus: string, newAmountPaid: number) => void;
}

export default function ChargeDetailDrawer({
    isOpen,
    onClose,
    chargeId,
    unitIdentifier,
    floor,
    feePayerName,
    feePayerRole,
    onPaymentSuccess
}: ChargeDetailDrawerProps) {
    const [payments, setPayments] = useState<PaymentHistoryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !chargeId) return;

        async function fetchPaymentHistory() {
            try {
                setLoading(true);
                setError(null);
                const res = await fetch(`/api/v1/charges/${chargeId}/payments`);
                if (!res.ok) throw new Error('Failed to fetch payments');
                const json = await res.json();
                if (json.error) throw new Error(json.error.message);
                setPayments(json.data || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchPaymentHistory();
    }, [isOpen, chargeId]);

    // Format money (agorot to ILS)
    const formatMoney = (agorot: number) => {
        const ils = Math.round(agorot / 100);
        return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(ils);
    };

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    const methodTranslations: Record<string, string> = {
        'cash': 'מזומן',
        'bank_transfer': 'העברה בנקאית',
        'check': 'צ׳ק',
        'direct_debit': 'הוראת קבע',
        'portal': 'אתר'
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Overlay */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm z-40"
                    />

                    {/* Drawer (Left Side for RTL) */}
                    <motion.div
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                        className="fixed top-0 left-0 bottom-0 w-full max-w-md bg-white shadow-2xl z-50 flex flex-col border-r border-gray-100"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50">
                            <div>
                                <h2 className="text-xl font-bold text-apro-navy">דירה {unitIdentifier}</h2>
                                <div className="flex flex-col gap-0.5 mt-1">
                                    <p className="text-sm text-gray-500 font-medium">קומה {floor}</p>
                                    {(feePayerName || feePayerRole) && (
                                        <p className="text-sm text-gray-700 font-medium">
                                            <span className="text-gray-400 ml-1">משלם:</span>
                                            {feePayerName ? `${feePayerName} — ${feePayerRole}` : feePayerRole}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition-colors text-gray-400 group"
                            >
                                <X className="w-5 h-5 group-hover:text-gray-600 transition-colors" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8">
                            {/* Summary Block (placeholder until charge details endpoint is called, or fetched from parents) */}
                            {/* In a real app we might fetch charge details by ID here to show amount due/paid.
                                For now, relying on the history list or extending the props. */}
                            <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                                <div className="flex items-center gap-2 mb-4">
                                    <FileText className="w-5 h-5 text-blue-600" />
                                    <h3 className="font-bold text-blue-900">פירוט חיוב</h3>
                                </div>
                                <p className="text-sm text-gray-500 mb-4">
                                    נתוני החיוב המלאים יוצגו כאן. בשלב זה ניתן לצפות בהיסטוריית התשלומים בלבד.
                                </p>
                            </div>

                            {/* Payment History List */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <CreditCard className="w-5 h-5 text-apro-green" />
                                    <h3 className="font-bold text-apro-navy text-lg">היסטוריית תשלומים</h3>
                                </div>

                                {loading ? (
                                    <div className="flex justify-center py-8">
                                        <Loader2 className="w-6 h-6 text-apro-green animate-spin" />
                                    </div>
                                ) : error ? (
                                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm border border-red-100">
                                        {error}
                                    </div>
                                ) : payments.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-xl border border-gray-100 border-dashed">
                                        <p className="text-gray-500 mb-1">לא בוצעו תשלומים לחיוב זה</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {payments.map((p) => (
                                            <div key={p.id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="font-bold text-gray-900 text-lg">
                                                        {formatMoney(p.amount)}
                                                    </span>
                                                    <span className="inline-flex px-2 py-1 rounded-md text-xs font-bold border bg-gray-50 text-gray-600 border-gray-200">
                                                        {methodTranslations[p.payment_method] || p.payment_method}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                                    <Calendar className="w-3.5 h-3.5" />
                                                    {formatDate(p.paid_at)}
                                                </div>
                                                {p.notes && (
                                                    <div className="mt-3 pt-3 border-t border-gray-50 text-sm italic text-gray-600">
                                                        "{p.notes}"
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-gray-100 bg-white">
                            <button
                                disabled
                                title="בקרוב - פיתוח שלב 5"
                                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-apro-green text-white hover:bg-green-600 shadow-sm"
                            >
                                רשום תשלום
                            </button>
                            <p className="text-center text-xs text-gray-400 mt-3 font-medium">הוספת תשלומים תתאפשר בקרוב (שלב 5)</p>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
