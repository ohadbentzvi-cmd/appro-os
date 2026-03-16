'use client';
import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, Upload } from 'lucide-react';
import { useWizardState } from './useWizardState';
import { downloadExcelTemplate, parseExcelToUnits, CellWarning } from '../../../lib/wizard/excelTemplate';
import { WizardPersonUI, WizardUnitUI } from '@/app/lib/wizard/wizardTypes';
import { PHONE_REGEX } from '@/app/lib/wizard/validation';

/**
 * Returns phones that appear more than once across all units with DIFFERENT names.
 * Same phone + same name = same person in multiple units = allowed.
 */
function getConflictingPhones(units: WizardUnitUI[]): Set<string> {
    // phone → lowercased full name of first occurrence
    const phoneNameMap = new Map<string, string>();
    const conflicting = new Set<string>();

    for (const unit of units) {
        for (const role of ['owner', 'tenant'] as const) {
            const person = unit[role];
            if (!person?.phone) continue;
            const fullName = [person.first_name, person.last_name]
                .filter(Boolean).join(' ').trim().toLowerCase();
            if (phoneNameMap.has(person.phone)) {
                if (phoneNameMap.get(person.phone) !== fullName) {
                    conflicting.add(person.phone);
                }
                // same name → same person → OK, no conflict
            } else {
                phoneNameMap.set(person.phone, fullName);
            }
        }
    }
    return conflicting;
}

export function Step2UnitsPeople({ wizard, showErrors }: { wizard: ReturnType<typeof useWizardState>; showErrors: boolean }) {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadError, setUploadError] = useState<string[] | null>(null);
    const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
    const [cellWarnings, setCellWarnings] = useState<CellWarning[]>([]);

    const conflictingPhones = getConflictingPhones(wizard.units);
    const hasDuplicatePhones = conflictingPhones.size > 0;

    const invalidPhoneIssues = wizard.units.flatMap(unit => {
        const issues: string[] = [];
        const ownerPhone = unit.owner?.phone ?? '';
        const tenantPhone = unit.tenant?.phone ?? '';
        if (ownerPhone && !PHONE_REGEX.test(ownerPhone))
            issues.push(`דירה ${unit.unit_number} — בעל נכס: "${ownerPhone}"`);
        if (tenantPhone && !PHONE_REGEX.test(tenantPhone))
            issues.push(`דירה ${unit.unit_number} — דייר: "${tenantPhone}"`);
        return issues;
    });
    const hasInvalidPhones = invalidPhoneIssues.length > 0;

    const getCellWarning = (unitNumber: string, field: CellWarning['field']) =>
        cellWarnings.find(w => w.unit_number === unitNumber && w.field === field);

    const handleDownloadTemplate = async () => {
        await downloadExcelTemplate(wizard.units);
    };

    const handleUploadClick = () => {
        setUploadError(null);
        setUploadSuccess(null);
        setCellWarnings([]);
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = '';

        setUploadError(null);
        setUploadSuccess(null);
        setCellWarnings([]);

        const expectedNumbers = wizard.units.map(u => u.unit_number);
        const result = await parseExcelToUnits(file, expectedNumbers);

        if (!result.ok) {
            setUploadError(result.errors);
            return;
        }

        wizard.applyExcelUnits(result.units);

        if (result.warnings.length > 0) {
            setCellWarnings(result.warnings);
            setUploadSuccess(`✓ הנתונים יובאו. ${result.warnings.length} שדות דורשים תיקון (מסומנים באדום).`);
        } else {
            setUploadSuccess(`✓ ${result.units.length} דירות עודכנו מהקובץ. ניתן לערוך את הנתונים לפני המשך.`);
        }
        setTimeout(() => setUploadSuccess(null), 6000);
    };

    const updatePerson = (
        unitIndex: number,
        role: 'owner' | 'tenant',
        field: keyof WizardPersonUI,
        value: string
    ) => {
        const unit = wizard.units[unitIndex];
        const current = unit[role];
        wizard.updateUnit(unitIndex, {
            [role]: {
                first_name: '',
                last_name: '',
                phone: '',
                ...current,
                [field]: value,
            },
        });

        // Clear cell warning when user edits the field
        if (field === 'phone') {
            const warningField = role === 'owner' ? 'owner_phone' : 'tenant_phone';
            setCellWarnings(prev => prev.filter(
                w => !(w.unit_number === unit.unit_number && w.field === warningField)
            ));
        }
    };

    return (
        <div className="flex flex-col h-full gap-4 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div>
                    <h3 className="text-xl font-bold text-apro-navy">דירות ודיירים</h3>
                    <p className="text-sm text-gray-500 mt-1">הזן פרטי דיירים ובעלי נכס לכל דירה, או השתמש בתבנית האקסל.</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleDownloadTemplate}
                        className="flex items-center gap-2 text-sm font-bold text-apro-navy bg-white border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Download className="w-4 h-4" />
                        הורד תבנית Excel
                    </button>
                    <button
                        onClick={handleUploadClick}
                        className="flex items-center gap-2 text-sm font-bold text-apro-navy bg-white border border-gray-200 px-3 py-1.5 rounded-xl hover:bg-gray-50 transition-colors shadow-sm"
                    >
                        <Upload className="w-4 h-4" />
                        העלה קובץ מאוכלס
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls"
                        className="hidden"
                        onChange={handleFileChange}
                    />
                    <div className="text-xs font-bold text-gray-400 bg-white border border-gray-200 px-3 py-1.5 rounded-full">
                        סה״כ: {wizard.units.length} דירות
                    </div>
                </div>
            </div>

            {/* Upload feedback banners */}
            {uploadError && (
                <div className="flex flex-col gap-1 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-100 animate-in fade-in slide-in-from-top-2 shrink-0">
                    <div className="flex items-center gap-2 font-bold">
                        <AlertCircle className="w-5 h-5 shrink-0" />
                        <span>שגיאות בקובץ — לא בוצעו שינויים:</span>
                    </div>
                    <ul className="list-disc list-inside mr-6 space-y-0.5">
                        {uploadError.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </div>
            )}
            {uploadSuccess && (
                <div className="flex items-center gap-2 p-3 bg-green-50 text-green-700 text-sm font-bold rounded-lg border border-green-100 animate-in fade-in slide-in-from-top-2 shrink-0">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <p>{uploadSuccess}</p>
                </div>
            )}

            {/* Invalid phone format banner */}
            {showErrors && hasInvalidPhones && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm shrink-0">
                    <div className="flex items-center gap-2 font-bold mb-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{invalidPhoneIssues.length === 1 ? 'מספר טלפון לא תקין' : `${invalidPhoneIssues.length} מספרי טלפון לא תקינים`} — יש לתקן לפני המשך:</span>
                    </div>
                    <ul className="list-disc list-inside mr-6 space-y-0.5">
                        {invalidPhoneIssues.map((issue, i) => <li key={i}>{issue}</li>)}
                    </ul>
                    <p className="text-xs text-red-500 mt-1.5 mr-1">פורמט נדרש: 05XXXXXXXX (נייד) או 0XXXXXXXX (קווי)</p>
                </div>
            )}

            {/* Conflicting phone banner */}
            {showErrors && hasDuplicatePhones && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm shrink-0">
                    <div className="flex items-center gap-2 font-bold mb-1.5">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>מספרי טלפון המשויכים לאנשים שונים — יש לתקן לפני המשך:</span>
                    </div>
                    <ul className="list-disc list-inside mr-6 space-y-0.5">
                        {Array.from(conflictingPhones).map(phone => {
                            const unitLabels = wizard.units
                                .filter(u => u.owner?.phone === phone || u.tenant?.phone === phone)
                                .map(u => `דירה ${u.unit_number}`)
                                .join(', ');
                            return <li key={phone}>{phone} — {unitLabels}</li>;
                        })}
                    </ul>
                    <p className="text-xs text-red-500 mt-1.5 mr-1">אם מדובר באותו אדם, וודא שהשם זהה בשתי הדירות.</p>
                </div>
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">

                {/* Table */}
                <div className="overflow-auto flex-1 min-h-0">
                    <table className="w-full text-right relative" dir="rtl">
                        <thead className="bg-gray-50 border-b border-gray-100 whitespace-nowrap sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="py-3 px-4 font-bold text-gray-500 text-sm min-w-[80px]">דירה</th>
                                <th className="py-3 px-4 font-bold text-gray-500 text-sm min-w-[130px]">שם פרטי בעל הנכס</th>
                                <th className="py-3 px-4 font-bold text-gray-500 text-sm min-w-[130px]">שם משפחה בעל הנכס</th>
                                <th className="py-3 px-4 font-bold text-gray-500 text-sm min-w-[150px]">טלפון בעל הנכס</th>
                                <th className="py-3 px-4 font-bold text-gray-500 text-sm min-w-[130px]">שם פרטי דייר</th>
                                <th className="py-3 px-4 font-bold text-gray-500 text-sm min-w-[130px]">שם משפחה דייר</th>
                                <th className="py-3 px-4 font-bold text-gray-500 text-sm min-w-[150px]">טלפון דייר</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {wizard.units.map((unit, index) => {
                                const ownerPhone = unit.owner?.phone ?? '';
                                const tenantPhone = unit.tenant?.phone ?? '';

                                const ownerPhoneInvalid = ownerPhone !== '' && !PHONE_REGEX.test(ownerPhone);
                                const tenantPhoneInvalid = tenantPhone !== '' && !PHONE_REGEX.test(tenantPhone);
                                const ownerPhoneConflict = conflictingPhones.has(ownerPhone);
                                const tenantPhoneConflict = conflictingPhones.has(tenantPhone);

                                const ownerPhoneWarning = getCellWarning(unit.unit_number, 'owner_phone');
                                const tenantPhoneWarning = getCellWarning(unit.unit_number, 'tenant_phone');

                                return (
                                    <tr key={unit.unit_number} className="hover:bg-gray-50/50 transition-colors">
                                        {/* Unit number — read-only */}
                                        <td className="py-2 px-4">
                                            <span className="font-semibold text-apro-navy px-2">{unit.unit_number}</span>
                                        </td>
                                        {/* Owner first name */}
                                        <td className="py-2 px-4">
                                            <input
                                                type="text"
                                                dir="rtl"
                                                className="w-full bg-transparent border-0 focus:ring-0 p-2 placeholder:text-right"
                                                value={unit.owner?.first_name ?? ''}
                                                placeholder="שם פרטי"
                                                onChange={(e) => updatePerson(index, 'owner', 'first_name', e.target.value)}
                                            />
                                        </td>
                                        {/* Owner last name */}
                                        <td className="py-2 px-4">
                                            <input
                                                type="text"
                                                dir="rtl"
                                                className="w-full bg-transparent border-0 focus:ring-0 p-2 placeholder:text-right"
                                                value={unit.owner?.last_name ?? ''}
                                                placeholder="שם משפחה"
                                                onChange={(e) => updatePerson(index, 'owner', 'last_name', e.target.value)}
                                            />
                                        </td>
                                        {/* Owner phone */}
                                        <td className="py-2 px-4">
                                            <input
                                                type="tel"
                                                dir="rtl"
                                                title={ownerPhoneWarning?.message}
                                                className={`w-full bg-transparent border-0 focus:ring-0 p-2 placeholder:text-right ${ownerPhoneInvalid || ownerPhoneConflict || ownerPhoneWarning ? 'text-red-500 bg-red-50 rounded' : ''}`}
                                                value={ownerPhone}
                                                placeholder="05XXXXXXXX"
                                                onChange={(e) => updatePerson(index, 'owner', 'phone', e.target.value)}
                                            />
                                        </td>
                                        {/* Tenant first name */}
                                        <td className="py-2 px-4">
                                            <input
                                                type="text"
                                                dir="rtl"
                                                className="w-full bg-transparent border-0 focus:ring-0 p-2 placeholder:text-right"
                                                value={unit.tenant?.first_name ?? ''}
                                                placeholder="שם פרטי"
                                                onChange={(e) => updatePerson(index, 'tenant', 'first_name', e.target.value)}
                                            />
                                        </td>
                                        {/* Tenant last name */}
                                        <td className="py-2 px-4">
                                            <input
                                                type="text"
                                                dir="rtl"
                                                className="w-full bg-transparent border-0 focus:ring-0 p-2 placeholder:text-right"
                                                value={unit.tenant?.last_name ?? ''}
                                                placeholder="שם משפחה"
                                                onChange={(e) => updatePerson(index, 'tenant', 'last_name', e.target.value)}
                                            />
                                        </td>
                                        {/* Tenant phone */}
                                        <td className="py-2 px-4">
                                            <input
                                                type="tel"
                                                dir="rtl"
                                                title={tenantPhoneWarning?.message}
                                                className={`w-full bg-transparent border-0 focus:ring-0 p-2 placeholder:text-right ${tenantPhoneInvalid || tenantPhoneConflict || tenantPhoneWarning ? 'text-red-500 bg-red-50 rounded' : ''}`}
                                                value={tenantPhone}
                                                placeholder="05XXXXXXXX"
                                                onChange={(e) => updatePerson(index, 'tenant', 'phone', e.target.value)}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
