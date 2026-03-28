'use client'

import { useState, useEffect, useRef } from 'react'
import { Brain, Terminal, Send, RefreshCw, Sparkles, Database, Shield, Zap, Heart, History, Plus, Trash2, X as CloseIcon, MessageSquare, Pin, Edit2, Check, Cloud, CheckSquare, Calendar, Activity, Image as ImageIcon, Mail, Lock, Wallet, User, ShieldAlert, HeartHandshake, FileSearch, Flag, Paintbrush, Wand2, AudioLines, Volume2, Pause, Play, Square, ArrowUp } from 'lucide-react'
import { PersonaModal } from './components/PersonaModal'
import { PERSONA_QUESTIONS } from './constants/personaQuestions'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { KarrFooter } from '@/components/KarrFooter'

type EmotivePosture = 'auto' | 'anya' | 'vance' | 'kael' | 'sentinel' | 'mentor' | 'analyst' | 'strategist' | 'artist' | 'creative'

interface Message {
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    posture?: EmotivePosture
}

interface ChatSession {
    id: string
    title: string
    updated_at: string
    is_pinned?: boolean
}

export default function IntelligencePage() {
    const defaultWelcome: Message = {
        role: 'assistant',
        content: "Hello! I'm Schrö Assistant. I've indexed your OS data and I'm ready to help you optimize your performance. What's on your mind today?",
        timestamp: new Date()
    }

    const [messages, setMessages] = useState<Message[]>([defaultWelcome])
    const [input, setInput] = useState('')
    const [isTyping, setIsTyping] = useState(false)
    const [isSynced, setIsSynced] = useState(false)
    const [isSidebarOpen, setIsSidebarOpen] = useState(false)
    const [isSyncModalOpen, setIsSyncModalOpen] = useState(false)
    const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false)
    const [posture, setPosture] = useState<EmotivePosture>('auto')
    const [accessPermissions, setAccessPermissions] = useState({
        gmail: false,
        drive: true,
        studio: false,
        operations: true,
        wellbeing: false,
        finances: true,
        manifest: true,
        vault: true
    })
    const [sessions, setSessions] = useState<ChatSession[]>([])
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null)
    const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
    const [editingTitle, setEditingTitle] = useState('')
    const [isVoiceMode, setIsVoiceMode] = useState(false)
    const [isListening, setIsListening] = useState(false)
    const [personaCompletion, setPersonaCompletion] = useState(0)
    const [activeSpeechIndex, setActiveSpeechIndex] = useState<number | null>(null)
    const [isSpeechPaused, setIsSpeechPaused] = useState(false)
    const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([])
    const [selectedVoiceName, setSelectedVoiceName] = useState<string | null>(null)
    const [isHDVoice, setIsHDVoice] = useState(false)
    const [hdVoiceId, setHdVoiceId] = useState('shimmer')
    const [isAutoSendEnabled, setIsAutoSendEnabled] = useState(true)
    const [autoSendProgress, setAutoSendProgress] = useState(0)
    const autoSendTimerRef = useRef<NodeJS.Timeout | null>(null)
    const autoSendIntervalRef = useRef<NodeJS.Timeout | null>(null)
    const inputRef = useRef<string>(input)
    const handleSendRef = useRef<any>(null)
    const activeSpeechIndexRef = useRef<number | null>(null)
    const isVoiceModeRef = useRef<boolean>(isVoiceMode)
    const pinnedTextRef = useRef<string>('')
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const recognitionRef = useRef<any>(null)
    const { settings } = useSystemSettings()
    const scrollRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const loadVoices = () => {
                const voices = window.speechSynthesis.getVoices()
                setAvailableVoices(voices)
                
                const savedVoice = localStorage.getItem('schro_assistant_voice')
                if (savedVoice && voices.find(v => v.name === savedVoice)) {
                    setSelectedVoiceName(savedVoice)
                } else {
                    const preferred = voices.find(v => v.name.includes('Natural') || v.name.includes('Neural') || v.name.includes('Google') || v.name.includes('Premium')) || voices[0]
                    if (preferred) setSelectedVoiceName(preferred.name)
                }
            }

            loadVoices()
            window.speechSynthesis.onvoiceschanged = loadVoices
        }
    }, [])

    useEffect(() => {
        const savedHD = localStorage.getItem('schro_assistant_hd_voice') === 'true'
        const savedHDId = localStorage.getItem('schro_assistant_hd_voice_id')
        const validOpenAI = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
        setIsHDVoice(savedHD)
        if (savedHDId && validOpenAI.includes(savedHDId)) setHdVoiceId(savedHDId)
    }, [])

    useEffect(() => {
        inputRef.current = input
        handleSendRef.current = handleSend
        activeSpeechIndexRef.current = activeSpeechIndex
        isVoiceModeRef.current = isVoiceMode
        if (typeof window !== 'undefined' && !audioRef.current) {
            audioRef.current = new Audio()
            audioRef.current.onended = () => {
                setActiveSpeechIndex(null)
                setIsSpeechPaused(false)
            }
        }
    }, [input, handleSend, activeSpeechIndex, isVoiceMode])



    const handleVocalize = async (content: string, index: number, voiceOverride?: string) => {
        if (typeof window === 'undefined') return

        if (!isHDVoice) {
            if (!('speechSynthesis' in window)) return
            if (activeSpeechIndex === index) {
                togglePlayback()
                return
            }

            window.speechSynthesis.cancel()
            const utterance = new SpeechSynthesisUtterance(content)
            if (selectedVoiceName) {
                const voice = availableVoices.find(v => v.name === selectedVoiceName)
                if (voice) utterance.voice = voice
            }
            utterance.onend = () => {
                setActiveSpeechIndex(null)
                setIsSpeechPaused(false)
            }
            setActiveSpeechIndex(index)
            setIsSpeechPaused(false)
            window.speechSynthesis.speak(utterance)
            return
        }

        window.speechSynthesis?.cancel()

        try {
            setActiveSpeechIndex(index)
            setIsSpeechPaused(false)
            
            // Use specific voice for the Identity if provided, else fallback to current selection
            const targetVoice = voiceOverride || hdVoiceId

            const res = await fetch('/api/ai/speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: content, voice: targetVoice })
            })

            // Async Guard: Has user stopped or changed message while we were fetching?
            if (activeSpeechIndexRef.current !== index) return

            if (!res.ok) {
                const errData = await res.json()
                throw new Error(errData.error || 'Failed to generate cloud speech')
            }

            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            
            // Async Guard check again before playback
            if (activeSpeechIndexRef.current !== index) {
                URL.revokeObjectURL(url)
                return
            }

            if (audioRef.current) {
                // Stop any existing playback and clear URL to prevent AbortError
                audioRef.current.pause()
                audioRef.current.src = url
                
                try {
                    await audioRef.current.play()
                } catch (e: any) {
                    if (e.name !== 'AbortError') {
                        console.error('Playback error:', e)
                    }
                }
            }
        } catch (e) {
            console.error('Vocalization failed:', e)
            if (activeSpeechIndexRef.current === index) {
                setActiveSpeechIndex(null)
            }
        }
    }

    const stopVocalization = () => {
        if (typeof window !== 'undefined') {
            if ('speechSynthesis' in window) window.speechSynthesis.cancel()
            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.src = ''
            }
            setActiveSpeechIndex(null)
            setIsSpeechPaused(false)
        }
    }

    const togglePlayback = () => {
        if (isHDVoice && audioRef.current) {
            if (audioRef.current.paused) {
                audioRef.current.play().catch(() => {})
                setIsSpeechPaused(false)
            } else {
                audioRef.current.pause()
                setIsSpeechPaused(true)
            }
        } else if (!isHDVoice && typeof window !== 'undefined') {
            if (window.speechSynthesis.speaking && !isSpeechPaused) {
                window.speechSynthesis.pause()
                setIsSpeechPaused(true)
            } else if (isSpeechPaused) {
                window.speechSynthesis.resume()
                setIsSpeechPaused(false)
            }
        }
    }

    const handleManualInputInterference = () => {
        if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current)
        if (autoSendIntervalRef.current) clearInterval(autoSendIntervalRef.current)
        setAutoSendProgress(0)
    }

    const fetchPersonaCompletion = async () => {
        if (!supabase) return
        const { data } = await supabase.from('sys_user_persona').select('*').limit(1).maybeSingle()
        if (data) {
            let filledCount = 0
            const sections = ['demographics', 'timeline', 'citadel', 'friction', 'axioms']
            sections.forEach(section => {
                const sectionData = data[section] || {}
                const questions = PERSONA_QUESTIONS[section] || []
                questions.forEach(q => {
                    if (sectionData[q.id] && sectionData[q.id].trim() !== '') {
                        filledCount++
                    }
                })
            })
            setPersonaCompletion(filledCount)
        }
    }

    useEffect(() => {
        // Only start the microphone if we are in voice mode, not typing, and NOT speaking
        const isActuallySpeaking = activeSpeechIndex !== null
        if (typeof window !== 'undefined' && !isTyping && !isActuallySpeaking) {
            const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
            if (SpeechRecognition && isVoiceMode) {
                const recognition = new SpeechRecognition()
                recognition.continuous = true
                recognition.interimResults = true
                
                recognition.onresult = (event: any) => {
                    let fullTranscript = ''
                    for (let i = 0; i < event.results.length; ++i) {
                        fullTranscript += event.results[i][0].transcript
                    }

                    if (fullTranscript) {
                        const base = pinnedTextRef.current.trim()
                        setInput(base ? base + ' ' + fullTranscript.trim() : fullTranscript.trim())

                        if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current)
                        if (autoSendIntervalRef.current) clearInterval(autoSendIntervalRef.current)
                        setAutoSendProgress(0)

                        if (isAutoSendEnabled) {
                            let progress = 0
                            const duration = 2000
                            const interval = 50
                            autoSendIntervalRef.current = setInterval(() => {
                                progress += (interval / duration) * 100
                                setAutoSendProgress(Math.min(progress, 100))
                            }, interval)

                            autoSendTimerRef.current = setTimeout(() => {
                                clearInterval(autoSendIntervalRef.current!)
                                // Use the Ref-bound value/function to ensure we have the latest data
                                if (inputRef.current.trim() && handleSendRef.current) {
                                    handleSendRef.current()
                                }
                                setAutoSendProgress(0)
                            }, duration)
                        }
                    }
                }
                
                recognition.onstart = () => {
                    setIsListening(true)
                    pinnedTextRef.current = (document.getElementById('assistant-input') as HTMLTextAreaElement)?.value || ''
                }
                recognition.onend = () => {
                    setIsListening(false)
                    setAutoSendProgress(0)

                    // Robust Auto-Restart for Mobile/iPad (Safari interrupts are common)
                    if (isVoiceModeRef.current && !isTyping && activeSpeechIndexRef.current === null) {
                        setTimeout(() => {
                            if (isVoiceModeRef.current && recognitionRef.current === recognition) {
                                try { recognition.start() } catch (e) { console.error('Recognition restart failed', e) }
                            }
                        }, 400) // Small delay to allow audio context to clear
                    }
                }
                recognition.onerror = () => {
                    setIsListening(false)
                    setAutoSendProgress(0)
                }
                
                recognition.start()
                recognitionRef.current = recognition
            }
        }

        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop() } catch(e) {}
            }
            if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current)
            if (autoSendIntervalRef.current) clearInterval(autoSendIntervalRef.current)
        }
    }, [isVoiceMode, isAutoSendEnabled, isTyping, activeSpeechIndex])

    const toggleVoiceMode = () => {
        const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition
        if (!SpeechRecognition) {
            alert("Neural Voice protocol not supported in your current browser. Please use Chrome/Edge.")
            return
        }
        if (!window.isSecureContext && window.location.hostname !== 'localhost') {
            alert("Neural Voice requires a Secure Context (HTTPS or localhost). Browsers block speech recognition on local network IPs over HTTP.")
            return
        }
        
        const next = !isVoiceMode
        setIsVoiceMode(next)
        if (next) {
            setInput('')
        } else {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop() } catch(e) {}
            }
            if (audioRef.current) {
                try { audioRef.current.pause() } catch(e) {}
            }
        }
    }

    // Load sessions on mount
    useEffect(() => {
        fetchSessions()
        const params = new URLSearchParams(window.location.search)
        if (params.get('sync') === 'success') {
            setIsSynced(true)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "DECRYPTION_SUCCESS: Google Drive neural link established. I can now query your external documentation repositories.",
                timestamp: new Date()
            }])
        }

        const savedSessionId = localStorage.getItem('schro_active_intelligence_session')
        if (savedSessionId) {
            loadSession(savedSessionId)
        }

        const savedPerms = localStorage.getItem('schro_intelligence_permissions')
        if (savedPerms) {
            try { setAccessPermissions(JSON.parse(savedPerms)) } catch (e) {}
        }

        const savedPosture = localStorage.getItem('schro_intelligence_posture') as EmotivePosture | null
        if (savedPosture) {
            setPosture(savedPosture)
        }
        fetchPersonaCompletion()
    }, [])

    const togglePermission = (key: keyof typeof accessPermissions) => {
        setAccessPermissions(prev => {
            const next = { ...prev, [key]: !prev[key] }
            localStorage.setItem('schro_intelligence_permissions', JSON.stringify(next))
            return next
        })
    }

    const fetchSessions = async () => {
        try {
            const res = await fetch('/api/intelligence/sessions')
            const data = await res.json()
            if (data.sessions) setSessions(data.sessions)
        } catch (err) {
            console.error('Failed to fetch sessions', err)
        }
    }
    const loadSession = async (sessionId: string) => {
        if (!sessionId || sessionId === 'undefined') {
            console.error('Invalid sessionId provided to loadSession')
            return
        }
        setIsTyping(true)
        setActiveSessionId(sessionId)
        localStorage.setItem('schro_active_intelligence_session', sessionId)

        try {
            const res = await fetch(`/api/intelligence/sessions/${sessionId}/messages`)
            const data = await res.json()
            if (!res.ok) throw new Error(data.error || 'Could not retrieve chat history')
            
            if (data.messages && data.messages.length > 0) {
                setMessages(data.messages.map((m: any) => ({
                    role: m.role as 'user' | 'assistant',
                    content: m.content,
                    timestamp: new Date(m.created_at),
                    posture: m.posture as EmotivePosture
                })))
            } else {
                setMessages([defaultWelcome])
            }
            setIsSidebarOpen(false)
        } catch (err: any) {
            console.error('Failed to load session messages', err)
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `ERROR: Failed to load this session's history. ${err.message}`,
                timestamp: new Date()
            }])
        } finally {
            setIsTyping(false)
        }
    }


    const startNewChat = () => {
        setActiveSessionId(null)
        localStorage.removeItem('schro_active_intelligence_session')
        setMessages([defaultWelcome])
        setInput('')
        setIsSidebarOpen(false)
    }

    const deleteSession = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation()
        try {
            await fetch(`/api/intelligence/sessions?id=${id}`, { method: 'DELETE' })
            setSessions(prev => prev.filter(s => s.id !== id))
            if (activeSessionId === id) startNewChat()
        } catch (err) {
            console.error('Failed to delete session', err)
        }
    }

    const togglePin = async (e: React.MouseEvent, id: string, currentlyPinned: boolean) => {
        e.stopPropagation()
        // Optimistic UI
        setSessions(prev => prev.map(s => s.id === id ? { ...s, is_pinned: !currentlyPinned } : s))
        try {
            await fetch(`/api/intelligence/sessions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_pinned: !currentlyPinned })
            })
        } catch (err) {
            console.error('Failed to toggle pin', err)
            // Revert on fail
            setSessions(prev => prev.map(s => s.id === id ? { ...s, is_pinned: currentlyPinned } : s))
        }
    }

    const startRename = (e: React.MouseEvent, id: string, currentTitle: string) => {
        e.stopPropagation()
        setEditingSessionId(id)
        setEditingTitle(currentTitle)
    }

    const saveRename = async (e?: React.FormEvent | React.FocusEvent) => {
        e?.preventDefault()
        if (!editingSessionId || !editingTitle.trim()) {
            setEditingSessionId(null)
            return
        }
        
        const id = editingSessionId
        const newTitle = editingTitle.trim()
        setEditingSessionId(null)

        // Optimistic UI
        setSessions(prev => prev.map(s => s.id === id ? { ...s, title: newTitle } : s))
        
        try {
            await fetch(`/api/intelligence/sessions/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: newTitle })
            })
        } catch (err) {
            console.error('Failed to save rename', err)
            fetchSessions() // Revert by refetching
        }
    }

    const validSessions = sessions.filter(s => s.id && s.id !== 'undefined')
    const pinnedSessions = validSessions.filter(s => s.is_pinned)
    const recentSessions = validSessions.filter(s => !s.is_pinned)

    const renderSession = (session: ChatSession) => (
        <button
            key={session.id}
            onClick={() => loadSession(session.id)}
            className={cn(
                "w-full group/item flex items-center justify-between p-3 rounded-xl text-left transition-all relative overflow-hidden",
                activeSessionId === session.id
                    ? "bg-black text-white shadow-lg"
                    : "hover:bg-black/[0.03] text-black/70 hover:text-black"
            )}
        >
            <div className="flex items-start gap-3 flex-1 min-w-0 pr-2">
                <MessageSquare className={cn("w-4 h-4 mt-0.5 shrink-0", activeSessionId === session.id ? "text-white/40" : "text-black/20")} />
                
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                    {editingSessionId === session.id ? (
                        <form onSubmit={saveRename} className="flex-1 w-full" onClick={(e) => e.stopPropagation()}>
                            <input
                                autoFocus
                                value={editingTitle}
                                onChange={e => setEditingTitle(e.target.value)}
                                onBlur={saveRename}
                                className={cn(
                                    "w-full text-xs font-bold outline-none bg-transparent placeholder-black/20",
                                    activeSessionId === session.id ? "text-white" : "text-black"
                                )}
                            />
                        </form>
                    ) : (
                        <>
                            <p className="text-xs font-bold truncate tracking-tight">{session.title}</p>
                            <p className={cn("text-[8px] font-medium mt-0.5 uppercase tracking-tighter", activeSessionId === session.id ? "text-white/40" : "text-black/30")}>
                                {new Date(session.updated_at).toLocaleDateString()}
                            </p>
                        </>
                    )}
                </div>
            </div>

            {/* Actions */}
            <div className="shrink-0 flex items-center gap-0.5 transition-opacity">
                {editingSessionId === session.id ? (
                    <div
                        onClick={(e) => { e.stopPropagation(); saveRename(); }}
                        className={cn(
                            "p-1.5 rounded-lg transition-all",
                            activeSessionId === session.id ? "hover:bg-white/20 text-white/70 hover:text-white" : "hover:bg-emerald-100 text-emerald-600"
                        )}
                    >
                        <Check className="w-3.5 h-3.5" />
                    </div>
                ) : (
                    <>
                        <div
                            onClick={(e) => togglePin(e, session.id, !!session.is_pinned)}
                            className={cn(
                                "p-1.5 rounded-lg transition-all",
                                session.is_pinned 
                                    ? (activeSessionId === session.id ? "text-white bg-white/20 shadow-inner" : "text-black bg-black/5 shadow-inner")
                                    : (activeSessionId === session.id ? "text-white/30 hover:bg-white/20 hover:text-white" : "text-black/10 hover:bg-black/5 hover:text-black/60")
                            )}
                        >
                            <Pin className={cn("w-3.5 h-3.5", session.is_pinned && "fill-current")} />
                        </div>
                        
                        <div
                            onClick={(e) => startRename(e, session.id, session.title)}
                            className={cn(
                                "p-1.5 rounded-lg transition-all",
                                activeSessionId === session.id ? "text-white/30 hover:bg-white/20 hover:text-white" : "text-black/10 hover:bg-black/5 hover:text-black/60"
                            )}
                        >
                            <Edit2 className="w-3.5 h-3.5" />
                        </div>

                        <div
                            onClick={(e) => deleteSession(e, session.id)}
                            className={cn(
                                "p-1.5 rounded-lg transition-all",
                                activeSessionId === session.id ? "text-white/30 hover:bg-red-500/30 hover:text-red-100" : "text-black/10 hover:bg-red-50 hover:text-red-500"
                            )}
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </div>
                    </>
                )}
            </div>
        </button>
    )

    // Auto-scroll on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages, isTyping])

    async function handleSend(e?: React.FormEvent) {
        e?.preventDefault()
        const messageText = input.trim()
        if (!messageText || isTyping) return

        // Ensure mic stops listening while AI responds
        try { recognitionRef.current?.stop() } catch(err) {}

        let currentSessionId = activeSessionId

        // Initial optimism
        const userMsg: Message = {
            role: 'user',
            content: messageText,
            timestamp: new Date()
        }

        const newMessages = [...messages, userMsg]
        setMessages(newMessages)
        setInput('')
        setIsTyping(true)

        try {
            // 1. Create session if it doesn't exist
            if (!currentSessionId) {
                const sRes = await fetch('/api/intelligence/sessions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ title: messageText.slice(0, 40) + '...' })
                })
                const sData = await sRes.json()
                if (sData.session) {
                    currentSessionId = sData.session.id
                    setActiveSessionId(currentSessionId)
                    if (currentSessionId) localStorage.setItem('schro_active_intelligence_session', currentSessionId)
                    fetchSessions()
                }
            }

            // 2. Send to AI
            const res = await fetch('/api/ai/intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: newMessages,
                    sessionId: currentSessionId,
                    isDemoMode: settings.is_demo_mode,
                    posture,
                    accessPermissions
                })
            })

            const data = await res.json()
            if (data.reply) {
                let finalReply = data.reply
                
                // 1. Parsing and stripping Posture Tags [[POSTURE:id]]
                const postureMatch = finalReply.match(/\[\[POSTURE:(\w+)\]\]/i)
                const detectedPosture = postureMatch ? postureMatch[1].toLowerCase() as EmotivePosture : data.posture as EmotivePosture
                
                if (detectedPosture) {
                    setPosture(detectedPosture)
                    localStorage.setItem('schro_intelligence_posture', detectedPosture)
                }
                
                // Absolute stripping of all posture tags
                finalReply = finalReply.replace(/\[\[POSTURE:.*?\]\]/gi, '').trim()

                const assistantMsg: Message = {
                    role: 'assistant',
                    content: finalReply,
                    timestamp: new Date(),
                    posture: detectedPosture
                }
                setMessages(prev => [...prev, assistantMsg])
                
                // Update session title in side list locally if it was new
                if (activeSessionId === null) fetchSessions()

                // Voice Protocol Output: Auto-Talkback (Using backend-forced identity voice)
                if (isVoiceMode && isHDVoice) {
                    handleVocalize(finalReply, newMessages.length, data.voice) 
                }
            } else {
                throw new Error(data.error || 'Failed to fetch response')
            }
        } catch (err: any) {
            const errorMsg: Message = {
                role: 'assistant',
                content: `ERROR: SYSTEM_HALT. ${err.message}. Connection to Assistant Node severed.`,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMsg])
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">
            {/* Standard Module Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between z-20 shrink-0 gap-6 pb-2">
                <div className="space-y-1">
                    <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Assistant Protocol</h2>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase flex items-center gap-3 grayscale">
                        Schrö Assistant
                    </h1>
                </div>

                <div className="flex items-center gap-4 text-[10px] font-black uppercase tracking-[0.2em] h-fit mb-1">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSidebarOpen(true)}
                            className="w-9 h-9 flex items-center justify-center bg-white border border-black/[0.08] shadow-sm rounded-xl hover:bg-black/[0.02] hover:shadow hover:border-black/20 transition-all group"
                            title="Conversation History"
                        >
                            <History className="w-4 h-4 text-black/40 group-hover:text-black" />
                        </button>
                        <button
                            onClick={startNewChat}
                            className="w-9 h-9 flex items-center justify-center bg-white border border-black/[0.08] shadow-sm rounded-xl hover:bg-black/[0.02] hover:shadow hover:border-black/20 transition-all group"
                            title="New Conversation"
                        >
                            <Plus className="w-4 h-4 text-black/40 group-hover:text-black" />
                        </button>
                    </div>

                    <div className="w-px h-5 bg-black/10 mx-1" />

                    <div className="flex items-center gap-2">
                        {/* HD Voice Toggle */}
                        <button
                            onClick={() => {
                                const next = !isHDVoice
                                setIsHDVoice(next)
                                if (!next) setIsVoiceMode(false) // Deactivate Voice Mode if HD is off
                                localStorage.setItem('schro_assistant_hd_voice', next.toString())
                            }}
                            className={cn(
                                "h-9 px-3 rounded-xl border flex items-center gap-2 transition-all",
                                isHDVoice 
                                    ? "bg-amber-500/10 border-amber-500/30 text-amber-600 shadow-sm" 
                                    : "bg-white border-black/[0.08] text-black/30 hover:bg-black/[0.02] hover:text-black"
                            )}
                            title="Neural HD Mode"
                        >
                            <Sparkles className={cn("w-3.5 h-3.5", isHDVoice ? "fill-current" : "")} />
                            <span className="text-[9px] font-black uppercase tracking-widest hidden lg:block">Neural HD</span>
                        </button>

                        {/* Neural HD Toggle Only (Selectors removed as they are now autonomous) */}
                        <button
                            onClick={() => setIsPersonaModalOpen(true)}
                            className="relative w-9 h-9 flex items-center justify-center bg-white border border-black/[0.08] shadow-sm rounded-xl hover:bg-black/[0.02] hover:shadow hover:border-black/20 transition-all group"
                            title="Persona Alignment"
                        >
                            <User className="w-4 h-4 text-black/40 group-hover:text-black" />
                            {personaCompletion > 0 && (
                                <div className={cn(
                                    "absolute -top-1 -right-1 px-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[8px] font-black text-white shadow-sm",
                                    personaCompletion === 100 ? "bg-emerald-500" : "bg-black"
                                )}>
                                    {personaCompletion}%
                                </div>
                            )}
                        </button>
                        <button
                            onClick={() => setIsSyncModalOpen(true)}
                            className={cn(
                                "relative w-9 h-9 flex items-center justify-center shadow-sm rounded-xl transition-all group",
                                isSynced ? "bg-emerald-500/5 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-500/10" : "bg-white border border-black/[0.08] hover:bg-black/[0.02] hover:shadow hover:border-black/20 text-black/40 hover:text-black"
                            )}
                            title="Data Connections"
                        >
                            <Brain className="w-4 h-4" />
                            <div className={cn(
                                "absolute top-1.5 right-1.5 rounded-full",
                                isSynced ? "w-1.5 h-1.5 bg-emerald-500 animate-pulse" : "w-1 h-1 bg-black/20"
                            )} />
                        </button>
                    </div>
                </div>
            </header>

            {/* Sidebar / History Drawer */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSidebarOpen(false)}
                            className="absolute -top-[100vh] -bottom-[100vh] -left-[100vw] -right-[100vw] bg-black/10 backdrop-blur-sm z-40"
                        />
                        <motion.div
                            initial={{ x: -400, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -400, opacity: 0 }}
                            className="absolute left-4 top-4 bottom-4 w-96 bg-[#FAFAFA] border border-black/[0.06] shadow-2xl z-50 flex flex-col rounded-[32px] overflow-hidden"
                        >
                            <div className="p-6 border-b border-black/[0.04] flex items-center justify-between bg-white z-10 shadow-sm">
                                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-black">Conversation History</h3>
                                <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-black/5 rounded-full transition-colors">
                                    <CloseIcon className="w-4 h-4 text-black/30" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-4 space-y-1 no-scrollbar">

                                {validSessions.length === 0 && (
                                    <div className="py-20 text-center space-y-2">
                                        <History className="w-8 h-8 text-black/[0.05] mx-auto" />
                                        <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest">No previous sessions</p>
                                    </div>
                                )}

                                {pinnedSessions.length > 0 && (
                                    <div className="mb-8">
                                        <h4 className="px-3 pb-3 text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] flex items-center gap-1.5">
                                            <Pin className="w-3.5 h-3.5 fill-emerald-600" /> Pinned
                                        </h4>
                                        <div className="space-y-1.5">
                                            {pinnedSessions.map(renderSession)}
                                        </div>
                                    </div>
                                )}

                                {recentSessions.length > 0 && (
                                    <div>
                                        <h4 className="px-3 pb-3 text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Recent History</h4>
                                        <div className="space-y-1.5">
                                            {recentSessions.map(renderSession)}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Neural Connections Modal */}
            <AnimatePresence>
                {isSyncModalOpen && (
                    <div className="fixed inset-0 flex items-center justify-center z-[60]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsSyncModalOpen(false)}
                            className="absolute inset-0 bg-black/10 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl overflow-hidden border border-black/5"
                        >
                            <div className="p-6 border-b border-black/5 flex items-center justify-between bg-[#FAFAFA]">
                                <div className="flex items-center gap-4">
                                    <div className="relative">
                                        <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-600 border border-emerald-500/20">
                                            <Brain className="w-5 h-5" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#FAFAFA]" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-black">Neural Connections</h3>
                                        <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest mt-0.5">Manage AI Data Access</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsSyncModalOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors text-black/30 hover:text-black">
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-3 pb-1">
                                <h4 className="px-3 pt-2 pb-2 text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">External Integrations</h4>
                                {[
                                    { id: 'gmail', name: 'Gmail', icon: Mail, desc: 'Email threading and inbox parsing' },
                                    { id: 'drive', name: 'Google Drive', icon: Cloud, desc: 'External Neural Doc Indexing' }
                                ].map(mod => {
                                    const Icon = mod.icon
                                    let isToggledOn = accessPermissions[mod.id as keyof typeof accessPermissions]
                                    if (mod.id === 'drive') isToggledOn = isSynced
                                    
                                    return (
                                        <div key={mod.id} className="flex items-center justify-between p-3 hover:bg-black/[0.02] rounded-2xl transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("p-2.5 rounded-xl border transition-all", isToggledOn ? "bg-black text-white border-black" : "bg-white text-black/30 border-black/10 group-hover:bg-black/5")}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-black group-hover:text-black transition-colors">{mod.name}</p>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-black/30 mt-0.5">{mod.desc}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    if (mod.id === 'drive' && !isSynced) {
                                                        window.location.href = '/api/auth/google'
                                                        return
                                                    }
                                                    if (mod.id === 'drive' && isSynced) return // Prevent disconnect text for now
                                                    togglePermission(mod.id as keyof typeof accessPermissions)
                                                }}
                                                className={cn(
                                                    "w-10 h-6 rounded-full p-1 transition-colors relative",
                                                    isToggledOn ? "bg-emerald-500" : "bg-black/10"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                                                    isToggledOn ? "translate-x-4" : "translate-x-0"
                                                )} />
                                            </button>
                                        </div>
                                    )
                                })}

                                <h4 className="px-3 pt-4 pb-2 text-[9px] font-black text-black/30 uppercase tracking-[0.2em]">Internal</h4>
                                {[
                                    { id: 'studio', name: 'Studio', icon: ImageIcon, desc: 'Media assets and project portfolios' },
                                    { id: 'operations', name: 'Operations', icon: CheckSquare, desc: 'Project timelines and focus nodes' },
                                    { id: 'wellbeing', name: 'Wellbeing', icon: Activity, desc: 'Biometric and physiological data' },
                                    { id: 'finances', name: 'Finances', icon: Wallet, desc: 'Ledgers, balances, and analytics' },
                                    { id: 'manifest', name: 'Manifest', icon: Sparkles, desc: 'Core goals and long-term alignments' },
                                    { id: 'vault', name: 'Vault', icon: Lock, desc: 'Core system variables and secure notes' }
                                ].map(mod => {
                                    const Icon = mod.icon
                                    const isToggledOn = accessPermissions[mod.id as keyof typeof accessPermissions]
                                    
                                    return (
                                        <div key={mod.id} className="flex items-center justify-between p-3 hover:bg-black/[0.02] rounded-2xl transition-all group">
                                            <div className="flex items-center gap-4">
                                                <div className={cn("p-2.5 rounded-xl border transition-all", isToggledOn ? "bg-black text-white border-black" : "bg-white text-black/30 border-black/10 group-hover:bg-black/5")}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-black group-hover:text-black transition-colors">{mod.name}</p>
                                                    <p className="text-[9px] font-bold uppercase tracking-widest text-black/30 mt-0.5">{mod.desc}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => togglePermission(mod.id as keyof typeof accessPermissions)}
                                                className={cn(
                                                    "w-10 h-6 rounded-full p-1 transition-colors relative",
                                                    isToggledOn ? "bg-emerald-500" : "bg-black/10"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-4 h-4 rounded-full bg-white shadow-sm transition-transform",
                                                    isToggledOn ? "translate-x-4" : "translate-x-0"
                                                )} />
                                            </button>
                                        </div>
                                    )
                                })}
                            </div>
                            
                            <div className="bg-[#FAFAFA] p-5 border-t border-black/5 flex items-start gap-4">
                                <Shield className="w-5 h-5 text-black/20 shrink-0 mt-0.5" />
                                <p className="text-[10px] uppercase font-bold tracking-widest text-black/30 leading-relaxed text-left">
                                    Schrö Assistant only processes data securely. <br/> It cannot permanently delete root database records without explicit confirmation protocols.
                                </p>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <PersonaModal 
                isOpen={isPersonaModalOpen} 
                onClose={() => {
                    setIsPersonaModalOpen(false)
                    fetchPersonaCompletion()
                }} 
            />

            {/* Chat Viewport */}
            <div className="flex-1 overflow-hidden flex flex-col relative w-full">
                {/* Top Fade Overlay */}
                <div className="absolute top-0 inset-x-0 h-24 bg-gradient-to-b from-[#FAFAFA] to-transparent z-10 pointer-events-none" />
                
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto space-y-6 w-full pb-8 pt-10 no-scrollbar"
                >
                    <AnimatePresence mode="popLayout">
                        {messages.map((msg, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={cn(
                                    "flex flex-col gap-1.5",
                                    msg.role === 'user' ? "items-end ml-auto max-w-[85%]" : "items-start mr-auto max-w-[85%]"
                                )}
                            >
                                {msg.role === 'assistant' && msg.posture && (
                                    <div className={cn(
                                        "flex items-center gap-1.5 px-1 pb-0.5 text-[8px] font-black uppercase tracking-[0.2em] opacity-60",
                                        msg.posture === 'anya' ? "text-rose-600" :
                                        msg.posture === 'vance' ? "text-amber-600" :
                                        msg.posture === 'kael' ? "text-sky-600" :
                                        "text-black/40"
                                    )}>
                                        {msg.posture === 'anya' && <Heart className="w-2.5 h-2.5 fill-current" />}
                                        {msg.posture === 'vance' && <Shield className="w-2.5 h-2.5 fill-current" />}
                                        {msg.posture === 'kael' && <Zap className="w-2.5 h-2.5 fill-current" />}
                                        <span>
                                            {
                                                msg.posture === 'anya' ? 'Anya (Therapist)' :
                                                msg.posture === 'vance' ? 'Vance (Strategist)' :
                                                msg.posture === 'kael' ? 'Kael (Mentor)' :
                                                'Schrö Assistant'
                                            }
                                        </span>
                                    </div>
                                )}
                                <div className={cn(
                                    "p-4 rounded-2xl text-[15px] leading-relaxed shadow-sm border transition-all",
                                    msg.role === 'assistant'
                                        ? "bg-white text-black border-black/[0.06] rounded-tl-none"
                                        : "bg-black text-white border-black font-medium rounded-tr-none"
                                )}>
                                    {msg.content}
                                </div>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[9px] font-medium text-black/20 uppercase">
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                    {msg.role === 'assistant' && (
                                        <div className="flex items-center gap-1.5 ml-1">
                                            <button
                                                onClick={() => handleVocalize(msg.content, index)}
                                                className={cn(
                                                    "transition-all",
                                                    activeSpeechIndex === index ? "text-black" : "text-black/20 hover:text-black/40"
                                                )}
                                                title={activeSpeechIndex === index ? (isSpeechPaused ? "Resume" : "Pause") : "Read Aloud"}
                                            >
                                                {activeSpeechIndex === index ? (
                                                    isSpeechPaused ? <Play className="w-3 h-3 fill-current" /> : <Pause className="w-3 h-3 fill-current" />
                                                ) : <Volume2 className="w-3 h-3" />}
                                            </button>
                                            
                                            {activeSpeechIndex === index && (
                                                <button
                                                    onClick={stopVocalization}
                                                    className="text-black/20 hover:text-red-500 transition-colors"
                                                    title="Stop"
                                                >
                                                    <Square className="w-2.5 h-2.5 fill-current" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
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
                <div className="shrink-0 w-full mb-[30px] space-y-3 relative pt-4 bg-[#FAFAFA] z-20">
                    {/* Seamless text fade masking */}
                    <div className="absolute top-0 inset-x-0 h-10 -translate-y-full bg-gradient-to-t from-[#FAFAFA] to-transparent pointer-events-none" />
                    
                    <form
                        onSubmit={handleSend}
                        className="relative bg-white border border-black/[0.1] rounded-2xl p-1 shadow-lg transition-all focus-within:border-black/30"
                    >
                        <div className="flex items-center">
                            {isHDVoice && (
                                <button
                                    type="button"
                                    onClick={toggleVoiceMode}
                                    className={cn(
                                        "ml-1.5 w-10 h-10 rounded-xl flex items-center justify-center transition-all flex-shrink-0 cursor-pointer",
                                        isVoiceMode 
                                            ? "bg-red-500/10 text-red-600 hover:bg-red-500/20" 
                                            : "bg-black/[0.02] text-black/40 hover:text-black hover:bg-black/[0.05]"
                                    )}
                                >
                                    {isVoiceMode ? <AudioLines className={cn("w-5 h-5", isListening && "animate-pulse")} /> : <AudioLines className="w-5 h-5 opacity-40" />}
                                </button>
                            )}
                            <div className="flex-1 relative flex items-center">
                                <textarea
                                    id="assistant-input"
                                    ref={textareaRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onFocus={handleManualInputInterference}
                                    onClick={handleManualInputInterference}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !e.shiftKey) {
                                            handleSend(e)
                                        }
                                    }}
                                    placeholder={isListening ? "Listening..." : "Message Assistant..."}
                                    className="w-full bg-transparent text-sm font-medium text-black placeholder-black/30 resize-none outline-none py-3 pl-3 pr-24 min-h-[48px] max-h-[200px] z-10"
                                    rows={1}
                                />
                                {isListening && autoSendProgress > 0 && (
                                    <div className="absolute bottom-1 left-1/4 right-1/4 h-1 bg-black/[0.03] overflow-hidden rounded-full z-0">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${autoSendProgress}%` }}
                                            className="h-full bg-black/10 transition-all duration-75"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 pr-2">
                                <button
                                    id="assistant-send-button"
                                    onClick={(e) => handleSend(e)}
                                    disabled={!input.trim() || isTyping}
                                    className={cn(
                                        "p-2.5 rounded-xl transition-all shadow-sm",
                                        !input.trim() || isTyping
                                            ? "bg-black/5 text-black/20"
                                            : "bg-black text-white hover:scale-105 active:scale-95"
                                    )}
                                >
                                    <ArrowUp className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </form>
                </div>

                <style jsx global>{`
                    .no-scrollbar::-webkit-scrollbar {
                        display: none;
                    }
                    .no-scrollbar {
                        -ms-overflow-style: none;
                        scrollbar-width: none;
                    }
                `}</style>
            </div>
        </div>
    )
}
