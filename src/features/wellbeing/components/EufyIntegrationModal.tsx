'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Scale, Lock, Mail, RefreshCw, CheckCircle2, AlertCircle, LogOut } from 'lucide-react'
import { useWellbeing } from '../contexts/WellbeingContext'

export function EufyIntegrationModal() {
    const { isEufyModalOpen, setIsEufyModalOpen, eufyStats, connectEufy, syncEufyData, disconnectEufy } = useWellbeing()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false)

    const handleConnect = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)
        try {
            await connectEufy(email, password)
            setEmail('')
            setPassword('')
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed')
        } finally {
            setIsLoading(false)
        }
    }

    const handleSync = async () => {
        setIsLoading(true)
        try {
            await syncEufyData()
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }

    if (!isEufyModalOpen) return null

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/80 backdrop-blur-md z-[1300] flex items-center justify-center p-6"
                onClick={() => !isLoading && setIsEufyModalOpen(false)}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0, y: 20 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    exit={{ scale: 0.9, opacity: 0, y: 20 }}
                    className="bg-white rounded-[40px] p-8 w-full max-w-md shadow-2xl relative overflow-hidden"
                    onClick={e => e.stopPropagation()}
                >
                    {/* Decorative Flare */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full -mr-16 -mt-16" />
                    
                    <button 
                        onClick={() => setIsEufyModalOpen(false)}
                        className="absolute top-6 right-6 p-2 bg-black/5 rounded-full hover:bg-black/10 transition-all z-10"
                    >
                        <X className="w-5 h-5 text-black/40" />
                    </button>

                    <div className="space-y-6 relative z-10">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-black/20">
                                <Scale className="w-8 h-8 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black uppercase tracking-tight text-black">Eufy Smart Scale</h3>
                                <p className="text-[10px] font-black text-black/20 uppercase tracking-widest leading-none">Body Metric Synchronization</p>
                            </div>
                        </div>

                        {!eufyStats.isIntegrated ? (
                            <form onSubmit={handleConnect} className="space-y-4">
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-black/40 uppercase tracking-widest pl-4">Account Email</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                        <input 
                                            type="email"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            placeholder="e.g. user@example.com"
                                            className="w-full pl-12 pr-6 py-4 bg-black/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-black transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[9px] font-black text-black/40 uppercase tracking-widest pl-4">Cloud Password</label>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                        <input 
                                            type="password"
                                            value={password}
                                            onChange={e => setPassword(e.target.value)}
                                            placeholder="••••••••"
                                            className="w-full pl-12 pr-6 py-4 bg-black/5 border-none rounded-2xl text-sm font-bold focus:ring-2 focus:ring-black transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                {error && (
                                    <motion.div 
                                        initial={{ opacity: 0, y: -10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="p-4 bg-rose-500/10 rounded-2xl flex items-center gap-3"
                                    >
                                        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0" />
                                        <p className="text-xs font-black text-rose-600 uppercase tracking-tight">{error}</p>
                                    </motion.div>
                                )}

                                <button 
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-5 bg-black text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-black/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale flex items-center justify-center gap-3"
                                >
                                    {isLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Establish Cloud Link'}
                                </button>
                                
                                <p className="text-[9px] font-medium text-black/30 text-center px-6 leading-relaxed uppercase tracking-tight">
                                    Your credentials are used only for authentication with EufyLife servers and are stored locally.
                                </p>
                            </form>
                        ) : (
                            <div className="space-y-6">
                                <div className="p-6 bg-emerald-500/5 rounded-[32px] border border-emerald-500/10 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center">
                                                <CheckCircle2 className="w-6 h-6 text-white" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-black/40 uppercase tracking-widest leading-none mb-1">Status</p>
                                                <p className="text-sm font-bold text-black uppercase tracking-tight">Cloud Sync Active</p>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 pt-2">
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-black/20 uppercase tracking-[0.2em]">Account</p>
                                            <p className="text-[11px] font-bold text-black truncate">{eufyStats.email}</p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-[8px] font-black text-black/20 uppercase tracking-[0.2em]">Last Sync</p>
                                            <p className="text-[11px] font-bold text-black">
                                                {eufyStats.lastSyncTime ? new Date(eufyStats.lastSyncTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Never'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <button 
                                        onClick={handleSync}
                                        disabled={isLoading}
                                        className="w-full py-5 bg-black text-white rounded-[24px] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl shadow-black/20 flex items-center justify-center gap-3"
                                    >
                                        <RefreshCw className={cn("w-5 h-5", isLoading && "animate-spin")} />
                                        Manual Data Pull
                                    </button>

                                    {showDisconnectConfirm ? (
                                        <div className="space-y-3">
                                            <p className="text-[10px] font-black text-rose-500 text-center uppercase tracking-widest pt-2">Terminate this connection?</p>
                                            <div className="grid grid-cols-2 gap-3">
                                                <button 
                                                    onClick={() => setShowDisconnectConfirm(false)}
                                                    className="py-4 bg-black/5 text-black rounded-2xl font-black uppercase tracking-widest text-[9px]"
                                                >
                                                    Cancel
                                                </button>
                                                <button 
                                                    onClick={() => {
                                                        disconnectEufy()
                                                        setIsEufyModalOpen(false)
                                                    }}
                                                    className="py-4 bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-rose-500/20"
                                                >
                                                    Disconnect
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <button 
                                            onClick={() => setShowDisconnectConfirm(true)}
                                            className="w-full py-4 text-black/40 hover:text-rose-500 transition-colors font-black uppercase tracking-widest text-[9px] flex items-center justify-center gap-2"
                                        >
                                            <LogOut className="w-4 h-4" /> Disconnect Eufy
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
