'use client'

import React, { useState, useEffect, useContext } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Tv, Sparkles, RefreshCw, Film, Play, Info, ExternalLink } from 'lucide-react'
import { WellbeingContext } from '@/features/wellbeing/contexts/WellbeingContext'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

interface Curation {
    title: string
    type: 'Movie' | 'Series' | 'Documentary'
    reason: string
    vibe: string
}

export function EntertainmentCuration() {
    const wellbeing = useContext(WellbeingContext)
    const [isAnalyzing, setIsAnalyzing] = useState(false)
    const [curations, setCurations] = useState<Curation[]>([])
    const [error, setError] = useState<string | null>(null)

    const latestMood = wellbeing?.moodLogs?.[wellbeing.moodLogs.length - 1]?.value || 5
    const latestReflection = wellbeing?.moodLogs?.[wellbeing.moodLogs.length - 1]?.note || ""

    const generateCuration = async () => {
        setIsAnalyzing(true)
        setError(null)
        try {
            // 1. Fetch persona
            const { data: persona } = await supabase.from('sys_user_persona').select('*').limit(1).maybeSingle()
            
            // 2. Call AI
            const response = await fetch('/api/ai/intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        {
                            role: 'user',
                            content: `Based on my current mood (${latestMood}/10, Note: "${latestReflection}") and my persona data (${JSON.stringify(persona || {})}), suggest 3 movies or series I should watch now to either amplify my state or resolve my friction. 
                            Return ONLY a JSON array of objects with keys: title, type, reason, vibe. No other text.`
                        }
                    ],
                    posture: 'creative'
                })
            })

            const data = await response.json()
            const content = data.content || data.message?.content
            if (content) {
                const cleaned = content.replace(/```json|```/g, '').trim()
                const parsed = JSON.parse(cleaned)
                setCurations(parsed)
            }
        } catch (e) {
            console.error('Curation Failed', e)
            setError("Neural link failed. Stick to the classics.")
        } finally {
            setIsAnalyzing(false)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <h3 className="text-[12px] font-black uppercase tracking-widest text-black/60 flex items-center gap-2">
                        <Tv className="w-4 h-4" />
                        Smart Curation
                    </h3>
                    <p className="text-[9px] font-bold text-black/20 uppercase tracking-widest">Mood-Aware Watchlist</p>
                </div>
                <button 
                    onClick={generateCuration}
                    disabled={isAnalyzing}
                    className="p-2.5 bg-black text-white rounded-xl hover:scale-110 transition-transform active:scale-95 disabled:opacity-50"
                >
                    {isAnalyzing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-3">
                <AnimatePresence mode="popLayout">
                    {curations.length > 0 ? (
                        curations.map((item, ix) => (
                            <motion.div
                                key={item.title}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: ix * 0.1 }}
                                className="group bg-white border border-black/[0.05] p-4 rounded-2xl hover:border-black/10 hover:shadow-lg transition-all"
                            >
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 bg-black/[0.03] rounded-lg">
                                            {item.type === 'Movie' ? <Film className="w-3.5 h-3.5 text-black/40" /> : <Play className="w-3.5 h-3.5 text-black/40" />}
                                        </div>
                                        <h4 className="text-[14px] font-black text-black group-hover:text-blue-600 transition-colors uppercase italic">{item.title}</h4>
                                    </div>
                                    <span className="text-[9px] font-black bg-black/[0.05] text-black/40 px-2 py-0.5 rounded-full uppercase tracking-widest">{item.type}</span>
                                </div>
                                <p className="text-[11px] font-bold text-black/50 leading-relaxed line-clamp-2 mb-3 pr-4">
                                    {item.reason}
                                </p>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 text-blue-600 rounded-lg">
                                        <Sparkles className="w-3 h-3" />
                                        <span className="text-[9px] font-black uppercase tracking-[0.1em]">{item.vibe}</span>
                                    </div>
                                    <a 
                                        href={`https://www.google.com/search?q=${encodeURIComponent(item.title + ' ' + item.type)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-[9px] font-black uppercase tracking-widest text-black/20 hover:text-black transition-colors flex items-center gap-1"
                                    >
                                        Details <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="py-12 flex flex-col items-center justify-center text-center opacity-20 space-y-3">
                            <Tv className="w-8 h-8" />
                            <p className="text-[11px] font-bold uppercase tracking-widest">Calibrating suggestions...</p>
                        </div>
                    )}
                </AnimatePresence>
            </div>

            {error && (
                <p className="text-[10px] font-bold text-red-500 text-center uppercase tracking-widest animate-pulse">{error}</p>
            )}
        </div>
    )
}
