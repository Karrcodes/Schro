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

type EmotivePosture = 'auto' | 'ruby' | 'vance' | 'kael' | 'sentinel' | 'mentor' | 'analyst' | 'strategist' | 'artist' | 'creative'

interface Message {
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
    posture?: EmotivePosture
    pendingActions?: any[]
    audioUrl?: string
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
        content: "Schrö Assistant: Neural Protocol Online. 🎙️🧬\n\nSpeak to Ruby for therapy and wellbeing.\nSpeak to Vance for strategy and operations.\nSpeak to Kael for technical and data optimization.\n\nHow shall we proceed?",
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
    const [lockedIdentity, setLockedIdentity] = useState<string | null>(null)
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
    const [micHeartbeat, setMicHeartbeat] = useState(0)
    const [lastVocalizedIndex, setLastVocalizedIndex] = useState(-1)
    const [isIdentityDnaModalOpen, setIsIdentityDnaModalOpen] = useState(false)
    const [identityDna, setIdentityDna] = useState<Record<string, { voice: string, directives: string, name?: string, role?: string }>>({
        ruby: { voice: 'nova', directives: '', name: 'Ruby', role: 'Therapist' },
        vance: { voice: 'onyx', directives: '', name: 'Vance', role: 'Strategist' },
        kael: { voice: 'alloy', directives: '', name: 'Kael', role: 'Mentor' }
    })
    const [activeDnaTab, setActiveDnaTab] = useState<'ruby' | 'vance' | 'kael'>('ruby')
    const [isSavingDna, setIsSavingDna] = useState(false)
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

    const audioCacheRef = useRef<Set<string>>(new Set())

    useEffect(() => {
        const savedPermissions = localStorage.getItem('schro_assistant_permissions')
        if (savedPermissions) {
            try {
                setAccessPermissions(JSON.parse(savedPermissions))
            } catch (e) {
                console.error('Failed to load permissions', e)
            }
        }
        
        const savedLock = localStorage.getItem('schro_assistant_locked_identity')
        if (savedLock === 'ruby' || savedLock === 'vance' || savedLock === 'kael') {
            setLockedIdentity(savedLock)
        }
    }, [])

    useEffect(() => {
        // Load DNA with Rebranding Migration
        const savedDna = localStorage.getItem('schro_assistant_identity_dna')
        if (savedDna) {
            try {
                const dna = JSON.parse(savedDna)
                // Emergency Migration: anya -> ruby
                if (dna.anya && !dna.ruby) {
                    dna.ruby = dna.anya
                    delete dna.anya
                }
                // Backfill roles/names if missing
                if (dna.ruby && !dna.ruby.name) dna.ruby = { ...dna.ruby, name: 'Ruby', role: 'Therapist' }
                if (dna.vance && !dna.vance.name) dna.vance = { ...dna.vance, name: 'Vance', role: 'Strategist' }
                if (dna.kael && !dna.kael.name) dna.kael = { ...dna.kael, name: 'Kael', role: 'Mentor' }
                
                setIdentityDna(dna)
            } catch (e) {
                console.error('Failed to parse DNA', e)
            }
        }

        const savedHD = localStorage.getItem('schro_assistant_hd_voice') === 'true'
        const savedHDId = localStorage.getItem('schro_assistant_hd_voice_id')
        const validOpenAI = ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer']
        setIsHDVoice(savedHD)
        if (savedHDId && validOpenAI.includes(savedHDId)) setHdVoiceId(savedHDId)
        
        return () => {
            // Neural Garbage Collection: Purge all blob URLs to prevent memory pressure
            audioCacheRef.current.forEach(url => URL.revokeObjectURL(url))
        }
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

    // Neural Input Expansion: Synchronize textarea height with scrollHeight
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto'
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [input])



    const handleVocalize = async (content: string, index: number, voiceOverride?: string) => {
        if (typeof window === 'undefined') return

        // 1. Text-to-Speech (Standard)
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
            activeSpeechIndexRef.current = index
            setActiveSpeechIndex(index)
            setIsSpeechPaused(false)
            utterance.onend = () => {
                setActiveSpeechIndex(null)
                setIsSpeechPaused(false)
            }
            window.speechSynthesis.speak(utterance)
            return
        }

        // 2. Neural HD Voice (Cloud)
        window.speechSynthesis?.cancel()

        // Check if we already have the audio cached
        const msg = messages[index]
        if (msg?.audioUrl) {
            if (activeSpeechIndex === index) {
                togglePlayback()
                return
            }
            activeSpeechIndexRef.current = index
            setActiveSpeechIndex(index)
            setIsSpeechPaused(false)
            if (audioRef.current) {
                audioRef.current.src = msg.audioUrl
                audioRef.current.play().catch(e => console.error('Cached playback failed', e))
            }
            return
        }

        try {
            activeSpeechIndexRef.current = index
            setActiveSpeechIndex(index)
            setIsSpeechPaused(false)
            
            const targetVoice = voiceOverride || identityDna[msg?.posture || posture || 'vance']?.voice || hdVoiceId

            const res = await fetch('/api/ai/speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: content, voice: targetVoice })
            })

            if (activeSpeechIndexRef.current !== index) return

            if (!res.ok) throw new Error('Failed to generate cloud speech')

            const blob = await res.blob()
            const url = URL.createObjectURL(blob)
            audioCacheRef.current.add(url)
            
            // Store the URL back into the message for future instant playback
            setMessages(prev => prev.map((m, i) => i === index ? { ...m, audioUrl: url } : m))

            if (activeSpeechIndexRef.current !== index) {
                // Keep the URL since we stored it in the message, don't revoke yet
                return
            }

            if (audioRef.current) {
                audioRef.current.pause()
                audioRef.current.src = url
                await audioRef.current.play()
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
            if (data.identity_dna) {
                const dna = { ...data.identity_dna }
                // Neural Rebranding Migration: Map anya to ruby if needed
                if (dna.anya && !dna.ruby) {
                    dna.ruby = dna.anya
                    delete dna.anya
                }
                setIdentityDna(dna)
                localStorage.setItem('schro_assistant_identity_dna', JSON.stringify(dna))
            }
        }
    }

    // Neural Vocalization Reactor: Auto-Talkback & Background Pre-fetching
    useEffect(() => {
        if (!isHDVoice || messages.length === 0) return
        
        const lastIndex = messages.length - 1
        const lastMsg = messages[lastIndex]
        if (lastMsg.role !== 'assistant' || lastMsg.pendingActions) return

        // 1. Automatic Talkback (Voice Mode Only)
        if (isVoiceMode && lastIndex > lastVocalizedIndex) {
            setLastVocalizedIndex(lastIndex)
            handleVocalize(lastMsg.content, lastIndex)
        } 
        // 2. Automatic Pre-fetching (Text Mode - Proactive Cache)
        else if (!isVoiceMode && !lastMsg.audioUrl && lastIndex > lastVocalizedIndex) {
            // Background fetch
            const prefetch = async () => {
                try {
                    const res = await fetch('/api/ai/speech', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ text: lastMsg.content, voice: hdVoiceId })
                    })
                    if (res.ok) {
                        const blob = await res.blob()
                        const url = URL.createObjectURL(blob)
                        audioCacheRef.current.add(url)
                        setLastVocalizedIndex(lastIndex)
                        setMessages(prev => prev.map((m, i) => i === lastIndex ? { ...m, audioUrl: url } : m))
                    }
                } catch (e) {
                    console.error('Pre-fetch failed', e)
                }
            }
            prefetch()
        }
    }, [messages, isVoiceMode, isHDVoice, lastVocalizedIndex, hdVoiceId])

    // Neural Heartbeat: Watchdog to force mic recovery on iPad/Safari
    useEffect(() => {
        if (!isVoiceMode || isTyping || activeSpeechIndex !== null) return
        
        const interval = setInterval(() => {
            if (!isListening) {
                console.log('[Neural Heartbeat] Mic stuck. Forcing re-sync...')
                setMicHeartbeat(prev => prev + 1)
            }
        }, 2500)

        return () => clearInterval(interval)
    }, [isVoiceMode, isTyping, activeSpeechIndex, isListening])

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
                try { 
                    // Use abort() on mobile for faster release
                    recognitionRef.current.abort() 
                } catch(e) {}
            }
            if (autoSendTimerRef.current) clearTimeout(autoSendTimerRef.current)
            if (autoSendIntervalRef.current) clearInterval(autoSendIntervalRef.current)
        }
    }, [isVoiceMode, isAutoSendEnabled, isTyping, activeSpeechIndex, micHeartbeat])

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
        const savedDna = localStorage.getItem('schro_assistant_identity_dna')
        if (savedDna) {
            try { setIdentityDna(JSON.parse(savedDna)) } catch (e) {}
        }

        fetchPersonaCompletion()
    }, [])

    const togglePermission = (mod: keyof typeof accessPermissions) => {
        setAccessPermissions(prev => {
            const next = { ...prev, [mod]: !prev[mod] }
            localStorage.setItem('schro_assistant_permissions', JSON.stringify(next))
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
        
        // iPad Hardening: Explicitly stop recognition the moment we send to free audio context
        if (recognitionRef.current) {
            try { recognitionRef.current.stop() } catch (e) {}
        }

        try {
            setIsTyping(true)
            
            // 1. Persist User Message if session exists
            let currentSessionId = activeSessionId
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
                    lockedIdentity,
                    identityDna,
                    accessPermissions
                })
            })

            const data = await res.json()
            if (data.requiresConsent) {
                const stagingMsg: Message = {
                    role: 'assistant',
                    content: data.reply || "Protocol Execution Staged: Awaiting Neural Confirmation.",
                    timestamp: new Date(),
                    posture: data.posture as EmotivePosture || 'vance',
                    pendingActions: data.pendingActions
                }
                setMessages(prev => [...prev, stagingMsg])
                return
            }

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

    const handleConfirmAction = async (msgIndex: number, actions: any[]) => {
        setIsTyping(true)
        // Optimistically remove actions from UI or mark as executing
        setMessages(prev => prev.map((m, i) => i === msgIndex ? { ...m, pendingActions: undefined } : m))

        try {
            const res = await fetch('/api/ai/intelligence', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    sessionId: activeSessionId,
                    confirmed: true, // TRIGGER EXECUTION
                    isDemoMode: settings.is_demo_mode,
                    posture,
                    lockedIdentity,
                    identityDna,
                    accessPermissions
                })
            })
            const data = await res.json()
            if (data.reply) {
                const assistantMsg: Message = {
                    role: 'assistant',
                    content: data.reply,
                    timestamp: new Date(),
                    posture: data.posture as EmotivePosture
                }
                setMessages(prev => [...prev, assistantMsg])
            }
        } catch (err) {
            console.error('Action execution failed', err)
        } finally {
            setIsTyping(false)
        }
    }

    return (
        <div className="flex-1 flex flex-col min-h-0 min-w-0 relative">
            {/* Standard Module Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between z-20 shrink-0 gap-6 pb-2">
                <div className="space-y-1">
                    <h2 className="text-[11px] font-black text-slate-500 uppercase tracking-[0.3em]">Intelligence Protocol</h2>
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
                            onClick={() => setIsIdentityDnaModalOpen(true)}
                            className="relative w-9 h-9 flex items-center justify-center bg-white border border-black/[0.08] shadow-sm rounded-xl hover:bg-black/[0.02] hover:shadow hover:border-black/20 transition-all group"
                            title="Identity DNA (Remapping)"
                        >
                            <AudioLines className="w-4 h-4 text-black/40 group-hover:text-black" />
                            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-indigo-500 rounded-full border border-white" />
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

            {/* Identity DNA Modal */}
            <AnimatePresence>
                {isIdentityDnaModalOpen && (
                    <div className="fixed inset-0 flex items-center justify-center z-[60]">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsIdentityDnaModalOpen(false)}
                            className="absolute inset-0 bg-black/10 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 10 }}
                            className="relative w-full max-w-lg bg-white rounded-[32px] shadow-2xl overflow-hidden border border-black/5"
                        >
                            <div className="p-6 border-b border-black/5 flex items-center justify-between bg-[#FAFAFA]">
                                <div className="flex items-center gap-4">
                                    <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-600 border border-indigo-500/20">
                                        <AudioLines className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black uppercase tracking-widest text-black">Identity DNA</h3>
                                        <p className="text-[9px] font-bold text-black/40 uppercase tracking-widest mt-0.5">Remap Voice & Neural Context</p>
                                    </div>
                                </div>
                                <button onClick={() => setIsIdentityDnaModalOpen(false)} className="p-2 hover:bg-black/5 rounded-full transition-colors text-black/30 hover:text-black">
                                    <CloseIcon className="w-4 h-4" />
                                </button>
                            </div>

                            <div className="p-6">
                                {/* Tab Switcher */}
                                <div className="flex bg-[#FAFAFA] p-1 rounded-2xl border border-black/5 mb-8">
                                    {[
                                        { id: 'ruby', name: identityDna.ruby?.name || 'Ruby', icon: Heart, color: 'text-rose-600', active: 'bg-white shadow-sm border-black/5' },
                                        { id: 'vance', name: identityDna.vance?.name || 'Vance', icon: Shield, color: 'text-amber-600', active: 'bg-white shadow-sm border-black/5' },
                                        { id: 'kael', name: identityDna.kael?.name || 'Kael', icon: Zap, color: 'text-sky-600', active: 'bg-white shadow-sm border-black/5' }
                                    ].map(tab => (
                                        <button
                                            key={tab.id}
                                            onClick={() => setActiveDnaTab(tab.id as any)}
                                            className={cn(
                                                "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                activeDnaTab === tab.id 
                                                    ? cn(tab.active, tab.color) 
                                                    : "text-black/30 hover:text-black/60"
                                            )}
                                        >
                                            <tab.icon className="w-3.5 h-3.5" />
                                            {tab.name}
                                        </button>
                                    ))}
                                </div>

                                <div className="h-auto">
                                    {/* Active Archetype Form */}
                                    {[
                                        { id: 'ruby', name: 'Ruby', icon: Heart, color: 'text-rose-600', bg: 'bg-rose-500/5', border: 'border-rose-500/10' },
                                        { id: 'vance', name: 'Vance', icon: Shield, color: 'text-amber-600', bg: 'bg-amber-500/5', border: 'border-amber-500/10' },
                                        { id: 'kael', name: 'Kael', icon: Zap, color: 'text-sky-600', bg: 'bg-sky-500/5', border: 'border-sky-500/10' }
                                    ].filter(idnt => idnt.id === activeDnaTab).map(idnt => (
                                        <motion.div 
                                            key={idnt.id}
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            className="space-y-6 pb-2"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={cn("p-2 rounded-lg", idnt.bg, idnt.color)}>
                                                    <idnt.icon className="w-4 h-4" />
                                                </div>
                                                <h4 className="text-xs font-black uppercase tracking-widest">{identityDna[idnt.id]?.name || idnt.name} Archetype DNA</h4>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-black/30 ml-1">Identity Name</label>
                                                    <input 
                                                        type="text"
                                                        value={identityDna[idnt.id]?.name || ''}
                                                        onChange={(e) => {
                                                            const next = { ...identityDna, [idnt.id]: { ...identityDna[idnt.id], name: e.target.value } }
                                                            setIdentityDna(next)
                                                        }}
                                                        className="w-full bg-[#FAFAFA] border border-black/5 rounded-xl px-4 py-3 text-xs font-bold outline-none hover:border-black/20 focus:border-black transition-all"
                                                    />
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-black/30 ml-1">Behavioral Role</label>
                                                    <input 
                                                        type="text"
                                                        value={identityDna[idnt.id]?.role || ''}
                                                        onChange={(e) => {
                                                            const next = { ...identityDna, [idnt.id]: { ...identityDna[idnt.id], role: e.target.value } }
                                                            setIdentityDna(next)
                                                        }}
                                                        className="w-full bg-[#FAFAFA] border border-black/5 rounded-xl px-4 py-3 text-xs font-bold outline-none hover:border-black/20 focus:border-black transition-all"
                                                    />
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-black/30 ml-1">Voice Signature</label>
                                                <div className="relative">
                                                    <select 
                                                        value={identityDna[idnt.id]?.voice || 'nova'}
                                                        onChange={(e) => {
                                                            const next = { ...identityDna, [idnt.id]: { ...identityDna[idnt.id], voice: e.target.value } }
                                                            setIdentityDna(next)
                                                        }}
                                                        className="w-full bg-[#FAFAFA] border border-black/5 rounded-xl px-4 py-3 text-xs font-bold outline-none hover:border-black/20 focus:border-black transition-all appearance-none cursor-pointer"
                                                    >
                                                        {['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'].map(v => (
                                                            <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-black/20">
                                                        <Volume2 className="w-4 h-4" />
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-black/30 ml-1">Neural Context / Roleplay Directives</label>
                                                <textarea 
                                                    placeholder={`Add specific characteristics or personality traits for ${identityDna[idnt.id]?.name || idnt.name}...`}
                                                    value={identityDna[idnt.id]?.directives || ''}
                                                    onChange={(e) => {
                                                        const next = { ...identityDna, [idnt.id]: { ...identityDna[idnt.id], directives: e.target.value } }
                                                        setIdentityDna(next)
                                                    }}
                                                    className="w-full h-32 bg-[#FAFAFA] border border-black/5 rounded-2xl px-4 py-3 text-xs font-medium outline-none hover:border-black/20 focus:border-black transition-all resize-none placeholder:text-black/10 custom-scrollbar"
                                                />
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </div>

                            <div className="p-6 bg-[#FAFAFA] border-t border-black/5 flex items-center justify-between">
                                <p className="text-[9px] font-bold text-black/30 uppercase tracking-widest">
                                    Changes take effect immediately <br/> after synchronization.
                                </p>
                                <button 
                                    disabled={isSavingDna}
                                    onClick={async () => {
                                        setIsSavingDna(true)
                                        try {
                                            const { data: persona } = await supabase?.from('sys_user_persona').select('id').limit(1).maybeSingle() || { data: null }
                                            if (persona) {
                                                await supabase?.from('sys_user_persona').update({ identity_dna: identityDna }).eq('id', persona.id)
                                                localStorage.setItem('schro_assistant_identity_dna', JSON.stringify(identityDna))
                                                console.log('DNA Protocol Synchronized.')
                                                // Optional: Show temporary success state
                                            }
                                        } finally {
                                            setIsSavingDna(false)
                                        }
                                    }}
                                    className={cn(
                                        "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm flex items-center gap-2",
                                        isSavingDna 
                                            ? "bg-black/5 text-black/20" 
                                            : "bg-black text-white hover:scale-105 active:scale-95"
                                    )}
                                >
                                    {isSavingDna ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />}
                                    {isSavingDna ? 'Synchronizing...' : 'Save & Sync DNA'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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
                                        msg.posture === 'ruby' ? "text-rose-600" :
                                        msg.posture === 'vance' ? "text-amber-600" :
                                        msg.posture === 'kael' ? "text-sky-600" :
                                        "text-black/40"
                                    )}>
                                        {msg.posture === 'ruby' && <Heart className="w-2.5 h-2.5 fill-current" />}
                                        {msg.posture === 'vance' && <Shield className="w-2.5 h-2.5 fill-current" />}
                                        {msg.posture === 'kael' && <Zap className="w-2.5 h-2.5 fill-current" />}
                                        <span>
                                            {
                                                `${identityDna[msg.posture]?.name || (msg.posture === 'ruby' ? 'Ruby' : msg.posture)} (${identityDna[msg.posture]?.role || (msg.posture === 'ruby' ? 'Therapist' : msg.posture)})`
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

                                    {msg.pendingActions && (
                                        <div className="mt-4 p-4 rounded-xl bg-black/[0.02] border border-black/5 space-y-3">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-black/40">
                                                <Zap className="w-3 h-3 text-amber-500 fill-current" />
                                                Action Staging Protocol
                                            </div>
                                            <div className="space-y-2">
                                                {msg.pendingActions.map((action, i) => (
                                                    <div key={i} className="flex items-start gap-2 text-xs font-bold text-black/80 bg-white/50 p-2 rounded-lg border border-black/5">
                                                        <span className="text-emerald-500">▶</span>
                                                        {action.name === 'manage_task' ? `Create Task: ${action.args.title}` : 
                                                         action.name === 'manage_finance' ? `Fin Op: ${action.args.description || action.args.action}` : 
                                                         `Execute: ${action.name}`}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 pt-1">
                                                <button
                                                    onClick={() => handleConfirmAction(index, msg.pendingActions!)}
                                                    className="flex-1 py-2 bg-black text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:scale-[1.02] active:scale-[0.98] transition-all"
                                                >
                                                    Execute Protocol
                                                </button>
                                                <button
                                                    onClick={() => setMessages(prev => prev.map((m, i) => i === index ? { ...m, pendingActions: undefined } : m))}
                                                    className="px-3 py-2 bg-black/5 text-black/40 text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-black/10 transition-all"
                                                >
                                                    Abort
                                                </button>
                                            </div>
                                        </div>
                                    )}
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
                <div className="shrink-0 w-full mb-[30px] space-y-4 relative pt-4 bg-[#FAFAFA] z-20">
                    {/* Identity Pill Tags */}
                    <div className="flex items-center justify-start gap-2 mb-2 px-1">
                        {[
                            { id: 'ruby', icon: Heart, name: identityDna.ruby?.name || 'Ruby', color: 'text-rose-600 border-rose-500/40 bg-rose-500/5' },
                            { id: 'vance', icon: Shield, name: identityDna.vance?.name || 'Vance', color: 'text-amber-600 border-amber-500/40 bg-amber-500/5' },
                            { id: 'kael', icon: Zap, name: identityDna.kael?.name || 'Kael', color: 'text-sky-600 border-sky-500/40 bg-sky-500/5' }
                        ].map((identity) => (
                            <button
                                key={identity.id}
                                type="button"
                                onClick={() => {
                                    const next = lockedIdentity === identity.id ? null : identity.id as any
                                    setLockedIdentity(next)
                                    if (next) localStorage.setItem('schro_assistant_locked_identity', next)
                                    else localStorage.removeItem('schro_assistant_locked_identity')
                                }}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all duration-300",
                                    lockedIdentity === identity.id 
                                        ? `${identity.color} shadow-sm scale-105` 
                                        : "bg-white border-black/[0.05] text-black/30 hover:bg-black/5 hover:text-black/60 grayscale"
                                )}
                            >
                                <identity.icon className={cn("w-3 h-3", lockedIdentity === identity.id ? "fill-current" : "")} />
                                <span className="text-[10px] font-black tracking-tight uppercase">{identity.name}</span>
                                {lockedIdentity === identity.id && (
                                    <div className="w-1 h-1 bg-current rounded-full animate-pulse" />
                                )}
                            </button>
                        ))}
                        
                        {!lockedIdentity && (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/[0.02] border border-black/[0.05] text-black/30 italic text-[10px]">
                                <Activity className="w-3 h-3 text-emerald-500 animate-pulse" />
                                <span>Neural Auto-Sync</span>
                            </div>
                        )}
                    </div>

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
                                    className="w-full bg-transparent text-sm font-medium text-black placeholder-black/30 resize-none outline-none py-3 pl-3 pr-24 min-h-[48px] max-h-[400px] z-10 custom-scrollbar overflow-y-auto"
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
