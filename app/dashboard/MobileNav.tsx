'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Home, Users, CreditCard, MessageSquare, LogOut, Menu, X } from 'lucide-react';

interface MobileNavProps {
    pathname: string | null;
    onSignOut: () => void;
}

export default function MobileNav({ pathname, onSignOut }: MobileNavProps) {
    const [open, setOpen] = useState(false);

    const getNavClass = (path: string) =>
        pathname?.startsWith(path)
            ? 'flex items-center gap-3 px-4 py-3 rounded-xl bg-apro-green text-white font-bold transition-all shadow-lg shadow-apro-green/20'
            : 'flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all';

    const paymentsNavClass =
        pathname?.startsWith('/dashboard/payments') && !pathname?.startsWith('/dashboard/payments/reminders')
            ? 'flex items-center gap-3 px-4 py-3 rounded-xl bg-apro-green text-white font-bold transition-all shadow-lg shadow-apro-green/20'
            : 'flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all';

    const close = () => setOpen(false);

    return (
        <>
            {/* Mobile top header bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-apro-navy z-40 flex items-center justify-between px-4 shadow-lg">
                <button
                    onClick={() => setOpen(true)}
                    aria-label="פתח תפריט"
                    className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-white/10 text-white transition-all"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <Image src="/logo.png" alt="אפרו נדל״ן" width={100} height={32} className="object-contain" />
            </div>

            {/* Overlay */}
            {open && (
                <div
                    className="lg:hidden fixed inset-0 bg-gray-900/50 z-40"
                    onClick={close}
                />
            )}

            {/* Nav panel — slides in from the physical right using inline styles to bypass Tailwind RTL logical props */}
            <div
                className="lg:hidden fixed top-0 bottom-0 w-72 bg-apro-navy text-white flex flex-col z-50 shadow-xl transition-transform duration-300 ease-out"
                style={{
                    right: 0,
                    transform: open ? 'translateX(0)' : 'translateX(100%)',
                }}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                    <Image src="/logo.png" alt="אפרו נדל״ן" width={110} height={36} className="object-contain" />
                    <button
                        onClick={close}
                        aria-label="סגור תפריט"
                        className="flex items-center justify-center w-11 h-11 rounded-xl hover:bg-white/10 text-white/70 hover:text-white transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Nav links */}
                <nav className="flex-grow p-4 space-y-2 mt-4">
                    <Link href="/dashboard/buildings" className={getNavClass('/dashboard/buildings')} onClick={close}>
                        <Home className="w-5 h-5" />
                        <span>עמוד הבית</span>
                    </Link>
                    <Link href="/dashboard/people" className={getNavClass('/dashboard/people')} onClick={close}>
                        <Users className="w-5 h-5" />
                        <span>אנשים</span>
                    </Link>
                    <Link href="/dashboard/payments" className={paymentsNavClass} onClick={close}>
                        <CreditCard className="w-5 h-5" />
                        <span>תשלומים</span>
                    </Link>
                    <Link href="/dashboard/payments/reminders" className={getNavClass('/dashboard/payments/reminders')} onClick={close}>
                        <MessageSquare className="w-5 h-5" />
                        <span>תקשורת דיירים</span>
                    </Link>
                </nav>

                {/* Sign out */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={() => { close(); onSignOut(); }}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all text-right w-full"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">יציאה</span>
                    </button>
                </div>
            </div>
        </>
    );
}
