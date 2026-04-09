'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
import {
    Brain, Heart, Wallet, Dumbbell, Sparkles,
    CheckCircle2, Lock, Clock,
    TrendingUp, Activity, Target,
    Rocket, ArrowRight, Zap, Network,
    ExternalLink, PenLine, BarChart3, Cpu,
    Check, ChevronRight, SlidersHorizontal, Sliders,
    Compass, Palette, Gauge
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

// ─── Platform Demo Components ──────────────────────────────────────────────────

const DEMO_MODULES = [
    { id: 'wellbeing', label: 'Wellbeing', icon: Heart, color: '#10b981', points: 184, max: 200, context: 'Health & Vitality' },
    { id: 'finance', label: 'Finance', icon: Wallet, color: '#3b82f6', points: 162, max: 200, context: 'Capital & Cashflow' },
    { id: 'ops', label: 'Ops', icon: Activity, color: '#f43f5e', points: 195, max: 200, context: 'Efficiency & Tasks' },
    { id: 'studio', label: 'Studio', icon: Palette, color: '#a855f7', points: 145, max: 200, context: 'Creative Yield' },
    { id: 'manifest', label: 'Manifest', icon: Compass, color: '#f59e0b', points: 178, max: 200, context: 'Aspiration Sync' },
]

const DEMO_TASKS = [
    { title: "Capital Injection: +£2.4k", icon: Wallet, color: '#3b82f6', x: -230, y: -220, z: 40, rx: 10, ry: -15, delay: 0.2 },
    { title: "Deep Work: 4h Session", icon: Zap, color: '#f43f5e', x: 230, y: 10, z: 60, rx: -10, ry: -15, delay: 0.4 },
]

function FloatingTask({ title, icon: Icon, color, x, y, z, rx, ry, delay }: typeof DEMO_TASKS[0]) {
    return (
        <motion.div
            initial={{ opacity: 0, x: 0, y: 0, z: -100, scale: 0, rotateX: 0, rotateY: 0 }}
            animate={{ 
                opacity: 1, 
                x, y, z, 
                scale: 1,
                rotateX: rx,
                rotateY: ry
            }}
            transition={{ 
                type: 'spring', 
                damping: 20, 
                stiffness: 70, 
                delay 
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30"
        >
            <motion.div
                animate={{ 
                    y: [0, -10, 0],
                    rotateZ: [0, 1, 0]
                }}
                transition={{ 
                    duration: 4 + Math.random() * 2, 
                    repeat: Infinity, 
                    ease: "easeInOut" 
                }}
                className="bg-white/40 backdrop-blur-md border border-white/40 p-3 rounded-2xl shadow-xl flex items-center gap-3 w-[180px] group hover:bg-white/60 transition-colors"
                style={{ transformStyle: 'preserve-3d' }}
            >
                <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-inner"
                    style={{ backgroundColor: `${color}15`, color }}
                >
                    <Icon className="w-4 h-4" />
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-[10px] font-black text-black tracking-tight truncate">{title}</span>
                    <div className="flex items-center gap-1 mt-0.5">
                        <div className="w-1 h-1 rounded-full bg-emerald-500" />
                        <span className="text-[7px] font-bold text-black/30 uppercase tracking-widest">Synchronized</span>
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}

function NeuralRadarChart() {
    const [hoveredId, setHoveredId] = useState<string | null>(null)
    const [autoActiveIds, setAutoActiveIds] = useState<string[]>([])

    // Automatic Attract Mode / Scanning Animation
    useEffect(() => {
        const switchSectors = () => {
            if (hoveredId) return
            
            const total = DEMO_MODULES.length
            // 1. Identify all possible non-adjacent pairs
            const allPairs: [number, number][] = []
            for (let i = 0; i < total; i++) {
                for (let j = i + 1; j < total; j++) {
                    const isAdjacent = Math.abs(i - j) === 1 || Math.abs(i - j) === total - 1
                    if (!isAdjacent) allPairs.push([i, j])
                }
            }

            setAutoActiveIds(prevIds => {
                // 2. Filter out pairs that contain any currently active IDs to ensure total change
                const validNextPairs = allPairs.filter(pair => {
                    const pairIds = pair.map(idx => DEMO_MODULES[idx].id)
                    return !pairIds.some(id => prevIds.includes(id))
                })

                // 3. Fallback to any valid pair if too restrictive, but prioritize 'total change'
                const pool = validNextPairs.length > 0 ? validNextPairs : allPairs
                const randomPair = pool[Math.floor(Math.random() * pool.length)]
                return randomPair.map(idx => DEMO_MODULES[idx].id)
            })
        }

        switchSectors()
        const interval = setInterval(switchSectors, 5000)
        return () => clearInterval(interval)
    }, [hoveredId])

    const activeIds = useMemo(() => {
        if (hoveredId) return [hoveredId]
        if (autoActiveIds.length > 0) return autoActiveIds
        
        return [...DEMO_MODULES]
            .sort((a, b) => b.points - a.points)
            .slice(0, 2)
            .map(m => m.id)
    }, [hoveredId, autoActiveIds])

    return (
        <div className="relative w-[400px] h-[400px] flex items-center justify-center">
            <motion.svg 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                viewBox="0 0 500 440" 
                className="w-full h-full overflow-visible"
            >
                <defs>
                    {DEMO_MODULES.map((m) => (
                        <radialGradient 
                            key={`grad-${m.id}`} 
                            id={`grad-${m.id}`} 
                            gradientUnits="userSpaceOnUse"
                            cx="245" cy="230" r="160"
                        >
                            <stop offset="0%" stopColor={m.color} stopOpacity={0.9} />
                            <stop offset="100%" stopColor="white" stopOpacity={0.2} />
                        </radialGradient>
                    ))}
                </defs>
                {(() => {
                    const cx = 245, cy = 230
                    const maxR = 160
                    const labelR = 210
                    const total = DEMO_MODULES.length
                    const step = 360 / total

                    const toXY = (r: number, deg: number) => ({
                        x: cx + r * Math.cos((deg * Math.PI) / 180),
                        y: cy - r * Math.sin((deg * Math.PI) / 180),
                    })

                    const wedge = (r: number, s: number, e: number) => {
                        const sp = toXY(r, s)
                        const ep = toXY(r, e)
                        return `M ${cx} ${cy} L ${sp.x} ${sp.y} A ${r} ${r} 0 0 1 ${ep.x} ${ep.y} Z`
                    }

                    return (
                        <g>
                            {/* Grid Lines */}
                            {[0.25, 0.5, 0.75].map(f => (
                                <circle key={f} cx={cx} cy={cy} r={maxR * f} fill="none" stroke="#00000012" strokeWidth={1} strokeDasharray="4 4" />
                            ))}
                            {Array.from({ length: total }).map((_, i) => {
                                const p = toXY(maxR * 1.05, 90 - i * step)
                                return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#00000012" strokeWidth={1} strokeDasharray="2 2" />
                            })}

                            {/* Wedges */}
                            {DEMO_MODULES.map((m, i) => {
                                const isActive = activeIds.includes(m.id)
                                const isDirectlyHovered = hoveredId === m.id
                                const sD = 90 - i * step
                                const eD = 90 - (i + 1) * step
                                
                                // Pronounced growth for active sectors
                                const currentMaxR = isDirectlyHovered ? maxR : isActive ? maxR * 0.98 : maxR * 0.85
                                const fillR = (m.points / m.max) * currentMaxR
                                const midDeg = 90 - (i + 0.5) * step
                                const lp = toXY(labelR, midDeg)
                                const Icon = m.icon

                                return (
                                    <g 
                                        key={m.id}
                                        onMouseEnter={() => setHoveredId(m.id)}
                                        onMouseLeave={() => setHoveredId(null)}
                                        className="cursor-pointer"
                                    >
                                        {/* Background Slot */}
                                        <motion.path 
                                            d={wedge(currentMaxR, sD, eD)} 
                                            fill={`url(#grad-${m.id})`} 
                                            animate={{ 
                                                opacity: isActive ? 0.15 : 0.04,
                                                scale: isActive ? 1 : 0.98
                                            }}
                                            transition={{ duration: 0.4 }}
                                        />
                                        
                                        {/* Points Path */}
                                        <motion.path 
                                            initial={{ d: wedge(0, sD, eD) }}
                                            animate={{ 
                                                d: wedge(fillR, sD, eD), 
                                                opacity: isActive ? 0.45 : 0.12 
                                            }}
                                            fill={`url(#grad-${m.id})`} 
                                            transition={{ type: 'spring', damping: 20, stiffness: 60, delay: 0.1 + (i * 0.05) }}
                                        />
                                        
                                        {/* Labels & Icons (Unified Growth) */}
                                        <motion.g 
                                            animate={{ 
                                                opacity: isActive ? 1 : 0, 
                                                scale: isActive ? 1.05 : 0.8,
                                                y: isActive ? 0 : 5
                                            }}
                                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                                            style={{ pointerEvents: 'none' }}
                                        >
                                            <rect x={lp.x - 16} y={lp.y - 40} width={32} height={32} rx={10} fill="rgba(0,0,0,0.04)" />
                                            <svg x={lp.x - 10} y={lp.y - 34} width={20} height={20} overflow="visible" color={m.color}>
                                                <Icon width="100%" strokeWidth={2.5} height="100%" stroke="currentColor" />
                                            </svg>
                                            <text x={lp.x} y={lp.y + 12} fontSize="11" fontWeight="900" fill="black" textAnchor="middle" letterSpacing="1px" className="uppercase">
                                                {m.label}
                                            </text>
                                            <text x={lp.x} y={lp.y + 24} fontSize="9" fontWeight="900" fill={m.color} textAnchor="middle">
                                                {m.points} PTS
                                            </text>
                                        </motion.g>
                                    </g>
                                )
                            })}
                        </g>
                    )
                })()}
            </motion.svg>
        </div>
    )
}

function EfficiencyGauge() {
    const efficiency = 92
    return (
        <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-[#0A0A0A] border border-white/10 p-5 rounded-[28px] flex items-center justify-between shadow-2xl relative overflow-hidden w-[280px] h-[110px]"
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.05),transparent)] pointer-events-none" />
            <div className="relative z-10">
                <p className="text-[10px] font-black text-white uppercase tracking-[0.25em] leading-none">Yield</p>
                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.25em] leading-none mt-1.5">Efficiency</p>
                <div className="flex items-center gap-1.5 mt-3">
                    <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[7px] font-black text-white/20 uppercase tracking-[0.2em] italic">Engine Active</p>
                </div>
            </div>
            
            <div className="flex flex-col items-end gap-2 relative z-10">
                <div className="relative w-16 h-10">
                    <svg viewBox="0 0 40 24" className="w-full h-full">
                        <defs>
                            <linearGradient id="demoGaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="50%" stopColor="#eab308" />
                                <stop offset="100%" stopColor="#10b981" />
                            </linearGradient>
                        </defs>
                        <path d="M 4 20 A 16 16 0 0 1 36 20" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4.5" strokeLinecap="round" />
                        <motion.path 
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: efficiency / 100 }}
                            transition={{ duration: 2, ease: "circOut" }}
                            d="M 4 20 A 16 16 0 0 1 36 20" 
                            fill="none" 
                            stroke="url(#demoGaugeGradient)" 
                            strokeWidth="4.5" 
                            strokeLinecap="round" 
                        />
                        <motion.g 
                            initial={{ rotate: -90 }}
                            animate={{ rotate: -90 + (efficiency * 1.8) }}
                            transition={{ duration: 2, type: 'spring', damping: 12 }}
                            style={{ originX: '20px', originY: '20px' }}
                        >
                            <line x1="20" y1="20" x2="20" y2="7" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
                            <circle cx="20" cy="20" r="2.5" fill="white" />
                        </motion.g>
                    </svg>
                </div>
                <div className="text-right">
                    <span className="text-[18px] font-black text-white italic tracking-tighter leading-none">{efficiency}%</span>
                </div>
            </div>
        </motion.div>
    )
}

function SystemInsightCard() {
    return (
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="p-5 bg-white/60 backdrop-blur-xl border border-black/[0.05] rounded-[28px] shadow-sm w-[280px] h-[110px] flex flex-col justify-center"
        >
            <div className="flex items-center gap-3 mb-2">
                <div className="w-7 h-7 rounded-lg bg-black/[0.03] flex items-center justify-center">
                    <Brain className="w-3.5 h-3.5 text-black" />
                </div>
                <h3 className="text-[10px] font-black text-black uppercase tracking-widest leading-none">Neural Insight</h3>
            </div>
            <p className="text-[11px] font-bold text-black/60 leading-relaxed">
                Platform metrics at target. <span className="text-black">Velocity is optimal</span> for high-yield creative expansion.
            </p>
        </motion.div>
    )
}

function PlatformShowcase() {
    return (
        <div className="relative w-full h-full flex items-center justify-center overflow-visible px-10">
            {/* Background ambient pulse */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[600px] h-[600px] bg-blue-500/[0.03] rounded-full blur-[100px] animate-pulse" />
                <div className="w-[500px] h-[500px] bg-emerald-500/[0.03] rounded-full blur-[80px] animate-pulse [animation-delay:2s]" />
            </div>

            <div 
                className="relative z-10 flex flex-col items-center gap-10"
                style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
            >
                {/* 3D Exploding Tasks */}
                <div className="absolute inset-0 pointer-events-none" style={{ transformStyle: 'preserve-3d' }}>
                    {DEMO_TASKS.map((task, i) => (
                        <FloatingTask key={i} {...task} />
                    ))}
                </div>

                {/* Main Visualization */}
                <NeuralRadarChart />

                {/* Bottom Row Metrics */}
                <div className="flex flex-col md:flex-row items-center gap-8 w-full justify-center">
                    <EfficiencyGauge />
                    <SystemInsightCard />
                </div>

                <div className="mt-6 text-center">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 text-black/40 text-[9px] font-bold uppercase tracking-widest border border-black/[0.03]">
                        <Sparkles className="w-3 h-3" />
                        Intelligence Visualization
                    </div>
                </div>
            </div>
        </div>
    )
}

// ─── Icons ────────────────────────────────────────────────────────────────────

const GoogleIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4" xmlns="http://www.w3.org/2000/svg">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
)

const XIcon = () => (
    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
)

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AuthPage() {
    const supabase = createClient()
    const router = useRouter()
    const searchParams = useSearchParams()
    
    // Explicitly determine mode (signin vs signup)
    const mode = searchParams.get('mode') === 'signup' ? 'signup' : 'signin'
    
    const [loading, setLoading] = useState<'google' | 'x' | 'waitlist' | null>(null)
    const [error, setError] = useState<string | null>(null)

    const [waitlistEmail, setWaitlistEmail] = useState('')
    const [isWaitlistSuccess, setIsWaitlistSuccess] = useState(false)

    const handleJoinWaitlist = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!waitlistEmail || !waitlistEmail.includes('@')) return
        
        setLoading('waitlist' as any)
        setError(null)
        
        try {
            const res = await fetch('/api/auth/waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: waitlistEmail })
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to join waitlist')
            }
            
            setIsWaitlistSuccess(true)
            setWaitlistEmail('')
        } catch (err: any) {
            console.error('Waitlist error:', err)
            setError(err.message || 'Something went wrong. Please try again.')
        } finally {
            setLoading(null)
        }
    }

    useEffect(() => {
        const errorType = searchParams.get('error')
        if (errorType === 'auth_failed') {
            setError('Access is currently by invitation only.')
        } else if (errorType === 'profile_creation_failed') {
            setError('There was an issue creating your profile. Please contact support.')
        }
    }, [searchParams])

    const handleOAuthSignIn = async (provider: 'google' | 'twitter' | 'x') => {
        setLoading(provider === 'google' ? 'google' : 'x')
        setError(null)
        
        const redirectTo = searchParams.get('redirectTo') ?? '/system/control-centre'
        const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''
        const isLocalIP = /^(https?:\/\/)?(192\.168|10\.|172\.(1[6-9]|2[0-9]|3[0-1]))/.test(currentOrigin)
        const isPublicTunnel = currentOrigin.includes('ngrok-free.dev') || currentOrigin.includes('loca.lt') || currentOrigin.includes('tail8fa4b8.ts.net')

        let finalRedirectTo = `${currentOrigin}/api/auth/callback`

        if (isLocalIP && !currentOrigin.includes('localhost') && !isPublicTunnel) {
            const host = currentOrigin.replace(/^https?:\/\//, '')
            finalRedirectTo = `https://schro.app/api/auth/callback?bridge_target=${encodeURIComponent(host)}&next=${encodeURIComponent(redirectTo)}`
        } else {
            finalRedirectTo = `${currentOrigin}/api/auth/callback?next=${encodeURIComponent(redirectTo)}`
        }

        const { error } = await supabase.auth.signInWithOAuth({
            provider,
            options: {
                redirectTo: finalRedirectTo,
            },
        })

        if (error) {
            setError(error.message)
            setLoading(null)
        }
    }

    return (
        <div className="h-screen overflow-hidden bg-[#fafafa] flex font-outfit">
            {/* ── Left Column: Auth ────────────────────────────────────────── */}
            <div className="w-full lg:w-[40%] flex flex-col p-8 md:p-10 lg:p-16 relative z-10 bg-white">
                <div className="flex-1 max-w-sm mx-auto w-full flex flex-col justify-center">
                    
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={mode}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.3 }}
                            className="mb-10"
                        >
                            <Link href="/" className="inline-block mb-8 hover:opacity-70 transition-opacity">
                                <span className="text-2xl font-serif italic font-medium tracking-tight text-black">Schrö</span>
                            </Link>
                            <h1 className="text-2xl font-bold tracking-tight text-black mb-2">
                                {mode === 'signin' ? 'Welcome back.' : 'Begin your evolution.'}
                            </h1>
                            <p className="text-[13px] text-black/40 font-medium">
                                {mode === 'signin' 
                                    ? 'Continue to your personal intelligence hub.' 
                                    : 'Create your identity in the neural network.'}
                            </p>

                            {mode === 'signup' && (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                    className="mt-8"
                                >
                                    {isWaitlistSuccess ? (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.95 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            className="p-6 bg-white border border-black/[0.06] rounded-[32px] shadow-xl shadow-black/[0.02] relative overflow-hidden group"
                                        >
                                            <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 transition-transform group-hover:rotate-45 duration-700">
                                                <Zap className="w-16 h-16 text-black" />
                                            </div>
                                            
                                            <div className="relative z-10 flex items-start gap-4">
                                                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center shrink-0 shadow-lg shadow-emerald-500/20">
                                                    <Check className="w-5 h-5 text-white" />
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-[14px] font-bold text-black tracking-tight">Evolution Pending.</p>
                                                    <p className="text-[12px] font-medium text-black/40 leading-relaxed">
                                                        Identity logged. We&apos;ve sent a confirmation to your inbox. Neural sync will commence shortly.
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="mt-4 pt-4 border-t border-black/[0.04] flex items-center justify-between">
                                                <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">Neural Sync Confirmed</span>
                                                <Sparkles className="w-3 h-3 text-emerald-500/30" />
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <form onSubmit={handleJoinWaitlist} className="relative group">
                                            <input
                                                type="email"
                                                value={waitlistEmail}
                                                onChange={(e) => setWaitlistEmail(e.target.value)}
                                                placeholder="Enter your email"
                                                className="w-full h-12 px-6 bg-white border border-black/[0.08] rounded-2xl text-[13px] font-medium placeholder:text-black/20 focus:outline-none focus:border-black/20 focus:bg-black/[0.01] transition-all"
                                                required
                                            />
                                            <button
                                                type="submit"
                                                disabled={loading === 'waitlist'}
                                                className="absolute right-1.5 top-1.5 h-9 px-4 bg-black text-white text-[11px] font-bold rounded-xl hover:bg-black/80 active:scale-[0.98] transition-all disabled:opacity-50"
                                            >
                                                {loading === 'waitlist' ? 'Processing...' : 'Request Access'}
                                            </button>
                                        </form>
                                    )}
                                </motion.div>
                            )}
                        </motion.div>
                    </AnimatePresence>

                    <div className="space-y-3">
                        {error && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="p-4 bg-red-50 border border-red-100 rounded-2xl mb-4"
                            >
                                <p className="text-[11px] font-bold text-red-600 leading-relaxed">
                                    {error}
                                </p>
                            </motion.div>
                        )}

                     {mode === 'signin' && (
                        <div className="space-y-3">
                            <button
                                onClick={() => handleOAuthSignIn('google')}
                                disabled={!!loading}
                                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-white border border-black/[0.08] text-black text-[13px] font-bold rounded-xl hover:bg-black/[0.02] active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {loading === 'google' ? (
                                    <div className="w-4 h-4 border-2 border-black/10 border-t-black rounded-full animate-spin" />
                                ) : (
                                    <GoogleIcon />
                                )}
                                Continue with Google
                            </button>

                            <button
                                onClick={() => handleOAuthSignIn('x' as any)}
                                disabled={!!loading}
                                className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-black text-white text-[13px] font-bold rounded-xl hover:bg-black/90 active:scale-[0.98] transition-all disabled:opacity-50"
                            >
                                {loading === 'x' ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <XIcon />
                                )}
                                Continue with X
                            </button>
                        </div>
                    )}
                    </div>

                    <p className="mt-8 text-center">
                        <span className="text-[11px] font-medium text-black/25 mr-1.5">
                            {mode === 'signin' ? "New to Schrö?" : "Already have an account?"}
                        </span>
                        <Link 
                            href={mode === 'signin' ? '/login?mode=signup' : '/login?mode=signin'} 
                            className="text-[11px] font-bold text-black border-b border-black/10 hover:border-black transition-colors"
                        >
                            {mode === 'signin' ? "Join the Waitlist" : "Sign In"}
                        </Link>
                    </p>
                </div>

                <div className="text-[10px] font-bold text-black/15 uppercase tracking-[0.2em] mt-auto">
                    System v1.2.0
                </div>
            </div>

            {/* ── Right Column: Showcase (Platform Demo) ────────────────── */}
            <div className="hidden lg:flex flex-1 bg-[#fafafa] relative overflow-hidden items-center justify-center p-8">
                {/* Background patterns */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#00000003,transparent_40%),radial-gradient(circle_at_70%_80%,#00000003,transparent_40%)]" />
                
                {/* The Platform Showcase */}
                <PlatformShowcase />

                {/* Decorative floaty elements */}
                <motion.div
                    animate={{ y: [0, -10, 0] }}
                    transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute top-[15%] right-[10%] w-24 h-24 bg-blue-500/[0.02] rounded-full blur-3xl"
                />
                <motion.div
                    animate={{ y: [0, 10, 0] }}
                    transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[10%] left-[5%] w-32 h-32 bg-emerald-500/[0.02] rounded-full blur-3xl"
                />
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
