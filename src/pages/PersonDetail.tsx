import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ChevronLeft, Loader2, AlertCircle, Building2, ChevronRight, User, Mail, Phone } from 'lucide-react';
import { supabase, Person, UnitRole, Unit, Building } from '../supabase';

interface ExtendedUnitRole extends UnitRole {
    is_fee_payer: boolean;
    units: Unit & {
        buildings: Building;
    };
}

interface PersonDetailData extends Person {
    unit_roles: ExtendedUnitRole[];
}

const roleTranslations: Record<string, string> = {
    owner: 'בעלים',
    tenant: 'דייר',
    guarantor: 'ערב'
};

const formatDate = (dateString: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('he-IL');
};

export default function PersonDetail() {
    const { id } = useParams<{ id: string }>();
    const [person, setPerson] = useState<PersonDetailData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    useEffect(() => {
        async function fetchPersonDetail() {
            try {
                setLoading(true);
                const { data, error } = await supabase
                    .from('people')
                    .select(`
                        id,
                        full_name,
                        email,
                        phone,
                        created_at,
                        unit_roles (
                            id,
                            role_type,
                            effective_from,
                            effective_to,
                            is_fee_payer,
                            unit_id,
                            units (
                                id,
                                unit_number,
                                building_id,
                                buildings (
                                    id,
                                    name,
                                    address_street,
                                    address_city
                                )
                            )
                        )
                    `)
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (!data) throw new Error('האדם לא נמצא');

                setPerson(data as unknown as PersonDetailData);
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'שגיאה בטעינת נתוני האדם');
            } finally {
                setLoading(false);
            }
        }

        if (id) {
            fetchPersonDetail();
        }
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
                <Loader2 className="w-10 h-10 text-apro-green animate-spin" />
                <p className="text-gray-500 font-medium">טוען פרופיל אדם...</p>
            </div>
        );
    }

    if (error || !person) {
        return (
            <div className="max-w-5xl mx-auto pb-12">
                <nav className="flex items-center text-sm font-medium text-gray-500 mb-8 mt-2">
                    <Link to="/dashboard/people" className="hover:text-apro-navy transition-colors">
                        אנשים
                    </Link>
                    <ChevronLeft className="w-4 h-4 mx-2" />
                    <span className="text-red-500">שגיאה</span>
                </nav>
                <div className="p-10 flex flex-col items-center text-center gap-4 bg-white rounded-2xl shadow-sm border border-red-100">
                    <div className="bg-red-50 p-4 rounded-full text-red-500">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <div className="max-w-md">
                        <h3 className="text-lg font-bold text-red-900 mb-1">האדם לא נמצא או אירעה שגיאה</h3>
                        <p className="text-red-700 text-sm mb-4">{error}</p>
                        <Link to="/dashboard/people" className="text-apro-green hover:underline font-bold">
                            חזרה לרשימת האנשים
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    const { unit_roles } = person;
    const activeRoles = (unit_roles || []).filter(r => !r.effective_to);
    const historyRoles = (unit_roles || []).filter(r => r.effective_to);

    return (
        <div className="max-w-5xl mx-auto pb-12 space-y-8">
            {/* Breadcrumb */}
            <nav className="flex items-center text-sm font-medium text-gray-500 mb-8 mt-2">
                <Link to="/dashboard/people" className="hover:text-apro-navy transition-colors">
                    אנשים
                </Link>
                <ChevronLeft className="w-4 h-4 mx-2" />
                <span className="text-apro-navy font-bold">
                    {person.full_name}
                </span>
            </nav>

            {/* SECTION 1: Personal Info Card */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
                <div className="flex items-center gap-4 mb-6">
                    <div className="bg-apro-green/10 p-4 rounded-2xl text-apro-green">
                        <User className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-apro-navy">{person.full_name}</h1>
                        <p className="text-gray-500 text-sm mt-1">פרופיל אישי</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-2">
                            <User className="w-4 h-4" /> שם מלא
                        </label>
                        <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-bold">
                            {person.full_name}
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-2">
                            <Mail className="w-4 h-4" /> אימייל
                        </label>
                        <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-bold" dir="ltr">
                            {person.email || '—'}
                        </div>
                    </div>
                    <div>
                        <label className="flex items-center gap-2 text-sm font-semibold text-gray-500 mb-2">
                            <Phone className="w-4 h-4" /> טלפון
                        </label>
                        <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-bold flex justify-end" dir="ltr">
                            {person.phone || '—'}
                        </div>
                    </div>
                </div>
            </div>

            {/* SECTION 2: Active Roles Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-6 border-b border-gray-100 flex items-center gap-3 bg-gray-50/50">
                    <div className="bg-blue-100 p-2 rounded-lg text-blue-600">
                        <Building2 className="w-5 h-5" />
                    </div>
                    <h2 className="text-xl font-bold text-apro-navy">תפקידים פעילים</h2>
                </div>

                {activeRoles.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        אין תפקידים פעילים
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 text-gray-500 text-sm uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">בניין</th>
                                    <th className="px-6 py-4 font-semibold">יחידה</th>
                                    <th className="px-6 py-4 font-semibold">תפקיד</th>
                                    <th className="px-6 py-4 font-semibold text-center">משלם דמי ניהול</th>
                                    <th className="px-6 py-4 font-semibold">תאריך התחלה</th>
                                    <th className="px-6 py-4 font-semibold text-left">קישור</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {activeRoles.map(role => {
                                    const building = role.units?.buildings;
                                    const buildingName = building ? (building.name || building.address_street) : '—';
                                    const unitLink = building ? `/dashboard/buildings/${building.id}/units/${role.unit_id}` : '#';

                                    return (
                                        <tr key={role.id} className="hover:bg-gray-50/50 transition-colors group">
                                            <td className="px-6 py-4 font-bold text-gray-800">
                                                {buildingName}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-600">
                                                {role.units?.unit_number || '—'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${role.role_type === 'owner' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                                                    role.role_type === 'tenant' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                                                        'bg-gray-50 text-gray-700 border-gray-200'
                                                    }`}>
                                                    {roleTranslations[role.role_type] || role.role_type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className="font-bold text-gray-600">
                                                    {role.is_fee_payer ? '✓' : '—'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-gray-600">
                                                {formatDate(role.effective_from)}
                                            </td>
                                            <td className="px-6 py-4 text-left">
                                                <Link
                                                    to={unitLink}
                                                    className="inline-flex items-center gap-1 text-sm bg-white border border-gray-200 hover:border-apro-green hover:text-apro-green text-gray-600 px-3 py-1.5 rounded-lg transition-colors font-bold"
                                                >
                                                    ליחידה <ChevronLeft className="w-4 h-4" />
                                                </Link>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* SECTION 3: Role History Table (Collapsible) */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full px-6 py-6 flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 transition-colors text-right"
                >
                    <div className="flex items-center gap-3">
                        <div className="bg-gray-200 p-2 rounded-lg text-gray-500">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-600">היסטוריית תפקידים</h2>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-gray-500 transform transition-transform ${showHistory ? 'rotate-90' : 'rotate-180'}`} />
                </button>

                {showHistory && (
                    <div className="border-t border-gray-100">
                        {historyRoles.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                אין תפקידים בהיסטוריה
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/80 text-gray-500 text-sm uppercase tracking-wider">
                                            <th className="px-6 py-4 font-semibold">בניין</th>
                                            <th className="px-6 py-4 font-semibold">יחידה</th>
                                            <th className="px-6 py-4 font-semibold">תפקיד</th>
                                            <th className="px-6 py-4 font-semibold text-center">משלם דמי ניהול</th>
                                            <th className="px-6 py-4 font-semibold">תאריך התחלה</th>
                                            <th className="px-6 py-4 font-semibold">תאריך סיום</th>
                                            <th className="px-6 py-4 font-semibold text-left">קישור</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {historyRoles.map(role => {
                                            const building = role.units?.buildings;
                                            const buildingName = building ? (building.name || building.address_street) : '—';
                                            const unitLink = building ? `/dashboard/buildings/${building.id}/units/${role.unit_id}` : '#';

                                            return (
                                                <tr key={role.id} className="hover:bg-gray-50/50 transition-colors text-gray-500 group">
                                                    <td className="px-6 py-4 font-medium text-gray-600">
                                                        {buildingName}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium">
                                                        {role.units?.unit_number || '—'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 text-gray-500 border-gray-200">
                                                            {roleTranslations[role.role_type] || role.role_type}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <span className="font-medium text-gray-500">
                                                            {role.is_fee_payer ? '✓' : '—'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {formatDate(role.effective_from)}
                                                    </td>
                                                    <td className="px-6 py-4 font-medium">
                                                        {formatDate(role.effective_to)}
                                                    </td>
                                                    <td className="px-6 py-4 text-left">
                                                        <Link
                                                            to={unitLink}
                                                            className="inline-flex items-center gap-1 text-sm bg-gray-50 border border-gray-200 hover:border-gray-300 text-gray-500 px-3 py-1.5 rounded-lg transition-colors font-medium opacity-0 group-hover:opacity-100"
                                                        >
                                                            ליחידה <ChevronLeft className="w-4 h-4" />
                                                        </Link>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
