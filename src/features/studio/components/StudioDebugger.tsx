'use client'

import React, { useState } from 'react'
import { useStudio } from '../hooks/useStudio'
import { Terminal, Send, Image as ImageIcon, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function StudioDebugger() {
    const { debugLogs, addDebugLog } = useStudio()
    const [prompt, setPrompt] = useState('')
    const [isTesting, setIsTesting] = useState(false)
    const [testResult, setTestResult] = useState<string | null>(null)

    const handleTestGenerate = async () => {
        if (!prompt.trim()) return
        setIsTesting(true)
        setTestResult(null)
        addDebugLog(`🛠️ Manual Test Started: "${prompt}"`, 'info')
        
        try {
            const timestamp = Date.now()
            // Using the same API endpoint but with custom title as prompt
            const res = await fetch(`/api/studio/cover?title=${encodeURIComponent(prompt)}&type=project&json=true&t=${timestamp}`)
            
            if (res.ok) {
                const data = await res.json()
                if (data.debug && Array.isArray(data.debug)) {
                    data.debug.forEach((msg: string) => addDebugLog(msg, msg.includes('❌') || msg.includes('⚠️') ? 'error' : 'success'))
                }
                if (data.url) {
                    setTestResult(data.url)
                    addDebugLog(`✅ Test Image Ready: ${data.url}`, 'success')
                }
            } else {
                addDebugLog(`❌ API Error: ${res.status}`, 'error')
            }
        } catch (e: any) {
            addDebugLog(`❌ Crash: ${e.message}`, 'error')
        } finally {
            setIsTesting(false)
        }
    }

    return (
        <div className="mt-20 border-t border-black/5 pt-12 pb-24">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-orange-500" />
                    <h3 className="text-[11px] font-black uppercase tracking-widest text-black/40">Studio Engine Debugger</h3>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Left: Input & Preview */}
                <div className="space-y-4 text-black">
                    <div className="flex items-center gap-3 p-2 bg-black/5 rounded-2xl border border-black/5">
                        <input 
                            type="text"
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Type a creative prompt to test AI..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-[13px] px-3 font-medium placeholder:text-black/30 text-black"
                            onKeyDown={(e) => e.key === 'Enter' && handleTestGenerate()}
                        />
                        <button 
                            onClick={handleTestGenerate}
                            disabled={isTesting}
                            className={cn(
                                "flex items-center gap-2 px-6 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                isTesting ? "bg-black/10 text-black/20" : "bg-black text-white hover:bg-orange-600 shadow-lg shadow-black/10 hover:shadow-orange-500/20"
                            )}
                        >
                            {isTesting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                            Test
                        </button>
                    </div>

                    <div className="aspect-video bg-black/[0.02] border-2 border-dashed border-black/5 rounded-[32px] overflow-hidden flex items-center justify-center relative group">
                        {testResult ? (
                            <img src={testResult} alt="Test result" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        ) : (
                            <div className="text-center space-y-2 opacity-10">
                                <ImageIcon className="w-12 h-12 mx-auto" />
                                <p className="text-[11px] font-black uppercase tracking-widest">Preview Area</p>
                            </div>
                        )}
                        {isTesting && (
                            <div className="absolute inset-0 bg-white/40 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
                                <Loader2 className="w-10 h-10 text-black animate-spin" />
                                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-black">Synthesizing...</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Console Logs */}
                <div className="bg-[#111] text-[11px] font-mono p-6 rounded-[32px] shadow-2xl border border-white/10 relative flex flex-col min-h-[400px]">
                    <div className="flex items-center justify-between mb-4 border-b border-white/10 pb-4">
                        <span className="text-gray-400 uppercase tracking-widest text-[10px] font-bold">Interactive Console</span>
                        <div className="flex gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                            <div className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto space-y-2 scrollbar-hide text-white">
                        {debugLogs.length === 0 ? (
                            <div className="text-gray-400 italic font-medium">Waiting for events...</div>
                        ) : (
                            debugLogs.map((log, i) => (
                                <div key={i} className={cn(
                                    "flex gap-3 leading-relaxed font-medium",
                                    log.type === 'error' ? "text-red-400" : 
                                    log.type === 'success' ? "text-emerald-400" : "text-gray-200"
                                )}>
                                    <span className="text-gray-500 shrink-0 select-none">[{log.time}]</span>
                                    <span className="break-all">{log.msg}</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
