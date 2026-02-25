'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, AlertCircle, TrendingUp, Info } from 'lucide-react';

interface ChargeRow {
    unit_id: string;
    unit_identifier: string;
    floor: number;
    charge_id: string | null;
    amount_due: number;
    amount_paid: number;
    status: 'pending' | 'paid' | 'partial' | 'waived' | 'no_config';
    due_date: string | null;
    period_month: string | null;
}

interface PaymentsGridProps {
    buildingId: string;
    onRowClick: (chargeId: string, unitIdentifier: string, floor: number, amountDue: number, status: string) => void;
}

export default function PaymentsGrid({ buildingId, onRowClick }: PaymentsGridProps) {
    const [charges, setCharges] = useState<ChargeRow[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function fetchCharges() {
            try {
                setLoading(true);
                const res = await fetch(`/api/v1/buildings/${buildingId}/charges`);
                if (!res.ok) throw new Error('Failed to fetch building charges');
                const json = await res.json();
                if (json.error) throw new Error(json.error.message);
                setCharges(json.data || []);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        }
        fetchCharges();
    }, [buildingId]);

    if (loading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 text-apro-green animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex items-center gap-2">
                <AlertCircle className="w-5 h-5" />
                <p>שגיאה בטעינת נתוני חיובים: {error}</p>
            </div>
        );
    }

    const formatMoney = (agorot: number) => {
        const ils = Math.round(agorot / 100);
        return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(ils);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-100">שולם</span>;
            case 'partial':
                return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-yellow-50 text-yellow-700 border-yellow-100">חלקי</span>;
            case 'pending':
                return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-red-50 text-red-700 border-red-100">ממתין</span>;
            case 'waived':
                return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 text-gray-700 border-gray-200">מחוק</span>;
            case 'no_config':
                return <span className="text-gray-400 text-sm font-medium">לא מוגדר</span>;
            default:
                return <span className="text-gray-400 text-sm font-medium">{status}</span>;
        }
    };

    // Calculate totals
    const totalDue = charges.reduce((acc, curr) => acc + curr.amount_due, 0);
    const totalPaid = charges.reduce((acc, curr) => acc + curr.amount_paid, 0);
    const collectionRate = totalDue > 0 ? ((totalPaid / totalDue) * 100).toFixed(1) : 0;

    const currentMonthLabel = (() => {
        if (charges.length === 0) return '';
        const hasDate = charges.find(c => c.period_month);
        if (!hasDate?.period_month) return '';
        const d = new Date(hasDate.period_month);
        const months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
        return `${months[d.getMonth()]} ${d.getFullYear()}`;
    })();

    const noConfigUnits = charges.filter(c => c.status === 'no_config');

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {noConfigUnits.length > 0 && (
                <div className="bg-amber-50 rounded-2xl p-5 shadow-sm border border-amber-200 mb-6">
                    <div className="flex items-start gap-4">
                        <div className="bg-amber-100 p-2 rounded-xl shrink-0 mt-0.5">
                            <AlertCircle className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-amber-900 text-lg">
                                ל-{noConfigUnits.length} יחידות אין תשלום חודשי מוגדר — חיובים לא ייווצרו עבורן
                            </h3>
                            <ul className="mt-3 space-y-2">
                                {noConfigUnits.map(unit => (
                                    <li key={unit.unit_id}>
                                        <a
                                            href={`/dashboard/buildings/${buildingId}/units/${unit.unit_id}`}
                                            className="text-amber-700 hover:text-amber-900 font-medium underline underline-offset-4 decoration-amber-300 transition-colors"
                                        >
                                            דירה {unit.unit_identifier} (קומה {unit.floor})
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}

            {currentMonthLabel && (
                <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="w-5 h-5 text-apro-green" />
                    <h2 className="text-xl font-bold text-apro-navy">תמונת מצב - {currentMonthLabel}</h2>
                </div>
            )}

            <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm mb-6">
                <div className="overflow-x-auto">
                    <table className="w-full text-right border-collapse">
                        <thead>
                            <tr className="bg-gray-50/80 text-gray-500 text-sm uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">יחידה</th>
                                <th className="px-6 py-4 font-semibold text-center">קומה</th>
                                <th className="px-6 py-4 font-semibold">סכום לתשלום</th>
                                <th className="px-6 py-4 font-semibold">שולם</th>
                                <th className="px-6 py-4 font-semibold">יתרה</th>
                                <th className="px-6 py-4 font-semibold">סטטוס</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                            {charges.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        לא נמצא יחידות או חיובים במבנה זה.
                                    </td>
                                </tr>
                            ) : (
                                charges.map((row) => {
                                    const isClickable = row.status !== 'no_config' && row.charge_id;
                                    const balance = row.amount_due - row.amount_paid;

                                    return (
                                        <tr
                                            key={row.unit_id}
                                            onClick={() => isClickable && onRowClick(row.charge_id!, row.unit_identifier, row.floor, row.amount_due, row.status)}
                                            className={`${isClickable ? 'cursor-pointer hover:bg-gray-50/80 transition-colors group' : 'opacity-60 bg-gray-50/30'}`}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-apro-navy">
                                                    דירה {row.unit_identifier}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="inline-flex items-center justify-center bg-gray-100 px-3 py-1 rounded-full text-sm font-bold text-gray-600">
                                                    {row.floor}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-800">
                                                {formatMoney(row.amount_due)}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-green-600">
                                                {formatMoney(row.amount_paid)}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-amber-600">
                                                {formatMoney(balance)}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(row.status)}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="bg-gray-50 border-t border-gray-100 p-6">
                    <div className="flex flex-col sm:flex-row justify-between items-center max-w-2xl mx-auto gap-4">
                        <div className="text-center">
                            <p className="text-sm text-gray-500 font-medium mb-1">סה״כ לתשלום</p>
                            <p className="text-xl font-bold text-gray-900">{formatMoney(totalDue)}</p>
                        </div>
                        <div className="hidden sm:block w-px h-10 bg-gray-200"></div>
                        <div className="text-center">
                            <p className="text-sm text-gray-500 font-medium mb-1">סה״כ שולם</p>
                            <p className="text-xl font-bold text-green-600">{formatMoney(totalPaid)}</p>
                        </div>
                        <div className="hidden sm:block w-px h-10 bg-gray-200"></div>
                        <div className="text-center">
                            <p className="text-sm text-gray-500 font-medium mb-1">אחוז גבייה</p>
                            <p className="text-xl font-bold text-blue-600">{collectionRate}%</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex items-center gap-2 text-sm text-gray-500">
                <Info className="w-4 h-4" />
                <span>יחידות בסטטוס "לא מוגדר" אינן משתתפות בתהליך גביית התשלומים החודשי.</span>
            </div>
        </div >
    );
}
