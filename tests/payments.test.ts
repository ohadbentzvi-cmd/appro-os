import { describe, it, expect } from 'vitest';
import { filterByBuilding, filterByStatus, computeKPIs, BuildingSnapshot, FlatChargeUnit } from '@/lib/payments/utils';

describe('Payment Pure Functions', () => {

    describe('filterByBuilding', () => {
        const mockSnapshot = {
            period_month: '2025-01-01',
            buildings: [
                { building_id: 'b1', building_address: 'Building 1', units: [] },
                { building_id: 'b2', building_address: 'Building 2', units: [] },
            ]
        };

        it('returns all units when buildingId is null', () => {
            const result = filterByBuilding(mockSnapshot, null);
            expect(result.length).toBe(2);
        });

        it('returns all units when buildingId is "all"', () => {
            const result = filterByBuilding(mockSnapshot, 'all');
            expect(result.length).toBe(2);
        });

        it('returns only matching building\'s units when specified', () => {
            const result = filterByBuilding(mockSnapshot, 'b1');
            expect(result.length).toBe(1);
            expect(result[0].building_id).toBe('b1');
        });

        it('returns empty array for unknown building ID', () => {
            const result = filterByBuilding(mockSnapshot, 'b3');
            expect(result.length).toBe(0);
        });
    });

    describe('filterByStatus', () => {
        const mockUnits: FlatChargeUnit[] = [
            { status: 'paid', is_overdue: false } as FlatChargeUnit,
            { status: 'pending', is_overdue: true } as FlatChargeUnit, // overdue
            { status: 'partial', is_overdue: false } as FlatChargeUnit,
            { status: 'no_config', is_overdue: false } as FlatChargeUnit,
        ];

        it('returns everything except no_config for "all"', () => {
            const result = filterByStatus(mockUnits, 'all');
            expect(result.length).toBe(3);
            expect(result.map(u => u.status)).not.toContain('no_config');
        });

        it('returns only paid for "paid"', () => {
            const result = filterByStatus(mockUnits, 'paid');
            expect(result.length).toBe(1);
            expect(result[0].status).toBe('paid');
        });

        it('returns only partial for "partial"', () => {
            const result = filterByStatus(mockUnits, 'partial');
            expect(result.length).toBe(1);
            expect(result[0].status).toBe('partial');
        });

        it('includes rows where is_overdue is true regardless of status value for "overdue"', () => {
            const units = [
                { unit_id: '1', status: 'partial', is_overdue: true, amount_due: 100, amount_paid: 50 } as FlatChargeUnit,
                { unit_id: '2', status: 'pending', is_overdue: false, amount_due: 100, amount_paid: 0 } as FlatChargeUnit,
                { unit_id: '3', status: 'paid', is_overdue: false, amount_due: 100, amount_paid: 100 } as FlatChargeUnit,
            ];

            const result = filterByStatus(units, 'overdue');

            expect(result).toHaveLength(1);
            expect(result[0].unit_id).toBe('1');
            result.forEach(u => {
                expect(u.status).not.toBe('overdue');
            });
        });

        it('does not include rows where status is pending but is_overdue is false', () => {
            const units = [
                { unit_id: '1', status: 'pending', is_overdue: false, amount_due: 100, amount_paid: 0 } as FlatChargeUnit,
            ];
            expect(filterByStatus(units, 'overdue')).toHaveLength(0);
        });
    });

    describe('computeKPIs', () => {
        it('calculates correct totalCollected and totalOutstanding sums', () => {
            const units: FlatChargeUnit[] = [
                { status: 'paid', amount_paid: 1000, amount_due: 1000, is_overdue: false } as FlatChargeUnit,
                { status: 'partial', amount_paid: 300, amount_due: 1000, is_overdue: true } as FlatChargeUnit,
                { status: 'pending', amount_paid: 0, amount_due: 1000, is_overdue: true } as FlatChargeUnit,
            ];

            const kpis = computeKPIs(units);
            expect(kpis.totalCollected).toBe(1300); // 1000 + 300
            expect(kpis.totalOutstanding).toBe(1700); // (1000-300) + (1000-0)
            expect(kpis.overdueUnitCount).toBe(2);
        });

        it('returns collectionRate of 0 when no charges exist (no division by zero)', () => {
            const kpis = computeKPIs([]);
            expect(kpis.collectionRate).toBe(0);
        });

        it('rounds collectionRate to one decimal correctly', () => {
            const units: FlatChargeUnit[] = [
                // 1000 collected out of 3000 total -> 33.333...%
                { status: 'partial', amount_paid: 1000, amount_due: 3000, is_overdue: false } as FlatChargeUnit,
            ];

            const kpis = computeKPIs(units);
            expect(kpis.collectionRate).toBe(33.3);
        });

        it('ignores no_config and waived units', () => {
            const units: FlatChargeUnit[] = [
                { status: 'no_config', amount_paid: 0, amount_due: 1000, is_overdue: false } as FlatChargeUnit,
                { status: 'waived', amount_paid: 0, amount_due: 1000, is_overdue: false } as FlatChargeUnit,
                { status: 'paid', amount_paid: 500, amount_due: 500, is_overdue: false } as FlatChargeUnit,
            ];

            const kpis = computeKPIs(units);
            expect(kpis.totalCollected).toBe(500);
            expect(kpis.totalOutstanding).toBe(0);
            expect(kpis.collectionRate).toBe(100);
        });
    });

});
