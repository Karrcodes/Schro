'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Brain, Heart, Wallet, Dumbbell, Sparkles,
    ChevronDown, CheckCircle2, Lock, Clock,
    TrendingUp, Activity, Target,
    Rocket, ArrowRight, Zap, Network,
    ExternalLink, PenLine, BarChart3, Cpu,
    Check
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { KarrFooter } from '@/components/KarrFooter'

// ─── Logo URLs ────────────────────────────────────────────────────────────────

const favicon = (domain: string) =>
    `https://www.google.com/s2/favicons?domain=${domain}&sz=64`

// ─── Integration Data ─────────────────────────────────────────────────────────

const INTEGRATIONS = [
    {
        id: 'gmail',
        name: 'Gmail',
        brand: 'Google',
        logo: favicon('mail.google.com'),
        logoBg: 'bg-white',
        status: 'connected' as const,
        shortDesc: 'Email context & smart task extraction',
        usedFor: [
            'Surfaced as context in the AI Assistant',
            'Extracts tasks and reminders from incoming emails',
            'Provides deadline awareness from your inbox',
        ],
        moduleLink: '/intelligence',
        moduleLabel: 'Open Assistant',
    },
    {
        id: 'gdrive',
        name: 'Google Drive',
        brand: 'Google',
        logo: favicon('drive.google.com'),
        logoBg: 'bg-white',
        status: 'connected' as const,
        shortDesc: 'File access & document intelligence',
        usedFor: [
            'AI assistant can reference your documents',
            'Studio research and creative asset access',
            'Goal and project documentation context',
        ],
        moduleLink: '/intelligence',
        moduleLabel: 'Open Assistant',
    },
    {
        id: 'gemini',
        name: 'Gemini',
        brand: 'Google',
        logo: favicon('gemini.google.com'),
        logoBg: 'bg-white',
        status: 'connected' as const,
        shortDesc: 'Primary AI reasoning core & context processing',
        usedFor: [
            'Powers the personalised AI assistant persona',
            'Cross-module contextual reasoning and synthesis',
            'Routine generation, goal analysis & life optimisation',
        ],
        moduleLink: '/intelligence',
        moduleLabel: 'Open Assistant',
    },
    {
        id: 'openai',
        name: 'OpenAI',
        brand: 'OpenAI',
        logo: favicon('openai.com'),
        logoBg: 'bg-white',
        status: 'connected' as const,
        shortDesc: 'Content generation, cover art & AI suggestions',
        usedFor: [
            'Studio content title & description generation',
            'AI-generated cover images for projects and content',
            'Task AI suggestions and smart recommendations',
        ],
        moduleLink: '/create',
        moduleLabel: 'Open Studio',
    },
    {
        id: 'monzo',
        name: 'Monzo',
        brand: 'Monzo',
        logo: favicon('monzo.com'),
        logoBg: 'bg-white',
        status: 'connected' as const,
        shortDesc: 'Real-time banking, pots & transaction sync',
        usedFor: [
            'Live pot balances across personal & business profiles',
            'Auto-categorised transaction history with analytics',
            'Savings goals linked directly to pot balances',
        ],
        moduleLink: '/finances',
        moduleLabel: 'Open Finances',
    },
    {
        id: 'gymgroup',
        name: 'TheGymGroup',
        brand: 'TheGymGroup',
        logo: favicon('thegymgroup.com'),
        logoBg: 'bg-white',
        status: 'connected' as const,
        shortDesc: 'Gym proximity & fitness session context',
        usedFor: [
            'Nearest location tracking for session planning',
            'Fitness routine suggestions based on accessible gyms',
            'Workout context for the Wellbeing intelligence layer',
        ],
        moduleLink: '/health/fitness',
        moduleLabel: 'Open Wellbeing',
    },
    {
        id: 'framer',
        name: 'Framer',
        brand: 'Framer',
        logo: favicon('framer.com'),
        logoBg: 'bg-white',
        status: 'connected' as const,
        shortDesc: 'Website publishing & content sync pipeline',
        usedFor: [
            'Syncs Studio content to your live Framer website',
            'Publishes blog posts, portfolio items and press features',
            'Hashnode integration for developer articles',
        ],
        moduleLink: '/create',
        moduleLabel: 'Open Studio',
    },
    {
        id: 'x',
        name: 'X (Twitter)',
        brand: 'X Corp',
        logo: favicon('x.com'),
        logoBg: 'bg-black',
        status: 'connected' as const,
        shortDesc: 'Social distribution & content publishing',
        usedFor: [
            'Content publishing pipeline from Studio to X',
            'Audience engagement context for content strategy',
            'Platform reach metrics in Studio analytics',
        ],
        moduleLink: '/create/content',
        moduleLabel: 'Open Content',
    },
]

// ─── Phase Data ───────────────────────────────────────────────────────────────

const PHASES = [
    {
        id: 1,
        label: 'Phase I',
        title: 'Life OS Foundation',
        state: 'active' as const,
        year: '2024–2026',
        description: 'The core infrastructure is live. Every major facet of daily life is trackable, manageable, and beginning to connect through a shared AI intelligence layer.',
        items: [
            'Tasks, goals, operations & reminders',
            'Real-time financial tracking (Monzo + manual)',
            'Studio — projects, content, canvas, portfolio',
            'Wellbeing — fitness, nutrition, mental health',
            'Vault — encrypted notes & secrets management',
            'AI Assistant with deep personal context',
            'Daily Brief & Evening Debrief intelligence',
            'Cross-module data aggregation & trend analysis',
        ],
    },
    {
        id: 2,
        label: 'Phase II',
        title: 'Biometric Layer',
        state: 'pending' as const,
        year: '2026–2028',
        description: 'The next layer unlocks continuous physiological monitoring. By integrating with consumer wearables, Schrö gains a real-time picture of your physical state and adapts everything around it.',
        items: [
            'Apple Health / HealthKit continuous data',
            'Oura Ring — sleep stages, HRV, readiness score',
            'Garmin / Whoop — training load & recovery metrics',
            'Continuous glucose monitoring integration',
            'Cortisol & hormonal rhythm tracking',
            'Adaptive scheduling based on biometric state',
            'Sleep quality analysis & optimisation',
            'Correlating mood, performance & physiology',
        ],
    },
    {
        id: 3,
        label: 'Phase III',
        title: 'Neural Integration',
        state: 'future' as const,
        year: '2028+',
        description: 'When non-invasive BCI technology reaches consumer maturity, Schrö will integrate cognitive-state awareness to deliver truly adaptive, real-time life intelligence at a neurological level.',
        items: [
            'Brain-computer interface (BCI) integration',
            'Real-time cognitive load & focus state detection',
            'Emotional and stress state awareness',
            'Thought-assisted task creation',
            'Peak performance window prediction',
            'Mental fatigue early warning system',
            'Neural-adaptive environment and workflow control',
            'Direct feedback loops between thought and action',
        ],
    },
]

// ─── Role Data ────────────────────────────────────────────────────────────────

const ROLES = [
    { icon: Brain,    label: 'Life Coach',       iconBg: 'bg-indigo-50',    iconColor: 'text-indigo-500',  desc: 'Guides your direction, builds habits, and holds you accountable to who you\'re becoming.' },
    { icon: Heart,    label: 'Therapist',         iconBg: 'bg-rose-50',      iconColor: 'text-rose-500',    desc: 'Tracks emotional patterns, surfaces mental health insights, helps you process your inner world.' },
    { icon: Dumbbell, label: 'Fitness Coach',     iconBg: 'bg-orange-50',    iconColor: 'text-orange-500',  desc: 'Designs adaptive training plans based on energy, recovery windows, and performance goals.' },
    { icon: Zap,      label: 'Nutritionist',      iconBg: 'bg-amber-50',     iconColor: 'text-amber-600',   desc: 'Optimises your nutrition based on goals, activity, physiological data, and what\'s in your fridge.' },
    { icon: Wallet,   label: 'Financial Advisor', iconBg: 'bg-emerald-50',   iconColor: 'text-emerald-600', desc: 'Tracks your wealth trajectory, spots waste, and guides every financial decision.' },
    { icon: PenLine,  label: 'Creative Mentor',   iconBg: 'bg-purple-50',    iconColor: 'text-purple-500',  desc: 'Elevates creative output, structures ideas into projects, connects them to your vision.' },
    { icon: Target,   label: 'Work Boss',         iconBg: 'bg-blue-50',      iconColor: 'text-blue-500',    desc: 'Prioritises your workload, manages deadlines, keeps you in peak execution during your best hours.' },
    { icon: Sparkles, label: 'Personal Oracle',   iconBg: 'bg-black/[0.04]', iconColor: 'text-black/60',   desc: 'The synthesis of everything — an intelligence that knows you holistically and guides you forward.' },
]

const DATA_SOURCES = [
    { label: 'Tasks & Goals', icon: Target,    iconBg: 'bg-blue-50',      iconColor: 'text-blue-500'    },
    { label: 'Finances',      icon: BarChart3,  iconBg: 'bg-emerald-50',   iconColor: 'text-emerald-600' },
    { label: 'Wellbeing',     icon: Heart,      iconBg: 'bg-rose-50',      iconColor: 'text-rose-500'    },
    { label: 'Studio',        icon: PenLine,    iconBg: 'bg-orange-50',    iconColor: 'text-orange-500'  },
    { label: 'Operations',    icon: Activity,   iconBg: 'bg-indigo-50',    iconColor: 'text-indigo-500'  },
    { label: 'Biometrics',    icon: Cpu,        iconBg: 'bg-black/[0.04]', iconColor: 'text-black/25',   muted: true },
]

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({ integration }: { integration: typeof INTEGRATIONS[0] }) {
    const [expanded, setExpanded] = useState(false)
    const [imgError, setImgError] = useState(false)

    return (
        <motion.div
            layout
            onClick={() => setExpanded(v => !v)}
            className={cn(
                'bg-white rounded-2xl border border-black/[0.06] shadow-sm cursor-pointer transition-all duration-200 overflow-hidden',
                expanded ? 'shadow-md' : 'hover:shadow-md hover:border-black/[0.1]'
            )}
        >
            <div className="p-4">
                <div className="flex items-start gap-3">
                    {/* Brand Logo */}
                    <div className={cn(
                        'w-9 h-9 rounded-xl border border-black/[0.06] flex items-center justify-center shrink-0 overflow-hidden shadow-sm',
                        integration.logoBg
                    )}>
                        {!imgError ? (
                            <img
                                src={integration.logo}
                                alt={integration.name}
                                className="w-6 h-6 object-contain"
                                onError={() => setImgError(true)}
                            />
                        ) : (
                            <span className={cn('text-[12px] font-bold', integration.logoBg === 'bg-black' ? 'text-white/60' : 'text-black/40')}>
                                {integration.name[0]}
                            </span>
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                            <p className="text-[13px] font-bold text-black/80 leading-none whitespace-nowrap">{integration.name}</p>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-full shrink-0">Live</span>
                        </div>
                        <p className="text-[11px] text-black/35 mt-0.5">{integration.brand}</p>
                    </div>
                </div>

                <p className="text-[12px] text-black/50 mt-3 leading-relaxed">{integration.shortDesc}</p>

                <div className="flex items-center gap-1 mt-3 text-black/30 hover:text-black/60 transition-colors">
                    <span className="text-[10px] font-bold uppercase tracking-widest">
                        {expanded ? 'Hide details' : 'How it\'s used'}
                    </span>
                    <ChevronDown className={cn('w-3 h-3 transition-transform', expanded && 'rotate-180')} />
                </div>
            </div>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 pt-3 border-t border-black/[0.04] space-y-3 bg-black/[0.01]">
                            <div className="space-y-2">
                                {integration.usedFor.map((use, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <Check className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />
                                        <span className="text-[11px] text-black/50 leading-relaxed">{use}</span>
                                    </div>
                                ))}
                            </div>
                            <Link
                                href={integration.moduleLink}
                                onClick={e => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-black/30 hover:text-black/70 transition-colors"
                            >
                                {integration.moduleLabel}
                                <ExternalLink className="w-2.5 h-2.5" />
                            </Link>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// ─── Phase Card ───────────────────────────────────────────────────────────────

function PhaseCard({ phase, index }: { phase: typeof PHASES[0]; index: number }) {
    const [expanded, setExpanded] = useState(phase.state === 'active')

    const config = {
        active:  { icon: CheckCircle2, iconBg: 'bg-emerald-50',   iconColor: 'text-emerald-600', badge: 'Active',  badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-100', dot: 'bg-emerald-500' },
        pending: { icon: Clock,        iconBg: 'bg-amber-50',     iconColor: 'text-amber-600',   badge: 'Pending', badgeCls: 'bg-amber-50 text-amber-700 border-amber-100',       dot: 'bg-amber-400'   },
        future:  { icon: Lock,         iconBg: 'bg-black/[0.04]', iconColor: 'text-black/30',    badge: 'Future',  badgeCls: 'bg-black/[0.03] text-black/35 border-black/[0.06]', dot: 'bg-black/20'    },
    }[phase.state]

    const Icon = config.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.08 }}
            className={cn(
                'bg-white rounded-2xl border border-black/[0.06] shadow-sm overflow-hidden',
                phase.state !== 'active' && 'opacity-70'
            )}
        >
            <button onClick={() => setExpanded(v => !v)} className="w-full p-5 text-left">
                <div className="flex items-start gap-4">
                    <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', config.iconBg)}>
                        <Icon className={cn('w-4 h-4', config.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={cn('text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border', config.badgeCls)}>
                                {config.badge}
                            </span>
                            <span className="text-[10px] text-black/25 font-medium">{phase.label} · {phase.year}</span>
                        </div>
                        <h3 className="text-[16px] font-bold text-black/80 tracking-tight">{phase.title}</h3>
                        <p className="text-[12px] text-black/40 mt-1.5 leading-relaxed">{phase.description}</p>
                    </div>
                    <ChevronDown className={cn('w-4 h-4 text-black/20 shrink-0 mt-1 transition-transform', expanded && 'rotate-180')} />
                </div>
            </button>

            <AnimatePresence>
                {expanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-5 pb-5 border-t border-black/[0.04] pt-4 bg-black/[0.01]">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
                                {phase.items.map((item, i) => (
                                    <div key={i} className="flex items-start gap-2 py-0.5">
                                        <div className={cn('w-1 h-1 rounded-full shrink-0 mt-[7px]', config.dot)} />
                                        <span className="text-[12px] text-black/50 leading-relaxed">{item}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function SchrolinkPage() {
    return (
        <div className="bg-[#fafafa] min-h-screen flex flex-col">
            <div className="flex-1 max-w-5xl w-full mx-auto px-6 py-10 space-y-14">

                {/* ── Vision ─────────────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                    className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-8"
                >
                    <div className="flex items-start justify-between gap-4 mb-4">
                        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-black/25">The Vision</p>
                        <span className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full shrink-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Phase I Active
                        </span>
                    </div>
                    <h2 className="text-[22px] font-bold text-black tracking-tight leading-snug max-w-2xl">
                        A singular intelligence that knows every facet of your life — and uses that knowledge to help you live it better.
                    </h2>
                    <p className="text-[13px] text-black/45 mt-4 leading-relaxed max-w-2xl">
                        Schrö is being built in three phases. The first is near-complete: a life management system that tracks tasks, goals, finances, wellbeing, and creative work — with AI woven throughout. The phases that follow will layer in biometric data and, eventually, neural integration — building toward a system that doesn't just track your life, but actively shapes it.
                    </p>
                    <div className="flex items-center gap-2 mt-6 pt-5 border-t border-black/[0.04]">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-black/25">Progress</span>
                        <div className="flex items-center gap-1.5">
                            <div className="h-1.5 w-20 rounded-full bg-emerald-500" />
                            <div className="h-1.5 w-20 rounded-full bg-black/[0.06]" />
                            <div className="h-1.5 w-20 rounded-full bg-black/[0.06]" />
                        </div>
                        <span className="text-[10px] text-black/30 font-medium">1 of 3 phases</span>
                    </div>
                </motion.div>

                {/* ── Three Phases ────────────────────────────────────────────── */}
                <section>
                    <div className="flex items-center gap-2.5 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center">
                            <Rocket className="w-4 h-4 text-orange-500" />
                        </div>
                        <div>
                            <h2 className="text-[16px] font-bold text-black">Three Phases to Full Integration</h2>
                            <p className="text-[11px] text-black/35">Each phase unlocks a new layer of intelligence — click to expand</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {PHASES.map((phase, i) => (
                            <PhaseCard key={phase.id} phase={phase} index={i} />
                        ))}
                    </div>
                </section>

                {/* ── Who Schrö Will Be ────────────────────────────────────────── */}
                <section>
                    <div className="flex items-center gap-2.5 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center">
                            <Sparkles className="w-4 h-4 text-rose-500" />
                        </div>
                        <div>
                            <h2 className="text-[16px] font-bold text-black">Who Schrö Will Be</h2>
                            <p className="text-[11px] text-black/35">One system. Eight experts. Always with you.</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {ROLES.map((role, i) => {
                            const Icon = role.icon
                            return (
                                <motion.div
                                    key={role.label}
                                    initial={{ opacity: 0, y: 8 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ delay: i * 0.04 }}
                                    className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-4 hover:shadow-md hover:border-black/[0.1] transition-all"
                                >
                                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', role.iconBg)}>
                                        <Icon className={cn('w-4 h-4', role.iconColor)} />
                                    </div>
                                    <h4 className="text-[13px] font-bold text-black/80 mb-1">{role.label}</h4>
                                    <p className="text-[11px] text-black/40 leading-relaxed">{role.desc}</p>
                                </motion.div>
                            )
                        })}
                    </div>
                </section>

                {/* ── Connected Integrations ───────────────────────────────────── */}
                <section>
                    <div className="flex items-center gap-2.5 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center">
                            <Network className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div>
                            <h2 className="text-[16px] font-bold text-black">Connected Integrations</h2>
                            <p className="text-[11px] text-black/35">The data sources powering Schrö today — click any to see details</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {INTEGRATIONS.map(integration => (
                            <IntegrationCard key={integration.id} integration={integration} />
                        ))}
                    </div>
                </section>

                {/* ── How Schrö Thinks ─────────────────────────────────────────── */}
                <section>
                    <div className="flex items-center gap-2.5 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-violet-50 flex items-center justify-center">
                            <Brain className="w-4 h-4 text-violet-500" />
                        </div>
                        <div>
                            <h2 className="text-[16px] font-bold text-black">How Schrö Thinks</h2>
                            <p className="text-[11px] text-black/35">Data from every module flows into a shared intelligence layer</p>
                        </div>
                    </div>
                    <div className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-6">
                        <div className="mb-5">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-black/25 mb-3">Data Sources</p>
                            <div className="flex flex-wrap gap-2">
                                {DATA_SOURCES.map(s => {
                                    const Icon = s.icon
                                    return (
                                        <div key={s.label} className={cn(
                                            'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/[0.05] bg-black/[0.02]',
                                            s.muted && 'opacity-40'
                                        )}>
                                            <div className={cn('w-5 h-5 rounded flex items-center justify-center', s.iconBg)}>
                                                <Icon className={cn('w-2.5 h-2.5', s.iconColor)} />
                                            </div>
                                            <span className="text-[11px] font-medium text-black/50">
                                                {s.label}
                                                {s.muted && <span className="text-black/25 ml-1">· Phase II</span>}
                                            </span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 mb-5">
                            <div className="flex-1 h-px bg-black/[0.06]" />
                            <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white text-[11px] font-bold">
                                <Sparkles className="w-3.5 h-3.5" />
                                Intelligence Layer · AI Core
                            </div>
                            <div className="flex-1 h-px bg-black/[0.06]" />
                        </div>

                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-widest text-black/25 mb-3">Outputs</p>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { label: 'Daily Brief',   icon: Sparkles,   iconBg: 'bg-amber-50',   iconColor: 'text-amber-600'   },
                                    { label: 'AI Assistant',  icon: Brain,      iconBg: 'bg-violet-50',  iconColor: 'text-violet-500'  },
                                    { label: 'Predictions',   icon: TrendingUp, iconBg: 'bg-emerald-50', iconColor: 'text-emerald-600' },
                                    { label: 'Optimisations', icon: Zap,        iconBg: 'bg-yellow-50',  iconColor: 'text-yellow-600'  },
                                ].map(o => {
                                    const Icon = o.icon
                                    return (
                                        <div key={o.label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-black/[0.05] bg-black/[0.02]">
                                            <div className={cn('w-5 h-5 rounded flex items-center justify-center', o.iconBg)}>
                                                <Icon className={cn('w-2.5 h-2.5', o.iconColor)} />
                                            </div>
                                            <span className="text-[11px] font-medium text-black/50">{o.label}</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {/* ── Awaiting Integration ────────────────────────────────────── */}
                <section>
                    <div className="flex items-center gap-2.5 mb-5">
                        <div className="w-8 h-8 rounded-lg bg-black/[0.04] flex items-center justify-center">
                            <Lock className="w-4 h-4 text-black/35" />
                        </div>
                        <div>
                            <h2 className="text-[16px] font-bold text-black">Awaiting Integration</h2>
                            <p className="text-[11px] text-black/35">Technologies we're building toward as hardware matures</p>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                            { name: 'Oura Ring',        phase: 'II',  desc: 'Sleep, HRV, readiness' },
                            { name: 'Apple Health',     phase: 'II',  desc: 'Continuous health data' },
                            { name: 'Garmin / Whoop',   phase: 'II',  desc: 'Training load & recovery' },
                            { name: 'CGM',              phase: 'II',  desc: 'Glucose monitoring' },
                            { name: 'Custom Wearable',  phase: 'II+', desc: 'Schrö-native sensor' },
                            { name: 'Neural Interface', phase: 'III', desc: 'Cognitive state awareness' },
                            { name: 'BCI Platform',     phase: 'III', desc: 'Brain-computer interface' },
                            { name: 'Cortical Data',    phase: 'III', desc: 'Direct neural stream' },
                        ].map((item, i) => (
                            <motion.div
                                key={item.name}
                                initial={{ opacity: 0, y: 8 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.04 }}
                                className="bg-white rounded-xl border border-black/[0.06] shadow-sm p-4 relative opacity-60"
                            >
                                <Lock className="w-3 h-3 text-black/15 absolute top-3 right-3" />
                                <span className="text-[9px] font-bold uppercase tracking-widest text-black/25 block mb-2">Phase {item.phase}</span>
                                <p className="text-[12px] font-bold text-black/50 leading-tight mb-1">{item.name}</p>
                                <p className="text-[10px] text-black/30">{item.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* ── Closing ─────────────────────────────────────────────────── */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-white rounded-2xl border border-black/[0.06] shadow-sm p-8 text-center"
                >
                    <img src="/schro-logo-svg.svg" alt="Schrö" className="w-8 h-8 object-contain opacity-10 mx-auto mb-4" />
                    <p className="text-[15px] font-bold text-black/60 leading-relaxed max-w-xl mx-auto">
                        "Schrö is the bridge between who you are today and who you are becoming. Every data point captured is a step toward a system that truly knows you."
                    </p>
                    <div className="flex items-center justify-center gap-3 mt-6 pt-5 border-t border-black/[0.04] flex-wrap">
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-600">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Phase I Active
                        </div>
                        <ArrowRight className="w-3 h-3 text-black/15" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-black/25">Phase II Pending</span>
                        <ArrowRight className="w-3 h-3 text-black/15" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-black/15">Phase III Future</span>
                    </div>
                </motion.div>

            </div>

            <div className="max-w-5xl w-full mx-auto px-6">
                <KarrFooter />
            </div>
        </div>
    )
}
