'use client'

import React, { useState } from 'react'
import { X, Users, Globe, MapPin, Activity, Calendar, Link as LinkIcon, MessageCircle, Hash, Plus } from 'lucide-react'
import { useStudio } from '../hooks/useStudio'
import type { NetworkType, NetworkStatus, StudioNetwork } from '../types/studio.types'
import { cn } from '@/lib/utils'

interface CreateNetworkModalProps {
    isOpen: boolean
    onClose: () => void
}

const NETWORK_TYPES: { value: NetworkType; label: string; icon: any; color: string }[] = [
    { value: 'person', label: 'Person', icon: Users, color: 'text-orange-600' },
    { value: 'community', label: 'Community', icon: Globe, color: 'text-blue-600' },
    { value: 'event', label: 'Event', icon: MapPin, color: 'text-emerald-600' }
]

const STATUSES: { value: NetworkStatus; label: string; type: NetworkType[] }[] = [
    { value: 'interested', label: 'Interested / Researching', type: ['person', 'community', 'event'] },
    { value: 'contacted', label: 'Contacted / Applied', type: ['person', 'community'] },
    { value: 'connected', label: 'Connected / Member', type: ['person', 'community'] },
    { value: 'attending', label: 'Attending (RSVP)', type: ['event'] },
    { value: 'attended', label: 'Attended (Past)', type: ['event'] }
]

export default function CreateNetworkModal({ isOpen, onClose }: CreateNetworkModalProps) {
    const { addNetwork, networks } = useStudio()
    const [loading, setLoading] = useState(false)
    const [tagsInput, setTagsInput] = useState('')
    const [formData, setFormData] = useState({
        type: 'person' as NetworkType,
        name: '',
        platform: '',
        url: '',
        notes: '',
        status: 'interested' as NetworkStatus,
        event_date: '',
        last_contact: '',
        category: ''
    })

    const allUniqueTags = Array.from(new Set(networks.flatMap(n => n.tags || []))).sort()
    const currentTags = tagsInput.split(',').map(t => t.trim().toLowerCase()).filter(Boolean)
    const suggestedTags = allUniqueTags.filter(tag => !currentTags.includes(tag.toLowerCase())).slice(0, 10)

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.name) return

        try {
            setLoading(true)
            const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)

            await addNetwork({
                ...formData,
                tags: tags.length > 0 ? tags : undefined,
                event_date: formData.type === 'event' && formData.event_date ? formData.event_date : undefined,
                last_contact: formData.type !== 'event' && formData.last_contact ? formData.last_contact : undefined
            })
            onClose()
            setFormData({
                type: 'person',
                name: '',
                platform: '',
                url: '',
                notes: '',
                status: 'interested',
                event_date: '',
                last_contact: '',
                category: ''
            })
            setTagsInput('')
        } catch (err: any) {
            alert(`Failed to create item: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    // Filter statuses based on selected type
    const availableStatuses = STATUSES.filter(s => s.type.includes(formData.type))

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl border border-black/[0.05] overflow-hidden animate-in fade-in zoom-in duration-200 font-outfit">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="p-8 pb-6 flex items-center justify-between border-b border-black/[0.1]">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center">
                                <Users className="w-6 h-6 text-purple-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-black leading-none">New Network Entry</h2>
                                <p className="text-[12px] text-black/40 mt-1 font-bold">Track contacts, communities, and events</p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                            <X className="w-6 h-6 text-black/20" />
                        </button>
                    </div>

                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        {/* Type Selector */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Entry Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {NETWORK_TYPES.map((t) => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => {
                                            const defaultStatus = t.value === 'event' ? 'interested' : 'interested'
                                            setFormData(prev => ({ ...prev, type: t.value, status: defaultStatus as NetworkStatus }))
                                        }}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border transition-all",
                                            formData.type === t.value
                                                ? "bg-black border-black text-white shadow-lg shadow-black/10"
                                                : "bg-black/[0.02] border-black/[0.05] text-black/40 hover:border-black/10"
                                        )}
                                    >
                                        <t.icon className={cn("w-6 h-6", formData.type === t.value ? "text-white" : t.color)} />
                                        <span className="text-[12px] font-bold">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Name & Status */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">
                                    {formData.type === 'person' ? 'Contact Name' : formData.type === 'community' ? 'Community Name' : 'Event Name'}
                                </label>
                                <input
                                    autoFocus
                                    required
                                    placeholder={formData.type === 'person' ? 'e.g. John Doe' : formData.type === 'community' ? 'e.g. Creator House' : 'e.g. Config 2026'}
                                    value={formData.name}
                                    onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[14px] font-bold focus:outline-none focus:border-purple-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as NetworkStatus }))}
                                    className="w-full px-5 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-purple-200 appearance-none cursor-pointer"
                                >
                                    {availableStatuses.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Platform & URL */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Platform / Source</label>
                                <div className="relative">
                                    <MessageCircle className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                    <input
                                        placeholder="e.g. LinkedIn, Twitter, Email"
                                        value={formData.platform}
                                        onChange={e => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                                        className="w-full pl-12 pr-4 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-purple-200"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Profile / Event Link</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                    <input
                                        type="url"
                                        placeholder="https://..."
                                        value={formData.url}
                                        onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                        className="w-full pl-12 pr-4 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-purple-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Event Date OR Last Contact */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {formData.type === 'event' ? (
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Event Date</label>
                                    <div className="flex items-center gap-3 w-full px-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl h-[46px] focus-within:border-purple-200 transition-colors">
                                        <Calendar className="w-4 h-4 text-black/20 shrink-0" />
                                        <input
                                            type="date"
                                            value={formData.event_date}
                                            onChange={e => setFormData(prev => ({ ...prev, event_date: e.target.value }))}
                                            className="flex-1 text-[12px] font-bold bg-transparent focus:outline-none cursor-pointer appearance-none min-w-0"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Last Contact Date</label>
                                    <div className="flex items-center gap-3 w-full px-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl h-[46px] focus-within:border-purple-200 transition-colors">
                                        <Calendar className="w-4 h-4 text-black/20 shrink-0" />
                                        <input
                                            type="date"
                                            value={formData.last_contact}
                                            onChange={e => setFormData(prev => ({ ...prev, last_contact: e.target.value }))}
                                            className="flex-1 text-[12px] font-bold bg-transparent focus:outline-none cursor-pointer appearance-none min-w-0"
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Tags */}
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Tags / Keywords</label>

                                {suggestedTags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mb-2 px-1">
                                        <span className="text-[9px] font-black uppercase tracking-tighter text-black/25 w-full mb-0.5">Quick Select</span>
                                        {suggestedTags.map(tag => (
                                            <button
                                                key={tag}
                                                type="button"
                                                onClick={() => {
                                                    const current = tagsInput ? `${tagsInput}, ` : ''
                                                    setTagsInput(`${current}${tag}`)
                                                }}
                                                className="text-[10px] font-bold text-black/40 bg-black/[0.03] hover:bg-black/[0.06] border border-transparent px-2 py-0.5 rounded-lg transition-all"
                                            >
                                                + {tag}
                                            </button>
                                        ))}
                                    </div>
                                )}

                                <div className="relative">
                                    <Hash className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                    <input
                                        placeholder="founder, designer, yc..."
                                        value={tagsInput}
                                        onChange={e => setTagsInput(e.target.value)}
                                        className="w-full pl-12 pr-4 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-purple-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Notes & Context</label>
                            <textarea
                                placeholder={formData.type === 'person' ? "How did you meet? What do they do? Topics discussed..." : "Details about the community or event..."}
                                value={formData.notes}
                                onChange={e => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                                className="w-full px-5 py-4 bg-black/[0.02] border border-black/[0.05] rounded-3xl text-[14px] font-medium min-h-[100px] focus:outline-none focus:border-purple-200 resize-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="p-8 pb-10 flex flex-col sm:flex-row gap-3 pt-6 bg-black/[0.01] border-t border-black/[0.05]">
                        <button
                            type="submit"
                            disabled={loading || !formData.name}
                            className="flex-1 py-4 bg-black text-white rounded-[24px] text-[14px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-black/10 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Adding...' : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Add to Network
                                </>
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-8 py-4 bg-white border border-black/[0.05] text-black/40 rounded-[24px] text-[14px] font-black uppercase tracking-widest hover:bg-black/5 transition-all"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
