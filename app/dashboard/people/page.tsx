'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Users, ChevronLeft, Loader2, AlertCircle, Search, X, ArrowUpDown, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { Person } from '@/lib/supabase/types';
import CreatePersonModal from '@/app/components/CreatePersonModal';

type PersonWithActiveRolesCount = Person & {
    active_roles_count: number;
};

type SortField = 'full_name' | 'email';
type SortOrder = 'asc' | 'desc';

export default function PeopleList() {
    const [people, setPeople] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [cursor, setCursor] = useState<string | null>(null);
    const [hasMore, setHasMore] = useState(false);
    const [isFetchingMore, setIsFetchingMore] = useState(false);

    const router = useRouter();

    // Create Modal & Toast State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const fetchPeople = async (isLoadMore = false, overrideSearch = searchTerm) => {
        try {
            if (isLoadMore) setIsFetchingMore(true);
            else setLoading(true);

            let url = '/api/v1/people?';
            const params = new URLSearchParams();
            if (isLoadMore && cursor) params.append('cursor', cursor);
            if (overrideSearch.trim()) params.append('search', overrideSearch.trim());
            url += params.toString();

            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const { data, error, meta } = await res.json();
            if (error) throw new Error(error);

            if (isLoadMore) {
                setPeople((prev) => [...prev, ...(data || [])]);
            } else {
                setPeople(data || []);
            }

            setHasMore(meta?.hasMore || false);
            setCursor(meta?.nextCursor || null);
        } catch (err: any) {
            console.error('Error fetching people:', err);
            setError('אירעה שגיאה בטעינת הנתונים');
        } finally {
            setLoading(false);
            setIsFetchingMore(false);
        }
    };

    // Debounced search effect
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchPeople(false, searchTerm);
        }, 300);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const handleLoadMore = () => {
        if (hasMore && !isFetchingMore) {
            fetchPeople(true);
        }
    };

    return (
        <>
            <header className="mb-8 flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold text-apro-navy mb-2">אנשים</h1>
                    <p className="text-gray-500 font-medium">כל האנשים הרשומים במערכת</p>
                </div>
                <button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="bg-apro-green hover:bg-emerald-600 transition-colors text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-apro-green/20 flex items-center gap-2"
                >
                    + הוסף אדם
                </button>
            </header>

            {/* Search Bar */}
            <div className="mb-6 relative">
                <div className="relative flex items-center">
                    <Search className="absolute right-4 w-5 h-5 text-gray-400" />
                    <input
                        type="text"
                        placeholder="חיפוש לפי שם, אימייל או טלפון..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-12 py-3.5 bg-white border border-gray-200 rounded-xl text-apro-navy focus:outline-none focus:ring-2 focus:ring-apro-green/20 focus:border-apro-green transition-all shadow-sm"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute left-4 p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
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
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    </div>
                ) : people.length === 0 ? (
                    <div className="p-20 text-center">
                        <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-400">לא נמצאו אנשים במערכת</h3>
                    </div>
                ) : people.length === 0 ? (
                    <div className="p-20 text-center">
                        <Users className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-bold text-gray-400">לא נמצאו תוצאות עבור "{searchTerm}"</h3>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-right border-collapse">
                                <thead>
                                    <tr className="bg-gray-50/50 text-gray-500 text-sm uppercase tracking-wider">
                                        <th className="px-6 py-4 font-semibold w-1/4">שם מלא</th>
                                        <th className="px-6 py-4 font-semibold w-1/4">אימייל</th>
                                        <th className="px-6 py-4 font-semibold w-1/6">טלפון</th>
                                        <th className="px-6 py-4 font-semibold w-1/6">תפקידים פעילים</th>
                                        <th className="px-6 py-4 font-semibold">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {people.map((person, index) => (
                                        <motion.tr
                                            key={person.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                            onClick={() => router.push(`/dashboard/people/${person.id}`)}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-apro-navy">{person.fullName}</div>
                                            </td>
                                            <td className="px-6 py-5 text-gray-600 truncate">
                                                {person.email || '—'}
                                            </td>
                                            <td className="px-6 py-5 text-gray-600" dir="ltr" style={{ textAlign: 'right' }}>
                                                {person.phone || '—'}
                                            </td>
                                            <td className="px-6 py-5">
                                                {person.activeRolesCount > 0 ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-apro-green/10 text-apro-green">
                                                        {person.activeRolesCount} תפקידים
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                                                        אין תפקידים
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-5 text-left">
                                                <button
                                                    className="bg-white border border-gray-200 hover:border-apro-green hover:text-apro-green text-gray-600 px-4 py-1.5 rounded-lg text-sm font-bold transition-all flex items-center gap-1 mr-auto"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        router.push(`/dashboard/people/${person.id}`);
                                                    }}
                                                >
                                                    צפה
                                                    <ChevronLeft className="w-4 h-4" />
                                                </button>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Load More Footer */}
                        {hasMore && (
                            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex justify-center">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={isFetchingMore}
                                    className="px-6 py-2.5 text-sm font-bold border border-gray-200 rounded-xl bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:text-apro-navy transition-colors flex items-center gap-2 shadow-sm"
                                >
                                    {isFetchingMore && <Loader2 className="w-4 h-4 animate-spin text-apro-green" />}
                                    טען עוד
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Create Person Modal */}
            <CreatePersonModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={() => {
                    setIsCreateModalOpen(false);
                    setShowSuccessToast(true);
                    fetchPeople();
                    setTimeout(() => setShowSuccessToast(false), 3000);
                }}
            />

            {/* Success Toast */}
            {showSuccessToast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-green-500/20 p-1 rounded-full">
                        <Check className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="font-medium">האדם נוסף בהצלחה</span>
                </div>
            )}
        </>
    );
}
