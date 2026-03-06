import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createSupabaseServerClient() {
    const cookieStore = await cookies()
    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Called from a Server Component — middleware will handle refresh
                    }
                },
            },
        }
    )
}

// getUser() returns app_metadata from auth.users.raw_app_meta_data (stored in DB),
// not from the JWT claims. The custom_access_token_hook injects tenant_id into the
// JWT only, so we must decode the JWT directly to read hook-injected claims.
export async function getServerUser() {
    const supabase = await createSupabaseServerClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return { user: null, tenantId: null }

    const { data: { session } } = await supabase.auth.getSession()
    const jwtPayload = session?.access_token
        ? JSON.parse(Buffer.from(session.access_token.split('.')[1], 'base64').toString())
        : null
    const tenantId = (jwtPayload?.app_metadata?.tenant_id as string) ?? null

    return { user, tenantId }
}
