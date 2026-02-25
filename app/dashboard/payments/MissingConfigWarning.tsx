'use client';

import React, { useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export interface WarningItem {
    unit_id: string;
    unit_identifier: string;
    building_id: string;
    building_address: string;
    fix_url: string;
}

export interface WarningType {
    type: string;
    severity: 'high' | 'medium';
    count: number;
    items: WarningItem[];
}

export interface WarningsData {
    total: number;
    warnings: WarningType[];
}

export interface WarningsBannerProps {
    data: WarningsData | null;
}

export default function WarningsBanner({ data }: WarningsBannerProps) {
    const [expanded, setExpanded] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);

    if (!data || data.total === 0 || !data.warnings || data.warnings.length === 0) return null;

    // Sort: high severity first
    const sortedWarnings = [...data.warnings].sort((a, b) =>
        (a.severity === 'high' ? -1 : 1) - (b.severity === 'high' ? -1 : 1)
    );

    const currentWarning = sortedWarnings[currentIndex];
    const isMultiple = sortedWarnings.length > 1;

    const handlePrev = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sortedWarnings.length - 1));
        setExpanded(false);
    };

    const handleNext = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentIndex((prev) => (prev < sortedWarnings.length - 1 ? prev + 1 : 0));
        setExpanded(false);
    };

    const isHigh = currentWarning.severity === 'high';

    const bannerClasses = isHigh
        ? "bg-amber-50 border-amber-200 text-amber-900"
        : "bg-yellow-50 border-yellow-200 text-yellow-900";

    const iconClasses = isHigh ? "text-amber-600" : "text-yellow-600";
    const iconBgClasses = isHigh ? "bg-amber-100" : "bg-yellow-100";
    const textDescClasses = isHigh ? "text-amber-700" : "text-yellow-700";
    const listBgClasses = isHigh ? "border-amber-200/50" : "border-yellow-200/50";
    const itemBgClasses = isHigh ? "bg-amber-100/50 text-amber-800" : "bg-yellow-100/50 text-yellow-800";
    const itemSubtextClasses = isHigh ? "text-amber-600/80" : "text-yellow-600/80";
    const linkClasses = isHigh
        ? "text-amber-700 hover:text-amber-900 decoration-amber-300 bg-amber-200/50"
        : "text-yellow-700 hover:text-yellow-900 decoration-yellow-300 bg-yellow-200/50";

    const getTitle = (type: string) => {
        switch (type) {
            case 'missing_payment_config': return 'יחידות ללא הגדרת תשלום חודשי';
            case 'missing_occupant': return 'יחידות ללא דייר או בעלים פעיל';
            case 'missing_fee_payer': return 'יחידות ללא משלם מוגדר';
            default: return 'התראה';
        }
    };

    const getDesc = (type: string) => {
        switch (type) {
            case 'missing_payment_config': return 'לא יופקו חיובים חודשיים עבור יחידות אלו עד להגדרת סכום גבייה';
            case 'missing_occupant': return 'יחידות אלו אינן משויכות לאף דייר או בעל דירה פעיל';
            case 'missing_fee_payer': return 'לא מוגדר מי אחראי לתשלום עבור יחידות אלו';
            default: return '';
        }
    };

    return (
        <div className={`rounded-2xl p-4 shadow-sm border mb-6 ${bannerClasses}`}>
            <div
                className="flex items-start gap-4 cursor-pointer"
                onClick={() => setExpanded(!expanded)}
            >
                <div className={`${iconBgClasses} p-2 rounded-xl shrink-0`}>
                    <AlertCircle className={`w-5 h-5 ${iconClasses}`} />
                </div>

                <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <div>
                            <h3 className="font-bold text-lg">
                                {currentWarning.count} {getTitle(currentWarning.type)}
                            </h3>
                            <p className={`${textDescClasses} text-sm mt-1`}>
                                {getDesc(currentWarning.type)}
                            </p>
                        </div>

                        {isMultiple && (
                            <div className="flex items-center gap-2 mr-4 bg-white/40 px-3 py-1.5 rounded-full" onClick={(e) => e.stopPropagation()} dir="ltr">
                                <button onClick={handleNext} className="p-1 hover:bg-black/5 rounded-full transition-colors" aria-label="הבא">
                                    <ChevronLeft className="w-4 h-4 opacity-70 hover:opacity-100" />
                                </button>
                                <span className="text-sm font-bold opacity-80 min-w-[2.5rem] text-center" dir="rtl">
                                    {currentIndex + 1} / {sortedWarnings.length}
                                </span>
                                <button onClick={handlePrev} className="p-1 hover:bg-black/5 rounded-full transition-colors" aria-label="הקודם">
                                    <ChevronRight className="w-4 h-4 opacity-70 hover:opacity-100" />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 text-sm font-bold flex items-center gap-1 opacity-80 hover:opacity-100 transition-opacity">
                        {expanded ? 'הסתר ▴' : 'הצג יחידות ▾'}
                    </div>
                </div>
            </div>

            {expanded && (
                <div className={`mt-4 pt-4 border-t ${listBgClasses}`}>
                    <ul className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                        {currentWarning.items.map(unit => (
                            <li key={unit.unit_id} className={`text-sm p-3 rounded-xl flex justify-between items-center ${itemBgClasses}`}>
                                <div>
                                    <span className="font-bold">דירה {unit.unit_identifier}</span>
                                    <span className={`${itemSubtextClasses} mr-2 font-medium`}>— {unit.building_address}</span>
                                </div>
                                <Link
                                    href={unit.fix_url}
                                    onClick={(e) => e.stopPropagation()}
                                    className={`font-bold underline underline-offset-4 transition-colors px-4 py-1.5 rounded-lg ${linkClasses}`}
                                >
                                    מעבר לטיפול
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}
