export type ParsedUnit = {
    unit_number: string;
    floor?: number;
    owner?: { full_name: string; phone: string };
    tenant?: { full_name: string; phone: string };
};

export type ParseResult =
    | { ok: true; units: ParsedUnit[] }
    | { ok: false; error: 'TOO_MANY_COLUMNS' | 'EMPTY' | 'MISSING_UNIT_NUMBER' };

export function parseClipboardToUnits(text: string): ParseResult {
    if (!text) return { ok: false, error: 'EMPTY' };

    const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
    if (lines.length === 0) return { ok: false, error: 'EMPTY' };

    const units: ParsedUnit[] = [];

    for (const line of lines) {
        const cols = line.split('\t');

        // Validate column count
        if (cols.length > 6) {
            return { ok: false, error: 'TOO_MANY_COLUMNS' };
        }

        const unitNumber = cols[0]?.trim();
        if (!unitNumber) {
            return { ok: false, error: 'MISSING_UNIT_NUMBER' };
        }

        const unit: ParsedUnit = {
            unit_number: unitNumber,
        };

        // Floor (Col 2)
        const floorStr = cols[1]?.trim();
        if (floorStr) {
            const parsedFloor = parseInt(floorStr, 10);
            if (!isNaN(parsedFloor)) {
                unit.floor = parsedFloor;
            }
        }

        // Owner (Col 3 + Col 4)
        const ownerName = cols[2]?.trim();
        const ownerPhone = cols[3]?.trim() || '';
        if (ownerName) {
            unit.owner = { full_name: ownerName, phone: ownerPhone };
        }

        // Tenant (Col 5 + Col 6)
        const tenantName = cols[4]?.trim();
        const tenantPhone = cols[5]?.trim() || '';
        if (tenantName) {
            unit.tenant = { full_name: tenantName, phone: tenantPhone };
        }

        units.push(unit);
    }

    return { ok: true, units };
}
