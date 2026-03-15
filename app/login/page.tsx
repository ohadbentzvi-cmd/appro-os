'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Eye, EyeOff } from 'lucide-react'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'

export default function LoginPage() {
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')
    const [resetSent, setResetSent] = useState(false)
    const [resetLoading, setResetLoading] = useState(false)

    const emailRef = useRef<HTMLInputElement>(null)
    const router = useRouter()
    const supabase = createSupabaseBrowserClient()

    useEffect(() => {
        emailRef.current?.focus()
    }, [])

    const handleForgotPassword = async () => {
        if (!email) {
            setError('הזן אימייל כדי לאפס סיסמה')
            return
        }
        setResetLoading(true)
        setError('')
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        })
        setResetLoading(false)
        if (error) {
            setError('אירעה שגיאה, נסה שוב')
        } else {
            setResetSent(true)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!email || !password) return

        setLoading(true)
        setError('')

        try {
            const { error } = await supabase.auth.signInWithPassword({ email, password })

            if (error) {
                if (error.message.includes('Invalid login credentials')) {
                    setError('אימייל או סיסמה שגויים')
                } else if (error.message.includes('Email not confirmed')) {
                    setError('האימייל לא אומת, בדוק את תיבת הדואר')
                } else {
                    setError('אירעה שגיאה, נסה שוב')
                }
            } else {
                router.push('/dashboard/buildings')
            }
        } catch {
            setError('אירעה שגיאה, נסה שוב')
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] p-4 font-sans" dir="rtl">
            <div className="max-w-md w-full p-8 bg-white rounded-2xl shadow-xl border border-gray-100">
                <div className="flex justify-center mb-8">
                    <Image
                        src="/logo.png"
                        alt="אפרו נדל״ן"
                        width={180}
                        height={56}
                        priority
                    />
                </div>

                {resetSent ? (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl text-sm text-center border border-green-200">
                        קישור לאיפוס סיסמה נשלח לאימייל שלך.
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <input
                                ref={emailRef}
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="אימייל"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-apro-green focus:border-apro-green outline-none text-right placeholder-gray-400 transition-all"
                            />
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="סיסמה"
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-apro-green focus:border-apro-green outline-none text-right placeholder-gray-400 transition-all pl-12"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-apro-navy transition-colors"
                                tabIndex={-1}
                            >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                        </div>
                        {error && <p className="text-sm text-red-600 px-1">{error}</p>}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-apro-green text-apro-navy py-3.5 rounded-xl hover:brightness-105 transition-all font-bold disabled:opacity-70 flex justify-center items-center shadow-lg shadow-apro-green/20"
                        >
                            {loading ? 'מתחבר...' : 'כניסה'}
                        </button>
                        <button
                            type="button"
                            onClick={handleForgotPassword}
                            disabled={resetLoading}
                            className="w-full text-sm text-gray-500 hover:text-apro-navy transition-colors text-center disabled:opacity-50"
                        >
                            {resetLoading ? 'שולח...' : 'שכחתי סיסמה'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}
