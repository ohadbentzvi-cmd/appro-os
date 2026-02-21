export function parseCursor(searchParams: URLSearchParams) {
    return {
        cursor: searchParams.get('cursor') ?? null,
        limit: 25,
    }
}

export function buildMeta(items: unknown[], limit: number) {
    return {
        hasMore: items.length === limit,
        nextCursor: items.length === limit
            ? (items[items.length - 1] as any).id
            : null,
    }
}
