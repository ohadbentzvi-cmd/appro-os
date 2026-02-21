import React, { useState, useEffect, useMemo } from 'react';
import { Users, ChevronLeft, Loader2, AlertCircle, Search, X, ArrowUpDown, ArrowUp, ArrowDown, Check } from 'lucide-react';
import { motion } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { supabase, Person } from '../supabase';
import CreatePersonModal from '../components/CreatePersonModal';

type PersonWithActiveRolesCount = Person & {
    active_roles_count: number;
};

type SortField = 'full_name' | 'email';
type SortOrder = 'asc' | 'desc';

export default function PeopleList() {
    const [people, setPeople] = useState<PersonWithActiveRolesCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Sorting state
    const [sortField, setSortField] = useState<SortField>('full_name');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 25;

    const navigate = useNavigate();

    // Create Modal & Toast State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [showSuccessToast, setShowSuccessToast] = useState(false);

    const fetchPeople = async () => {
        try {
            setLoading(true);
            // Fetch people and their unit roles to calculate active roles count
            const { data, error } = await supabase
                .from('people')
                .select('*, unit_roles(id, effective_to)');

            if (error) throw error;

            // Process the data to include active_roles_count
            const processedData: PersonWithActiveRolesCount[] = (data || []).map((person: any) => {
                const activeRoles = person.unit_roles ? person.unit_roles.filter((role: any) => role.effective_to === null).length : 0;
                return {
                    id: person.id,
                    full_name: person.full_name,
                    phone: person.phone,
                    email: person.email,
                    created_at: person.created_at,
                    active_roles_count: activeRoles
                };
            });

            setPeople(processedData);
        } catch (err: any) {
            console.error('Error fetching people:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPeople();
    }, []);

    // Derived state for filtering and sorting
    const filteredAndSortedPeople = useMemo(() => {
        // Filter
        let result = people;
        if (searchTerm.trim() !== '') {
            const lowerterm = searchTerm.toLowerCase();
            result = result.filter(p =>
                (p.full_name && p.full_name.toLowerCase().includes(lowerterm)) ||
                (p.email && p.email.toLowerCase().includes(lowerterm)) ||
                (p.phone && p.phone.toLowerCase().includes(lowerterm))
            );
        }

        // Sort
        result.sort((a, b) => {
            const aVal = (a[sortField] || '').toLowerCase();
            const bVal = (b[sortField] || '').toLowerCase();

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return result;
    }, [people, searchTerm, sortField, sortOrder]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    // Pagination
    const totalItems = filteredAndSortedPeople.length;
    const totalPages = Math.ceil(totalItems / pageSize) || 1;

    // Ensure current page is valid after filtering
    useEffect(() => {
        if (currentPage > totalPages) {
            setCurrentPage(1);
        }
    }, [totalPages, currentPage]);

    const startIndex = (currentPage - 1) * pageSize;
    const paginatedPeople = filteredAndSortedPeople.slice(startIndex, startIndex + pageSize);

    const renderSortIcon = (field: SortField) => {
        if (sortField !== field) return <ArrowUpDown className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />;
        return sortOrder === 'asc' ? <ArrowUp className="w-4 h-4 text-apro-navy" /> : <ArrowDown className="w-4 h-4 text-apro-navy" />;
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
                ) : filteredAndSortedPeople.length === 0 ? (
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
                                        <th
                                            className="px-6 py-4 font-semibold cursor-pointer group hover:text-apro-navy transition-colors w-1/4"
                                            onClick={() => handleSort('full_name')}
                                        >
                                            <div className="flex items-center gap-2">
                                                שם מלא
                                                {renderSortIcon('full_name')}
                                            </div>
                                        </th>
                                        <th
                                            className="px-6 py-4 font-semibold cursor-pointer group hover:text-apro-navy transition-colors w-1/4"
                                            onClick={() => handleSort('email')}
                                        >
                                            <div className="flex items-center gap-2">
                                                אימייל
                                                {renderSortIcon('email')}
                                            </div>
                                        </th>
                                        <th className="px-6 py-4 font-semibold w-1/6">טלפון</th>
                                        <th className="px-6 py-4 font-semibold w-1/6">תפקידים פעילים</th>
                                        <th className="px-6 py-4 font-semibold">פעולות</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {paginatedPeople.map((person, index) => (
                                        <motion.tr
                                            key={person.id}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                            onClick={() => navigate(`/dashboard/people/${person.id}`)}
                                        >
                                            <td className="px-6 py-5">
                                                <div className="font-bold text-apro-navy">{person.full_name}</div>
                                            </td>
                                            <td className="px-6 py-5 text-gray-600 truncate">
                                                {person.email || '—'}
                                            </td>
                                            <td className="px-6 py-5 text-gray-600" dir="ltr" style={{ textAlign: 'right' }}>
                                                {person.phone || '—'}
                                            </td>
                                            <td className="px-6 py-5">
                                                {person.active_roles_count > 0 ? (
                                                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-apro-green/10 text-apro-green">
                                                        {person.active_roles_count} תפקידים
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
                                                        navigate(`/dashboard/people/${person.id}`);
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

                        {/* Pagination Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                            <div className="text-sm text-gray-500 font-medium">
                                מציג {totalItems === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)} מתוך {totalItems} אנשים
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:text-apro-navy transition-colors"
                                >
                                    הקודם
                                </button>
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    className="px-4 py-2 text-sm font-medium border border-gray-200 rounded-lg bg-white disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 hover:text-apro-navy transition-colors"
                                >
                                    הבא
                                </button>
                            </div>
                        </div>
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
