import { useState } from 'react';
import { WizardUnit, BuildingOnboardPayload } from '@/lib/api/schemas/buildingOnboard';

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

    const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 4));
    const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

    const addUnit = (unit: WizardUnit) => {
        setUnits((prev) => [...prev, unit]);
    };

    const updateUnit = (index: number, updates: Partial<WizardUnit>) => {
        setUnits((prev) => {
            const draft = [...prev];
            draft[index] = { ...draft[index], ...updates };
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
        isSubmitting,
        setIsSubmitting,
        error,
        setError,
        resetWizard,
    };
}
