'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as LineTooltip
} from 'recharts'
import { 
    Activity, CheckCircle2, ChevronDown, Wallet, Palette, Heart, Compass, Info, X,
    Brain, Target, Sparkles
} from 'lucide-react'
import { useLifeMetricsAggregator, PILLAR_MAX, PointBreakdown } from '../../hooks/useLifeMetricsAggregator'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { cn } from '@/lib/utils'

type TimeView = 'current' | '4w' | '3m' | '6m' | '1y' | 'all'

function DetailsModal({ title, item, onClose }: { title: string; item: PointBreakdown; onClose: () => void }) {
    return (
        <motion.div
            key="detail-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 40, opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                className="relative z-10 w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                <div className="flex items-center justify-between px-6 py-5 border-b border-black/[0.06]">
                    <div>
                        <h3 className="text-[14px] font-black text-black uppercase tracking-widest">{title}</h3>
                        <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest mt-0.5">
                            {item.points > 0 ? '+' : ''}{item.points} points · {item.details?.length ?? 0} records
                        </p>
                    </div>
                    <button onClick={onClose} className="w-8 h-8 rounded-xl bg-black/[0.04] flex items-center justify-center hover:bg-black/[0.08] transition-colors">
                        <X className="w-4 h-4 text-black/60" />
                    </button>
                </div>
                <div className="p-4 space-y-2 max-h-[50vh] overflow-y-auto">
                    {(item.details ?? []).length === 0 && (
                        <p className="text-center text-[11px] text-black/30 font-bold uppercase tracking-widest py-6">No detail records available</p>
                    )}
                    {(item.details ?? []).map((d, i) => (
                        <div key={i} className="flex items-center justify-between bg-black/[0.02] border border-black/[0.05] rounded-xl px-4 py-3">
                            <div className="flex-1 min-w-0 pr-3">
                                <p className="text-[12px] font-bold text-black truncate">{d.label}</p>
                                {d.meta && <p className="text-[10px] text-black/40 font-medium mt-0.5">{d.meta}</p>}
                            </div>
                            {d.value && <span className="text-[11px] font-black text-black/70 shrink-0">{d.value}</span>}
                        </div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    )
}

export function LifePerformanceVisualizer() {
    const metrics = useLifeMetricsAggregator()
    const { settings, updateSetting } = useSystemSettings()
    const [viewMode, setViewMode] = useState<TimeView>('current')
    const [expandedModule, setExpandedModule] = useState<string | null>(null)
    const [detailModal, setDetailModal] = useState<{ title: string; item: PointBreakdown } | null>(null)
    const [hoveredModule, setHoveredModule] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)

    // Performance Loading Entry
    useEffect(() => {
        const t = setTimeout(() => setIsLoading(false), 1000)
        return () => clearTimeout(t)
    }, [])

    // Historical Persistence
    useEffect(() => {
        const history = settings.life_metrics_history || {}
        const savedWeek = history[metrics.weekId]

        if (!savedWeek || metrics.totalPoints >= (savedWeek.totalPoints + 5)) {
            const tId = setTimeout(() => {
                updateSetting('life_metrics_history', {
                    ...history,
                    [metrics.weekId]: metrics
                }).catch(() => {})
            }, 3000)
            return () => clearTimeout(tId)
        }
    }, [metrics.totalPoints, metrics.weekId, settings.life_metrics_history, updateSetting, metrics])

    const lineChartData = useMemo(() => {
        const history = settings.life_metrics_history || {}
        const now = new Date()
        let cutoff = new Date(0)
        
        if (viewMode === '4w') cutoff.setDate(now.getDate() - 28)
        else if (viewMode === '3m') cutoff.setMonth(now.getMonth() - 3)
        else if (viewMode === '6m') cutoff.setMonth(now.getMonth() - 6)
        else if (viewMode === '1y') cutoff.setFullYear(now.getFullYear() - 1)
        
        const sortedKeys = Object.keys(history).sort()
        const dataSet = [...sortedKeys]
        if (!dataSet.includes(metrics.weekId)) dataSet.push(metrics.weekId)

        return dataSet
            .filter(k => new Date(k) >= cutoff)
            .map(k => {
                const log = history[k] || metrics
                return {
                    name: new Date(k).toLocaleDateString('en-GB', { month: 'short', day: 'numeric' }),
                    Finance: log.finance.points,
                    Ops: log.tasks.points,
                    Studio: log.studio.points,
                    Wellbeing: log.wellbeing.points,
                    Manifest: log.manifestation.points,
                    Total: log.totalPoints
                }
            })
    }, [settings.life_metrics_history, viewMode, metrics])

    const modules = useMemo(() => {
        const base = [
            { id: 'wellbeing', label: 'Wellbeing', icon: Heart, color: '#10b981', gradStop: '#34d399', bg: 'bg-emerald-500/10', data: metrics.wellbeing, fullMark: PILLAR_MAX.wellbeing, context: 'Health & Vitality' },
            { id: 'finance', label: 'Finance', icon: Wallet, color: '#3b82f6', gradStop: '#60a5fa', bg: 'bg-blue-500/10', data: metrics.finance, fullMark: PILLAR_MAX.finance, context: 'Capital & Cashflow' },
            { id: 'ops', label: 'Ops', icon: Activity, color: '#f43f5e', gradStop: '#fb7185', bg: 'bg-rose-500/10', data: metrics.tasks, fullMark: PILLAR_MAX.tasks, context: 'Efficiency & Tasks' },
            { id: 'studio', label: 'Studio', icon: Palette, color: '#a855f7', gradStop: '#c084fc', bg: 'bg-purple-500/10', data: metrics.studio, fullMark: PILLAR_MAX.studio, context: 'Creative Yield' },
            { id: 'manifest', label: 'Manifestation', icon: Compass, color: '#f59e0b', gradStop: '#fbbf24', bg: 'bg-amber-500/10', data: metrics.manifestation, fullMark: PILLAR_MAX.manifestation, context: 'Aspiration Sync' },
        ]

        // Dynamic Sorting Logic
        const hasActivity = base.some(m => m.data.points > 0)
        
        if (hasActivity) {
            return [...base].sort((a,b) => b.data.points - a.data.points)
        }

        return base
    }, [metrics])

    const performanceSummary = useMemo(() => {
        const totalMax = 1000
        
        // Find last week
        const history = settings.life_metrics_history || {}
        const sortedK = Object.keys(history).sort()
        const lastWeekId = sortedK.length > 0 ? sortedK[sortedK.length - 1] : null
        const lastWeekMetric = lastWeekId ? history[lastWeekId] : null
        
        const delta = lastWeekMetric ? metrics.totalPoints - lastWeekMetric.totalPoints : 0
        
        const sortedModules = [...modules].sort((a,b) => b.data.points - a.data.points)
        const bestModule = sortedModules[0]
        
        // Exclude manifest for "Low" metric
        const candidateModules = modules.filter(m => m.id !== 'manifest')
        const worstModule = [...candidateModules].sort((a,b) => a.data.points - b.data.points)[0]

        // Efficiency calculation
        const efficiency = ((metrics.finance.points + metrics.tasks.points) / (PILLAR_MAX.finance + PILLAR_MAX.tasks)) * 100
        
        return {
            totalCurrent: metrics.totalPoints,
            totalMax,
            delta,
            bestPillar: bestModule.label.replace('Operations', 'Ops'),
            bestColor: bestModule.color,
            worstPillar: worstModule.label.replace('Operations', 'Ops'),
            worstColor: worstModule.color,
            efficiency: Math.round(efficiency)
        }
    }, [metrics, modules, settings.life_metrics_history])

    const topTwoIds = useMemo(() => {
        return [...modules]
            .sort((a, b) => b.data.points - a.data.points)
            .slice(0, 2)
            .map(m => m.id)
    }, [modules])

    return (
        <div className="w-full">
            {/* Full-width Header without Divider */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-12">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h2 className="text-[16px] font-bold text-black tracking-tight">Performance Metrics</h2>
                        <p className="text-[11px] text-black/35">Weekly Progress</p>
                    </div>
                </div>
                {!isLoading && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 bg-black/[0.03] p-1 rounded-xl">
                        {(['current', '4w', '3m', '6m', '1y', 'all'] as TimeView[]).map(view => (
                            <button
                                key={view}
                                onClick={() => setViewMode(view)}
                                className={cn(
                                    "px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider rounded-lg transition-all",
                                    viewMode === view ? "bg-white text-black shadow-sm" : "text-black/40 hover:text-black/80 hover:bg-black/[0.02]"
                                )}
                            >
                                {view === 'current' ? 'Week' : view}
                            </button>
                        ))}
                    </motion.div>
                )}
            </motion.div>

            <AnimatePresence mode="wait">
                {isLoading ? (
                    <motion.div 
                        key="skeleton" 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        exit={{ opacity: 0 }} 
                        className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-x-12 gap-y-6 items-start"
                    >
                        {/* 1. Skeleton Summary Row */}
                        <div className="xl:col-start-1 xl:row-start-1">
                            <div className="flex items-center gap-3">
                                {[1, 2, 3, 4].map(i => <div key={i} className="flex-[0.7] h-12 bg-black/[0.02] border border-black/[0.04] rounded-2xl animate-pulse" />)}
                                <div className="flex-[2] h-12 bg-black/[0.02] border border-black/[0.04] rounded-2xl animate-pulse" />
                            </div>
                        </div>

                        {/* 2. Skeleton Chart Side */}
                        <div className="relative h-[440px] w-full flex items-center justify-center xl:col-start-2 xl:row-start-1 xl:row-span-2 self-center">
                            <svg viewBox="0 0 500 440" className="w-full h-full opacity-10">
                                {[0.25, 0.5, 0.75, 1].map(f => (
                                    <circle key={f} cx={245} cy={210} r={150 * f} fill="none" stroke="black" strokeWidth={1} className="animate-pulse" />
                                ))}
                            </svg>
                        </div>

                        {/* 3. Skeleton Breakdown Modules */}
                        <div className="space-y-2 xl:col-start-1 xl:row-start-2">
                            {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-[64px] bg-black/[0.02] border border-black/[0.04] rounded-2xl animate-pulse" />)}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div 
                        key="content" 
                        initial={{ opacity: 0 }} 
                        animate={{ opacity: 1 }} 
                        className="grid grid-cols-1 xl:grid-cols-[1.15fr_0.85fr] gap-x-12 gap-y-6 items-start"
                    >
                        {/* 1. Summary Row */}
                        <div className="order-1 xl:order-none xl:col-start-1 xl:row-start-1">
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-3 flex-wrap">
                                <div className="flex-[0.7] min-w-[60px] bg-white/60 backdrop-blur-md border border-black/[0.06] px-3 py-3 rounded-2xl shadow-sm ring-1 ring-black/[0.02]">
                                    <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] leading-none text-center">Yield</p>
                                    <p className="text-[15px] font-black text-black mt-2 text-center tracking-tighter">{performanceSummary.totalCurrent}<span className="text-black/20 font-bold ml-1 text-[10px]">/ 1000</span></p>
                                </div>
                                <div className="flex-[0.7] min-w-[60px] bg-white/60 backdrop-blur-md border border-black/[0.06] px-3 py-3 rounded-2xl shadow-sm ring-1 ring-black/[0.02]">
                                    <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] leading-none text-center">Momentum</p>
                                    <p className={cn("text-[15px] font-black mt-2 text-center tracking-tighter", performanceSummary.delta >= 0 ? "text-emerald-600" : "text-rose-600")}>
                                        {performanceSummary.delta >= 0 ? '+' : ''}{performanceSummary.delta}
                                    </p>
                                </div>
                                <div className="flex-[0.7] min-w-[60px] bg-white/60 backdrop-blur-md border border-black/[0.06] px-3 py-3 rounded-2xl shadow-sm ring-1 ring-black/[0.02]">
                                    <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] leading-none text-center">Peak</p>
                                    <p className="text-[13px] font-black mt-2 text-center truncate tracking-tighter" style={{ color: performanceSummary.bestPillar === 'Ops' ? '#f43f5e' : performanceSummary.bestColor }}>{performanceSummary.bestPillar}</p>
                                </div>
                                <div className="flex-[0.7] min-w-[60px] bg-white/60 backdrop-blur-md border border-black/[0.06] px-3 py-3 rounded-2xl shadow-sm ring-1 ring-black/[0.02]">
                                    <p className="text-[9px] font-black text-black/40 uppercase tracking-[0.2em] leading-none text-center">Low</p>
                                    <p className="text-[13px] font-black mt-2 text-center truncate tracking-tighter" style={{ color: performanceSummary.worstPillar === 'Ops' ? '#f43f5e' : performanceSummary.worstColor }}>{performanceSummary.worstPillar}</p>
                                </div>
                                <div className="flex-[2] min-w-[190px] bg-[#0A0A0A] border border-white/10 px-5 py-3 rounded-2xl flex items-center justify-between relative overflow-hidden group shadow-2xl">
                                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
                                    
                                    <div className="relative z-10">
                                        <p className="text-[10px] font-black text-white uppercase tracking-[0.25em] leading-none">Engine</p>
                                        <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] leading-none mt-1">Velocity</p>
                                        <div className="flex items-center gap-1.5 mt-2.5">
                                            <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                                            <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] italic">Efficiency</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 relative z-10">
                                        <div className="relative w-14 h-9">
                                            <svg viewBox="0 0 40 24" className="w-full h-full">
                                                <defs>
                                                    <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                                        <stop offset="0%" stopColor="#ef4444" />
                                                        <stop offset="50%" stopColor="#eab308" />
                                                        <stop offset="100%" stopColor="#10b981" />
                                                    </linearGradient>
                                                </defs>
                                                {/* Gauge Background */}
                                                <path 
                                                    d="M 4 20 A 16 16 0 0 1 36 20" 
                                                    fill="none" 
                                                    stroke="rgba(255,255,255,0.08)" 
                                                    strokeWidth="4.5" 
                                                    strokeLinecap="round" 
                                                />
                                                {/* Gauge Progress */}
                                                <motion.path 
                                                    initial={{ pathLength: 0 }}
                                                    animate={{ pathLength: performanceSummary.efficiency / 100 }}
                                                    transition={{ duration: 1.8, ease: "circOut" }}
                                                    d="M 4 20 A 16 16 0 0 1 36 20" 
                                                    fill="none" 
                                                    stroke="url(#gaugeGradient)" 
                                                    strokeWidth="4.5" 
                                                    strokeLinecap="round" 
                                                    strokeDasharray="100 100"
                                                />
                                                {/* Needle */}
                                                <motion.g 
                                                    initial={{ rotate: -90 }}
                                                    animate={{ rotate: -90 + (performanceSummary.efficiency * 1.8) }}
                                                    transition={{ duration: 1.8, type: 'spring', damping: 12 }}
                                                    style={{ originX: '20px', originY: '20px' }}
                                                >
                                                    <line x1="20" y1="20" x2="20" y2="7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                                                    <circle cx="20" cy="20" r="2.5" fill="white" />
                                                </motion.g>
                                            </svg>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[16px] font-black text-white italic tracking-tighter">{performanceSummary.efficiency}%</p>
                                            <div className="w-full h-[2px] bg-white/[0.1] mt-0.5 rounded-full overflow-hidden">
                                                <motion.div initial={{ width: 0 }} animate={{ width: `${performanceSummary.efficiency}%` }} className="h-full bg-white/40" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>

                        {/* Breakdown Modules */}
                        <div className="space-y-2 order-3 xl:order-none xl:col-start-1 xl:row-start-2 pt-2 xl:pt-0">
                                {modules.map(({ id, label, icon: Icon, color, bg, data, context, fullMark }) => {
                                    const isModuleActive = hoveredModule ? (hoveredModule === id) : topTwoIds.includes(id)
                                    return (
                                        <motion.div 
                                            key={id} 
                                            animate={{ opacity: isModuleActive ? 1 : 0.4 }}
                                            transition={{ duration: 0.3 }}
                                            className="bg-white/80 backdrop-blur-md border border-black/[0.08] rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all ring-1 ring-black/[0.02]"
                                        >
                                            <button 
                                                onClick={() => setExpandedModule(expandedModule === id ? null : id)}
                                                className="w-full flex items-center justify-between p-4 bg-black/[0.01] hover:bg-black/[0.02] transition-colors"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center shadow-inner relative overflow-hidden")} style={{ backgroundColor: `${color}15`, color }}>
                                                        <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />
                                                        <Icon className="w-5 h-5 drop-shadow-sm" />
                                                    </div>
                                                    <div className="text-left">
                                                        <h4 className="text-[13px] font-black text-black/90 tracking-tight leading-none mb-1.5">{label}</h4>
                                                        <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest">{context}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right">
                                                        <p className="text-[13px] font-black text-black tracking-tight">{data.points} PTS</p>
                                                        <div className="w-16 h-1 bg-black/[0.04] mt-1.5 rounded-full overflow-hidden">
                                                            <div className="h-full rounded-full" style={{ width: `${(data.points / fullMark) * 100}%`, backgroundColor: color }} />
                                                        </div>
                                                    </div>
                                                    <ChevronDown className={cn("w-4 h-4 text-black/20 transition-transform duration-500", expandedModule === id ? "rotate-180" : "")} />
                                                </div>
                                            </button>

                                            <AnimatePresence>
                                                {expandedModule === id && (
                                                    <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                                                        <div className="p-4 pt-1 border-t border-black/[0.04] space-y-2 bg-black/[0.02]">
                                                            {data.breakdown && data.breakdown.length > 0 ? (
                                                                data.breakdown.map((item, idx) => (
                                                                    <div key={idx} className="flex justify-between items-center bg-white border border-black/[0.05] p-2.5 rounded-xl shadow-sm">
                                                                        <div className="flex items-center gap-2">
                                                                            <CheckCircle2 className="w-3.5 h-3.5 text-black/20" />
                                                                            <span className="text-[11px] font-bold text-black/60 uppercase tracking-wider">{item.label}</span>
                                                                            {item.details && item.details.length > 0 && (
                                                                                <button
                                                                                    onClick={e => { e.stopPropagation(); setDetailModal({ title: item.label, item }) }}
                                                                                    className="w-4 h-4 rounded-full flex items-center justify-center bg-black/[0.06] hover:bg-black/[0.12] transition-colors"
                                                                                >
                                                                                    <Info className="w-2.5 h-2.5 text-black/50" />
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                        <span className={cn(
                                                                            "text-[11px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                                                                            item.points > 0 ? "bg-emerald-500/10 text-emerald-600" : "bg-rose-500/10 text-rose-600"
                                                                        )}>
                                                                            {item.points > 0 ? '+' : ''}{item.points}
                                                                        </span>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="text-center py-4 text-[10px] font-bold text-black/30 uppercase tracking-widest">No activity</div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </motion.div>
                                    )
                                })}
                            </div>

                        {/* Right: Chart Visualization */}
                        <div className="relative h-[440px] w-full flex items-center justify-center overflow-visible order-2 xl:order-none xl:col-start-2 xl:row-start-1 xl:row-span-2 self-center">
                            {viewMode === 'current' ? (
                                <div className="w-full h-full flex items-center justify-center">
                                    <motion.svg initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', damping: 20, stiffness: 80 }} viewBox="0 0 500 440" className="w-full h-full overflow-visible">
                                        <defs>
                                            {modules.map((m) => (
                                                <radialGradient 
                                                    key={`grad-${m.id}`} 
                                                    id={`grad-${m.id}`} 
                                                    gradientUnits="userSpaceOnUse"
                                                    cx="245" 
                                                    cy="230" 
                                                    r="150"
                                                >
                                                    <stop offset="0%" stopColor={m.color} stopOpacity={0.9} />
                                                    <stop offset="100%" stopColor="white" stopOpacity={0.2} />
                                                </radialGradient>
                                            ))}
                                        </defs>
                                        {(() => {
                                            const cx = 245, cy = 230
                                            const maxR = 150
                                            const labelR = 190
                                            const total = modules.length
                                            const step = 360 / total

                                            const toXY = (r: number, deg: number) => ({
                                                x: cx + r * Math.cos((deg * Math.PI) / 180),
                                                y: cy - r * Math.sin((deg * Math.PI) / 180),
                                            })

                                            const wedge = (r: number, s: number, e: number) => {
                                                if (r < 0.5) return ''
                                                const sp = toXY(r, s)
                                                const ep = toXY(r, e)
                                                return `M ${cx} ${cy} L ${sp.x} ${sp.y} A ${r} ${r} 0 0 1 ${ep.x} ${ep.y} Z`
                                            }

                                            return (
                                                <g>
                                                    {[0.25, 0.5, 0.75].map(f => (
                                                        <circle key={f} cx={cx} cy={cy} r={maxR * f} fill="none" stroke="#00000012" strokeWidth={1} strokeDasharray="4 4" />
                                                    ))}
                                                    {Array.from({ length: total }).map((_, i) => {
                                                        const p = toXY(maxR * 1.05, 90 - i * step)
                                                        return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#00000012" strokeWidth={1} strokeDasharray="2 2" />
                                                    })}
                                                    {modules.map((m, i: number) => {
                                                        const isActive = hoveredModule ? (hoveredModule === m.id) : topTwoIds.includes(m.id)
                                                        const sD = 90 - i * step
                                                        const eD = 90 - (i + 1) * step
                                                        const currentMaxR = isActive ? maxR : maxR * 0.92
                                                        const fillR = Math.max(0, Math.min(1, m.data.points / m.fullMark) * currentMaxR)
                                                        const midDeg = 90 - (i + 0.5) * step
                                                        const lp = toXY(labelR, midDeg)
                                                        const Icon = m.icon

                                                        return (
                                                            <g 
                                                                key={m.id} 
                                                                onMouseEnter={() => setHoveredModule(m.id)}
                                                                onMouseLeave={() => setHoveredModule(null)}
                                                                className="cursor-pointer"
                                                            >
                                                                <motion.path 
                                                                    d={wedge(currentMaxR, sD, eD)} 
                                                                    fill={`url(#grad-${m.id})`} 
                                                                    animate={{ opacity: isActive ? 0.35 : 0.08 }}
                                                                />
                                                                {fillR > 0.5 && (
                                                                    <motion.path 
                                                                        initial={{ d: wedge(0, sD, eD) }}
                                                                        animate={{ d: wedge(fillR, sD, eD) }}
                                                                        fill={`url(#grad-${m.id})`} 
                                                                        transition={{ type: 'spring', damping: 20, stiffness: 60, delay: 0.1 + (i * 0.05) }}
                                                                    />
                                                                )}
                                                                <motion.g 
                                                                    initial={false} 
                                                                    animate={{ opacity: isActive ? 1 : 0 }} 
                                                                    transition={{ duration: 0.2 }}
                                                                    style={{ pointerEvents: 'none' }}
                                                                >
                                                                    <rect x={lp.x - 16} y={lp.y - 40} width={32} height={32} rx={8} fill="rgba(0,0,0,0.04)" />
                                                                    <svg x={lp.x - 9} y={lp.y - 33} width={18} height={18} overflow="visible" color={m.color}>
                                                                        <Icon width="100%" height="100%" stroke="currentColor" />
                                                                    </svg>
                                                                    <text x={lp.x} y={lp.y + 8} fontSize="11" fontWeight="900" fill="black" textAnchor="middle" letterSpacing="1px">
                                                                        {m.label.toUpperCase()}
                                                                    </text>
                                                                    <text x={lp.x} y={lp.y + 19} fontSize="9" fontWeight="bold" fill="rgba(0,0,0,0.3)" textAnchor="middle" letterSpacing="1px">
                                                                        {m.context.toUpperCase()}
                                                                    </text>
                                                                    <text x={lp.x} y={lp.y + 32} fontSize="10" fontWeight="900" fill={m.color} textAnchor="middle">
                                                                        {m.data.points}/{m.fullMark} pts
                                                                    </text>
                                                                </motion.g>
                                                            </g>
                                                        )
                                                    })}
                                                    <circle cx={cx} cy={cy} r={10} fill="white" stroke="#00000010" strokeWidth={1} />
                                                    <circle cx={cx} cy={cy} r={4} fill="#00000010" />
                                                </g>
                                            )
                                        })()}
                                    </motion.svg>
                                </div>
                            ) : (
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={lineChartData} margin={{ top: 40, right: 10, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#00000008" vertical={false} />
                                        <XAxis dataKey="name" tick={{ fill: '#00000040', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} dy={10} />
                                        <YAxis tick={{ fill: '#00000040', fontSize: 9, fontWeight: 700 }} axisLine={false} tickLine={false} />
                                        <LineTooltip contentStyle={{ borderRadius: '12px', border: '1px solid rgba(0,0,0,0.1)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', fontSize: '11px', fontWeight: 'bold' }} />
                                        <Line type="monotone" dataKey="Total" stroke="#000" strokeWidth={3} dot={{ r: 4, fill: '#000' }} activeDot={{ r: 6 }} />
                                        <Line type="monotone" dataKey="Ops" stroke="#f43f5e" strokeWidth={2} dot={false} opacity={0.5} />
                                        <Line type="monotone" dataKey="Studio" stroke="#a855f7" strokeWidth={2} dot={false} opacity={0.5} />
                                    </LineChart>
                                </ResponsiveContainer>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {!isLoading && (
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mt-8 bg-white/80 backdrop-blur-md border border-black/[0.04] rounded-[32px] overflow-hidden relative group shadow-md"
                >
                    {/* Premium Glass Gradient Background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent pointer-events-none" />
                    
                    {/* Technical Grid Overlay (Light) */}
                    <div className="absolute inset-0 opacity-[0.03]" 
                         style={{ backgroundImage: `radial-gradient(circle at 1px 1px, black 1px, transparent 0)`, backgroundSize: '24px 24px' }} 
                    />
                    
                    <div className="relative z-10 p-8">
                        <div className="flex flex-col xl:flex-row items-center gap-10">
                            {/* Analysis Header */}
                            <div className="flex flex-col items-center xl:items-start shrink-0">
                                <div className="w-14 h-14 rounded-2xl bg-black/[0.03] border border-black/[0.05] flex items-center justify-center mb-4 relative overflow-hidden group-hover:border-black/10 transition-all">
                                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    <Brain className="w-7 h-7 text-black drop-shadow-sm" />
                                </div>
                                <h3 className="text-[16px] font-black text-black tracking-widest uppercase mb-1">Strategic Analysis</h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[9px] font-bold text-black/30 uppercase tracking-[0.2em]">Cortex Synchronized</span>
                                </div>
                            </div>

                            {/* Main Column Logic */}
                            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-10 border-t xl:border-t-0 xl:border-l border-black/[0.08] pt-10 xl:pt-0 xl:pl-10">
                                {/* Insight column */}
                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-black text-indigo-600 uppercase tracking-[0.25em]">Core Insight</h4>
                                    <p className="text-[13px] font-medium text-black/70 leading-relaxed max-w-md">
                                        {performanceSummary.efficiency > 75 
                                            ? `Your operational momentum is currently at peak levels. The synchronization between ${performanceSummary.bestPillar} and your core workflow is yielding high efficiency. However, the ${performanceSummary.worstPillar} pillar remains below threshold—stabilizing this will unlock your next growth tier.`
                                            : `System data indicates a focus variance. While ${performanceSummary.bestPillar} is sustaining the engine, a depletion in ${performanceSummary.worstPillar} is causing a significant friction loss in total yield. Prioritize maintenance over new expansion for the next 48 hours.`
                                        }
                                    </p>
                                </div>

                                {/* Suggestions column */}
                                <div className="space-y-4">
                                    <h4 className="text-[11px] font-black text-purple-600 uppercase tracking-[0.25em]">Strategic Protocols</h4>
                                    <div className="space-y-3">
                                        {[
                                            { label: `Deep Maintenance: ${performanceSummary.worstPillar}`, icon: Target, color: 'text-rose-500' },
                                            { label: `Leverage Peak: ${performanceSummary.bestPillar} Momentum`, icon: Sparkles, color: 'text-indigo-500' },
                                            { label: 'Weekly Velocity Calibration', icon: Activity, color: 'text-emerald-500' }
                                        ].map((p, i) => {
                                            const Icon = p.icon
                                            return (
                                                <div key={i} className="flex items-center gap-3 group/item">
                                                    <div className="w-8 h-8 rounded-lg bg-black/[0.02] border border-black/[0.05] flex items-center justify-center shrink-0 group-hover/item:border-black/10 transition-all">
                                                        <Icon className={cn("w-3.5 h-3.5", p.color)} />
                                                    </div>
                                                    <span className="text-[12px] font-black text-black/50 group-hover/item:text-black transition-colors">
                                                        {p.label}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            <AnimatePresence>
                {detailModal && (
                    <DetailsModal
                        title={detailModal?.title ?? ''}
                        item={detailModal?.item ?? ({} as PointBreakdown)}
                        onClose={() => setDetailModal(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}
