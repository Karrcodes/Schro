'use client'

import React, { useState, useEffect } from 'react'
import { Globe, RefreshCw, Check, AlertCircle, Loader2, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import ConfirmationModal from '@/components/ConfirmationModal'

interface FramerSyncStatusProps {
    itemId: string
    itemType: 'project' | 'press' | 'draft' | 'content'
    framerCmsId?: string | null
    isStaged?: boolean
    collectionName: string
    onStatusChange?: (status: string) => void
    onStage?: (staged: boolean) => Promise<void>
    onBeforeSync?: () => Promise<void>
    className?: string
}

const COLLECTIONS = [
    'Architectural Design',
    'Technology',
    'Fashion',
    'Product Design',
    'Media',
    'Articles',
    'Press'
]

export function FramerSyncStatus({
    itemId,
    itemType,
    framerCmsId,
    isStaged,
    collectionName,
    onStatusChange,
    onStage,
    onBeforeSync,
    className
}: FramerSyncStatusProps) {
    const [status, setStatus] = useState<'idle' | 'pending' | 'processing' | 'done' | 'error'>('idle')
    const [errorMsg, setErrorMsg] = useState<string | null>(null)
    const [jobId, setJobId] = useState<string | null>(null)
    const [showUnstageConfirm, setShowUnstageConfirm] = useState(false)
    const [selectedCollection, setSelectedCollection] = useState(collectionName)

    useEffect(() => {
        setSelectedCollection(collectionName)
    }, [collectionName])

    // Polling for job status
    useEffect(() => {
        if (!jobId || (status !== 'pending' && status !== 'processing')) return

        const pollInterval = setInterval(async () => {
            try {
                const res = await fetch(`/api/studio/framer-jobs?job_id=${jobId}`)
                if (!res.ok) return
                const jobs = await res.json()
                const job = jobs.find((j: any) => j.id === jobId)

                if (job) {
                    setStatus(job.status)
                    if (job.status === 'done') {
                        clearInterval(pollInterval)
                        setJobId(null)
                        onStatusChange?.('done')
                    } else if (job.status === 'error') {
                        setErrorMsg(job.error_msg)
                        clearInterval(pollInterval)
                        setJobId(null)
                    }
                }
            } catch (err) {
                console.error('Job poll error:', err)
            }
        }, 2000)

        return () => clearInterval(pollInterval)
    }, [jobId, status, onStatusChange])

    const handleStageToggle = async () => {
        if (!onStage) return
        
        // If we are currently staged, show confirmation before unstaging
        if (isStaged && !showUnstageConfirm) {
            setShowUnstageConfirm(true)
            return
        }

        setStatus('processing')
        setErrorMsg(null)
        try {
            await onStage(!isStaged)
            setStatus('done')
            setShowUnstageConfirm(false)
            setTimeout(() => setStatus('idle'), 2000)
        } catch (err: any) {
            setStatus('error')
            setErrorMsg(err.message)
            setShowUnstageConfirm(false)
        }
    }

    // Polling for job status (keep for existing live items if needed, but primary flow is staging now)
    // ... existing poll logic ...


    return (
        <div className={cn("flex flex-col gap-2", className)}>
            <div className="flex flex-col items-center gap-3 py-2">
                <div className="flex items-center gap-2 text-black/30">
                    {framerCmsId ? (
                        <div className="flex items-center gap-2 text-emerald-500" title="Live on Web">
                            <Check className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Live</span>
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        </div>
                    ) : (
                        <div className="flex items-center gap-2" title="Not Live">
                            <Globe className="w-3.5 h-3.5" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Draft</span>
                            <div className="w-1.5 h-1.5 bg-black/10 rounded-full" />
                        </div>
                    )}
                    {(status === 'pending' || status === 'processing') && (
                        <div className="flex items-center gap-2 text-[9px] font-black text-indigo-500 animate-pulse uppercase tracking-widest ml-2">
                            <RefreshCw className="w-3 h-3 animate-spin" /> 
                            {status === 'pending' ? 'Queued' : 'Syncing'}
                        </div>
                    )}
                </div>

                <div className="w-full flex justify-center flex-col items-center gap-2">
                    {framerCmsId ? (
                        <div className="flex flex-col items-center gap-2">
                            <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest py-2 px-6 bg-emerald-50 rounded-xl border border-emerald-100 flex items-center gap-2 shadow-sm">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Live
                            </div>
                            <button 
                                onClick={async () => {
                                    setStatus('processing')
                                    try {
                                        const res = await fetch('/api/studio/framer-sync', {
                                            method: 'POST',
                                            headers: { 'Content-Type': 'application/json' },
                                            body: JSON.stringify({
                                                localId: itemId,
                                                type: itemType,
                                                itemId: framerCmsId,
                                                refresh: true
                                            })
                                        })
                                        if (res.ok) setStatus('done')
                                        else throw new Error("Refresh failed")
                                    } catch (e) {
                                        setStatus('error')
                                        setErrorMsg("Failed to refresh data from Framer")
                                    } finally {
                                        setTimeout(() => setStatus('idle'), 2000)
                                    }
                                }}
                                className="text-[9px] font-black text-black/20 hover:text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 transition-colors"
                            >
                                <RefreshCw className={cn("w-3 h-3", status === 'processing' && "animate-spin")} />
                                Refresh from Web
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleStageToggle}
                            disabled={status === 'processing'}
                            className={cn(
                                "flex items-center justify-center gap-2 px-8 py-2.5 transition-all rounded-xl text-[11px] font-black uppercase tracking-widest disabled:opacity-50 relative overflow-hidden group/btn",
                                isStaged 
                                    ? "bg-rose-50 border border-rose-100/50 text-rose-500 hover:bg-rose-600 hover:text-white hover:border-rose-600 hover:shadow-lg hover:shadow-rose-500/20 active:scale-95" 
                                    : "bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 bg-[length:200%_auto] hover:bg-[right_center] text-white shadow-lg shadow-indigo-500/20 hover:scale-[1.02] active:scale-98"
                            )}
                        >
                            {status === 'processing' ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isStaged ? (
                                <Trash2 className="w-3.5 h-3.5 transition-transform group-hover/btn:-rotate-12" />
                            ) : (
                                <Globe className="w-3.5 h-3.5 group-hover/btn:animate-spin-slow" />
                            )}
                            {isStaged ? 'Unstage' : 'Stage'}
                        </button>
                    )}
                </div>
            </div>

            {errorMsg && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-red-500 bg-red-50 p-2 rounded-xl border border-red-100 animate-in slide-in-from-top-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{errorMsg}</span>
                </div>
            )}
            
            {status === 'done' && (
                <div className="flex items-center gap-2 text-[10px] font-bold text-green-600 bg-green-50 p-2 rounded-xl border border-green-100 animate-in slide-in-from-top-1">
                    <Check className="w-3.5 h-3.5 shrink-0" />
                    <span>Success! Item has been updated.</span>
                </div>
            )}

            <ConfirmationModal 
                isOpen={showUnstageConfirm}
                onClose={() => setShowUnstageConfirm(false)}
                onConfirm={handleStageToggle}
                title="Remove from Staging?"
                message="This item will be removed from the staging hub. You can re-stage it at any time from this modal."
                confirmText="Remove"
                type="warning"
            />
        </div>
    )
}
