'use client';
import { useState, useCallback } from 'react';
import { Trash2, Plus, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useWizardState } from './useWizardState';
import { parseClipboardToUnits } from '../../../lib/wizard/parseClipboardToUnits';

export function Step2UnitsPeople({ wizard }: { wizard: ReturnType<typeof useWizardState> }) {
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

    const [pasteError, setPasteError] = useState<string | null>(null);
    const [pasteSuccess, setPasteSuccess] = useState<string | null>(null);

    const handlePaste = useCallback((e: React.ClipboardEvent) => {
        const text = e.clipboardData.getData('text/plain');
        if (!text) return;

        // Block if inside an input to allow normal copying and pasting of cell values
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            return;
        }

        e.preventDefault();
        setPasteError(null);
        setPasteSuccess(null);

        const res = parseClipboardToUnits(text);
        if (!res.ok) {
            if (res.error === 'TOO_MANY_COLUMNS') {
                setPasteError('הנתונים שהדבקת מכילים יותר מ-6 עמודות. ודא שאתה מעתיק את הטווח הנכון ונסה שוב.');
            } else if (res.error === 'MISSING_UNIT_NUMBER') {
                setPasteError('אחת או יותר מהשורות חסרות מספר דירה בעמודה הראשונה. ודא שהעמודה הראשונה מכילה מספר דירה בכל שורה ונסה שוב.');
            } else {
                setPasteError('לא זוהו נתונים בהדבקה. נסה שוב.');
            }
            return;
        }

        wizard.applyPastedUnits(res.units);
        setPasteSuccess(`✓ ${res.units.length} דירות יובאו בהצלחה. ניתן לערוך את הנתונים לפני המשך.`);

        setTimeout(() => {
            setPasteSuccess(null);
        }, 4000);
    }, [wizard]);

    // Clear paste error if they start manually typing
    const onManualInteraction = () => {
        if (pasteError) setPasteError(null);
    };

    // Global duplicate checks for the active table
    const numbers = wizard.units.map(u => u.unit_number.trim().toLowerCase()).filter(n => n !== '');
    const hasDuplicates = new Set(numbers).size !== numbers.length;

    return (
        <div className="flex flex-col h-full gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-xl font-bold text-apro-navy">דירות ודיירים</h3>
                    <p className="text-sm text-gray-500 mt-1">הזן דירות ופרטי דיירים ובעלים, או הדבק אקסל ישירות לכאן.</p>
                </div>
                <div className="text-xs font-bold text-gray-400 bg-white border border-gray-200 px-3 py-1.5 rounded-full shrink-0">
                    סה״כ: {wizard.units.length} דירות
                </div>
            </div>

            {hasDuplicates && (
                <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl font-bold text-sm shrink-0">
                    שגיאה: יש מספרי דירות כפולים בטבלה. לא ניתן להמשיך.
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col" onPaste={handlePaste}>
                <div className="px-6 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-col gap-3 shrink-0">
                    <p className="text-xs text-gray-500 font-medium">
                        <span className="font-bold">טיפ:</span> ניתן להדביק טווח מאקסל ישירות לטבלה — עמודות לפי הסדר: מספר דירה, קומה, שם בעלים, טלפון בעלים, שם דייר, טלפון דייר
                    </p>

                    {pasteError && (
                        <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 text-sm font-bold rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-2">
                            <AlertCircle className="w-5 h-5 shrink-0" />
                            <p>{pasteError}</p>
                        </div>
                    )}

                    {pasteSuccess && (
                        <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 text-sm font-bold rounded-lg border border-green-100 animate-in fade-in slide-in-from-top-2">
                            <CheckCircle2 className="w-5 h-5 shrink-0" />
                            <p>{pasteSuccess}</p>
                        </div>
                    )}
                </div>

                <div className="overflow-auto flex-1 min-h-0">
                    <table className="w-full text-right relative" dir="rtl">
                        <thead className="bg-gray-50 border-b border-gray-100 whitespace-nowrap sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="py-3 px-4 font-bold text-gray-500 text-sm min-w-[120px]">מספר דירה *</th>
                                <th className="py-3 px-4 font-bold text-gray-500 text-sm min-w-[100px]">קומה</th>
                                <th className="py-3 px-4 font-bold text-gray-500 text-sm min-w-[200px]">שם בעלים</th>
                                <th className="py-3 px-4 font-bold text-gray-500 text-sm min-w-[160px]">טלפון בעלים</th>
                                <th className="py-3 px-4 font-bold text-gray-500 text-sm min-w-[200px]">שם דייר</th>
                                <th className="py-3 px-4 font-bold text-gray-500 text-sm min-w-[160px]">טלפון דייר</th>
                                <th className="py-3 px-4 font-bold text-gray-500 text-sm w-16"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {wizard.units.map((unit, index) => {
                                const otherUnits = wizard.units.filter((_, i) => i !== index);
                                const isDuplicate = unit.unit_number && otherUnits.some(u => u.unit_number.trim().toLowerCase() === unit.unit_number.trim().toLowerCase());

                                return (
                                    <tr key={index} className="hover:bg-gray-50/50 transition-colors group">
                                        <td className="py-2 px-4">
                                            <input
                                                type="text"
                                                className={`w-full bg-transparent border-0 focus:ring-0 p-2 font-semibold ${isDuplicate ? 'text-red-500 bg-red-50 rounded' : ''}`}
                                                value={unit.unit_number}
                                                placeholder="הזן מס' דירה"
                                                onClick={onManualInteraction}
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
                                        {/* Owner Info */}
                                        <td className="py-2 px-4">
                                            <input
                                                type="text"
                                                className="w-full bg-transparent border-0 focus:ring-0 p-2"
                                                value={unit.owner?.full_name || ''}
                                                placeholder="שם בעל הנכס"
                                                onChange={(e) => wizard.updateUnit(index, { owner: { ...unit.owner, full_name: e.target.value, phone: unit.owner?.phone || '' } })}
                                            />
                                        </td>
                                        <td className="py-2 px-4">
                                            <input
                                                type="tel"
                                                className="w-full bg-transparent border-0 focus:ring-0 p-2"
                                                value={unit.owner?.phone || ''}
                                                placeholder="טלפון בעלים"
                                                onChange={(e) => wizard.updateUnit(index, { owner: { ...unit.owner, full_name: unit.owner?.full_name || '', phone: e.target.value } })}
                                            />
                                        </td>
                                        {/* Tenant Info */}
                                        <td className="py-2 px-4">
                                            <input
                                                type="text"
                                                className="w-full bg-transparent border-0 focus:ring-0 p-2"
                                                value={unit.tenant?.full_name || ''}
                                                placeholder="שם הדייר"
                                                onChange={(e) => wizard.updateUnit(index, { tenant: { ...unit.tenant, full_name: e.target.value, phone: unit.tenant?.phone || '' } })}
                                            />
                                        </td>
                                        <td className="py-2 px-4">
                                            <input
                                                type="tel"
                                                className="w-full bg-transparent border-0 focus:ring-0 p-2"
                                                value={unit.tenant?.phone || ''}
                                                placeholder="טלפון דייר"
                                                onChange={(e) => wizard.updateUnit(index, { tenant: { ...unit.tenant, full_name: unit.tenant?.full_name || '', phone: e.target.value } })}
                                            />
                                        </td>
                                        <td className="py-2 px-4 text-center">
                                            <button
                                                onClick={() => wizard.removeUnit(index)}
                                                className="p-2 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
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

                <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-center shrink-0">
                    <button
                        onClick={handleAddRow}
                        className="flex items-center gap-2 text-sm font-bold text-apro-navy bg-white border border-gray-200 px-6 py-2.5 rounded-xl hover:bg-gray-100 hover:text-apro-navy transition-colors shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        הוסף שורה
                    </button>
                </div>
            </div>
        </div>
    );
}
