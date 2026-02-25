'use client';

import React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { TrendingUp, AlertCircle, Clock, PieChart } from 'lucide-react';
import { FlatChargeUnit, computeKPIs } from '../../../lib/payments/utils';

interface PaymentsSummaryProps {
    validUnits: FlatChargeUnit[];
}

export default function PaymentsSummary({ validUnits }: PaymentsSummaryProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const summary = computeKPIs(validUnits);

    // Format money (agorot to ILS)
    const formatMoney = (agorot: number) => {
        const ils = Math.round(agorot / 100);
        return new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(ils);
    };



    return (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
            {/* Collected */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                    <p className="text-gray-500 font-medium text-sm">סה״כ שולם</p>
                    <div className="p-2 bg-green-50 rounded-lg">
                        <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">{formatMoney(summary.totalCollected)}</h3>
                    <p className="text-sm font-semibold text-green-600 mt-1">נגבה החודש</p>
                </div>
            </div>

            {/* Outstanding */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                    <p className="text-gray-500 font-medium text-sm">טרם שולם</p>
                    <div className="p-2 bg-amber-50 rounded-lg">
                        <Clock className="w-5 h-5 text-amber-600" />
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">{formatMoney(summary.totalOutstanding)}</h3>
                    <p className="text-sm font-semibold text-amber-600 mt-1">יתרה לגבייה</p>
                </div>
            </div>

            {/* Collection Rate */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                    <p className="text-gray-500 font-medium text-sm">מתוך סה״כ חיובים</p>
                    <div className="p-2 bg-blue-50 rounded-lg">
                        <PieChart className="w-5 h-5 text-blue-600" />
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">{summary.collectionRate}%</h3>
                    <p className="text-sm font-semibold text-blue-600 mt-1">אחוז גבייה</p>
                </div>
            </div>

            {/* Overdue */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between">
                <div className="flex justify-between items-start mb-4">
                    <p className="text-gray-500 font-medium text-sm">לא שילמו עד למועד</p>
                    <div className="p-2 bg-red-50 rounded-lg">
                        <AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                </div>
                <div>
                    <h3 className="text-2xl font-bold text-gray-900">{summary.overdueUnitCount}</h3>
                    <p className="text-sm font-semibold text-red-600 mt-1">יחידות באיחור</p>
                </div>
            </div>
        </div>
    );
}
