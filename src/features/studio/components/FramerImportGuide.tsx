'use client'

import React from 'react'
import { X, ArrowRight, Check, Loader2, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { FramerSyncService } from '../services/FramerSyncService'

interface Props {
    isOpen: boolean
    onClose: () => void
    onConfirm: (item: any) => Promise<void>
    item: any
}

export default function FramerImportGuide({ isOpen, onClose, onConfirm, item }: Props) {
    const [isSyncing, setIsSyncing] = React.useState(false)
    
    if (!isOpen || !item) return null

    const mapping = FramerSyncService.getMappingMetadata(item)
    const type = item._type || 'item'
    const typeLabel = type.charAt(0).toUpperCase() + type.slice(1)

    const handleConfirm = async () => {
        setIsSyncing(true)
        try {
            await onConfirm(item)
            onClose()
        } catch (error) {
            console.error('Import failed:', error)
        } finally {
            setIsSyncing(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
            
            <div className="relative bg-white rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="px-8 pt-8 pb-6 flex items-center justify-between border-b border-black/[0.05]">
                    <div>
                        <h2 className="text-2xl font-black text-black tracking-tight">Guided Import</h2>
                        <p className="text-[13px] text-black/40 font-bold uppercase tracking-widest mt-1">
                            Reviewing {typeLabel} Mapping
                        </p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto">
                    <div className="bg-blue-50/50 border border-blue-100/50 rounded-2xl p-4 flex gap-3">
                        <Info className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                        <p className="text-[13px] text-blue-900/70 leading-relaxed font-medium">
                            Schrödinger has identified this item in your Framer CMS. Review how the fields will be mapped below before adding it to your Studio.
                        </p>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-3 px-4 py-2 bg-black/[0.02] rounded-lg">
                            <span className="text-[10px] font-black text-black/30 uppercase tracking-widest">Framer CMS Field</span>
                            <span className="text-[10px] font-black text-black/30 uppercase tracking-widest text-center">Value</span>
                            <span className="text-[10px] font-black text-black/30 uppercase tracking-widest text-right">Schrödinger Field</span>
                        </div>
                        
                        <div className="space-y-2">
                            {mapping.map((field, idx) => (
                                <div key={idx} className="grid grid-cols-3 items-center px-4 py-3 bg-white border border-black/[0.05] rounded-xl hover:border-black/10 transition-all">
                                    <div className="flex flex-col">
                                        <span className="text-[11px] font-black text-black/40 uppercase tracking-tighter">Source</span>
                                        <span className="text-[13px] font-bold text-black truncate">{field.framerField}</span>
                                    </div>
                                    
                                    <div className="flex justify-center">
                                        <div className="px-3 py-1 bg-black/[0.03] rounded-full flex items-center gap-2 max-w-[140px]">
                                            <span className="text-[11px] font-bold text-black/60 truncate italic">
                                                {typeof field.value === 'string' && field.value.startsWith('http') ? 'Media Link' : field.value}
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-black/20" />
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end">
                                        <span className="text-[11px] font-black text-black/40 uppercase tracking-tighter">Schrödinger</span>
                                        <span className="text-[13px] font-bold text-emerald-600">{field.label}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-8 bg-black/[0.02] border-t border-black/[0.05] flex items-center justify-between">
                    <p className="text-[11px] text-black/30 font-bold uppercase tracking-wider">
                        Destination: Studio &gt; {typeLabel}s
                    </p>
                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onClose}
                            className="px-6 py-3 text-[13px] font-black uppercase tracking-widest text-black/40 hover:text-black transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleConfirm}
                            disabled={isSyncing}
                            className={cn(
                                "px-8 py-3 bg-black text-white rounded-2xl text-[13px] font-black uppercase tracking-widest flex items-center gap-2 hover:scale-105 transition-all shadow-xl shadow-black/10",
                                isSyncing && "opacity-50 cursor-not-allowed scale-100"
                            )}
                        >
                            {isSyncing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Importing...
                                </>
                            ) : (
                                <>
                                    <Check className="w-4 h-4" />
                                    Confirm & Import
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
