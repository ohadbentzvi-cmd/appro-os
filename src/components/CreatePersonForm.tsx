import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '../supabase';

export interface Person {
    id: string;
    full_name: string;
    email: string;
    phone: string;
}

interface CreatePersonFormProps {
    onSuccess: (person: Person) => void;
    onCancel: () => void;
}

export default function CreatePersonForm({ onSuccess, onCancel }: CreatePersonFormProps) {
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPhone, setNewPhone] = useState('');
    const [isCreating, setIsCreating] = useState(false);
    const [createError, setCreateError] = useState<string | null>(null);

    const handleCreatePerson = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError(null);

        if (!newName.trim()) {
            setCreateError('שם מלא הוא שדה חובה');
            return;
        }

        const phoneRegex = /^(05\d{8}|0[23489]\d{7})$/;
        if (!newPhone || !newPhone.match(phoneRegex)) {
            setCreateError('מספר טלפון אינו תקין (יש להזין מספר ישראלי תקין)');
            return;
        }

        if (newEmail && !newEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            setCreateError('אימייל אינו תקין');
            return;
        }

        setIsCreating(true);
        try {
            const { data, error } = await supabase
                .from('people')
                .insert([{
                    full_name: newName,
                    email: newEmail || null,
                    phone: newPhone,
                    tenant_id: '00000000-0000-0000-0000-000000000000'
                }])
                .select()
                .single();

            if (error) throw error;

            if (data) {
                onSuccess(data as Person);
            }
        } catch (error: any) {
            console.error('Create person error:', error);
            setCreateError('אירעה שגיאה ביצירת אדם. אולי האימייל כבר קיים?');
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <form onSubmit={handleCreatePerson} className="bg-gray-50 p-5 rounded-xl border border-gray-200 space-y-4">
            <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-gray-800">יצירת אדם חדש</h3>
                <button type="button" onClick={onCancel} className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1">
                    <X className="w-3 h-3" /> ביטול
                </button>
            </div>

            <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">שם מלא *</label>
                <input
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-apro-green/50"
                    required
                />
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">אימייל</label>
                <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-apro-green/50"
                    dir="ltr"
                />
            </div>
            <div>
                <label className="block text-sm font-semibold text-gray-600 mb-1">טלפון *</label>
                <input
                    type="tel"
                    value={newPhone}
                    onChange={e => setNewPhone(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:ring-2 focus:ring-apro-green/50"
                    required
                    dir="ltr"
                />
            </div>

            {createError && (
                <div className="text-red-500 text-sm font-bold bg-red-50 p-3 rounded-lg flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    {createError}
                </div>
            )}

            <button
                type="submit"
                disabled={isCreating}
                className="w-full py-2.5 bg-apro-navy text-white font-bold rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
            >
                {isCreating && <Loader2 className="w-4 h-4 animate-spin" />}
                שמור
            </button>
        </form>
    );
}
