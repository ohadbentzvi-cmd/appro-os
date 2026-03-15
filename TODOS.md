# TODOS

## Backlog

### Payment deletion audit log table (P3, S)
Add a persistent `payment_audit_log` table to record payment deletions/reversals (who reverted, when, original payment details). Currently covered by server console logs only, which rotate. Becomes important at scale or for legal/accounting purposes.
- **Depends on:** Nothing — can be added independently.

## Completed

