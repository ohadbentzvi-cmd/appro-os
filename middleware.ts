import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createSupabaseMiddlewareClient } from '@/lib/supabase/middleware'
import { createClient } from '@supabase/supabase-js'

export async function middleware(request: NextRequest) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    const supabase = createSupabaseMiddlewareClient(request, supabaseResponse)

    const {
        data: { user },
    } = await supabase.auth.getUser()

    const path = request.nextUrl.pathname

    if (path.startsWith('/api/v1/') || path.startsWith('/auth/callback')) {
        return supabaseResponse
    }

    let appRole = null

    if (user) {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { data } = await supabaseAdmin
            .from('app_roles')
            .select('role')
            .eq('supabase_user_id', user.id)
            .single()

        appRole = data?.role
    }

    if (path.startsWith('/dashboard')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        if (appRole === 'owner' || appRole === 'tenant') {
            return NextResponse.redirect(new URL('/portal', request.url))
        }
        if (appRole === 'manager') {
            return supabaseResponse
        }
        return NextResponse.redirect(new URL('/login', request.url))
    }

    if (path === '/login') {
        if (user && appRole === 'manager') {
            return NextResponse.redirect(new URL('/dashboard/buildings', request.url))
        }
        return supabaseResponse
    }

    if (path.startsWith('/portal')) {
        if (!user) {
            return NextResponse.redirect(new URL('/login', request.url))
        }
        return supabaseResponse
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/dashboard/:path*',
        '/login',
        '/portal/:path*'
    ],
}
