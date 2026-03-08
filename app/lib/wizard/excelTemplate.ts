import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import { WizardUnitUI, WizardPersonUI } from './wizardTypes';
import { PHONE_REGEX } from './validation';

// Spreadsheet ML namespace used throughout xlsx XML files
const SS_NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';

export async function downloadExcelTemplate(units: WizardUnitUI[]): Promise<void> {
    // 1. Fetch the template as raw bytes
    const res = await fetch('/templates/units_template.xlsx');
    const buffer = await res.arrayBuffer();

    // 2. Open as ZIP — xlsx is just a ZIP of XML files
    const zip = await JSZip.loadAsync(buffer);

    // 3. Extract the first worksheet XML
    const sheetEntry = zip.file('xl/worksheets/sheet1.xml');
    if (!sheetEntry) throw new Error('Template is missing xl/worksheets/sheet1.xml');
    const sheetXml = await sheetEntry.async('string');

    // 4. Parse the XML so we can surgically update column A cells
    const parser = new DOMParser();
    const doc = parser.parseFromString(sheetXml, 'application/xml');

    const sheetData = doc.getElementsByTagNameNS(SS_NS, 'sheetData')[0]
        ?? doc.getElementsByTagName('sheetData')[0];
    if (!sheetData) throw new Error('No sheetData element found in sheet XML');

    // Build a map of existing row elements keyed by row number
    const existingRows = new Map<number, Element>();
    for (const row of Array.from(sheetData.children)) {
        const r = parseInt(row.getAttribute('r') ?? '0', 10);
        if (r > 1) existingRows.set(r, row); // skip header row 1
    }

    units.forEach((unit, i) => {
        const rowNum = i + 2; // row 1 = header
        const cellRef = `A${rowNum}`;

        let row = existingRows.get(rowNum);

        if (!row) {
            // Template has fewer pre-built rows than units — create a bare row
            row = doc.createElementNS(SS_NS, 'row');
            row.setAttribute('r', String(rowNum));
            sheetData.appendChild(row);
            existingRows.set(rowNum, row);
        }

        // Find or create the A cell in this row
        let cell: Element | null = null;
        for (const c of Array.from(row.children)) {
            if (c.getAttribute('r') === cellRef) { cell = c; break; }
        }
        if (!cell) {
            cell = doc.createElementNS(SS_NS, 'c');
            cell.setAttribute('r', cellRef);
            row.insertBefore(cell, row.firstChild);
        }

        // Write as inline string so we don't need to touch sharedStrings.xml
        cell.setAttribute('t', 'inlineStr');
        // Remove any existing value / formula / inline string children
        while (cell.firstChild) cell.removeChild(cell.firstChild);
        const is = doc.createElementNS(SS_NS, 'is');
        const t = doc.createElementNS(SS_NS, 't');
        t.textContent = unit.unit_number;
        is.appendChild(t);
        cell.appendChild(is);
    });

    // Clear column A in rows beyond the unit count (template may have leftover example rows)
    for (const [rowNum, row] of existingRows) {
        if (rowNum > units.length + 1) {
            for (const c of Array.from(row.children)) {
                if (c.getAttribute('r') === `A${rowNum}`) {
                    row.removeChild(c);
                    break;
                }
            }
        }
    }

    // 5. Serialize back — XMLSerializer preserves all attributes and namespaces
    const serializer = new XMLSerializer();
    const modifiedXml = serializer.serializeToString(doc);

    // 6. Write the modified XML back into the ZIP (all other files untouched)
    zip.file('xl/worksheets/sheet1.xml', modifiedXml);

    // 7. Regenerate the ZIP and trigger browser download
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'units_template.xlsx';
    a.click();
    URL.revokeObjectURL(url);
}


export type CellWarning = {
    unit_number: string;
    field: 'owner_phone' | 'tenant_phone';
    message: string;
};

// ok:true — data imported (with optional non-critical warnings)
// ok:false — critical error, nothing imported
export type ParseExcelResult =
    | { ok: true; units: WizardUnitUI[]; warnings: CellWarning[] }
    | { ok: false; errors: string[] };

export async function parseExcelToUnits(
    file: File,
    expectedUnitNumbers: string[]
): Promise<ParseExcelResult> {
    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1 });

    // Skip header row
    const dataRows = rows.slice(1).filter((r) => r.some((cell) => cell !== undefined && cell !== ''));

    const criticalErrors: string[] = [];
    const warnings: CellWarning[] = [];
    const parsed: WizardUnitUI[] = [];

    for (let i = 0; i < dataRows.length; i++) {
        const row = dataRows[i];
        const rowNum = i + 2; // 1-based, skipping header

        const unitNumber = String(row[0] ?? '').trim();
        const ownerFirst = String(row[1] ?? '').trim();
        const ownerLast = String(row[2] ?? '').trim();
        const ownerPhone = String(row[3] ?? '').trim().replace(/-/g, '');
        const tenantFirst = String(row[4] ?? '').trim();
        const tenantLast = String(row[5] ?? '').trim();
        const tenantPhone = String(row[6] ?? '').trim().replace(/-/g, '');

        if (!unitNumber) continue; // skip fully empty rows

        // CRITICAL: unrecognized unit number
        if (!expectedUnitNumbers.includes(unitNumber)) {
            criticalErrors.push(`שורה ${rowNum}: מספר דירה "${unitNumber}" לא קיים בטבלה`);
            continue;
        }

        // NON-CRITICAL: invalid phone format — import but flag with warning
        if (ownerPhone && !PHONE_REGEX.test(ownerPhone)) {
            warnings.push({
                unit_number: unitNumber,
                field: 'owner_phone',
                message: `טלפון בעל נכס "${ownerPhone}" אינו תקין — יש לתקן לפני שמירה`,
            });
        }
        if (tenantPhone && !PHONE_REGEX.test(tenantPhone)) {
            warnings.push({
                unit_number: unitNumber,
                field: 'tenant_phone',
                message: `טלפון דייר "${tenantPhone}" אינו תקין — יש לתקן לפני שמירה`,
            });
        }

        const owner: WizardPersonUI | undefined =
            ownerFirst || ownerLast || ownerPhone
                ? { first_name: ownerFirst, last_name: ownerLast, phone: ownerPhone }
                : undefined;

        const tenant: WizardPersonUI | undefined =
            tenantFirst || tenantLast || tenantPhone
                ? { first_name: tenantFirst, last_name: tenantLast, phone: tenantPhone }
                : undefined;

        let fee_payer: 'owner' | 'tenant' | 'none' = 'none';
        if (tenant?.first_name || tenant?.phone) fee_payer = 'tenant';
        else if (owner?.first_name || owner?.phone) fee_payer = 'owner';

        parsed.push({ unit_number: unitNumber, owner, tenant, fee_payer });
    }

    if (criticalErrors.length > 0) return { ok: false, errors: criticalErrors };
    return { ok: true, units: parsed, warnings };
}
