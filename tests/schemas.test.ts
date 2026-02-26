import { describe, it, expect } from 'vitest';
import { paymentConfigSchema, generateChargesSchema, paymentSchema } from '@/lib/api/schemas';

describe('Zod Schema Validation', () => {

    describe('unit_payment_config (paymentConfigSchema)', () => {
        it('should pass with valid amount and effective_from', () => {
            const result = paymentConfigSchema.safeParse({ monthlyAmount: 100000, effectiveFrom: '2026-01-01' });
            expect(result.success).toBe(true);
        });

        it('should fail when amount is 0', () => {
            const result = paymentConfigSchema.safeParse({ monthlyAmount: 0, effectiveFrom: '2025-01-01' });
            expect(result.success).toBe(false);
        });

        it('should fail when amount is negative', () => {
            const result = paymentConfigSchema.safeParse({ monthlyAmount: -500, effectiveFrom: '2025-01-01' });
            expect(result.success).toBe(false);
        });

        it('should fail when effective_from is missing', () => {
            const result = paymentConfigSchema.safeParse({ monthlyAmount: 100000 });
            expect(result.success).toBe(false);
        });

        it('should fail when effective_from is a garbage string', () => {
            const result = paymentConfigSchema.safeParse({ monthlyAmount: 100000, effectiveFrom: 'not-a-date' });
            expect(result.success).toBe(false);
        });
    });

    describe('charges/generate (generateChargesSchema)', () => {
        it('should pass with valid period_month as first of month', () => {
            const result = generateChargesSchema.safeParse({ period_month: '2025-02-01' });
            expect(result.success).toBe(true);
        });

        it('should fail when period_month is a mid-month date', () => {
            const result = generateChargesSchema.safeParse({ period_month: '2025-02-15' });
            expect(result.success).toBe(false);
        });

        it('should fail when period_month is missing', () => {
            const result = generateChargesSchema.safeParse({});
            expect(result.success).toBe(false);
        });
    });

    describe('charges/[id]/payments (paymentSchema)', () => {
        it('should pass with valid full payment', () => {
            const result = paymentSchema.safeParse({ amount: 150000, payment_method: 'credit_card', paid_at: '2025-02-10' });
            expect(result.success).toBe(true);
        });

        it('should fail when amount is 0', () => {
            const result = paymentSchema.safeParse({ amount: 0, payment_method: 'bank_transfer', paid_at: '2025-02-10' });
            expect(result.success).toBe(false);
        });

        it('should fail when amount is negative', () => {
            const result = paymentSchema.safeParse({ amount: -100, payment_method: 'cash', paid_at: '2025-02-10' });
            expect(result.success).toBe(false);
        });

        it('should fail when paid_at is in the future', () => {
            // Note: Our Zod schema refinement for past dates was added in the route handler, 
            // but we'll test the date validation in the schema itself. 
            // Wait, looking at paymentSchema, it just checks !isNaN(Date.parse(val)). 
            // The future check is in the route handler logic!
            // Wait, the user specifically asked for "future paid_at (should fail)" in Zod testing?
            // "charges/[id]/payments POST body: valid full payment, amount of 0 (should fail), negative amount (should fail), future paid_at (should fail), invalid payment_method value (should fail)"
            // I'll update the schema to include the future check since it logically belongs there!
            // First, let's write the test that expects it to fail.
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const result = paymentSchema.safeParse({ amount: 1000, payment_method: 'cash', paid_at: tomorrow.toISOString() });
            expect(result.success).toBe(false);
        });

        it('should fail with invalid payment_method value', () => {
            const result = paymentSchema.safeParse({ amount: 1000, payment_method: 'bitcoin', paid_at: '2025-02-10' });
            expect(result.success).toBe(false);
        });
    });

});
