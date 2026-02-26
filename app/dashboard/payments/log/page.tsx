import React from 'react';
import { db, chargeGenerationLog } from '@apro/db';
import { eq, desc } from 'drizzle-orm';
import GenerateChargesWrapper from '../GenerateChargesWrapper';
import { FileText, CalendarClock, ChevronRight } from 'lucide-react';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const getHebrewMonthYear = (dateArg: Date | string) => {
    const date = new Date(dateArg);
    const months = ["ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני", "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר"];
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

const formatDateTime = (dateArg: Date | string) => {
    const d = new Date(dateArg);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    const HH = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${HH}:${min}`;
};

export default async function PaymentsLogPage() {
    const tenantId = process.env.APRO_TENANT_ID;

    let logs: any[] = [];
    if (tenantId) {
        logs = await db
            .select()
            .from(chargeGenerationLog)
            .where(eq(chargeGenerationLog.tenantId, tenantId))
            .orderBy(desc(chargeGenerationLog.createdAt))
            .limit(50);
    }

    return (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Link
                    href="/dashboard/payments"
                    className="p-2.5 bg-white shadow-sm border border-gray-100 hover:border-apro-green hover:text-apro-green rounded-full transition-all text-gray-500 group"
                >
                    <ChevronRight className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                </Link>
                <div>
                    <h1 className="text-3xl font-bold text-apro-navy mb-1">היסטוריית הפקת חיובים</h1>
                    <p className="text-gray-500 font-medium">צפייה ביומן הפעלות הפקת חיובים במערכת</p>
                </div>
                <div className="mr-auto">
                    <GenerateChargesWrapper />
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
                <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
                    <div className="bg-apro-green/10 p-2 rounded-lg">
                        <CalendarClock className="w-5 h-5 text-apro-green" />
                    </div>
                    <h2 className="text-xl font-bold text-apro-navy">פעולות אחרונות</h2>
                </div>

                {logs.length === 0 ? (
                    <div className="p-20 text-center flex flex-col items-center">
                        <FileText className="w-16 h-16 text-gray-200 mb-4" />
                        <h3 className="text-lg font-bold text-gray-400">לא נמצאו הפקות חיובים</h3>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-right border-collapse">
                            <thead>
                                <tr className="bg-gray-50/50 text-gray-500 text-sm uppercase tracking-wider">
                                    <th className="px-6 py-4 font-semibold">תקופה</th>
                                    <th className="px-6 py-4 font-semibold">הופעל על ידי</th>
                                    <th className="px-6 py-4 font-semibold">חיובים שנוצרו</th>
                                    <th className="px-6 py-4 font-semibold">תאריך הפעלה</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-6 py-5 font-medium text-apro-navy">
                                            {getHebrewMonthYear(log.periodMonth)}
                                        </td>
                                        <td className="px-6 py-5">
                                            {log.triggeredBy === 'manual_api' ? (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600">
                                                    ידני
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-600">
                                                    אוטומטי
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-5">
                                            <span className="font-bold text-apro-navy">
                                                {log.chargesCreated}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-gray-500" dir="ltr" style={{ textAlign: 'right' }}>
                                            {formatDateTime(log.createdAt)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
