'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TrendingUp, Send } from 'lucide-react';
import ChargeDetailDrawer from '../buildings/[id]/ChargeDetailDrawer';
import ReminderStatusBadge from '../../components/reminders/ReminderStatusBadge';
import ReminderApprovalModal from '../../components/reminders/ReminderApprovalModal';
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
    const [drawerFeePayerPhone, setDrawerFeePayerPhone] = useState<string | null>(null);
    const [drawerFeePayerRole, setDrawerFeePayerRole] = useState<string | null>(null);
    const [drawerAmountDue, setDrawerAmountDue] = useState<number>(0);
    const [drawerStatus, setDrawerStatus] = useState<string>('pending');
    const [drawerFeePayerPersonId, setDrawerFeePayerPersonId] = useState<string | null>(null);
    const [drawerLastReminder, setDrawerLastReminder] = useState<{ sentAt: string; status: string } | null>(null);
    const [drawerPeriodMonth, setDrawerPeriodMonth] = useState<string>('');

    // Bulk selection state
    const [selectedChargeIds, setSelectedChargeIds] = useState<Set<string>>(new Set());

    // Reminder modal state (bulk)
    const [reminderModalOpen, setReminderModalOpen] = useState(false);

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

    const handleRowClick = (row: FlatChargeUnit) => {
        if (!row.charge_id) return;
        setDrawerChargeId(row.charge_id);
        setDrawerUnitIdentifier(row.unit_identifier);
        setDrawerFloor(row.floor);
        setDrawerFeePayerName(row.fee_payer_name);
        setDrawerFeePayerPhone(row.fee_payer_phone);
        setDrawerFeePayerRole(row.fee_payer_role);
        setDrawerAmountDue(row.amount_due);
        setDrawerStatus(row.status);
        setDrawerFeePayerPersonId(row.fee_payer_person_id);
        setDrawerLastReminder(row.last_reminder);
        setDrawerPeriodMonth(row.period_month);
    };

    // Eligible rows for selection (only pending/partial with a charge_id)
    const eligibleUnits = useMemo(
        () => displayUnits.filter(u => (u.status === 'pending' || u.status === 'partial') && u.charge_id),
        [displayUnits]
    );

    const allEligibleSelected =
        eligibleUnits.length > 0 && eligibleUnits.every(u => selectedChargeIds.has(u.charge_id!));

    const toggleRow = (chargeId: string) => {
        setSelectedChargeIds(prev => {
            const next = new Set(prev);
            if (next.has(chargeId)) next.delete(chargeId);
            else next.add(chargeId);
            return next;
        });
    };

    const toggleAll = () => {
        if (allEligibleSelected) {
            setSelectedChargeIds(new Set());
        } else {
            setSelectedChargeIds(new Set(eligibleUnits.map(u => u.charge_id!)));
        }
    };

    // Period month for the reminder modal — all visible units share the same period
    const periodMonth = displayUnits[0]?.period_month ?? '';

    // Clear selection when the displayed units change (e.g. filter change)
    useEffect(() => { setSelectedChargeIds(new Set()); }, [displayUnits]);

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

    const handleReminderSent = () => {
        router.refresh();
        setSelectedChargeIds(new Set());
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
                                        <th className="px-4 py-4 w-10">
                                            <input type="checkbox" checked={allEligibleSelected} onChange={toggleAll} className="accent-apro-green w-4 h-4 cursor-pointer" />
                                        </th>
                                        <th className="px-6 py-4 font-semibold">דייר משלם</th>
                                        <th className="px-6 py-4 font-semibold">יחידה</th>
                                        <th className="px-6 py-4 font-semibold text-center">קומה</th>
                                        <th className="px-6 py-4 font-semibold">סכום לתשלום</th>
                                        <th className="px-6 py-4 font-semibold">שולם</th>
                                        <th className="px-6 py-4 font-semibold">יתרה</th>
                                        <th className="px-6 py-4 font-semibold">סטטוס</th>
                                        <th className="px-6 py-4 font-semibold">תזכורת אחרונה</th>
                                        <th className="px-6 py-4 font-semibold">תאריך לתשלום</th>
                                    </tr>
                                </thead>

                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {Object.entries(groupedCharges).map(([bId, group]) => (
                                        <React.Fragment key={bId}>
                                            {/* Section Header */}
                                            <tr className="bg-gray-50/80 border-y border-gray-100">
                                                <td colSpan={10} className="px-6 py-4">
                                                    <div className="flex justify-between items-center">
                                                        <h3 className="font-bold text-apro-navy">{group.address}</h3>
                                                        <div className="text-sm font-medium text-gray-500">
                                                            {group.rows.length} חיובים · נגבו <span className="font-bold text-green-600">{formatMoney(group.totalPaid)}</span> · יתרה <span className="font-bold text-amber-600">{formatMoney(group.totalDue - group.totalPaid)}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>

                                            {/* Table Content */}
                                            {group.rows.map((row, idx) => {
                                                const isEligible = (row.status === 'pending' || row.status === 'partial') && !!row.charge_id;
                                                const isChecked = !!row.charge_id && selectedChargeIds.has(row.charge_id);
                                                return (
                                                    <tr
                                                        key={`${row.unit_id}-${idx}`}
                                                        onClick={() => handleRowClick(row)}
                                                        className={`cursor-pointer transition-colors group ${row.is_overdue ? 'bg-red-50 hover:bg-red-100/80' : 'hover:bg-gray-50/80'}`}
                                                    >
                                                        <td className="px-4 py-4 w-10" onClick={e => e.stopPropagation()}>
                                                            {isEligible && (
                                                                <input type="checkbox" checked={isChecked} onChange={() => toggleRow(row.charge_id!)} className="accent-apro-green w-4 h-4 cursor-pointer" />
                                                            )}
                                                        </td>
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
                                                        <td className="px-6 py-4"><ReminderStatusBadge lastReminder={row.last_reminder} /></td>
                                                        <td className="px-6 py-4 text-gray-500 text-sm font-medium">{formatDate(row.due_date || '')}</td>
                                                    </tr>
                                                );
                                            })}
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
                                        <th className="px-4 py-4 w-10">
                                            <input type="checkbox" checked={allEligibleSelected} onChange={toggleAll} className="accent-apro-green w-4 h-4 cursor-pointer" />
                                        </th>
                                        <th className="px-6 py-4 font-semibold">דייר משלם</th>
                                        <th className="px-6 py-4 font-semibold">יחידה</th>
                                        <th className="px-6 py-4 font-semibold text-center">קומה</th>
                                        <th className="px-6 py-4 font-semibold">סכום לתשלום</th>
                                        <th className="px-6 py-4 font-semibold">שולם</th>
                                        <th className="px-6 py-4 font-semibold">יתרה</th>
                                        <th className="px-6 py-4 font-semibold">סטטוס</th>
                                        <th className="px-6 py-4 font-semibold">תזכורת אחרונה</th>
                                        <th className="px-6 py-4 font-semibold">תאריך לתשלום</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100 bg-white">
                                    {displayUnits.map((row, idx) => {
                                        const isEligible = (row.status === 'pending' || row.status === 'partial') && !!row.charge_id;
                                        const isChecked = !!row.charge_id && selectedChargeIds.has(row.charge_id);
                                        return (
                                            <tr
                                                key={`${row.unit_id}-${idx}`}
                                                onClick={() => handleRowClick(row)}
                                                className={`cursor-pointer transition-colors group ${row.is_overdue ? 'bg-red-50 hover:bg-red-100/80' : 'hover:bg-gray-50/80'}`}
                                            >
                                                <td className="px-4 py-4 w-10" onClick={e => e.stopPropagation()}>
                                                    {isEligible && (
                                                        <input type="checkbox" checked={isChecked} onChange={() => toggleRow(row.charge_id!)} className="accent-apro-green w-4 h-4 cursor-pointer" />
                                                    )}
                                                </td>
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
                                                <td className="px-6 py-4"><ReminderStatusBadge lastReminder={row.last_reminder} /></td>
                                                <td className="px-6 py-4 text-gray-500 text-sm font-medium">{formatDate(row.due_date || '')}</td>
                                            </tr>
                                        );
                                    })}
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
                amountDue={drawerAmountDue}
                status={drawerStatus}
                feePayerName={drawerFeePayerName}
                feePayerPhone={drawerFeePayerPhone}
                feePayerRole={drawerFeePayerRole}
                feePayerPersonId={drawerFeePayerPersonId}
                lastReminder={drawerLastReminder}
                periodMonth={drawerPeriodMonth}
                onPaymentSuccess={handlePaymentRecordSuccess}
            />

            {/* Floating bulk-action bar */}
            {selectedChargeIds.size > 0 && (
                <div className="fixed bottom-8 left-0 right-0 flex justify-center z-30 pointer-events-none">
                    <div className="pointer-events-auto flex items-center gap-4 bg-apro-navy text-white px-6 py-3.5 rounded-2xl shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <span className="font-medium text-sm">נבחרו {selectedChargeIds.size} חיובים</span>
                        <div className="w-px h-5 bg-white/20" />
                        <button
                            onClick={() => setReminderModalOpen(true)}
                            className="flex items-center gap-2 bg-apro-green hover:bg-emerald-500 text-white font-bold text-sm px-4 py-2 rounded-xl transition-colors"
                        >
                            <Send className="w-4 h-4" />
                            שלח תזכורת לכולם
                        </button>
                        <button
                            onClick={() => setSelectedChargeIds(new Set())}
                            className="text-white/60 hover:text-white transition-colors text-sm font-medium"
                        >
                            בטל
                        </button>
                    </div>
                </div>
            )}

            <ReminderApprovalModal
                isOpen={reminderModalOpen}
                onClose={() => setReminderModalOpen(false)}
                onSent={handleReminderSent}
                chargeIds={Array.from(selectedChargeIds)}
                periodMonth={periodMonth}
            />
        </div>
    );
}
