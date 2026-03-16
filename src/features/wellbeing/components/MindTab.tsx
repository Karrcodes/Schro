'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useWellbeing } from '@/features/wellbeing/contexts/WellbeingContext'
import { MoodHeatmap } from './MoodHeatmap'
import { ReflectionPage } from './ReflectionPage'
import { MoodTracker } from './MoodTracker'
import { Heart, Moon, Wind, Zap, Lock, Brain, Activity } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tab = 'mood' | 'reflect'

function ComingSoonCard({ icon: Icon, title, description, color, bg }: {
    icon: React.ElementType
    title: string
    description: string
    color: string
    bg: string
}) {
    return (
        <div className={cn('relative rounded-[28px] p-6 overflow-hidden border border-black/5', bg)}>
            {/* Lock badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-black/[0.06] backdrop-blur-sm rounded-full px-3 py-1.5">
                <Lock className="w-2.5 h-2.5 text-black/40" />
                <span className="text-[8px] font-black uppercase tracking-[0.2em] text-black/40">Coming Soon</span>
            </div>

            <div className={cn('w-10 h-10 rounded-2xl flex items-center justify-center mb-4', bg, 'border border-black/10')}>
                <Icon className={cn('w-5 h-5', color)} />
            </div>
            <h4 className="text-[13px] font-black text-black uppercase tracking-tight">{title}</h4>
            <p className="text-[11px] font-medium text-black/40 mt-1 leading-relaxed">{description}</p>
            <div className="mt-4 flex items-center gap-1.5">
                <div className="w-1 h-1 rounded-full bg-black/20" />
                <span className="text-[9px] font-black text-black/30 uppercase tracking-widest">Requires Apple Health</span>
            </div>
        </div>
    )
}

const TABS = [
    { id: 'mood' as Tab, label: 'Mood', icon: Heart },
    { id: 'reflect' as Tab, label: 'Reflect', icon: Brain },
]

import { WellbeingHeader } from './WellbeingHeader'
import { KarrFooter } from '@/components/KarrFooter'

export function MindTab() {
    const [activeTab, setActiveTab] = useState<Tab>('mood')

    return (
        <div className="flex flex-col h-full bg-[#FAFAFA]">
            <WellbeingHeader 
                title="Mind & Resilience" 
                subtitle="Wellbeing Protocol" 
                activeColor="text-indigo-500" 
            />

            <div className="flex-1 overflow-y-auto">
                <div className="max-w-7xl mx-auto w-full px-6 md:px-10 pb-12 space-y-10">
                    {/* Tab Navigation */}
                    <div className="flex items-center gap-2 bg-black/[0.03] p-1.5 rounded-[24px] w-fit border border-black/5">
                        {TABS.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex items-center gap-2 px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all',
                                    activeTab === tab.id
                                        ? 'bg-white text-black shadow-sm border border-black/5'
                                        : 'text-black/40 hover:text-black hover:bg-white/50'
                                )}
                            >
                                <tab.icon className={cn('w-4 h-4', activeTab === tab.id ? 'text-indigo-500' : 'text-black/20')} />
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <AnimatePresence mode="wait">
                        {activeTab === 'mood' && (
                            <motion.div
                                key="mood"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="space-y-8"
                            >
                                {/* Daily Mood Logger */}
                                <MoodTracker />

                                {/* Full-year Mood Heatmap */}
                                <MoodHeatmap />

                                {/* Coming Soon — Apple Health Features */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <Activity className="w-4 h-4 text-black/20" />
                                        <h3 className="text-[11px] font-black text-black/30 uppercase tracking-[0.4em]">Apple Health · Coming Soon</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <ComingSoonCard
                                            icon={Moon}
                                            title="Sleep Quality"
                                            description="Track sleep duration, deep sleep, and REM cycles from Apple Health."
                                            color="text-indigo-500"
                                            bg="bg-indigo-50"
                                        />
                                        <ComingSoonCard
                                            icon={Zap}
                                            title="HRV & Heart Rate"
                                            description="Monitor heart rate variability as a stress and recovery indicator."
                                            color="text-rose-500"
                                            bg="bg-rose-50"
                                        />
                                        <ComingSoonCard
                                            icon={Wind}
                                            title="Mindfulness Minutes"
                                            description="Sync mindfulness and breathing sessions from your Apple Watch."
                                            color="text-emerald-500"
                                            bg="bg-emerald-50"
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {activeTab === 'reflect' && (
                            <motion.div
                                key="reflect"
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.2 }}
                                className="bg-white border border-black/5 rounded-[40px] p-8 md:p-12"
                            >
                                {/* Section header */}
                                <div className="flex items-center gap-3 mb-10">
                                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                                        <Brain className="w-5 h-5 text-indigo-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-[11px] font-black text-black/30 uppercase tracking-[0.4em]">Inner Protocol</h2>
                                        <h3 className="text-[20px] font-black text-black uppercase tracking-tighter">Reflection Journal</h3>
                                    </div>
                                </div>
                                <ReflectionPage />
                            </motion.div>
                        )}
                    </AnimatePresence>

                    <KarrFooter />
                </div>
            </div>
        </div>
    )
}
