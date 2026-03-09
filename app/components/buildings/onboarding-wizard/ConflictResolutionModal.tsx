'use client';
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
import { PhoneConflict } from '@/app/api/v1/buildings/onboard/route';

export type ConflictResolution = 'use_existing' | 'change_details';

interface ConflictResolutionModalProps {
    conflicts: PhoneConflict[];
    onResolve: (resolutions: Record<string, ConflictResolution>) => void;
    onCancel: () => void;
}

export function ConflictResolutionModal({ conflicts, onResolve, onCancel }: ConflictResolutionModalProps) {
    const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});

    const setResolution = (phone: string, resolution: ConflictResolution) => {
        setResolutions(prev => ({ ...prev, [phone]: resolution }));
    };

    const allResolved = conflicts.every(c => resolutions[c.phone] !== undefined);

    const handleConfirm = () => {
        onResolve(resolutions);
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" dir="rtl">
            <div className="bg-white w-[90vw] max-w-2xl rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-yellow-50 rounded-full">
                            <AlertCircle className="w-5 h-5 text-yellow-600" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-apro-navy">נמצאו אנשים קיימים עם אותו טלפון</h3>
                            <p className="text-sm text-gray-500 mt-0.5">יש לבחור כיצד לטפל בכל אחד מהמקרים הבאים לפני שניתן להמשיך.</p>
                        </div>
                    </div>
                </div>

                {/* Conflict rows */}
                <div className="overflow-y-auto max-h-[60vh] divide-y divide-gray-100">
                    {conflicts.map((conflict) => {
                        const resolution = resolutions[conflict.phone];
                        return (
                            <div key={conflict.phone} className="p-6">
                                <div className="mb-4">
                                    <p className="text-sm text-gray-600">
                                        מספר הטלפון <span className="font-bold text-gray-900">{conflict.phone}</span> כבר קיים במערכת.
                                    </p>
                                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                                        <div className="bg-gray-50 rounded-xl p-3">
                                            <p className="text-xs text-gray-400 font-semibold mb-1">הוזן עכשיו</p>
                                            <p className="font-bold text-gray-800">{conflict.entered_name}</p>
                                        </div>
                                        <div className="bg-blue-50 rounded-xl p-3">
                                            <p className="text-xs text-blue-400 font-semibold mb-1">קיים במערכת</p>
                                            <p className="font-bold text-blue-800">{conflict.existing_name}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setResolution(conflict.phone, 'use_existing')}
                                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${resolution === 'use_existing'
                                            ? 'border-apro-navy bg-apro-navy text-white'
                                            : 'border-gray-200 text-gray-700 hover:border-apro-navy hover:text-apro-navy'
                                            }`}
                                    >
                                        השתמש באדם הקיים ({conflict.existing_name})
                                    </button>
                                    <button
                                        onClick={() => setResolution(conflict.phone, 'change_details')}
                                        className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-bold border-2 transition-all ${resolution === 'change_details'
                                            ? 'border-red-500 bg-red-50 text-red-700'
                                            : 'border-gray-200 text-gray-700 hover:border-red-400 hover:text-red-600'
                                            }`}
                                    >
                                        שנה פרטים
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
                    <button
                        onClick={onCancel}
                        className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-100 rounded-xl border border-gray-200 transition-colors"
                    >
                        ביטול
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!allResolved}
                        className={`px-8 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm ${allResolved
                            ? 'bg-apro-navy text-white hover:bg-slate-800'
                            : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        המשך ({Object.keys(resolutions).length}/{conflicts.length})
                    </button>
                </div>
            </div>
        </div>
    );
}
