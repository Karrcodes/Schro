'use client'

import React, { useMemo } from 'react'
import { Plus, Sparkles, RefreshCw, MoreHorizontal, Flag, Trash2, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { RecurringObligation } from '@/features/finance/types/finance.types'
import { getLenderLogo } from '@/features/finance/utils/lenderLogos'

interface LiabilitiesServiceGridProps {
    obligations: RecurringObligation[]
    loading: boolean
    onAdd: () => void
    onEdit: (o: RecurringObligation) => void
    onDelete: (o: RecurringObligation) => void
    onShowSuggestions: () => void
}

const COLORS = [
    { bg: 'bg-[#f0f4ff]', text: 'text-blue-600', hover: 'hover:bg-[#e0e9ff]', border: 'border-blue-100' },
    { bg: 'bg-[#fff9f0]', text: 'text-amber-600', hover: 'hover:bg-[#fff0db]', border: 'border-amber-100' },
    { bg: 'bg-[#f0fff4]', text: 'text-emerald-600', hover: 'hover:bg-[#e0ffea]', border: 'border-emerald-100' },
    { bg: 'bg-[#fff0f4]', text: 'text-rose-600', hover: 'hover:bg-[#ffe0ea]', border: 'border-rose-100' },
    { bg: 'bg-[#f4f0ff]', text: 'text-purple-600', hover: 'hover:bg-[#e9e0ff]', border: 'border-purple-100' },
    { bg: 'bg-[#f0fffe]', text: 'text-cyan-600', hover: 'hover:bg-[#d9fffd]', border: 'border-cyan-100' },
]

export function LiabilitiesServiceGrid({ obligations, loading, onAdd, onEdit, onDelete, onShowSuggestions }: LiabilitiesServiceGridProps) {
    const stats = useMemo(() => {
        const estMonthlyTotal = obligations.reduce((sum, o) => {
            let mult = 1
            if (o.frequency === 'weekly') mult = 4.33
            else if (o.frequency === 'bi-weekly') mult = 2.16
            else if (o.frequency === 'yearly') mult = 1 / 12
            return sum + (o.amount * mult)
        }, 0)

        return {
            estMonthlyTotal,
            recurringCount: obligations.length,
            totalCount: obligations.length
        }
    }, [obligations])

    const grouped = useMemo(() => {
        const groups: Record<string, RecurringObligation[]> = {
            'Klarna': [],
            'Clearpay': [],
            'Subscriptions': [],
            'Other Debts': []
        }

        obligations.forEach(o => {
            const name = o.name.toLowerCase()
            if (name.includes('klarna')) groups['Klarna'].push(o)
            else if (name.includes('clearpay')) groups['Clearpay'].push(o)
            else if (o.payments_left && o.payments_left > 0 || o.end_date) groups['Other Debts'].push(o)
            else groups['Subscriptions'].push(o)
        })

        return Object.entries(groups).filter(([_, items]) => items.length > 0)
    }, [obligations])

    if (loading) return null

    return (
        <div className="space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header / Stats Navigation */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div className="flex flex-col sm:flex-row gap-8 sm:gap-16">
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-black/30">Est. Monthly Total</p>
                        <p className="text-3xl font-black text-black tracking-tight">£{stats.estMonthlyTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-black/30">Recurring Services</p>
                        <p className="text-3xl font-black text-black tracking-tight">{stats.recurringCount}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] uppercase tracking-[0.2em] font-black text-black/30">Total Services</p>
                        <p className="text-3xl font-black text-black tracking-tight">{stats.totalCount}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <button 
                        onClick={onShowSuggestions}
                        className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-xl text-[12px] font-bold hover:bg-emerald-500/20 transition-all border border-emerald-500/10"
                    >
                        <Sparkles className="w-4 h-4" />
                        See AI Suggestions
                    </button>
                    <button onClick={onAdd} className="flex items-center justify-center w-10 h-10 bg-black text-white rounded-xl hover:bg-black/80 transition-all shadow-lg active:scale-95">
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Grouped Sections */}
            {grouped.map(([groupName, items]) => (
                <div key={groupName} className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-black/[0.04] pb-2">
                        <h2 className="text-[14px] font-black uppercase tracking-[0.1em] text-black/40">{groupName}</h2>
                        <span className="text-[11px] font-bold text-black/20">{items.length} items</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4 auto-rows-min">
                        {items.map((o, i) => {
                            const colorIndex = i % COLORS.length
                            const color = COLORS[colorIndex]
                            const logo = getLenderLogo(o.name)
                            
                            // Proportional Sizing Logic - Aggressively tuned for £5-£25 range
                            let sizeClass = "col-span-1 row-span-1 min-h-[160px]"
                            if (o.amount >= 25) {
                                sizeClass = "sm:col-span-2 sm:row-span-2 min-h-[300px]"
                            } else if (o.amount >= 12) {
                                sizeClass = "sm:col-span-2 sm:row-span-1 min-h-[160px]"
                            } else if (o.amount >= 8) {
                                sizeClass = "sm:col-span-1 sm:row-span-1 min-h-[160px] ring-2 ring-black/5" // Highlighted 1x1
                            }

                            return (
                                <div 
                                    key={o.id}
                                    className={cn(
                                        "group relative p-6 rounded-[24px] border transition-all duration-300 cursor-pointer flex flex-col justify-between overflow-hidden",
                                        color.bg,
                                        color.border,
                                        color.hover,
                                        sizeClass,
                                        "hover:shadow-xl hover:shadow-black/5 hover:-translate-y-1 active:scale-[0.98]"
                                    )}
                                >
                                    {/* Actions Top Right */}
                                    <div className="absolute top-4 right-4 flex items-center gap-1 opacity-40 sm:opacity-20 group-hover:opacity-100 transition-all">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onEdit(o); }}
                                            className="p-1.5 rounded-lg hover:bg-black/5 transition-colors"
                                        >
                                            <MoreHorizontal className="w-3.5 h-3.5" />
                                        </button>
                                    </div>

                                    <div className="space-y-4 pr-10">
                                        <div className="space-y-0.5">
                                            <h3 className={cn(
                                                "font-black text-black/80 tracking-tight leading-tight truncate w-full",
                                                o.amount > 100 ? "text-[18px]" : "text-[15px]"
                                            )}>{o.name}</h3>
                                            {o.description && (
                                                <p className="text-[11px] font-bold text-black/30 truncate leading-tight italic">{o.description}</p>
                                            )}
                                        </div>

                                        <div className="space-y-1">
                                            <div className="flex items-baseline gap-1">
                                                <span className={cn(
                                                    "font-black text-black tracking-tighter",
                                                    o.amount >= 25 ? "text-5xl" : o.amount >= 12 ? "text-4xl" : "text-2xl"
                                                )}>£{o.amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                                                <span className="text-[13px] font-bold text-black/30 tracking-tight">
                                                    {o.frequency === 'monthly' ? '/mo' : o.frequency === 'weekly' ? '/wk' : o.frequency === 'yearly' ? '/yr' : ''}
                                                </span>
                                            </div>
                                            <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">
                                                {o.frequency} • {o.payments_left ? `${o.payments_left} charges` : 'Ongoing'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Logo / Emoji at bottom */}
                                    <div className="mt-8 flex items-center justify-between">
                                        {logo ? (
                                            <div className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur-sm border border-black/[0.1] p-2 flex items-center justify-center overflow-hidden">
                                                <img src={logo} alt={o.name} className="w-full h-full object-contain" />
                                            </div>
                                        ) : (
                                            <div className="w-10 h-10 rounded-xl bg-white/60 backdrop-blur-sm border border-black/[0.1] flex items-center justify-center text-xl text-black">
                                                {o.emoji || '💸'}
                                            </div>
                                        )}
                                        
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); onDelete(o); }}
                                            className="w-10 h-10 flex items-center justify-center text-red-500/40 hover:text-red-600 hover:scale-110 transition-all duration-300 shrink-0"
                                            title="Delete Liability"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}
