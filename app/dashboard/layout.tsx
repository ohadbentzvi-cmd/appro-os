'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Building2, Home, Settings, Users, LogOut, CreditCard } from 'lucide-react';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import * as Sentry from '@sentry/nextjs';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const router = useRouter();
    const supabase = createSupabaseBrowserClient();

    const getNavClass = (path: string) => {
        return pathname?.startsWith(path)
            ? "flex items-center gap-3 px-4 py-3 rounded-xl bg-apro-green text-white font-bold transition-all shadow-lg shadow-apro-green/20"
            : "flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all";
    };

    const handleSignOut = async () => {
        await supabase.auth.signOut();
        router.push('/login');
    };

    return (
        <div className="min-h-screen flex bg-[#f8f9fa] font-sans">
            {/* Right Sidebar Navigation */}
            <aside className="w-64 bg-apro-navy text-white flex flex-col fixed inset-y-0 right-0 z-50 shadow-xl">
                {/* Logo Section */}
                <div className="p-6 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="bg-apro-green p-1.5 rounded-lg">
                            <Building2 className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-xl font-bold tracking-tight">אפרו נדל"ן</span>
                    </div>
                </div>

                {/* Navigation Items */}
                <nav className="flex-grow p-4 space-y-2 mt-4">
                    <Link
                        href="/dashboard/buildings"
                        className={getNavClass("/dashboard/buildings")}
                    >
                        <Home className="w-5 h-5" />
                        <span>עמוד הבית</span>
                    </Link>
                    <Link
                        href="/dashboard/people"
                        className={getNavClass("/dashboard/people")}
                    >
                        <Users className="w-5 h-5" />
                        <span>אנשים</span>
                    </Link>
                    <Link
                        href="/dashboard/payments"
                        className={getNavClass("/dashboard/payments")}
                    >
                        <CreditCard className="w-5 h-5" />
                        <span>תשלומים</span>
                    </Link>
                </nav>

                {/* Bottom Navigation */}
                <div className="p-4 border-t border-white/10 flex flex-col gap-2">
                    <Link
                        href="/dashboard/settings"
                        className={getNavClass("/dashboard/settings") + " group"}
                    >
                        <Settings className="w-5 h-5 group-hover:rotate-45 transition-transform" />
                        <span className="font-medium">מערכת</span>
                    </Link>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-white/70 hover:text-white transition-all text-right w-full"
                    >
                        <LogOut className="w-5 h-5" />
                        <span className="font-medium">יציאה</span>
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="flex-grow mr-64 p-8 lg:p-12">
                <Sentry.ErrorBoundary fallback={<p>An error has occurred in the dashboard component.</p>}>
                    {children}
                </Sentry.ErrorBoundary>
            </main>
        </div>
    );
}
