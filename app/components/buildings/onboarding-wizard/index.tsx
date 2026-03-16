'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useWizardState } from './useWizardState';
import { StepIndicator } from './StepIndicator';
import { Step1BuildingDetails } from './Step1BuildingDetails';
import { Step2UnitsPeople } from './Step2UnitsPeople';
import { Step3Payments } from './Step3Payments';
import { ConflictResolutionModal, ConflictResolution } from './ConflictResolutionModal';
import { useRouter } from 'next/navigation';
import { WizardUnitUI } from '@/app/lib/wizard/wizardTypes';
import { PhoneConflict } from '@/app/api/v1/buildings/onboard/route';
import { PHONE_REGEX } from '@/app/lib/wizard/validation';

interface OnboardingWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

/** Transform UI units (split names) → API payload units (full_name) */
function buildApiUnits(units: WizardUnitUI[]) {
    return units.map((unit) => {
        const buildPerson = (p: WizardUnitUI['owner'] | WizardUnitUI['tenant']) => {
            if (!p) return undefined;
            const full_name = [p.first_name, p.last_name].filter(Boolean).join(' ');
            // Both name and phone are required by the API schema.
            // If either is missing, treat the person as not entered.
            if (!full_name || !p.phone) return undefined;
            return { full_name, phone: p.phone, existing_id: p.existing_id };
        };

        return {
            unit_number: unit.unit_number,
            floor: unit.floor,
            fee_payer: unit.fee_payer,
            monthly_amount_agorot: unit.monthly_amount_agorot,
            billing_day: unit.billing_day,
            owner: buildPerson(unit.owner),
            tenant: buildPerson(unit.tenant),
        };
    });
}

export default function OnboardingWizardModal({ isOpen, onClose }: OnboardingWizardModalProps) {
    const router = useRouter();
    const wizard = useWizardState();
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [conflicts, setConflicts] = useState<PhoneConflict[]>([]);
    const [showStep2Errors, setShowStep2Errors] = useState(false);

    const handleNextClick = () => {
        if (wizard.currentStep === 2 && !isStepValid(wizard)) {
            setShowStep2Errors(true);
            return;
        }
        setShowStep2Errors(false);
        wizard.nextStep();
    };

    if (!isOpen) return null;

    const handleCloseClick = () => {
        if (wizard.isSubmitting) return;
        if (wizard.currentStep > 1) {
            setShowExitConfirm(true);
        } else {
            handleForceClose();
        }
    };

    const handleForceClose = () => {
        wizard.resetWizard();
        setShowExitConfirm(false);
        setConflicts([]);
        onClose();
    };

    /**
     * Core submit function — accepts the units to submit explicitly.
     * This avoids stale-closure bugs when called after state updates
     * (e.g. after conflict resolution injects existing_ids).
     */
    const submitWithUnits = async (unitsToSubmit: WizardUnitUI[]) => {
        wizard.setIsSubmitting(true);
        wizard.setError(null);

        try {
            const payload = {
                building: wizard.building,
                units: buildApiUnits(unitsToSubmit),
            };

            const res = await fetch('/api/v1/buildings/onboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 409 && data.error === 'PHONE_CONFLICT') {
                    setConflicts(data.conflicts);
                    return;
                }
                throw new Error(data.error?.message || data.error || 'Failed to create building');
            }

            handleForceClose();
            if (data.data?.building_id) {
                router.push(`/dashboard/buildings/${data.data.building_id}`);
            }
        } catch (e: any) {
            console.error('Submit error:', e);
            wizard.setError('אירעה שגיאה ביצירת הבניין. לא נשמר שום מידע. אנא נסה שנית.');
        } finally {
            wizard.setIsSubmitting(false);
        }
    };

    const handleFinalSubmit = () => submitWithUnits(wizard.units);

    const handleConflictResolve = (resolutions: Record<string, ConflictResolution>) => {
        // Capture before any state updates — React batches state, but be explicit
        const currentConflicts = conflicts;
        const hasChangeDetails = Object.values(resolutions).some(r => r === 'change_details');

        setConflicts([]);

        if (hasChangeDetails) {
            // Manager needs to fix data — close modal and let them edit
            return;
        }

        // Build the updated units synchronously from the current wizard.units snapshot.
        // We pass units directly to submitWithUnits to avoid stale closure on state.

        const applyConflict = (
            person: WizardUnitUI['owner'],
            conflict: PhoneConflict
        ): WizardUnitUI['owner'] => {
            if (!person || person.phone !== conflict.phone) return person;
            const [first_name, ...rest] = conflict.existing_name.split(' ');
            const last_name = rest.join(' ');
            return { ...person, existing_id: conflict.existing_id, first_name, last_name };
        };

        const updatedUnits = wizard.units.map(unit => {
            let updatedUnit = { ...unit };
            for (const conflict of currentConflicts) {
                if (resolutions[conflict.phone] === 'use_existing') {
                    if (updatedUnit.owner?.phone === conflict.phone) {
                        updatedUnit = { ...updatedUnit, owner: applyConflict(updatedUnit.owner, conflict) };
                    }
                    if (updatedUnit.tenant?.phone === conflict.phone) {
                        updatedUnit = { ...updatedUnit, tenant: applyConflict(updatedUnit.tenant, conflict) };
                    }
                }
            }
            return updatedUnit;
        });

        // Update wizard state for UI consistency (so the table reflects resolved names)
        wizard.setUnits(updatedUnits);

        // Submit directly with the computed units — no setTimeout, no state read
        submitWithUnits(updatedUnits);
    };

    const handleConflictCancel = () => {
        setConflicts([]);
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" dir="rtl">
                <div className="bg-white w-[85vw] max-w-[1100px] h-[90vh] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">

                    {/* Header */}
                    <div className="flex justify-between items-center p-6 border-b border-gray-100 shrink-0">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={handleCloseClick}
                                disabled={wizard.isSubmitting}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors relative z-10"
                            >
                                <X className="w-5 h-5 text-gray-500" />
                            </button>
                            {showExitConfirm && (
                                <div className="flex items-center gap-3 bg-red-50 text-red-700 px-4 py-1.5 rounded-lg border border-red-100">
                                    <span className="font-bold text-sm">לצאת? הנתונים שהזנת לא יישמרו</span>
                                    <button
                                        onClick={() => setShowExitConfirm(false)}
                                        className="px-3 py-1 bg-white border border-red-200 rounded hover:bg-red-50 text-xs font-bold"
                                    >
                                        בטל
                                    </button>
                                    <button
                                        onClick={handleForceClose}
                                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-bold"
                                    >
                                        צא בלי לשמור
                                    </button>
                                </div>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-apro-navy">הוסף בניין חדש</h2>
                    </div>

                    {/* Scrollable Body */}
                    <div className={`flex-1 flex flex-col p-6 md:p-8 bg-gray-50/30 ${wizard.currentStep === 2 ? 'overflow-hidden' : 'overflow-y-auto'}`}>
                        <div className="shrink-0">
                            <StepIndicator currentStep={wizard.currentStep} />
                        </div>

                        <div className="max-w-4xl mx-auto flex flex-col flex-1 min-h-0 w-full">
                            {wizard.error && (
                                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-center font-bold">
                                    {wizard.error}
                                </div>
                            )}

                            <div className={`flex flex-col flex-1 min-h-0 w-full ${wizard.isSubmitting ? 'opacity-50 pointer-events-none' : ''}`}>
                                {wizard.currentStep === 1 && <Step1BuildingDetails wizard={wizard} />}
                                {wizard.currentStep === 2 && <Step2UnitsPeople wizard={wizard} showErrors={showStep2Errors} />}
                                {wizard.currentStep === 3 && <Step3Payments wizard={wizard} />}
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-gray-100 bg-white flex items-center justify-between shrink-0">
                        <button
                            onClick={wizard.prevStep}
                            disabled={wizard.currentStep === 1 || wizard.isSubmitting}
                            className={`px-8 py-3 font-bold rounded-xl transition-all ${wizard.currentStep === 1 || wizard.isSubmitting ? 'text-gray-400 cursor-not-allowed bg-transparent' : 'text-gray-600 hover:bg-gray-100 border border-gray-200'}`}
                        >
                            הקודם
                        </button>

                        {wizard.currentStep < 3 ? (
                            <button
                                onClick={handleNextClick}
                                disabled={wizard.isSubmitting || (wizard.currentStep === 1 && !isStepValid(wizard))}
                                className={`px-10 py-3 font-bold rounded-xl transition-all shadow-sm ${(!wizard.isSubmitting && (wizard.currentStep !== 1 || isStepValid(wizard))) ? 'bg-apro-navy text-white hover:bg-slate-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
                            >
                                הבא
                            </button>
                        ) : (
                            <button
                                onClick={handleFinalSubmit}
                                disabled={wizard.isSubmitting}
                                className={`px-10 py-3 font-bold rounded-xl transition-all shadow-sm flex items-center gap-2 ${wizard.isSubmitting ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-apro-green text-white hover:bg-emerald-600 shadow-apro-green/20'}`}
                            >
                                {wizard.isSubmitting ? 'יוצר בניין...' : 'צור בניין'}
                            </button>
                        )}
                    </div>

                    {/* Loading Overlay */}
                    {wizard.isSubmitting && (
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-900/80 text-white px-6 py-2 rounded-full font-bold shadow-lg backdrop-blur text-sm z-50">
                            יוצר בניין, אנא המתן...
                        </div>
                    )}
                </div>
            </div>

            {/* Conflict Resolution Modal — rendered above wizard */}
            {conflicts.length > 0 && (
                <ConflictResolutionModal
                    conflicts={conflicts}
                    onResolve={handleConflictResolve}
                    onCancel={handleConflictCancel}
                />
            )}
        </>
    );
}

function isStepValid(wizard: ReturnType<typeof useWizardState>): boolean {
    if (wizard.currentStep === 1) {
        const b = wizard.building;
        return !!(
            b.name.trim() &&
            b.street.trim() &&
            b.street_number.trim() &&
            b.city.trim() &&
            wizard.numUnits &&
            wizard.numUnits >= 1
        );
    }

    if (wizard.currentStep === 2) {
        // Validate phone format
        for (const unit of wizard.units) {
            if (unit.owner?.phone && !PHONE_REGEX.test(unit.owner.phone)) return false;
            if (unit.tenant?.phone && !PHONE_REGEX.test(unit.tenant.phone)) return false;
        }

        // Block only if same phone appears with DIFFERENT names.
        // Same phone + same name = same person in multiple units = allowed.
        const phoneNameMap = new Map<string, string>();
        for (const unit of wizard.units) {
            for (const role of ['owner', 'tenant'] as const) {
                const person = unit[role];
                if (!person?.phone) continue;
                const fullName = [person.first_name, person.last_name]
                    .filter(Boolean).join(' ').trim().toLowerCase();
                if (phoneNameMap.has(person.phone)) {
                    if (phoneNameMap.get(person.phone) !== fullName) return false;
                } else {
                    phoneNameMap.set(person.phone, fullName);
                }
            }
        }

        return true;
    }

    return true;
}
