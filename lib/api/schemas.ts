import { z } from 'zod'
import { SYSTEM_FIELDS } from '@apro/db/src/schema'

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
    email: z.string().email().nullable().optional(),
    phone: z.string().optional(),
    whatsappName: z.string().optional(),
    availableOnWhatsapp: z.boolean().optional(),
})

export const updatePersonSchema = createPersonSchema.partial()

export const reminderPreviewSchema = z.object({
    chargeIds: z.array(z.string().uuid()).min(1).max(100),
    periodMonth: z.string().regex(/^\d{4}-\d{2}-01$/, 'Must be YYYY-MM-01 format'),
    templateId: z.string().uuid().optional(),
})

export const reminderSendSchema = z.object({
    messages: z.array(z.object({
        chargeId: z.string().uuid(),
        recipientPhone: z.string().min(1),
        recipientName: z.string().min(1),
        recipientPersonId: z.string().uuid().nullable(),
        periodMonth: z.string().regex(/^\d{4}-\d{2}-01$/, 'Must be YYYY-MM-01 format'),
    })).min(1).max(100),
    bulkBatchId: z.string().uuid().optional(),
    templateId: z.string().uuid().optional(),
})

export const updateTemplateSchema = z.object({
    name: z.string().min(1).optional(),
    isDefault: z.literal(true).optional(),
    variableMapping: z.record(
        z.string().regex(/^\d+$/, 'Key must be a numeric slot number'),
        z.enum(SYSTEM_FIELDS),
    ).optional(),
})

export const createUnitRoleSchema = z.object({
    personId: z.string().uuid(),
    roleType: z.enum(['owner', 'tenant', 'guarantor']),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    isFeePayer: z.boolean().default(false),
    replaceFeePayer: z.boolean().optional(),
})

export const updateUnitRoleSchema = z.object({
    roleType: z.enum(['owner', 'tenant', 'guarantor']).optional(),
    effectiveFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    effectiveTo: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    isFeePayer: z.boolean().optional(),
    replaceFeePayer: z.boolean().optional(),
})

export const paymentConfigSchema = z.object({
    monthlyAmount: z.number().int().positive().max(1000000), // in agorot
    billingDay: z.number().int().min(1).max(28),
})

export const generateChargesSchema = z.object({
    period_month: z.string().regex(/^\d{4}-\d{2}-01$/, "Must be YYYY-MM-01 format")
});

export const paymentSchema = z.object({
    amount: z.number().int().min(1),
    payment_method: z.enum(['cash', 'bank_transfer', 'credit_card', 'portal']),
    paid_at: z.string()
        .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" })
        .refine((val) => {
            if (isNaN(Date.parse(val))) return true; // skip if invalid
            return new Date(val) <= new Date();
        }, { message: "Payment date cannot be in the future" }),
    notes: z.string().max(500).optional().nullable()
});
