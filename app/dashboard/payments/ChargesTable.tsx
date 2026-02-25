'use client';

import React, { useState, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import ChargeDetailDrawer from '../buildings/[id]/ChargeDetailDrawer';
import { FlatChargeUnit } from '../../../lib/payments/utils';

interface ChargesTableProps {
    displayUnits: FlatChargeUnit[];
    buildingParam: string;
    statusParam: string;
    onPaymentRecorded?: (chargeId: string, newStatus: string, newAmountPaid: number) => void;
}

export default function ChargesTable({ displayUnits, buildingParam, statusParam, onPaymentRecorded }: ChargesTableProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Drawer state
    const [drawerChargeId, setDrawerChargeId] = useState<string | null>(null);
    const [drawerUnitIdentifier, setDrawerUnitIdentifier] = useState<string>('');
    const [drawerFloor, setDrawerFloor] = useState<number>(0);
    const [drawerFeePayerName, setDrawerFeePayerName] = useState<string | null>(null);
    const [drawerFeePayerRole, setDrawerFeePayerRole] = useState<string | null>(null);

    const formatMoney = (agorot: number) => {
        const ils = Math.round(agorot / 100);
        return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(ils);
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'paid':
                return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-100">שולם</span>;
            case 'partial':
                return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-yellow-50 text-yellow-700 border-yellow-100">חלקי</span>;
            case 'pending':
                return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 text-gray-700 border-gray-200">ממתין</span>;
            case 'waived':
                return <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 text-gray-700 border-gray-200">מחוק</span>;
            default:
                return <span className="text-gray-400 text-sm font-medium">{status}</span>;
        }
    };

    const handleRowClick = (chargeId: string | null, unitIdentifier: string, floor: number, feePayerName: string | null, feePayerRole: string | null) => {
        if (!chargeId) return; // Should not trigger for unconfigured rows if they somehow render
        setDrawerChargeId(chargeId);
        setDrawerUnitIdentifier(unitIdentifier);
        setDrawerFloor(floor);
        setDrawerFeePayerName(feePayerName);
        setDrawerFeePayerRole(feePayerRole);
    };

    const closeDrawer = () => setDrawerChargeId(null);

    const updateStatusFilter = (newStatus: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (newStatus === 'all') params.delete('status');
        else params.set('status', newStatus);
        router.push(`${pathname}?${params.toString()}`);
    };

    const handlePaymentRecordSuccess = (newStatus: string, newAmountPaid: number) => {
        if (drawerChargeId && onPaymentRecorded) {
            onPaymentRecorded(drawerChargeId, newStatus, newAmountPaid);
        }
    };

    // Grouping by building if "all" is selected
    const groupedCharges = useMemo(() => {
        if (buildingParam !== 'all') return null;
        const groups: Record<string, { address: string; rows: FlatChargeUnit[]; totalDue: number; totalPaid: number }> = {};
        for (const c of displayUnits) {
            if (!groups[c.building_id]) {
                groups[c.building_id] = { address: c.building_address, rows: [], totalDue: 0, totalPaid: 0 };
            }
            groups[c.building_id].rows.push(c);
            groups[c.building_id].totalDue += c.amount_due;
            groups[c.building_id].totalPaid += c.amount_paid;
        }
        return groups;
    }, [displayUnits, buildingParam]);

    const statusOptions = [
        { value: 'all', label: 'הכל' },
        { value: 'paid', label: 'שולם' },
        { value: 'partial', label: 'חלקי' },
        { value: 'pending', label: 'ממתין' },
        { value: 'overdue', label: 'באיחור' },
    ];

    if (!displayUnits) return null;

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mb-8 relative z-0">

            {/* Status Segmented Control */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
                <div className="bg-gray-100 p-1 rounded-xl inline-flex shadow-inner">
                    {statusOptions.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => updateStatusFilter(opt.value)}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all ${statusParam === opt.value
                                ? 'bg-white text-apro-navy shadow-sm border border-gray-200/50'
                                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                                }`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>



            {displayUnits.length === 0 ? (
                <div className="bg-white rounded-2xl p-16 border border-gray-100 text-center flex flex-col items-center shadow-sm relative z-0 mb-6">
                    <div className="bg-gray-50 p-4 rounded-full mb-4">
                        <TrendingUp className="w-8 h-8 text-gray-300" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-500 mb-1">לא נמצאו חיובים</h3>
                    <p className="text-gray-400">לא קיימים חיובים עבור מסננים אלו.</p>
                </div>
            ) : (
                <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm mb-6 max-h-[800px] overflow-y-auto">
                    {/* Render Grouped Table */}
                    {buildingParam === 'all' && groupedCharges && (
                        <div className="w-full relative">
                            <table className="w-full text-right border-collapse">
                                {/* Global Sticky Header */}
                                <thead className="sticky top-0 z-10 bg-white shadow-sm ring-1 ring-gray-100">
                                    <tr className="text-gray-500 text-sm uppercase tracking-wider">
                                        <th className="px-6 py-4 font-semibold">דייר משלם</th>
                                        <th className="px-6 py-4 font-semibold">יחידה</th>
                                        <th className="px-6 py-4 font-semibold text-center">קומה</th>
                                        <th className="px-6 py-4 font-semibold">סכום לתשלום</th>
                                        <th className="px-6 py-4 font-semibold">שולם</th>
                                        <th className="px-6 py-4 font-semibold">יתרה</th>
                                        <th className="px-6 py-4 font-semibold">סטטוס</th>
                                        <th className="px-6 py-4 font-semibold">תאריך לתשלום</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {Object.entries(groupedCharges).map(([bId, group]) => (
                                        <React.Fragment key={bId}>
                                            {/* Section Header */}
                                            <tr className="bg-gray-50/80 border-y border-gray-100">
                                                <td colSpan={8} className="px-6 py-4">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="font-bold text-apro-navy">{group.address}</h3>
                                                        <div className="text-sm font-medium text-gray-500">
                                                            {group.rows.length} חיובים · גבוי <span className="font-bold text-green-600">{formatMoney(group.totalPaid)}</span> · יתרה <span className="font-bold text-amber-600">{formatMoney(group.totalDue - group.totalPaid)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Table Content */}
                                            {group.rows.map((row, idx) => (
                                                <tr
                                                    key={`${row.unit_id}-${idx}`}
                                                    onClick={() => handleRowClick(row.charge_id, row.unit_identifier, row.floor, row.fee_payer_name, row.fee_payer_role)}
                                                    className={`cursor-pointer transition-colors group ${row.is_overdue ? 'bg-red-50 hover:bg-red-100/80' : 'hover:bg-gray-50/80'}`}
                                                >
                                                    <td className="px-6 py-4">
                                                        {row.fee_payer_name || row.fee_payer_role ? (
                                                            <div className="text-sm text-gray-700 font-medium">
                                                                {row.fee_payer_name ? `${row.fee_payer_name} — ${row.fee_payer_role}` : row.fee_payer_role}
                                                            </div>
                                                        ) : (
                                                            <div className="text-gray-300 font-bold">—</div>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-apro-navy">דירה {row.unit_identifier}</div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${row.is_overdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                            {row.floor}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-gray-800">{formatMoney(row.amount_due)}</td>
                                                    <td className="px-6 py-4 font-medium text-green-600">{formatMoney(row.amount_paid)}</td>
                                                    <td className="px-6 py-4 font-medium text-amber-600">{formatMoney(row.amount_due - row.amount_paid)}</td>
                                                    <td className="px-6 py-4">{getStatusBadge(row.status)}</td>
                                                    <td className="px-6 py-4 text-gray-500 text-sm font-medium">{formatDate(row.due_date || '')}</td>
                                                </tr>
                                            ))}
                                        </React.Fragment>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Render Flat Table */}
                    {buildingParam !== 'all' && (
                        <div className="w-full relative">
                            <table className="w-full text-right border-collapse">
                                <thead className="sticky top-0 z-10 bg-white shadow-sm ring-1 ring-gray-100">
                                    <tr className="text-gray-500 text-sm uppercase tracking-wider">
                                        <th className="px-6 py-4 font-semibold">דייר משלם</th>
                                        <th className="px-6 py-4 font-semibold">יחידה</th>
                                        <th className="px-6 py-4 font-semibold text-center">קומה</th>
                                        <th className="px-6 py-4 font-semibold">סכום לתשלום</th>
                                        <th className="px-6 py-4 font-semibold">שולם</th>
                                        <th className="px-6 py-4 font-semibold">יתרה</th>
                                        <th className="px-6 py-4 font-semibold">סטטוס</th>
                                        <th className="px-6 py-4 font-semibold">תאריך לתשלום</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {displayUnits.map((row, idx) => (
                                        <tr
                                            key={`${row.unit_id}-${idx}`}
                                            onClick={() => handleRowClick(row.charge_id, row.unit_identifier, row.floor, row.fee_payer_name, row.fee_payer_role)}
                                            className={`cursor-pointer transition-colors group ${row.is_overdue ? 'bg-red-50 hover:bg-red-100/80' : 'hover:bg-gray-50/80'}`}
                                        >
                                            <td className="px-6 py-4">
                                                {row.fee_payer_name || row.fee_payer_role ? (
                                                    <div className="text-sm text-gray-700 font-medium">
                                                        {row.fee_payer_name ? `${row.fee_payer_name} — ${row.fee_payer_role}` : row.fee_payer_role}
                                                    </div>
                                                ) : (
                                                    <div className="text-gray-300 font-bold">—</div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-apro-navy">דירה {row.unit_identifier}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold ${row.is_overdue ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>
                                                    {row.floor}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-800">{formatMoney(row.amount_due)}</td>
                                            <td className="px-6 py-4 font-medium text-green-600">{formatMoney(row.amount_paid)}</td>
                                            <td className="px-6 py-4 font-medium text-amber-600">{formatMoney(row.amount_due - row.amount_paid)}</td>
                                            <td className="px-6 py-4">{getStatusBadge(row.status)}</td>
                                            <td className="px-6 py-4 text-gray-500 text-sm font-medium">{formatDate(row.due_date || '')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            <ChargeDetailDrawer
                isOpen={!!drawerChargeId}
                onClose={closeDrawer}
                chargeId={drawerChargeId}
                unitIdentifier={drawerUnitIdentifier}
                floor={drawerFloor}
                feePayerName={drawerFeePayerName}
                feePayerRole={drawerFeePayerRole}
                onPaymentSuccess={handlePaymentRecordSuccess}
            />
        </div>
    );
}
