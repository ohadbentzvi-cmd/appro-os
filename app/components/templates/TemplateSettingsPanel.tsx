'use client';

import { useEffect, useState, useRef } from 'react';
import { RefreshCw, Star, StarOff, Pencil, Check, X, ChevronDown, AlertTriangle } from 'lucide-react';
import { type WhatsappTemplate, type SystemField, SYSTEM_FIELDS } from '@apro/db/src/schema';

const SYSTEM_FIELD_LABELS: Record<SystemField, string> = {
    recipient_name:  'שם המקבל',
    amount_due:      'סכום לתשלום',
    due_date:        'תאריך יעד',
    due_month_name:  'שם חודש יעד (למשל: ינואר)',
    building_name:   'שם הבניין',
    unit_number:     'מספר יחידה',
    period_month:    'חודש החיוב',
};

function formatRelativeDate(dateStr: string | Date): string {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86_400_000);
    if (days === 0) return 'היום';
    if (days === 1) return 'אתמול';
    return `לפני ${days} ימים`;
}

function isStale(lastSyncedAt: string | Date): boolean {
    return Date.now() - new Date(lastSyncedAt).getTime() > 7 * 86_400_000;
}

// ---- Inline name editor ----
function NameEditor({ template, onSaved }: { template: WhatsappTemplate; onSaved: (t: WhatsappTemplate) => void }) {
    const [editing, setEditing] = useState(false);
    const [value, setValue] = useState(template.name);
    const [saving, setSaving] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

    const save = async () => {
        if (!value.trim() || value === template.name) { setEditing(false); return; }
        setSaving(true);
        const res = await fetch(`/api/v1/templates/${template.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: value.trim() }),
        });
        const json = await res.json();
        if (res.ok) onSaved(json.data);
        setSaving(false);
        setEditing(false);
    };

    if (!editing) {
        return (
            <div className="flex items-center gap-2">
                <span className="font-bold text-apro-navy">{template.name}</span>
                <button
                    onClick={() => { setValue(template.name); setEditing(true); }}
                    className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-apro-navy transition-colors"
                >
                    <Pencil className="w-3.5 h-3.5" />
                </button>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-2">
            <input
                ref={inputRef}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') setEditing(false); }}
                className="border border-apro-green rounded-lg px-2 py-1 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-apro-green/30"
            />
            <button
                onClick={save}
                disabled={saving}
                className="p-1 rounded bg-apro-green text-white hover:bg-emerald-600 disabled:opacity-50 transition-colors"
            >
                <Check className="w-3.5 h-3.5" />
            </button>
            <button
                onClick={() => setEditing(false)}
                className="p-1 rounded border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
            >
                <X className="w-3.5 h-3.5" />
            </button>
        </div>
    );
}

// ---- Variable mapping row ----
function VariableMappingRow({
    slot,
    currentField,
    onSave,
}: {
    slot: string;
    currentField: SystemField | undefined;
    onSave: (slot: string, field: SystemField | null) => void;
}) {
    return (
        <div className="flex items-center gap-3">
            <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded shrink-0">
                {`{{${slot}}}`}
            </span>
            <div className="relative">
                <select
                    value={currentField ?? ''}
                    onChange={e => onSave(slot, (e.target.value as SystemField) || null)}
                    className="appearance-none bg-white border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm font-medium text-gray-700 hover:border-apro-green focus:outline-none focus:ring-2 focus:ring-apro-green/30 cursor-pointer transition-colors"
                >
                    <option value="">— לא ממופה —</option>
                    {SYSTEM_FIELDS.map(f => (
                        <option key={f} value={f}>{SYSTEM_FIELD_LABELS[f]}</option>
                    ))}
                </select>
                <ChevronDown className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </div>
        </div>
    );
}

// ---- Single template card ----
function TemplateCard({
    template,
    onUpdate,
    onSetDefault,
}: {
    template: WhatsappTemplate;
    onUpdate: (t: WhatsappTemplate) => void;
    onSetDefault: (id: string) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const [settingDefault, setSettingDefault] = useState(false);
    const [savingMapping, setSavingMapping] = useState(false);

    const stale = isStale(template.lastSyncedAt);
    const mapping = (template.variableMapping ?? {}) as Partial<Record<string, SystemField>>;
    const variables = (template.variables ?? []) as string[];
    const allMapped = variables.length > 0 && variables.every(slot => mapping[slot]);

    const handleSetDefault = async () => {
        setSettingDefault(true);
        const res = await fetch(`/api/v1/templates/${template.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isDefault: true }),
        });
        if (res.ok) onSetDefault(template.id);
        setSettingDefault(false);
    };

    const handleMappingChange = async (slot: string, field: SystemField | null) => {
        setSavingMapping(true);
        const newMapping = { ...mapping };
        if (field) newMapping[slot] = field;
        else delete newMapping[slot];

        const res = await fetch(`/api/v1/templates/${template.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ variableMapping: newMapping }),
        });
        const json = await res.json();
        if (res.ok) onUpdate(json.data);
        setSavingMapping(false);
    };

    return (
        <div className={`bg-white rounded-2xl border ${template.isDefault ? 'border-apro-green shadow-sm shadow-apro-green/10' : 'border-gray-200'} p-6 space-y-4`}>
            {/* Header row */}
            <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                    <NameEditor template={template} onSaved={onUpdate} />
                    <p className="font-mono text-xs text-gray-400 truncate">מזהה: {template.twilioTemplateSid}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    {template.isDefault ? (
                        <span className="flex items-center gap-1.5 text-xs font-bold text-apro-green bg-apro-green/10 px-2.5 py-1 rounded-full">
                            <Star className="w-3 h-3 fill-apro-green" />
                            ברירת מחדל
                        </span>
                    ) : (
                        <button
                            onClick={handleSetDefault}
                            disabled={settingDefault}
                            className="flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-apro-navy border border-gray-200 hover:border-gray-300 px-2.5 py-1 rounded-full transition-colors disabled:opacity-50"
                        >
                            <StarOff className="w-3 h-3" />
                            הגדר כברירת מחדל
                        </button>
                    )}
                </div>
            </div>

            {/* Body preview */}
            <div>
                <p className="text-xs text-gray-400 font-medium mb-1.5">תוכן ההודעה</p>
                <p
                    className={`text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed whitespace-pre-wrap cursor-pointer ${expanded ? '' : 'line-clamp-2'}`}
                    onClick={() => setExpanded(v => !v)}
                >
                    {template.body || <span className="italic text-gray-400">לא נמצא תוכן לתבנית זו</span>}
                </p>
                {template.body && template.body.length > 120 && (
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="text-xs text-apro-green hover:underline mt-1"
                    >
                        {expanded ? 'הצג פחות' : 'הצג הכל'}
                    </button>
                )}
            </div>

            {/* Variable mapping */}
            {variables.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-gray-400 font-medium">מיפוי משתנים</p>
                        {!allMapped && (
                            <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                                <AlertTriangle className="w-3 h-3" />
                                לא כל המשתנים ממופים
                            </span>
                        )}
                        {savingMapping && <span className="text-xs text-gray-400">שומר...</span>}
                    </div>
                    <div className="space-y-2">
                        {variables.map(slot => (
                            <VariableMappingRow
                                key={slot}
                                slot={slot}
                                currentField={mapping[slot]}
                                onSave={handleMappingChange}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-gray-100 text-xs text-gray-400">
                <span>
                    סונכרן {formatRelativeDate(template.lastSyncedAt)}
                    {stale && <span className="text-amber-500 font-medium mr-1">· ייתכן שישן</span>}
                </span>
            </div>
        </div>
    );
}

// ---- Main panel ----
export default function TemplateSettingsPanel() {
    const [templates, setTemplates] = useState<WhatsappTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);
    const [syncMessage, setSyncMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    useEffect(() => {
        fetch('/api/v1/templates')
            .then(r => r.json())
            .then(json => setTemplates(json.data ?? []))
            .finally(() => setLoading(false));
    }, []);

    const handleSync = async () => {
        setSyncing(true);
        setSyncMessage(null);
        try {
            const res = await fetch('/api/v1/templates/sync', { method: 'POST' });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error ?? 'שגיאה בסנכרון');
            setTemplates(json.data.templates ?? []);
            setSyncMessage({ type: 'success', text: `סונכרנו ${json.data.synced} תבניות בהצלחה` });
        } catch (e: unknown) {
            setSyncMessage({ type: 'error', text: (e as Error).message ?? 'שגיאה בסנכרון' });
        } finally {
            setSyncing(false);
        }
    };

    const handleUpdate = (updated: WhatsappTemplate) => {
        setTemplates(prev => prev.map(t => t.id === updated.id ? updated : t));
    };

    const handleSetDefault = (newDefaultId: string) => {
        setTemplates(prev => prev.map(t => ({ ...t, isDefault: t.id === newDefaultId })));
    };

    return (
        <div className="space-y-6">
            {/* Section header + sync button */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-apro-navy">תבניות הודעה</h2>
                    <p className="text-sm text-gray-500 mt-0.5">ניתן לשנות שמות ולמפות משתנים</p>
                </div>
                <button
                    onClick={handleSync}
                    disabled={syncing}
                    className="flex items-center gap-2 px-4 py-2.5 bg-apro-navy text-white font-bold rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-60 text-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                    {syncing ? 'מסנכרן...' : 'סנכרן תבניות'}
                </button>
            </div>

            {/* Sync result banner */}
            {syncMessage && (
                <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium ${
                    syncMessage.type === 'success'
                        ? 'bg-apro-green/10 text-apro-green border border-apro-green/20'
                        : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                    {syncMessage.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
                    {syncMessage.text}
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center py-16 text-gray-400">
                    <RefreshCw className="w-5 h-5 animate-spin ml-2" />
                    <span>טוען תבניות...</span>
                </div>
            ) : templates.length === 0 ? (
                <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center space-y-3">
                    <p className="text-lg font-bold text-gray-700">לא נמצאו תבניות</p>
                    <p className="text-sm text-gray-400">לחץ על "סנכרן תבניות" כדי לטעון את תבניות ההודעה שלך</p>
                </div>
            ) : (
                <div className="space-y-4">
                    {templates.map(t => (
                        <TemplateCard
                            key={t.id}
                            template={t}
                            onUpdate={handleUpdate}
                            onSetDefault={handleSetDefault}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
