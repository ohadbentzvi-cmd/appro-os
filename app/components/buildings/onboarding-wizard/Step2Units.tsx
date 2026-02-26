'use client';
import { useWizardState } from './useWizardState';
import { Step2UnitsTable } from './Step2UnitsTable';

export function Step2Units({ wizard }: { wizard: ReturnType<typeof useWizardState> }) {
    // Check for duplicate unit numbers for inline error display
    const numbers = wizard.units.map(u => u.unit_number.trim().toLowerCase()).filter(n => n !== '');
    const hasDuplicates = new Set(numbers).size !== numbers.length;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h3 className="text-xl font-bold text-apro-navy">דירות בבניין</h3>
                    <p className="text-sm text-gray-500 mt-1">הזן את מספרי הדירות בבניין. ניתן להוסיף קומה והערות לכל דירה.</p>
                </div>
                <div className="text-xs font-bold text-gray-400 bg-white border border-gray-200 px-3 py-1.5 rounded-full">
                    סה״כ: {wizard.units.length} דירות
                </div>
            </div>

            {hasDuplicates && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl font-bold text-sm">
                    שגיאה: יש מספרי דירות כפולים בטבלה. לא ניתן להמשיך.
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <Step2UnitsTable wizard={wizard} />
            </div>
        </div>
    );
}
