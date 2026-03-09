# WhatsApp Payment Reminders — Implementation Plan

## Status legend
- [ ] Not started
- [x] Done
- [~] In progress

---

## Phase 1 — DB Schema & Migrations
*Goal: establish all data model changes before any API or UI work.*

- [x] `packages/db/src/schema/people.ts` — add `whatsapp_name: text('whatsapp_name')` (nullable)
- [x] `packages/db/src/schema/reminder-logs.ts` — new Drizzle table definition
- [x] `packages/db/src/schema/index.ts` — export reminder-logs + inferred types
- [x] Run `pnpm db:generate` → produced `migrations/0001_tearful_metal_master.sql`
- [x] `packages/db/migrations/manual/005_reminder_logs_rls.sql` — RLS policy + two perf indexes

### reminder_logs columns
| Column | Type | Notes |
|--------|------|-------|
| id | uuid PK | defaultRandom() |
| tenant_id | uuid NOT NULL | tenant isolation |
| charge_id | uuid FK→charges | cascade delete |
| recipient_person_id | uuid FK→people | set null on delete; snapshot recipient |
| recipient_phone | text NOT NULL | phone snapshot at send time |
| recipient_name_used | text NOT NULL | whatsapp_name snapshot at send time |
| twilio_message_sid | text | returned by Twilio; used for webhook matching |
| status | enum | queued → sent → delivered / failed |
| failure_reason | text nullable | populated by Twilio webhook |
| sent_at | timestamptz | defaultNow() |
| delivered_at | timestamptz nullable | populated by Twilio webhook |
| sent_by_person_id | uuid FK→people | manager who triggered send; set null on delete |
| bulk_batch_id | uuid nullable | shared across all messages in one bulk action |

### RLS + indexes (005_reminder_logs_rls.sql)
- Tenant isolation policy (same pattern as 002_rls.sql)
- `idx_reminder_logs_cooldown` on (tenant_id, recipient_person_id, sent_at) WHERE status != 'failed'
- `idx_reminder_logs_charge_sent` on (charge_id, sent_at DESC)

---

## Phase 2 — Shared Utilities
*Pure functions, no external dependencies. Tested in Phase 8.*

- [x] `lib/reminders/phone.ts` — `normalizeIsraeliPhone(raw: string): string | null`
  - Strips non-digits; handles `05X...` (10 digits) → `+9725X...`; handles `972...` (12 digits) → `+972...`
  - Returns `null` for anything that doesn't match — caller treats as blocked
- [x] `lib/reminders/month.ts` — `formatHebrewMonthYear(dateStr: string): string`
  - Same month array already used in `app/dashboard/payments/log/page.tsx`
  - Output: e.g. `"מרץ 2025"` — used as Twilio template variable `{{2}}`
- [x] `lib/reminders/cooldown.ts` — `isWithinCooldown(sentAt, nowMs?)` pure helper + `getBlockedPersonIds` DB query

---

## Phase 3 — Backend API ✓

### 3a. Manager role guard (inline, not a separate file)
Used in `/send` and `/preview` routes. Pattern:
```ts
const { user, tenantId } = await getServerUser();
if (!user || !tenantId) return errorResponse('Unauthorized', 401);
const [role] = await db.select().from(appRoles)
  .where(and(eq(appRoles.supabaseUserId, user.id), eq(appRoles.tenantId, tenantId), eq(appRoles.role, 'manager')));
if (!role) return errorResponse('Forbidden', 403);
```

### 3b. `app/api/v1/reminders/preview/route.ts` — POST (manager-only)
- Accepts `{ chargeIds: string[], periodMonth: string }`
- Resolves per-charge: whatsappName, phone, personId (from the charge→unit→unit_roles→people join)
- Runs cooldown query: `reminder_logs WHERE sent_at > NOW() - INTERVAL '24 hours' AND status != 'failed'`
- Deduplicates by recipientPersonId (informational, not a block)
- Returns per-charge: `{ chargeId, unitIdentifier, buildingAddress, recipientName, recipientPhone, recipientPersonId, blockReason: null | 'no_whatsapp_name' | 'no_phone' | 'invalid_phone' | 'cooldown', cooldownSince?, lastReminder?, isDuplicate }`

### 3c. `app/api/v1/reminders/send/route.ts` — POST (manager-only)
- Accepts `{ messages: [{ chargeId, recipientPhone, recipientName, recipientPersonId, periodMonth }], bulkBatchId? }`
- Resolves `sent_by_person_id` from `people WHERE supabase_user_id = user.id`
- Per message (sequential, error-isolated):
  1. INSERT reminder_logs (status='queued')
  2. Call Twilio: ContentSid=`HXfcc7c191dbf0377c007ea43633541d5f`, ContentVariables=`{"1": recipientName, "2": formatHebrewMonthYear(periodMonth)}`
  3. On success: UPDATE status='sent', twilio_message_sid=sid
  4. On failure: UPDATE status='failed', failure_reason=err.message
- Returns `[{ chargeId, status: 'sent'|'failed', sid?, reason? }]`

### 3d. `app/api/v1/reminders/webhook/twilio/route.ts` — POST (no session auth)
```
// DEPLOYMENT NOTE:
// Register in Twilio Console → WhatsApp sender → Status Callback URL:
//   https://<your-railway-domain>/api/v1/reminders/webhook/twilio
// Twilio signs requests using TWILIO_AUTH_TOKEN — no separate secret needed.
```
- Validates Twilio request signature via `twilio.validateRequest()`
- Parses `MessageSid`, `MessageStatus`, `ErrorCode` from form body
- Matches `twilio_message_sid` → updates status + delivered_at / failure_reason
- Unknown SID: log warning, return 200
- Always returns 200 (Twilio retries on non-200)

### 3e. `app/api/v1/reminders/logs/route.ts` — GET (manager-only)
- Query params: `month` (YYYY-MM-01), `building_id`, `status`
- Returns paginated reminder_logs rows joined with people (recipient + sender), charges (period_month), units + buildings
- Includes monthly count in meta: `{ total_this_month: number }`

---

## Phase 4 — Monthly Snapshot Extension ✓
*Extends existing `app/api/v1/charges/monthly-snapshot/route.ts`.*

### Changes to the fee payer query (step 4)
Add `personId: unitRoles.personId` to the select. Expose as `fee_payer_person_id` in each unit object.

### New step 5 — latest reminder per charge
```ts
// selectDistinctOn by chargeId ordered by sent_at DESC
// Inject as last_reminder: { sentAt, status } | null into each unit
```

### Changes to `lib/payments/utils.ts`
Add to `ChargeUnit` and `FlatChargeUnit`:
```ts
fee_payer_person_id: string | null;
last_reminder: { sentAt: string; status: 'queued'|'sent'|'delivered'|'failed' } | null;
```

---

## Phase 5 — People: `whatsapp_name` field ✓

- [ ] `lib/supabase/types.ts` — add `whatsapp_name: string | null` to `Person` interface
- [ ] `lib/api/schemas.ts` — add `whatsappName` to `createPersonSchema` and `updatePersonSchema`
- [ ] `app/api/v1/people/[id]/route.ts` — handle `whatsappName` in PATCH
- [ ] `app/dashboard/people/[id]/page.tsx` — display `whatsapp_name` as a fourth info card; add inline edit button (needed so managers can fix missing name directly from the approval modal's link)
- [ ] `app/components/CreatePersonForm.tsx` — add `whatsappName` optional field below phone

---

## Phase 6 — UI Components

### 6a. `app/components/reminders/ReminderStatusBadge.tsx` (new)
Pure display. Derives all state from `last_reminder`:
| Condition | Display |
|-----------|---------|
| null | `—` |
| status=sent/queued | clock icon + "נשלחה [DD/MM/YYYY]" |
| status=delivered | green check + "נמסרה [DD/MM/YYYY]" |
| status=failed | red X + "נכשלה" |
| sentAt within 24h AND status≠failed | orange clock + "לפני פחות מ-24 שעות" |

### 6b. `app/components/reminders/ReminderPreviewCard.tsx` (new)
One card per sendable message in the approval modal carousel:
- Shows: recipient name, phone (with inline override `<input>`), unit + building, charge month, last reminder status
- Phone override is ephemeral — hint: "לשינוי קבוע, ערוך את פרטי האדם"
- Callback: `onPhoneOverride(chargeId, phone)`

### 6c. `app/components/reminders/ReminderApprovalModal.tsx` (new)
Full-screen modal (`fixed inset-0 z-50`), uses `motion/react` (same as ChargeDetailDrawer):
- Props: `charges: FlatChargeUnit[]`, `periodMonth: string`, `isOpen`, `onClose`, `onSent`
- On open: POST /api/v1/reminders/preview → populate blocked list + sendable cards
- Red banner: lists all blocked entries with links to `/dashboard/people/[personId]`
- Counter: "X הודעות ישלחו, Y חסומות"
- Carousel: `useState<number>` for current card index
- Confirm: disabled until manager has scrolled through at least card 1; or checkbox "בדקתי את ההודעות ואני מאשר שליחה"
- On confirm: POST /api/v1/reminders/send → close modal → call onSent(results)

### 6d. `app/dashboard/payments/ChargesTable.tsx` (modify)
- Add checkbox column (`useState<Set<string>>` for selectedChargeIds)
  - Only enabled on pending/partial rows; header checkbox selects all eligible in view
  - `e.stopPropagation()` on checkbox click to avoid opening drawer
- Add floating action bar at bottom when selection is non-empty: "נבחרו X חיובים · שלח תזכורת לכולם"
- Add "תזכורת אחרונה" column (last before due date column) rendering `<ReminderStatusBadge />`

### 6e. `app/dashboard/buildings/[id]/ChargeDetailDrawer.tsx` (modify)
- Add props: `feePayerPersonId: string | null`, `lastReminder: ...`
- Below fee payer info in header: `<ReminderStatusBadge last_reminder={lastReminder} />`
- Footer: second button "שלח תזכורת" — only when status is pending/partial
  - Opens `<ReminderApprovalModal>` with the single charge

---

## Phase 7 — Reminders Log Page

- [ ] `app/dashboard/payments/reminders/page.tsx` (new, client component)
  - Fetches from `GET /api/v1/reminders/logs`
  - Top: "החודש נשלחו X הודעות" summary bar
  - Columns: תאריך שליחה · נמען · יחידה + בניין · תקופה · סטטוס · נשלח על ידי
  - Bulk batch grouping: rows sharing `bulk_batch_id` get a left-border accent
  - Filters: month picker, building, status (reuse `GlobalFilterBar` pattern)

---

## Phase 8 — Tests (CI, no real Twilio calls)

All tests use Vitest, under `tests/`, matching the existing `tests/schemas.test.ts` pattern.

### `tests/reminders/phone.test.ts`
Unit tests for `lib/reminders/phone.ts`:
- `"0541234567"` → `"+972541234567"` ✓
- `"054-123-4567"` → `"+972541234567"` ✓ (dashes stripped)
- `"+972541234567"` → `"+972541234567"` ✓
- `"972541234567"` → `"+972541234567"` ✓
- `"541234567"` (9 digits, no leading 0) → `null`
- `"123"` → `null`
- `""` → `null`

### `tests/reminders/month.test.ts`
Unit tests for `lib/reminders/month.ts`:
- `"2025-03-01"` → `"מרץ 2025"`
- `"2025-01-01"` → `"ינואר 2025"`
- `"2025-12-01"` → `"דצמבר 2025"`
- `"2024-11-01"` → `"נובמבר 2024"`

### `tests/reminders/schemas.test.ts`
Unit tests for the Zod schemas added in `lib/api/schemas.ts`:
- `reminderPreviewSchema`: valid input, missing chargeIds, empty array, >100 items, invalid periodMonth format
- `reminderSendSchema`: valid single message, empty messages array, missing recipientName, invalid phone (passes — normalization is server-side logic not Zod), periodMonth not first of month

### `tests/reminders/cooldown.test.ts`
Unit tests for cooldown logic extracted into a pure helper `lib/reminders/cooldown.ts`:
- `isWithinCooldown(sentAt: string, nowMs?: number): boolean`
  - sentAt 1 hour ago → true (blocked)
  - sentAt 23h59m ago → true (blocked)
  - sentAt exactly 24h ago → false (allowed)
  - sentAt 25h ago → false (allowed)
- No DB calls — cooldown.ts exports both the DB query function (untested) and this pure time-check helper (tested)

### Running tests
```bash
pnpm vitest run       # from repo root — matches tests/**/*.test.ts
```
Tests are fast (pure functions only) and have zero external dependencies — safe for CI.

---

## File Change Index

| File | Action |
|------|--------|
| `packages/db/src/schema/people.ts` | modify — add whatsapp_name |
| `packages/db/src/schema/reminder-logs.ts` | **new** |
| `packages/db/src/schema/index.ts` | modify — export reminder-logs + types |
| `packages/db/migrations/XXXX_add_reminders.sql` | **new** (generated by drizzle-kit) |
| `packages/db/migrations/manual/005_reminder_logs_rls.sql` | **new** |
| `lib/reminders/phone.ts` | **new** |
| `lib/reminders/month.ts` | **new** |
| `lib/reminders/cooldown.ts` | **new** |
| `lib/supabase/types.ts` | modify — add whatsapp_name to Person |
| `lib/payments/utils.ts` | modify — add fee_payer_person_id, last_reminder |
| `lib/api/schemas.ts` | modify — add reminder + whatsappName schemas |
| `app/api/v1/charges/monthly-snapshot/route.ts` | modify — add fee_payer_person_id + last_reminder |
| `app/api/v1/people/[id]/route.ts` | modify — PATCH handles whatsappName |
| `app/api/v1/reminders/preview/route.ts` | **new** |
| `app/api/v1/reminders/send/route.ts` | **new** |
| `app/api/v1/reminders/logs/route.ts` | **new** |
| `app/api/v1/reminders/webhook/twilio/route.ts` | **new** |
| `app/components/reminders/ReminderStatusBadge.tsx` | **new** |
| `app/components/reminders/ReminderPreviewCard.tsx` | **new** |
| `app/components/reminders/ReminderApprovalModal.tsx` | **new** |
| `app/components/CreatePersonForm.tsx` | modify — add whatsappName field |
| `app/dashboard/people/[id]/page.tsx` | modify — display + edit whatsapp_name |
| `app/dashboard/payments/ChargesTable.tsx` | modify — checkboxes, action bar, reminder column |
| `app/dashboard/buildings/[id]/ChargeDetailDrawer.tsx` | modify — reminder button + status |
| `app/dashboard/payments/reminders/page.tsx` | **new** |
| `tests/reminders/phone.test.ts` | **new** |
| `tests/reminders/month.test.ts` | **new** |
| `tests/reminders/schemas.test.ts` | **new** |
| `tests/reminders/cooldown.test.ts` | **new** |
