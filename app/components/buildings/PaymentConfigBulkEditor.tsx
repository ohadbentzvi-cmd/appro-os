'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Save } from 'lucide-react';

interface UnitConfigRow {
    unitId: string;
    identifier: string;
    floor: number;
    savedMonthlyAmountAgorot: number | null;
    savedBillingDay: number | null;
    draftMonthlyAmountAgorot: number | null;
    draftBillingDay: number | null;
}

export default function PaymentConfigBulkEditor({ buildingId }: { buildingId: string }) {
    const [rows, setRows] = useState<UnitConfigRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const [bulkAmount, setBulkAmount] = useState('');
    const [bulkBillingDay, setBulkBillingDay] = useState('');

    const fetchConfigs = useCallback(async () => {
        try {
            setLoading(true);
            setFetchError(null);
            const res = await fetch(`/api/v1/buildings/${buildingId}/payment-configs`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'שגיאה בטעינת הנתונים');
            const data: { unitId: string; identifier: string; floor: number; config: { monthlyAmount: number; billingDay: number | null } | null }[] = json.data;
            setRows(data.map(u => ({
                unitId: u.unitId,
                identifier: u.identifier,
                floor: u.floor,
                savedMonthlyAmountAgorot: u.config?.monthlyAmount ?? null,
                savedBillingDay: u.config?.billingDay ?? null,
                draftMonthlyAmountAgorot: u.config?.monthlyAmount ?? null,
                draftBillingDay: u.config?.billingDay ?? null,
            })));
        } catch (e: any) {
            setFetchError(e.message);
        } finally {
            setLoading(false);
        }
    }, [buildingId]);

    useEffect(() => { fetchConfigs(); }, [fetchConfigs]);

    const updateRow = (unitId: string, patch: Partial<Pick<UnitConfigRow, 'draftMonthlyAmountAgorot' | 'draftBillingDay'>>) => {
        setRows(prev => prev.map(r => r.unitId === unitId ? { ...r, ...patch } : r));
    };

    const applyToAll = () => {
        const amount = parseInt(bulkAmount, 10);
        const day = parseInt(bulkBillingDay, 10);
        setRows(prev => prev.map(r => ({
            ...r,
            ...(bulkAmount && !isNaN(amount) && amount > 0 ? { draftMonthlyAmountAgorot: amount * 100 } : {}),
            ...(bulkBillingDay && !isNaN(day) && day >= 1 && day <= 28 ? { draftBillingDay: day } : {}),
        })));
        setBulkAmount('');
        setBulkBillingDay('');
    };

    const isDirty = rows.some(r =>
        r.draftMonthlyAmountAgorot !== r.savedMonthlyAmountAgorot ||
        r.draftBillingDay !== r.savedBillingDay
    );

    // Validation: a row is invalid if it has one field but not both
    const rowErrors: Record<string, string> = {};
    for (const r of rows) {
        const hasAmount = r.draftMonthlyAmountAgorot != null && r.draftMonthlyAmountAgorot > 0;
        const hasDay = r.draftBillingDay != null && r.draftBillingDay >= 1 && r.draftBillingDay <= 28;
        if (hasAmount && !hasDay) rowErrors[r.unitId] = 'יש להזין גם יום חיוב (1–28)';
        if (!hasAmount && hasDay) rowErrors[r.unitId] = 'יש להזין גם סכום חודשי';
    }
    const hasErrors = Object.keys(rowErrors).length > 0;

    const handleSave = async () => {
        if (!isDirty || hasErrors) return;
        const dirtyRows = rows.filter(r =>
            r.draftMonthlyAmountAgorot !== r.savedMonthlyAmountAgorot ||
            r.draftBillingDay !== r.savedBillingDay
        ).filter(r => r.draftMonthlyAmountAgorot != null && r.draftBillingDay != null);

        if (dirtyRows.length === 0) return;

        try {
            setSaving(true);
            setSaveError(null);
            setSaveSuccess(false);
            const res = await fetch(`/api/v1/buildings/${buildingId}/payment-configs`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    units: dirtyRows.map(r => ({
                        unitId: r.unitId,
                        monthlyAmountAgorot: r.draftMonthlyAmountAgorot!,
                        billingDay: r.draftBillingDay!,
                    })),
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || 'שגיאה בשמירת הנתונים');
            setSaveSuccess(true);
            await fetchConfigs();
            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (e: any) {
            setSaveError(e.message);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-apro-green" />
            </div>
        );
    }

    if (fetchError) {
        return (
            <div className="bg-red-50 text-red-700 rounded-xl p-6 text-center font-medium">
                {fetchError}
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-xl font-bold text-apro-navy">הגדרות תשלום</h2>
                <p className="text-sm text-gray-500 mt-1">עדכן סכום חודשי ויום חיוב לכל יחידה. שינויים ייכנסו לתוקף לחיובים עתידיים.</p>
            </div>

            {/* Apply to all */}
            <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">סכום אחיד (₪)</label>
                    <div className="relative">
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₪</span>
                        <input
                            type="number"
                            min="1"
                            value={bulkAmount}
                            onChange={e => setBulkAmount(e.target.value)}
                            className="w-40 bg-gray-50 border border-gray-200 rounded-xl py-2.5 pr-8 pl-3 focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all"
                            placeholder="0"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">יום חיוב אחיד (1–28)</label>
                    <input
                        type="number"
                        min={1}
                        max={28}
                        value={bulkBillingDay}
                        onChange={e => setBulkBillingDay(e.target.value)}
                        className="w-28 bg-gray-50 border border-gray-200 rounded-xl py-2.5 px-3 focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all"
                        placeholder="1–28"
                    />
                </div>
                <button
                    onClick={applyToAll}
                    disabled={!bulkAmount && !bulkBillingDay}
                    className="px-5 py-2.5 bg-apro-navy text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                    החל על כולם
                </button>
            </div>

            {/* Per-unit table — desktop */}
            <div className="hidden md:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-right" dir="rtl">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="py-3 px-6 font-bold text-gray-500 text-sm rounded-tr-2xl">יחידה</th>
                            <th className="py-3 px-6 font-bold text-gray-500 text-sm text-center">קומה</th>
                            <th className="py-3 px-6 font-bold text-gray-500 text-sm w-48">סכום חודשי (₪)</th>
                            <th className="py-3 px-6 font-bold text-gray-500 text-sm w-32 rounded-tl-2xl">יום חיוב</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {rows.map(row => (
                            <tr key={row.unitId} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-3 px-6 font-bold text-apro-navy">דירה {row.identifier}</td>
                                <td className="py-3 px-6 text-center">
                                    <span className="inline-flex items-center justify-center bg-gray-100 px-3 py-1 rounded-full text-sm font-bold text-gray-600">
                                        {row.floor ?? '-'}
                                    </span>
                                </td>
                                <td className="py-3 px-6">
                                    <div className="relative">
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₪</span>
                                        <input
                                            type="number"
                                            min="1"
                                            value={row.draftMonthlyAmountAgorot != null ? row.draftMonthlyAmountAgorot / 100 : ''}
                                            onChange={e => {
                                                const val = parseInt(e.target.value, 10);
                                                updateRow(row.unitId, {
                                                    draftMonthlyAmountAgorot: e.target.value === '' ? null : (!isNaN(val) && val > 0 ? val * 100 : null),
                                                });
                                            }}
                                            className={`w-full bg-white border rounded-lg py-2 pr-8 pl-3 focus:outline-none focus:ring-1 transition-all ${rowErrors[row.unitId] ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-apro-green'}`}
                                            placeholder="הזן סכום"
                                        />
                                    </div>
                                    {rowErrors[row.unitId] && (
                                        <p className="text-red-500 text-xs mt-1 font-medium">{rowErrors[row.unitId]}</p>
                                    )}
                                </td>
                                <td className="py-3 px-6">
                                    <input
                                        type="number"
                                        min={1}
                                        max={28}
                                        value={row.draftBillingDay ?? ''}
                                        onChange={e => {
                                            const val = parseInt(e.target.value, 10);
                                            updateRow(row.unitId, {
                                                draftBillingDay: e.target.value === '' ? null : (!isNaN(val) && val >= 1 && val <= 28 ? val : null),
                                            });
                                        }}
                                        className="w-20 bg-white border border-gray-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-apro-green transition-all text-center"
                                        placeholder="1–28"
                                    />
                                </td>
                            </tr>
                        ))}
                        {rows.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-10 text-center text-gray-400 font-medium">אין יחידות</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Per-unit cards — mobile */}
            <div className="md:hidden space-y-3">
                {rows.map(row => (
                    <div key={row.unitId} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="font-bold text-apro-navy">דירה {row.identifier}</span>
                            <span className="text-sm text-gray-500">קומה {row.floor ?? '-'}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">סכום (₪)</label>
                                <div className="relative">
                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold">₪</span>
                                    <input
                                        type="number"
                                        min="1"
                                        value={row.draftMonthlyAmountAgorot != null ? row.draftMonthlyAmountAgorot / 100 : ''}
                                        onChange={e => {
                                            const val = parseInt(e.target.value, 10);
                                            updateRow(row.unitId, {
                                                draftMonthlyAmountAgorot: e.target.value === '' ? null : (!isNaN(val) && val > 0 ? val * 100 : null),
                                            });
                                        }}
                                        className={`w-full border rounded-lg py-2 pr-8 pl-3 focus:outline-none text-sm ${rowErrors[row.unitId] ? 'border-red-400' : 'border-gray-200'}`}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1">יום חיוב</label>
                                <input
                                    type="number"
                                    min={1}
                                    max={28}
                                    value={row.draftBillingDay ?? ''}
                                    onChange={e => {
                                        const val = parseInt(e.target.value, 10);
                                        updateRow(row.unitId, {
                                            draftBillingDay: e.target.value === '' ? null : (!isNaN(val) && val >= 1 && val <= 28 ? val : null),
                                        });
                                    }}
                                    className="w-full border border-gray-200 rounded-lg py-2 px-3 focus:outline-none text-sm text-center"
                                    placeholder="1–28"
                                />
                            </div>
                        </div>
                        {rowErrors[row.unitId] && (
                            <p className="text-red-500 text-xs font-medium">{rowErrors[row.unitId]}</p>
                        )}
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between gap-4 pt-2">
                <div>
                    {saveError && <p className="text-red-600 text-sm font-medium">{saveError}</p>}
                    {saveSuccess && <p className="text-apro-green text-sm font-medium">השינויים נשמרו בהצלחה</p>}
                </div>
                <button
                    onClick={handleSave}
                    disabled={!isDirty || hasErrors || saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-apro-green text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-sm"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    שמור שינויים
                </button>
            </div>
        </div>
    );
}
