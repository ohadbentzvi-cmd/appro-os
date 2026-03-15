'use client';

import React, { useEffect, useState } from 'react';
import { X, Loader2, CreditCard, Calendar, FileText, Edit2, Send, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import ReminderStatusBadge from '@/app/components/reminders/ReminderStatusBadge';
import ReminderApprovalModal from '@/app/components/reminders/ReminderApprovalModal';
import { formatMoney, formatDate, paymentMethodLabels } from '@/lib/format';

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
    amountDue?: number;
    status?: string;
    feePayerName?: string | null;
    feePayerRole?: string | null;
    feePayerPhone?: string | null;
    feePayerPersonId?: string | null;
    lastReminder?: { sentAt: string; status: string } | null;
    periodMonth?: string;
    onPaymentSuccess?: (newStatus: string, newAmountPaid: number) => void;
}

export default function ChargeDetailDrawer({
    isOpen,
    onClose,
    chargeId,
    unitIdentifier,
    floor,
    amountDue = 0,
    status = 'pending',
    feePayerName,
    feePayerRole,
    feePayerPhone,
    feePayerPersonId,
    lastReminder,
    periodMonth,
    onPaymentSuccess
}: ChargeDetailDrawerProps) {
    const router = useRouter();
    const [payments, setPayments] = useState<PaymentHistoryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [reminderModalOpen, setReminderModalOpen] = useState(false);

    // Form State
    const [isFormMode, setIsFormMode] = useState(false);
    const [formMethod, setFormMethod] = useState<'bank_transfer' | 'cash' | 'credit_card' | 'portal'>('bank_transfer');
    const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [formNotes, setFormNotes] = useState('');
    const [submitLoading, setSubmitLoading] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const [editingPaymentId, setEditingPaymentId] = useState<string | null>(null);
    const [lastNewPaymentId, setLastNewPaymentId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen || !chargeId) {
            setIsFormMode(false);
            setEditingPaymentId(null);
            setLastNewPaymentId(null);
            return;
        }

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

    const handleEditClick = (p: PaymentHistoryRow) => {
        setFormMethod(p.payment_method as any);
        setFormDate(p.paid_at.split('T')[0]);
        setFormNotes(p.notes || '');
        setEditingPaymentId(p.id);
        setIsFormMode(true);
    };

    const handlePaymentSubmit = async () => {
        if (!chargeId) return;

        setSubmitLoading(true);
        setSubmitError(null);

        try {
            // Validate max chars
            if (formNotes.length > 500) {
                throw new Error('הערות יכולות להכיל עד 500 תווים');
            }

            const method = editingPaymentId ? 'PUT' : 'POST';
            const url = editingPaymentId
                ? `/api/v1/charges/${chargeId}/payments/${editingPaymentId}`
                : `/api/v1/charges/${chargeId}/payments`;

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: amountDue,
                    payment_method: formMethod,
                    paid_at: new Date(formDate).toISOString(),
                    notes: formNotes
                })
            });

            const json = await res.json();

            if (!res.ok) {
                if (res.status === 422 && json.error === 'amount_exceeds_due') {
                    throw new Error('הסכום חורג מהחיוב המקורי');
                }
                throw new Error(json.error?.message || 'שגיאה זמנית בשמירת התשלום');
            }

            // Success
            if (editingPaymentId) {
                setPayments(prev => prev.map(p => p.id === editingPaymentId ? json.data : p));
            } else {
                setPayments(prev => [json.data, ...prev]);
            }

            if (!editingPaymentId) {
                // New payment: stay open and show the receipt download state.
                setLastNewPaymentId(json.data.id);
                setIsFormMode(false);
                if (onPaymentSuccess) onPaymentSuccess('paid', amountDue);
                router.refresh();
                return;
            }

            // Edit case: update local payment list and return to view mode
            router.refresh();
            setIsFormMode(false);
            setEditingPaymentId(null);
            setFormDate(new Date().toISOString().split('T')[0]);
            setFormNotes('');
            setFormMethod('bank_transfer');
        } catch (err: any) {
            setSubmitError(err.message);
        } finally {
            setSubmitLoading(false);
        }
    };

    const handleDownloadReceipt = async (paymentId: string) => {
        try {
            const res = await fetch(`/api/v1/payments/${paymentId}/receipt`);
            if (!res.ok) throw new Error('שגיאה בהפקת הקבלה');
            const disposition = res.headers.get('Content-Disposition') ?? '';
            const match = disposition.match(/filename="([^"]+)"/);
            const filename = match?.[1] ?? 'receipt.pdf';
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        } catch (err: any) {
            alert(err.message || 'שגיאה בהפקת הקבלה');
        }
    };

    return (
        <>
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
                                            {feePayerPhone && <span className="text-gray-500 mr-2 text-xs" dir="ltr">{feePayerPhone}</span>}
                                        </p>
                                    )}
                                    <ReminderStatusBadge lastReminder={lastReminder ?? null} />
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
                            {!isFormMode ? (
                                <>
                                    {/* View Mode Summary */}
                                    <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100">
                                        <div className="flex items-center gap-2 mb-4">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                            <h3 className="font-bold text-blue-900">פירוט חיוב</h3>
                                        </div>
                                        <p className="text-sm text-gray-500 mb-4">
                                            נתוני החיוב המלאים מוצגים בטבלת הבניין המרכזית. בשלב זה ניתן לצפות בהיסטוריית התשלומים בלבד.
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
                                                            <div className="flex items-center gap-2">
                                                                <span className="inline-flex px-2 py-1 rounded-md text-xs font-bold border bg-gray-50 text-gray-600 border-gray-200">
                                                                    {paymentMethodLabels[p.payment_method] ?? p.payment_method}
                                                                </span>
                                                                <button
                                                                    onClick={() => handleEditClick(p)}
                                                                    className="p-1.5 text-gray-400 hover:text-apro-green hover:bg-green-50 rounded-lg transition-colors border border-transparent hover:border-green-100"
                                                                    aria-label="ערוך תשלום"
                                                                >
                                                                    <Edit2 className="w-3.5 h-3.5" />
                                                                </button>
                                                                <button
                                                                    onClick={() => handleDownloadReceipt(p.id)}
                                                                    className="p-1.5 text-gray-400 hover:text-apro-navy hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                                                    aria-label="הורד קבלה"
                                                                >
                                                                    <Download className="w-3.5 h-3.5" />
                                                                </button>
                                                            </div>
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
                                </>
                            ) : (
                                /* Form Mode */
                                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                                    <div className="flex items-center gap-2 mb-2">
                                        <CreditCard className="w-5 h-5 text-apro-green" />
                                        <h3 className="font-bold text-apro-navy text-lg">{editingPaymentId ? 'עריכת תשלום' : 'טופס תשלום'}</h3>
                                    </div>

                                    {submitError && (
                                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm border border-red-100">
                                            {submitError}
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">סכום לתשלום (₪)</label>
                                        <input
                                            type="text"
                                            value={Math.round(amountDue / 100)}
                                            readOnly
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-gray-700 font-bold cursor-not-allowed"
                                        />
                                        <p className="text-xs text-gray-400 font-medium mt-2 leading-relaxed">תשלום מלא בלבד בשלב זה</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">אמצעי תשלום</label>
                                        <select
                                            value={formMethod}
                                            onChange={(e: any) => setFormMethod(e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all"
                                        >
                                            <option value="bank_transfer">העברה בנקאית</option>
                                            <option value="cash">מזומן</option>
                                            <option value="credit_card">כרטיס אשראי</option>
                                            <option value="portal">פורטל</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">תאריך תשלום</label>
                                        <input
                                            type="date"
                                            value={formDate}
                                            max={new Date().toISOString().split('T')[0]}
                                            onChange={(e) => setFormDate(e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">הערות (אופציונלי)</label>
                                        <textarea
                                            value={formNotes}
                                            onChange={(e) => setFormNotes(e.target.value)}
                                            placeholder="הערות נוספות..."
                                            maxLength={500}
                                            rows={3}
                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all resize-none"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer Actions */}
                        <div className="p-6 border-t border-gray-100 bg-white">
                            {!isFormMode ? (
                                lastNewPaymentId ? (
                                    <div className="flex gap-3">
                                        <button
                                            onClick={() => handleDownloadReceipt(lastNewPaymentId)}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all bg-apro-green text-white hover:bg-green-600 shadow-sm"
                                        >
                                            <Download className="w-4 h-4" />
                                            הורד קבלה
                                        </button>
                                        <button
                                            onClick={() => { setLastNewPaymentId(null); onClose(); }}
                                            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm"
                                        >
                                            סגור
                                        </button>
                                    </div>
                                ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setIsFormMode(true)}
                                        disabled={status !== 'pending'}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-apro-green text-white hover:bg-green-600 shadow-sm"
                                    >
                                        רשום תשלום
                                    </button>
                                    {(status === 'pending' || status === 'partial') && chargeId && (
                                        <button
                                            onClick={() => setReminderModalOpen(true)}
                                            className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all bg-white border border-gray-200 text-apro-navy hover:bg-gray-50 shadow-sm"
                                        >
                                            <Send className="w-4 h-4" />
                                            תזכורת
                                        </button>
                                    )}
                                </div>
                                )
                            ) : (
                                <div className="flex gap-3">
                                    <button
                                        onClick={handlePaymentSubmit}
                                        disabled={submitLoading}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-apro-green text-white hover:bg-green-600 shadow-sm"
                                    >
                                        {submitLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'אשר תשלום'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsFormMode(false);
                                            setEditingPaymentId(null);
                                        }}
                                        disabled={submitLoading}
                                        className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 shadow-sm"
                                    >
                                        ביטול
                                    </button>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>

        {chargeId && (
            <ReminderApprovalModal
                isOpen={reminderModalOpen}
                onClose={() => setReminderModalOpen(false)}
                onSent={() => { router.refresh(); setReminderModalOpen(false); }}
                chargeIds={[chargeId]}
                periodMonth={periodMonth ?? ''}
            />
        )}
        </>
    );
}
