'use client'

import { useState, useMemo } from 'react'
import { Calendar as CalendarIcon, ExternalLink, Briefcase, DollarSign, ChevronLeft, ChevronRight, Info, Check, X, Trash2, Clock, CheckCircle2, AlertCircle, Receipt } from 'lucide-react'
import { useRota } from '../hooks/useRota'
import { usePayslips } from '../hooks/usePayslips'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'


// Hardcoded anchor: User states next shift starts on "Monday". 
// Given current date (Feb 20, 2026 - Friday), next Monday is Feb 23, 2026.
const ROTA_ANCHOR_UTC = Date.UTC(2026, 1, 23) // Month is 0-indexed (1 = Feb)

function getDaysInMonth(year: number, month: number) {
    return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfMonth(year: number, month: number) {
    let day = new Date(year, month, 1).getDay()
    return day === 0 ? 6 : day - 1 // Convert Sunday=0 to Monday=0
}

// Pay constants derived from payslip (wk ending 14/02/2026):
// 34.5 hrs across 3 shifts = 11.5 hrs/shift, base £15.26/hr, holiday £14.38/hr
// Deductions: tax £59.80 + NI £22.75 + pension £13.27 = £95.82 on £526.47 gross => 18.21%
const HOURS_PER_SHIFT = 11.5
const BASE_RATE = 15.26
const HOLIDAY_RATE = 14.38
const DEDUCTION_RATE = 0.1821

export function ProjectionsAnalytics() {
    const [currentDate, setCurrentDate] = useState(new Date())
    const [dayOverrides, setDayOverrides] = useState<Record<string, 'overtime' | 'absence' | 'holiday'>>({})
    const { settings } = useSystemSettings()

    // Persistent overrides from DB
    const { overrides: bookedOverrides, saveOverrides, deleteOverrideByDate, updateOverrideStatus } = useRota()

    // Actual payslips for confirming past paydays
    const { payslips, deletePayslip } = usePayslips()
    const payslipByDate = useMemo(() => {
        const map: Record<string, number> = {}
        payslips.forEach(p => { map[p.date] = p.net_pay })
        return map
    }, [payslips])

    // Modals State
    const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false)
    const [itemToCancel, setItemToCancel] = useState<{ date: string, type: string, id?: string } | null>(null)
    const [approvalModalOpen, setApprovalModalOpen] = useState(false)
    const [itemToApprove, setItemToApprove] = useState<{ date: string, id: string } | null>(null)

    // Merged overrides for calculation
    const allOverrides = useMemo(() => {
        const result: Record<string, 'overtime' | 'absence' | 'holiday'> = {}
        // Booked (DB) takes base precedence
        bookedOverrides.forEach(o => {
            result[o.date] = o.type
        })
        // Staged (Local) overrides booked locally for visual feedback if needed, 
        // but here we probably want them to be distinct.
        Object.entries(dayOverrides).forEach(([date, type]) => {
            result[date] = type
        })
        return result
    }, [bookedOverrides, dayOverrides])

    const activeStaged = useMemo(() => {
        const abs = Object.keys(dayOverrides).filter(k => dayOverrides[k] === 'absence').sort()
        const hol = Object.keys(dayOverrides).filter(k => dayOverrides[k] === 'holiday').sort()
        const ot = Object.keys(dayOverrides).filter(k => dayOverrides[k] === 'overtime').sort()
        return { abs, hol, ot }
    }, [dayOverrides])

    // handleOpenBooking is no longer needed

    const handleConfirmStaged = async (type: 'overtime' | 'absence') => {
        const dates = Object.keys(dayOverrides).filter(k => dayOverrides[k] === type)
        try {
            await saveOverrides(dates.map(date => ({ date, type, status: 'approved' as const })))
            setDayOverrides(prev => {
                const next = { ...prev }
                dates.forEach(d => delete next[d])
                return next
            })
        } catch (err) {
            console.error(err)
            alert("Failed to confirm overrides.")
        }
    }

    const submitBooking = async () => {
        const formId = "j_NRZWJQb0-a7XxZvz4tGEMcjSxEbT1OkE4gUvilROBUNzdGTFlCWkFPTjk5RlhWNFdNNk4xREtQSy4u"
        const baseUrl = `https://forms.office.com/Pages/ResponsePage.aspx?id=${formId}`

        const holDates = Object.keys(dayOverrides).filter(k => dayOverrides[k] === 'holiday')
        try {
            await saveOverrides(holDates.map(date => ({ date, type: 'holiday' as const, status: 'pending' as const })))
            setDayOverrides(prev => {
                const next = { ...prev }
                holDates.forEach(d => delete next[d])
                return next
            })

            window.open(baseUrl, '_blank')
        } catch (err) {
            console.error(err)
            alert("Failed to save holiday request.")
        }
    }

    const monthName = currentDate.toLocaleString('default', { month: 'long' })
    const year = currentDate.getFullYear()
    const monthIndex = currentDate.getMonth()

    const { days, paydaysThisMonth, shiftsThisMonth, otThisMonth, absencesThisMonth, holidaysThisMonth, projectedNet, weeklyPayMap } = useMemo(() => {
        const daysInMonth = getDaysInMonth(year, monthIndex)
        const firstDayIdx = getFirstDayOfMonth(year, monthIndex)

        const monthStart = new Date(year, monthIndex, 1)
        const calculationStart = new Date(monthStart)
        calculationStart.setDate(calculationStart.getDate() - 14)
        const calculationEnd = new Date(year, monthIndex, daysInMonth + 7)

        const weeklyPayMap: Record<string, number> = {}
        const dailyEarnings: Record<string, number> = {}

        let curr = new Date(calculationStart)
        while (curr <= calculationEnd) {
            const dateStr = curr.toISOString().split('T')[0]

            let isShift = false
            if (settings.is_demo_mode) {
                // Mon-Thu Office Schedule
                const day = curr.getDay()
                isShift = day >= 1 && day <= 4
            } else {
                const dateUTC = Date.UTC(curr.getFullYear(), curr.getMonth(), curr.getDate())
                const diffDays = Math.round((dateUTC - ROTA_ANCHOR_UTC) / 86400000)
                const cycleDay = ((diffDays % 6) + 6) % 6
                isShift = cycleDay < 3
            }

            const override = allOverrides[dateStr]
            let isWorked = isShift && override !== 'absence'
            let isOT = override === 'overtime'
            let isHol = isShift && override === 'holiday'

            let gross = 0
            if (isHol) gross += HOURS_PER_SHIFT * HOLIDAY_RATE         // Holiday: lower rate £14.38/hr
            else if (isWorked) gross += HOURS_PER_SHIFT * BASE_RATE     // Normal shift: £15.26/hr
            if (isOT) gross += HOURS_PER_SHIFT * (BASE_RATE * 1.25)    // OT: +25%

            dailyEarnings[dateStr] = gross * (1 - DEDUCTION_RATE)

            // Paid in arrears: work from Monday to Sunday is paid the *following* Friday.
            const dayOfWeek = curr.getDay()
            const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1

            const currentMonday = new Date(curr)
            currentMonday.setDate(curr.getDate() - daysSinceMonday)

            const paydayFri = new Date(currentMonday)
            paydayFri.setDate(currentMonday.getDate() + 11)

            const paydayStr = paydayFri.toISOString().split('T')[0]

            if (settings.is_demo_mode) {
                // In Demo Mode, accumulate everything into a single payday (last Friday of the month)
                // We'll find the last Friday of whatever month curr is in
                const lastDay = new Date(curr.getFullYear(), curr.getMonth() + 1, 0)
                const lastFriday = new Date(lastDay)
                while (lastFriday.getDay() !== 5) {
                    lastFriday.setDate(lastFriday.getDate() - 1)
                }
                const lastFriStr = lastFriday.toISOString().split('T')[0]
                weeklyPayMap[lastFriStr] = (weeklyPayMap[lastFriStr] || 0) + dailyEarnings[dateStr]
            } else {
                weeklyPayMap[paydayStr] = (weeklyPayMap[paydayStr] || 0) + dailyEarnings[dateStr]
            }

            curr.setDate(curr.getDate() + 1)
        }

        const daysArr = []
        let paydaysCount = 0
        let shiftsCount = 0
        let otCount = 0
        let absencesCount = 0
        let holidaysCount = 0
        let totalMonthNet = 0

        for (let i = 0; i < firstDayIdx; i++) {
            daysArr.push(null)
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, monthIndex, day)
            date.setHours(0, 0, 0, 0)
            const dateStr = date.toISOString().split('T')[0]

            let isShift = false
            if (settings.is_demo_mode) {
                const dw = date.getDay()
                isShift = dw >= 1 && dw <= 4
            } else {
                const dateUTC = Date.UTC(year, monthIndex, day)
                const diffDays = Math.round((dateUTC - ROTA_ANCHOR_UTC) / 86400000)
                const cycleDay = ((diffDays % 6) + 6) % 6
                isShift = cycleDay < 3
            }

            let isPayday = date.getDay() === 5
            if (settings.is_demo_mode) {
                // Ensure only the LAST Friday of the month is a payday in Demo Mode
                const lastDay = new Date(year, monthIndex + 1, 0)
                const lastFriday = new Date(lastDay)
                while (lastFriday.getDay() !== 5) {
                    lastFriday.setDate(lastFriday.getDate() - 1)
                }
                isPayday = date.getDate() === lastFriday.getDate()
            }
            const overrideRecord = bookedOverrides.find(o => o.date === dateStr)
            const override = overrideRecord?.type || dayOverrides[dateStr]
            const isStaged = !!dayOverrides[dateStr]
            const isBooked = !!overrideRecord
            const status = overrideRecord?.status || (isStaged ? 'pending' : 'approved')

            if (override === 'overtime') { otCount++; }
            if (override === 'absence' && isShift) { absencesCount++; }
            if (override === 'holiday' && isShift) { holidaysCount++; }
            if (isShift) shiftsCount++
            if (isPayday) {
                paydaysCount++

                // If the payday is in the past or is today, try to use the actual payslip
                // We use setHours(0,0,0,0) to compare dates purely by day
                const todayMidnight = new Date()
                todayMidnight.setHours(0, 0, 0, 0)
                const isPastOrToday = date <= todayMidnight

                const confirmedPay = payslipByDate[dateStr]

                if (isPastOrToday && confirmedPay !== undefined) {
                    totalMonthNet += confirmedPay
                } else {
                    totalMonthNet += (weeklyPayMap[dateStr] || 0)
                }
            }

            daysArr.push({
                day,
                dateStr,
                date,
                isShift,
                isPayday,
                override,
                isStaged,
                isBooked,
                status,
                id: overrideRecord?.id,
                isToday: new Date().toDateString() === date.toDateString()
            })
        }

        return {
            days: daysArr,
            paydaysThisMonth: paydaysCount,
            shiftsThisMonth: shiftsCount,
            otThisMonth: otCount,
            absencesThisMonth: absencesCount,
            holidaysThisMonth: holidaysCount,
            projectedNet: totalMonthNet,
            weeklyPayMap
        }
    }, [year, monthIndex, allOverrides, dayOverrides, bookedOverrides, payslipByDate])

    const nextMonth = () => {
        setCurrentDate(new Date(year, monthIndex + 1, 1))
    }

    const prevMonth = () => {
        setCurrentDate(new Date(year, monthIndex - 1, 1))
    }

    const handleCancelClick = (dateStr: string, type: string, id?: string) => {
        setItemToCancel({ date: dateStr, type, id })
        setCancelConfirmOpen(true)
    }

    const confirmCancel = async () => {
        if (!itemToCancel) return
        try {
            await deleteOverrideByDate(itemToCancel.date)
            setCancelConfirmOpen(false)
            setItemToCancel(null)
        } catch (err) {
            console.error(err)
            alert("Failed to cancel booking.")
        }
    }

    const handleApproveHoliday = (dateStr: string, id: string) => {
        setItemToApprove({ date: dateStr, id })
        setApprovalModalOpen(true)
    }

    const handleDeletePayslip = async (id: string) => {
        if (!confirm('Are you sure you want to delete this payslip? This will affect your income analytics and total liquidity.')) return
        try {
            await deletePayslip(id)
        } catch (err) {
            console.error(err)
            alert('Failed to delete payslip.')
        }
    }

    const confirmApproval = async () => {
        if (!itemToApprove) return
        try {
            await updateOverrideStatus(itemToApprove.id, 'approved')
            setApprovalModalOpen(false)
            setItemToApprove(null)
        } catch (err) {
            console.error(err)
            alert("Failed to approve holiday.")
        }
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-500">
            {/* Quick Actions & Status Row */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                <a
                    href={settings.is_demo_mode ? "#" : "https://universe.staffline.co.uk/"}
                    target={settings.is_demo_mode ? "_self" : "_blank"}
                    rel="noreferrer"
                    className="lg:col-span-1 bg-gradient-to-br from-[#1d4ed8] to-[#1e3a8a] p-5 rounded-2xl shadow-sm hover:shadow-md transition-all flex flex-col justify-between group overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none group-hover:bg-white/20 transition-all duration-500"></div>
                    <div className="flex items-center justify-between z-10">
                        <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                            <Briefcase className="w-5 h-5 text-white" />
                        </div>
                        <ExternalLink className="w-5 h-5 text-white/50 group-hover:text-white transition-colors" />
                    </div>
                    <div className="mt-6 z-10">
                        <h3 className="text-[16px] font-bold text-white">{settings.is_demo_mode ? 'Work Portal' : 'Staffline Universe'}</h3>
                        <p className="text-[12px] text-blue-200 mt-1">{settings.is_demo_mode ? 'Access your corporate profile' : 'Access your official payslips and portal'}</p>
                    </div>
                </a>

                <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white p-5 rounded-2xl border border-black/[0.06] shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-black/40 uppercase tracking-widest mb-1">
                            <DollarSign className="w-4 h-4 text-emerald-500" /> Pay Cycle
                        </div>
                        <div className="text-[24px] sm:text-[28px] font-black text-black">
                            {paydaysThisMonth} <span className="text-[12px] sm:text-[14px] text-black/40 font-semibold ml-1">Fridays</span>
                        </div>
                        <p className="text-[11px] text-black/40 mt-1">You will be paid {paydaysThisMonth} times in {monthName}.</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-black/[0.06] shadow-sm flex flex-col justify-center">
                        <div className="flex items-center gap-2 text-[11px] font-bold text-black/40 uppercase tracking-widest mb-1">
                            <CalendarIcon className="w-4 h-4 text-blue-500" /> {settings.is_demo_mode ? 'Work Schedule' : 'Rota Projection'}
                        </div>
                        <div className="text-[24px] sm:text-[28px] font-black text-black">
                            {shiftsThisMonth} <span className="text-[12px] sm:text-[14px] text-black/40 font-semibold ml-1">Days</span>
                        </div>
                        <p className="text-[11px] text-black/40 mt-1">{settings.is_demo_mode ? 'Standard Mon-Thu office hours.' : 'Calculated 3-on / 3-off schedule.'}</p>
                    </div>
                    <div className="bg-gradient-to-br from-emerald-500 to-emerald-700 p-5 rounded-2xl shadow-sm flex flex-col justify-center text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none"></div>
                        <div className="flex items-center gap-2 text-[11px] font-bold text-emerald-100 uppercase tracking-widest mb-1 relative z-10">
                            Net Income
                        </div>
                        <div className="text-[24px] sm:text-[28px] font-black relative z-10 flex items-baseline gap-1 privacy-blur">
                            <span className="text-[16px] sm:text-[18px] opacity-70">£</span>
                            {projectedNet.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <p className="text-[11px] text-emerald-100 mt-1 relative z-10">Based on {shiftsThisMonth - absencesThisMonth} worked + {holidaysThisMonth} hol + {otThisMonth} OT. (~18.2% Ded.)</p>
                    </div>
                </div>
            </div>

            {/* Rota Calendar */}
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
                <div className="p-5 border-b border-black/[0.04] flex items-center justify-between bg-black/[0.01]">
                    <div>
                        <h2 className="text-[16px] font-bold text-black flex items-center gap-2">
                            {settings.is_demo_mode ? 'Work & Pay Calendar' : 'Rota & Pay Calendar'}
                        </h2>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 text-black/40 hover:text-black transition-colors">
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span className="text-[12px] font-bold text-black min-w-[90px] text-center">{monthName} {year}</span>
                        <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-black/5 text-black/40 hover:text-black transition-colors">
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="p-5">
                    <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                            <div key={day} className="text-center text-[10px] font-bold uppercase tracking-wider text-black/30 py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1 sm:gap-2">
                        {days.map((d, i) => {
                            if (!d) return <div key={i} className="aspect-square bg-transparent rounded-xl" />

                            const { day, isShift, isPayday, isToday, override, dateStr, isStaged, isBooked } = d
                            const isOvertime = override === 'overtime'
                            const isAbsence = override === 'absence'
                            const isHoliday = override === 'holiday'

                            const handleClick = () => {
                                if (isBooked) {
                                    if (override === 'holiday' && d.status === 'pending') {
                                        handleApproveHoliday(dateStr, d.id!)
                                    } else {
                                        handleCancelClick(dateStr, override!, d.id)
                                    }
                                    return
                                }

                                // Toggle staged state
                                setDayOverrides(prev => {
                                    const current = prev[dateStr]
                                    let next: 'overtime' | 'absence' | 'holiday' | undefined

                                    if (isShift) {
                                        if (!current) next = 'absence'
                                        else if (current === 'absence') next = 'holiday'
                                        else next = undefined
                                    } else {
                                        if (!current) next = 'overtime'
                                        else next = undefined
                                    }

                                    const newOverrides = { ...prev }
                                    if (next) newOverrides[dateStr] = next
                                    else delete newOverrides[dateStr]
                                    return newOverrides
                                })
                            }

                            let bgClass = "bg-black/[0.02] border-transparent"
                            let borderClass = "border-black/[0.08]"
                            let textClass = "text-black/60"

                            if (isOvertime) {
                                bgClass = isBooked ? "bg-orange-100 border-orange-200" : "bg-orange-50/50 border-orange-200/50 border-dashed"
                                textClass = "text-orange-900"
                            } else if (isAbsence) {
                                bgClass = isBooked ? "bg-red-100 border-red-200" : "bg-red-50/50 border-red-200/50 border-dashed"
                                textClass = "text-red-900"
                            } else if (isHoliday) {
                                bgClass = isBooked ? "bg-purple-100 border-purple-200" : "bg-purple-50/50 border-purple-200/50 border-dashed"
                                textClass = "text-purple-900"
                            } else if (isShift && isPayday) {
                                bgClass = "bg-[#dbeafe]"
                                borderClass = "border-emerald-300"
                                textClass = "text-blue-900"
                            } else if (isShift) {
                                bgClass = "bg-[#dbeafe]"
                                textClass = "text-blue-900"
                            } else if (isPayday) {
                                bgClass = "bg-[#d1fae5]"
                                textClass = "text-emerald-900"
                            }

                            if (isToday) {
                                borderClass = "border-black shadow-sm"
                            }

                            return (
                                <div
                                    key={i}
                                    onClick={handleClick}
                                    className={`aspect-square cursor-pointer hover:border-black/20 relative rounded-xl border p-1.5 sm:p-2 sm:pt-1.5 transition-all flex flex-col justify-between select-none ${bgClass} ${borderClass} ${isBooked ? 'ring-1 ring-black/5 shadow-sm' : ''}`}
                                >
                                    <div className="flex justify-between items-start">
                                        <div className="flex flex-col gap-1 items-start">
                                            <span className={`text-[12px] sm:text-[14px] font-bold ${textClass}`}>{day}</span>
                                            {isOvertime && (
                                                <div className="flex items-center gap-0.5 sm:gap-1">
                                                    <span className={`text-[7px] sm:text-[9px] bg-orange-500 text-white px-1 py-0.5 rounded font-bold tracking-widest uppercase shadow-sm ${!isBooked && 'opacity-50'}`}>OT</span>
                                                    {isBooked && <Check className="hidden sm:block w-2.5 h-2.5 text-orange-600" />}
                                                </div>
                                            )}
                                            {isAbsence && (
                                                <div className="flex items-center gap-0.5 sm:gap-1">
                                                    <span className={`text-[7px] sm:text-[9px] bg-red-500 text-white px-1 py-0.5 rounded font-bold tracking-widest uppercase shadow-sm ${!isBooked && 'opacity-50'}`}>ABS</span>
                                                    {isBooked && <Check className="hidden sm:block w-2.5 h-2.5 text-red-600" />}
                                                </div>
                                            )}
                                            {isHoliday && (
                                                <div className="flex items-center gap-0.5 sm:gap-1">
                                                    <span className={`text-[7px] sm:text-[9px] bg-purple-500 text-white px-1 py-0.5 rounded font-bold tracking-widest uppercase shadow-sm ${!isBooked && 'opacity-50'}`}>HOL</span>
                                                    {isBooked && (
                                                        d.status === 'approved'
                                                            ? <Check className="hidden sm:block w-2.5 h-2.5 text-purple-600" />
                                                            : <Clock className="hidden sm:block w-2.5 h-2.5 text-purple-600 animate-pulse" />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        {isPayday && (() => {
                                            const today = new Date(); today.setHours(0, 0, 0, 0)
                                            const isPastOrToday = d.date <= today
                                            const confirmedPay = payslipByDate[dateStr]
                                            const displayAmt = (isPastOrToday && confirmedPay != null) ? confirmedPay : (weeklyPayMap[dateStr] || 0)
                                            return (
                                                <div className="hidden sm:flex flex-col items-end gap-0.5">
                                                    <span className={`font-bold text-[10px] sm:text-[11px] opacity-90 privacy-blur ${isPastOrToday && confirmedPay != null ? 'text-emerald-700' : isPastOrToday ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                        £{displayAmt.toFixed(0)}
                                                    </span>
                                                    {isPastOrToday && confirmedPay != null && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                                                    {isPastOrToday && confirmedPay == null && <AlertCircle className="w-3 h-3 text-amber-400" />}
                                                </div>
                                            )
                                        })()}
                                    </div>
                                    <div className="mt-auto flex items-end justify-between">
                                        {(isShift || isOvertime) && !isAbsence && !isHoliday && (
                                            <div className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${isOvertime ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                        )}
                                        {isPayday && !isShift && !override && (
                                            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500" />
                                        )}
                                    </div>
                                    {isToday && <div className="absolute -top-1 -right-1 w-3 h-3 bg-black rounded-full border-2 border-white" />}
                                </div>
                            )
                        })}
                    </div>

                    {(activeStaged.abs.length > 0 || activeStaged.hol.length > 0 || activeStaged.ot.length > 0) && (
                        <div className="mt-5 p-4 rounded-xl border border-black/[0.08] bg-black/[0.02] flex items-center justify-between">
                            <div className="text-[13px] font-semibold text-black/70 flex flex-wrap gap-2 items-center">
                                Pending Overrides
                                <div className="flex gap-1">
                                    {activeStaged.abs.length > 0 && <span className="px-2 py-0.5 rounded-full bg-red-100 text-[10px] uppercase font-bold text-red-700">{activeStaged.abs.length} ABS</span>}
                                    {activeStaged.hol.length > 0 && <span className="px-2 py-0.5 rounded-full bg-purple-100 text-[10px] uppercase font-bold text-purple-700">{activeStaged.hol.length} HOL</span>}
                                    {activeStaged.ot.length > 0 && <span className="px-2 py-0.5 rounded-full bg-orange-100 text-[10px] uppercase font-bold text-orange-700">{activeStaged.ot.length} OT</span>}
                                </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 block sm:hidden md:flex">
                                {activeStaged.abs.length > 0 && (
                                    <button
                                        onClick={() => handleConfirmStaged('absence')}
                                        className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 text-[12px] font-bold hover:bg-red-100 transition-colors"
                                    >
                                        Confirm Absence
                                    </button>
                                )}
                                {activeStaged.hol.length > 0 && (
                                    <button
                                        onClick={submitBooking}
                                        className="px-3 py-1.5 rounded-lg border border-purple-200 bg-purple-50 text-purple-700 text-[12px] font-bold hover:bg-purple-100 transition-colors"
                                    >
                                        Book Holiday
                                    </button>
                                )}
                                {activeStaged.ot.length > 0 && (
                                    <button
                                        onClick={() => handleConfirmStaged('overtime')}
                                        className="px-3 py-1.5 rounded-lg border border-orange-200 bg-orange-50 text-orange-700 text-[12px] font-bold hover:bg-orange-100 transition-colors"
                                    >
                                        Confirm Overtime
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="mt-6 flex flex-wrap items-center gap-4 text-[11px] text-black/40 font-medium border-t border-black/[0.04] pt-4 select-none">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-[#dbeafe] border border-[#bfdbfe]" /> {settings.is_demo_mode ? 'Office Day' : 'Shift Day'}
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-orange-100 border border-orange-200" /> Booked Overtime
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-red-100 border border-red-200" /> Booked Absence
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-purple-100 border border-purple-200" /> Booked Holiday
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded border border-black/20 border-dashed" /> Staged (Pending)
                        </div>
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" /> Payslip Confirmed
                        </div>
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-3 h-3 text-amber-400" /> Awaiting Payslip
                        </div>
                    </div>
                </div>
            </div>

            {/* Holiday Booking Modal Removed */}

            {/* Cancel Confirmation Modal */}
            {cancelConfirmOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCancelConfirmOpen(false)} />
                    <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-black mb-2">Cancel {itemToCancel?.type} booking?</h3>
                        <p className="text-[14px] text-black/60 mb-6 leading-relaxed">
                            Are you sure you want to remove this booking from your rota on <span className="font-bold text-black">{itemToCancel?.date ? new Date(itemToCancel.date).toLocaleDateString('en-GB') : ''}</span>?
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setCancelConfirmOpen(false)} className="flex-1 py-3 rounded-xl border border-black/[0.1] text-black/60 font-bold text-[14px] hover:bg-black/[0.05] transition-colors">
                                Back
                            </button>
                            <button onClick={confirmCancel} className="flex-1 py-3 rounded-xl bg-red-600 text-white font-bold text-[14px] hover:bg-red-700 transition-colors shadow-lg shadow-red-200">
                                Yes, Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Payslip History section */}
            <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden">
                <div className="p-5 border-b border-black/[0.04] flex items-center justify-between bg-black/[0.01]">
                    <h2 className="text-[16px] font-bold text-black flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-emerald-500" /> Payslip History
                    </h2>
                </div>
                <div className="p-5">
                    {payslips.length === 0 ? (
                        <div className="text-center py-10">
                            <Receipt className="w-10 h-10 text-black/5 mx-auto mb-3" />
                            <p className="text-[13px] font-medium text-black/30">No payslips logged yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {payslips.map(ps => (
                                <div key={ps.id} className="flex items-center justify-between p-4 rounded-xl border border-black/[0.04] bg-black/[0.01] hover:bg-black/[0.02] transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold text-[12px]">
                                            {new Date(ps.date).getDate()}
                                        </div>
                                        <div>
                                            <p className="text-[14px] font-bold text-black">{ps.employer || 'Salary'}</p>
                                            <p className="text-[11px] text-black/40 font-medium">
                                                {new Date(ps.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right">
                                            <p className="text-[16px] font-black text-black privacy-blur">
                                                £{ps.net_pay.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                            </p>
                                            {ps.gross_pay && (
                                                <p className="text-[10px] text-black/30 font-bold uppercase tracking-wider">
                                                    Gross: £{ps.gross_pay.toLocaleString()}
                                                </p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => handleDeletePayslip(ps.id)}
                                            className="p-2 rounded-lg text-black/40 hover:text-red-500 hover:bg-red-50 transition-all"
                                            title="Delete Payslip"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            {approvalModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setApprovalModalOpen(false)} />
                    <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col p-6 text-center animate-in zoom-in-95 duration-200">
                        <div className="w-16 h-16 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center mx-auto mb-4">
                            <Check className="w-8 h-8" />
                        </div>
                        <h3 className="text-lg font-bold text-black mb-1">Approve Holiday?</h3>
                        <p className="text-[12px] text-black/40 font-bold uppercase tracking-wider mb-2">
                            {itemToApprove?.date ? new Date(itemToApprove.date).toLocaleDateString('en-GB') : ''}
                        </p>
                        <p className="text-[14px] text-black/60 mb-6 leading-relaxed">
                            Has your employer officially approved this holiday?
                        </p>
                        <div className="flex flex-col gap-2">
                            <button onClick={confirmApproval} className="w-full py-3 rounded-xl bg-purple-600 text-white font-bold text-[14px] hover:bg-purple-700 transition-colors shadow-lg shadow-purple-200">
                                Yes, Mark as Approved
                            </button>
                            <button onClick={() => { setApprovalModalOpen(false); handleCancelClick(itemToApprove!.date, 'holiday', itemToApprove!.id); }} className="w-full py-3 rounded-xl border border-red-200 text-red-600 font-bold text-[14px] hover:bg-red-50 transition-colors">
                                No, Cancel Holiday
                            </button>
                            <button onClick={() => setApprovalModalOpen(false)} className="w-full py-3 rounded-xl text-black/40 font-bold text-[14px] hover:bg-black/5 transition-colors">
                                Not Yet
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div >
    )
}
