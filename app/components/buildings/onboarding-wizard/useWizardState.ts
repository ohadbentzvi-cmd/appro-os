import { useState } from 'react';
import { WizardUnitUI } from '@/app/lib/wizard/wizardTypes';
import { BuildingOnboardPayload } from '@/lib/api/schemas/buildingOnboard';

export type WizardBuilding = BuildingOnboardPayload['building'];

const initialBuildingState: WizardBuilding = {
    name: '',
    street: '',
    street_number: '',
    city: '',
};

function makeEmptyUnit(unitNumber: string): WizardUnitUI {
    return { unit_number: unitNumber, fee_payer: 'none' };
}

export function useWizardState() {
    const [currentStep, setCurrentStep] = useState(1);
    const [building, setBuilding] = useState<WizardBuilding>(initialBuildingState);
    const [numUnits, setNumUnits] = useState<number | undefined>(undefined);
    const [units, setUnits] = useState<WizardUnitUI[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const setNumUnitsAndRegenerate = (n: number) => {
        setNumUnits(n);
        setUnits((prev) => {
            const result: WizardUnitUI[] = [];
            for (let i = 1; i <= n; i++) {
                const unitNumber = String(i);
                const existing = prev.find(u => u.unit_number === unitNumber);
                result.push(existing ?? makeEmptyUnit(unitNumber));
            }
            return result;
        });
    };

    const updateUnit = (index: number, updates: Partial<WizardUnitUI>) => {
        setUnits((prev) => {
            const draft = [...prev];
            const unit = { ...draft[index], ...updates };

            // Auto fee_payer: only recalculate when owner/tenant data changes
            if ('owner' in updates || 'tenant' in updates) {
                const hasTenant = !!(unit.tenant?.first_name || unit.tenant?.phone);
                const hasOwner = !!(unit.owner?.first_name || unit.owner?.phone);
                if (hasTenant) {
                    unit.fee_payer = 'tenant';
                } else if (hasOwner) {
                    unit.fee_payer = 'owner';
                } else {
                    unit.fee_payer = 'none';
                }
            }

            draft[index] = unit;
            return draft;
        });
    };

    const applyExcelUnits = (parsed: WizardUnitUI[]) => {
        setUnits((prev) => {
            return prev.map((existing) => {
                const fromExcel = parsed.find(p => p.unit_number === existing.unit_number);
                return fromExcel ?? existing;
            });
        });
    };

    const resetWizard = () => {
        setCurrentStep(1);
        setBuilding(initialBuildingState);
        setNumUnits(undefined);
        setUnits([]);
        setIsSubmitting(false);
        setError(null);
    };

    return {
        currentStep,
        setCurrentStep,
        nextStep,
        prevStep,
        building,
        setBuilding,
        numUnits,
        setNumUnitsAndRegenerate,
        units,
        setUnits,
        updateUnit,
        applyExcelUnits,
        isSubmitting,
        setIsSubmitting,
        error,
        setError,
        resetWizard,
    };
}
