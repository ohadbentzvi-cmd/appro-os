'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, ChevronRight, Home, Users, MapPin, Hash, Plus, Check, FileText, ChevronLeft, Loader2, AlertCircle, Pencil } from 'lucide-react';
import { Building, Unit, Person, UnitRole } from '@/lib/supabase/types';
import AssignPersonModal from '@/app/components/AssignPersonModal';
import EditRoleModal from '@/app/components/EditRoleModal';

interface UnitRoleData {
    id: string;
    unit_id: string;
    person_id: string;
    role_type: string;
    is_fee_payer?: boolean;
    effective_from: string;
    effective_to: string | null;
    people?: {
        full_name: string;
    } | { full_name: string }[];
}

export default function UnitDetail() {
    const params = useParams();
    const id = params?.id as string;
    const unitId = params?.unitId as string;

    const [unit, setUnit] = useState<any>(null);
    const [buildingName, setBuildingName] = useState<string>('');
    const [activeRoles, setActiveRoles] = useState<UnitRoleData[]>([]);
    const [historyRoles, setHistoryRoles] = useState<UnitRoleData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    // Assign Modal & Refresh State
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    // Edit Role Modal State
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<UnitRoleData | null>(null);

    const handleEditClick = (role: UnitRoleData) => {
        setSelectedRoleForEdit(role);
        setIsEditModalOpen(true);
    };

    useEffect(() => {
        async function fetchUnitData() {
            if (!unitId || !id) return;

            try {
                setLoading(true);
                setError(null);

                const [bRes, uRes] = await Promise.all([
                    fetch(`/api/v1/buildings/${id}`),
                    fetch(`/api/v1/buildings/${id}/units/${unitId}`)
                ]);

                if (!bRes.ok || !uRes.ok) {
                    if (uRes.status === 404) throw new Error('UNIT_NOT_FOUND');
                    throw new Error('HTTP_ERROR');
                }

                const bData = await bRes.json();
                const uData = await uRes.json();

                if (bData.error) throw new Error(bData.error);
                if (uData.error) throw new Error(uData.error);

                setBuildingName(bData.data.name || 'בניין');
                setUnit(uData.data);

                const allRoles = uData.data.roles || [];
                const active = allRoles.filter((r: any) => r.effectiveTo === null);
                const history = allRoles.filter((r: any) => r.effectiveTo !== null);

                // Map roles to match internal state structure
                const mapRole = (r: any) => ({
                    ...r,
                    role_type: r.roleType,
                    is_fee_payer: r.isFeePayer,
                    effective_from: r.effectiveFrom,
                    effective_to: r.effectiveTo,
                    people: r.person ? { full_name: r.person.fullName } : undefined
                });

                setActiveRoles(active.map(mapRole));
                setHistoryRoles(history.map(mapRole));

            } catch (err: any) {
                console.error('Error fetching unit detail:', err);
                setError(err.message === 'UNIT_NOT_FOUND' ? 'היחידה לא נמצאה' : 'אירעה שגיאה בטעינת הנתונים');
            } finally {
                setLoading(false);
            }
        }

        fetchUnitData();
    }, [unitId, id, refreshTrigger]);

    const handleAssignClick = () => {
        setIsAssignModalOpen(true);
    };

    const handleAssignSuccess = () => {
        setIsAssignModalOpen(false);
        setRefreshTrigger(prev => prev + 1);
        setToastMessage('הדייר שויך ביחידה בהצלחה');
        setTimeout(() => setToastMessage(null), 3000);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-12 h-12 text-apro-green animate-spin" />
                <p className="text-gray-500 font-medium text-lg">טוען את פרטי היחידה...</p>
            </div>
        );
    }

    if (error || !unit) {
        return (
            <div className="space-y-6 max-w-2xl mx-auto mt-20">
                <div className="flex items-center gap-4">
                    <Link
                        href={`/dashboard/buildings/${id}`}
                        className="p-2 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-apro-navy"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">חזרה לבניין</h1>
                </div>

                <div className="bg-red-50 rounded-3xl p-10 flex flex-col items-center text-center gap-4 border border-red-100 shadow-sm">
                    <div className="bg-white p-4 rounded-full text-red-500 shadow-sm">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-red-900 mb-2">{error === 'היחידה לא נמצאה' ? 'היחידה לא נמצאה' : 'שגיאה'}</h3>
                        <p className="text-red-700 text-lg">לא ניתן לטעון את פרטי היחידה.</p>
                    </div>
                    <Link
                        href={`/dashboard/buildings/${id}`}
                        className="mt-4 px-6 py-3 bg-white text-red-700 font-bold rounded-xl hover:bg-red-50 border border-red-200 transition-colors shadow-sm"
                    >
                        חזור לבניין
                    </Link>
                </div>
            </div>
        );
    }

    const roleTranslations: Record<string, string> = {
        'owner': 'בעלים',
        'tenant': 'דייר',
        'guarantor': 'ערב'
    };

    const formatDate = (dateString?: string | null) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('he-IL', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    };

    const getPersonName = (people: any) => {
        if (!people) return '-';
        if (Array.isArray(people)) return people[0]?.full_name || '-';
        return people.full_name || '-';
    };

    // Extract extra attributes from unit
    const ignoredKeys = ['id', 'buildingId', 'createdAt', 'tenantId', 'unitNumber', 'floor', 'roles'];
    const extraKeys = Object.keys(unit).filter(k => !ignoredKeys.includes(k) && unit[k] !== null);

    const keyTranslations: Record<string, string> = {
        'unitType': 'סוג יחידה',
        'areaSqm': 'שטח (מ"ר)'
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            {/* Header Area */}
            <div className="flex flex-col gap-2">
                {/* Breadcrumbs */}
                <div className="flex items-center gap-2 text-sm font-medium text-gray-500">
                    <Link href="/dashboard/buildings" className="hover:text-apro-navy transition-colors flex items-center gap-1">
                        <Home className="w-4 h-4" />
                    </Link>
                    <ChevronRight className="w-4 h-4 transform rotate-180" />
                    <Link href={`/dashboard/buildings/${id}`} className="hover:text-apro-navy transition-colors">
                        {buildingName || 'שם הבניין'}
                    </Link>
                    <ChevronRight className="w-4 h-4 transform rotate-180" />
                    <Link href={`/dashboard/buildings/${id}/units/${unitId}`} className="text-apro-green">
                        יחידה {unit.unitNumber}
                    </Link>
                </div>

                <h1 className="text-3xl font-bold text-apro-navy tracking-tight mt-2">
                    יחידה {unit.unitNumber} — קומה {unit.floor}
                </h1>
            </div>

            {/* SECTION 1: Unit Info */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 lg:p-8">
                <h2 className="text-xl font-bold text-apro-navy mb-6">פרטי היחידה</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                        <label className="block text-sm font-semibold text-gray-500 mb-2">מספר יחידה</label>
                        <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-bold">
                            {unit.unitNumber}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-500 mb-2">קומה</label>
                        <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-bold">
                            {unit.floor}
                        </div>
                    </div>
                    {extraKeys.map(key => (
                        <div key={key}>
                            <label className="block text-sm font-semibold text-gray-500 mb-2">
                                {keyTranslations[key] || key}
                            </label>
                            <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-bold">
                                {String(unit[key])}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* SECTION 2: Active Roles */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="px-6 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h2 className="text-xl font-bold text-apro-navy">דיירים פעילים</h2>
                    <button
                        onClick={handleAssignClick}
                        className="px-6 py-2 bg-apro-green text-white font-bold rounded-xl hover:bg-emerald-600 transition-colors shadow-sm text-sm"
                    >
                        + שיוך אדם ליחידה
                    </button>
                </div>

                {activeRoles.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        אין דיירים פעילים ביחידה זו
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-50/80 text-gray-500 text-sm uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">שם</th>
                                    <th className="px-6 py-4 font-semibold">תפקיד</th>
                                    <th className="px-6 py-4 font-semibold text-center">משלם דמי ניהול</th>
                                    <th className="px-6 py-4 font-semibold">תאריך התחלה</th>
                                    <th className="px-6 py-4 font-semibold">פעולות</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {activeRoles.map(role => (
                                    <tr key={role.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-gray-800">
                                            {getPersonName(role.people)}
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
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleEditClick(role)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="ערוך תפקיד"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </button>
                                                <button disabled className="text-gray-400 bg-gray-100 px-3 py-1.5 rounded-lg text-sm font-medium cursor-not-allowed opacity-60">
                                                    הסר
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* SECTION 3: Role History */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="w-full px-6 py-6 flex justify-between items-center bg-gray-50/50 hover:bg-gray-50 transition-colors text-right"
                >
                    <h2 className="text-xl font-bold text-apro-navy">היסטוריית תפקידים</h2>
                    <ChevronRight className={`w-5 h-5 text-gray-500 transform transition-transform ${showHistory ? 'rotate-90' : 'rotate-180'}`} />
                </button>

                {showHistory && (
                    <div className="border-t border-gray-100">
                        {historyRoles.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                אין היסטוריית תפקידים
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-right border-collapse">
                                    <thead>
                                        <tr className="bg-gray-50/80 text-gray-500 text-sm uppercase tracking-wider">
                                            <th className="px-6 py-4 font-semibold">שם</th>
                                            <th className="px-6 py-4 font-semibold">תפקיד</th>
                                            <th className="px-6 py-4 font-semibold text-center">משלם דמי ניהול</th>
                                            <th className="px-6 py-4 font-semibold">תאריך התחלה</th>
                                            <th className="px-6 py-4 font-semibold">תאריך סיום</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 bg-white">
                                        {historyRoles.map(role => (
                                            <tr key={role.id} className="hover:bg-gray-50/50 transition-colors text-gray-500">
                                                <td className="px-6 py-4 font-medium text-gray-600">
                                                    {getPersonName(role.people)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex px-3 py-1 rounded-full text-xs font-bold border bg-gray-50 text-gray-500 border-gray-200">
                                                        {roleTranslations[role.role_type] || role.role_type}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className="font-medium">
                                                        {role.is_fee_payer ? '✓' : '—'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    {formatDate(role.effective_from)}
                                                </td>
                                                <td className="px-6 py-4 font-medium">
                                                    {formatDate(role.effective_to)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Assign Modal */}
            <AssignPersonModal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                buildingId={id as string}
                unitId={unitId!}
                onSuccess={handleAssignSuccess}
            />

            {/* Edit Role Modal */}
            <EditRoleModal
                isOpen={isEditModalOpen}
                buildingId={id as string}
                unitId={unitId as string}
                onClose={() => {
                    setIsEditModalOpen(false);
                    setSelectedRoleForEdit(null);
                }}
                role={selectedRoleForEdit}
                onSuccess={() => {
                    setIsEditModalOpen(false);
                    setSelectedRoleForEdit(null);
                    setRefreshTrigger(prev => prev + 1);
                    setToastMessage('התפקיד עודכן בהצלחה');
                    setTimeout(() => setToastMessage(null), 3000);
                }}
            />

            {/* Success Toast */}
            {toastMessage && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 z-50 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-green-500/20 p-1 rounded-full">
                        <Check className="w-4 h-4 text-green-400" />
                    </div>
                    <span className="font-medium">{toastMessage}</span>
                </div>
            )}
        </div>
    );
}
