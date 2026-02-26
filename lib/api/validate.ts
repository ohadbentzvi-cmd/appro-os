import { ZodSchema } from 'zod'
import { errorResponse } from './response'

export async function validateBody<T>(
    req: Request,
    schema: ZodSchema<T>
): Promise<{ data: T } | { error: Response }> {
    try {
        const body = await req.json()
        const data = schema.parse(body)
        return { data }
    } catch (e) {
        return { error: await errorResponse('Invalid request body', 400) }
    }
}
