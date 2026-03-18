'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Rocket, Star, Target, ChevronRight, ArrowUpRight, Plus, Wallet, TrendingUp, Compass } from 'lucide-react'
import { useGoals } from '../hooks/useGoals'
import { useGoals as useFinanceGoals } from '@/features/finance/hooks/useGoals'
import { usePots } from '@/features/finance/hooks/usePots'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { PiggyBank } from 'lucide-react'

export default function ManifestDashboard() {
    const { goals, wishlist, loading } = useGoals()
    const { goals: financeGoals } = useFinanceGoals()
    const { pots } = usePots()

    const stats = useMemo(() => {
        const activeGoals = goals.filter(g => g.status === 'active')
        const completedGoals = goals.filter(g => g.status === 'completed')
        
        let manifestationValue = wishlist.reduce((acc, item) => acc + (Number(item.price) || 0), 0)
        
        activeGoals.forEach(goal => {
            if (goal.linked_savings_id) {
                const savings = goal.linked_savings_type === 'manual' 
                    ? financeGoals.find(f => f.id === goal.linked_savings_id)
                    : pots.find(p => p.id === goal.linked_savings_id)
                
                if (savings && savings.target_amount) {
                    manifestationValue += Number(savings.target_amount) || 0
                }
            }
        })

        const acquiredItems = wishlist.filter(i => i.status === 'acquired').length

        return {
            activeGoals: activeGoals.length,
            completedGoals: completedGoals.length,
            manifestationValue,
            acquiredItems,
            totalItems: wishlist.length
        }
    }, [goals, wishlist, financeGoals, pots])

    if (loading && goals.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/20">Syncing Manifestations...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-12">
            {/* Curated Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    label="Active Goals" 
                    value={stats.activeGoals.toString()} 
                    subLabel={`${stats.completedGoals} Completed`}
                    icon={Rocket}
                    color="text-amber-500"
                    bg="bg-amber-500/5"
                />
                <StatCard 
                    label="Manifestation Value" 
                    value={`£${stats.manifestationValue.toLocaleString()}`} 
                    subLabel="Total"
                    icon={Wallet}
                    color="text-emerald-500"
                    bg="bg-emerald-500/5"
                />
                <StatCard 
                    label="Wishlist Progress" 
                    value={`${stats.acquiredItems}/${stats.totalItems}`} 
                    subLabel="Items Acquired"
                    icon={Star}
                    color="text-blue-500"
                    bg="bg-blue-500/5"
                />
                <StatCard 
                    label="Manifest Rate" 
                    value="84%" 
                    subLabel="Strategy Alignment"
                    icon={TrendingUp}
                    color="text-purple-500"
                    bg="bg-purple-500/5"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Goals Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center">
                                <Target className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-black">Active Goals</h2>
                        </div>
                        <Link href="/goals/mission" className="text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black flex items-center gap-1 transition-colors">
                            View All Goals <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {goals.filter(g => g.status === 'active').slice(0, 5).map((goal) => (
                            <Link 
                                key={goal.id} 
                                href="/goals/mission"
                                className="group flex items-center justify-between p-5 bg-white border border-black/[0.05] rounded-3xl hover:border-black/20 hover:shadow-lg transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 border border-black/[0.05]">
                                        {goal.vision_image_url ? (
                                            <img src={goal.vision_image_url} alt={goal.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full bg-black/[0.03] flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                                                <Target className="w-5 h-5" />
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-[13px] font-black uppercase tracking-tight text-black">{goal.title}</h3>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">{goal.category}</p>
                                            {goal.linked_savings_id && (
                                                <>
                                                    <span className="w-1 h-1 rounded-full bg-black/10" />
                                                    <div className="flex items-center gap-1 text-emerald-600">
                                                        <PiggyBank className="w-3 h-3" />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">Linked Savings</span>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                    <div className="flex-1 px-8 hidden md:block group-hover:px-4 transition-all duration-500">
                                        <div className="space-y-3">
                                            {/* Primary Goal Progress */}
                                            <div className="space-y-1">
                                                {(() => {
                                                    const total = goal.milestones?.length || 0
                                                    const done = goal.milestones?.filter(m => m.is_completed).length || 0
                                                    const progress = total > 0 ? (done / total) * 100 : 0
                                                    
                                                    return (
                                                        <>
                                                            <div className="flex justify-between items-end">
                                                                <span className="text-[9px] font-black uppercase tracking-widest text-black/20">Goal Progress</span>
                                                                <span className="text-[10px] font-black text-black/40">{done} <span className="text-[8px] font-bold">/ {total}</span></span>
                                                            </div>
                                                            <div className="h-1.5 w-full bg-black/[0.03] rounded-full overflow-hidden">
                                                                <motion.div 
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${progress}%` }}
                                                                    className="h-full bg-black/60 rounded-full"
                                                                />
                                                            </div>
                                                        </>
                                                    )
                                                })()}
                                            </div>

                                            {/* Secondary Savings Progress */}
                                            {goal.linked_savings_id && (() => {
                                                const savings = goal.linked_savings_type === 'manual' 
                                                    ? financeGoals.find(f => f.id === goal.linked_savings_id)
                                                    : pots.find(p => p.id === goal.linked_savings_id)
                                                
                                                if (!savings) return null
                                                
                                                const current = 'current_amount' in savings ? savings.current_amount : savings.balance
                                                const target = savings.target_amount
                                                const progress = target > 0 ? Math.min(100, (current / target) * 100) : 0
                                                
                                                return (
                                                    <div className="space-y-1 border-t border-black/[0.03] pt-2">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600/40">Savings Progress</span>
                                                            <span className="text-[10px] font-black text-emerald-600">£{current.toLocaleString()} <span className="text-black/20 font-bold">/ £{target.toLocaleString()}</span></span>
                                                        </div>
                                                        <div className="h-1.5 w-full bg-emerald-500/10 rounded-full overflow-hidden">
                                                            <motion.div 
                                                                initial={{ width: 0 }}
                                                                animate={{ width: `${progress}%` }}
                                                                className="h-full bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                                                            />
                                                        </div>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                <div className="flex items-center gap-4">
                                    <div className="hidden xs:flex flex-col items-end">
                                        <div className="text-[10px] font-black uppercase text-black/20 mb-1">Impact</div>
                                        <div className="flex gap-0.5">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="w-1 h-3 bg-black/5 rounded-full overflow-hidden">
                                                    <div className="w-full h-full bg-black/10" />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-black/10 group-hover:text-black transition-colors" />
                                </div>
                            </Link>
                        ))}
                        {goals.length === 0 && (
                            <div className="h-32 border-2 border-dashed border-black/[0.03] rounded-3xl flex flex-col items-center justify-center gap-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-black/20">No active goals</p>
                                <Link href="/goals/mission" className="text-[10px] font-black uppercase tracking-[0.2em] bg-black text-white px-4 py-2 rounded-lg">Initiate</Link>
                            </div>
                        )}
                    </div>
                </section>

                {/* Wishlist Section */}
                <section className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                                <Star className="w-4 h-4 text-white" />
                            </div>
                            <h2 className="text-sm font-black uppercase tracking-widest text-black">Wishlist</h2>
                        </div>
                        <Link href="/goals/wishlist" className="text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black flex items-center gap-1 transition-colors">
                            View All Items <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="flex flex-col gap-2">
                        {wishlist.slice(0, 5).map((item) => {
                            const OT_RATE_NET = 20.35 * (1 - 0.1821)
                            const HOURS_PER_SHIFT = 11.5
                            const hoursNeeded = (Number(item.price) || 0) / OT_RATE_NET
                            const shiftsNeeded = hoursNeeded / HOURS_PER_SHIFT
                            const otLabel = hoursNeeded < HOURS_PER_SHIFT
                                ? `${hoursNeeded.toFixed(1)} OT hrs`
                                : `${shiftsNeeded.toFixed(1)} OT shifts`

                            return (
                                <Link
                                    key={item.id}
                                    href="/goals/wishlist"
                                    className="flex items-center gap-3 p-3 bg-white border border-black/[0.05] rounded-2xl hover:border-amber-500/30 hover:shadow-sm transition-all group"
                                >
                                    {/* Thumbnail */}
                                    <div className="w-14 h-14 rounded-xl overflow-hidden bg-black/[0.03] flex-shrink-0 border border-black/[0.05]">
                                        {item.image_url ? (
                                            <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center">
                                                <Star className="w-5 h-5 text-amber-400/60" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                                            <span className={`px-1.5 py-0.5 rounded-full text-[7px] font-black uppercase tracking-widest border ${
                                                item.priority === 'super' ? 'border-purple-200 bg-purple-50 text-purple-600' :
                                                item.priority === 'high' ? 'border-red-200 bg-red-50 text-red-500' :
                                                item.priority === 'mid' ? 'border-amber-200 bg-amber-50 text-amber-600' :
                                                'border-black/5 bg-black/[0.03] text-black/40'
                                            }`}>{item.priority}</span>
                                            {item.category && <span className="text-[7px] font-bold text-black/25 uppercase tracking-widest">{item.category}</span>}
                                        </div>
                                        <p className="text-[13px] font-black text-black leading-tight truncate group-hover:text-amber-600 transition-colors">{item.title}</p>
                                        {item.description && <p className="text-[9px] text-black/40 font-medium mt-0.5 line-clamp-1">{item.description}</p>}
                                        {item.price && (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[11px] font-black text-amber-700">£{Number(item.price).toLocaleString()}</span>
                                                <span className="w-0.5 h-0.5 rounded-full bg-black/20" />
                                                <span className="text-[8px] font-bold text-black/30 uppercase tracking-wide">⚡ {otLabel} to afford</span>
                                            </div>
                                        )}
                                    </div>

                                    <ChevronRight className="w-3.5 h-3.5 text-black/10 group-hover:text-amber-500 transition-colors shrink-0" />
                                </Link>
                            )
                        })}
                        {wishlist.length === 0 && (
                            <div className="h-32 border-2 border-dashed border-black/[0.03] rounded-3xl flex flex-col items-center justify-center gap-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-black/20">Wishlist empty</p>
                                <Link href="/goals/wishlist" className="text-[10px] font-black uppercase tracking-[0.2em] bg-black text-white px-4 py-2 rounded-lg">Anchor Desire</Link>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    )
}

function StatCard({ label, value, subLabel, icon: Icon, color, bg }: any) {
    return (
        <div className="bg-white border border-black/[0.05] rounded-[32px] p-6 flex flex-col gap-4 hover:border-black/10 transition-colors shadow-sm">
            <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center", bg)}>
                <Icon className={cn("w-5 h-5", color)} />
            </div>
            <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30 mb-1">{label}</p>
                <div className="flex items-baseline gap-2">
                    <h4 className="text-2xl font-black text-black tracking-tighter">{value}</h4>
                    <span className="text-[9px] font-bold text-black/20 uppercase tracking-widest">{subLabel}</span>
                </div>
            </div>
        </div>
    )
}
