'use client';

import { useEffect, useState, useCallback } from 'react';
import { MessageSquare, ChevronDown, Loader2, AlertCircle, CheckCircle, XCircle, Clock, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { formatHebrewMonthYear } from '@/lib/reminders/month';

interface ReminderLogRow {
    id: string;
    chargeId: string;
    status: 'queued' | 'sent' | 'delivered' | 'failed';
    sentAt: string;
    deliveredAt: string | null;
    failureReason: string | null;
    recipientPhone: string;
    recipientNameUsed: string;
    bulkBatchId: string | null;
    periodMonth: string;
    unitNumber: string;
    buildingAddress: string;
    buildingId: string;
    recipientFullName: string | null;
    senderFullName: string | null;
}

interface Building {
    id: string;
    addressStreet: string;
    addressCity: string;
}

const STATUS_OPTIONS = [
    { value: 'all', label: 'כל הסטטוסים' },
    { value: 'delivered', label: 'נמסרה' },
    { value: 'sent', label: 'נשלחה' },
    { value: 'queued', label: 'בתור' },
    { value: 'failed', label: 'נכשלה' },
];

function currentMonthParam() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
}

function formatDateTime(isoStr: string) {
    const d = new Date(isoStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function StatusBadge({ status }: { status: ReminderLogRow['status'] }) {
    if (status === 'delivered') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-100">
                <CheckCircle className="w-3 h-3" />
                נמסרה
            </span>
        );
    }
    if (status === 'failed') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-100">
                <XCircle className="w-3 h-3" />
                נכשלה
            </span>
        );
    }
    if (status === 'sent') {
        return (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                <Clock className="w-3 h-3" />
                נשלחה
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-500 border border-gray-200">
            <Clock className="w-3 h-3" />
            בתור
        </span>
    );
}

export default function RemindersLogPage() {
    const [rows, setRows] = useState<ReminderLogRow[]>([]);
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [totalThisMonth, setTotalThisMonth] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [offset, setOffset] = useState(0);

    const [statusFilter, setStatusFilter] = useState('all');
    const [monthFilter, setMonthFilter] = useState(currentMonthParam());
    const [buildingFilter, setBuildingFilter] = useState('all');

    const PAGE_SIZE = 50;

    // Fetch buildings once
    useEffect(() => {
        fetch('/api/v1/buildings')
            .then(r => r.json())
            .then(json => setBuildings(json.data ?? []))
            .catch(() => {});
    }, []);

    const fetchLogs = useCallback(async (currentOffset: number, append: boolean) => {
        if (append) setLoadingMore(true);
        else { setLoading(true); setError(null); }

        try {
            const params = new URLSearchParams({ offset: String(currentOffset) });
            if (statusFilter !== 'all') params.set('status', statusFilter);
            if (monthFilter) params.set('month', monthFilter);
            if (buildingFilter !== 'all') params.set('building_id', buildingFilter);

            const res = await fetch(`/api/v1/reminders/logs?${params}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'שגיאה בטעינת הנתונים');

            const newRows: ReminderLogRow[] = json.data ?? [];
            setRows(prev => append ? [...prev, ...newRows] : newRows);
            setTotalThisMonth(json.meta?.totalThisMonth ?? 0);
            setHasMore(newRows.length === PAGE_SIZE);
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    }, [statusFilter, monthFilter, buildingFilter]);

    // Reset and fetch when filters change
    useEffect(() => {
        setOffset(0);
        fetchLogs(0, false);
    }, [fetchLogs]);

    const handleLoadMore = () => {
        const nextOffset = offset + PAGE_SIZE;
        setOffset(nextOffset);
        fetchLogs(nextOffset, true);
    };

    return (
        <div className="min-h-screen bg-gray-50/50" dir="rtl">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 space-y-6">

                {/* Header */}
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="bg-apro-green/10 p-2 rounded-xl">
                                <MessageSquare className="w-5 h-5 text-apro-green" />
                            </div>
                            <h1 className="text-2xl font-bold text-apro-navy">יומן תזכורות</h1>
                        </div>
                        <p className="text-sm text-gray-500 mr-12">
                            היסטוריית שליחת תזכורות WhatsApp
                        </p>
                    </div>
                    <div className="shrink-0 text-left">
                        <p className="text-xs text-gray-400 font-medium">החודש הנוכחי</p>
                        <p className="text-2xl font-bold text-apro-navy">{totalThisMonth}</p>
                        <p className="text-xs text-gray-400">תזכורות נשלחו</p>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
                    {/* Month */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500">חודש</label>
                        <input
                            type="month"
                            value={monthFilter.slice(0, 7)}
                            onChange={e => {
                                const val = e.target.value;
                                setMonthFilter(val ? `${val}-01` : '');
                            }}
                            className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-apro-green/30 bg-white"
                        />
                    </div>

                    {/* Status */}
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-semibold text-gray-500">סטטוס</label>
                        <div className="relative">
                            <select
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                                className="appearance-none border border-gray-200 rounded-xl px-3 py-2 pl-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-apro-green/30 bg-white"
                            >
                                {STATUS_OPTIONS.map(o => (
                                    <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Building */}
                    {buildings.length > 0 && (
                        <div className="flex flex-col gap-1">
                            <label className="text-xs font-semibold text-gray-500">בניין</label>
                            <div className="relative">
                                <select
                                    value={buildingFilter}
                                    onChange={e => setBuildingFilter(e.target.value)}
                                    className="appearance-none border border-gray-200 rounded-xl px-3 py-2 pl-8 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-apro-green/30 bg-white"
                                >
                                    <option value="all">כל הבניינים</option>
                                    {buildings.map(b => (
                                        <option key={b.id} value={b.id}>{b.addressStreet}{b.addressCity ? `, ${b.addressCity}` : ''}</option>
                                    ))}
                                </select>
                                <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
                            <Loader2 className="w-6 h-6 animate-spin text-apro-green" />
                            <span className="font-medium">טוען נתונים...</span>
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-20 gap-3 text-red-500">
                            <AlertCircle className="w-5 h-5" />
                            <span className="font-medium">{error}</span>
                        </div>
                    ) : rows.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-3 text-gray-400">
                            <MessageSquare className="w-10 h-10 text-gray-200" />
                            <p className="font-medium">לא נמצאו תזכורות</p>
                            <p className="text-sm">נסה לשנות את הפילטרים</p>
                        </div>
                    ) : (
                        <>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-gray-100 bg-gray-50/50">
                                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">תאריך שליחה</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">נמען</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">טלפון</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">יחידה</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">חודש חיוב</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">סטטוס</th>
                                            <th className="text-right px-4 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">נשלח על ידי</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {rows.map(row => (
                                            <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                                    {formatDateTime(row.sentAt)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-bold text-apro-navy">{row.recipientNameUsed}</p>
                                                    {row.recipientFullName && row.recipientFullName !== row.recipientNameUsed && (
                                                        <p className="text-xs text-gray-400">{row.recipientFullName}</p>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 font-mono text-xs" dir="ltr">
                                                    {row.recipientPhone}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <p className="font-medium text-gray-800">דירה {row.unitNumber}</p>
                                                    <p className="text-xs text-gray-400">{row.buildingAddress}</p>
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                                    {formatHebrewMonthYear(row.periodMonth)}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="space-y-1">
                                                        <StatusBadge status={row.status} />
                                                        {row.failureReason && (
                                                            <p className="text-xs text-red-500">{row.failureReason}</p>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                    {row.senderFullName ?? '—'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* Load more */}
                            {hasMore && (
                                <div className="flex justify-center py-4 border-t border-gray-100">
                                    <button
                                        onClick={handleLoadMore}
                                        disabled={loadingMore}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
                                    >
                                        {loadingMore
                                            ? <Loader2 className="w-4 h-4 animate-spin" />
                                            : <RefreshCw className="w-4 h-4" />
                                        }
                                        טען עוד
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Back link */}
                <div className="text-center">
                    <Link href="/dashboard/payments" className="text-sm text-gray-400 hover:text-apro-navy transition-colors underline underline-offset-2">
                        חזרה לדף התשלומים
                    </Link>
                </div>
            </div>
        </div>
    );
}
