'use client'

import React, { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
    ResponsiveContainer, Tooltip 
} from 'recharts'
import { 
    Sparkles, TrendingUp, AlertCircle, ArrowUpRight, 
    Brain, Zap, Target, Activity, RefreshCw 
} from 'lucide-react'
import { useLifeMetricsAggregator, LifeMetrics } from '../../hooks/useLifeMetricsAggregator'
import { cn } from '@/lib/utils'

export function LifePerformanceVisualizer() {
    const metrics = useLifeMetricsAggregator()
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [aiInsight, setAiInsight] = useState<string | null>(null)

    const chartData = useMemo(() => {
        // Normalize metrics to 0-100 scale for the radar chart
        return [
            { subject: 'Finance', A: Math.min(100, metrics.finance.budgetScore), fullMark: 100 },
            { subject: 'Ops', A: Math.min(100, metrics.tasks.completionRate), fullMark: 100 },
            { subject: 'Studio', A: Math.min(100, (metrics.studio.activeProjects > 0 ? 80 : 20) + Math.min(20, metrics.studio.totalSparks)), fullMark: 100 },
            { subject: 'Wellbeing', A: Math.min(100, (metrics.wellbeing.weeklyWorkoutCount / 4) * 100), fullMark: 100 },
            { subject: 'Manifest', A: Math.min(100, metrics.manifestation.goalMilestoneCompletion), fullMark: 100 },
        ]
    }, [metrics])

    const generateAIAnalysis = async () => {
        setIsAnalyzing(true)
        try {
            const response = await fetch('/api/intelligence/sessions/life-performance/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: `Analyze these system metrics and provide a concise, high-impact assessment of my current performance and focus areas. Be direct (Stoic/Goggins posture if possible): ${JSON.stringify(metrics)}`,
                    role: 'user'
                })
            })
            const data = await response.json()
            if (data.message?.content) {
                setAiInsight(data.message.content)
            }
        } catch (e) {
            console.error('AI Analysis Failed', e)
            setAiInsight("System analysis offline. Focus on the data.")
        } finally {
            setIsAnalyzing(false)
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Visualisation Side */}
            <div className="relative h-[300px] w-full flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                        <PolarGrid stroke="#00000010" />
                        <PolarAngleAxis 
                            dataKey="subject" 
                            tick={{ fill: '#00000040', fontSize: 10, fontWeight: 900, letterSpacing: '0.1em' }} 
                        />
                        <Radar
                            name="Performance"
                            dataKey="A"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            fillOpacity={0.15}
                        />
                        <Tooltip 
                            content={({ active, payload }) => {
                                if (active && payload && payload.length) {
                                    return (
                                        <div className="bg-black text-white px-3 py-1.5 rounded-lg shadow-xl border border-white/10 text-[10px] font-black uppercase tracking-widest">
                                            {payload[0].payload.subject}: {payload[0].value}%
                                        </div>
                                    )
                                }
                                return null
                            }}
                        />
                    </RadarChart>
                </ResponsiveContainer>
                
                {/* Centre Badge */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="bg-white/80 backdrop-blur-sm border border-black/5 rounded-full p-3 shadow-sm">
                        <Activity className="w-5 h-5 text-blue-500/50" />
                    </div>
                </div>
            </div>

            {/* Analysis Side */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h3 className="text-[14px] font-black text-black uppercase tracking-widest italic">Life Intelligence</h3>
                        <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest">AI Performance Diagnostic</p>
                    </div>
                    <button 
                        onClick={generateAIAnalysis}
                        disabled={isAnalyzing}
                        className="p-2.5 bg-black text-white rounded-xl hover:scale-110 transition-transform active:scale-95 disabled:opacity-50"
                    >
                        {isAnalyzing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    </button>
                </div>

                <div className="min-h-[160px] bg-black/[0.02] border border-black/[0.05] rounded-2xl p-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none rotate-12 transition-transform group-hover:rotate-0">
                        <Brain className="w-24 h-24 text-black" />
                    </div>

                    <AnimatePresence mode="wait">
                        {aiInsight ? (
                            <motion.div
                                key="insight"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="relative z-10 space-y-4"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-600">Deep Analysis</span>
                                </div>
                                <p className="text-[13px] font-bold text-black/70 leading-relaxed italic">
                                    {aiInsight}
                                </p>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="placeholder"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="h-full flex flex-col items-center justify-center text-center space-y-3 opacity-30 py-8"
                            >
                                <Target className="w-6 h-6 text-black" />
                                <p className="text-[11px] font-bold uppercase tracking-widest">Initiate scan for system insights</p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-white border border-black/[0.05] rounded-xl flex items-center gap-3 shadow-sm hover:border-blue-200 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                            <TrendingUp className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-black/30 tracking-widest leading-none mb-1">Efficiency</p>
                            <p className="text-[13px] font-black text-black leading-none">{Math.round(metrics.tasks.completionRate)}%</p>
                        </div>
                    </div>
                    <div className="p-3 bg-white border border-black/[0.05] rounded-xl flex items-center gap-3 shadow-sm hover:border-emerald-200 transition-colors">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                            <Target className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-black/30 tracking-widest leading-none mb-1">Manifest</p>
                            <p className="text-[13px] font-black text-black leading-none">{Math.round(metrics.manifestation.goalMilestoneCompletion)}%</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
