'use client'

import React, { useState, useEffect } from 'react'
import { FramerSyncService, type FramerSite, type FramerCollection } from '../services/FramerSyncService'
import { Globe, Settings, Check, Loader2, AlertCircle, X, ChevronRight, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'

interface FramerSyncSettingsProps {
    onClose: () => void
}

export default function FramerSyncSettings({ onClose }: FramerSyncSettingsProps) {
    const [isConnected, setIsConnected] = useState<boolean>(false)
    const [apiKey, setApiKey] = useState<string>('')
    const [manualSiteId, setManualSiteId] = useState<string>('')
    const [sites, setSites] = useState<FramerSite[]>([])
    const [collections, setCollections] = useState<FramerCollection[]>([])
    const [selectedSite, setSelectedSite] = useState<string>('')
    const [selectedCollection, setSelectedCollection] = useState<string>('')
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Hashnode state
    const [hnToken, setHnToken] = useState('')
    const [hnPubId, setHnPubId] = useState('')
    const [hnSaving, setHnSaving] = useState(false)
    const [hnSaved, setHnSaved] = useState(false)
    const [hnError, setHnError] = useState<string | null>(null)
    const [hnConnected, setHnConnected] = useState(false)
    const [hnSource, setHnSource] = useState<'env'|'db'|null>(null)

    useEffect(() => {
        const loadSites = async () => {
            try {
                const data = await FramerSyncService.getSites()
                setSites(data)
                setIsConnected(true)
                // Automatically find "Studio Karrtesian" if it exists
                const karrtesian = data.find(s => s.name.includes('Karrtesian'))
                if (karrtesian) setSelectedSite(karrtesian.id)
            } catch (err: any) {
                if (err.message.includes('missing auth')) {
                    setIsConnected(false)
                } else {
                    setError(err.message)
                }
            } finally {
                setIsLoading(false)
            }
        }
        loadSites()
    }, [])

    useEffect(() => {
        if (!selectedSite || !isConnected) return
        const loadCollections = async () => {
            setIsLoading(true)
            setError(null)
            try {
                const data = await FramerSyncService.getCollections(selectedSite)
                setCollections(data)
                // Automatically pick "Projects" or "Technology" if they exist
                const bestMatch = 
                    data.find(c => c.name.toLowerCase() === 'projects') || 
                    data.find(c => c.name.toLowerCase().includes('technology')) ||
                    data[0]
                
                if (bestMatch) setSelectedCollection(bestMatch.id)
            } catch (err: any) {
                setError(err.message)
            } finally {
                setIsLoading(false)
            }
        }
        loadCollections()
    }, [selectedSite, isConnected])

    useEffect(() => {
        const loadHashnode = async () => {
            try {
                const res = await fetch('/api/studio/hashnode?endpoint=config')
                if (res.ok) {
                    const data = await res.json()
                    setHnConnected(data.connected)
                    setHnSource(data.source)
                    if (data.publicationId) setHnPubId(data.publicationId)
                }
            } catch (err) {
                console.error('Failed to load Hashnode config', err)
            }
        }
        loadHashnode()
    }, [])

    const handleSaveApiKey = async () => {
        setIsLoading(true)
        setError(null)
        try {
            // Save API Key and optional Site ID to sys_settings via backend
            const res = await fetch('/api/studio/framer-sync?endpoint=save-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: apiKey, siteId: manualSiteId })
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error(data.error || 'Failed to save API key')
            }
            
            setIsConnected(true)
            
            if (manualSiteId) {
                let cleanId = manualSiteId
                if (cleanId.includes('framer.com/projects/')) {
                    const parts = cleanId.split('framer.com/projects/')[1].split('?')[0].split('#')[0].split('--')
                    cleanId = parts[parts.length - 1] || cleanId
                } else {
                    cleanId = cleanId.split('?')[0].split('#')[0]
                }
                setSelectedSite(cleanId)
                setSites([{ id: cleanId, name: 'Connected Project' }])
            } else {
                const data = await FramerSyncService.getSites()
                setSites(data)
            }
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleUnlink = async () => {
        setIsLoading(true)
        try {
            await fetch('/api/studio/framer-sync?endpoint=save-token', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: null, siteId: null })
            })
            setIsConnected(false)
            setSites([])
            setCollections([])
            setSelectedSite('')
            setSelectedCollection('')
            localStorage.removeItem('framer_sync_config')
        } catch (err: any) {
            setError(err.message)
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveMapping = () => {
        localStorage.setItem('framer_sync_config', JSON.stringify({
            siteId: selectedSite,
            collectionId: selectedCollection
        }))
        onClose()
    }

    const handleSaveHashnode = async () => {
        setHnSaving(true)
        setHnError(null)
        try {
            const res = await fetch('/api/studio/hashnode?endpoint=save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: hnToken, publicationId: hnPubId })
            })
            if (!res.ok) throw new Error('Failed to save Hashnode settings')
            setHnSaved(true)
            setHnConnected(true)
            setTimeout(() => setHnSaved(false), 2000)
        } catch (err: any) {
            setHnError(err.message)
        } finally {
            setHnSaving(false)
        }
    }

    return (
        <div className="p-8 space-y-8 min-h-[400px]">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-black text-black">Website Integration</h2>
                    <p className="text-[12px] font-medium text-black/40">Connect Studio to your Framer CMS</p>
                </div>
                <div className="flex items-center gap-4">
                    <button 
                        onClick={async () => {
                            const data = await FramerSyncService.testConnection()
                            alert(data.success ? `✅ Success: Connected to ${data.project}!` : `❌ Failed: ${data.error}`)
                        }}
                        className="p-1 px-3 rounded-full bg-blue-500 text-white text-[9px] font-black uppercase tracking-widest hover:scale-110 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                    >
                        Test API Connection
                    </button>
                    {isConnected && (
                        <button 
                            onClick={handleUnlink}
                            className="text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-full transition-all"
                        >
                            Unlink
                        </button>
                    )}
                    <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                        <X className="w-5 h-5 text-black/20" />
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                    <p className="text-[11px] font-black uppercase tracking-widest text-black/20">Syncing with Framer...</p>
                </div>
            ) : !isConnected ? (
                <div className="space-y-6">
                    <div className="space-y-6 py-4">
                        <div className="text-center space-y-2 mb-8">
                            <div className="w-16 h-16 bg-blue-50 rounded-3xl flex items-center justify-center mx-auto mb-4">
                                <Globe className="w-8 h-8 text-blue-500" />
                            </div>
                            <h3 className="text-[16px] font-black text-black">Connect Framer Project</h3>
                            <p className="text-[12px] font-medium text-black/40 max-w-[280px] mx-auto">
                                Enter your Site API Key and Project URL to sync collections.
                            </p>
                        </div>

                         <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Site API Key</label>
                                <input 
                                    type="password"
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="framer_test_..."
                                    className="w-full p-4 bg-black/[0.02] border border-black/[0.05] rounded-3xl text-[13px] font-bold focus:outline-none focus:border-blue-500 transition-all"
                                />
                                <p className="text-[10px] font-medium text-black/30 px-2 flex justify-between">
                                    <span>Site Settings &gt; General &gt; API Keys</span>
                                    <a 
                                        href="https://www.framer.com/help/articles/how-to-use-the-framer-api/#generating-an-api-key" 
                                        target="_blank" 
                                        className="text-blue-500 hover:underline"
                                    >
                                        Help
                                    </a>
                                </p>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Project URL</label>
                                <input 
                                    type="text"
                                    value={manualSiteId}
                                    onChange={(e) => setManualSiteId(e.target.value)}
                                    placeholder="https://framer.com/projects/..."
                                    className="w-full p-4 bg-black/[0.02] border border-black/[0.05] rounded-3xl text-[13px] font-bold focus:outline-none focus:border-blue-500 transition-all"
                                />
                                <p className="text-[10px] font-medium text-black/30 px-2 uppercase tracking-tighter">
                                    Copy the full URL from your browser address bar
                                </p>
                            </div>
                        </div>
                        {error && (
                            <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <p className="text-[11px] font-bold">{error}</p>
                            </div>
                        )}
                        <div className="pt-2">
                            <button
                                disabled={!apiKey || !manualSiteId || isLoading}
                                onClick={handleSaveApiKey}
                                className="w-full py-5 bg-black text-white rounded-[24px] text-[13px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 flex items-center justify-center gap-2"
                            >
                                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Connect Project'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    {error && (
                        <div className="p-6 rounded-3xl bg-red-50 border border-red-100 flex items-center gap-4 text-red-600">
                            <AlertCircle className="w-6 h-6 shrink-0" />
                            <p className="text-[13px] font-bold">{error}</p>
                        </div>
                    )}
                    
                    <div className="space-y-3">
                        <div className="flex items-center justify-between px-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30">Select Site</label>
                            <span className="text-[10px] font-black uppercase text-green-500 flex items-center gap-1">
                                <Check className="w-3 h-3" /> Connected
                            </span>
                        </div>
                        <div className="grid grid-cols-1 gap-2">
                            {sites.map(site => (
                                <button
                                    key={site.id}
                                    onClick={() => setSelectedSite(site.id)}
                                    className={cn(
                                        "flex items-center justify-between p-4 rounded-2xl border transition-all text-left",
                                        selectedSite === site.id 
                                            ? "bg-blue-50 border-blue-200 text-blue-900 shadow-sm"
                                            : "bg-black/[0.02] border-black/[0.05] text-black/60 hover:border-black/20"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Globe className={cn("w-4 h-4", selectedSite === site.id ? "text-blue-500" : "text-black/20")} />
                                        <span className="text-[13px] font-bold">{site.name}</span>
                                    </div>
                                    {selectedSite === site.id && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedSite && collections.length > 0 && (
                        <div className="space-y-3">
                            <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Select Collection</label>
                            <div className="grid grid-cols-2 gap-2">
                                {collections.map(coll => (
                                    <button
                                        key={coll.id}
                                        onClick={() => setSelectedCollection(coll.id)}
                                        className={cn(
                                            "flex flex-col p-4 rounded-2xl border transition-all text-left gap-1",
                                            selectedCollection === coll.id 
                                                ? "bg-indigo-50 border-indigo-200 text-indigo-900 shadow-sm"
                                                : "bg-black/[0.02] border-black/[0.05] text-black/60 hover:border-black/20"
                                        )}
                                    >
                                        <div className="flex justify-between items-center w-full">
                                            <span className="text-[12px] font-black uppercase tracking-tight">{coll.name}</span>
                                            {selectedCollection === coll.id && <Check className="w-3.5 h-3.5" />}
                                        </div>
                                        <span className="text-[10px] font-medium opacity-40">/{coll.slug}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="pt-4">
                        <button
                            disabled={!selectedSite || !selectedCollection}
                            onClick={handleSaveMapping}
                            className="w-full py-4 bg-black text-white rounded-[24px] text-[13px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-20 disabled:grayscale"
                        >
                            Save Settings & Map Fields
                        </button>
                    </div>
                </div>
            )}

            {/* HASHNODE SECTION */}
            <div className="pt-8 border-t border-black/[0.05] space-y-6">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-50 flex items-center justify-center rounded-2xl shrink-0">
                        <FileText className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <h3 className="text-[14px] font-black tracking-tight flex items-center gap-2">
                            Hashnode Articles 
                            {hnConnected && <span className="bg-emerald-50 text-emerald-600 text-[9px] px-2 py-0.5 rounded-full uppercase tracking-widest border border-emerald-100">Connected</span>}
                        </h3>
                        <p className="text-[11px] font-medium text-black/40">Publish drafts to your Hashnode blog before syncing</p>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Personal Access Token</label>
                        <input 
                            type="password"
                            value={hnToken}
                            onChange={(e) => setHnToken(e.target.value)}
                            placeholder={hnSource === 'env' ? "Loaded from .env" : hnConnected ? "••••••••••••••••••••" : "Paste API Token"}
                            disabled={hnSource === 'env'}
                            className="w-full p-4 bg-black/[0.02] border border-black/[0.05] rounded-3xl text-[13px] font-bold focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-black/30 ml-2">Publication ID</label>
                        <input 
                            type="text"
                            value={hnPubId}
                            onChange={(e) => setHnPubId(e.target.value)}
                            placeholder={hnSource === 'env' && !hnPubId ? "Loaded from .env" : "e.g. 69c3fdb..."}
                            disabled={hnSource === 'env'}
                            className="w-full p-4 bg-black/[0.02] border border-black/[0.05] rounded-3xl text-[13px] font-bold focus:outline-none focus:border-indigo-500 transition-all disabled:opacity-50"
                        />
                    </div>
                </div>

                {hnError && (
                    <div className="p-4 rounded-2xl bg-red-50 border border-red-100 flex items-center gap-3 text-red-600">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <p className="text-[11px] font-bold">{hnError}</p>
                    </div>
                )}
                
                {hnSource === 'env' && (
                    <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 text-emerald-600">
                        <Check className="w-4 h-4 shrink-0" />
                        <p className="text-[11px] font-bold">Successfully configured via environment variables.</p>
                    </div>
                )}

                {hnSource !== 'env' && (
                    <button
                        disabled={!hnToken || !hnPubId || hnSaving}
                        onClick={handleSaveHashnode}
                        className="w-full py-4 bg-indigo-500 text-white rounded-[24px] text-[12px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all disabled:opacity-30 flex items-center justify-center gap-2"
                    >
                        {hnSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : hnSaved ? <Check className="w-4 h-4" /> : 'Save Hashnode Config'}
                    </button>
                )}
            </div>
        </div>
    )
}
