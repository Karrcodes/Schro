'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { ROLES } from '@/lib/schroData'

// ─── Shared UI Components ─────────────────────────────────────────────────────

function AuthRoleCard({ role, index }: { role: typeof ROLES[0], index: number }) {
    const Icon = role.icon
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05, duration: 0.4 }}
            className="p-4 bg-white/40 backdrop-blur-md rounded-2xl border border-white/20 shadow-sm hover:shadow-md transition-all group"
        >
            <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform', role.iconBg)}>
                <Icon className={cn('w-4.5 h-4.5', role.iconColor)} />
            </div>
            <h4 className="text-[13px] font-bold text-black/80 mb-1.5">{role.label}</h4>
            <p className="text-[11px] text-black/40 leading-relaxed font-medium line-clamp-2">{role.desc}</p>
        </motion.div>
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
    
    const [loading, setLoading] = useState<'google' | 'x' | null>(null)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const errorType = searchParams.get('error')
        if (errorType === 'auth_failed') {
            setError('Access is currently by invitation only.')
        } else if (errorType === 'profile_creation_failed') {
            setError('There was an issue creating your profile. Please contact support.')
        }
    }, [searchParams])

    const handleOAuthSignIn = async (provider: 'google' | 'twitter') => {
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
                            {mode === 'signin' ? 'Continue with Google' : 'Sign up with Google'}
                        </button>

                        <button
                            onClick={() => handleOAuthSignIn('twitter')}
                            disabled={!!loading}
                            className="w-full flex items-center justify-center gap-3 px-6 py-3.5 bg-black text-white text-[13px] font-bold rounded-xl hover:bg-black/90 active:scale-[0.98] transition-all disabled:opacity-50"
                        >
                            {loading === 'x' ? (
                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                            ) : (
                                <XIcon />
                            )}
                            {mode === 'signin' ? 'Continue with X' : 'Sign up with X'}
                        </button>
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
                    System v1.2.0 · Privacy
                </div>
            </div>

            {/* ── Right Column: Showcase ──────────────────────────────────── */}
            <div className="hidden lg:flex flex-1 bg-[#fafafa] relative overflow-hidden items-center justify-center p-8">
                {/* Background patterns */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,#00000003,transparent_40%),radial-gradient(circle_at_70%_80%,#00000003,transparent_40%)]" />
                
                <div className="relative z-10 max-w-lg w-full">
                    <div className="grid grid-cols-2 gap-3">
                        {ROLES.map((role, i) => (
                            <AuthRoleCard key={role.label} role={role} index={i} />
                        ))}
                    </div>

                    <div className="mt-8 text-center space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black text-white text-[9px] font-bold uppercase tracking-widest">
                            <Sparkles className="w-3 h-3 text-emerald-400" />
                            Intelligence Layer
                        </div>
                        <h2 className="text-base font-bold tracking-tight text-black leading-tight">A Holistic System.</h2>
                        <p className="text-[11px] text-black/30 font-medium leading-relaxed max-w-[240px] mx-auto">
                            The bridge between who you are and who you are becoming.
                        </p>
                    </div>
                </div>

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
