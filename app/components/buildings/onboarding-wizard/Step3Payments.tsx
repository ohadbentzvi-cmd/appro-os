'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useWizardState } from './useWizardState';

const FEE_PAYER_OPTIONS = [
    { value: 'tenant', label: 'דייר' },
    { value: 'owner', label: 'בעל הנכס' },
    { value: 'none', label: 'ללא' },
] as const;

const BADGE_STYLES: Record<string, string> = {
    owner: 'bg-blue-50 text-blue-700 border-blue-100',
    tenant: 'bg-orange-50 text-orange-700 border-orange-100',
};

const FEE_PAYER_LABEL: Record<string, string> = {
    owner: 'בעל הנכס',
    tenant: 'דייר',
};

const HIGH_AMOUNT_THRESHOLD = 9999;

export function Step3Payments({ wizard }: { wizard: ReturnType<typeof useWizardState> }) {
    const [bulkAmount, setBulkAmount] = useState<string>('');
    const [bulkBillingDay, setBulkBillingDay] = useState<string>('');
    const [bulkWarning, setBulkWarning] = useState(false);
    const [openDropdown, setOpenDropdown] = useState<number | null>(null);
    const [dropdownPos, setDropdownPos] = useState<{ top: number; right: number } | null>(null);
    const [amountErrors, setAmountErrors] = useState<Record<number, string>>({});
    const [warningDismissed, setWarningDismissed] = useState<Record<number, boolean>>({});
    // Ref to the button that opened the dropdown — used to recompute position on scroll
    const triggerRef = useRef<HTMLButtonElement | null>(null);

    const closeDropdown = () => {
        setOpenDropdown(null);
        setDropdownPos(null);
        triggerRef.current = null;
    };

    const updateDropdownPos = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        setDropdownPos({
            top: rect.bottom + 4,
            right: window.innerWidth - rect.right,
        });
    };

    // Close on outside click
    useEffect(() => {
        if (openDropdown === null) return;
        const handler = () => closeDropdown();
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [openDropdown]);

    // Recompute position on scroll or resize while dropdown is open
    useEffect(() => {
        if (openDropdown === null) return;
        window.addEventListener('scroll', updateDropdownPos, { capture: true, passive: true });
        window.addEventListener('resize', updateDropdownPos);
        return () => {
            window.removeEventListener('scroll', updateDropdownPos, { capture: true });
            window.removeEventListener('resize', updateDropdownPos);
        };
    }, [openDropdown]);

    const handleBadgeClick = (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        if (openDropdown === index) {
            closeDropdown();
            return;
        }
        triggerRef.current = e.currentTarget;
        setOpenDropdown(index);
        const rect = e.currentTarget.getBoundingClientRect();
        setDropdownPos({
            top: rect.bottom + 4,
            right: window.innerWidth - rect.right,
        });
    };

    const applyBulkAmount = () => {
        const amount = parseInt(bulkAmount, 10);
        const billingDay = parseInt(bulkBillingDay, 10);
        if (isNaN(amount) || amount < 0) return;
        if (amount === 0) {
            wizard.units.forEach((_, index) => {
                wizard.updateUnit(index, { monthly_amount_agorot: undefined });
            });
            setBulkAmount('');
            return;
        }
        if (amount > HIGH_AMOUNT_THRESHOLD) {
            setBulkWarning(true);
        } else {
            setBulkWarning(false);
        }
        const agorot = amount * 100;
        const dismissed = amount <= HIGH_AMOUNT_THRESHOLD;
        const validBillingDay = !isNaN(billingDay) && billingDay >= 1 && billingDay <= 28 ? billingDay : undefined;
        wizard.units.forEach((_, index) => {
            wizard.updateUnit(index, {
                monthly_amount_agorot: agorot,
                ...(validBillingDay !== undefined ? { billing_day: validBillingDay } : {}),
            });
        });
        // Batch the dismissed state update once, outside the loop
        setWarningDismissed(
            Object.fromEntries(wizard.units.map((_, index) => [index, dismissed]))
        );
        setBulkAmount('');
        setBulkBillingDay('');
    };

    const handleUnitAmountChange = (index: number, val: string) => {
        if (val === '' || val === '0') {
            wizard.updateUnit(index, { monthly_amount_agorot: undefined });
            setAmountErrors(prev => { const e = { ...prev }; delete e[index]; return e; });
            setWarningDismissed(prev => { const e = { ...prev }; delete e[index]; return e; });
            return;
        }
        const amount = parseInt(val, 10);
        if (isNaN(amount) || amount < 0) {
            setAmountErrors(prev => ({ ...prev, [index]: 'סכום לא יכול להיות שלילי' }));
            return;
        }
        setAmountErrors(prev => { const e = { ...prev }; delete e[index]; return e; });
        wizard.updateUnit(index, { monthly_amount_agorot: amount * 100 });
        if (amount > HIGH_AMOUNT_THRESHOLD) {
            setWarningDismissed(prev => ({ ...prev, [index]: false }));
        } else {
            setWarningDismissed(prev => ({ ...prev, [index]: true }));
        }
    };

    const unitsWithoutPayment = wizard.units.filter(u => !u.monthly_amount_agorot || !u.billing_day);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500 pb-10">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-apro-navy">תשלומי ועד</h3>
                <p className="text-sm text-gray-500 mt-1">קבע את סכום דמי הניהול החודשי לכל דירה.</p>
            </div>

            {/* Bulk setter */}
            <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1 w-full">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">קבע סכום אחיד לכל הדירות (₪)</label>
                    <div className="relative">
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">₪</span>
                        <input
                            type="number"
                            min="0"
                            value={bulkAmount}
                            onChange={(e) => { setBulkAmount(e.target.value); setBulkWarning(false); }}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 pr-10 pl-4 focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all"
                            placeholder="0"
                        />
                    </div>
                </div>
                <div className="w-full md:w-36">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">יום חיוב (1–28)</label>
                    <input
                        type="number"
                        min={1}
                        max={28}
                        value={bulkBillingDay}
                        onChange={(e) => setBulkBillingDay(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-apro-green/50 focus:border-apro-green transition-all"
                        placeholder="1–28"
                    />
                </div>
                <button
                    onClick={applyBulkAmount}
                    disabled={!bulkAmount || parseInt(bulkAmount, 10) < 0}
                    className="w-full md:w-auto px-6 py-3 bg-apro-navy text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                    החל על כל הדירות
                </button>
            </div>
            {bulkWarning && (
                <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl text-sm font-bold animate-in fade-in">
                    <span>⚠️ הסכום שהוגדר גבוה מ-₪{HIGH_AMOUNT_THRESHOLD.toLocaleString()} — האם אתה בטוח?</span>
                    <button onClick={() => setBulkWarning(false)} className="mr-3 text-yellow-600 hover:text-yellow-800 font-bold text-lg leading-none">×</button>
                </div>
            )}

            {/* Per-unit table — no overflow-hidden so dropdowns aren't clipped */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mt-6">
                <table className="w-full text-right" dir="rtl">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="py-3 px-6 font-bold text-gray-500 text-sm rounded-tr-2xl">דירה</th>
                            <th className="py-3 px-6 font-bold text-gray-500 text-sm">משלם</th>
                            <th className="py-3 px-6 font-bold text-gray-500 text-sm w-[220px]">סכום חודשי (₪)</th>
                            <th className="py-3 px-4 font-bold text-gray-500 text-sm w-24">יום חיוב</th>
                            <th className="py-3 px-4 w-16 rounded-tl-2xl"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 tracking-wide font-medium text-gray-800">
                        {wizard.units.map((unit, index) => {
                            const showWarning = !warningDismissed[index] &&
                                !!unit.monthly_amount_agorot &&
                                unit.monthly_amount_agorot / 100 > HIGH_AMOUNT_THRESHOLD;

                            return (
                                <tr key={unit.unit_number} className="hover:bg-gray-50/50 transition-colors">
                                    <td className="py-3 px-6 text-apro-navy font-bold">{unit.unit_number}</td>

                                    {/* Fee payer badge + portal dropdown */}
                                    <td className="py-3 px-6">
                                        <button
                                            onMouseDown={(e) => e.stopPropagation()}
                                            onClick={(e) => handleBadgeClick(index, e)}
                                            className="focus:outline-none"
                                        >
                                            {unit.fee_payer === 'none' ? (
                                                <span className="text-gray-400 text-sm hover:text-gray-600 transition-colors">ללא ▾</span>
                                            ) : (
                                                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border cursor-pointer hover:opacity-80 transition-opacity ${BADGE_STYLES[unit.fee_payer]}`}>
                                                    {FEE_PAYER_LABEL[unit.fee_payer]}
                                                    <span className="opacity-60 text-xs">▾</span>
                                                </span>
                                            )}
                                        </button>
                                    </td>

                                    {/* Amount input */}
                                    <td className="py-3 px-6">
                                        <div>
                                            <div className="relative">
                                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm">₪</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    className={`w-full bg-white border rounded-lg py-2 pr-9 pl-3 focus:outline-none focus:ring-1 transition-all ${amountErrors[index] ? 'border-red-400 focus:ring-red-400' : 'border-gray-200 focus:ring-apro-green'}`}
                                                    value={unit.monthly_amount_agorot ? unit.monthly_amount_agorot / 100 : ''}
                                                    placeholder="הזן סכום"
                                                    onChange={(e) => handleUnitAmountChange(index, e.target.value)}
                                                />
                                            </div>
                                            {amountErrors[index] && (
                                                <p className="text-red-500 text-xs mt-1 font-medium">{amountErrors[index]}</p>
                                            )}
                                            {showWarning && (
                                                <div className="flex items-center justify-between mt-1 text-yellow-700 text-xs font-bold">
                                                    <span>⚠️ סכום גבוה מהרגיל</span>
                                                    <button
                                                        onClick={() => setWarningDismissed(prev => ({ ...prev, [index]: true }))}
                                                        className="mr-1 hover:text-yellow-900"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </td>

                                    {/* Billing day input */}
                                    <td className="py-3 px-4">
                                        <input
                                            type="number"
                                            min={1}
                                            max={28}
                                            className="w-20 bg-white border border-gray-200 rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-apro-green transition-all text-center"
                                            value={unit.billing_day ?? ''}
                                            placeholder="1–28"
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value, 10);
                                                wizard.updateUnit(index, {
                                                    billing_day: !isNaN(val) && val >= 1 && val <= 28 ? val : undefined,
                                                });
                                            }}
                                        />
                                    </td>

                                    {/* Clear button */}
                                    <td className="py-3 px-4 text-center">
                                        <button
                                            onClick={() => {
                                                wizard.updateUnit(index, { monthly_amount_agorot: undefined, billing_day: undefined });
                                                setAmountErrors(prev => { const e = { ...prev }; delete e[index]; return e; });
                                                setWarningDismissed(prev => { const e = { ...prev }; delete e[index]; return e; });
                                            }}
                                            className="text-xs text-red-500 hover:text-red-700 font-bold"
                                            title="נקה סכום"
                                        >
                                            נקה
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {wizard.units.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-gray-400 font-bold">לא הוגדרו דירות.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Dropdown portal — renders at document body level, never clipped */}
            {openDropdown !== null && dropdownPos && createPortal(
                <div
                    dir="rtl"
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{
                        position: 'fixed',
                        top: dropdownPos.top,
                        right: dropdownPos.right,
                        zIndex: 9999,
                    }}
                    className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden min-w-[130px]"
                >
                    {FEE_PAYER_OPTIONS.map(opt => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                wizard.updateUnit(openDropdown, { fee_payer: opt.value });
                                setOpenDropdown(null);
                                setDropdownPos(null);
                            }}
                            className={`block w-full text-right px-4 py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors ${wizard.units[openDropdown]?.fee_payer === opt.value ? 'text-apro-navy font-bold bg-gray-50' : 'text-gray-700'}`}
                        >
                            {opt.label}
                        </button>
                    ))}
                </div>,
                document.body
            )}

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
