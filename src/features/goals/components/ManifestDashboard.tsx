'use client'

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { Rocket, Star, Target, ChevronRight, ArrowUpRight, Plus, Wallet, TrendingUp, Compass } from 'lucide-react'
import { useGoals } from '../hooks/useGoals'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export default function ManifestDashboard() {
    const { goals, wishlist, loading } = useGoals()

    const stats = useMemo(() => {
        const activeGoals = goals.filter(g => g.status === 'active')
        const completedGoals = goals.filter(g => g.status === 'completed')
        const wishlistValue = wishlist.reduce((acc, item) => acc + (Number(item.price) || 0), 0)
        const acquiredItems = wishlist.filter(i => i.status === 'acquired').length

        return {
            activeGoals: activeGoals.length,
            completedGoals: completedGoals.length,
            wishlistValue,
            acquiredItems,
            totalItems: wishlist.length
        }
    }, [goals, wishlist])

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
                    label="Active Missions" 
                    value={stats.activeGoals.toString()} 
                    subLabel={`${stats.completedGoals} Completed`}
                    icon={Rocket}
                    color="text-amber-500"
                    bg="bg-amber-500/5"
                />
                <StatCard 
                    label="Manifestation Value" 
                    value={`£${stats.wishlistValue.toLocaleString()}`} 
                    subLabel="Total Market Value"
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
                            View Goals <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-1 gap-3">
                        {goals.filter(g => g.status === 'active').slice(0, 3).map((goal) => (
                            <Link 
                                key={goal.id} 
                                href="/goals/mission"
                                className="group flex items-center justify-between p-5 bg-white border border-black/[0.05] rounded-3xl hover:border-black/20 hover:shadow-lg transition-all"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-black/[0.03] rounded-2xl flex items-center justify-center group-hover:bg-amber-500 group-hover:text-white transition-all">
                                        <Target className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-[13px] font-black uppercase tracking-tight text-black">{goal.title}</h3>
                                        <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">{goal.category}</p>
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
                                <p className="text-[10px] font-black uppercase tracking-widest text-black/20">No active missions</p>
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
                            <h2 className="text-sm font-black uppercase tracking-widest text-black">Aspirations</h2>
                        </div>
                        <Link href="/goals/wishlist" className="text-[10px] font-black uppercase tracking-widest text-black/40 hover:text-black flex items-center gap-1 transition-colors">
                            Full Registry <ArrowUpRight className="w-3 h-3" />
                        </Link>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {wishlist.slice(0, 4).map((item) => (
                            <Link 
                                key={item.id} 
                                href="/goals/wishlist"
                                className="group relative aspect-[4/3] bg-white border border-black/[0.05] rounded-[32px] overflow-hidden hover:shadow-xl transition-all"
                            >
                                {item.image_url ? (
                                    <img src={item.image_url} alt={item.title} className="absolute inset-0 w-full h-full object-cover grayscale brightness-90 group-hover:grayscale-0 group-hover:scale-110 transition-all duration-700" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/[0.02]">
                                        <Star className="w-8 h-8 text-black/5" />
                                    </div>
                                )}
                                <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                                    <h3 className="text-[11px] font-black uppercase tracking-tight text-white line-clamp-1">{item.title}</h3>
                                    {item.price && (
                                        <p className="text-[9px] font-black uppercase text-white/60 tracking-widest">£{Number(item.price).toLocaleString()}</p>
                                    )}
                                </div>
                            </Link>
                        ))}
                        {wishlist.length === 0 && (
                            <div className="col-span-2 h-32 border-2 border-dashed border-black/[0.03] rounded-3xl flex flex-col items-center justify-center gap-3">
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
