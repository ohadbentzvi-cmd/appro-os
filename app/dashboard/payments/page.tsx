'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PaymentsSummary from './PaymentsSummary';
import GlobalFilterBar from './GlobalFilterBar';
import ChargesTable from './ChargesTable';

import { MoreVertical, Loader2, AlertCircle, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import { MonthlySnapshot, BuildingSnapshot, filterByBuilding, flattenUnits, filterByStatus } from '../../../lib/payments/utils';

function PaymentsDashboardContent() {
    const searchParams = useSearchParams();

    // Global filters from URL
    const periodParam = searchParams.get('period_month') || (() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    })();
    const buildingParam = searchParams.get('building_id') || 'all';
    const statusParam = searchParams.get('status') || 'all';

    // State
    const [monthlySnapshot, setMonthlySnapshot] = useState<MonthlySnapshot | null>(null);

    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch snapshot
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;

        async function fetchData() {
            try {
                setIsLoading(true);
                setError(null);

                const res = await fetch(`/api/v1/charges/monthly-snapshot?period_month=${periodParam}`, { signal });

                if (!res.ok) throw new Error('Failed to fetch monthly snapshot');

                const json = await res.json();

                if (json.error) throw new Error(json.error.message);

                setMonthlySnapshot(json.data);
            } catch (err: any) {
                if (err.name === 'AbortError') return;
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        }

        fetchData();

        return () => {
            controller.abort();
        };
    }, [periodParam]);

    const handlePaymentRecorded = (chargeId: string, newStatus: any, newAmountPaid: number) => {
        // Use functional update so multiple calls in the same batch each see the latest state
        setMonthlySnapshot(prev => {
            if (!prev) return prev;
            const next = JSON.parse(JSON.stringify(prev)) as MonthlySnapshot;
            for (const building of next.buildings) {
                for (const unit of building.units) {
                    if (unit.charge_id === chargeId) {
                        unit.status = newStatus;
                        unit.amount_paid = newAmountPaid;
                        if (newStatus === 'paid') unit.is_overdue = false;
                        return next;
                    }
                }
            }
            return next;
        });
    };

    // Derived data
    const filteredBuildings = filterByBuilding(monthlySnapshot, buildingParam);
    const allFilteredUnits = flattenUnits(filteredBuildings, periodParam);

    const validUnits = allFilteredUnits.filter(u => u.status !== 'no_config');
    const displayUnits = filterByStatus(validUnits, statusParam);

    const isCompletelyEmpty = monthlySnapshot &&
        monthlySnapshot.buildings.every(b => b.units.length === 0);

    return (
        <div className="animate-in fade-in max-w-7xl mx-auto">
            <header className="mb-6 flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-apro-navy mb-1">תשלומים</h1>
                    <p className="text-gray-500 font-medium text-sm md:text-base">מעקב וניהול גבייה</p>
                </div>

                <div className="relative group">
                    <button className="p-2.5 bg-white shadow-sm border border-gray-100 rounded-full hover:bg-gray-50 transition-colors text-gray-500 hover:text-apro-navy">
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 origin-top-left translate-y-2 group-hover:translate-y-0">
                        <Link
                            href="/dashboard/payments/reminders"
                            className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-gray-600 hover:text-apro-navy hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                        >
                            <MessageSquare className="w-4 h-4" />
                            יומן תזכורות
                        </Link>
                    </div>
                </div>
            </header>

            <GlobalFilterBar />

            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 border border-red-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="w-5 h-5" />
                        <p className="font-bold">שגיאה בטעינת נתונים לחודש הנבחר</p>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-1.5 bg-white rounded-lg shadow-sm border border-red-200 text-sm hover:bg-red-50 transition-colors"
                    >
                        נסה שוב
                    </button>
                </div>
            )}

            {isLoading && !monthlySnapshot && (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                    {/* Skeleton KPI cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 border-b border-gray-100">
                        {[...Array(4)].map((_, i) => (
                            <div key={i} className="bg-gray-50 rounded-xl p-4 animate-pulse">
                                <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
                                <div className="h-6 bg-gray-200 rounded w-1/2" />
                            </div>
                        ))}
                    </div>
                    {/* Skeleton table rows */}
                    <div className="divide-y divide-gray-100">
                        {[...Array(7)].map((_, i) => (
                            <div key={i} className="flex items-center gap-4 px-6 py-4 animate-pulse">
                                <div className="h-4 bg-gray-100 rounded w-8" />
                                <div className="h-4 bg-gray-100 rounded flex-1" />
                                <div className="h-4 bg-gray-100 rounded w-24" />
                                <div className="h-6 bg-gray-100 rounded-full w-16" />
                                <div className="h-4 bg-gray-100 rounded w-20" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Data — only when snapshot exists and has charges */}
            {monthlySnapshot && !isCompletelyEmpty && (
                <div className={isLoading ? 'opacity-50 pointer-events-none transition-opacity' : 'transition-opacity'}>
                    <PaymentsSummary validUnits={validUnits} />
                    <ChargesTable
                        displayUnits={displayUnits}
                        buildingParam={buildingParam}
                        statusParam={statusParam}
                        onPaymentRecorded={handlePaymentRecorded}
                    />
                </div>
            )}

            {/* Empty state — only after fetch completes and snapshot confirms no charges */}
            {!isLoading && monthlySnapshot && isCompletelyEmpty && (
                <div className="bg-white rounded-3xl border border-gray-100 p-24 text-center shadow-sm flex flex-col items-center">
                    <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                        <AlertCircle className="w-10 h-10 text-gray-300" />
                    </div>
                    <h2 className="text-2xl font-bold text-apro-navy mb-2">אין חיובים לחודש זה</h2>
                    <p className="text-gray-500 max-w-sm">חיובים נוצרים אוטומטית בעת הוספת בניין. וודא שהוגדרו סכום וגבייה לכל יחידה.</p>
                </div>
            )}
        </div>
    );
}

export default function PaymentsDashboard() {
    return (
        <Suspense fallback={<div className="p-8 text-center text-gray-500"><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>}>
            <PaymentsDashboardContent />
        </Suspense>
    );
}
