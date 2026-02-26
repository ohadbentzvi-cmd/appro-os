import * as Sentry from '@sentry/nextjs';
import * as jose from 'jose';

export async function captureApiError(
    error: unknown,
    request?: Request
) {
    Sentry.withScope(async (scope) => {
        // Extract tenant_id from env — always available, no network call
        scope.setTag('tenant_id', process.env.APRO_TENANT_ID ?? 'unknown');

        // Extract user_id from JWT cookie synchronously if request is available
        if (request) {
            try {
                const cookieHeader = request.headers.get('cookie') ?? '';
                const match = cookieHeader.match(/sb-[^=]+-auth-token=([^;]+)/);
                if (match) {
                    // Decode without verification — we're just reading metadata, not authenticating
                    const decoded = jose.decodeJwt(decodeURIComponent(match[1]));
                    if (decoded && decoded.sub) {
                        scope.setUser({ id: decoded.sub });
                    }
                }
            } catch {
                // Cookie parsing failed — continue without user context, don't throw
            }
        }

        Sentry.captureException(error);
    });
}
