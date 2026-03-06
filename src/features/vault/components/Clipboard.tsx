'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useVault } from '../contexts/VaultContext'
import { Plus, Copy, Trash2, Check, ExternalLink, List, X, Camera, Image as ImageIcon, ZoomIn, Maximize2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { LinkPreview } from './LinkPreview'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_VAULT } from '@/lib/demoData'

const LOCAL_STORAGE_KEY = 'schrö_demo_vault_clips_v1'

interface Clip {
    id: string
    content: string
    image_url?: string
    created_at: string
}

export function Clipboard() {
    const { isVaultPrivate } = useVault()
    const [clips, setClips] = useState<Clip[]>([])
    const [newClip, setNewClip] = useState('')
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const [imageFile, setImageFile] = useState<File | null>(null)
    const [imagePreview, setImagePreview] = useState<string | null>(null)
    const [isMounted, setIsMounted] = useState(false)
    const [selectedImage, setSelectedImage] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)
    const { settings } = useSystemSettings()

    const [confirmModal, setConfirmModal] = useState<{
        open: boolean;
        title: string;
        message: string;
        id: string | null;
    }>({
        open: false,
        title: '',
        message: '',
        id: null
    })
    const [showSettings, setShowSettings] = useState(false)

    const getSessionClips = useCallback(() => {
        if (typeof window === 'undefined') return null
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
        return stored ? JSON.parse(stored) : null
    }, [])

    const saveSessionClips = useCallback((data: any[]) => {
        if (typeof window === 'undefined') return
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
    }, [])

    const fetchClips = useCallback(async () => {
        if (settings.is_demo_mode) {
            let session = getSessionClips()
            if (!session) {
                session = MOCK_VAULT.clips
                saveSessionClips(session)
            }
            setClips(session)
            setLoading(false)
            return
        }
        if (clips.length === 0) setLoading(true)
        const { data, error } = await supabase
            .from('sys_clipboard')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(20)

        if (!error && data) {
            setClips(data)
        }
        setLoading(false)
    }, [settings.is_demo_mode, getSessionClips, saveSessionClips, clips.length])

    useEffect(() => {
        setIsMounted(true)
        fetchClips()
        // Poll every 30 seconds for new clips from other devices (only if not in demo mode)
        let interval: any
        if (!settings.is_demo_mode) {
            interval = setInterval(fetchClips, 30000)
        }
        return () => { if (interval) clearInterval(interval) }
    }, [settings.is_demo_mode, fetchClips])

    const handleAdd = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!newClip.trim() && !imageFile) return

        console.log('[Vault] Adding clip...', { hasContent: !!newClip.trim(), hasFile: !!imageFile })
        setAdding(true)

        if (settings.is_demo_mode) {
            const newClipItem: Clip = {
                id: 'd-clip-' + Date.now(),
                content: newClip.trim(),
                image_url: imagePreview || undefined,
                created_at: new Date().toISOString()
            }
            const session = getSessionClips() || []
            const updated = [newClipItem, ...session]
            saveSessionClips(updated)
            setClips(updated)
            setNewClip('')
            setImageFile(null)
            setImagePreview(null)
            setAdding(false)
            return
        }

        let imageUrl = null

        if (imageFile) {
            try {
                const fileExt = imageFile.name.split('.').pop()
                const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
                const filePath = `clipboard/${fileName}`

                console.log('[Vault] Uploading image...', filePath)
                const { error: uploadError } = await supabase.storage
                    .from('vault_assets')
                    .upload(filePath, imageFile)

                if (uploadError) {
                    console.error('[Vault] Upload error:', uploadError)
                } else {
                    const { data: { publicUrl } } = supabase.storage
                        .from('vault_assets')
                        .getPublicUrl(filePath)
                    imageUrl = publicUrl
                    console.log('[Vault] Upload success:', imageUrl)
                }
            } catch (err) {
                console.error('[Vault] Storage error:', err)
            }
        }

        const { error } = await supabase
            .from('sys_clipboard')
            .insert({
                content: newClip.trim(),
                image_url: imageUrl,
                profile: 'personal'
            })

        if (!error) {
            console.log('[Vault] Clip saved successfully')
            setNewClip('')
            setImageFile(null)
            setImagePreview(null)
            if (fileInputRef.current) fileInputRef.current.value = ''
            fetchClips()
        } else {
            console.error('[Vault] DB Insert error:', error)
            alert('Failed to save clip: ' + error.message)
        }
        setAdding(false)
    }

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        console.log('[Vault] File selected input change:', {
            name: file?.name,
            size: file?.size,
            type: file?.type
        })

        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                alert('Image is too large (max 5MB)')
                return
            }

            setImageFile(file)
            const reader = new FileReader()
            reader.onloadstart = () => console.log('[Vault] FileReader started')
            reader.onloadend = () => {
                if (reader.result) {
                    console.log('[Vault] Preview loaded, base64 length:', (reader.result as string).length)
                    setImagePreview(reader.result as string)
                } else {
                    console.warn('[Vault] FileReader produced empty result')
                }
            }
            reader.onerror = (err) => console.error('[Vault] FileReader error:', err)
            try {
                reader.readAsDataURL(file)
            } catch (err) {
                console.error('[Vault] readAsDataURL failed:', err)
            }
        }
    }

    const handleDelete = async (id: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionClips() || []
            const updated = session.filter((c: Clip) => c.id !== id)
            saveSessionClips(updated)
            setClips(updated)
            setConfirmModal(prev => ({ ...prev, open: false }))
            return
        }
        const { error } = await supabase
            .from('sys_clipboard')
            .delete()
            .eq('id', id)

        if (!error) {
            setClips(clips.filter(c => c.id !== id))
        }
        setConfirmModal(prev => ({ ...prev, open: false }))
    }

    const handleCopy = (id: string, content: string) => {
        navigator.clipboard.writeText(content)
        setCopiedId(id)
        setTimeout(() => setCopiedId(null), 2000)
    }

    const handleCancel = () => {
        setNewClip('')
    }

    const extractFirstUrl = (str: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/
        const match = str.match(urlRegex)
        // Clean up punctuation at the end of URL that might have been caught
        if (match) {
            return match[0].replace(/[.,!?;:)]+$/, '')
        }
        return null
    }

    const isBulletLine = (text: string) => {
        const lines = text.split('\n')
        const lastLine = lines[lines.length - 1]
        return lastLine.trim().startsWith('- ') || lastLine.trim().startsWith('* ')
    }

    if (!isMounted) return null

    return (
        <div className="space-y-4">
            {/* Input Area */}
            <div className="relative group">
                <textarea
                    value={newClip}
                    onChange={(e) => setNewClip(e.target.value)}
                    placeholder="Paste a link or message to share..."
                    suppressHydrationWarning
                    className="w-full h-32 p-4 pb-12 pr-14 bg-white border border-black/[0.08] rounded-2xl resize-none outline-none focus:border-black/20 focus:ring-4 focus:ring-black/[0.02] transition-all text-[14px] leading-relaxed placeholder:text-black/20"
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            handleAdd()
                        } else if (e.key === 'Enter' && !e.shiftKey) {
                            const textarea = e.currentTarget
                            const start = textarea.selectionStart
                            const text = textarea.value
                            const linesBefore = text.substring(0, start).split('\n')
                            const currentLine = linesBefore[linesBefore.length - 1]

                            if (currentLine.trim().startsWith('- ')) {
                                e.preventDefault()
                                if (currentLine.trim() === '- ') {
                                    // Empty bullet - clear it and exit mode
                                    const before = text.substring(0, start - currentLine.length)
                                    const after = text.substring(start)
                                    setNewClip(before + after)
                                } else {
                                    // Continune bullet
                                    const before = text.substring(0, start)
                                    const after = text.substring(start)
                                    setNewClip(before + '\n- ' + after)
                                    // Selection needs to be handled via timeout
                                    setTimeout(() => {
                                        textarea.selectionStart = textarea.selectionEnd = start + 3
                                    }, 0)
                                }
                            }
                        }
                    }}
                />
                <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                    <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleImageSelect}
                    />
                    <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className={cn(
                            "p-1.5 rounded-lg transition-all",
                            imageFile ? "text-emerald-500 bg-emerald-50" : "text-black/40 hover:text-black hover:bg-black/5"
                        )}
                        title="Add photo"
                    >
                        <ImageIcon className="w-4 h-4" />
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            const textarea = document.querySelector('textarea')
                            if (!textarea) return
                            // ... rest existing ...
                            const start = textarea.selectionStart
                            const end = textarea.selectionEnd
                            const text = textarea.value
                            const before = text.substring(0, start)
                            const after = text.substring(end)
                            const selected = text.substring(start, end)

                            // If multi-line selection, bullet each line
                            if (selected.includes('\n')) {
                                const bulleted = selected.split('\n').map(line => line.trim().startsWith('- ') ? line : `- ${line}`).join('\n')
                                setNewClip(before + bulleted + after)
                            } else {
                                // Just insert bullet at cursor or before selection
                                setNewClip(before + (selected.trim().startsWith('- ') ? selected : `- ${selected}`) + after)
                            }
                        }}
                        className={cn(
                            "p-1.5 rounded-lg transition-all",
                            isBulletLine(newClip) ? "text-blue-500 bg-blue-50" : "text-black/40 hover:text-black hover:bg-black/5"
                        )}
                        title="Add bullet points"
                    >
                        <List className="w-4 h-4" />
                    </button>
                    {newClip.trim() && (
                        <button
                            type="button"
                            onClick={handleCancel}
                            className="text-[11px] font-bold text-black/40 hover:text-red-500 px-2 py-1 underline underline-offset-2 transition-colors uppercase tracking-tight"
                        >
                            Cancel
                        </button>
                    )}
                </div>
                <button
                    onClick={() => handleAdd()}
                    type="button"
                    disabled={adding || (!newClip.trim() && !imageFile)}
                    className="absolute bottom-3 right-3 w-10 h-10 bg-black text-white rounded-xl shadow-lg shadow-black/10 flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-20 disabled:scale-100 transition-all z-10"
                >
                    <Plus className="w-5 h-5" />
                </button>
                {imagePreview && (
                    <div className="absolute top-2 right-2 z-20 animate-in zoom-in-95 duration-200">
                        <div className="group/preview relative w-14 h-14 rounded-xl overflow-hidden border-2 border-white shadow-xl ring-1 ring-black/5 bg-black/[0.02]">
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                            <button
                                onClick={() => {
                                    console.log('[Vault] Clearing image preview')
                                    setImageFile(null)
                                    setImagePreview(null)
                                }}
                                className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover/preview:opacity-100 transition-opacity"
                            >
                                <X className="w-4 h-4 text-white" />
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Confirmation Modal */}
            {confirmModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl border border-black/5 animate-in zoom-in-95 duration-200">
                        <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>
                        <h3 className="text-[18px] font-black text-black mb-2">{confirmModal.title}</h3>
                        <p className="text-[14px] text-black/50 leading-relaxed mb-6">{confirmModal.message}</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setConfirmModal(prev => ({ ...prev, open: false }))}
                                className="flex-1 px-4 py-3 rounded-2xl bg-black/[0.03] text-black font-bold text-[14px] hover:bg-black/[0.06] transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => confirmModal.id && handleDelete(confirmModal.id)}
                                className="flex-1 px-4 py-3 rounded-2xl bg-red-500 text-white font-bold text-[14px] hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* List Area */}
            <div className="space-y-3">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                        <div className="w-6 h-6 border-2 border-black/10 border-t-black/40 rounded-full animate-spin" />
                        <p className="text-[11px] font-medium text-black/40 uppercase tracking-widest">Accessing Vault...</p>
                    </div>
                ) : clips.length === 0 ? (
                    <div className="bg-black/[0.02] border border-dashed border-black/[0.06] rounded-2xl py-12 text-center text-black/30">
                        <p className="text-[13px] font-medium">Vault is currently empty</p>
                        <p className="text-[11px]">Start sharing links across your devices</p>
                    </div>
                ) : (
                    clips.map((clip) => (
                        <ClipItem
                            key={clip.id}
                            clip={clip}
                            copiedId={copiedId}
                            handleCopy={handleCopy}
                            setConfirmModal={setConfirmModal}
                            extractFirstUrl={extractFirstUrl}
                            isVaultPrivate={isVaultPrivate}
                            setSelectedImage={setSelectedImage}
                        />
                    ))
                )}
            </div>

            {/* Lightbox Modal */}
            <AnimatePresence>
                {selectedImage && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setSelectedImage(null)}
                        className="fixed inset-0 z-[100] bg-black/99 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 cursor-zoom-out"
                    >
                        <motion.button
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="absolute top-4 right-4 sm:top-8 sm:right-8 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors shadow-2xl"
                            onClick={() => setSelectedImage(null)}
                        >
                            <X className="w-6 h-6" />
                        </motion.button>

                        <motion.img
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            src={selectedImage}
                            alt="Full size"
                            className="max-w-full max-h-full object-contain rounded-2xl shadow-2xl p-4 sm:p-0"
                            onClick={(e) => e.stopPropagation()}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
function ClipItem({ clip, copiedId, handleCopy, setConfirmModal, extractFirstUrl, isVaultPrivate, setSelectedImage }: {
    clip: Clip,
    copiedId: string | null,
    handleCopy: (id: string, content: string) => void,
    setConfirmModal: React.Dispatch<React.SetStateAction<{
        open: boolean;
        title: string;
        message: string;
        id: string | null;
    }>>,
    extractFirstUrl: (str: string) => string | null,
    isVaultPrivate: boolean,
    setSelectedImage: (url: string | null) => void
}) {
    const [isExpanded, setIsExpanded] = useState(false)
    const [isTruncatable, setIsTruncatable] = useState(false)
    const contentRef = React.useRef<HTMLParagraphElement>(null)

    useEffect(() => {
        if (contentRef.current) {
            // Check if content overflows its container's 3-line limit (approx 3 * lineHeight)
            // A more reliable way is comparing scrollHeight to offsetHeight
            const element = contentRef.current
            setIsTruncatable(element.scrollHeight > element.offsetHeight)
        }
    }, [clip.content])

    return (
        <div className="bg-white border border-black/[0.06] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-colors overflow-hidden">
            <div className="flex-1 min-w-0 w-full">
                <div className="relative">
                    <div className={cn(
                        "text-[14px] leading-relaxed text-black/70 break-words",
                        !isExpanded && "line-clamp-6"
                    )}>
                        <div className={cn(isVaultPrivate && "privacy-blur", "flex flex-col sm:flex-row gap-4")}>
                            <div className="flex-1 min-w-0">
                                {clip.content.split('\n').map((line, i) => {
                                    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                                        return (
                                            <div key={i} className="flex gap-2 mb-1 pl-1">
                                                <span className="text-black/30 mt-1.5 w-1 h-1 rounded-full bg-black/40 shrink-0" />
                                                <span>{line.trim().substring(2)}</span>
                                            </div>
                                        )
                                    }
                                    const url = extractFirstUrl(line)
                                    if (url) {
                                        return (
                                            <p key={i} className="mb-1 text-blue-600 font-medium underline underline-offset-4 decoration-blue-200 break-all">
                                                {line}
                                            </p>
                                        )
                                    }
                                    return (
                                        <p key={i} className="mb-1">
                                            {line}
                                        </p>
                                    )
                                })}
                            </div>

                            {clip.image_url && (
                                <div
                                    onClick={() => setSelectedImage(clip.image_url!)}
                                    className="shrink-0 w-24 sm:w-28 aspect-video rounded-xl overflow-hidden border border-black/[0.08] bg-black/[0.02] cursor-zoom-in group/media relative hover:shadow-lg transition-all active:scale-95 self-start sm:self-center"
                                >
                                    <img
                                        src={clip.image_url}
                                        alt="Vault Media"
                                        className="w-full h-full object-cover transition-transform duration-500 group-hover/media:scale-110"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/10 flex items-center justify-center transition-all">
                                        <Maximize2 className="w-5 h-5 text-white opacity-0 group-hover/media:opacity-100 drop-shadow-md" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {isTruncatable && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="text-[11px] font-bold text-black/40 hover:text-black mt-2 transition-colors uppercase tracking-wider"
                        >
                            {isExpanded ? 'Show less' : 'Show more'}
                        </button>
                    )}
                </div>

                {!isVaultPrivate && extractFirstUrl(clip.content) && <LinkPreview url={extractFirstUrl(clip.content)!} />}

                <p className="text-[10px] text-black/30 mt-3 font-medium">
                    {new Date(clip.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •
                    {new Date(clip.created_at).toLocaleDateString([], { day: '2-digit', month: 'short' })}
                </p>
            </div>

            <div className="flex items-center gap-1 transition-all shrink-0 self-end sm:self-center">
                {!isVaultPrivate && extractFirstUrl(clip.content) && (
                    <a
                        href={extractFirstUrl(clip.content)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                )}
                {!isVaultPrivate && (
                    <button
                        onClick={() => handleCopy(clip.id, clip.content)}
                        className={cn(
                            "p-2 rounded-lg transition-all",
                            copiedId === clip.id ? "text-emerald-500 bg-emerald-50" : "text-black/40 hover:bg-black/5"
                        )}
                    >
                        {copiedId === clip.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    </button>
                )}
                <button
                    onClick={() => setConfirmModal({
                        open: true,
                        title: 'Delete Clip?',
                        message: 'Are you sure you want to remove this item from your vault? This cannot be undone.',
                        id: clip.id
                    })}
                    className="p-2 text-black/20 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
