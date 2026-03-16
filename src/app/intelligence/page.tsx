'use client'

import { useState, useEffect, useRef } from 'react'
import { Brain, Terminal, Send, RefreshCw, Sparkles, Database, Shield, Zap } from 'lucide-react'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { KarrFooter } from '@/components/KarrFooter'

interface Message {
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
}

export default function IntelligencePage() {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: "Hello! I'm Karr Intelligence. I've indexed your OS data and I'm ready to help you optimize your performance. What's on your mind today?",
            timestamp: new Date()
        }
    ])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [isSynced, setIsSynced] = useState(false)
    const { settings } = useSystemSettings()
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        if (params.get('sync') === 'success') {
            setIsSynced(true)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "DECRYPTION_SUCCESS: Google Drive neural link established. I can now query your external documentation repositories.",
                timestamp: new Date()
            }])
        }
    }, [])

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isTyping])

    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault()
        if (!input.trim() || isTyping) return

        const userMsg: Message = {
            role: 'user',
            content: input.trim(),
            timestamp: new Date()
        }

        const newMessages = [...messages, userMsg]
        setMessages(newMessages)
        setInput('')
        setIsTyping(true)

        try {
            const res = await fetch('/api/ai/intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages,
                    isDemoMode: settings.is_demo_mode
                })
            })

            const data = await res.json()
            if (data.reply) {
                const assistantMsg: Message = {
                    role: 'assistant',
                    content: data.reply,
                    timestamp: new Date()
                }
                setMessages(prev => [...prev, assistantMsg])
            } else {
                throw new Error(data.error || 'Failed to fetch response')
            }
        } catch (err: any) {
            const errorMsg: Message = {
                role: 'assistant',
                content: `ERROR: SYSTEM_HALT. ${err.message}. Connection to Intelligence Node severed.`,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <div className="h-[calc(100vh-3.5rem)] md:h-screen lg:h-screen bg-[#fafafa] flex flex-col overflow-hidden relative">
            {/* Standard Module Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between px-6 py-8 md:px-10 md:py-10 z-20 shrink-0 gap-6 max-w-7xl mx-auto w-full">
                <div className="space-y-1">
                    <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Intelligence Protocol</h2>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase flex items-center gap-3 grayscale">
                        Karr Intelligence
                        <span className="bg-emerald-500/10 text-emerald-600 text-[9px] px-2 py-0.5 rounded font-mono uppercase tracking-widest border border-emerald-500/20 h-fit mb-1 normal-case">Active</span>
                    </h1>
                </div>

                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] h-fit mb-1">
                    <div className="flex items-center gap-1.5 text-emerald-600">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="hidden xs:inline">System Sync: 100%</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-black/30">
                        {isSynced ? (
                            <div className="flex items-center gap-1.5 text-blue-500">
                                <Database className="w-3 h-3" /> <span className="hidden sm:inline">Drive Online</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => window.location.href = '/api/auth/google'}
                                className="flex items-center gap-1.5 hover:text-black transition-colors underline underline-offset-4 decoration-black/10 transition-all hover:decoration-black"
                            >
                                <Database className="w-3 h-3" /> <span className="hidden sm:inline">Sync Drive</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Chat Viewport */}
            <div className="flex-1 overflow-hidden flex flex-col relative w-full max-w-7xl mx-auto px-6 md:px-10">
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto space-y-6 w-full pb-8 pt-4 custom-scrollbar"
                >
                    <AnimatePresence mode="popLayout">
                        {messages.map((msg, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "flex flex-col gap-2 max-w-[85%]",
                                    msg.role === 'user' ? "ml-auto items-end" : "items-start"
                                )}
                            >
                                <div className={cn(
                                    "p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm border transition-all",
                                    msg.role === 'assistant'
                                        ? "bg-white text-black border-black/[0.06]"
                                        : "bg-black text-white border-black font-medium"
                                )}>
                                    {msg.content}
                                </div>
                                <span className="text-[9px] font-medium text-black/20 mt-1 uppercase">
                                    {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    {isTyping && (
                        <div className="flex flex-col gap-2 items-start max-w-[85%]">
                            <div className="bg-white border border-black/[0.06] p-4 rounded-2xl flex items-center gap-1.5 shadow-sm">
                                <span className="w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce [animation-delay:-0.3s]" />
                                <span className="w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce [animation-delay:-0.15s]" />
                                <span className="w-1.5 h-1.5 bg-black/20 rounded-full animate-bounce" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="shrink-0 w-full pb-10 sm:pb-12">
                    <form
                        onSubmit={handleSend}
                        className="relative group bg-white border border-black/[0.1] rounded-2xl p-1 shadow-lg transition-all focus-within:border-black focus-within:ring-1 focus-within:ring-black"
                    >
                        <div className="flex items-center">
                            <input
                                autoFocus
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Message Karr Intelligence..."
                                className="w-full bg-transparent border-none focus:ring-0 text-black font-medium text-[15px] py-4 px-4 placeholder:text-black/30"
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || isTyping}
                                className={cn(
                                    "mr-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                    input.trim() && !isTyping
                                        ? "bg-black text-white hover:scale-105 active:scale-95 shadow-md"
                                        : "bg-black/[0.02] text-black/20 cursor-not-allowed"
                                )}
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </form>
                    <div className="mt-3 flex items-center justify-center gap-6">
                        <button onClick={() => setInput('/scan-finances')} className="text-[10px] font-bold text-black/30 uppercase tracking-widest hover:text-black transition-colors">Scan Finances</button>
                        <button onClick={() => setInput('/tasks')} className="text-[10px] font-bold text-black/30 uppercase tracking-widest hover:text-black transition-colors">Ops Audit</button>
                        <button onClick={() => setInput('/help')} className="text-[10px] font-bold text-black/30 uppercase tracking-widest hover:text-black transition-colors">Help</button>
                    </div>
                </div>

                <style jsx global>{`
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 4px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-track {
                        background: transparent;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb {
                        background: rgba(0, 0, 0, 0.05);
                        border-radius: 20px;
                    }
                    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                        background: rgba(0, 0, 0, 0.1);
                    }
                `}</style>
            </div>
            <div className="max-w-7xl mx-auto w-full px-6 md:px-10 pb-6">
                <KarrFooter />
            </div>
        </div>
    )
}
