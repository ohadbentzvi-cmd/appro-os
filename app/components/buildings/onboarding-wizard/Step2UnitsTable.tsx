'use client';
import { Trash2, Plus } from 'lucide-react';
import { useWizardState } from './useWizardState';

export function Step2UnitsTable({ wizard }: { wizard: ReturnType<typeof useWizardState> }) {
    const handleAddRow = () => {
        let nextNum = 1;
        const existingNumbers = wizard.units
            .map(u => parseInt(u.unit_number, 10))
            .filter(n => !isNaN(n));

        if (existingNumbers.length > 0) {
            nextNum = Math.max(...existingNumbers) + 1;
        }

        wizard.addUnit({
            unit_number: nextNum.toString(),
            fee_payer: 'none',
        });
    };

    return (
        <div className="flex flex-col h-full">
            <div className="overflow-x-auto">
                <table className="w-full text-right" dir="rtl">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="py-3 px-4 font-bold text-gray-500 text-sm">מספר דירה *</th>
                            <th className="py-3 px-4 font-bold text-gray-500 text-sm">קומה</th>
                            <th className="py-3 px-4 font-bold text-gray-500 text-sm">הערות</th>
                            <th className="py-3 px-4 font-bold text-gray-500 text-sm w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {wizard.units.map((unit, index) => {
                            // Check inline duplicate
                            const otherUnits = wizard.units.filter((_, i) => i !== index);
                            const isDuplicate = unit.unit_number && otherUnits.some(u => u.unit_number.trim().toLowerCase() === unit.unit_number.trim().toLowerCase());

                            return (
                                <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="py-2 px-4">
                                        <input
                                            type="text"
                                            className={`w-full bg-transparent border-0 focus:ring-0 p-2 font-semibold ${isDuplicate ? 'text-red-500 bg-red-50 rounded' : ''}`}
                                            value={unit.unit_number}
                                            placeholder="הזן מס' דירה"
                                            onChange={(e) => wizard.updateUnit(index, { unit_number: e.target.value })}
                                        />
                                    </td>
                                    <td className="py-2 px-4">
                                        <input
                                            type="number"
                                            className="w-full bg-transparent border-0 focus:ring-0 p-2"
                                            value={unit.floor ?? ''}
                                            placeholder="-"
                                            onChange={(e) => wizard.updateUnit(index, { floor: e.target.value ? parseInt(e.target.value, 10) : undefined })}
                                        />
                                    </td>
                                    <td className="py-2 px-4">
                                        <input
                                            type="text"
                                            className="w-full bg-transparent border-0 focus:ring-0 p-2"
                                            value={unit.notes || ''}
                                            placeholder="הערות..."
                                            onChange={(e) => wizard.updateUnit(index, { notes: e.target.value })}
                                        />
                                    </td>
                                    <td className="py-2 px-4 text-center">
                                        <button
                                            onClick={() => wizard.removeUnit(index)}
                                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="מחק דירה"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-center">
                <button
                    onClick={handleAddRow}
                    className="flex items-center gap-2 text-sm font-bold text-apro-navy bg-white border border-gray-200 px-4 py-2 rounded-xl hover:bg-gray-100 hover:text-apro-navy transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    הוסף דירה
                </button>
            </div>
        </div>
    );
}
