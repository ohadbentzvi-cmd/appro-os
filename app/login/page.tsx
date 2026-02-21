'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Building2 } from 'lucide-react'

export default function LoginPage() {
    const [activeTab, setActiveTab] = useState<'magic-link' | 'password'>('magic-link')

    const [magicEmail, setMagicEmail] = useState('')
    const [magicLoading, setMagicLoading] = useState(false)
    const [magicSuccess, setMagicSuccess] = useState(false)
    const [magicError, setMagicError] = useState('')

    const [passEmail, setPassEmail] = useState('')
    const [password, setPassword] = useState('')
    const [passLoading, setPassLoading] = useState(false)
    const [passError, setPassError] = useState('')

    const router = useRouter()
    const supabase = createSupabaseBrowserClient()

    const handleMagicLinkSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!magicEmail) return

        setMagicLoading(true)
        setMagicError('')
        setMagicSuccess(false)

        try {
            const { error } = await supabase.auth.signInWithOtp({
                email: magicEmail,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/callback`,
                },
            })

            if (error) {
                setMagicError('אירעה שגיאה, נסה שוב')
            } else {
                setMagicSuccess(true)
            }
        } catch {
            setMagicError('אירעה שגיאה, נסה שוב')
        } finally {
            setMagicLoading(false)
        }
    }

    const handlePasswordSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!passEmail || !password) return

        setPassLoading(true)
        setPassError('')

        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: passEmail,
                password: password,
            })

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    setPassError('אימייל או סיסמה שגויים')
                } else if (error.message.includes('Email not confirmed')) {
                    setPassError('האימייל לא אומת, בדוק את תיבת הדואר')
                } else {
                    setPassError('אירעה שגיאה, נסה שוב')
                }
            } else {
                router.push('/dashboard/buildings')
            }
        } catch {
            setPassError('אירעה שגיאה, נסה שוב')
        } finally {
            setPassLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] p-4 font-sans" dir="rtl">
            <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
                <div className="text-center mb-8">
                    <div className="flex justify-center mb-6">
                        <div className="bg-apro-green p-4 rounded-2xl shadow-lg shadow-apro-green/20">
                            <Building2 className="w-10 h-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold text-apro-navy mb-2 tracking-tight">אפרו נדל"ן</h1>
                    <p className="text-gray-500">התחבר למערכת</p>
                </div>

                <div className="flex bg-gray-100 rounded-xl p-1.5 mb-8">
                    <button
                        onClick={() => {
                            setActiveTab('magic-link')
                            setPassError('')
                            setMagicError('')
                        }}
                        className={`flex-1 py-2.5 px-4 text-sm rounded-lg transition-all ${activeTab === 'magic-link' ? 'bg-white shadow text-apro-navy font-bold' : 'text-gray-500 hover:text-apro-navy'}`}
                    >
                        קישור כניסה
                    </button>
                    <button
                        onClick={() => {
                            setActiveTab('password')
                            setPassError('')
                            setMagicError('')
                        }}
                        className={`flex-1 py-2.5 px-4 text-sm rounded-lg transition-all ${activeTab === 'password' ? 'bg-white shadow text-apro-navy font-bold' : 'text-gray-500 hover:text-apro-navy'}`}
                    >
                        סיסמה
                    </button>
                </div>

                {activeTab === 'magic-link' ? (
                    <div>
                        {magicSuccess ? (
                            <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm text-center border border-green-200">
                                קישור כניסה נשלח לאימייל שלך. בדוק את תיבת הדואר.
                            </div>
                        ) : (
                            <form onSubmit={handleMagicLinkSubmit} className="space-y-5">
                                <div>
                                    <input
                                        id="magic-email"
                                        type="email"
                                        required
                                        value={magicEmail}
                                        onChange={(e) => setMagicEmail(e.target.value)}
                                        placeholder="הזן את כתובת האימייל שלך"
                                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-apro-green focus:border-apro-green outline-none text-right placeholder-gray-400 transition-all"
                                    />
                                    {magicError && <p className="mt-2 text-sm text-red-600 px-1">{magicError}</p>}
                                </div>
                                <button
                                    type="submit"
                                    disabled={magicLoading}
                                    className="w-full bg-apro-green text-apro-navy py-3.5 rounded-xl hover:brightness-105 transition-all font-bold disabled:opacity-70 flex justify-center items-center shadow-lg shadow-apro-green/20"
                                >
                                    {magicLoading ? 'שולח...' : 'שלח קישור כניסה'}
                                </button>
                            </form>
                        )}
                    </div>
                ) : (
                    <form onSubmit={handlePasswordSubmit} className="space-y-5">
                        <div>
                            <input
                                id="pass-email"
                                type="email"
                                required
                                value={passEmail}
                                onChange={(e) => setPassEmail(e.target.value)}
                                placeholder="הזן את כתובת האימייל שלך"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-apro-green focus:border-apro-green outline-none text-right placeholder-gray-400 transition-all"
                            />
                        </div>
                        <div>
                            <input
                                id="password"
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="הזן סיסמה"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-apro-green focus:border-apro-green outline-none text-right placeholder-gray-400 transition-all"
                            />
                            {passError && <p className="mt-2 text-sm text-red-600 px-1">{passError}</p>}
                        </div>
                        <button
                            type="submit"
                            disabled={passLoading}
                            className="w-full bg-apro-green text-apro-navy py-3.5 rounded-xl hover:brightness-105 transition-all font-bold disabled:opacity-70 flex justify-center items-center shadow-lg shadow-apro-green/20"
                        >
                            {passLoading ? 'מתחבר...' : 'כניסה'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
