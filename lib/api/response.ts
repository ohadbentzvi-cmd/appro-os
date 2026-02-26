import { captureApiError } from '@/lib/api/sentry';

export function successResponse(data: unknown, meta?: object) {
    return Response.json({ data, error: null, meta: meta ?? {} })
}

export async function errorResponse(message: string, status: number, error?: any, request?: Request) {
    if (error && status >= 500) {
        captureApiError(error, request).catch(() => { });
    }
    return Response.json(
        { data: null, error: message, meta: {} },
        { status }
    )
}
