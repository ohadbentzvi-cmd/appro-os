import { z } from 'zod';

const personSchema = z.object({
    existing_id: z.string().uuid().optional(),
    full_name: z.string().min(1, 'Name is required'),
    phone: z.string().min(1, 'Phone is required'),
});

const unitSchema = z.object({
    unit_number: z.string().min(1, 'Unit number is required'),
    floor: z.number().int().min(0).optional(),
    notes: z.string().optional(),
    owner: personSchema.optional(),
    tenant: personSchema.optional(),
    fee_payer: z.enum(['owner', 'tenant', 'none']),
    monthly_amount_agorot: z.number().int().min(1).optional(),
});

export const buildingOnboardSchema = z.object({
    building: z.object({
        name: z.string().min(1, 'Building name is required'),
        street: z.string().min(1, 'Street is required'),
        street_number: z.string().min(1, 'Street number is required'),
        city: z.string().min(1, 'City is required'),
        floors: z.number().int().min(1).optional(),
        year_built: z.number().int().min(1800).optional(),
    }),
    units: z.array(unitSchema).min(1, 'At least one unit is required'),
});

export type BuildingOnboardPayload = z.infer<typeof buildingOnboardSchema>;
export type WizardUnit = BuildingOnboardPayload['units'][number];
