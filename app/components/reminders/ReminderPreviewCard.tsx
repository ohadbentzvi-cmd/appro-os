'use client';

import { useState } from 'react';
import { Phone, Building2, User, Pencil, X } from 'lucide-react';
import ReminderStatusBadge from './ReminderStatusBadge';

export interface PreviewItem {
    chargeId: string;
    unitIdentifier: string | null;
    buildingAddress: string | null;
    buildingName: string | null;
    buildingId: string | null;
    amountDue: number | null;
    dueDate: string | null;
    recipientPersonId: string | null;
    recipientName: string | null;
    recipientPhone: string | null;
    blockReason: string | null;
    cooldownSince: string | null;
    lastReminder: { sentAt: string; status: string } | null;
    isDuplicate: boolean;
}

interface Props {
    item: PreviewItem;
    index: number;
    total: number;
    phoneOverride: string | undefined;
    onPhoneOverride: (chargeId: string, phone: string | null) => void;
}

export default function ReminderPreviewCard({ item, index, total, phoneOverride, onPhoneOverride }: Props) {
    const [isOverriding, setIsOverriding] = useState(false);
    const [overrideInput, setOverrideInput] = useState('');

    const displayPhone = phoneOverride ?? item.recipientPhone ?? '';

    const handleOverrideSave = () => {
        onPhoneOverride(item.chargeId, overrideInput.trim() || null);
        setIsOverriding(false);
    };

    const handleOverrideCancel = () => {
        setIsOverriding(false);
        setOverrideInput('');
    };

    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            {/* Card counter */}
            <div className="flex items-center justify-between text-sm text-gray-400 font-medium">
                <span>הודעה {index + 1} מתוך {total}</span>
                {item.isDuplicate && (
                    <span className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full font-bold">
                        הודעה נוספת לאותו אדם
                    </span>
                )}
            </div>

            {/* Recipient */}
            <div className="flex items-start gap-3">
                <div className="bg-apro-green/10 p-2 rounded-xl text-apro-green mt-0.5">
                    <User className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-xs text-gray-400 font-medium mb-0.5">נמען</p>
                    <p className="font-bold text-apro-navy">{item.recipientName}</p>
                </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-3">
                <div className="bg-blue-50 p-2 rounded-xl text-blue-600 mt-0.5">
                    <Phone className="w-4 h-4" />
                </div>
                <div className="flex-1">
                    <p className="text-xs text-gray-400 font-medium mb-0.5">מספר טלפון</p>
                    {isOverriding ? (
                        <div className="space-y-2">
                            <input
                                type="tel"
                                value={overrideInput}
                                onChange={e => setOverrideInput(e.target.value)}
                                placeholder="05X-XXXXXXX"
                                autoFocus
                                dir="ltr"
                                className="w-full border border-apro-green rounded-lg px-3 py-2 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-apro-green/30"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={handleOverrideSave}
                                    className="flex-1 py-1.5 bg-apro-green text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition-colors"
                                >
                                    אשר
                                </button>
                                <button
                                    onClick={handleOverrideCancel}
                                    className="p-1.5 border border-gray-200 text-gray-500 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-400">
                                לשינוי קבוע, ערוך את פרטי האדם בדף הפרופיל
                            </p>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-800" dir="ltr">{displayPhone}</span>
                            {phoneOverride && (
                                <span className="text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded-full font-bold">
                                    שונה
                                </span>
                            )}
                            <button
                                onClick={() => { setOverrideInput(displayPhone); setIsOverriding(true); }}
                                className="text-xs text-gray-400 hover:text-apro-green underline underline-offset-2 transition-colors mr-1"
                            >
                                שנה נמען
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Unit + Building */}
            <div className="flex items-start gap-3">
                <div className="bg-gray-100 p-2 rounded-xl text-gray-500 mt-0.5">
                    <Building2 className="w-4 h-4" />
                </div>
                <div>
                    <p className="text-xs text-gray-400 font-medium mb-0.5">יחידה</p>
                    <p className="font-bold text-gray-800">
                        דירה {item.unitIdentifier} · {item.buildingAddress}
                    </p>
                </div>
            </div>

            {/* Last reminder status */}
            <div className="pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-400 font-medium mb-1.5">תזכורת אחרונה</p>
                <ReminderStatusBadge lastReminder={item.lastReminder} />
            </div>
        </div>
    );
}
