import { NextRequest } from 'next/server'
import { db, buildings, units } from '@apro/db'
import { eq, sql, desc, lt, and } from 'drizzle-orm'
import { successResponse, errorResponse } from '@/lib/api/response'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { validateBody } from '@/lib/api/validate'
import { createBuildingSchema } from '@/lib/api/schemas'
import { parseCursor, buildMeta } from '@/lib/api/pagination'

export async function GET(req: NextRequest) {
    try {
        const supabase = await createSupabaseServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        const tenantId = user?.app_metadata?.tenant_id as string | undefined

        if (!tenantId) {
            return await errorResponse('Unauthorized', 401)
        }

        const { cursor, limit } = parseCursor(req.nextUrl.searchParams)

        const items = await db
            .select({
                id: buildings.id,
                tenantId: buildings.tenantId,
                name: buildings.name,
                addressStreet: buildings.addressStreet,
                addressCity: buildings.addressCity,
                numFloors: buildings.numFloors,
                numUnits: buildings.numUnits,
                builtYear: buildings.builtYear,
                createdAt: buildings.createdAt,
                unitCount: sql<number>`(
          SELECT count(*)::int 
          FROM "units" 
          WHERE "units"."building_id" = "buildings"."id"
        )`
            })
            .from(buildings)
            .where(cursor ? and(lt(buildings.id, cursor), eq(buildings.tenantId, tenantId)) : eq(buildings.tenantId, tenantId))
            .limit(limit)
            .orderBy(desc(buildings.id))

        return successResponse(items, buildMeta(items, limit))
    } catch (e) {
        console.error('Buildings GET error', e)
        return await errorResponse('Internal server error', 500)
    }
}

export async function POST(req: NextRequest) {
    try {
        const valid = await validateBody(req, createBuildingSchema)
        if ('error' in valid) return valid.error

        const data = valid.data
        const supabase = await createSupabaseServerClient()
        const { data: { user } } = await supabase.auth.getUser()
        const tenantId = user?.app_metadata?.tenant_id as string | undefined

        if (!tenantId) {
            return await errorResponse('Unauthorized', 401)
        }

        const [newBuilding] = await db
            .insert(buildings)
            .values({
                tenantId,
                name: `${data.address} - ${data.city}`, // Dummy name default
                addressStreet: data.address,
                addressCity: data.city,
                numFloors: data.floors,
                numUnits: 0, // Default 0
            })
            .returning()

        return successResponse(newBuilding)
    } catch (e) {
        console.error('Buildings POST error', e)
        return await errorResponse('Internal server error', 500)
    }
}
