'use client';

import React, { useState, useEffect, useRef } from 'react';
import { X, Search, Plus, AlertTriangle, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import CreatePersonForm, { Person } from './CreatePersonForm';

interface AssignPersonModalProps {
    isOpen: boolean;
    onClose: () => void;
    unitId: string;
    onSuccess: () => void;
}

export default function AssignPersonModal({ isOpen, onClose, unitId, onSuccess }: AssignPersonModalProps) {
    const [step, setStep] = useState<1 | 2>(1);

    // Step 1 State
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<Person[]>([]);
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const getLocalDateStr = () => {
        const today = new Date();
        return today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
    };

    // Step 2 State
    const [roleType, setRoleType] = useState<string>('');
    const [effectiveFrom, setEffectiveFrom] = useState<string>(getLocalDateStr());
    const [isFeePayer, setIsFeePayer] = useState(false);
    const [dateError, setDateError] = useState<string | null>(null);

    // Submit State
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [showReplaceWarning, setShowReplaceWarning] = useState(false);
    const [existingFeePayerId, setExistingFeePayerId] = useState<string | null>(null);

    // Debounce search
    useEffect(() => {
        if (!isOpen) return;

        const delayDebounceFn = setTimeout(() => {
            if (searchQuery.trim().length >= 2) {
                performSearch(searchQuery);
            } else {
                setSearchResults([]);
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchQuery, isOpen]);

    // Reset state when opened/closed
    useEffect(() => {
        if (isOpen) {
            setStep(1);
            setSearchQuery('');
            setSearchResults([]);
            setSelectedPerson(null);
            setShowCreateForm(false);

            setRoleType('');
            setEffectiveFrom(getLocalDateStr());
            setIsFeePayer(false);
            setDateError(null);

            setSubmitError(null);
            setShowReplaceWarning(false);
            setExistingFeePayerId(null);
        }
    }, [isOpen]);

    const performSearch = async (query: string) => {
        setIsSearching(true);
        try {
            const { data, error } = await supabase
                .from('people')
                .select('*')
                .or(`full_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
                .limit(10);

            if (error) throw error;
            setSearchResults(data || []);
        } catch (error) {
            console.error('Search error:', error);
        } finally {
            setIsSearching(false);
        }
    };

    const handlePersonCreated = (person: Person) => {
        setSelectedPerson(person);
        setShowCreateForm(false);
        setStep(2);
    };

    const validateAndNext = () => {
        if (selectedPerson) {
            setStep(2);
        }
    };

    const handleFinalSubmit = async () => {
        setSubmitError(null);
        setDateError(null);

        // Date validation
        if (effectiveFrom > getLocalDateStr()) {
            setDateError('תאריך התחלה לא יכול להיות בעתיד');
            return;
        }

        if (!roleType) {
            setSubmitError('יש לבחור תפקיד');
            return;
        }

        setIsSubmitting(true);

        try {
            // Check fee payer conflict if needed
            if (isFeePayer && !showReplaceWarning) {
                const { data: existingRoles, error: cError } = await supabase
                    .from('unit_roles')
                    .select('id')
                    .eq('unit_id', unitId)
                    .is('effective_to', null)
                    .eq('is_fee_payer', true);

                if (cError) throw cError;

                if (existingRoles && existingRoles.length > 0) {
                    setExistingFeePayerId(existingRoles[0].id);
                    setShowReplaceWarning(true);
                    setIsSubmitting(false);
                    return; // Stop and wait for user confirmation
                }
            }

            // Proceed with submission
            if (showReplaceWarning && existingFeePayerId) {
                const { error: patchError } = await supabase
                    .from('unit_roles')
                    .update({ is_fee_payer: false })
                    .eq('id', existingFeePayerId);

                if (patchError) throw patchError;
            }

            const { error: insertError } = await supabase
                .from('unit_roles')
                .insert({
                    unit_id: unitId,
                    person_id: selectedPerson!.id,
                    role_type: roleType,
                    effective_from: effectiveFrom,
                    effective_to: null,
                    is_fee_payer: isFeePayer,
                    tenant_id: '00000000-0000-0000-0000-000000000000'
                });

            if (insertError) throw insertError;

            // Success!
            onSuccess();
        } catch (error: any) {
            console.error('Submit role error:', error);
            setSubmitError('אירעה שגיאה, נסה שוב');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
            <div className="bg-white w-full max-w-lg rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">

                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-100">
                    <h2 className="text-2xl font-bold text-apro-navy">שיוך דייר ליחידה</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Step Indicator */}
                    <div className="flex items-center justify-center gap-4 mb-8 text-sm font-bold">
                        <div className={`flex items-center gap-2 ${step >= 1 ? 'text-apro-green' : 'text-gray-400'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${step >= 1 ? 'bg-apro-green' : 'bg-gray-300'}`}>1</div>
                            <span>בחירת אדם</span>
                        </div>
                        <div className="w-8 h-px bg-gray-200"></div>
                        <div className={`flex items-center gap-2 ${step >= 2 ? 'text-apro-green' : 'text-gray-400'}`}>
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs text-white ${step >= 2 ? 'bg-apro-green' : 'bg-gray-300'}`}>2</div>
                            <span>פרטי תפקיד</span>
                        </div>
                    </div>

                    {step === 1 && (
                        <div className="space-y-6">
                            {/* Search Input */}
                            <div>
                                <div className="relative">
                                    <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="חפש לפי שם, אימייל או טלפון..."
                                        value={searchQuery}
                                        onChange={(e) => {
                                            setSearchQuery(e.target.value);
                                            setSelectedPerson(null);
                                        }}
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pr-12 pl-4 focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all"
                                    />
                                    {isSearching && (
                                        <Loader2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                                    )}
                                </div>
                            </div>

                            {/* Search Results */}
                            {searchQuery.trim().length >= 2 && !showCreateForm && (
                                <div className="bg-white border border-gray-100 rounded-xl overflow-hidden shadow-sm">
                                    {searchResults.length > 0 ? (
                                        <div className="max-h-60 overflow-y-auto">
                                            {searchResults.map(person => (
                                                <button
                                                    key={person.id}
                                                    onClick={() => setSelectedPerson(person)}
                                                    className={`w-full text-right p-4 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors flex items-center justify-between ${selectedPerson?.id === person.id ? 'bg-green-50/50 border-l-4 border-l-apro-green' : ''}`}
                                                >
                                                    <div>
                                                        <div className="font-bold text-gray-900">{person.full_name}</div>
                                                        <div className="text-sm text-gray-500 mt-1 flex gap-3">
                                                            <span>{person.email}</span>
                                                            {person.phone && <span>• {person.phone}</span>}
                                                        </div>
                                                    </div>
                                                    {selectedPerson?.id === person.id && (
                                                        <Check className="w-5 h-5 text-apro-green" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-6 text-center text-gray-500">
                                            <p>לא נמצאו תוצאות</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Always visible Create Button */}
                            {!showCreateForm && (
                                <div className="flex justify-center mt-2">
                                    <button
                                        onClick={() => setShowCreateForm(true)}
                                        className="inline-flex items-center gap-2 px-6 py-3 bg-gray-50 text-apro-green font-bold hover:bg-gray-100 rounded-xl transition-colors border border-gray-200 shadow-sm"
                                    >
                                        <Plus className="w-5 h-5" />
                                        צור אדם חדש
                                    </button>
                                </div>
                            )}

                            {/* Create Form */}
                            {showCreateForm && (
                                <CreatePersonForm
                                    onSuccess={handlePersonCreated}
                                    onCancel={() => setShowCreateForm(false)}
                                />
                            )}
                        </div>
                    )}

                    {step === 2 && selectedPerson && (
                        <div className="space-y-6">
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 flex items-center justify-between">
                                <span className="font-semibold text-blue-900">משייך: {selectedPerson.full_name}</span>
                                <button onClick={() => setStep(1)} className="text-sm font-bold text-blue-600 hover:text-blue-800">שנה אדם</button>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-3">תפקיד *</label>
                                <div className="grid grid-cols-3 gap-3">
                                    {['owner', 'tenant', 'guarantor'].map((role) => (
                                        <button
                                            key={role}
                                            onClick={() => setRoleType(role)}
                                            className={`py-3 px-2 text-center rounded-xl border-2 font-bold transition-all ${roleType === role ? 'border-apro-green bg-green-50/30 text-apro-green' : 'border-gray-100 bg-white text-gray-600 hover:border-gray-200 hover:bg-gray-50'}`}
                                        >
                                            {role === 'owner' ? 'בעלים' : role === 'tenant' ? 'דייר' : 'ערב'}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-600 mb-2">תאריך התחלה *</label>
                                <input
                                    type="date"
                                    value={effectiveFrom}
                                    onChange={(e) => {
                                        setEffectiveFrom(e.target.value);
                                        setDateError(null);
                                    }}
                                    className={`w-full bg-white border rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-apro-green/50 transition-all ${dateError ? 'border-red-300 ring-2 ring-red-100' : 'border-gray-200'}`}
                                />
                                {dateError && (
                                    <p className="text-red-500 text-sm font-bold mt-2">{dateError}</p>
                                )}
                            </div>

                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <div className="relative flex items-center justify-center">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={isFeePayer}
                                            onChange={(e) => {
                                                setIsFeePayer(e.target.checked);
                                                setShowReplaceWarning(false);
                                            }}
                                        />
                                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:right-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-apro-green peer-checked:after:-translate-x-full"></div>
                                    </div>
                                    <span className="font-bold text-gray-700">משלם דמי ניהול</span>
                                </label>

                                {showReplaceWarning && (
                                    <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg text-orange-800">
                                        <div className="flex gap-2">
                                            <AlertTriangle className="w-5 h-5 shrink-0 text-orange-600" />
                                            <div>
                                                <p className="font-bold mb-3">קיים כבר משלם דמי ניהול פעיל ביחידה זו. האם להחליף?</p>
                                                <div className="flex gap-3">
                                                    <button
                                                        onClick={() => handleFinalSubmit()}
                                                        disabled={isSubmitting}
                                                        className="px-4 py-1.5 bg-orange-600 text-white font-bold rounded-lg hover:bg-orange-700 transition-colors flex items-center gap-2"
                                                    >
                                                        {isSubmitting && <Loader2 className="w-3 h-3 animate-spin" />}
                                                        כן, החלף
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setIsFeePayer(false);
                                                            setShowReplaceWarning(false);
                                                        }}
                                                        disabled={isSubmitting}
                                                        className="px-4 py-1.5 bg-white text-orange-700 font-bold rounded-lg border border-orange-200 hover:bg-orange-100 transition-colors"
                                                    >
                                                        לא
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {submitError && (
                                <div className="text-red-500 text-sm font-bold text-center bg-red-50 p-3 rounded-lg">
                                    {submitError}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between rounded-b-3xl">
                    <button
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 font-bold text-gray-500 hover:text-gray-800 transition-colors"
                    >
                        ביטול
                    </button>

                    {step === 1 ? (
                        <button
                            onClick={validateAndNext}
                            disabled={!selectedPerson}
                            className={`px-8 py-2.5 font-bold rounded-xl transition-all shadow-sm ${selectedPerson ? 'bg-apro-navy text-white hover:bg-slate-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                        >
                            הבא
                        </button>
                    ) : (
                        <button
                            onClick={() => !showReplaceWarning && handleFinalSubmit()}
                            disabled={!roleType || showReplaceWarning || isSubmitting}
                            className={`px-8 py-2.5 font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm ${(!roleType || showReplaceWarning || isSubmitting) ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-apro-green text-white hover:bg-emerald-600 shadow-apro-green/20'}`}
                        >
                            {isSubmitting && !showReplaceWarning && <Loader2 className="w-4 h-4 animate-spin" />}
                            שייך
                        </button>
                    )}
                </div>

            </div>
        </div>
    );
}
