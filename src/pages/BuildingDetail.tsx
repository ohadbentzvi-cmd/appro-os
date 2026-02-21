import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle, ChevronRight, Info, Grid, MapPin, Building2, Users } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase, Building, Unit } from '../supabase';

interface UnitRowData extends Unit {
    active_occupant_name: string | null;
    active_role_type: string | null;
}

export default function BuildingDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [building, setBuilding] = React.useState<Building | null>(null);
    const [units, setUnits] = React.useState<UnitRowData[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [activeTab, setActiveTab] = React.useState<'info' | 'units'>('info');

    React.useEffect(() => {
        async function fetchBuildingData() {
            if (!id) return;

            try {
                setLoading(true);
                setError(null);

                // Fetch building
                const { data: bData, error: bError } = await supabase
                    .from('buildings')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (bError) {
                    if (bError.code === 'PGRST116') {
                        throw new Error('BUILDING_NOT_FOUND');
                    }
                    throw bError;
                }

                setBuilding(bData);

                // Fetch units with roles and people
                const { data: uData, error: uError } = await supabase
                    .from('units')
                    .select(`
            *,
            unit_roles (
              role_type,
              effective_to,
              people (
                full_name
              )
            )
          `)
                    .eq('building_id', id)
                    .order('floor', { ascending: true })
                    .order('unit_number', { ascending: true });

                if (uError) throw uError;

                // Process units to find active occupant
                const processedUnits: UnitRowData[] = (uData || []).map((unit: any) => {
                    let activeName = null;
                    let activeRole = null;

                    if (unit.unit_roles && Array.isArray(unit.unit_roles)) {
                        // Find an active role (effective_to is null)
                        const activeRoleObj = unit.unit_roles.find((r: any) => r.effective_to === null);
                        if (activeRoleObj) {
                            activeRole = activeRoleObj.role_type;
                            if (activeRoleObj.people && !Array.isArray(activeRoleObj.people)) {
                                activeName = activeRoleObj.people.full_name;
                            } else if (Array.isArray(activeRoleObj.people) && activeRoleObj.people.length > 0) {
                                activeName = activeRoleObj.people[0].full_name;
                            }
                        }
                    }

                    return {
                        ...unit,
                        active_occupant_name: activeName,
                        active_role_type: activeRole
                    };
                });

                setUnits(processedUnits);

            } catch (err: any) {
                console.error('Error fetching building detail:', err);
                setError(err.message === 'BUILDING_NOT_FOUND' ? 'המבנה לא נמצא או שנמחק מהמערכת.' : err.message);
            } finally {
                setLoading(false);
            }
        }

        fetchBuildingData();
    }, [id]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
                <Loader2 className="w-12 h-12 text-apro-green animate-spin" />
                <p className="text-gray-500 font-medium text-lg">טוען את פרטי המבנה...</p>
            </div>
        );
    }

    if (error || !building) {
        return (
            <div className="space-y-6 max-w-2xl mx-auto mt-20">
                <div className="flex items-center gap-4">
                    <Link
                        to="/dashboard/buildings"
                        className="p-2 hover:bg-white rounded-full transition-colors text-gray-500 hover:text-apro-navy"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </Link>
                    <h1 className="text-3xl font-bold text-gray-900">חזרה לרשימה</h1>
                </div>

                <div className="bg-red-50 rounded-3xl p-10 flex flex-col items-center text-center gap-4 border border-red-100 shadow-sm">
                    <div className="bg-white p-4 rounded-full text-red-500 shadow-sm">
                        <AlertCircle className="w-10 h-10" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-red-900 mb-2">404 - מבנה לא נמצא</h3>
                        <p className="text-red-700 text-lg">{error || 'לא ניתן לטעון את פרטי המבנה. ייתכן שהוא הוסר מהמערכת.'}</p>
                    </div>
                    <Link
                        to="/dashboard/buildings"
                        className="mt-4 px-6 py-3 bg-white text-red-700 font-bold rounded-xl hover:bg-red-50 border border-red-200 transition-colors shadow-sm"
                    >
                        חזור לדף הבית
                    </Link>
                </div>
            </div>
        );
    }

    const roleTranslations: Record<string, string> = {
        'owner': 'בעלים',
        'tenant': 'שוכר'
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                    <Link
                        to="/dashboard/buildings"
                        className="p-2.5 bg-white shadow-sm border border-gray-100 hover:border-apro-green hover:text-apro-green rounded-full transition-all text-gray-500 group"
                    >
                        <ChevronRight className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </Link>
                    <div>
                        <h1 className="text-3xl font-bold text-apro-navy tracking-tight">{building.name}</h1>
                        <div className="flex items-center gap-2 text-gray-500 mt-1">
                            <MapPin className="w-4 h-4" />
                            <span>{building.address_street}, {building.address_city}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Tabs Layout */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* Tabs Bar */}
                <div className="flex border-b border-gray-100 bg-gray-50/50 px-2 lg:px-6 overflow-x-auto">
                    <button
                        onClick={() => setActiveTab('info')}
                        className={`flex items-center gap-2 px-6 py-4 font-bold text-sm lg:text-base transition-colors relative whitespace-nowrap ${activeTab === 'info' ? 'text-apro-green' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Info className="w-5 h-5" />
                        <span>מידע על המבנה</span>
                        {activeTab === 'info' && (
                            <motion.div
                                layoutId="activeTabIndicator"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-apro-green"
                            />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('units')}
                        className={`flex items-center gap-2 px-6 py-4 font-bold text-sm lg:text-base transition-colors relative whitespace-nowrap ${activeTab === 'units' ? 'text-apro-green' : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Grid className="w-5 h-5" />
                        <span>יחידות ואכלוס ({" "}{units.length}{" "})</span>
                        {activeTab === 'units' && (
                            <motion.div
                                layoutId="activeTabIndicator"
                                className="absolute bottom-0 left-0 right-0 h-0.5 bg-apro-green"
                            />
                        )}
                    </button>
                </div>

                {/* Tab Content */}
                <div className="p-6 lg:p-10">
                    {activeTab === 'info' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-4xl"
                        >
                            <h2 className="text-xl font-bold text-apro-navy mb-6 flex items-center gap-2">
                                <Building2 className="w-5 h-5 text-apro-green" />
                                פרטים כלליים
                            </h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                                {/* Form Readonly Fields */}
                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-2">שם מלא של המבנה</label>
                                        <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-medium">
                                            {building.name || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-2">עיר</label>
                                        <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-medium">
                                            {building.address_city || '-'}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-2">שנת הקמה</label>
                                        <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-medium">
                                            {building.built_year || '-'}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-500 mb-2">כתובת / רחוב</label>
                                        <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-medium">
                                            {building.address_street || '-'}
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-semibold text-gray-500 mb-2">מספר קומות</label>
                                            <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-bold text-center">
                                                {building.num_floors || '0'}
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <label className="block text-sm font-semibold text-gray-500 mb-2">סה״כ יחידות</label>
                                            <div className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-gray-700 font-bold text-center">
                                                {building.num_units || '0'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'units' && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            {units.length === 0 ? (
                                <div className="py-20 flex flex-col items-center text-center gap-4">
                                    <div className="bg-gray-50 p-4 rounded-full border border-gray-100">
                                        <Grid className="w-10 h-10 text-gray-300" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-gray-500">אין יחידות רשומות</h3>
                                        <p className="text-gray-400">לא נמצאו יחידות משויכות למבנה זה במסד הנתונים.</p>
                                    </div>
                                </div>
                            ) : (
                                <div className="overflow-x-auto rounded-xl border border-gray-100">
                                    <table className="w-full text-right border-collapse">
                                        <thead>
                                            <tr className="bg-gray-50/80 text-gray-500 text-sm uppercase tracking-wider">
                                                <th className="px-6 py-4 font-semibold">מספר יחידה</th>
                                                <th className="px-6 py-4 font-semibold text-center">קומה</th>
                                                <th className="px-6 py-4 font-semibold">איש קשר פעיל</th>
                                                <th className="px-6 py-4 font-semibold">סוג</th>
                                                <th className="px-6 py-4"></th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100 bg-white">
                                            {units.map((unit, index) => (
                                                <tr
                                                    key={unit.id}
                                                    onClick={() => navigate(`/dashboard/buildings/${building.id}/units/${unit.id}`)}
                                                    className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                                                >
                                                    <td className="px-6 py-4">
                                                        <div className="font-bold text-apro-navy flex items-center gap-2">
                                                            <span className="w-2 h-2 rounded-full bg-apro-green"></span>
                                                            דירה {unit.unit_number || '-'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="inline-flex items-center justify-center bg-gray-100 px-3 py-1 rounded-full text-sm font-bold text-gray-600">
                                                            {unit.floor ?? '-'}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {unit.active_occupant_name ? (
                                                            <span className="font-medium text-gray-800 flex items-center gap-2">
                                                                <Users className="w-4 h-4 text-gray-400" />
                                                                {unit.active_occupant_name}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 italic text-sm">-- ריק --</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {unit.active_role_type ? (
                                                            <span className={`inline-flex px-3 py-1 rounded-full text-xs font-bold border ${unit.active_role_type === 'owner'
                                                                    ? 'bg-blue-50 text-blue-700 border-blue-100'
                                                                    : 'bg-orange-50 text-orange-700 border-orange-100'
                                                                }`}>
                                                                {roleTranslations[unit.active_role_type] || unit.active_role_type}
                                                            </span>
                                                        ) : (
                                                            <span className="text-gray-400 text-sm">-</span>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 text-left">
                                                        <button className="text-gray-400 group-hover:text-apro-green transition-colors font-medium flex items-center gap-1 text-sm bg-transparent">
                                                            צפייה
                                                            <ChevronRight className="w-4 h-4 transform rotate-180" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </div>
        </div>
    );
}
