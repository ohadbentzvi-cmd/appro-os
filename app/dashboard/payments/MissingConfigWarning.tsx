'use client';

import React, { useState } from 'react';
import { AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Link from 'next/link';

interface UnconfiguredUnit {
    unit_id: string;
    unit_identifier: string;
    building_id: string;
    building_address: string;
    floor: number;
}

interface MissingConfigWarningProps {
    missingConfigUnits: UnconfiguredUnit[];
}

export default function MissingConfigWarning({ missingConfigUnits }: MissingConfigWarningProps) {
    const [expanded, setExpanded] = useState(false);

    if (missingConfigUnits.length === 0) return null;

    return (
        <div className="bg-amber-50 rounded-2xl p-4 shadow-sm border border-amber-200 mb-6">
            <div
                className="flex items-start gap-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className="bg-amber-100 p-2 rounded-xl shrink-0">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                </div>
                <div className="flex-1">
                    <div className="flex justify-between items-center">
                        <h3 className="font-bold text-amber-900">
                            {missingConfigUnits.length} יחידות ללא הגדרת תשלום חודשי
                        </h3>
                        {expanded ? (
                            <ChevronUp className="w-5 h-5 text-amber-600" />
                        ) : (
                            <ChevronDown className="w-5 h-5 text-amber-600" />
                        )}
                    </div>
                    <p className="text-amber-700 text-sm mt-1">
                        לא קיימת הגדרת גבייה חודשית ליחידות אלו, ולכן לא יופקו עבורן חיובים.
                    </p>
                </div>
            </div>

            {expanded && (
                <div className="mt-4 pt-4 border-t border-amber-200/50">
                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {missingConfigUnits.map(unit => (
                            <li key={unit.unit_id} className="text-sm text-amber-800 bg-amber-100/50 p-2 rounded-lg flex justify-between items-center">
                                <div>
                                    <span className="font-semibold">דירה {unit.unit_identifier} (קומה {unit.floor || '?'})</span>
                                    <span className="text-amber-600/80 mr-2">— {unit.building_address}</span>
                                </div>
                                <Link
                                    href={`/dashboard/buildings/${unit.building_id}/units/${unit.unit_id}`}
                                    className="text-amber-700 hover:text-amber-900 font-bold underline underline-offset-4 decoration-amber-300 transition-colors bg-amber-200/50 px-3 py-1 rounded-md"
                                >
                                    הגדר תשלום
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
