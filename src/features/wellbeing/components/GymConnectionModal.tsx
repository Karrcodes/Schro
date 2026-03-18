'use client'

import React, { useState } from 'react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { Dumbbell, X, Lock, MapPin, Loader2, CheckCircle2, AlertCircle, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { GymService } from '../services/gymService'

export function GymConnectionModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { connectGym, disconnectGym, gymStats, updateGymStats, requiresGymReauth } = useWellbeing()
    const [step, setStep] = useState<'credentials' | 'locations'>('credentials')
    const [email, setEmail] = useState('')
    const [pin, setPin] = useState('')
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
    const [error, setError] = useState('')

    // Location selection state
    const [gymList, setGymList] = useState<{ id: string; name: string; city?: string }[]>([])
    const [selectedIds, setSelectedIds] = useState<string[]>([])
    const [primaryId, setPrimaryId] = useState<string>('')
    const [tempAuth, setTempAuth] = useState<{ cookie: string; accessToken?: string, uuid?: string } | null>(null)
    const [locationSearch, setLocationSearch] = useState('')
    const [manualGymId, setManualGymId] = useState('')

    // Management state
    const [localNames, setLocalNames] = useState<Record<string, string>>({})

    // Initialize local names from context when opening the modal
    React.useEffect(() => {
        if (isOpen && gymStats.isIntegrated) {
            setLocalNames(gymStats.gymLocationNames || {})
        }
    }, [isOpen, gymStats.isIntegrated, gymStats.gymLocationNames])

    const handleCredentials = async (e: React.FormEvent) => {
        e.preventDefault()
        setStatus('loading')
        setError('')
        try {
            const data = await GymService.login(email, pin)
            const gyms = await GymService.getLocations(data.cookie || '', data.accessToken, data.uuid)
            const homeId = data.homeGymId || ''
            const gymListResult = gyms.length
                ? gyms
                : homeId ? [{ id: homeId, name: 'Your Home Gym', city: '' }] : []
            setGymList(gymListResult)
            setSelectedIds(homeId ? [homeId] : [])
            setPrimaryId(homeId)
            setTempAuth({ cookie: data.cookie, accessToken: data.accessToken, uuid: data.uuid, ...data })
            setStatus('idle')
            setStep('locations')
        } catch (err: any) {
            setStatus('error')
            setError(err.message || 'Authentication failed. Please check your credentials.')
        }
    }

    const handleConnect = async () => {
        if (!selectedIds.length || !tempAuth) return
        setStatus('loading')
        try {
            await connectGym(email, pin, selectedIds[0], selectedIds)
            setStatus('success')
            setTimeout(() => { onClose(); reset() }, 1500)
        } catch (err: any) {
            setStatus('error')
            setError(err.message || 'Connection failed.')
        }
    }

    const handleDisconnect = async () => {
        await disconnectGym()
        reset()
        onClose()
    }

    const reset = () => {
        setStep('credentials')
        setEmail('')
        setPin('')
        setGymList([])
        setSelectedIds([])
        setPrimaryId('')
        setTempAuth(null)
        setLocationSearch('')
        setManualGymId('')
        setStatus('idle')
        setError('')
    }

    const toggleLocation = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        )
    }

    const handleNameChange = (id: string, newName: string) => {
        setLocalNames(prev => ({ ...prev, [id]: newName }))
    }

    const handleSave = () => {
        setStatus('loading')
        // Give a slight delay to show loading state for UX
        setTimeout(() => {
            updateGymStats({ gymLocationNames: localNames })
            setStatus('success')
            setTimeout(() => {
                setStatus('idle')
                onClose()
            }, 1000)
        }, 500)
    }

    const filteredGyms = gymList.filter(g =>
        g.name.toLowerCase().includes(locationSearch.toLowerCase()) ||
        (g.city || '').toLowerCase().includes(locationSearch.toLowerCase())
    )

    // Gets a short display name from a full gym name for fallback
    const shortGymName = (name: string) => name.replace(/the gym group[\s\-–]*/i, '').trim() || name

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => { onClose(); reset() }}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-white rounded-[40px] p-10 z-[1000] shadow-2xl border border-black/5 max-h-[90vh] overflow-y-auto no-scrollbar"
                    >
                        <button onClick={() => { onClose(); reset() }} className="absolute top-8 right-8 p-2 hover:bg-black/5 rounded-full transition-colors z-10">
                            <X className="w-5 h-5 text-black/20" />
                        </button>

                        <div className="space-y-8">
                            <div className="space-y-2">
                                <div className="w-12 h-12 rounded-2xl bg-[#002f5e]/10 flex items-center justify-center mb-4">
                                    <Dumbbell className="w-6 h-6 text-[#002f5e]" />
                                </div>
                                <div className="text-[10px] font-black uppercase tracking-widest text-[#e31837] mb-1">The Gym Group API</div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter">
                                    {(gymStats.isIntegrated && !requiresGymReauth) ? 'Manage Gyms' : 'Link Gym Account'}
                                </h2>
                                <p className="text-[13px] font-medium text-black/40 leading-relaxed uppercase tracking-tight">
                                    {gymStats.isIntegrated 
                                        ? 'Configure your synced locations.' 
                                        : step === 'credentials'
                                            ? 'Synchronize your gym activity across all your accessible locations.'
                                            : 'Select the gyms you have access to.'}
                                </p>
                            </div>

                            {(gymStats.isIntegrated && !requiresGymReauth) ? (
                                /* Management View */
                                <div className="space-y-6">
                                    <div className="space-y-4">
                                        {(gymStats.gymLocationIds || [gymStats.gymLocationId || '']).map((id, index) => {
                                            if (!id) return null;
                                            // Fallback default label
                                            const visit = gymStats.visitHistory?.find(v => v.locationName)
                                            const defaultName = (gymStats.gymLocationIds?.length === 1 && visit) 
                                                ? shortGymName(visit.locationName) 
                                                : `Gym ${index + 1}`;
                                            
                                            return (
                                                <div key={id} className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-50/50">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center justify-between">
                                                            <label className="text-[10px] font-black uppercase tracking-widest text-emerald-800">Tracking Location</label>
                                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                                        </div>
                                                        <input 
                                                            type="text"
                                                            value={localNames[id] !== undefined ? localNames[id] : defaultName}
                                                            onChange={(e) => handleNameChange(id, e.target.value)}
                                                            placeholder={defaultName}
                                                            className="w-full bg-white border border-black/5 rounded-xl px-4 py-3 text-[13px] font-bold text-black focus:outline-none focus:border-emerald-500 uppercase tracking-tight"
                                                        />
                                                        <div className="text-[9px] font-mono text-black/30 mt-1">ID: {id}</div>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    <button
                                        onClick={handleSave}
                                        disabled={status === 'loading'}
                                        className={cn(
                                            "w-full py-5 rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3 mt-6",
                                            status === 'loading' ? "bg-emerald-500/50 text-white cursor-wait" : "bg-emerald-500 text-white hover:bg-emerald-600 shadow-xl shadow-emerald-500/20"
                                        )}
                                    >
                                        {status === 'loading' ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : 'Save Changes'}
                                    </button>

                                    <div className="pt-6 mt-6 border-t border-black/5">
                                        <button
                                            onClick={handleDisconnect}
                                            className="w-full py-4 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-100"
                                        >
                                            Unlink Account
                                        </button>
                                        <p className="text-[10px] font-medium text-black/30 text-center uppercase tracking-widest leading-relaxed mt-4">
                                            Disconnecting will explicitly remove your credentials and clear sync data. To add or remove tracked locations, you must unlink and reconnect.
                                        </p>
                                    </div>
                                </div>
                            ) : status === 'success' ? (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex flex-col items-center justify-center py-10 space-y-4"
                                >
                                    <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
                                        <CheckCircle2 className="w-8 h-8 text-white" />
                                    </div>
                                    <p className="text-[12px] font-black uppercase tracking-widest text-emerald-600">Protocol Synchronized</p>
                                </motion.div>
                            ) : step === 'credentials' ? (
                                <form onSubmit={handleCredentials} className="space-y-6">
                                    <div className="space-y-4">
                                        <input
                                            type="email"
                                            required
                                            placeholder="EMAIL ADDRESS"
                                            value={email}
                                            onChange={e => setEmail(e.target.value)}
                                            className="w-full bg-black/[0.03] border border-black/5 rounded-2xl px-6 py-4 text-[13px] font-bold placeholder:text-black/20 focus:outline-none focus:ring-1 focus:ring-black uppercase tracking-wider"
                                        />
                                        <div className="relative">
                                            <input
                                                type="password"
                                                required
                                                placeholder="LOGIN PIN"
                                                value={pin}
                                                onChange={e => setPin(e.target.value)}
                                                className="w-full bg-black/[0.03] border border-black/5 rounded-2xl px-6 py-4 text-[13px] font-bold placeholder:text-black/20 focus:outline-none focus:ring-1 focus:ring-black uppercase tracking-wider"
                                            />
                                            <Lock className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-black/10" />
                                        </div>
                                    </div>

                                    {status === 'error' && (
                                        <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-4 rounded-2xl border border-rose-100">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <p className="text-[11px] font-black uppercase tracking-tight">{error}</p>
                                        </div>
                                    )}

                                    <button
                                        type="submit"
                                        disabled={status === 'loading'}
                                        className={cn(
                                            "w-full py-5 rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3",
                                            status === 'loading' ? "bg-black/20 text-black/40 cursor-wait" : "bg-black text-white hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-black/10"
                                        )}
                                    >
                                        {status === 'loading' ? <><Loader2 className="w-4 h-4 animate-spin" /> Authenticating...</> : 'Continue'}
                                    </button>
                                </form>
                            ) : (
                                <div className="space-y-4">
                                    {/* Search */}
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                        <input
                                            autoFocus
                                            placeholder="Search gyms..."
                                            value={locationSearch}
                                            onChange={e => setLocationSearch(e.target.value)}
                                            className="w-full bg-black/[0.03] border border-black/5 rounded-2xl pl-10 pr-4 py-3 text-[13px] font-bold placeholder:text-black/20 focus:outline-none focus:ring-1 focus:ring-black"
                                        />
                                    </div>

                                    {/* Gym list */}
                                    <div className="max-h-56 overflow-y-auto space-y-2 pr-1 no-scrollbar">
                                        {filteredGyms.length === 0 ? (
                                            <p className="text-center text-[11px] font-black text-black/20 uppercase tracking-widest py-6">No gyms found</p>
                                        ) : filteredGyms.map(gym => (
                                            <button
                                                key={gym.id}
                                                type="button"
                                                onClick={() => toggleLocation(gym.id)}
                                                className={cn(
                                                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left",
                                                    selectedIds.includes(gym.id)
                                                        ? "bg-emerald-50 border-emerald-300 text-emerald-800"
                                                        : "bg-black/[0.02] border-black/5 hover:bg-black/[0.04]"
                                                )}
                                            >
                                                <div className={cn(
                                                    "w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                                                    selectedIds.includes(gym.id) ? "bg-emerald-500 border-emerald-500" : "border-black/10"
                                                )}>
                                                    {selectedIds.includes(gym.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-[12px] font-black uppercase tracking-tight truncate">{gym.name}</div>
                                                    {gym.city && <div className="text-[10px] font-bold text-black/30 uppercase tracking-widest">{gym.city}</div>}
                                                </div>
                                                {gym.id === primaryId && (
                                                    <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full shrink-0">Home</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>

                                    {/* Manual ID Input */}
                                    <div className="pt-2 pb-2">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-black/30 mb-2 pl-1">Can&apos;t find your gym?</div>
                                        <div className="flex gap-2">
                                            <input
                                                placeholder="Enter Netpulse Gym ID"
                                                value={manualGymId}
                                                onChange={e => setManualGymId(e.target.value)}
                                                className="flex-1 bg-black/[0.03] border border-black/5 rounded-2xl px-4 py-3 text-[12px] font-bold placeholder:text-black/20 focus:outline-none focus:ring-1 focus:ring-black font-mono tracking-tight"
                                            />
                                            <button
                                                type="button"
                                                disabled={!manualGymId.trim()}
                                                onClick={() => {
                                                    const id = manualGymId.trim()
                                                    if (id && !gymList.find(g => g.id === id)) {
                                                        setGymList(prev => [...prev, { id, name: `Custom Gym (${id.substring(0, 8)})` }])
                                                        setSelectedIds(prev => [...prev, id])
                                                        setManualGymId('')
                                                    }
                                                }}
                                                className="px-4 py-3 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-30 transition-all hover:bg-black/80"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>

                                    <p className="text-[10px] font-bold text-black/30 uppercase tracking-widest text-center">
                                        {selectedIds.length} location{selectedIds.length !== 1 ? 's' : ''} selected
                                    </p>

                                    {status === 'error' && (
                                        <div className="flex items-center gap-2 text-rose-500 bg-rose-50 p-4 rounded-2xl border border-rose-100">
                                            <AlertCircle className="w-4 h-4 shrink-0" />
                                            <p className="text-[11px] font-black uppercase tracking-tight">{error}</p>
                                        </div>
                                    )}

                                    <button
                                        onClick={handleConnect}
                                        disabled={!selectedIds.length || status === 'loading'}
                                        className={cn(
                                            "w-full py-5 rounded-2xl text-[12px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center gap-3",
                                            !selectedIds.length ? "bg-black/10 text-black/30 cursor-not-allowed"
                                                : status === 'loading' ? "bg-black/20 text-black/40 cursor-wait"
                                                    : "bg-black text-white hover:scale-[1.01] active:scale-[0.99] shadow-xl shadow-black/10"
                                        )}
                                    >
                                        {status === 'loading' ? <><Loader2 className="w-4 h-4 animate-spin" /> Connecting...</> : 'Establish Connection'}
                                    </button>
                                </div>
                            )}

                            {!gymStats.isIntegrated && (
                                <p className="text-[10px] font-medium text-black/20 text-center uppercase tracking-widest leading-relaxed">
                                    Credentials are used only to establish a secure bridge between Schrö and The Gym Group. We do not store your plain-text PIN.
                                </p>
                            )}
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

