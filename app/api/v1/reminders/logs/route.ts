import { NextRequest } from 'next/server';
import { db } from '@apro/db';
import { reminderLogs, appRoles, people, charges, units, buildings } from '@apro/db/src/schema';
import { eq, and, desc, gte, count } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { getServerUser } from '@/lib/supabase/server';
import { errorResponse, successResponse } from '@/lib/api/response';

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
    try {
        const { user, tenantId } = await getServerUser();
        if (!user || !tenantId) return errorResponse('Unauthorized', 401);

        // Manager-only — reminder logs contain PII (names, phones)
        const [role] = await db.select().from(appRoles).where(
            and(
                eq(appRoles.supabaseUserId, user.id),
                eq(appRoles.tenantId, tenantId),
                eq(appRoles.role, 'manager'),
            )
        );
        if (!role) return errorResponse('Forbidden', 403);

        const url = new URL(req.url);
        const buildingId = url.searchParams.get('building_id');
        const statusFilter = url.searchParams.get('status');
        const monthFilter = url.searchParams.get('month'); // YYYY-MM-01
        const offsetParam = parseInt(url.searchParams.get('offset') ?? '0', 10);

        // Aliases for the double join to people
        const recipient = alias(people, 'recipient');
        const sender = alias(people, 'sender');

        const conditions = [eq(reminderLogs.tenantId, tenantId)];
        if (statusFilter) conditions.push(eq(reminderLogs.status, statusFilter as any));
        if (monthFilter) conditions.push(eq(charges.periodMonth, monthFilter));
        if (buildingId) conditions.push(eq(buildings.id, buildingId));

        const rows = await db
            .select({
                id: reminderLogs.id,
                chargeId: reminderLogs.chargeId,
                status: reminderLogs.status,
                sentAt: reminderLogs.sentAt,
                deliveredAt: reminderLogs.deliveredAt,
                failureReason: reminderLogs.failureReason,
                recipientPhone: reminderLogs.recipientPhone,
                recipientNameUsed: reminderLogs.recipientNameUsed,
                bulkBatchId: reminderLogs.bulkBatchId,
                periodMonth: charges.periodMonth,
                unitNumber: units.unitNumber,
                buildingAddress: buildings.addressStreet,
                buildingId: buildings.id,
                recipientFullName: recipient.fullName,
                senderFullName: sender.fullName,
            })
            .from(reminderLogs)
            .innerJoin(charges, eq(charges.id, reminderLogs.chargeId))
            .innerJoin(units, eq(units.id, charges.unitId))
            .innerJoin(buildings, eq(buildings.id, units.buildingId))
            .leftJoin(recipient, eq(recipient.id, reminderLogs.recipientPersonId))
            .leftJoin(sender, eq(sender.id, reminderLogs.sentByPersonId))
            .where(and(...conditions))
            .orderBy(desc(reminderLogs.sentAt))
            .limit(PAGE_SIZE)
            .offset(offsetParam);

        // Monthly count for the summary bar — always current calendar month (UTC)
        const monthStart = new Date();
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);

        const [{ value: totalThisMonth }] = await db
            .select({ value: count() })
            .from(reminderLogs)
            .where(
                and(
                    eq(reminderLogs.tenantId, tenantId),
                    gte(reminderLogs.sentAt, monthStart),
                )
            );

        return successResponse(rows, { totalThisMonth, pageSize: PAGE_SIZE, offset: offsetParam });
    } catch (e) {
        console.error('Reminders logs error', e);
        return errorResponse('Internal server error', 500, e);
    }
}
