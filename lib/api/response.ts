export function successResponse(data: unknown, meta?: object) {
    return Response.json({ data, error: null, meta: meta ?? {} })
}

export function errorResponse(message: string, status: number) {
    return Response.json(
        { data: null, error: message, meta: {} },
        { status }
    )
}
