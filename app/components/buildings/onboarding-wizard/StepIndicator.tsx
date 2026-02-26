'use client';
import { Check } from 'lucide-react';

interface StepIndicatorProps {
    currentStep: number;
}

const steps = [
    'פרטי בניין',
    'דירות ודיירים',
    'תשלומים',
];

export function StepIndicator({ currentStep }: StepIndicatorProps) {
    return (
        <div className="flex items-center justify-center space-x-reverse space-x-2 md:space-x-4 mb-8">
            {steps.map((label, index) => {
                const stepNum = index + 1;
                const isActive = currentStep === stepNum;
                const isCompleted = currentStep > stepNum;

                return (
                    <div key={label} className="flex items-center gap-2">
                        <div className={`
              flex items-center justify-center w-8 h-8 rounded-full border-2 text-sm font-semibold
              ${isActive ? 'border-primary text-primary bg-primary/10' : ''}
              ${isCompleted ? 'border-primary bg-primary text-primary-foreground' : ''}
              ${!isActive && !isCompleted ? 'border-muted-foreground text-muted-foreground' : ''}
            `}>
                            {isCompleted ? <Check className="w-4 h-4" /> : stepNum}
                        </div>
                        <span className={`text-sm font-medium hidden md:inline-block ${isActive || isCompleted ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {label}
                        </span>
                        {index < steps.length - 1 && (
                            <div className="w-8 md:w-16 h-[2px] bg-border mx-2" />
                        )}
                    </div>
                );
            })}
        </div>
    );
}
