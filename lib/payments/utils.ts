export interface ChargeUnit {
    unit_id: string;
    unit_identifier: string;
    floor: number;
    charge_id: string | null;
    amount_due: number;
    amount_paid: number;
    status: 'pending' | 'paid' | 'partial' | 'waived' | 'no_config';
    due_date: string | null;
    is_overdue: boolean;
    fee_payer_name: string | null;
    fee_payer_role: string | null;
    fee_payer_phone: string | null;
}

export interface BuildingSnapshot {
    building_id: string;
    building_address: string;
    units: ChargeUnit[];
}

export interface MonthlySnapshot {
    period_month: string;
    buildings: BuildingSnapshot[];
}

export interface SnapshotMeta {
    total_units: number;
    total_charges: number;
    unconfigured_units: number;
}

// Filter the snapshot to the selected building (or all buildings)
export function filterByBuilding(snapshot: MonthlySnapshot | null, buildingId: string | null): BuildingSnapshot[] {
    if (!snapshot) return [];
    if (!buildingId || buildingId === 'all') return snapshot.buildings;
    return snapshot.buildings.filter(b => b.building_id === buildingId);
}

// Flatten buildings into a single array of units, injecting building info into each unit
export interface FlatChargeUnit extends ChargeUnit {
    building_id: string;
    building_address: string;
    period_month: string;
}

export function flattenUnits(buildings: BuildingSnapshot[], periodMonth: string): FlatChargeUnit[] {
    const flat: FlatChargeUnit[] = [];
    for (const b of buildings) {
        for (const u of b.units) {
            flat.push({
                ...u,
                building_id: b.building_id,
                building_address: b.building_address,
                period_month: periodMonth
            });
        }
    }
    return flat;
}

// Further filter units to those matching the status filter
export function filterByStatus(units: FlatChargeUnit[], statusFilter: string): FlatChargeUnit[] {
    if (!statusFilter || statusFilter === 'all') return units.filter(u => u.status !== 'no_config'); // Table shouldn't normally render raw no_config rows unless wanted, but requirements say table rows are the operational view. The missing config warning handles no_config. We'll filter them out of the main operational table.

    return units.filter(u => {
        if (u.status === 'no_config') return false;
        if (statusFilter === 'overdue') return u.is_overdue;
        return u.status === statusFilter;
    });
}

// Compute KPI values from a filtered set of units
export function computeKPIs(units: FlatChargeUnit[]) {
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueUnitCount = 0;
    let totalExpected = 0;

    for (const u of units) {
        if (u.status === 'no_config' || u.status === 'waived') continue;

        totalCollected += u.amount_paid;

        if (u.status === 'pending' || u.status === 'partial') {
            const outstanding = u.amount_due - u.amount_paid;
            totalOutstanding += outstanding;
            totalExpected += u.amount_due;
        } else if (u.status === 'paid') {
            totalExpected += u.amount_due;
        }

        if (u.is_overdue) {
            overdueUnitCount++;
        }
    }

    let collectionRate = 0;
    if (totalCollected + totalOutstanding > 0) {
        // totalExpected might not perfectly match due to partials/waived, using formula from before
        collectionRate = (totalCollected / (totalCollected + totalOutstanding)) * 100;
    }

    // Round collection rate to 1 decimal
    collectionRate = Math.round(collectionRate * 10) / 10;

    return {
        totalCollected,
        totalOutstanding,
        collectionRate,
        overdueUnitCount
    };
}
