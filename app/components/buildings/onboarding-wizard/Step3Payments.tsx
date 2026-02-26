'use client';
import { useState } from 'react';
import { useWizardState } from './useWizardState';

export function Step3Payments({ wizard }: { wizard: ReturnType<typeof useWizardState> }) {
    const [bulkAmount, setBulkAmount] = useState<string>('');

    const applyBulkAmount = () => {
        const amount = parseInt(bulkAmount, 10);
        if (!isNaN(amount) && amount > 0) {
            // Input is ILS, convert to agorot
            const agorot = amount * 100;
            wizard.units.forEach((_, index) => {
                wizard.updateUnit(index, { monthly_amount_agorot: agorot });
            });
            setBulkAmount('');
        }
    };

    const handleUnitAmountChange = (index: number, val: string) => {
        if (val === '') {
            wizard.updateUnit(index, { monthly_amount_agorot: undefined });
            return;
        }
        const amount = parseInt(val, 10);
        if (!isNaN(amount)) {
            wizard.updateUnit(index, { monthly_amount_agorot: amount * 100 });
        }
    };

    const unitsWithoutPayment = wizard.units.filter(u => !u.monthly_amount_agorot);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-apro-navy">תשלומי ועד</h3>
                <p className="text-sm text-gray-500 mt-1">קבע את סכום דמי הניהול החודשי לכל דירה.</p>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">קבע סכום אחיד לכל הדירות (₪)</label>
                    <div className="relative">
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₪</span>
                        <input
                            type="number"
                            min="1"
                            value={bulkAmount}
                            onChange={(e) => setBulkAmount(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all"
                            placeholder="0"
                        />
                    </div>
                </div>
                <button
                    onClick={applyBulkAmount}
                    disabled={!bulkAmount || parseInt(bulkAmount, 10) <= 0}
                    className="w-full md:w-auto px-6 py-3 bg-apro-navy text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                    החל על כל הדירות
                </button>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mt-6">
                <table className="w-full text-right" dir="rtl">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="py-3 px-6 font-bold text-gray-500 text-sm">דירה</th>
                            <th className="py-3 px-6 font-bold text-gray-500 text-sm">משלם</th>
                            <th className="py-3 px-6 font-bold text-gray-500 text-sm w-[200px]">סכום חודשי (₪)</th>
                            <th className="py-3 px-4 w-16"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 tracking-wide font-medium text-gray-800">
                        {wizard.units.map((unit, index) => (
                            <tr key={index} className="hover:bg-gray-50/50 transition-colors">
                                <td className="py-3 px-6 text-apro-navy font-bold">{unit.unit_number}</td>
                                <td className="py-3 px-6">
                                    <select
                                        className="w-full bg-white border border-gray-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-apro-green transition-all"
                                        value={unit.fee_payer}
                                        onChange={(e) => wizard.updateUnit(index, { fee_payer: e.target.value as 'none' | 'owner' | 'tenant' })}
                                    >
                                        <option value="owner">בעל הנכס</option>
                                        <option value="tenant">דייר</option>
                                        <option value="none">לא מוגדר</option>
                                    </select>
                                </td>
                                <td className="py-3 px-6">
                                    <div className="relative">
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₪</span>
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-full bg-white border border-gray-200 rounded-lg py-2 pr-9 pl-3 focus:outline-none focus:ring-1 focus:ring-apro-green transition-all"
                                            value={unit.monthly_amount_agorot ? unit.monthly_amount_agorot / 100 : ''}
                                            placeholder="הזן סכום"
                                            onChange={(e) => handleUnitAmountChange(index, e.target.value)}
                                        />
                                    </div>
                                </td>
                                <td className="py-3 px-4 text-center">
                                    <button
                                        onClick={() => wizard.updateUnit(index, { monthly_amount_agorot: undefined })}
                                        className="text-xs text-red-500 hover:text-red-700 font-bold"
                                        title="נקה סכום"
                                    >
                                        נקה
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {wizard.units.length === 0 && (
                            <tr>
                                <td colSpan={4} className="py-8 text-center text-gray-400 font-bold">לא הוגדרו דירות.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {unitsWithoutPayment.length > 0 && wizard.units.length > 0 && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl flex items-center gap-3 mt-6">
                    <span className="text-xl">⚠️</span>
                    <span className="font-bold text-sm">
                        {unitsWithoutPayment.length} דירות ללא הגדרת תשלום. ניתן להגדיר לאחר יצירת הבניין.
                    </span>
                </div>
            )}
        </div>
    );
}
