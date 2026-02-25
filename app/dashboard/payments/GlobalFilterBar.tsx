'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { ChevronRight, ChevronLeft, MapPin, CalendarDays, Loader2 } from 'lucide-react';

interface Building {
    id: string;
    addressStreet: string;
    addressCity: string;
}

export default function GlobalFilterBar() {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    const [buildings, setBuildings] = useState<Building[]>([]);
    const [loadingBuildings, setLoadingBuildings] = useState(true);

    const periodParam = searchParams.get('period_month');
    const buildingParam = searchParams.get('building_id') || 'all';

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const activeMonthStr = periodParam || currentMonthStr;

    useEffect(() => {
        async function fetchBuildings() {
            try {
                // Fetch buildings (assuming reasonably small amount for dropdown, could handle pagination if needed, but for MVP standard fetch is fine)
                const res = await fetch('/api/v1/buildings');
                if (res.ok) {
                    const json = await res.json();
                    setBuildings(json.data || []);
                }
            } catch (error) {
                console.error('Error fetching buildings for filter', error);
            } finally {
                setLoadingBuildings(false);
            }
        }
        fetchBuildings();
    }, []);

    const updateFilter = (newMonth: string, newBuilding: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (newMonth === currentMonthStr && newBuilding === 'all' && !searchParams.has('status')) {
            // Keep URL clean if defaults
            params.delete('period_month');
            params.delete('building_id');
        } else {
            params.set('period_month', newMonth);
            params.set('building_id', newBuilding);
        }

        router.replace(`${pathname}?${params.toString()}`);
    };

    const handlePrevMonth = () => {
        const d = new Date(activeMonthStr);
        d.setMonth(d.getMonth() - 1);
        updateFilter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`, buildingParam);
    };

    const handleNextMonth = () => {
        const d = new Date(activeMonthStr);
        d.setMonth(d.getMonth() + 1);
        updateFilter(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`, buildingParam);
    };

    const handleBuildingChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateFilter(activeMonthStr, e.target.value);
    };

    const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateFilter(e.target.value, buildingParam);
    };

    const activeDate = new Date(activeMonthStr);
    const displayMonthName = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"][activeDate.getMonth()];
    const displayYear = activeDate.getFullYear();

    // Generate recent months for dropdown
    const monthOptions = [];
    for (let i = -6; i <= 6; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
        const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
        const label = `${["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"][d.getMonth()]} ${d.getFullYear()}`;
        monthOptions.push({ val, label });
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-6 flex flex-col sm:flex-row gap-4 items-center justify-between">

            {/* Building Selector */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-blue-600" />
                </div>
                <div className="flex-1 sm:w-64">
                    <select
                        value={buildingParam}
                        onChange={handleBuildingChange}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 text-sm rounded-xl focus:ring-apro-green focus:border-apro-green block p-2.5 font-bold"
                        disabled={loadingBuildings}
                    >
                        <option value="all">כל הבניינים</option>
                        {buildings.map(b => (
                            <option key={b.id} value={b.id}>
                                {b.addressStreet}{b.addressCity ? `, ${b.addressCity}` : ''}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Month Selector */}
            <div className="flex items-center gap-2 bg-gray-50 p-1.5 rounded-xl border border-gray-100 w-full sm:w-auto justify-between sm:justify-center">
                <button
                    onClick={handlePrevMonth}
                    className="p-2 hover:bg-white rounded-lg transition-colors text-gray-500 hover:text-apro-navy shadow-sm"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>

                <div className="flex items-center gap-2 px-3 min-w-[140px] justify-center">
                    <CalendarDays className="w-4 h-4 text-gray-400" />
                    <select
                        value={activeMonthStr}
                        onChange={handleMonthChange}
                        className="bg-transparent border-none text-apro-navy font-bold text-base focus:ring-0 cursor-pointer appearance-none text-center outline-none"
                    >
                        {monthOptions.map(opt => (
                            <option key={opt.val} value={opt.val}>{opt.label}</option>
                        ))}
                    </select>
                </div>

                <button
                    onClick={handleNextMonth}
                    className="p-2 hover:bg-white rounded-lg transition-colors text-gray-500 hover:text-apro-navy shadow-sm"
                >
                    <ChevronLeft className="w-5 h-5" />
                </button>
            </div>

        </div>
    );
}
