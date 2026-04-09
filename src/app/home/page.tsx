'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Brain, Heart, Wallet, Dumbbell, Sparkles,
    CheckCircle2, Lock, Clock,
    TrendingUp, Activity, Target,
    Rocket, ArrowRight, Zap, Network,
    ExternalLink, PenLine, BarChart3, Cpu,
    Check, ChevronRight, SlidersHorizontal, Sliders
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { KarrFooter } from '@/components/KarrFooter'
import { PHASES, ROLES, DATA_SOURCES, INTEGRATIONS } from '@/lib/schroData'

// ─── Shared UI Components (Mirroring Schrolink) ───────────────────────────────

function SectionHeader({ icon: Icon, title, subtitle, iconCls }: { icon: any, title: string, subtitle: string, iconCls: string }) {
    return (
        <div className="flex items-center gap-2.5 mb-8">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", iconCls)}>
                <Icon className="w-5 h-5" />
            </div>
            <div>
                <h2 className="text-[18px] font-bold text-black tracking-tight">{title}</h2>
                <p className="text-[12px] text-black/35 font-medium">{subtitle}</p>
            </div>
        </div>
    )
}

function RoleCard({ role, index }: { role: typeof ROLES[0], index: number }) {
    const Icon = role.icon
    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-6 hover:shadow-md hover:border-black/[0.1] transition-all group"
        >
            <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110', role.iconBg)}>
                <Icon className={cn('w-5 h-5', role.iconColor)} />
            </div>
            <h4 className="text-[15px] font-bold text-black/80 mb-2">{role.label}</h4>
            <p className="text-[12px] text-black/40 leading-relaxed font-medium">{role.desc}</p>
        </motion.div>
    )
}

// ─── Main Landing Page ────────────────────────────────────────────────────────

export default function LandingPage() {
    const [email, setEmail] = useState('')
    const [isSubmitted, setIsSubmitted] = useState(false)

    const handleWaitlist = (e: React.FormEvent) => {
        e.preventDefault()
        if (email) {
            setIsSubmitted(true)
            setEmail('')
        }
    }

    return (
        <div className="bg-[#fafafa] min-h-screen flex flex-col selection:bg-black selection:text-white">
            {/* Header / Nav */}
            <header className="fixed top-0 w-full z-50 bg-[#fafafa]/80 backdrop-blur-md border-b border-black/[0.03] px-6 py-4">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-2">
                        <span className="text-2xl font-serif italic font-medium tracking-tight leading-none">Schrö</span>
                    </Link>
                    <div className="flex items-center gap-6">
                        <Link href="/login?mode=signin" className="text-[13px] font-bold text-black/40 hover:text-black transition-colors">Sign In</Link>
                        <Link href="/login?mode=signup" className="px-5 py-2 bg-black text-white text-[13px] font-bold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-all">
                            Sign up
                        </Link>
                    </div>
                </div>
            </header>

            <main className="flex-1 pt-32 pb-20">
                <div className="max-w-6xl mx-auto px-6 space-y-24">
                    
                    {/* ── Hero Section ─────────────────────────────────────────── */}
                    <section className="text-center space-y-8 py-10">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="space-y-6"
                        >
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/[0.03] border border-black/[0.05] text-black/40 text-[10px] font-bold uppercase tracking-[0.2em]">
                                <Sparkles className="w-3.5 h-3.5" />
                                The Intelligence of Your Life
                            </div>
                            <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-black flex flex-col gap-2">
                                <span>A singular intelligence.</span>
                                <span className="text-black/20">Always with you.</span>
                            </h1>
                            <p className="text-[15px] md:text-[18px] text-black/45 font-medium max-w-2xl mx-auto leading-relaxed">
                                Schrö is a premium Life Operating System that merges your tasks, finances, wellbeing, and projects into a unified core of personal intelligence.
                            </p>
                        </motion.div>

                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.4, duration: 1 }}
                            className="pt-10 flex justify-center"
                        >
                            <div className="relative group">
                                {/* Component-based visual representation */}
                                <div className="bg-white rounded-[32px] border border-black/[0.1] shadow-2xl p-8 md:p-12 max-w-4xl w-full grid grid-cols-1 md:grid-cols-3 gap-8 relative overflow-hidden group/card transition-all hover:shadow-black/[0.05]">
                                    <div className="space-y-4 text-left relative z-10">
                                        <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-500 shadow-sm border border-blue-100">
                                            <Activity className="w-4 h-4" />
                                        </div>
                                        <div className="h-2 w-24 bg-black/[0.06] rounded-full" />
                                        <div className="h-2 w-full bg-black/[0.03] rounded-full" />
                                        <div className="h-2 w-2/3 bg-black/[0.03] rounded-full" />
                                    </div>
                                    <div className="space-y-6 text-left p-8 bg-black/[0.03] rounded-[24px] border border-black/[0.05] relative z-10 shadow-inner">
                                        <div className="w-12 h-12 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg">
                                            <Sparkles className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-3">
                                            <div className="h-2.5 w-20 bg-black/20 rounded-full" />
                                            <div className="h-2.5 w-full bg-black/10 rounded-full" />
                                            <div className="h-2.5 w-3/4 bg-black/10 rounded-full" />
                                        </div>
                                    </div>
                                    <div className="space-y-4 text-left relative z-10">
                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-500 shadow-sm border border-emerald-100">
                                            <Wallet className="w-4 h-4" />
                                        </div>
                                        <div className="h-2 w-28 bg-black/[0.06] rounded-full" />
                                        <div className="h-2 w-full bg-black/[0.03] rounded-full" />
                                        <div className="h-2 w-3/4 bg-black/[0.03] rounded-full" />
                                    </div>
                                    {/* Decorative subtle patterns */}
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-black/[0.01] rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
                                </div>
                                <div className="absolute -inset-4 bg-gradient-to-b from-transparent via-white/5 to-white/40 pointer-events-none rounded-[40px]" />
                            </div>
                        </motion.div>
                    </section>


                    {/* ── The Eight Experts ─────────────────────────────────────── */}
                    <section id="roles">
                        <SectionHeader 
                            icon={Sparkles} 
                            title="The Eight Experts" 
                            subtitle="One System. Eight Roles. Always With You." 
                            iconCls="bg-rose-50 text-rose-500"
                        />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {ROLES.map((role, i) => (
                                <RoleCard key={role.label} role={role} index={i} />
                            ))}
                        </div>
                    </section>

                    {/* ── Intelligence Synthesis ─────────────────────────────────── */}
                    <section id="synergy" className="bg-white rounded-[32px] border border-black/[0.06] shadow-sm p-10 md:p-14 text-center">
                        <div className="max-w-2xl mx-auto space-y-6">
                            <h2 className="text-[24px] md:text-[32px] font-bold text-black tracking-tight leading-tight">
                                Data from every module flows into a shared intelligence layer.
                            </h2>
                            <p className="text-[14px] text-black/40 font-medium leading-relaxed">
                                No more silos. Your finances inform your goals. Your goals drive your tasks. Your wellbeing shapes your schedule. This is holistic life management.
                            </p>
                        </div>
                        
                        <div className="mt-12 flex flex-wrap justify-center gap-3">
                            {DATA_SOURCES.map((s, i) => {
                                const Icon = s.icon
                                return (
                                    <motion.div 
                                        key={s.label}
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.05 }}
                                        className={cn(
                                            'flex items-center gap-2 px-4 py-2 rounded-xl border border-black/[0.05] bg-black/[0.02]',
                                            s.muted && 'opacity-40'
                                        )}
                                    >
                                        <Icon className={cn('w-3.5 h-3.5', s.iconColor)} />
                                        <span className="text-[12px] font-bold text-black/50">{s.label}</span>
                                    </motion.div>
                                )
                            })}
                        </div>

                        <div className="mt-8 flex justify-center">
                            <div className="px-6 py-3 rounded-2xl bg-black text-white text-[13px] font-bold flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-emerald-400" />
                                Intelligence Core
                            </div>
                        </div>
                    </section>

                    {/* ── The Evolution (Phases) ──────────────────────────────────── */}
                    <section id="roadmap" className="space-y-12">
                        <SectionHeader 
                            icon={Rocket} 
                            title="The Chronology of Intelligence" 
                            subtitle="Three Phases to Fulfilment" 
                            iconCls="bg-orange-50 text-orange-600"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {PHASES.map((phase, i) => {
                                const config = {
                                    active:  { icon: CheckCircle2, cls: 'border-emerald-500/20 bg-emerald-50/20', textCls: 'text-emerald-600', dot: 'bg-emerald-500' },
                                    pending: { icon: Clock,        cls: 'border-orange-500/10 bg-orange-50/20',     textCls: 'text-orange-600',  dot: 'bg-orange-400' },
                                    future:  { icon: Lock,         cls: 'border-black/5 bg-black/[0.01]',         textCls: 'text-black/30',    dot: 'bg-black/20' }
                                }[phase.state]
                                const Icon = config.icon
                                return (
                                    <motion.div
                                        key={phase.id}
                                        initial={{ opacity: 0, y: 12 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: i * 0.1 }}
                                        className={cn(
                                            "p-8 rounded-[32px] border transition-all h-full flex flex-col",
                                            config.cls
                                        )}
                                    >
                                        <div className="flex items-center justify-between mb-6">
                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">{phase.label}</span>
                                            <Icon className={cn("w-4 h-4", config.textCls)} />
                                        </div>
                                        <h3 className="text-[18px] font-bold text-black mb-1">{phase.title}</h3>
                                        <p className="text-[11px] font-bold mb-6 opacity-30">{phase.year}</p>
                                        <p className="text-[13px] text-black/50 leading-relaxed font-medium flex-1 mb-8">{phase.description}</p>
                                        <div className="space-y-2">
                                            {phase.items.slice(0, 4).map((item, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <div className={cn("w-1 h-1 rounded-full", config.dot)} />
                                                    <span className="text-[11px] font-medium text-black/35 truncate">{item}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )
                            })}
                        </div>
                    </section>

                    {/* ── Call to Action (Waitlist) ─────────────────────────────── */}
                    <section id="waitlist" className="pt-20 pb-10 text-center">
                        <div className="max-w-xl mx-auto space-y-8">
                            <div className="space-y-4">
                                <h2 className="text-4xl font-bold tracking-tight text-black">Ready to orchestrate your life?</h2>
                                <p className="text-[15px] font-medium text-black/40 leading-relaxed">
                                    Schrö is currently in private Alpha. Join the waitlist to get early access as we roll out the Life OS Foundation.
                                </p>
                            </div>

                            {!isSubmitted ? (
                                <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3">
                                    <input 
                                        type="email" 
                                        required 
                                        placeholder="Enter your email" 
                                        className="flex-1 px-6 py-4 bg-white border border-black/[0.08] rounded-2xl text-[14px] font-bold outline-none focus:border-black/20 transition-all placeholder:text-black/20"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                    />
                                    <button className="px-8 py-4 bg-black text-white text-[14px] font-bold rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all whitespace-nowrap">
                                        Join Early Access
                                    </button>
                                </form>
                            ) : (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="p-6 bg-emerald-50 border border-emerald-100 rounded-2xl"
                                >
                                    <p className="text-emerald-700 font-bold text-[14px] flex items-center justify-center gap-2">
                                        <CheckCircle2 className="w-4 h-4" />
                                        You're on the list! We'll be in touch soon.
                                    </p>
                                </motion.div>
                            )}

                            <div className="flex items-center justify-center gap-4 text-black/20">
                                <Link href="/system/roadmap" className="text-[10px] font-bold uppercase tracking-widest hover:text-black transition-colors">Roadmap</Link>
                                <span className="w-1 h-1 rounded-full bg-current" />
                                <Link href="/privacy" className="text-[10px] font-bold uppercase tracking-widest hover:text-black transition-colors">Privacy</Link>
                                <span className="w-1 h-1 rounded-full bg-current" />
                                <Link href="/terms" className="text-[10px] font-bold uppercase tracking-widest hover:text-black transition-colors">Terms</Link>
                            </div>
                        </div>
                    </section>

                </div>
            </main>

            <div className="max-w-6xl w-full mx-auto px-6 pb-12">
                <KarrFooter />
            </div>
            
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap');
                
                body {
                    font-family: 'Outfit', sans-serif;
                }
            `}</style>
        </div>
    )
}
