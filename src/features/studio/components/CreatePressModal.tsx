'use client'

import React, { useState } from 'react'
import { X, Award, Globe, Shield, Calendar, Link as LinkIcon, Plus, Rocket, Target, Zap, Upload, Image as ImageIcon } from 'lucide-react'
import DatePickerInput from '@/components/DatePickerInput'
import { useStudio } from '../hooks/useStudio'
import { useSystemSettings } from '@/features/system/contexts/SystemSettingsContext'
import type { PressType, PressStatus, StudioPress } from '../types/studio.types'
import { cn } from '@/lib/utils'

interface CreatePressModalProps {
    isOpen: boolean
    onClose: () => void
}

const PRESS_TYPES: { value: PressType; label: string; icon: any; color: string }[] = [
    { value: 'competition', label: 'Competition', icon: Award, color: 'text-orange-600' },
    { value: 'grant', label: 'Grant', icon: Target, color: 'text-emerald-600' },
    { value: 'award', label: 'Award', icon: Zap, color: 'text-yellow-600' },
    { value: 'feature', label: 'Feature/PR', icon: Globe, color: 'text-blue-600' },
    { value: 'accelerator', label: 'Accelerator', icon: Shield, color: 'text-purple-600' }
]

const STATUSES: { value: PressStatus; label: string }[] = [
    { value: 'not_started', label: 'Backlog / Goal' },
    { value: 'applying', label: 'Active Application' },
    { value: 'submitted', label: 'Submitted / Pending' },
    { value: 'achieved', label: 'Won / Achieved' },
    { value: 'published', label: 'Live / Published' },
    { value: 'rejected', label: 'Unsuccessful' }
]

export default function CreatePressModal({ isOpen, onClose }: CreatePressModalProps) {
    const { addPress, projects } = useStudio()
    const { settings } = useSystemSettings()
    const [loading, setLoading] = useState(false)
    const fileInputRef = React.useRef<HTMLInputElement>(null)
    const [coverFile, setCoverFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [formData, setFormData] = useState({
        title: '',
        organization: '',
        description: '',
        type: 'competition' as PressType,
        status: 'not_started' as PressStatus,
        url: '',
        deadline: '',
        project_id: '',
        is_portfolio_item: false,
        milestone_goal: '',
        is_strategy_goal: false
    })

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.organization) return

        try {
            setLoading(true)
            await addPress({
                ...formData,
                project_id: formData.project_id || null as any
            }, coverFile || undefined)
            onClose()
            setFormData({
                title: '',
                organization: '',
                description: '',
                type: 'competition',
                status: 'not_started',
                url: '',
                deadline: '',
                project_id: '',
                is_portfolio_item: false,
                milestone_goal: '',
                is_strategy_goal: false
            })
            setCoverFile(null)
            setPreviewUrl(null)
        } catch (err: any) {
            alert(`Failed to create item: ${err.message}`)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-white rounded-[40px] shadow-2xl border border-black/[0.05] overflow-hidden animate-in fade-in zoom-in duration-200 font-outfit">
                <form onSubmit={handleSubmit}>
                    {/* Header */}
                    <div className="p-8 pb-6 flex items-center justify-between border-b border-black/[0.1]">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center">
                                <Award className="w-6 h-6 text-orange-600" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-black leading-none">New Press & Awards Entry</h2>
                                <p className="text-[12px] text-black/40 mt-1 font-bold italic">Tracking achievements and opportunities.</p>
                            </div>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                            <X className="w-6 h-6 text-black/20" />
                        </button>
                    </div>

                    <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                        {/* Type Selector */}
                        <div className="space-y-3">
                            <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Opportunity Type</label>
                            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                                {PRESS_TYPES.map((t) => (
                                    <button
                                        key={t.value}
                                        type="button"
                                        onClick={() => setFormData(prev => ({ ...prev, type: t.value }))}
                                        className={cn(
                                            "flex flex-col items-center justify-center gap-2 p-3 rounded-2xl border transition-all",
                                            formData.type === t.value
                                                ? "bg-black border-black text-white shadow-lg shadow-black/10"
                                                : "bg-black/[0.02] border-black/[0.05] text-black/40 hover:border-black/10"
                                        )}
                                    >
                                        <t.icon className={cn("w-5 h-5", formData.type === t.value ? "text-white" : t.color)} />
                                        <span className="text-[10px] font-bold">{t.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Title & Organization */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Item Title</label>
                                <input
                                    autoFocus
                                    required
                                    placeholder="e.g. Forbes 30 Under 30"
                                    value={formData.title}
                                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[14px] font-bold focus:outline-none focus:border-orange-200"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Organization</label>
                                <input
                                    required
                                    placeholder="e.g. Forbes / Tech Nation"
                                    value={formData.organization}
                                    onChange={e => setFormData(prev => ({ ...prev, organization: e.target.value }))}
                                    className="w-full px-5 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[14px] font-bold focus:outline-none focus:border-orange-200"
                                />
                            </div>
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Entry Description</label>
                            <textarea
                                placeholder="Detailed description of the achievement or feature..."
                                value={formData.description}
                                onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                                className="w-full px-5 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[14px] font-medium min-h-[100px] focus:outline-none focus:border-orange-200 resize-none"
                            />
                        </div>

                        {/* Status & Project */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Status</label>
                                <select
                                    value={formData.status}
                                    onChange={e => setFormData(prev => ({ ...prev, status: e.target.value as PressStatus }))}
                                    className="w-full px-5 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-orange-200 appearance-none cursor-pointer"
                                >
                                    {STATUSES.map(s => (
                                        <option key={s.value} value={s.value}>{s.label}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Linked Project</label>
                                <div className="relative">
                                    <Rocket className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                    <select
                                        value={formData.project_id}
                                        onChange={e => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                                        className="w-full pl-12 pr-4 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-orange-200 appearance-none cursor-pointer"
                                    >
                                        <option value="">No project link</option>
                                        {projects.map(p => (
                                            <option key={p.id} value={p.id}>{p.title}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Deadline & URL */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Deadline / Achievement Date</label>
                                <div className="flex items-center gap-3 w-full px-4 py-3 bg-black/[0.02] border border-black/[0.05] rounded-2xl h-[46px] focus-within:border-orange-200 transition-colors">
                                    <Calendar className="w-4 h-4 text-black/20 shrink-0" />
                                    <DatePickerInput
                                        value={formData.deadline ?? ''}
                                        onChange={val => setFormData(prev => ({ ...prev, deadline: val }))}
                                        className="flex-1 text-[12px] font-bold bg-transparent focus:outline-none cursor-pointer appearance-none min-w-0"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Resource Link (URL)</label>
                                <div className="relative">
                                    <LinkIcon className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                    <input
                                        type="url"
                                        placeholder="https://..."
                                        value={formData.url}
                                        onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                                        className="w-full pl-12 pr-4 py-3.5 bg-black/[0.02] border border-black/[0.05] rounded-2xl text-[13px] font-bold focus:outline-none focus:border-orange-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Strategy Goal & Portfolio Flag */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-black/[0.05]">
                            <button
                                type="button"
                                onClick={() => setFormData(prev => ({ ...prev, is_strategy_goal: !prev.is_strategy_goal }))}
                                className={cn(
                                    "p-4 rounded-3xl border flex items-center gap-4 transition-all text-left",
                                    formData.is_strategy_goal
                                        ? "bg-emerald-50 border-emerald-200 shadow-sm"
                                        : "bg-black/[0.01] border-black/[0.05] hover:border-black/10"
                                )}
                            >
                                <div className={cn(
                                    "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                                    formData.is_strategy_goal ? "bg-emerald-500 text-white" : "bg-black/[0.05] text-black/20"
                                )}>
                                    <Target className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[12px] font-black text-black leading-none">Strategy Goal</p>
                                    <p className="text-[10px] text-black/40 mt-1 font-bold">Mark as a key objective</p>
                                </div>
                            </button>

                            {!settings.is_demo_mode && (
                                <button
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, is_portfolio_item: !prev.is_portfolio_item }))}
                                    className={cn(
                                        "p-4 rounded-3xl border flex items-center gap-4 transition-all text-left",
                                        formData.is_portfolio_item
                                            ? "bg-blue-50 border-blue-200 shadow-sm"
                                            : "bg-black/[0.01] border-black/[0.05] hover:border-black/10"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0",
                                        formData.is_portfolio_item ? "bg-blue-500 text-white" : "bg-black/[0.05] text-black/20"
                                    )}>
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <p className="text-[12px] font-black text-black leading-none">Add to Portfolio</p>
                                        <p className="text-[10px] text-black/40 mt-1 font-bold">Showcase on GTV Profile</p>
                                    </div>
                                </button>
                            )}
                        </div>

                        {/* Cover Image Section */}
                        <div className="space-y-4 pt-4 border-t border-black/[0.05]">
                            <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Cover Asset</label>
                            
                            {previewUrl ? (
                                <div className="relative w-full h-48 rounded-[32px] overflow-hidden group">
                                    <img src={previewUrl} alt="Cover preview" className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <button 
                                            type="button"
                                            onClick={() => { setCoverFile(null); setPreviewUrl(null); }}
                                            className="p-3 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full text-white transition-all transform hover:scale-110"
                                        >
                                            <X className="w-6 h-6" />
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-3">
                                    <button
                                        type="button"
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full py-8 border-2 border-dashed border-black/[0.05] rounded-[32px] bg-black/[0.01] hover:bg-black/[0.03] hover:border-black/10 transition-all flex flex-col items-center justify-center gap-3 group"
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-black/[0.03] flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Upload className="w-6 h-6 text-black/20" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[13px] font-black text-black/40">Upload Cover Image</p>
                                            <p className="text-[10px] text-black/20 font-bold uppercase tracking-wider mt-1">PNG, JPG up to 10MB</p>
                                        </div>
                                    </button>
                                    <div className="flex items-center gap-3 px-4">
                                        <div className="h-[1px] flex-1 bg-black/[0.05]" />
                                        <span className="text-[10px] font-bold text-black/20 uppercase tracking-[0.2em]">or</span>
                                        <div className="h-[1px] flex-1 bg-black/[0.05]" />
                                    </div>
                                    <div className="p-4 bg-orange-50/50 border border-orange-100 rounded-2xl flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center shrink-0">
                                            <ImageIcon className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <div>
                                            <p className="text-[12px] font-black text-orange-900Leading-none">AI Generation</p>
                                            <p className="text-[10px] text-orange-600/60 font-bold">Leave blank to auto-generate via Gemini Vision</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) {
                                        setCoverFile(file)
                                        setPreviewUrl(URL.createObjectURL(file))
                                    }
                                }}
                            />
                        </div>

                        {/* Milestone Goal */}
                        <div className="space-y-2">
                            <label className="text-[11px] font-black uppercase tracking-widest text-black/30 ml-2">Requirement / Milestone Goal</label>
                            <textarea
                                placeholder="What needs to happen to achieve this? (e.g. Finish project MVP, get 1000 users...)"
                                value={formData.milestone_goal}
                                onChange={e => setFormData(prev => ({ ...prev, milestone_goal: e.target.value }))}
                                className="w-full px-5 py-4 bg-black/[0.02] border border-black/[0.05] rounded-3xl text-[14px] font-medium min-h-[100px] focus:outline-none focus:border-orange-200 resize-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="p-8 pb-10 flex flex-col sm:flex-row gap-3 pt-6 bg-black/[0.01] border-t border-black/[0.05]">
                        <button
                            type="submit"
                            disabled={loading || !formData.title || !formData.organization}
                            className="flex-1 py-4 bg-black text-white rounded-[24px] text-[14px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:hover:scale-100 shadow-xl shadow-black/10 flex items-center justify-center gap-2"
                        >
                            {loading ? 'Creating...' : (
                                <>
                                    <Plus className="w-4 h-4" />
                                    Add Entry
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
