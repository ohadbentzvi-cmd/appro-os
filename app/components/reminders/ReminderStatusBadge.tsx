'use client';

import { Clock, CheckCircle, XCircle } from 'lucide-react';
import { isWithinCooldown } from '@/lib/reminders/cooldown';

interface LastReminder {
    sentAt: string;
    status: string;
}

interface Props {
    lastReminder: LastReminder | null;
}

function formatDate(isoStr: string) {
    const d = new Date(isoStr);
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export default function ReminderStatusBadge({ lastReminder }: Props) {
    if (!lastReminder) {
        return <span className="text-gray-300 font-bold">—</span>;
    }

    const { sentAt, status } = lastReminder;

    if (status === 'delivered') {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-green-700">
                <CheckCircle className="w-3.5 h-3.5" />
                נמסרה {formatDate(sentAt)}
            </span>
        );
    }

    if (status === 'failed') {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-red-600">
                <XCircle className="w-3.5 h-3.5" />
                נכשלה
            </span>
        );
    }

    // sent or queued
    if (isWithinCooldown(sentAt)) {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600">
                <Clock className="w-3.5 h-3.5" />
                לפני פחות מ-24 שעות
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            נשלחה {formatDate(sentAt)}
        </span>
    );
}
