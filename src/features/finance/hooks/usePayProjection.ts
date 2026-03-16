
import { useMemo } from 'react'
import { useRota } from './useRota'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'

const ROTA_ANCHOR_UTC = Date.UTC(2026, 1, 23) 
const HOURS_PER_SHIFT = 11.5
const BASE_RATE = 15.26
const HOLIDAY_RATE = 14.38
const DEDUCTION_RATE = 0.1821

export function usePayProjection() {
    const { overrides: bookedOverrides } = useRota()
    const { settings } = useSystemSettings()

    const getProjectedPayForDate = (paydayDate: Date) => {
        const paydayStr = paydayDate.toISOString().split('T')[0]
        
        // Work paid on Thu [Date] was earned the previous week (Sun-Sat)
        // Saturday is 5 days before payday
        // Sunday is 11 days before payday
        const workEnd = new Date(paydayDate)
        workEnd.setDate(paydayDate.getDate() - 5)
        workEnd.setHours(23, 59, 59, 999)

        const workStart = new Date(paydayDate)
        workStart.setDate(paydayDate.getDate() - 11)
        workStart.setHours(0, 0, 0, 0)

        let totalNet = 0
        let curr = new Date(workStart)

        while (curr <= workEnd) {
            const dateStr = curr.toISOString().split('T')[0]
            
            let isShift = false
            if (settings.is_demo_mode) {
                const day = curr.getDay()
                isShift = day >= 1 && day <= 4
            } else {
                const dateUTC = Date.UTC(curr.getFullYear(), curr.getMonth(), curr.getDate())
                const diffDays = Math.round((dateUTC - ROTA_ANCHOR_UTC) / 86400000)
                const cycleDay = ((diffDays % 6) + 6) % 6
                isShift = cycleDay < 3
            }

            const overrideRecord = bookedOverrides.find(o => o.date === dateStr)
            const override = overrideRecord?.type
            
            let isWorked = isShift && override !== 'absence'
            let isOT = override === 'overtime'
            let isHol = isShift && override === 'holiday'

            let gross = 0
            if (isHol) gross += HOURS_PER_SHIFT * HOLIDAY_RATE
            else if (isWorked) gross += HOURS_PER_SHIFT * BASE_RATE
            
            if (isOT) {
                const customHours = overrideRecord?.hours ?? HOURS_PER_SHIFT
                const customBonus = overrideRecord?.bonus ?? 0
                gross += (customHours * 20.35) + customBonus
            }

            totalNet += gross * (1 - DEDUCTION_RATE)
            curr.setDate(curr.getDate() + 1)
        }

        return totalNet
    }

    return { getProjectedPayForDate }
}
