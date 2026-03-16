# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.7] - 2026-03-16

### Changed
- **Reminder modal order**: Recipient/unit details now appear before template selection, which appears before the message preview — making the cause-and-effect of template changes immediately visible.
- **Building wizard Step 2 layout**: Excel download/upload buttons moved inline into the section header, eliminating the toolbar row and giving the units table significantly more vertical space.
- **Step indicator spacing**: Reduced bottom margin on the step indicator for a tighter layout across all wizard steps.
- **Wizard phone validation UX**: Invalid-phone and conflicting-phone error banners now only appear when the user clicks "Next", rather than on every keystroke. The Next button on Step 2 is always clickable; clicking it with errors triggers banners listing exactly which units/roles need fixing. Cells still turn red live for immediate visual feedback.

## [0.1.6] - 2026-03-16

### Added
- **Revert charge to pending**: Paid charges can now be reverted to pending via a "החזר לממתין" button in the charge detail drawer, which deletes all associated payment records after a two-step confirmation.

### Changed
- **Bulk pay bar UX**: The "שלח תזכורת" button is now hidden while the pay confirmation flow is active, reducing clutter. The deselect-all "בטל" button is replaced with an "×" icon to avoid appearing as a second cancel button alongside "ביטול".

## [0.1.5] - 2026-03-16

### Added
- **Owner & tenant contact popover**: Clicking a name chip in the building units table opens a popover with phone and email links for that person.

### Changed
- **Units table split view**: The building detail page now shows separate "בעל הנכס" and "דייר" columns (with clickable name chips) instead of a single "איש קשר פעיל" + role badge.
- **Units API expanded**: `GET /api/v1/buildings/[id]/units` now returns `ownerName`, `ownerPhone`, `ownerEmail`, `ownerPersonId`, `tenantName`, `tenantPhone`, `tenantEmail`, `tenantPersonId` instead of `activeOccupantName` / `activeRoleType`.
- **Natural unit ordering**: Units are now ordered by `floor ASC, length(unitNumber) ASC, unitNumber ASC` in both the units and payment-configs APIs, so unit numbers sort naturally (e.g. 1 before 10).

## [0.1.4] - 2026-03-15

### Added
- **Auto-generate charges on building onboarding**: When a building is set up via the onboarding wizard, charges for the next 12 months are automatically created for every unit that has both `monthly_amount` and `billing_day` configured. Uses a single `generate_series` SQL query per unit with `ON CONFLICT DO NOTHING` for idempotency.
- **`effectiveFrom` on payment config update**: When a per-unit or bulk payment config is changed post-onboarding, a month picker ("החל מחודש") lets the manager choose the effective month. Pending charges from that month onwards are deleted and regenerated with the new amount and billing day.
- **Charge generation on first-time bulk config**: When `PaymentConfigBulkEditor` saves config for units that had no prior config, charges are auto-generated for the next 12 months.
- **`lib/charges/generateForwardCharges.ts`**: New pure utility — `getForwardMonths()` (unit-tested, 8 tests) and `generateForwardCharges()` DB helper shared across all three config entry points.

### Changed
- **Login page redesign**: Replaced the `Building2` placeholder icon and tab switcher with the brand logo image (`/logo.png`). Removed the magic-link option — password is now the only login method. Added a show/hide password toggle and auto-focus on the email field.

### Removed
- **Manual charge generation**: Removed "Generate Charges" button (`GenerateChargesWrapper`), the `GenerateChargesModal`, and the generation log page (`/dashboard/payments/log`). Charges are now always auto-generated; no manual trigger needed.
- **Charge generation API endpoints**: Deleted `POST /api/v1/buildings/[id]/generate-charges`, `POST /api/v1/charges/generate`, and `GET /api/v1/charges/generation-log`.
- **`charge_generation_log` table**: Dropped via migration `0009_drop_charge_generation_log`. The `generate_charges_for_month` Postgres function is also removed.

## [0.1.2] - 2026-03-15

### Added
- **WhatsApp availability flag**: New `available_on_whatsapp` boolean field on the `people` table (default `true`). When set to `false`, the reminder preview returns a `not_on_whatsapp` block reason and the charge is excluded from all bulk/single reminder sends.
- **Person profile toggle**: Managers can flip the WhatsApp availability flag directly from the person detail page with immediate visual feedback (error message shown if save fails).
- **Block-reason unit tests**: Extracted `getPreviewBlockReason()` into `lib/reminders/block-reason.ts` with 9 unit tests covering all block paths.

### Changed
- **Reminder preview refactor**: Replaced the inline 80-line guard chain in the preview route with a single call to `getPreviewBlockReason()`, making the route ~70 lines shorter.
- **Blocked reminder display**: Warning items in the reminder modal now show `שם - כתובת - דירה X — סיבה` instead of just the unit number, making it clear which tenant is blocked and why.

## [0.1.1] - 2026-03-15

### Added
- **Payment receipts**: PDF receipt generation for payments via `@react-pdf/renderer`; receipts are idempotent (same number reused), sequential per tenant+year, and race-safe via atomic transaction
- **Bulk payment config editor**: New `PaymentConfigBulkEditor` component on the building page for setting monthly amount and billing day across all units at once
- **New API**: `GET/PATCH /api/v1/buildings/[id]/payment-configs` for bulk reading and updating unit payment configs
- **Password reset flow**: `/reset-password` page and magic-link auth callback support
- **Mobile-responsive dashboard**: Full RTL-aware responsive overhaul across buildings list, unit detail, payments, people, reminders, and navigation (`MobileNav` component)
- **Shared format utilities**: `lib/format.ts` with `formatMoney`, `formatDate`, `formatPeriodMonth`, and `paymentMethodLabels`

### Changed
- **billing_day moved to per-unit**: `billing_day` migrated from `buildings` to `unit_payment_config` (migration `0006`); each unit now has its own billing day (1–28)
- **Payment config simplified**: Removed effective-date versioning (`effective_from` / `effective_until`) — one row per unit enforced by unique constraint; PATCH replaces POST on the single-unit config endpoint
- **Charge generation**: Due date now computed from `upc.billing_day` per unit instead of the building-level value; requires `billing_day IS NOT NULL` to generate
- **Warnings**: Units flagged as unconfigured if `billing_day` is null, even when a payment config row exists
- **Reminder preview**: Template variables resolved server-side in the preview endpoint

### Fixed
- Auth: magic link flow and password reset now handled correctly
- Onboarding: duplicate phone numbers within a single submission no longer cause a 500
- Reminders: `due_month_name` added to charge data fields; guards added for empty template variables
- Receipt counter race: counter increment and receipt insert wrapped in a single transaction — no gaps in sequential receipt numbers

### Removed
- Building-level `billing_day` field removed from schema, API, and UI
- Payment config effective-date versioning columns (`effective_from`, `effective_until`) removed
