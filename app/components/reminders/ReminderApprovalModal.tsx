'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Loader2, AlertTriangle, Send, MessageSquare } from 'lucide-react';
import Link from 'next/link';
import ReminderPreviewCard, { PreviewItem } from './ReminderPreviewCard';
import { normalizeIsraeliPhone } from '@/lib/reminders/phone';
import { type WhatsappTemplate } from '@apro/db/src/schema';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSent: () => void;
    chargeIds: string[];
    periodMonth: string;
}

type Phase = 'loading' | 'ready' | 'sending' | 'done';

async function fetchPreviewWithTemplate(
    chargeIds: string[],
    periodMonth: string,
    templateId?: string,
): Promise<PreviewItem[]> {
    const res = await fetch('/api/v1/reminders/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chargeIds, periodMonth, templateId }),
    });
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.data ?? [];
}

const BLOCK_REASON_LABEL: Record<string, string> = {
    no_fee_payer: 'אין משלם מוגדר ליחידה',
    no_whatsapp_name: 'חסר שם להודעות אוטומטיות',
    no_phone: 'חסר מספר טלפון',
    invalid_phone: 'מספר טלפון לא תקין',
    cooldown: 'נשלחה הודעה לאחרונה, טרם עברו 24 שעות',
    charge_not_found: 'חיוב לא נמצא',
};

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

export default function ReminderApprovalModal({ isOpen, onClose, onSent, chargeIds, periodMonth }: Props) {
    const [phase, setPhase] = useState<Phase>('loading');
    const [previewItems, setPreviewItems] = useState<PreviewItem[]>([]);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [cardIndex, setCardIndex] = useState(0);
    const [phoneOverrides, setPhoneOverrides] = useState<Record<string, string>>({});
    const [confirmed, setConfirmed] = useState(false);
    const [sendResults, setSendResults] = useState<Array<{ chargeId: string; status: string; reason?: string }>>([]);
    const [isResolvingVars, setIsResolvingVars] = useState(false);

    const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | undefined>(undefined);

    // Fetch templates first, then preview with templateId for server-side variable resolution
    useEffect(() => {
        if (!isOpen || chargeIds.length === 0) return;

        setPhase('loading');
        setFetchError(null);
        setCardIndex(0);
        setPhoneOverrides({});
        setConfirmed(false);
        setSendResults([]);
        setTemplates([]);
        setSelectedTemplateId(undefined);

        fetch('/api/v1/templates')
            .then(r => r.json())
            .then(async (templatesJson) => {
                const loadedTemplates: WhatsappTemplate[] = templatesJson.data ?? [];
                setTemplates(loadedTemplates);
                const defaultTemplate = loadedTemplates.find(t => t.isDefault);
                setSelectedTemplateId(defaultTemplate?.id);
                return fetchPreviewWithTemplate(chargeIds, periodMonth, defaultTemplate?.id);
            })
            .then(items => {
                setPreviewItems(items);
                setPhase('ready');
            })
            .catch(e => {
                setFetchError(e.message ?? 'שגיאה בטעינת הנתונים');
                setPhase('ready');
            });
    }, [isOpen, chargeIds.join(','), periodMonth]);

    // Re-fetch preview with new templateId when user changes template
    const handleTemplateChange = async (newTemplateId: string | undefined) => {
        setSelectedTemplateId(newTemplateId);
        setIsResolvingVars(true);
        try {
            const items = await fetchPreviewWithTemplate(chargeIds, periodMonth, newTemplateId);
            setPreviewItems(items);
        } catch {
            // keep existing preview items on error
        } finally {
            setIsResolvingVars(false);
        }
    };

    // Items that will be sent: no block reason and not a duplicate
    const sendableItems = previewItems.filter(p => p.blockReason === null && !p.isDuplicate);
    // Items only shown as informational (same person, will be deduped)
    const duplicateItems = previewItems.filter(p => p.isDuplicate);
    // Hard-blocked items
    const blockedItems = previewItems.filter(p => p.blockReason !== null);

    const currentCard = sendableItems[cardIndex] ?? null;

    const hasAnyInvalidSlots = sendableItems.some(item => item.invalidSlots?.length > 0);

    const handlePhoneOverride = (chargeId: string, phone: string | null) => {
        setPhoneOverrides(prev => {
            const next = { ...prev };
            if (phone === null) delete next[chargeId];
            else next[chargeId] = phone;
            return next;
        });
    };

    const handleSend = async () => {
        setPhase('sending');

        const bulkBatchId = sendableItems.length > 1 ? generateUUID() : undefined;

        const messages = sendableItems.map(item => {
            const rawPhone = phoneOverrides[item.chargeId] ?? item.recipientPhone ?? '';
            const recipientPhone = normalizeIsraeliPhone(rawPhone) ?? rawPhone;
            return {
                chargeId: item.chargeId,
                recipientPhone,
                recipientName: item.recipientName!,
                recipientPersonId: item.recipientPersonId,
                periodMonth,
            };
        });

        try {
            const res = await fetch('/api/v1/reminders/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages, bulkBatchId, templateId: selectedTemplateId }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'שגיאת שרת');
            setSendResults(json.data ?? []);
        } catch {
            setSendResults(sendableItems.map(item => ({ chargeId: item.chargeId, status: 'failed', reason: 'שגיאת רשת' })));
        } finally {
            setPhase('done');
            onSent();
        }
    };

    const sentCount = sendResults.filter(r => r.status === 'sent').length;
    const failedCount = sendResults.filter(r => r.status === 'failed').length;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={phase === 'sending' ? undefined : onClose}
                        className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50"
                    />

                    {/* Panel */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.97, y: 16 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.97, y: 16 }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        dir="rtl"
                        className="fixed inset-x-4 top-[5vh] bottom-[5vh] sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 sm:w-[520px] bg-white rounded-2xl shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-gray-50/50 shrink-0">
                            <div>
                                <h2 className="text-lg font-bold text-apro-navy">שליחת תזכורות</h2>
                                {phase === 'ready' && (
                                    <p className="text-sm text-gray-500 mt-0.5">
                                        {sendableItems.length} הודעות ישלחו
                                        {blockedItems.length > 0 && ` · ${blockedItems.length} חסומות`}
                                    </p>
                                )}
                            </div>
                            {phase !== 'sending' && (
                                <button
                                    onClick={onClose}
                                    className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition-colors text-gray-400"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            )}
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-5">

                            {/* Loading */}
                            {phase === 'loading' && (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                                    <Loader2 className="w-8 h-8 animate-spin text-apro-green" />
                                    <p className="font-medium">טוען פרטי שליחה...</p>
                                </div>
                            )}

                            {/* Fetch error */}
                            {phase === 'ready' && fetchError && (
                                <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-700 font-medium flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4 shrink-0" />
                                    {fetchError}
                                </div>
                            )}

                            {/* Ready state */}
                            {(phase === 'ready' || phase === 'sending') && !fetchError && (
                                <>
                                    {/* Template selector (only when more than one template is available) */}
                                    {templates.length > 1 && (
                                        <div>
                                            <label className="text-xs text-gray-400 font-medium block mb-1.5">
                                                תבנית הודעה
                                            </label>
                                            <select
                                                value={selectedTemplateId ?? ''}
                                                onChange={e => handleTemplateChange(e.target.value || undefined)}
                                                disabled={isResolvingVars}
                                                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-700 hover:border-apro-green focus:outline-none focus:ring-2 focus:ring-apro-green/30 transition-colors bg-white disabled:opacity-50"
                                            >
                                                <option value="">ברירת מחדל (ללא תבנית מפורשת)</option>
                                                {templates.map(t => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.name}{t.isDefault ? ' ★' : ''}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Blocked + duplicate warnings */}
                                    {(blockedItems.length > 0 || duplicateItems.length > 0) && (
                                        <div className="bg-red-50 border border-red-100 rounded-xl p-4 space-y-2">
                                            <p className="text-sm font-bold text-red-800 flex items-center gap-2">
                                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                                {blockedItems.length > 0
                                                    ? `${blockedItems.length} חיובים לא ישלחו`
                                                    : 'הודעות שיאוחדו'}
                                            </p>
                                            <ul className="space-y-1.5">
                                                {blockedItems.map(item => (
                                                    <li key={item.chargeId} className="text-sm text-red-700 flex items-start gap-2">
                                                        <span className="mt-0.5 shrink-0">·</span>
                                                        <span>
                                                            {item.buildingAddress && `${item.unitIdentifier} · ${item.buildingAddress} — `}
                                                            {BLOCK_REASON_LABEL[item.blockReason!] ?? item.blockReason}
                                                            {(item.blockReason === 'no_whatsapp_name' || item.blockReason === 'no_phone') && item.recipientPersonId && (
                                                                <Link
                                                                    href={`/dashboard/people/${item.recipientPersonId}`}
                                                                    className="mr-1.5 underline font-bold hover:text-red-900"
                                                                    onClick={onClose}
                                                                >
                                                                    תקן עכשיו
                                                                </Link>
                                                            )}
                                                        </span>
                                                    </li>
                                                ))}
                                                {duplicateItems.map(item => (
                                                    <li key={item.chargeId} className="text-sm text-amber-700 flex items-start gap-2">
                                                        <span className="mt-0.5 shrink-0">·</span>
                                                        <span>
                                                            {item.buildingAddress && `${item.unitIdentifier} · ${item.buildingAddress} — `}
                                                            שני חיובים לאותו אדם, תישלח הודעה אחת בלבד
                                                        </span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Carousel */}
                                    {sendableItems.length > 0 && currentCard ? (
                                        <div className="space-y-3">
                                            <ReminderPreviewCard
                                                item={currentCard}
                                                index={cardIndex}
                                                total={sendableItems.length}
                                                phoneOverride={phoneOverrides[currentCard.chargeId]}
                                                onPhoneOverride={handlePhoneOverride}
                                            />

                                            {/* Message body preview */}
                                            {isResolvingVars ? (
                                                <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-2 text-gray-400 text-sm">
                                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                                    טוען תצוגה מקדימה...
                                                </div>
                                            ) : currentCard.resolvedMessage !== null ? (
                                                <div className={`rounded-xl p-4 space-y-2 ${currentCard.invalidSlots.length > 0 ? 'bg-red-50 border border-red-100' : 'bg-gray-50'}`}>
                                                    <p className={`text-xs font-medium flex items-center gap-1.5 ${currentCard.invalidSlots.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                                                        {currentCard.invalidSlots.length > 0
                                                            ? <><AlertTriangle className="w-3.5 h-3.5" />חסרים נתונים להודעה זו — לא ניתן לשלוח</>
                                                            : <><MessageSquare className="w-3.5 h-3.5" />תצוגה מקדימה של ההודעה</>
                                                        }
                                                    </p>
                                                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                                                        {currentCard.resolvedMessage}
                                                    </p>
                                                </div>
                                            ) : null}

                                            {/* Carousel nav */}
                                            {sendableItems.length > 1 && (
                                                <div className="flex items-center justify-between">
                                                    <button
                                                        onClick={() => setCardIndex(i => Math.max(0, i - 1))}
                                                        disabled={cardIndex === 0}
                                                        className="p-2 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </button>
                                                    <span className="text-sm text-gray-400 font-medium">
                                                        {cardIndex + 1} / {sendableItems.length}
                                                    </span>
                                                    <button
                                                        onClick={() => setCardIndex(i => Math.min(sendableItems.length - 1, i + 1))}
                                                        disabled={cardIndex === sendableItems.length - 1}
                                                        className="p-2 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-30 transition-colors"
                                                    >
                                                        <ChevronLeft className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        !fetchError && blockedItems.length > 0 && sendableItems.length === 0 && (
                                            <div className="text-center py-8 text-gray-400">
                                                <p className="font-medium">כל החיובים שנבחרו חסומים לשליחה</p>
                                            </div>
                                        )
                                    )}

                                    {/* Confirmation checkbox */}
                                    {sendableItems.length > 0 && (
                                        <label className="flex items-start gap-3 cursor-pointer group">
                                            <input
                                                type="checkbox"
                                                checked={confirmed}
                                                onChange={e => setConfirmed(e.target.checked)}
                                                className="mt-0.5 w-4 h-4 accent-apro-green cursor-pointer"
                                            />
                                            <span className="text-sm font-medium text-gray-600 group-hover:text-gray-800 transition-colors leading-relaxed">
                                                בדקתי את ההודעות ואני מאשר שליחה
                                            </span>
                                        </label>
                                    )}
                                </>
                            )}

                            {/* Sending */}
                            {phase === 'sending' && (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                                    <Loader2 className="w-8 h-8 animate-spin text-apro-green" />
                                    <p className="font-medium">שולח הודעות...</p>
                                </div>
                            )}

                            {/* Done */}
                            {phase === 'done' && (
                                <div className="flex flex-col items-center justify-center h-full gap-4 text-center">
                                    <div className="bg-apro-green/10 p-5 rounded-full">
                                        <Send className="w-8 h-8 text-apro-green" />
                                    </div>
                                    <div>
                                        <p className="text-lg font-bold text-apro-navy mb-1">הושלם</p>
                                        {sentCount > 0 && (
                                            <p className="text-gray-500 text-sm">{sentCount} הודעות נשלחו בהצלחה</p>
                                        )}
                                        {failedCount > 0 && (
                                            <p className="text-red-500 text-sm">{failedCount} הודעות נכשלו</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="px-6 py-2.5 bg-apro-navy text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
                                    >
                                        סגור
                                    </button>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        {(phase === 'ready' || phase === 'sending') && !fetchError && sendableItems.length > 0 && (
                            <div className="px-6 py-5 border-t border-gray-100 shrink-0 flex gap-3">
                                <button
                                    onClick={handleSend}
                                    disabled={!confirmed || phase === 'sending' || hasAnyInvalidSlots}
                                    title={hasAnyInvalidSlots ? 'לא ניתן לשלוח — חסרים נתונים בחלק מההודעות' : undefined}
                                    className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-apro-green text-white hover:bg-emerald-600 shadow-sm"
                                >
                                    {phase === 'sending'
                                        ? <Loader2 className="w-5 h-5 animate-spin" />
                                        : <>
                                            <Send className="w-4 h-4" />
                                            אשר ושלח {sendableItems.length} הודעות
                                          </>
                                    }
                                </button>
                                <button
                                    onClick={onClose}
                                    disabled={phase === 'sending'}
                                    className="px-5 py-3 rounded-xl font-bold bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    ביטול
                                </button>
                            </div>
                        )}
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
