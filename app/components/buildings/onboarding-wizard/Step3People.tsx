'use client';
import { useState } from 'react';
import { ChevronDown, ChevronLeft, Search, Check } from 'lucide-react';
import { useWizardState } from './useWizardState';
import { WizardUnit } from '@/lib/api/schemas/buildingOnboard';

export function Step3People({ wizard }: { wizard: ReturnType<typeof useWizardState> }) {
    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
            <div className="mb-6">
                <h3 className="text-xl font-bold text-apro-navy">דיירים ובעלים</h3>
                <p className="text-sm text-gray-500 mt-1">שייך בעלים ודיירים לכל דירה, וקבע מי משלם את ועד הבית.<br />ניתן לדלג על שלב זה ולהשלים מאוחר יותר.</p>
            </div>

            <div className="space-y-4">
                {wizard.units.map((unit, index) => (
                    <UnitPeopleCard key={index} index={index} unit={unit} updateUnit={wizard.updateUnit} />
                ))}
                {wizard.units.length === 0 && (
                    <div className="text-center p-8 text-gray-400 font-bold bg-white border rounded-xl">
                        לא הוגדרו דירות בבניין.
                    </div>
                )}
            </div>
        </div>
    );
}

function UnitPeopleCard({ index, unit, updateUnit }: { index: number, unit: WizardUnit, updateUnit: (index: number, updates: Partial<WizardUnit>) => void }) {
    const [expanded, setExpanded] = useState(false);

    const ownerName = unit.owner?.full_name || 'לא הוגדר';
    const tenantName = unit.tenant?.full_name || 'לא הוגדר';

    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header (Collapsible) */}
            <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-apro-navy/5 text-apro-navy rounded-xl flex items-center justify-center font-bold">
                        {unit.unit_number}
                    </div>
                    <div className="text-sm font-semibold text-gray-500">
                        בעלים: <span className="text-gray-900">{ownerName}</span> | דייר: <span className="text-gray-900">{tenantName}</span>
                    </div>
                </div>
                <div>
                    {expanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronLeft className="w-5 h-5 text-gray-400" />}
                </div>
            </div>

            {/* Expanded Content */}
            {expanded && (
                <div className="border-t border-gray-100 p-6 bg-gray-50/50 space-y-8 animate-in slide-in-from-top-2 fade-in duration-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <PersonForm
                            roleName="בעל דירה"
                            roleType="owner"
                            person={unit.owner}
                            onChange={(person) => updateUnit(index, { owner: person })}
                        />
                        <PersonForm
                            roleName="דייר"
                            roleType="tenant"
                            person={unit.tenant}
                            onChange={(person) => updateUnit(index, { tenant: person })}
                        />
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                        <label className="block text-sm font-semibold text-gray-700 mb-4">מי משלם את דמי הוועד?</label>
                        <div className="flex flex-wrap gap-4">
                            <label className={`flex items-center gap-2 px-4 py-2 border rounded-xl cursor-pointer transition-colors ${unit.fee_payer === 'owner' ? 'border-apro-green bg-green-50 text-apro-green font-bold' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'}`}>
                                <input
                                    type="radio"
                                    name={`fee_payer_${index}`}
                                    checked={unit.fee_payer === 'owner'}
                                    onChange={() => updateUnit(index, { fee_payer: 'owner' })}
                                    disabled={!unit.owner?.full_name}
                                    className="sr-only"
                                />
                                בעל הדירה
                            </label>
                            <label className={`flex items-center gap-2 px-4 py-2 border rounded-xl cursor-pointer transition-colors ${unit.fee_payer === 'tenant' ? 'border-apro-green bg-green-50 text-apro-green font-bold' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'}`}>
                                <input
                                    type="radio"
                                    name={`fee_payer_${index}`}
                                    checked={unit.fee_payer === 'tenant'}
                                    onChange={() => updateUnit(index, { fee_payer: 'tenant' })}
                                    disabled={!unit.tenant?.full_name}
                                    className="sr-only"
                                />
                                הדייר
                            </label>
                            <label className={`flex items-center gap-2 px-4 py-2 border rounded-xl cursor-pointer transition-colors ${unit.fee_payer === 'none' ? 'border-gray-400 bg-gray-100 text-gray-800 font-bold' : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-600'}`}>
                                <input
                                    type="radio"
                                    name={`fee_payer_${index}`}
                                    checked={unit.fee_payer === 'none'}
                                    onChange={() => updateUnit(index, { fee_payer: 'none' })}
                                    className="sr-only"
                                />
                                לא ידוע כרגע
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

function PersonForm({ roleName, roleType, person, onChange }: { roleName: string, roleType: 'owner' | 'tenant', person?: WizardUnit['owner'], onChange: (p?: WizardUnit['owner']) => void }) {
    const [isSearching, setIsSearching] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const isActive = !!person;

    const handleToggle = () => {
        if (isActive) {
            onChange(undefined);
        } else {
            onChange({ full_name: '', phone: '' });
        }
    };

    const performSearch = async (term: string) => {
        if (term.length < 2) {
            setSearchResults([]);
            return;
        }
        const res = await fetch(`/api/v1/people?search=${encodeURIComponent(term)}&limit=5`);
        const { data } = await res.json();
        setSearchResults(data || []);
    };

    return (
        <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-800">{roleName}</h4>
                <button
                    onClick={handleToggle}
                    className={`text-xs font-bold px-3 py-1 rounded-full transition-colors ${isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                >
                    {isActive ? 'הסר' : `+ הוסף ${roleName}`}
                </button>
            </div>

            {isActive && (
                <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                    {isSearching ? (
                        <div className="space-y-3">
                            <div className="relative">
                                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder="חפש איש קשר קיים..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        performSearch(e.target.value);
                                    }}
                                    className="w-full text-sm bg-gray-50 border border-gray-200 rounded-lg py-2 pr-9 pl-3 focus:outline-none focus:ring-1 focus:ring-apro-green"
                                />
                            </div>
                            {searchResults.length > 0 && (
                                <div className="bg-white border rounded-lg shadow-sm divide-y max-h-40 overflow-y-auto">
                                    {searchResults.map(res => (
                                        <button
                                            key={res.id}
                                            onClick={() => {
                                                onChange({ existing_id: res.id, full_name: res.fullName, phone: res.phone || '' });
                                                setIsSearching(false);
                                                setSearchQuery('');
                                            }}
                                            className="w-full text-right p-3 hover:bg-green-50 text-sm flex justify-between items-center transition-colors"
                                        >
                                            <div>
                                                <div className="font-bold">{res.fullName}</div>
                                                <div className="text-gray-500 text-xs">{res.phone}</div>
                                            </div>
                                            <Check className="w-4 h-4 text-apro-green opacity-0 hover:opacity-100 group-hover:opacity-100" />
                                        </button>
                                    ))}
                                </div>
                            )}
                            <button onClick={() => setIsSearching(false)} className="text-xs text-gray-500 hover:text-gray-800 font-bold mt-2">ביטול חיפוש</button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div>
                                <input
                                    type="text"
                                    placeholder="שם מלא *"
                                    value={person?.full_name || ''}
                                    onChange={(e) => onChange({ ...person!, full_name: e.target.value, existing_id: undefined })}
                                    className={`w-full text-sm bg-gray-50 border rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-apro-green ${person?.existing_id ? 'border-apro-green/30 bg-green-50/30' : 'border-gray-200'}`}
                                />
                            </div>
                            <div>
                                <input
                                    type="text"
                                    placeholder="טלפון *"
                                    value={person?.phone || ''}
                                    onChange={(e) => onChange({ ...person!, phone: e.target.value, existing_id: undefined })}
                                    className={`w-full text-sm bg-gray-50 border rounded-lg py-2 px-3 focus:outline-none focus:ring-1 focus:ring-apro-green ${person?.existing_id ? 'border-apro-green/30 bg-green-50/30' : person?.phone && !person.phone.match(/^(05\d{8}|0[23489]\d{7})$/) ? 'border-red-300 bg-red-50 focus:ring-red-400' : 'border-gray-200'}`}
                                    dir="ltr"
                                />
                                {person?.phone && !person.phone.match(/^(05\d{8}|0[23489]\d{7})$/) && (
                                    <p className="text-red-500 text-xs mt-1 font-bold">מספר טלפון אינו תקין</p>
                                )}
                            </div>
                            {!person?.existing_id && (
                                <button onClick={() => setIsSearching(true)} className="text-xs text-blue-600 font-bold hover:underline">
                                    חפש אנשים קיימים במערכת
                                </button>
                            )}
                            {person?.existing_id && (
                                <div className="text-xs text-apro-green flex items-center gap-1 font-bold">
                                    <Check className="w-3 h-3" /> מתוך המערכת
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
