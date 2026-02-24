'use client';

import React, { useState, useEffect } from 'react';
import { Pencil, Loader2, Save, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

interface PaymentConfigData {
    id: string;
    unitId: string;
    monthlyAmount: number; // in agorot
    effectiveFrom: string;
}

const formSchema = z.object({
    monthlyAmountILS: z.number().int().positive().max(10000), // Max 10,000 ILS for sanity
    effectiveFrom: z.string().min(1, 'שדה חובה')
});

type FormValues = z.infer<typeof formSchema>;

export default function PaymentConfigSection({ buildingId, unitId }: { buildingId: string, unitId: string }) {
    const [config, setConfig] = useState<PaymentConfigData | null>(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { register, handleSubmit, formState: { errors }, reset, setValue } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    const fetchConfig = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/v1/buildings/${buildingId}/units/${unitId}/payment-config`);
            if (res.ok) {
                const json = await res.json();
                setConfig(json.data); // data can be null if not set
            }
        } catch (e) {
            console.error('Failed to fetch payment config', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, [buildingId, unitId]);

    const handleEditClick = () => {
        if (config) {
            setValue('monthlyAmountILS', config.monthlyAmount / 100);

            // Format existing date to YYYY-MM-DD for the date picker
            const date = new Date(config.effectiveFrom);
            setValue('effectiveFrom', date.toISOString().split('T')[0]);
        } else {
            // Default to 1st of next month
            const nextMonth = new Date();
            nextMonth.setMonth(nextMonth.getMonth() + 1);
            nextMonth.setDate(1);
            setValue('effectiveFrom', nextMonth.toISOString().split('T')[0]);
            setValue('monthlyAmountILS', '' as unknown as number);
        }
        setIsEditing(true);
        setSubmitError(null);
    };

    const handleCancel = () => {
        setIsEditing(false);
        reset();
    };

    const onSubmit = async (data: FormValues) => {
        try {
            setIsSubmitting(true);
            setSubmitError(null);

            const payload = {
                monthlyAmount: data.monthlyAmountILS * 100, // ILS to Agorot
                effectiveFrom: data.effectiveFrom
            };

            const res = await fetch(`/api/v1/buildings/${buildingId}/units/${unitId}/payment-config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const json = await res.json();

            if (!res.ok || json.error) {
                throw new Error(json.error || 'שגיאה בשמירת הנתונים');
            }

            await fetchConfig();
            setIsEditing(false);
        } catch (e: any) {
            setSubmitError(e.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('he-IL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
            <h2 className="text-xl font-bold text-apro-navy mb-6">תשלום חודשי</h2>

            {loading ? (
                <div className="flex justify-center py-4">
                    <Loader2 className="w-6 h-6 animate-spin text-apro-green" />
                </div>
            ) : isEditing ? (
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 bg-gray-50 p-6 rounded-xl border border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                סכום חודשי (₪)
                            </label>
                            <input
                                type="number"
                                step="1"
                                min="1"
                                {...register('monthlyAmountILS', { valueAsNumber: true })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-apro-green focus:border-apro-green outline-none transition-colors"
                            />
                            {errors.monthlyAmountILS && <p className="text-red-500 text-sm mt-1">{errors.monthlyAmountILS.message}</p>}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1">
                                תחולה מתאריך
                            </label>
                            <input
                                type="date"
                                {...register('effectiveFrom')}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-apro-green focus:border-apro-green outline-none transition-colors"
                            />
                            {errors.effectiveFrom && <p className="text-red-500 text-sm mt-1">{errors.effectiveFrom.message}</p>}
                        </div>
                    </div>

                    {submitError && (
                        <div className="text-red-600 bg-red-50 p-3 rounded-lg text-sm border border-red-100">
                            {submitError}
                        </div>
                    )}

                    <div className="flex gap-3 justify-end pt-2">
                        <button
                            type="button"
                            onClick={handleCancel}
                            disabled={isSubmitting}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-200 bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50"
                        >
                            ביטול
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-apro-green text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            שמור
                        </button>
                    </div>
                </form>
            ) : config ? (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-6 flex items-center justify-between">
                    <div>
                        <div className="text-sm font-semibold text-gray-500 mb-1">סכום חודשי (ועד בית)</div>
                        <div className="text-3xl font-bold text-apro-navy">
                            ₪{(config.monthlyAmount / 100).toLocaleString()}
                        </div>
                        <div className="text-sm text-gray-500 mt-2">
                            בתוקף מתאריך: <span className="font-medium text-gray-700">{formatDate(config.effectiveFrom)}</span>
                        </div>
                    </div>

                    <button
                        onClick={handleEditClick}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors flex items-center gap-2 font-medium"
                    >
                        <Pencil className="w-4 h-4" />
                        <span className="hidden sm:inline">עדכן סכום</span>
                    </button>
                </div>
            ) : (
                <div className="bg-gray-50 border border-gray-100 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center">
                    <p className="text-gray-500 font-medium mb-4">לא הוגדר תשלום חודשי ליחידה זו</p>
                    <button
                        onClick={handleEditClick}
                        className="px-6 py-2 bg-apro-green text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-sm text-sm"
                    >
                        הגדר תשלום
                    </button>
                </div>
            )}
        </div>
    );
}
