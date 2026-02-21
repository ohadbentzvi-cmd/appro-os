import { z } from 'zod'

export const createBuildingSchema = z.object({
    address: z.string().min(1),
    city: z.string().min(1),
    floors: z.number().int().positive(),
})

export const updateBuildingSchema = createBuildingSchema.partial()

export const createUnitSchema = z.object({
    unitNumber: z.string().min(1),
    floor: z.number().int(),
})

export const updateUnitSchema = createUnitSchema.partial()

export const createPersonSchema = z.object({
    fullName: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional(),
})

export const updatePersonSchema = createPersonSchema.partial()

export const createUnitRoleSchema = z.object({
    personId: z.string().uuid(),
    roleType: z.enum(['owner', 'tenant', 'guarantor']),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isFeePayer: z.boolean().default(false),
})

export const closeUnitRoleSchema = z.object({
    effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
})
