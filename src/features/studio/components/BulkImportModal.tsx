'use client'

import React from 'react'
import { Orbit, X, Loader2, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface BulkImportModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => Promise<void>
    count: number
    isSyncing: boolean
}

export default function BulkImportModal({
    isOpen,
    onClose,
    onConfirm,
    count,
    isSyncing
}: BulkImportModalProps) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={!isSyncing ? onClose : undefined}
            />
            
            <div className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                {/* Header/Banner */}
                <div className="h-32 bg-gradient-to-br from-blue-600 via-indigo-600 to-blue-700 relative flex items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                        <Orbit className="w-64 h-64 absolute -top-12 -right-12 rotate-12" />
                    </div>
                    <div className="relative z-10 w-16 h-16 rounded-3xl bg-white/20 backdrop-blur-md border border-white/20 flex items-center justify-center shadow-xl">
                        <Orbit className={cn("w-8 h-8 text-white", isSyncing && "animate-spin-slow")} />
                    </div>
                </div>

                <div className="p-8 pb-10 text-center">
                    <h3 className="text-2xl font-black text-black mb-2 uppercase tracking-tight">
                        Mass Data Sync
                    </h3>
                    <p className="text-[15px] font-medium text-black/40 leading-relaxed mb-8">
                        You're about to import <span className="text-blue-600 font-bold">{count} discovered items</span> from your Framer CMS into your local Studio. This will create local records for Projects, Press, and Media entries.
                    </p>

                    <div className="flex flex-col gap-3">
                        <button
                            onClick={onConfirm}
                            disabled={isSyncing}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-[24px] text-[13px] font-black uppercase tracking-widest transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3 disabled:opacity-50 group"
                        >
                            {isSyncing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Synchronizing...
                                </>
                            ) : (
                                <>
                                    <Orbit className="w-4 h-4 transition-transform group-hover:rotate-45" />
                                    Confirm Mass Import
                                </>
                            )}
                        </button>
                        
                        <button
                            onClick={onClose}
                            disabled={isSyncing}
                            className="w-full py-4 bg-black/5 hover:bg-black/10 text-black/40 hover:text-black rounded-[24px] text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-30"
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                {/* Status Bar */}
                {isSyncing && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-100 overflow-hidden">
                        <div className="h-full bg-blue-600 animate-shimmer" style={{ width: '40%' }} />
                    </div>
                )}
            </div>
        </div>
    )
}
