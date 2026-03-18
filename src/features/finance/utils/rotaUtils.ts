import type { RotaOverride } from '@/features/finance/types/finance.types'

// Hardcoded anchor: User states next shift starts on "Monday". 
// Given current date (Feb 20, 2026 - Friday), next Monday is Feb 23, 2026.
export const ROTA_ANCHOR_UTC = Date.UTC(2026, 1, 23) // Month is 0-indexed (1 = Feb)

export function isShiftDay(date: Date, overrides: RotaOverride[] = []): boolean {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    
    const override = overrides.find(o => o.date === dateStr)
    
    if (override) {
        if (override.type === 'overtime') return true
        if (override.type === 'absence' || override.type === 'holiday') return false
    }

    const dateUTC = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
    const diffDays = Math.round((dateUTC - ROTA_ANCHOR_UTC) / 86400000)
    const cycleDay = ((diffDays % 6) + 6) % 6
    return cycleDay < 3
}

export function getUpcomingShifts(days: number = 30, overrides: RotaOverride[] = []): Date[] {
    const shifts: Date[] = []
    const start = new Date()
    start.setHours(0, 0, 0, 0)

    for (let i = 0; i < days; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        if (isShiftDay(d, overrides)) {
            shifts.push(d)
        }
    }
    return shifts
}

export function getNextOffPeriod(startDate: Date = new Date(), overrides: RotaOverride[] = []): { start: Date, end: Date } {
    const start = new Date(startDate)
    start.setHours(0, 0, 0, 0)

    let offDays: Date[] = []

    // Scan up to 14 days to find the next off period (extended from 7 to handle edge cases)
    for (let i = 0; i < 14; i++) {
        const d = new Date(start)
        d.setDate(start.getDate() + i)
        const isOff = !isShiftDay(d, overrides)

        if (isOff) {
            // If we find an off day, and it's consecutive with previous off days (or the first one), add it
            if (offDays.length === 0 || (d.getTime() - offDays[offDays.length - 1].getTime()) === 86400000) {
                offDays.push(d)
            } else if (offDays.length > 0) {
                // We found a new off period block.
                break
            }
        } else if (offDays.length > 0) {
            // We were in an off period and hit a shift day
            break
        }
    }

    if (offDays.length === 0) return { start: start, end: start }

    return {
        start: offDays[0],
        end: offDays[offDays.length - 1]
    }
}
