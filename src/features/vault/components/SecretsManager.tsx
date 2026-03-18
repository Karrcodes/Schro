'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Eye, EyeOff, Copy, Trash2, Plus, Key, User, Globe, FileText, Loader2, Check, X } from 'lucide-react'
import { useVault } from '../contexts/VaultContext'
import { cn } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import { MOCK_VAULT } from '@/lib/demoData'

const LOCAL_STORAGE_KEY = 'schrö_demo_vault_secrets_v1'

interface Secret {
    id: string
    service: string
    username: string | null
    password: string
    notes: string | null
    created_at: string
}

export function SecretsManager() {
    const { isVaultPrivate } = useVault()
    const [secrets, setSecrets] = useState<Secret[]>([])
    const [loading, setLoading] = useState(true)
    const [adding, setAdding] = useState(false)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null)
    const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({})
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const { settings } = useSystemSettings()

    // Form states
    const [newSecret, setNewSecret] = useState({
        service: '',
        username: '',
        password: '',
        notes: ''
    })

    const [editSecret, setEditSecret] = useState({
        service: '',
        username: '',
        password: '',
        notes: ''
    })

    const [selectedSecret, setSelectedSecret] = useState<Secret | null>(null)

    const getSessionSecrets = useCallback(() => {
        if (typeof window === 'undefined') return null
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY)
        return stored ? JSON.parse(stored) : null
    }, [])

    const saveSessionSecrets = useCallback((data: any[]) => {
        if (typeof window === 'undefined') return
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data))
    }, [])

    const fetchSecrets = useCallback(async () => {
        if (settings.is_demo_mode) {
            let session = getSessionSecrets()
            if (!session) {
                session = MOCK_VAULT.secrets
                saveSessionSecrets(session)
            }
            setSecrets(session)
            setLoading(false)
            return
        }
        setLoading(true)
        const { data, error } = await supabase
            .from('sys_secrets')
            .select('*')
            .order('service', { ascending: true })

        if (!error && data) {
            setSecrets(data)
        }
        setLoading(false)
    }, [settings.is_demo_mode, getSessionSecrets, saveSessionSecrets]) // Added dependencies for useCallback

    useEffect(() => {
        fetchSecrets()
    }, [fetchSecrets])

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSecret.service || !newSecret.password) return

        if (settings.is_demo_mode) {
            const newSecretDemo: Secret = {
                id: `demo-s-${Date.now()}`,
                service: newSecret.service,
                username: newSecret.username || null,
                password: newSecret.password,
                notes: newSecret.notes || null,
                created_at: new Date().toISOString()
            }
            const session = getSessionSecrets() || []
            const updated = [newSecretDemo, ...session]
            saveSessionSecrets(updated)
            setSecrets(updated)
            setNewSecret({ service: '', username: '', password: '', notes: '' })
            setAdding(false)
            return
        }

        const { error } = await supabase
            .from('sys_secrets')
            .insert([{
                service: newSecret.service,
                username: newSecret.username || null,
                password: newSecret.password,
                notes: newSecret.notes || null,
                profile: 'personal' // Default to personal
            }])

        if (!error) {
            setNewSecret({ service: '', username: '', password: '', notes: '' })
            setAdding(false)
            fetchSecrets()
        }
        // setIsSaving(false) // Ensure setIsSaving is reset for non-demo mode too // This line was commented out in the original, and not part of the requested change.
    }

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editingId || !editSecret.service || !editSecret.password) return

        if (settings.is_demo_mode) {
            const session = getSessionSecrets() || []
            const updated = session.map((s: Secret) => s.id === editingId ? {
                ...s,
                service: editSecret.service,
                username: editSecret.username || null,
                password: editSecret.password,
                notes: editSecret.notes || null
            } : s)
            saveSessionSecrets(updated)
            setSecrets(updated)
            setEditingId(null)
            return
        }

        const { error } = await supabase
            .from('sys_secrets')
            .update({
                service: editSecret.service,
                username: editSecret.username || null,
                password: editSecret.password,
                notes: editSecret.notes || null,
            })
            .eq('id', editingId)

        if (!error) {
            setEditingId(null)
            fetchSecrets()
        }
    }

    const handleDelete = async (id: string) => {
        if (settings.is_demo_mode) {
            const session = getSessionSecrets() || []
            const updated = session.filter((s: Secret) => s.id !== id)
            saveSessionSecrets(updated)
            setSecrets(updated)
            setConfirmingDeleteId(null)
            return
        }
        const { error } = await supabase
            .from('sys_secrets')
            .delete()
            .eq('id', id)

        if (!error) {
            setConfirmingDeleteId(null)
            fetchSecrets()
        }
    }

    const startEditing = (secret: Secret) => {
        setEditingId(secret.id)
        setEditSecret({
            service: secret.service,
            username: secret.username || '',
            password: secret.password,
            notes: secret.notes || ''
        })
    }

    const togglePassword = (id: string) => {
        setVisiblePasswords(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const copyToClipboard = async (text: string, id: string, type: 'user' | 'pass') => {
        try {
            if (navigator?.clipboard?.writeText) {
                await navigator.clipboard.writeText(text)
            } else {
                const textArea = document.createElement("textarea")
                textArea.value = text
                document.body.appendChild(textArea)
                textArea.select()
                document.execCommand("copy")
                document.body.removeChild(textArea)
            }
            setCopiedId(`${id}-${type}`)
            setTimeout(() => setCopiedId(null), 2000)
        } catch (err) {
            console.error('Failed to copy secret!', err)
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-black flex items-center gap-2">
                        <span>🔐</span> Secrets
                    </h2>
                    <p className="text-[12px] text-black/40">Manage your passwords and sensitive access details</p>
                </div>
                <button
                    onClick={() => setAdding(!adding)}
                    className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[13px] font-bold hover:bg-black/80 transition-all shadow-sm active:scale-95"
                >
                    {adding ? 'Cancel' : (
                        <>
                            <Plus className="w-4 h-4" />
                            <span>Add Secret</span>
                        </>
                    )}
                </button>
            </div>

            {adding && (
                <div className="bg-white border border-black/[0.08] rounded-2xl p-5 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    <form onSubmit={handleAdd} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-black/40 uppercase tracking-wider ml-1">Service / App</label>
                                <div className="relative">
                                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                    <input
                                        required
                                        type="text"
                                        placeholder="e.g. Netflix, GitHub"
                                        value={newSecret.service}
                                        onChange={e => setNewSecret({ ...newSecret, service: e.target.value })}
                                        className="w-full bg-black/[0.02] border border-black/[0.06] rounded-xl py-2.5 pl-10 pr-4 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold text-black/40 uppercase tracking-wider ml-1">Username / Email</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                    <input
                                        type="text"
                                        placeholder="Username or email"
                                        value={newSecret.username}
                                        onChange={e => setNewSecret({ ...newSecret, username: e.target.value })}
                                        className="w-full bg-black/[0.02] border border-black/[0.06] rounded-xl py-2.5 pl-10 pr-4 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-black/40 uppercase tracking-wider ml-1">Password</label>
                            <div className="relative">
                                <Key className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    value={newSecret.password}
                                    onChange={e => setNewSecret({ ...newSecret, password: e.target.value })}
                                    className="w-full bg-black/[0.02] border border-black/[0.06] rounded-xl py-2.5 pl-10 pr-4 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-black/40 uppercase tracking-wider ml-1">Notes (Optional)</label>
                            <div className="relative">
                                <FileText className="absolute left-3 top-3 w-4 h-4 text-black/20" />
                                <textarea
                                    placeholder="Any additional info..."
                                    value={newSecret.notes}
                                    onChange={e => setNewSecret({ ...newSecret, notes: e.target.value })}
                                    rows={2}
                                    className="w-full bg-black/[0.02] border border-black/[0.06] rounded-xl py-2.5 pl-10 pr-4 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/5 transition-all resize-none"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="w-full py-3 bg-black text-white rounded-xl text-[14px] font-bold hover:bg-black/90 transition-all shadow-md active:scale-[0.98]"
                        >
                            Save Secret
                        </button>
                    </form>
                </div>
            )}

            <div className="space-y-4">
                {loading ? (
                    <div className="bg-white border border-black/[0.08] rounded-2xl p-12 text-center shadow-sm">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="w-6 h-6 animate-spin text-black/20" />
                            <p className="text-[13px] font-medium text-black/30">Loading your secrets...</p>
                        </div>
                    </div>
                ) : secrets.length === 0 ? (
                    <div className="bg-white border border-black/[0.08] rounded-2xl p-12 text-center shadow-sm">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-black/[0.03] flex items-center justify-center">
                                <Key className="w-6 h-6 text-black/10" />
                            </div>
                            <p className="text-[13px] font-medium text-black/30">No secrets stored yet.</p>
                        </div>
                    </div>
                ) : (
                    Object.entries(
                        secrets.reduce((acc, secret) => {
                            const key = secret.service.toLowerCase().trim();
                            if (!acc[key]) acc[key] = [];
                            acc[key].push(secret);
                            return acc;
                        }, {} as Record<string, Secret[]>)
                    ).map(([serviceKey, serviceSecrets]) => (
                        <div key={serviceKey} className="bg-white border border-black/[0.08] rounded-2xl overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="px-5 py-3.5 bg-black/[0.01] border-b border-black/[0.03] flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-7 h-7 rounded-lg bg-black text-white flex items-center justify-center text-[11px] font-black">
                                        {serviceSecrets[0].service[0]?.toUpperCase()}
                                    </div>
                                    <h3 className="text-[12px] font-black text-black uppercase tracking-widest">{serviceSecrets[0].service}</h3>
                                    <span className="px-1.5 py-0.5 rounded-md bg-black/[0.04] text-[9px] font-bold text-black/40">
                                        {serviceSecrets.length} {serviceSecrets.length === 1 ? 'account' : 'accounts'}
                                    </span>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-black/[0.005]">
                                            <th className="pl-5 pr-4 py-3 text-[10px] font-bold text-black/25 uppercase tracking-widest w-1/3">Username / Email</th>
                                            <th className="px-4 py-3 text-[10px] font-bold text-black/25 uppercase tracking-widest w-1/3">Password</th>
                                            <th className="pl-4 pr-5 py-3 text-[10px] font-bold text-black/25 uppercase tracking-widest text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-black/[0.03]">
                                        {serviceSecrets.map((secret) => {
                                            const isEditing = editingId === secret.id;
                                            return (
                                                <tr key={secret.id} className={cn(
                                                    "group transition-colors",
                                                    isEditing ? "bg-black/[0.04]" : "hover:bg-black/[0.01]"
                                                )}>
                                                    <td className="pl-5 pr-4 py-4">
                                                        {isEditing ? (
                                                            <div className="space-y-2">
                                                                <input
                                                                    type="text"
                                                                    placeholder="Service Name"
                                                                    value={editSecret.service}
                                                                    onChange={e => setEditSecret({ ...editSecret, service: e.target.value })}
                                                                    className="w-full bg-white border border-black/[0.1] rounded-lg px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/5 font-bold"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    placeholder="Username"
                                                                    value={editSecret.username}
                                                                    onChange={e => setEditSecret({ ...editSecret, username: e.target.value })}
                                                                    className="w-full bg-white border border-black/[0.1] rounded-lg px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/5"
                                                                />
                                                            </div>
                                                        ) : (
                                                            <div className="flex flex-col">
                                                                <div className="flex items-center gap-2">
                                                                    <span className={cn(
                                                                        "text-[13px] font-bold text-black/70 truncate max-w-[200px]",
                                                                        isVaultPrivate && "privacy-blur"
                                                                    )}>
                                                                        {secret.username || '—'}
                                                                    </span>
                                                                    {!isVaultPrivate && secret.username && (
                                                                        <button
                                                                            onClick={() => copyToClipboard(secret.username!, secret.id, 'user')}
                                                                            className="p-1 rounded-md hover:bg-black/[0.05] text-black/20 hover:text-black transition-all"
                                                                            title="Copy Username"
                                                                        >
                                                                            {copiedId === `${secret.id}-user` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                                {!isVaultPrivate && secret.notes && (
                                                                    <span className="text-[11px] text-black/30 italic font-medium mt-1 truncate max-w-[180px]">
                                                                        " {secret.notes} "
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        {isEditing ? (
                                                            <input
                                                                type="text"
                                                                placeholder="Password"
                                                                value={editSecret.password}
                                                                onChange={e => setEditSecret({ ...editSecret, password: e.target.value })}
                                                                className="w-full bg-white border border-black/[0.1] rounded-lg px-2 py-1.5 text-[13px] focus:outline-none focus:ring-2 focus:ring-black/5 font-mono"
                                                            />
                                                        ) : (
                                                            <div className="flex items-center gap-2">
                                                                <span className={cn(
                                                                    "text-[13px] font-mono tracking-wider",
                                                                    (visiblePasswords[secret.id] && !isVaultPrivate) ? 'text-black' : 'text-black/15'
                                                                )}>
                                                                    {(visiblePasswords[secret.id] && !isVaultPrivate) ? secret.password : '••••••••••••'}
                                                                </span>
                                                                <div className="flex items-center gap-0.5 ml-auto">
                                                                    {!isVaultPrivate && (
                                                                        <>
                                                                            <button
                                                                                onClick={() => togglePassword(secret.id)}
                                                                                className="p-1.5 rounded-md hover:bg-black/[0.05] text-black/20 hover:text-black transition-all"
                                                                                title={visiblePasswords[secret.id] ? "Hide Password" : "Show Password"}
                                                                            >
                                                                                {visiblePasswords[secret.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                                                                            </button>
                                                                            <button
                                                                                onClick={() => copyToClipboard(secret.password, secret.id, 'pass')}
                                                                                className="p-1.5 rounded-md hover:bg-black/[0.05] text-black/20 hover:text-black transition-all"
                                                                                title="Copy Password"
                                                                            >
                                                                                {copiedId === `${secret.id}-pass` ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                                                                            </button>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </td>
                                                    <td className="pl-4 pr-5 py-4 text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {isEditing ? (
                                                                <div className="flex items-center gap-2">
                                                                    <button
                                                                        onClick={handleUpdate}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-600 transition-all"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5" />
                                                                        <span>Save</span>
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setEditingId(null)}
                                                                        className="p-1.5 rounded-lg text-black/30 hover:bg-black/5 transition-all"
                                                                    >
                                                                        <X className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            ) : confirmingDeleteId === secret.id ? (
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] uppercase font-black tracking-widest text-red-500 mr-1">Confirm?</span>
                                                                    <button
                                                                        onClick={() => handleDelete(secret.id)}
                                                                        className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-500 hover:text-white transition-all border border-red-100"
                                                                        title="Yes, Delete"
                                                                    >
                                                                        <Check className="w-3.5 h-3.5" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setConfirmingDeleteId(null)}
                                                                        className="p-1.5 rounded-lg text-black/40 hover:bg-black/5 hover:text-black transition-all border border-transparent"
                                                                        title="Cancel"
                                                                    >
                                                                        <X className="w-3.5 h-3.5" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <button
                                                                        onClick={() => startEditing(secret)}
                                                                        className="p-1.5 rounded-lg text-black/20 hover:text-black hover:bg-black/[0.03] transition-all"
                                                                        title="Edit Secret"
                                                                    >
                                                                        <FileText className="w-4 h-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setConfirmingDeleteId(secret.id)}
                                                                        className="p-1.5 rounded-lg text-red-500/30 hover:text-red-500 hover:bg-red-50 transition-all"
                                                                        title="Delete Secret"
                                                                    >
                                                                        <Trash2 className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
