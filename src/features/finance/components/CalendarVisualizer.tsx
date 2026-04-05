'use client'

import { useState, useMemo } from 'react'
import { Calendar as CalendarIcon, CreditCard, ChevronLeft, ChevronRight, List, LayoutGrid, Tag, X, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecurringObligation } from '../types/finance.types'
import { getLenderLogo, countRemainingPayments } from '../utils/lenderLogos'
import { useRecurring } from '../hooks/useRecurring'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { useRota } from '../hooks/useRota'
import { usePayslips } from '../hooks/usePayslips'

interface ProjectedPayment {
    id: string
    name: string
    amount: number
    date: Date
    group_name: string | null
    category: string | null
    obligation: RecurringObligation
}


function LenderBadge({ name }: { name: string }) {
    const logoSrc = getLenderLogo(name)
    if (logoSrc) {
        return (
            <div className="w-8 h-8 rounded-xl bg-white border border-black/[0.06] flex items-center justify-center overflow-hidden shadow-sm flex-shrink-0">
                <img src={logoSrc} alt={name} className="w-full h-full object-contain p-1" />
            </div>
        )
    }
    const initial = name ? name.charAt(0).toUpperCase() : '?'
    return (
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold text-black border border-black/[0.06] bg-black/[0.02] flex-shrink-0">
            {initial}
        </div>
    )
}

type FilterMode = 'all' | 'debt' | 'subscription'

/** Safely advances a Date by exactly N months, preserving the day-of-month */
function addMonths(date: Date, months: number): Date {
    const d = new Date(date.getTime())
    const targetMonth = d.getMonth() + months
    d.setMonth(targetMonth)
    if (d.getMonth() !== ((targetMonth % 12) + 12) % 12) d.setDate(0)
    return d
}

function toLocalDateStr(date: Date) {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
}

const DEBT_KEYWORDS = ['klarna', 'clearpay', 'currys', 'flexipay', 'loan', 'finance', 'credit']
function isDebt(obs: RecurringObligation) {
    return DEBT_KEYWORDS.some(kw =>
        (obs.name?.toLowerCase() ?? '').includes(kw) ||
        (obs.group_name?.toLowerCase() ?? '').includes(kw) ||
        obs.category === 'debt'
    )
}

// Consistently shared constants for pay projection
const HOURS_PER_SHIFT = 11.5
const BASE_RATE = 15.26
const HOLIDAY_RATE = 14.38
const DEDUCTION_RATE = 0.1821
const ROTA_ANCHOR_UTC = Date.UTC(2026, 1, 23)

export function CalendarVisualizer({ obligations }: { obligations: RecurringObligation[] }) {
    const { markObligationAsPaid } = useRecurring()
    const { settings } = useSystemSettings()
    const { overrides } = useRota()
    const { payslips } = usePayslips()
    const [view, setView] = useState<'calendar' | 'list'>('calendar')
    const [filter, setFilter] = useState<FilterMode>('all')
    const [selectedPayment, setSelectedPayment] = useState<ProjectedPayment | null>(null)
    const [selectedDayPayments, setSelectedDayPayments] = useState<ProjectedPayment[] | null>(null)
    const [calMonth, setCalMonth] = useState(() => {
        const d = new Date()
        d.setDate(1)
        d.setHours(0, 0, 0, 0)
        return d
    })

    const filteredObligations = useMemo(() => {
        if (filter === 'all') return obligations
        if (filter === 'debt') return obligations.filter(isDebt)
        return obligations.filter(o => !isDebt(o))
    }, [obligations, filter])

    // Replicate pay projection map
    const weeklyPayMap = useMemo(() => {
        const year = calMonth.getFullYear()
        const month = calMonth.getMonth()
        const daysInMonth = new Date(year, month + 1, 0).getDate()

        const monthStart = new Date(year, month, 1)
        const calculationStart = new Date(monthStart)
        calculationStart.setDate(calculationStart.getDate() - 14) // 2 week lookback for arrears
        const calculationEnd = new Date(year, month, daysInMonth + 7)

        const map: Record<string, number> = {}
        const dailyEarnings: Record<string, number> = {}

        let curr = new Date(calculationStart)
        while (curr <= calculationEnd) {
            const dateStr = toLocalDateStr(curr)
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

            const overrideRecord = overrides.find(o => o.date === dateStr)
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

            dailyEarnings[dateStr] = gross * (1 - DEDUCTION_RATE)

            const dayOfWeek = curr.getDay()
            const daysSinceSunday = dayOfWeek
            const currentSunday = new Date(curr)
            currentSunday.setDate(curr.getDate() - daysSinceSunday)

            const paydayThu = new Date(currentSunday)
            paydayThu.setDate(currentSunday.getDate() + 11)

            const paydayStr = toLocalDateStr(paydayThu)

            if (settings.is_demo_mode) {                // In Demo Mode, accumulate everything into a single payday (last Thursday of the month)
                // We'll find the last Thursday of whatever month curr is in
                const lastDay = new Date(curr.getFullYear(), curr.getMonth() + 1, 0)
                const lastThursday = new Date(lastDay)
                while (lastThursday.getDay() !== 4) {
                    lastThursday.setDate(lastThursday.getDate() - 1)
                }
                const lastThuStr = toLocalDateStr(lastThursday)
                map[lastThuStr] = (map[lastThuStr] || 0) + dailyEarnings[dateStr]
            } else {
                map[paydayStr] = (map[paydayStr] || 0) + dailyEarnings[dateStr]
            }

            curr.setDate(curr.getDate() + 1)
        }
        return map
    }, [calMonth, overrides, settings.is_demo_mode])

    const payslipByDate = useMemo(() => {
        const map: Record<string, number> = {}
        payslips.forEach(p => { 
            // Match the literal date-split logic from ProjectionsAnalytics for perfect sync
            const dKey = p.date.includes('T') ? p.date.split('T')[0] : p.date
            map[dKey] = p.net_pay 
        })
        return map
    }, [payslips])

    // Build a full set of projected payments for the displayed month
    const calendarData = useMemo(() => {
        const year = calMonth.getFullYear()
        const month = calMonth.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0, 23, 59, 59)

        // Only show today and future payments — never past dates
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const payments: ProjectedPayment[] = []
        filteredObligations.forEach(obs => {
            let current = new Date(obs.next_due_date)
            current.setHours(0, 0, 0, 0)

            // Give the end date a 7-day grace period
            const obsEnd = obs.end_date ? new Date(obs.end_date) : null
            if (obsEnd) obsEnd.setDate(obsEnd.getDate() + 7)
            if (obsEnd) obsEnd.setHours(23, 59, 59, 999)

            let occurrences = 0
            const hasLimit = obs.payments_left != null && obs.payments_left > 0
            const maxOccurrences = hasLimit ? obs.payments_left : Infinity

            while (current <= lastDay) {
                if (hasLimit && occurrences >= maxOccurrences!) break
                if (obsEnd && current > obsEnd) break

                if (current >= firstDay && current >= today) {
                    payments.push({
                        id: `${obs.id}-${current.getTime()}`,
                        name: obs.name,
                        amount: obs.amount,
                        date: new Date(current.getTime()),
                        group_name: obs.group_name,
                        category: obs.category,
                        obligation: obs
                    })
                }

                if (current >= today) occurrences++

                if (obs.frequency === 'weekly') current.setDate(current.getDate() + 7)
                else if (obs.frequency === 'bi-weekly') current.setDate(current.getDate() + 14)
                else if (obs.frequency === 'monthly') current = addMonths(current, 1)
                else if (obs.frequency === 'yearly') current = addMonths(current, 12)
                else break
            }
        })

        // Map day number → payments
        const byDay: Record<number, ProjectedPayment[]> = {}
        payments.forEach(p => {
            const d = p.date.getDate()
            if (!byDay[d]) byDay[d] = []
            byDay[d].push(p)
        })

        const totalMonth = payments.reduce((s, p) => s + p.amount, 0)
        return { byDay, totalMonth, daysInMonth: lastDay.getDate(), startDow: firstDay.getDay() }
    }, [calMonth, filteredObligations])

    // 30-day projection for list view header
    const total30Days = useMemo(() => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const end = new Date(today)
        end.setDate(today.getDate() + 30)

        let total = 0
        filteredObligations.forEach(obs => {
            let current = new Date(obs.next_due_date)
            current.setHours(0, 0, 0, 0)

            const obsEnd = obs.end_date ? new Date(obs.end_date) : null
            if (obsEnd) obsEnd.setDate(obsEnd.getDate() + 7)
            if (obsEnd) obsEnd.setHours(23, 59, 59, 999)

            let occurrences = 0
            const hasLimit = obs.payments_left != null && obs.payments_left > 0
            const maxOccurrences = hasLimit ? obs.payments_left : Infinity

            while (current <= end) {
                if (hasLimit && occurrences >= maxOccurrences!) break
                if (obsEnd && current > obsEnd) break

                if (current >= today) {
                    total += obs.amount
                    occurrences++
                }

                if (obs.frequency === 'weekly') current.setDate(current.getDate() + 7)
                else if (obs.frequency === 'bi-weekly') current.setDate(current.getDate() + 14)
                else if (obs.frequency === 'monthly') current = addMonths(current, 1)
                else if (obs.frequency === 'yearly') current = addMonths(current, 12)
                else break
            }
        })
        return total
    }, [filteredObligations])

    // For list view: group by lender
    const groupedByLender = useMemo(() => {
        const groups: Record<string, { o: RecurringObligation[]; totalRemaining: number }> = {}
        const now = new Date()

        filteredObligations.forEach(obs => {
            const name = obs.name || 'Other'
            if (!groups[name]) groups[name] = { o: [], totalRemaining: 0 }
            groups[name].o.push(obs)

            if (obs.end_date || obs.payments_left) {
                // Use explicitly stored payments_left if set; otherwise derive from dates
                const paymentsLeft = countRemainingPayments(obs.next_due_date, obs.end_date, obs.frequency, now, obs.payments_left)
                groups[name].totalRemaining += obs.amount * paymentsLeft
            }
        })
        return Object.entries(groups).sort((a, b) => b[1].totalRemaining - a[1].totalRemaining)
    }, [filteredObligations])

    if (obligations.length === 0) {
        return (
            <div className="rounded-2xl border border-black/[0.08] bg-white p-6 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-black/[0.03] flex items-center justify-center mb-3">
                    <CalendarIcon className="w-5 h-5 text-black/30" />
                </div>
                <h3 className="text-[14px] font-bold text-black/80">No Upcoming Payments</h3>
                <p className="text-[12px] text-black/40 mt-1">Add subscriptions or debts in settings.</p>
            </div>
        )
    }

    const today = new Date()
    const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

    return (
        <div className="rounded-2xl border border-black/[0.08] bg-white overflow-hidden shadow-sm">
            {/* Header */}
            <div className="p-3 sm:p-4 border-b border-black/[0.06] flex flex-col sm:flex-row sm:items-center justify-between bg-black/[0.01] gap-3">
                <div className="flex flex-col xs:flex-row xs:items-center gap-3 sm:gap-2">
                    <h2 className="text-[13px] sm:text-[14px] font-bold text-black flex items-center gap-2 whitespace-nowrap">
                        <CalendarIcon className="w-3.5 h-3.5 sm:w-4 h-4 text-black" />
                        {view === 'calendar' ? 'Payment Calendar' : 'Obligations'}
                    </h2>

                    {view === 'calendar' && (
                        <div className="flex items-center justify-center gap-1 bg-black/[0.04] p-0.5 rounded-lg sm:ml-2">
                            <button
                                onClick={() => setCalMonth(m => { const n = new Date(m); n.setMonth(n.getMonth() - 1); return n })}
                                className="p-1 rounded-md hover:bg-white hover:shadow-sm text-black/60 transition-all"
                            >
                                <ChevronLeft className="w-3.5 h-3.5" />
                            </button>
                            <span className="text-[11px] font-bold text-black w-[100px] text-center uppercase tracking-wider shrink-0">
                                {calMonth.toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                            </span>
                            <button
                                onClick={() => setCalMonth(m => { const n = new Date(m); n.setMonth(n.getMonth() + 1); return n })}
                                className="p-1 rounded-md hover:bg-white hover:shadow-sm text-black/60 transition-all"
                            >
                                <ChevronRight className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    )}

                    {/* Filter pills */}
                    <div className="flex p-0.5 bg-black/[0.04] rounded-lg w-fit sm:ml-2">
                        {(['all', 'debt', 'subscription'] as FilterMode[]).map(f => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-2 py-1 rounded-md text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all ${filter === f ? 'bg-white shadow-sm text-black' : 'text-black/40 hover:text-black/60'}`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-1 sm:mt-0 pt-3 sm:pt-0 border-t sm:border-0 border-black/[0.04]">
                    {/* View toggle */}
                    <div className="flex p-0.5 bg-black/[0.04] rounded-lg">
                        <button onClick={() => setView('calendar')} className={`p-1.5 rounded-md transition-all ${view === 'calendar' ? 'bg-white shadow-sm text-black' : 'text-black/40 hover:text-black/60'}`}><LayoutGrid className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setView('list')} className={`p-1.5 rounded-md transition-all ${view === 'list' ? 'bg-white shadow-sm text-black' : 'text-black/40 hover:text-black/60'}`}><List className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="text-right flex-shrink-0">
                        <div className="text-[14px] sm:text-[16px] font-extrabold text-black privacy-blur leading-none">
                            £{view === 'calendar' ? calendarData.totalMonth.toFixed(2) : total30Days.toFixed(2)}
                        </div>
                        <p className="text-[8px] sm:text-[9px] uppercase tracking-wider font-bold text-black/30 mt-0.5">{view === 'calendar' ? 'This Month' : 'Next 30d'}</p>
                    </div>
                </div>
            </div>

            <div className="p-4 max-h-[520px] overflow-y-auto">
                {view === 'calendar' ? (
                    <div>

                        {/* Day-of-week headers */}
                        <div className="grid grid-cols-7 mb-1">
                            {DAY_LABELS.map(d => (
                                <div key={d} className="text-center text-[9px] font-bold text-black/25 uppercase tracking-wider py-1">{d}</div>
                            ))}
                        </div>

                        {/* Calendar grid */}
                        <div className="grid grid-cols-7 gap-px bg-black/[0.04] rounded-xl overflow-hidden border border-black/[0.04]">
                            {/* Leading empty cells */}
                            {Array.from({ length: calendarData.startDow }).map((_, i) => (
                                <div key={`empty-${i}`} className="bg-white min-h-[52px]" />
                            ))}
                            {/* Day cells */}
                            {Array.from({ length: calendarData.daysInMonth }).map((_, i) => {
                                const day = i + 1
                                const payments = calendarData.byDay[day] || []
                                const isToday = today.getDate() === day &&
                                    today.getMonth() === calMonth.getMonth() &&
                                    today.getFullYear() === calMonth.getFullYear()
                                const hasPay = payments.length > 0
                                const dayTotal = payments.reduce((s, p) => s + p.amount, 0)
                                const isPast = new Date(calMonth.getFullYear(), calMonth.getMonth(), day) < new Date(today.getFullYear(), today.getMonth(), today.getDate())

                                return (
                                    <div
                                        key={day}
                                        className={`bg-white min-h-[44px] sm:min-h-[52px] p-1 sm:p-1.5 flex flex-col gap-0.5 sm:gap-1 transition-colors
                                            ${isToday ? 'bg-black' : ''}
                                            ${isPast && !isToday ? 'opacity-40' : ''}
                                        `}
                                    >
                                        <div className="flex items-center justify-between w-full">
                                            <span className={`text-[9px] sm:text-[11px] font-bold w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full
                                                ${isToday ? 'bg-black text-white' : 'text-black/40'}
                                            `}>
                                                {day}
                                            </span>
                                            {(() => {
                                                const date = new Date(calMonth.getFullYear(), calMonth.getMonth(), day)
                                                const dateStr = toLocalDateStr(date)
                                                let isPayday = date.getDay() === 4
                                                if (settings.is_demo_mode) {
                                                    // Ensure only the LAST Thursday of the month is a payday in Demo Mode
                                                    const lastDay = new Date(calMonth.getFullYear(), calMonth.getMonth() + 1, 0)
                                                    const lastThursday = new Date(lastDay)
                                                    while (lastThursday.getDay() !== 4) {
                                                        lastThursday.setDate(lastThursday.getDate() - 1)
                                                    }
                                                    isPayday = date.getDate() === lastThursday.getDate()
                                                }

                                                if (!isPayday) return null

                                                const today = new Date(); today.setHours(0, 0, 0, 0)
                                                const isPastOrToday = date <= today

                                                const confirmedPay = payslipByDate[dateStr] || (() => {
                                                    const d = new Date(date)
                                                    // Broad window: Check Wednesday through Friday for any payslip mapping to this Thursday payday
                                                    const prevDay = new Date(d); prevDay.setDate(d.getDate() - 1)
                                                    const nextDay = new Date(d); nextDay.setDate(d.getDate() + 1)
                                                    return payslipByDate[toLocalDateStr(prevDay)] || payslipByDate[toLocalDateStr(nextDay)]
                                                })()

                                                const displayAmt = (isPastOrToday && confirmedPay != null) ? confirmedPay : (weeklyPayMap[dateStr] || 0)

                                                return (
                                                    <div className={cn(
                                                        "flex flex-col items-end gap-0.5 px-1.5 py-1 rounded-md border shadow-sm transition-all min-w-[32px]", 
                                                        isPastOrToday && confirmedPay != null ? "bg-emerald-50 border-emerald-200/60" : 
                                                        isPastOrToday ? "bg-amber-50 border-amber-200/60" : 
                                                        "bg-blue-50/50 border-blue-100"
                                                    )}>
                                                        <span className={cn(
                                                            "text-[8px] sm:text-[10px] font-black privacy-blur", 
                                                            isPastOrToday && confirmedPay != null ? "text-emerald-700" : 
                                                            isPastOrToday ? "text-amber-600" : 
                                                            "text-blue-600/60"
                                                        )}>
                                                            £{displayAmt.toFixed(0)}
                                                        </span>
                                                        {isPastOrToday && confirmedPay != null && <CheckCircle className="w-2.5 h-2.5 text-emerald-500" />}
                                                        {isPastOrToday && confirmedPay == null && <Tag className="w-2.5 h-2.5 text-amber-400 rotate-90" />}
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                        {hasPay && (
                                            <>
                                                {payments.slice(0, 2).map((p, pi) => (
                                                    <button key={pi} onClick={(e) => { e.stopPropagation(); setSelectedPayment(p) }} title={`${p.name}: £${p.amount.toFixed(2)}`} className="bg-red-50 border border-red-100 rounded px-1 py-0.5 w-full text-left truncate hover:bg-red-100 transition-colors cursor-pointer block text-[8px] font-bold text-red-600">
                                                        {p.name}
                                                    </button>
                                                ))}
                                                {payments.length > 2 && (
                                                    <button 
                                                        onClick={(e) => { 
                                                            e.stopPropagation(); 
                                                            setSelectedDayPayments(payments); 
                                                        }} 
                                                        className="text-[8px] text-black/30 font-bold hover:text-black/60 transition-colors w-fit text-left"
                                                    >
                                                        +{payments.length - 2} more
                                                    </button>
                                                )}
                                                <span className="text-[8px] font-bold text-red-500 mt-auto privacy-blur">-£{dayTotal.toFixed(0)}</span>
                                            </>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {groupedByLender.length === 0 && (
                            <p className="text-[12px] text-black/30 text-center py-8">No obligations in this category.</p>
                        )}
                        {groupedByLender.map(([lender, data]) => (
                            <div key={lender} className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <LenderBadge name={lender} />
                                        <div>
                                            <h3 className="text-[13px] font-bold text-black/80">{lender}</h3>
                                            <p className="text-[10px] text-black/40 uppercase tracking-tight">{data.o.length} Active Plan{data.o.length > 1 ? 's' : ''}</p>
                                        </div>
                                    </div>
                                    {data.totalRemaining > 0 && (
                                        <div className="text-right">
                                            <div className="text-[13px] font-bold text-black/70 privacy-blur">£{data.totalRemaining.toFixed(2)}</div>
                                            <p className="text-[9px] text-black/30 uppercase font-bold">Remaining</p>
                                        </div>
                                    )}
                                </div>
                                <div className="grid grid-cols-1 gap-2">
                                    {data.o.map(obs => (
                                        <div key={obs.id} className="bg-black/[0.02] rounded-xl p-3 border border-black/[0.03] hover:border-black/[0.08] transition-all">
                                            <div className="flex justify-between items-start mb-1">
                                                <div className="font-bold text-[12px] text-black/80">{obs.description || obs.group_name || 'Loan'}</div>
                                                <div className="text-[12px] font-bold text-red-600"><span className="privacy-blur">£{obs.amount.toFixed(2)}</span> <span className="text-[10px] text-black/20 font-normal">/ {obs.frequency}</span></div>
                                            </div>
                                            <div className="flex justify-between items-center mt-2">
                                                <div className="flex items-center gap-1 text-[10px] text-black/40 bg-black/[0.04] px-1.5 py-0.5 rounded">
                                                    <CalendarIcon className="w-2.5 h-2.5" />
                                                    Next: {obs.next_due_date}
                                                </div>
                                                {obs.end_date && (
                                                    <div className="text-[10px] text-black/30 italic">Ends {obs.end_date}</div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )
                }
            </div >

            {/* Payment Details Modal */}
            {
                selectedPayment && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
                        onClick={() => setSelectedPayment(null)}>
                        <div className="bg-white rounded-3xl shadow-xl w-full max-w-[320px] overflow-hidden border border-black/[0.08]" onClick={e => e.stopPropagation()}>
                            <div className="p-5 border-b border-black/[0.04] bg-black/[0.01]">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        {selectedDayPayments && (
                                            <button 
                                                onClick={() => setSelectedPayment(null)} 
                                                className="p-1.5 rounded-full hover:bg-black/5 text-black/40 mr-1"
                                            >
                                                <ChevronLeft className="w-4 h-4" />
                                            </button>
                                        )}
                                        <LenderBadge name={selectedPayment.obligation.name} />
                                        <div>
                                            <h3 className="text-[16px] font-bold text-black">{selectedPayment.obligation.name}</h3>
                                            <p className="text-[12px] text-black/40">{selectedPayment.obligation.group_name || 'Obligation'}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => setSelectedPayment(null)} className="p-1.5 rounded-full hover:bg-black/5 text-black/40"><X className="w-4 h-4" /></button>
                                </div>
                                <div className="mt-4 pt-4 border-t border-black/[0.04] flex items-end justify-between">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider font-bold text-black/30 mb-0.5">Amount</p>
                                        <div className="text-[24px] font-black text-red-500 leading-none privacy-blur">£{selectedPayment.obligation.amount.toFixed(2)}</div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] uppercase tracking-wider font-bold text-black/30 mb-0.5">Occurrence</p>
                                        <div className="text-[13px] font-bold text-black/70 flex items-center gap-1 justify-end"><CalendarIcon className="w-3 h-3" /> {selectedPayment.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                                    </div>
                                </div>
                            </div>
                            <div className="p-5 bg-white space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider font-bold text-black/30 mb-1">Frequency</p>
                                        <div className="text-[13px] font-bold text-black/70 capitalize">{selectedPayment.obligation.frequency.replace('-', ' ')}</div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider font-bold text-black/30 mb-1">Category</p>
                                        <div className="text-[13px] font-bold text-black/70 capitalize">{selectedPayment.obligation.category}</div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider font-bold text-black/30 mb-1">Remaining</p>
                                        <div className="text-[13px] font-bold text-black/70">
                                            {countRemainingPayments(selectedPayment.obligation.next_due_date, selectedPayment.obligation.end_date, selectedPayment.obligation.frequency, new Date(), selectedPayment.obligation.payments_left) > 0
                                                ? `${countRemainingPayments(selectedPayment.obligation.next_due_date, selectedPayment.obligation.end_date, selectedPayment.obligation.frequency, new Date(), selectedPayment.obligation.payments_left)} payments`
                                                : 'Ongoing'}
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-wider font-bold text-black/30 mb-1">End Date</p>
                                        <div className="text-[13px] font-bold text-black/70">{selectedPayment.obligation.end_date ? new Date(selectedPayment.obligation.end_date).toLocaleDateString('en-GB') : '—'}</div>
                                    </div>
                                </div>
                                {selectedPayment.obligation.description && (
                                    <div className="pt-4 border-t border-black/[0.04]">
                                        <p className="text-[10px] uppercase tracking-wider font-bold text-black/30 mb-1">Notes</p>
                                        <p className="text-[12px] text-black/60">{selectedPayment.obligation.description}</p>
                                    </div>
                                )}
                                <button
                                    onClick={async () => {
                                        await markObligationAsPaid(selectedPayment.obligation)
                                        setSelectedPayment(null)
                                    }}
                                    className="w-full mt-2 flex items-center justify-center gap-2 py-3 rounded-xl bg-black text-white hover:bg-black/80 transition-colors text-[13px] font-bold shadow-sm"
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    Mark as Paid
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Day Payments List Modal */}
            {selectedDayPayments && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm"
                    onClick={() => setSelectedDayPayments(null)}>
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-[320px] overflow-hidden border border-black/[0.08] animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-5 border-b border-black/[0.04] bg-black/[0.01]">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[15px] font-bold text-black flex items-center gap-2">
                                    <List className="w-4 h-4 text-black/30" />
                                    {selectedDayPayments[0]?.date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} Payments
                                </h3>
                                <button onClick={() => setSelectedDayPayments(null)} className="p-1.5 rounded-full hover:bg-black/5 text-black/40"><X className="w-4 h-4" /></button>
                            </div>
                            <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                                {selectedDayPayments.map(p => (
                                    <button 
                                        key={p.id}
                                        onClick={() => {
                                            setSelectedPayment(p)
                                            // Don't set DayPayments to null so we can "go back"
                                        }}
                                        className="w-full flex items-center justify-between p-2.5 rounded-xl bg-white border border-black/[0.04] hover:border-black/[0.1] hover:bg-black/[0.01] transition-all group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <LenderBadge name={p.name} />
                                            <div className="text-left">
                                                <p className="text-[13px] font-bold text-black truncate max-w-[120px]">{p.name}</p>
                                                <p className="text-[9px] text-black/30 uppercase font-black tracking-tight">{p.group_name || 'Liability'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[14px] font-black text-red-500 privacy-blur tracking-tighter">£{p.amount.toFixed(2)}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-5 bg-black/[0.01] flex items-center justify-between border-t border-black/[0.02]">
                             <span className="text-[10px] font-black text-black/30 uppercase tracking-widest">Day Total</span>
                             <span className="text-[16px] font-black text-black privacy-blur">£{selectedDayPayments.reduce((s, p) => s + p.amount, 0).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            )}
        </div >
    )
}
