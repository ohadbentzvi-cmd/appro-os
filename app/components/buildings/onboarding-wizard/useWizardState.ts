import { useState } from 'react';
import { WizardUnit, BuildingOnboardPayload } from '@/lib/api/schemas/buildingOnboard';
import { ParsedUnit } from '../../../lib/wizard/parseClipboardToUnits';

export type WizardState = BuildingOnboardPayload;

const initialBuildingState = {
    name: '',
    street: '',
    street_number: '',
    city: '',
};

export function useWizardState() {
    const [currentStep, setCurrentStep] = useState(1);
    const [building, setBuilding] = useState<WizardState['building']>(initialBuildingState);
    const [units, setUnits] = useState<WizardUnit[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 3));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const addUnit = (unit: WizardUnit) => {
        setUnits((prev) => [...prev, unit]);
    };

    const updateUnit = (index: number, updates: Partial<WizardUnit>) => {
        setUnits((prev) => {
            const draft = [...prev];
            const unit = { ...draft[index], ...updates };

            if ('owner' in updates || 'tenant' in updates) {
                if (unit.tenant?.full_name) {
                    unit.fee_payer = 'tenant';
                } else if (unit.owner?.full_name) {
                    unit.fee_payer = 'owner';
                } else {
                    unit.fee_payer = 'none';
                }
            }

            draft[index] = unit;
            return draft;
        });
    };

    const removeUnit = (index: number) => {
        setUnits((prev) => {
            const draft = [...prev];
            draft.splice(index, 1);
            return draft;
        });
    };

    const applyPastedUnits = (pasted: ParsedUnit[]) => {
        const newUnits: WizardUnit[] = pasted.map((p) => {
            let fee_payer: 'none' | 'owner' | 'tenant' = 'none';
            if (p.owner && !p.tenant) fee_payer = 'owner';
            else if (!p.owner && p.tenant) fee_payer = 'tenant';
            else if (p.owner && p.tenant) fee_payer = 'tenant';

            return {
                unit_number: p.unit_number,
                floor: p.floor,
                owner: p.owner,
                tenant: p.tenant,
                fee_payer,
            };
        });
        setUnits(newUnits);
    };

    const resetWizard = () => {
        setCurrentStep(1);
        setBuilding(initialBuildingState);
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
        units,
        setUnits,
        addUnit,
        updateUnit,
        removeUnit,
        applyPastedUnits,
        isSubmitting,
        setIsSubmitting,
        error,
        setError,
        resetWizard,
    };
}
