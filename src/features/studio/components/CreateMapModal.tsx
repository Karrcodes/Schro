'use client'

import React, { useState } from 'react'
import { Plus, X, Network, Type, Rocket } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CreateMapModalProps {
    isOpen: boolean
    onClose: () => void
    onCreate: (name: string) => Promise<void>
}

export default function CreateMapModal({ isOpen, onClose, onCreate }: CreateMapModalProps) {
    const [name, setName] = useState('')
    const [loading, setLoading] = useState(false)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim() || loading) return

        try {
            setLoading(true)
            await onCreate(name.trim())
            setName('')
            onClose()
        } catch (err) {
            console.error('Failed to create map:', err)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity" 
                onClick={onClose} 
            />
            
            <div className="relative w-full max-w-md bg-white rounded-[32px] shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center">
                            <Network className="w-5 h-5 text-indigo-600" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-black leading-tight">New Mindmap</h2>
                            <p className="text-[12px] font-medium text-black/40">Create a new dimension for your ideas.</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose} 
                        className="p-2 rounded-full hover:bg-black/5 text-black/20 hover:text-black/60 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="relative">
                        <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                        <input
                            autoFocus
                            required
                            type="text"
                            placeholder="Mindmap Name (e.g. Brainstorming, Strategy...)"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full pl-11 pr-4 py-4 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[15px] font-bold focus:outline-none focus:border-indigo-200 transition-all"
                        />
                    </div>

                    <button
                        disabled={loading || !name.trim()}
                        type="submit"
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-[14px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                Create Mindmap
                                <Rocket className="w-4 h-4" />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    )
}
