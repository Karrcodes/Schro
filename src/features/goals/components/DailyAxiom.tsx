'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, RefreshCw, Quote, Shield, Zap, Target } from 'lucide-react'
import { useGoals } from '../hooks/useGoals'
import { cn } from '@/lib/utils'

export default function DailyAxiom() {
    const { aspirations, loading } = useGoals()
    const [axiom, setAxiom] = useState<string | null>(null)
    const [isSynthesizing, setIsSynthesizing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const synthesizeAxiom = async () => {
        if (aspirations.length === 0) return
        setIsSynthesizing(true)
        setError(null)
        try {
            const res = await fetch('/api/goals/axiom', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ aspirations: aspirations.filter(a => a.status === 'active') })
            })
            if (!res.ok) throw new Error('Synthesis failed')
            const data = await res.json()
            setAxiom(data.axiom)
            // Cache in session storage for the day
            sessionStorage.setItem('daily_axiom', JSON.stringify({ axiom: data.axiom, date: new Date().toDateString() }))
        } catch (err) {
            setError('The ether is quiet. Try again.')
        } finally {
            setIsSynthesizing(false)
        }
    }

    useEffect(() => {
        const cached = sessionStorage.getItem('daily_axiom')
        if (cached) {
            const { axiom, date } = JSON.parse(cached)
            if (date === new Date().toDateString()) {
                setAxiom(axiom)
                return
            }
        }
        if (!loading && aspirations.length > 0) {
            synthesizeAxiom()
        }
    }, [loading, aspirations.length])

    if (loading && !axiom) return null

    if (aspirations.length === 0) {
        return (
            <div className="p-6 rounded-[24px] border border-black/5 bg-black/[0.01] flex flex-col items-center justify-center gap-3 text-center">
                <Target className="w-5 h-5 text-black/10" />
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-black/30">Define your Vectors to generate daily axioms</p>
            </div>
        )
    }

    return (
        <div className="group relative p-8 rounded-[32px] bg-white border border-black/[0.06] shadow-xl shadow-black/5 overflow-hidden transition-all hover:border-black/10">
            {/* Background Aesthetic */}
            <div className="absolute top-0 right-0 p-4 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                <Shield className="w-32 h-32 rotate-12" />
            </div>

            <div className="relative z-10 flex flex-col gap-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center">
                            <Zap className="w-4 h-4 text-white" />
                        </div>
                        <div>
                            <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-black/40">Daily Brief Directive</h3>
                            <p className="text-[9px] font-bold uppercase tracking-widest text-amber-500/60">Stoic Synthesis</p>
                        </div>
                    </div>
                    
                    <button 
                        onClick={synthesizeAxiom}
                        disabled={isSynthesizing}
                        className={cn(
                            "p-2 rounded-full hover:bg-black/5 transition-all text-black/20 hover:text-black",
                            isSynthesizing && "animate-spin"
                        )}
                        title="Resynthesize Axiom"
                    >
                        <RefreshCw className="w-4 h-4" />
                    </button>
                </div>

                <div className="min-h-[60px] flex items-center">
                    <AnimatePresence mode="wait">
                        {isSynthesizing ? (
                            <motion.div 
                                key="loading"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-col gap-2 w-full"
                            >
                                <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                                    <motion.div 
                                        animate={{ x: ['-100%', '100%'] }}
                                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                                        className="h-full w-1/3 bg-black/20 rounded-full"
                                    />
                                </div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-black/20 text-center">Synthesizing Aspirations...</p>
                            </motion.div>
                        ) : error ? (
                            <motion.p 
                                key="error"
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="text-[13px] font-bold text-red-400 italic text-center w-full"
                            >
                                {error}
                            </motion.p>
                        ) : (
                            <motion.div
                                key="axiom"
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="relative w-full"
                            >
                                <Quote className="absolute -top-4 -left-4 w-8 h-8 text-black/[0.03]" />
                                <p className="text-[16px] md:text-[18px] font-black tracking-tight text-black text-center leading-snug">
                                    {axiom || 'Waiting for the signal...'}
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="flex items-center justify-center gap-6 pt-2">
                     <div className="flex items-center gap-1.5 opacity-20">
                         <div className="w-1 h-1 rounded-full bg-black" />
                         <div className="w-1 h-1 rounded-full bg-black/50" />
                         <div className="w-1 h-1 rounded-full bg-black/20" />
                     </div>
                </div>
            </div>

            {/* Corner Accent */}
            <div className="absolute bottom-0 right-0 w-24 h-24 bg-gradient-to-tl from-black/[0.02] to-transparent pointer-events-none" />
        </div>
    )
}
