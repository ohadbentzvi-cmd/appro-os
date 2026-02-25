'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PaymentsSummary from './PaymentsSummary';
import GlobalFilterBar from './GlobalFilterBar';
import ChargesTable from './ChargesTable';
import MissingConfigWarning from './MissingConfigWarning';
import { MoreVertical, History, Loader2, AlertCircle, FilePlus } from 'lucide-react';
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

        async function fetchSnapshot() {
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

        fetchSnapshot();

        return () => {
            controller.abort();
        };
    }, [periodParam]);

    const handlePaymentRecorded = (chargeId: string, newStatus: any, newAmountPaid: number) => {
        if (!monthlySnapshot) return;

        // Deep clone snapshot to update state immutably
        const newSnapshot = JSON.parse(JSON.stringify(monthlySnapshot)) as MonthlySnapshot;

        let found = false;
        for (const building of newSnapshot.buildings) {
            for (const unit of building.units) {
                if (unit.charge_id === chargeId) {
                    unit.status = newStatus;
                    unit.amount_paid = newAmountPaid;
                    found = true;
                    break;
                }
            }
            if (found) break;
        }

        if (found) {
            setMonthlySnapshot(newSnapshot);
        }
    };

    // Derived data
    const filteredBuildings = filterByBuilding(monthlySnapshot, buildingParam);
    const allFilteredUnits = flattenUnits(filteredBuildings, periodParam);

    // Separate out missing config for the warning, and operational standard units for the rest
    const missingConfigUnits = allFilteredUnits.filter(u => u.status === 'no_config');
    const validUnits = allFilteredUnits.filter(u => u.status !== 'no_config');

    const displayUnits = filterByStatus(validUnits, statusParam);

    const isCompletelyEmpty = monthlySnapshot &&
        monthlySnapshot.buildings.every(b => b.units.length === 0);

    return (
        <div className="animate-in fade-in max-w-7xl mx-auto">
            <header className="mb-6 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-apro-navy mb-2">תשלומים</h1>
                    <p className="text-gray-500 font-medium">מעקב וניהול גבייה</p>
                </div>

                <div className="relative group">
                    <button className="p-2.5 bg-white shadow-sm border border-gray-100 rounded-full hover:bg-gray-50 transition-colors text-gray-500 hover:text-apro-navy">
                        <MoreVertical className="w-5 h-5" />
                    </button>

                    {/* Dropdown Menu */}
                    <div className="absolute left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10 origin-top-left translate-y-2 group-hover:translate-y-0">
                        <Link
                            href="/dashboard/payments/log"
                            className="flex items-center gap-2 px-4 py-3 text-sm font-bold text-gray-600 hover:text-apro-navy hover:bg-gray-50 transition-colors first:rounded-t-xl last:rounded-b-xl"
                        >
                            <History className="w-4 h-4" />
                            היסטוריית הפקת חיובים
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
                <div className="flex flex-col items-center justify-center py-32 bg-white/50 rounded-3xl border border-gray-100 backdrop-blur-sm">
                    <Loader2 className="w-10 h-10 text-apro-green animate-spin mb-4" />
                    <p className="text-gray-500 font-medium animate-pulse">טוען נתוני גבייה...</p>
                </div>
            )}

            {(!isLoading || monthlySnapshot) && (
                <>
                    {/* Empty State */}
                    {isCompletelyEmpty ? (
                        <div className="bg-white rounded-3xl border border-gray-100 p-24 text-center shadow-sm flex flex-col items-center">
                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                                <AlertCircle className="w-10 h-10 text-gray-300" />
                            </div>
                            <h2 className="text-2xl font-bold text-apro-navy mb-2">לא נוצרו חיובים לחודש זה</h2>
                            <p className="text-gray-500 mb-8 max-w-sm">לא קיימות הגדרות גבייה או שלא הופקו מעולם חיובים בהיסטוריה לתקופה זו.</p>

                            <Link
                                href="/dashboard/payments/log"
                                className="inline-flex items-center gap-2 bg-apro-green text-white px-6 py-3 rounded-xl font-bold hover:bg-green-600 transition-colors shadow-sm"
                            >
                                <FilePlus className="w-5 h-5" />
                                צור חיובים לחודש זה
                            </Link>
                        </div>
                    ) : (
                        <div className={`${isLoading ? 'opacity-50 pointer-events-none' : 'opacity-100 transition-opacity duration-300'}`}>
                            <PaymentsSummary validUnits={validUnits} />

                            <MissingConfigWarning missingConfigUnits={missingConfigUnits} />

                            <ChargesTable
                                displayUnits={displayUnits}
                                buildingParam={buildingParam}
                                statusParam={statusParam}
                                onPaymentRecorded={handlePaymentRecorded}
                            />
                        </div>
                    )}
                </>
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
