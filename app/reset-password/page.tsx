'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSupabaseBrowserClient } from '@/lib/supabase/client'
import { Building2 } from 'lucide-react'

export default function ResetPasswordPage() {
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    const router = useRouter()
    const supabase = createSupabaseBrowserClient()

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirm) {
            setError('הסיסמאות אינן תואמות')
            return
        }
        if (password.length < 6) {
            setError('הסיסמה חייבת להכיל לפחות 6 תווים')
            return
        }

        setLoading(true)
        setError('')

        const { error } = await supabase.auth.updateUser({ password })

        if (error) {
            setError('אירעה שגיאה, נסה שוב')
            setLoading(false)
        } else {
            router.push('/dashboard/buildings')
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
                    <h1 className="text-3xl font-bold text-apro-navy mb-2 tracking-tight">אפרו נדל&quot;ן</h1>
                    <p className="text-gray-500">הגדר סיסמה חדשה</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="סיסמה חדשה"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-apro-green focus:border-apro-green outline-none text-right placeholder-gray-400 transition-all"
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            required
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            placeholder="אימות סיסמה"
                            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-apro-green focus:border-apro-green outline-none text-right placeholder-gray-400 transition-all"
                        />
                        {error && <p className="mt-2 text-sm text-red-600 px-1">{error}</p>}
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-apro-green text-apro-navy py-3.5 rounded-xl hover:brightness-105 transition-all font-bold disabled:opacity-70 flex justify-center items-center shadow-lg shadow-apro-green/20"
                    >
                        {loading ? 'שומר...' : 'שמור סיסמה'}
                    </button>
                </form>
            </div>
        </div>
    )
}
