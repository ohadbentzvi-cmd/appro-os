import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { db, people } from '@apro/db'
import { eq } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        if (!uuidRegex.test(id)) {
            return errorResponse('Invalid Person ID', 400)
        }

        const [person] = await db.select().from(people).where(eq(people.id, id))
        if (!person) {
            return errorResponse('Person not found', 404)
        }

        if (!person.email) {
            return errorResponse('Person has no email address', 400)
        }

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        )

        const { error } = await supabaseAdmin.auth.admin.inviteUserByEmail(person.email)

        if (error) {
            console.error('Supabase admin invite error', error)
            return errorResponse('Failed to send invite', 500)
        }

        return successResponse({ invited: true })
    } catch (e) {
        console.error('Invite POST error', e)
        return errorResponse('Internal server error', 500)
    }
}
