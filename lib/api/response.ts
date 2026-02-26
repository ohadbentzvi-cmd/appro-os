import { captureApiError } from '@/lib/api/sentry';

export function successResponse(data: unknown, meta?: object) {
    return Response.json({ data, error: null, meta: meta ?? {} })
}

export async function errorResponse(message: string, status: number, error?: any) {
    if (error && status >= 500) {
        await captureApiError(error);
    }
    return Response.json(
        { data: null, error: message, meta: {} },
        { status }
    )
}
