'use client';

import React from 'react';
import { Building2, ChevronLeft, Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import WarningsBanner from '../payments/MissingConfigWarning';

export default function BuildingsList() {
    const [buildings, setBuildings] = React.useState<any[]>([]);
    const [warningsData, setWarningsData] = React.useState<any>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const router = useRouter();

    React.useEffect(() => {
        async function fetchData() {
            try {
                setLoading(true);
                setError(null);

                const [buildingsRes, warningsRes] = await Promise.all([
                    fetch('/api/v1/buildings'),
                    fetch('/api/v1/warnings')
                ]);

                if (!buildingsRes.ok) throw new Error(`HTTP ${buildingsRes.status}`);
                if (!warningsRes.ok) throw new Error(`HTTP ${warningsRes.status}`);

                const [buildingsJson, warningsJson] = await Promise.all([
                    buildingsRes.json(),
                    warningsRes.json()
                ]);

                if (buildingsJson.error) throw new Error(buildingsJson.error);
                if (warningsJson.error) throw new Error(warningsJson.error.message || warningsJson.error);

                setBuildings(buildingsJson.data || []);
                setWarningsData(warningsJson.data || null);
            } catch (err: any) {
                console.error('Error fetching data:', err);
                setError('אירעה שגיאה בטעינת הנתונים. נסה לרענן את הדף.');
            } finally {
                setLoading(false);
            }
        }

        fetchData();
    }, []);

    return (
        <>
            <header className="mb-10">
                <h1 className="text-3xl font-bold text-apro-navy mb-2">ניהול מבנים</h1>
                <p className="text-gray-500 font-medium">צפייה וניהול של כל הנכסים במערכת</p>
            </header>

            {!loading && !error && (
                warningsData && warningsData.total > 0 ? (
                    <WarningsBanner data={warningsData} />
                ) : (
                    <div className="flex items-center gap-2 text-apro-green bg-apro-green/5 p-3 rounded-xl border border-apro-green/20 mb-6 font-medium">
                        <span className="text-lg">✓</span>
                        אין התראות פעילות
                    </div>
                )
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <h2 className="text-xl font-bold text-apro-navy">רשימת מבנים בניהול</h2>
                    <div className="text-sm text-gray-500 font-medium">
                        סה"כ: {buildings.length} מבנים
                    </div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-apro-green animate-spin" />
                        <p className="text-gray-500 font-medium">טוען נתונים מהמערכת...</p>
                    </div>
                ) : error ? (
                    <div className="p-10 flex flex-col items-center text-center gap-4">
                        <div className="bg-red-50 p-4 rounded-full text-red-500">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <div className="max-w-md">
                            <h3 className="text-lg font-bold text-red-900 mb-1">שגיאה בטעינת הנתונים</h3>
                            <p className="text-red-700 text-sm mb-4">{error}</p>
                            <button
                                onClick={() => router.refresh()}
                                className="text-apro-green font-medium hover:underline"
                            >
                                רענן
                            </button>
                        </div>
                    </div>
                ) : buildings.length === 0 ? (
                    <div className="p-20 text-center">
                        <Building2 className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-400">אין מבנים להצגה</h3>
                        <p className="text-gray-400">הוסף מבנים למסד הנתונים כדי לראות אותם כאן.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-gray-500 text-sm uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">שם המבנה</th>
                                    <th className="px-6 py-4 font-semibold">כתובת</th>
                                    <th className="px-6 py-4 font-semibold text-center">קומות</th>
                                    <th className="px-6 py-4 font-semibold text-center">דירות</th>
                                    <th className="px-6 py-4 font-semibold"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {buildings.map((building, index) => (
                                    <motion.tr
                                        key={building.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                        onClick={() => router.push(`/dashboard/buildings/${building.id}`)}
                                    >
                                        <td className="px-6 py-5">
                                            <div className="font-bold text-apro-navy">{building.name}</div>
                                            {building.builtYear && (
                                                <div className="text-xs text-gray-400">שנת הקמה: {building.builtYear}</div>
                                            )}
                                        </td>
                                        <td className="px-6 py-5 text-gray-600">
                                            {building.addressStreet}, {building.addressCity}
                                        </td>
                                        <td className="px-6 py-5 text-center font-medium text-apro-navy">
                                            {building.numFloors}
                                        </td>
                                        <td className="px-6 py-5 text-center font-medium text-apro-navy">
                                            {building.unitCount ?? building.numUnits}
                                        </td>
                                        <td className="px-6 py-5 text-left">
                                            <button
                                                className="bg-white border border-gray-200 hover:border-apro-green hover:text-apro-green text-gray-600 px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 mr-auto"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/dashboard/buildings/${building.id}`);
                                                }}
                                            >
                                                צפייה
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </motion.tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
