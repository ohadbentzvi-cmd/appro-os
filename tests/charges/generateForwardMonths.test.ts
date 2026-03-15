import { describe, it, expect } from 'vitest'
import { getForwardMonths } from '@/lib/charges/generateForwardCharges'

describe('getForwardMonths', () => {
    it('returns 12 months by default', () => {
        const result = getForwardMonths(new Date('2026-03-15'))
        expect(result).toHaveLength(12)
    })

    it('starts from the month of the given date, ignoring the day', () => {
        const result = getForwardMonths(new Date('2026-03-28'))
        expect(result[0]).toBe('2026-03-01')
    })

    it('all entries are in YYYY-MM-01 format', () => {
        const result = getForwardMonths(new Date('2026-03-01'))
        for (const m of result) {
            expect(m).toMatch(/^\d{4}-\d{2}-01$/)
        }
    })

    it('handles year rollover correctly', () => {
        const result = getForwardMonths(new Date('2026-10-01'), 4)
        expect(result).toEqual([
            '2026-10-01',
            '2026-11-01',
            '2026-12-01',
            '2027-01-01',
        ])
    })

    it('pads single-digit months with a leading zero', () => {
        const result = getForwardMonths(new Date('2026-01-01'), 2)
        expect(result[0]).toBe('2026-01-01')
        expect(result[1]).toBe('2026-02-01')
    })

    it('respects a custom count', () => {
        const result = getForwardMonths(new Date('2026-03-01'), 3)
        expect(result).toEqual(['2026-03-01', '2026-04-01', '2026-05-01'])
    })

    it('returns a single month when count is 1', () => {
        const result = getForwardMonths(new Date('2026-06-15'), 1)
        expect(result).toEqual(['2026-06-01'])
    })

    it('does not mutate the input date', () => {
        const input = new Date('2026-03-01')
        const original = input.getTime()
        getForwardMonths(input, 12)
        expect(input.getTime()).toBe(original)
    })
})
