'use client'

import * as React from 'react'
import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
    X, Library, Search, Trash2, ShoppingBag, 
    Calendar, Store, Tag, ChevronRight, AlertCircle,
    ShoppingBasket, RefreshCw
} from 'lucide-react'
import { GroceryLibraryItem } from '../types/tasks.types'
import { cn } from '@/lib/utils'
import { useGroceryLibrary } from '../hooks/useGroceryLibrary'

interface GroceryLibraryModalProps {
    isOpen: boolean
    onClose: () => void
}

export function GroceryLibraryModal({ isOpen, onClose }: GroceryLibraryModalProps) {
    const { library, loading, deleteFromLibrary, clearLibrary } = useGroceryLibrary()
    const [searchQuery, setSearchQuery] = useState('')
    const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
    const [confirmClear, setConfirmClear] = useState(false)

    const filteredLibrary = useMemo(() => {
        if (!searchQuery) return library
        const lower = searchQuery.toLowerCase()
        return library.filter(item => 
            item.name.toLowerCase().includes(lower) || 
            item.store.toLowerCase().includes(lower)
        )
    }, [library, searchQuery])

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-black/40 backdrop-blur-md"
                onClick={onClose}
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-2xl bg-white/90 backdrop-blur-2xl rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.15)] overflow-hidden flex flex-col max-h-[90vh] border border-white/50"
            >
                {/* Header Branding */}
                <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-400 via-teal-500 to-emerald-600" />

                <div className="px-8 pt-8 pb-6 flex items-center justify-between border-b border-black/[0.03]">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-white shadow-xl shadow-emerald-500/20">
                            <Library className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-[900] text-neutral-900 tracking-tight leading-tight">Grocery Intelligence</h2>
                            <p className="text-[12px] text-emerald-600 font-bold uppercase tracking-[0.2em] mt-0.5">Aggregated Shopping Library</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-12 h-12 rounded-2xl bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-all active:scale-90"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="px-8 py-4 bg-black/[0.01] border-b border-black/[0.03]">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400 group-focus-within:text-emerald-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search library by item or store..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white border border-neutral-200 rounded-[1.25rem] pl-12 pr-6 py-4 font-bold text-[15px] outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all placeholder:text-neutral-300 shadow-sm"
                        />
                    </div>
                </div>

                {/* List Container */}
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-4 custom-scrollbar bg-white/50">
                    {loading ? (
                        <div className="py-20 flex flex-col items-center gap-4">
                            <div className="relative w-12 h-12">
                                <div className="absolute inset-0 border-4 border-emerald-50 rounded-full" />
                                <div className="absolute inset-0 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] text-emerald-400">Compiling Inventory...</span>
                        </div>
                    ) : filteredLibrary.length === 0 ? (
                        <div className="py-20 text-center space-y-4 bg-neutral-50/50 rounded-[2.5rem] border-2 border-dashed border-neutral-100">
                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm border border-neutral-100">
                                <ShoppingBasket className="w-10 h-10 text-neutral-200" />
                            </div>
                            <div>
                                <p className="text-[15px] font-[900] text-neutral-400 tracking-tight">Library Empty</p>
                                <p className="text-[11px] text-neutral-300 font-bold uppercase tracking-widest mt-1">Scan a receipt to begin data harvest</p>
                            </div>
                        </div>
                    ) : (
                        <div className="grid gap-3 pb-8">
                            <AnimatePresence>
                                {filteredLibrary.map((item) => (
                                    <motion.div
                                        key={item.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95 }}
                                        className="group bg-white border border-neutral-100 hover:border-emerald-200 rounded-2xl p-4 flex items-center justify-between transition-all hover:shadow-md hover:scale-[1.01]"
                                    >
                                        <div className="flex items-center gap-4 min-w-0">
                                            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                                                <ShoppingBag className="w-6 h-6" />
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-[900] text-[15px] text-neutral-900 leading-tight truncate">{item.name}</h4>
                                                <div className="flex items-center gap-3 mt-1.5">
                                                    <span className="flex items-center gap-1 text-[11px] font-black text-emerald-600 uppercase tracking-tighter">
                                                        <Tag className="w-3 h-3" /> £{item.price.toFixed(2)}
                                                    </span>
                                                    <span className="flex items-center gap-1 text-[11px] font-bold text-neutral-400 uppercase tracking-tighter bg-neutral-50 px-2 py-0.5 rounded-md border border-neutral-100">
                                                        <Store className="w-3 h-3" /> {item.store}
                                                    </span>
                                                    {item.last_bought_at && (
                                                        <span className="flex items-center gap-1 text-[10px] font-bold text-neutral-300 uppercase tracking-tighter hidden sm:flex">
                                                            <Calendar className="w-3 h-3" /> {new Date(item.last_bought_at).toLocaleDateString()}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {confirmDeleteId === item.id ? (
                                                <div className="flex items-center gap-1 animate-in fade-in zoom-in-95 duration-200">
                                                    <button
                                                        onClick={() => setConfirmDeleteId(null)}
                                                        className="px-3 py-1.5 rounded-lg bg-neutral-100 text-[9px] font-black text-neutral-500 hover:bg-neutral-200"
                                                    >
                                                        CANCEL
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            deleteFromLibrary(item.id)
                                                            setConfirmDeleteId(null)
                                                        }}
                                                        className="px-3 py-1.5 rounded-lg bg-rose-500 text-white text-[9px] font-black hover:bg-rose-600"
                                                    >
                                                        DELETE
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => setConfirmDeleteId(item.id)}
                                                    className="w-10 h-10 rounded-xl bg-neutral-50 flex items-center justify-center text-neutral-300 hover:text-rose-500 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                        </div>
                    )}
                </div>

                {/* Footer Status */}
                <div className="px-8 py-5 bg-neutral-50 border-t border-black/[0.03] flex items-center justify-between">
                    <p className="text-[10px] font-black text-neutral-300 uppercase tracking-[0.4em]">Inventory Core v1.0</p>
                    <div className="flex items-center gap-3">
                        {library.length > 0 && (
                            confirmClear ? (
                                <div className="flex items-center gap-1">
                                    <button 
                                        onClick={() => setConfirmClear(false)}
                                        className="text-[9px] font-black text-neutral-400 hover:text-neutral-600 uppercase tracking-widest px-2 py-1"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={async () => {
                                            await clearLibrary()
                                            setConfirmClear(false)
                                        }}
                                        className="text-[9px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-widest bg-rose-50 px-3 py-1 rounded-md border border-rose-100"
                                    >
                                        Confirm Clear
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => setConfirmClear(true)}
                                    className="text-[9px] font-black text-neutral-400 hover:text-rose-500 uppercase tracking-[0.2em] transition-colors"
                                >
                                    Clear Library
                                </button>
                            )
                        )}
                        <span className="text-[10px] font-black text-emerald-600/50 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100/50 uppercase tracking-widest">
                            {library.length} Objects Indexed
                        </span>
                    </div>
                </div>
            </motion.div>
        </div>
    )
}
