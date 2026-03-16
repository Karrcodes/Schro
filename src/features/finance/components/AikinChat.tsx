'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Sparkles } from 'lucide-react'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

export function AikinChat({ initialMessage }: { initialMessage?: string }) {
    const [messages, setMessages] = useState<Message[]>([
        {
            role: 'assistant',
            content: initialMessage || "Hey, I'm Aikin — your financial co-pilot. Ask me anything about your pockets, debts, or goals. I have live access to your data.",
        },
    ])
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const sendMessage = async () => {
        if (!input.trim() || loading) return

        const userMsg: Message = { role: 'user', content: input.trim() }
        setMessages((prev) => [...prev, userMsg])
        setInput('')
        setLoading(true)

        try {
            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [...messages, userMsg] }),
            })

            const data = await res.json()
            if (data.reply) {
                setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }])
            } else {
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', content: 'Something went wrong. Check your Gemini API key.' },
                ])
            }
        } catch {
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', content: 'Network error. Please try again.' },
            ])
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            sendMessage()
        }
    }

    return (
        <div className="flex flex-col h-full min-h-[400px]">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#a78bfa]/20 to-[#6d28d9]/20 border border-[#a78bfa]/20 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-[#a78bfa]" />
                </div>
                <div>
                    <p className="text-[13px] font-semibold text-white/90">Aikin</p>
                    <p className="text-[10px] text-white/30">AI Financial Co-pilot · Powered by Gemini</p>
                </div>
                <div className="ml-auto flex items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#34d399] animate-pulse" />
                    <span className="text-[10px] text-white/30">Live</span>
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[340px] scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                        <div
                            className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'assistant'
                                    ? 'bg-[#a78bfa]/20 border border-[#a78bfa]/20'
                                    : 'bg-white'
                                }`}
                        >
                            {msg.role === 'assistant'
                                ? <Bot className="w-3 h-3 text-[#a78bfa]" />
                                : <User className="w-3 h-3 text-white/60" />
                            }
                        </div>
                        <div
                            className={`max-w-[80%] rounded-xl px-3 py-2 text-[13px] leading-relaxed ${msg.role === 'assistant'
                                    ? 'bg-white/5 border border-white/10 text-white/90'
                                    : 'bg-[#a78bfa]/20 border border-[#a78bfa]/30 text-white'
                                }`}
                        >
                            {msg.content}
                        </div>
                    </div>
                ))}
                {loading && (
                    <div className="flex gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#a78bfa]/20 border border-[#a78bfa]/20 flex items-center justify-center">
                            <Bot className="w-3 h-3 text-[#a78bfa]" />
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
                            <Loader2 className="w-3.5 h-3.5 text-white/30 animate-spin" />
                        </div>
                    </div>
                )}
                <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div className="flex gap-2 mt-3">
                <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask Aikin anything..."
                    className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3.5 py-2.5 text-[13px] text-white placeholder-white/25 outline-none focus:border-[#a78bfa]/40 transition-colors"
                />
                <button
                    onClick={sendMessage}
                    disabled={!input.trim() || loading}
                    className="w-10 h-10 rounded-xl bg-[#a78bfa]/20 border border-[#a78bfa]/30 flex items-center justify-center hover:bg-[#a78bfa]/30 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                    <Send className="w-3.5 h-3.5 text-[#a78bfa]" />
                </button>
            </div>
        </div>
    )
}
