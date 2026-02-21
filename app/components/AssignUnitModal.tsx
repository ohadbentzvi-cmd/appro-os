'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Building, Unit } from '@/lib/supabase/types';
import { X, Search, Check, AlertCircle, Building2, Home } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface AssignUnitModalProps {
    isOpen: boolean;
    onClose: () => void;
    personId: string;
    personName: string;
    onSuccess: () => void;
}

export default function AssignUnitModal({ isOpen, onClose, personId, personName, onSuccess }: AssignUnitModalProps) {
    const [step, setStep] = useState<1 | 2>(1);

    // Step 1 State: Selection
    const [searchTerm, setSearchTerm] = useState('');
    const [buildings, setBuildings] = useState<Building[]>([]);
    const [units, setUnits] = useState<Unit[]>([]);
    const [selectedBuilding, setSelectedBuilding] = useState<Building | null>(null);
    const [selectedUnit, setSelectedUnit] = useState<Unit | null>(null);
    const [loadingData, setLoadingData] = useState(false);

    // Step 2 State: Role details
    const [roleType, setRoleType] = useState<'owner' | 'tenant' | 'guarantor'>('tenant');
    const [effectiveFrom, setEffectiveFrom] = useState('');
    const [isFeePayer, setIsFeePayer] = useState(false);

    // Submission State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Reset state when modal opens
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSearchTerm('');
            setSelectedBuilding(null);
            setSelectedUnit(null);
            setRoleType('tenant');
            setEffectiveFrom('');
            setIsFeePayer(false);
            setError(null);
            fetchBuildings();
        }
    }, [isOpen]);

    // Fetch Units when a building is selected
    useEffect(() => {
        if (selectedBuilding) {
            fetchUnits(selectedBuilding.id);
            setSelectedUnit(null); // Reset unit choice if building changes
        } else {
            setUnits([]);
        }
    }, [selectedBuilding]);

    const fetchBuildings = async () => {
        setLoadingData(true);
        try {
            const { data, error } = await supabase
                .from('buildings')
                .select('*')
                .order('name', { ascending: true });
            if (error) throw error;
            setBuildings(data || []);
        } catch (err) {
            console.error('Error fetching buildings:', err);
        } finally {
            setLoadingData(false);
        }
    };

    const fetchUnits = async (buildingId: string) => {
        setLoadingData(true);
        try {
            const { data, error } = await supabase
                .from('units')
                .select('*')
                .eq('building_id', buildingId)
                .order('unit_number', { ascending: true }); // Depending on your setup
            if (error) throw error;
            setUnits(data || []);
        } catch (err) {
            console.error('Error fetching units:', err);
        } finally {
            setLoadingData(false);
        }
    };

    const getLocalDateStr = () => {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleNextStep = () => {
        if (!selectedUnit) return;
        setEffectiveFrom(getLocalDateStr());
        setStep(2);
        setError(null);
    };

    const handleSubmit = async () => {
        if (!selectedUnit) return;
        setError(null);

        // Validation
        if (!effectiveFrom) {
            setError('יש לבחור תאריך התחלה');
            return;
        }

        const selectedDate = new Date(effectiveFrom);
        const today = new Date(getLocalDateStr());

        if (selectedDate > today) {
            setError('תאריך התחלה לא יכול להיות עתידי');
            return;
        }

        setIsSubmitting(true);
        try {
            // First check if a fee payer already exists if this role is marked as fee payer
            if (isFeePayer) {
                const { data: existingFeePayer, error: checkError } = await supabase
                    .from('unit_roles')
                    .select('id, people(full_name)')
                    .eq('unit_id', selectedUnit.id)
                    .eq('is_fee_payer', true)
                    .is('effective_to', null)
                    .single();

                if (checkError && checkError.code !== 'PGRST116') { // PGRST116 means no rows found, which is fine
                    throw checkError;
                }

                if (existingFeePayer) {
                    const personNameStr = existingFeePayer.people ? (existingFeePayer.people as any).full_name : 'אדם אחר';
                    setError(`כבר קיים משלם דמי ניהול פעיל ליחידה זו (${personNameStr}). לא ניתן להגדיר יותר כרגע.`);
                    setIsSubmitting(false);
                    return;
                }
            }

            const { error: insertError } = await supabase
                .from('unit_roles')
                .insert([{
                    unit_id: selectedUnit.id,
                    person_id: personId,
                    role_type: roleType,
                    effective_from: effectiveFrom,
                    is_fee_payer: isFeePayer,
                    tenant_id: '00000000-0000-0000-0000-000000000000'
                }]);

            if (insertError) throw insertError;

            onSuccess();
        } catch (err: any) {
            console.error('Error assigning unit:', err);
            setError('אירעה שגיאה בשיוך היחידה. אנא נסה שוב.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const filteredBuildings = buildings.filter(b =>
        (b.name && b.name.includes(searchTerm)) ||
        (b.address_street && b.address_street.includes(searchTerm))
    );

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 font-sans backdrop-blur-sm" dir="rtl">
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <div>
                        <h2 className="text-xl font-bold text-apro-navy">
                            {step === 1 ? 'בחירת יחידה לשיוך' : 'פרטי תפקיד'}
                        </h2>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">
                            שיוך יחידה לאדם: <span className="font-bold text-gray-700">{personName}</span>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white rounded-full transition-colors text-gray-400 hover:text-gray-600 shadow-sm"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-200">
                    <AnimatePresence mode="wait">
                        {step === 1 ? (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="space-y-6"
                            >
                                {/* Building Selection */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">1. בחירת בניין</label>
                                    <div className="relative mb-3">
                                        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="text"
                                            placeholder="חיפוש בניין לפי שם או כתובת..."
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="w-full pl-4 pr-10 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-apro-green/20 focus:border-apro-green transition-all"
                                        />
                                    </div>
                                    <div className="bg-gray-50 border border-gray-200 rounded-xl max-h-48 overflow-y-auto overflow-x-hidden">
                                        {loadingData && !buildings.length ? (
                                            <div className="p-4 text-center text-sm text-gray-500">טוען בניינים...</div>
                                        ) : filteredBuildings.length === 0 ? (
                                            <div className="p-4 text-center text-sm text-gray-500">לא נמצאו בניינים...</div>
                                        ) : (
                                            <div className="divide-y divide-gray-100">
                                                {filteredBuildings.map(building => (
                                                    <button
                                                        key={building.id}
                                                        onClick={() => {
                                                            setSelectedBuilding(building);
                                                            setSearchTerm(''); // Clear search to easily see selection
                                                        }}
                                                        className={`w-full text-right px-4 py-3 flex items-center justify-between transition-colors ${selectedBuilding?.id === building.id
                                                            ? 'bg-apro-green/10 text-apro-green'
                                                            : 'hover:bg-white text-gray-700'
                                                            }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <Building2 className={`w-4 h-4 ${selectedBuilding?.id === building.id ? 'text-apro-green' : 'text-gray-400'}`} />
                                                            <div className="flex flex-col">
                                                                <span className="font-bold text-sm truncate max-w-[200px]">{building.name || building.address_street}</span>
                                                                <span className="text-xs text-gray-500 opacity-80">{building.address_city}</span>
                                                            </div>
                                                        </div>
                                                        {selectedBuilding?.id === building.id && <Check className="w-4 h-4" />}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Unit Selection (Only visible if building selected) */}
                                {selectedBuilding && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        className="mt-6"
                                    >
                                        <label className="block text-sm font-bold text-gray-700 mb-2">2. בחירת יחידה בבניין ({selectedBuilding.name || selectedBuilding.address_street})</label>
                                        <div className="bg-gray-50 border border-gray-200 rounded-xl max-h-48 overflow-y-auto">
                                            {loadingData ? (
                                                <div className="p-4 text-center text-sm text-gray-500">טוען יחידות...</div>
                                            ) : units.length === 0 ? (
                                                <div className="p-4 text-center text-sm text-gray-500">אין יחידות בבניין זה</div>
                                            ) : (
                                                <div className="grid grid-cols-3 gap-2 p-3">
                                                    {units.map(unit => (
                                                        <button
                                                            key={unit.id}
                                                            onClick={() => setSelectedUnit(unit)}
                                                            className={`py-2 px-3 rounded-lg text-sm font-bold flex items-center justify-center gap-2 border transition-all ${selectedUnit?.id === unit.id
                                                                ? 'bg-apro-green text-white border-apro-green shadow-md shadow-apro-green/20'
                                                                : 'bg-white text-gray-600 border-gray-200 hover:border-apro-green/50 hover:bg-apro-green/5'
                                                                }`}
                                                        >
                                                            <Home className="w-3.5 h-3.5 opacity-70" />
                                                            {unit.unit_number}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        ) : (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                {/* Role Summary */}
                                <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-xs font-bold text-blue-600 mb-1">יחידה נבחרת</p>
                                        <p className="text-sm font-bold text-apro-navy">
                                            {selectedBuilding?.name || selectedBuilding?.address_street} - יחידה {selectedUnit?.unit_number}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => setStep(1)}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 underline underline-offset-2"
                                    >
                                        שנה בחירה
                                    </button>
                                </div>

                                <div className="space-y-5">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">תפקיד ביחידה</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { id: 'tenant', label: 'שוכר' },
                                                { id: 'owner', label: 'בעלים' },
                                                { id: 'guarantor', label: 'ערב' }
                                            ].map((role) => (
                                                <button
                                                    key={role.id}
                                                    type="button"
                                                    onClick={() => setRoleType(role.id as any)}
                                                    className={`py-2.5 px-4 rounded-xl text-sm font-bold transition-all border ${roleType === role.id
                                                        ? 'bg-apro-navy text-white border-apro-navy shadow-md shadow-apro-navy/10'
                                                        : 'bg-white text-gray-600 border-gray-200 hover:border-apro-navy/30'
                                                        }`}
                                                >
                                                    {role.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">תאריך התחלה</label>
                                        <input
                                            type="date"
                                            value={effectiveFrom}
                                            max={getLocalDateStr()}
                                            onChange={(e) => setEffectiveFrom(e.target.value)}
                                            className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-apro-green/20 focus:border-apro-green text-left font-sans"
                                            dir="ltr"
                                        />
                                    </div>

                                    {/* RTL Custom Toggle */}
                                    <div className="flex items-center justify-between bg-gray-50 border border-gray-200 p-4 rounded-xl">
                                        <div>
                                            <p className="text-sm font-bold text-gray-800">משלם דמי ניהול?</p>
                                            <p className="text-xs text-gray-500 mt-0.5">האם אדם זה אחראי על תשלום הועד</p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => setIsFeePayer(!isFeePayer)}
                                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-apro-green focus:ring-offset-2 ${isFeePayer ? 'bg-apro-green' : 'bg-gray-200'
                                                }`}
                                            role="switch"
                                            aria-checked={isFeePayer}
                                        >
                                            <span
                                                aria-hidden="true"
                                                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isFeePayer ? '-translate-x-5' : 'translate-x-0'
                                                    }`}
                                            />
                                        </button>
                                    </div>
                                    {isFeePayer && (
                                        <div className="flex items-start gap-2 bg-yellow-50 text-yellow-800 p-3 rounded-lg text-xs font-medium border border-yellow-100">
                                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                            <p>שים לב: ייתכן שקיים כבר משלם דמי ניהול אחר ליחידה זו. המערכת תתריע במידה וכן.</p>
                                        </div>
                                    )}
                                </div>

                                {error && (
                                    <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg text-sm border border-red-100 font-medium">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        <span>{error}</span>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3 rounded-b-3xl">
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-gray-600 hover:text-gray-800 bg-white border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors"
                    >
                        ביטול
                    </button>
                    {step === 1 ? (
                        <button
                            onClick={handleNextStep}
                            disabled={!selectedUnit}
                            className="px-8 py-2.5 bg-apro-green text-white text-sm font-bold rounded-xl hover:bg-emerald-600 transition-all shadow-md shadow-apro-green/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            המשך לפרטי תפקיד
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting || !effectiveFrom}
                            className="px-8 py-2.5 bg-apro-navy text-white text-sm font-bold rounded-xl hover:bg-blue-900 transition-all shadow-md shadow-apro-navy/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                        >
                            {isSubmitting ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                "שמור שיוך"
                            )}
                        </button>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
