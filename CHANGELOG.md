# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [0.1.2] - 2026-03-15

### Added
- **WhatsApp availability flag**: New `available_on_whatsapp` boolean field on the `people` table (default `true`). When set to `false`, the reminder preview returns a `not_on_whatsapp` block reason and the charge is excluded from all bulk/single reminder sends.
- **Person profile toggle**: Managers can flip the WhatsApp availability flag directly from the person detail page with immediate visual feedback (error message shown if save fails).
- **Block-reason unit tests**: Extracted `getPreviewBlockReason()` into `lib/reminders/block-reason.ts` with 9 unit tests covering all block paths.

### Changed
- **Reminder preview refactor**: Replaced the inline 80-line guard chain in the preview route with a single call to `getPreviewBlockReason()`, making the route ~70 lines shorter.

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
