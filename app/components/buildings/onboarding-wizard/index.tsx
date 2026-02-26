'use client';

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useWizardState } from './useWizardState';
import { StepIndicator } from './StepIndicator';
import { Step1BuildingDetails } from './Step1BuildingDetails';
import { Step2Units } from './Step2Units';
import { Step3People } from './Step3People';
import { Step4Payments } from './Step4Payments';
import { useRouter } from 'next/navigation';

interface OnboardingWizardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function OnboardingWizardModal({ isOpen, onClose }: OnboardingWizardModalProps) {
    const router = useRouter();
    const wizard = useWizardState();
    const [showExitConfirm, setShowExitConfirm] = useState(false);

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
        onClose();
    };

    const handleFinalSubmit = async () => {
        wizard.setIsSubmitting(true);
        wizard.setError(null);

        try {
            const payload = {
                building: wizard.building,
                units: wizard.units,
            };

            const res = await fetch('/api/v1/buildings/onboard', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error?.message || data.error || 'Failed to create building');
            }

            // Success
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

    return (
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
                <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-gray-50/30">
                    <StepIndicator currentStep={wizard.currentStep} />

                    <div className="max-w-4xl mx-auto">
                        {wizard.error && (
                            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-center font-bold">
                                {wizard.error}
                            </div>
                        )}

                        <div className={wizard.isSubmitting ? 'opacity-50 pointer-events-none' : ''}>
                            {wizard.currentStep === 1 && <Step1BuildingDetails wizard={wizard} />}
                            {wizard.currentStep === 2 && <Step2Units wizard={wizard} />}
                            {wizard.currentStep === 3 && <Step3People wizard={wizard} />}
                            {wizard.currentStep === 4 && <Step4Payments wizard={wizard} />}
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

                    {wizard.currentStep < 4 ? (
                        <button
                            onClick={wizard.nextStep}
                            disabled={!isStepValid(wizard) || wizard.isSubmitting}
                            className={`px-10 py-3 font-bold rounded-xl transition-all shadow-sm ${isStepValid(wizard) && !wizard.isSubmitting ? 'bg-apro-navy text-white hover:bg-slate-800' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
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
    );
}

// Simple validation logic for enabling "Next"
function isStepValid(wizard: any) {
    if (wizard.currentStep === 1) {
        const b = wizard.building;
        return b.name.trim() && b.street.trim() && b.street_number.trim() && b.city.trim();
    }
    if (wizard.currentStep === 2) {
        if (wizard.units.length === 0) return false;
        // Check for empty unit numbers
        if (wizard.units.some((u: any) => !u.unit_number || u.unit_number.trim() === '')) return false;
        // Check for duplicate unit numbers
        const numbers = wizard.units.map((u: any) => u.unit_number.trim().toLowerCase());
        return new Set(numbers).size === numbers.length;
    }
    if (wizard.currentStep === 3) {
        const phoneRegex = /^(05\d{8}|0[23489]\d{7})$/;
        for (const unit of wizard.units) {
            if (unit.owner?.phone && !unit.owner.phone.match(phoneRegex)) return false;
            if (unit.tenant?.phone && !unit.tenant.phone.match(phoneRegex)) return false;
        }
        return true;
    }
    return true; // Step 4 has no hard blockers
}
