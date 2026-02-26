import * as Sentry from '@sentry/nextjs';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function captureApiError(error: any) {
    try {
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();
        const tenant_id = process.env.APRO_TENANT_ID;

        Sentry.withScope((scope) => {
            if (user) {
                scope.setUser({ id: user.id });
            }
            if (tenant_id) {
                scope.setTag('tenant_id', tenant_id);
            }
            Sentry.captureException(error);
        });
    } catch (fallbackError) {
        // If getting user fails, still capture the original error
        Sentry.captureException(error);
    }
}
