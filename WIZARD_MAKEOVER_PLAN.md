# Wizard Makeover — Implementation Plan

## Phases

### Phase 1 — Foundation ✅
- [x] Add `xlsx` dependency (`pnpm add xlsx`)
- [x] Create `app/lib/wizard/wizardTypes.ts` — `WizardPersonUI`, `WizardUnitUI`
- [x] Delete `app/lib/wizard/parseClipboardToUnits.ts`
- [x] Update `lib/api/schemas/buildingOnboard.ts` — `units.min(0)`
- [x] Update `packages/db/src/schema/people.ts` — unique index on `phone`
- [x] Generate + apply Drizzle migration (migration: `0002_wooden_blink.sql`)

### Phase 2 — useWizardState refactor ✅
- [x] Switch state from `WizardUnit[]` to `WizardUnitUI[]`
- [x] Add `numUnits: number | undefined` state
- [x] Add `setNumUnitsAndRegenerate(n)` — generates units "1".."n", truncates/extends
- [x] Add `applyExcelUnits(units: WizardUnitUI[])` — replaces `applyPastedUnits`
- [x] Remove `addUnit`, `removeUnit`, `applyPastedUnits`
- [x] Update auto fee_payer logic in `updateUnit`

### Phase 3 — Step 1: "Number of Units" field ✅
- [x] Add required `מספר דירות` number input to `Step1BuildingDetails.tsx`
- [x] Wire to `wizard.setNumUnitsAndRegenerate`
- [x] Update `isStepValid()` in `index.tsx` to require `numUnits >= 1`

### Phase 4 — Excel utility ✅
- [x] Create `app/lib/wizard/excelTemplate.ts`
  - `downloadExcelTemplate(units)` — 7-column template, pre-fill unit numbers
  - `parseExcelToUnits(file, expectedUnitNumbers)` — parse, validate, return result

### Phase 5 — Step 2: Full overhaul ✅
- [x] Static unit number column (read-only span)
- [x] Split owner name → `שם פרטי` + `שם משפחה` columns
- [x] Split tenant name → `שם פרטי` + `שם משפחה` columns
- [x] Remove clipboard paste handler, pasteError/pasteSuccess state
- [x] Remove add-row button, delete-row button
- [x] Add Excel download + upload toolbar (above table)
- [x] Add `placeholder:text-right` to all inputs
- [x] Add duplicate phone banner (Change 6 frontend)
- [x] Update `isStepValid()` — remove unit-number checks, add duplicate phone check

### Phase 6 — Step 3: Badge + amount validation ✅
- [x] Replace `<select>` with badge + click-to-open dropdown
- [x] Badge colors matching `people/[id]/page.tsx` pattern
- [x] `none` → plain "ללא" text, no badge
- [x] Amount validation: block negatives (inline error), soft warn >₪9,999
- [x] Change amount input `min` from 1 to 0

### Phase 7 — API: Phone pre-check ✅
- [x] Add phone pre-check block before transaction in `POST /api/v1/buildings/onboard`
- [x] Same-name match → silently reuse `existing_id`
- [x] Different-name match → return HTTP 409 `{ error: 'PHONE_CONFLICT', conflicts: [...] }`

### Phase 8 — Conflict Resolution Modal ✅
- [x] Create `app/components/buildings/onboarding-wizard/ConflictResolutionModal.tsx`
  - All conflicts in one modal, each row has inline "use existing" / "change details" options
  - "המשך" activates only when all rows resolved
- [x] Wire into `index.tsx`:
  - `conflicts` state + `setConflicts`
  - On 409 → set conflicts → show modal
  - `handleConflictResolve` → apply `existing_id` to wizard state → re-submit
  - `handleConflictCancel` → close modal, manager edits

### Phase 9 — Payload transform + index.tsx cleanup ✅
- [x] `handleFinalSubmit` — transform `WizardUnitUI[]` → API payload:
  - Concatenate `first_name + last_name` → `full_name`
  - Strip owner/tenant if both name and phone are empty
- [x] Conflict `existing_id` injected into wizard state before re-submit

---

## Key Decisions (resolved)
- Unit numbering: **1-based** (1, 2, 3...)
- Blank unit fee_payer default: **'none'**; 'tenant' only when tenant data exists
- Fee payer in Step 3: **badge display + click dropdown** (not read-only, not plain select)
- Conflict modal: **all conflicts shown at once**, per-row resolution
- Database: clean — unique index migration applied directly

## Files Changed
| File | Action |
|---|---|
| `app/lib/wizard/wizardTypes.ts` | New |
| `app/lib/wizard/excelTemplate.ts` | New |
| `app/lib/wizard/parseClipboardToUnits.ts` | Delete |
| `app/components/buildings/onboarding-wizard/ConflictResolutionModal.tsx` | New |
| `lib/api/schemas/buildingOnboard.ts` | Edit |
| `useWizardState.ts` | Edit |
| `Step1BuildingDetails.tsx` | Edit |
| `Step2UnitsPeople.tsx` | Edit |
| `Step3Payments.tsx` | Edit |
| `index.tsx` | Edit |
| `app/api/v1/buildings/onboard/route.ts` | Edit |
| `packages/db/src/schema/people.ts` | Edit |
| New Drizzle migration | New |
| Root `package.json` | Add `xlsx` |
