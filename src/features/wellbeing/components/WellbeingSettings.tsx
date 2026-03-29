'use client'

import React, { useState, useRef } from 'react'
import {
    Layout,
    Settings,
    Baby,
    Ruler,
    Weight,
    CheckCircle2,
    Eye,
    EyeOff,
    Activity,
    Save,
    User,
    Target,
    Info,
    Dumbbell,
    Utensils,
    RotateCcw,
    Flame,
    Scale,
    Calendar,
    Smile,
    ArrowUpRight,
    ArrowLeft
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { useWellbeing } from '../contexts/WellbeingContext'
import type { WellbeingGoal, ActivityLevel, Gender, DashboardComponentId } from '../types'
import { cn } from '@/lib/utils'

import { KarrFooter } from '@/components/KarrFooter'

export function WellbeingSettings() {
    const { profile, updateProfile, dashboardLayout, updateLayout } = useWellbeing()
    const router = useRouter()
    const [isSaving, setIsSaving] = useState(false)
    const [success, setSuccess] = useState(false)
    const [draggingId, setDraggingId] = useState<DashboardComponentId | null>(null)
    const [dragOverColumn, setDragOverColumn] = useState<'main' | 'sidebar' | null>(null)

    const [formData, setFormData] = useState({
        age: profile?.age || 25,
        weight: profile?.weight || 75,
        height: profile?.height || 175,
        gender: profile?.gender || 'male' as Gender,
        activityLevel: profile?.activityLevel || 'moderate' as ActivityLevel,
        goal: profile?.goal || 'maintenance' as WellbeingGoal,
        goalWeight: profile?.goalWeight || profile?.weight || 75
    })

    const COMPONENT_LABELS: Record<DashboardComponentId, string> = {
        'macros': 'Nutrition Status',
        'weight_trends': 'Weight Progress',
        'active_protocol': 'Fitness Protocol',
        'meal_planner': 'Nutritional Matrix',
        'nutritional_trends': '7-Day Calorie Trend',
        'workout_consistency': 'Workout Heatmap',
        'gym_activity': 'Gym Interaction',
        'mood_reflection': 'Daily Reflection'
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSaving(true)

        try {
            await updateProfile({
                ...formData,
                updatedAt: new Date().toISOString()
            })
            setSuccess(true)
            setTimeout(() => setSuccess(false), 3000)
        } catch (error) {
            console.error('Failed to save settings:', error)
        } finally {
            setIsSaving(false)
        }
    }

    const handleChange = (field: string, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }))
    }

    const toggleVisibility = (id: DashboardComponentId) => {
        const layout = { ...dashboardLayout }
        const mainIdx = layout.main.findIndex(c => c.id === id)
        if (mainIdx !== -1) {
            layout.main[mainIdx] = { ...layout.main[mainIdx], isVisible: !layout.main[mainIdx].isVisible }
        } else {
            const sideIdx = layout.sidebar.findIndex(c => c.id === id)
            if (sideIdx !== -1) {
                layout.sidebar[sideIdx] = { ...layout.sidebar[sideIdx], isVisible: !layout.sidebar[sideIdx].isVisible }
            }
        }
        updateLayout(layout)
    }

    const handlePointerDragOver = (x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        let foundColumn: 'main' | 'sidebar' | null = null
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.column) {
                foundColumn = el.dataset.column as 'main' | 'sidebar'
                break
            }
        }
        setDragOverColumn(foundColumn)
    }

    const handlePointerDrop = async (componentId: DashboardComponentId, x: number, y: number) => {
        const elements = document.elementsFromPoint(x, y)
        let targetColumn: 'main' | 'sidebar' | null = null
        for (const el of elements) {
            if (el instanceof HTMLElement && el.dataset.column) {
                targetColumn = el.dataset.column as 'main' | 'sidebar'
                break
            }
        }

        setDraggingId(null)
        setDragOverColumn(null)

        if (targetColumn) {
            const layout = { ...dashboardLayout }
            const inMain = layout.main.findIndex(c => c.id === componentId)
            const inSidebar = layout.sidebar.findIndex(c => c.id === componentId)
            const currentColumn = inMain !== -1 ? 'main' : 'sidebar'
            const currentIndex = currentColumn === 'main' ? inMain : inSidebar

            if (currentIndex === -1) return

            const sourceItems = [...layout[currentColumn]]
            const [moved] = sourceItems.splice(currentIndex, 1)

            const columnEl = document.querySelector(`[data-column="${targetColumn}"]`)
            let targetIndex = 0
            if (columnEl) {
                const itemElements = Array.from(columnEl.querySelectorAll('[data-drag-id]'))
                for (let i = 0; i < itemElements.length; i++) {
                    const rect = itemElements[i].getBoundingClientRect()
                    if (y > rect.top + rect.height / 2) {
                        targetIndex = i + 1
                    }
                }
            }

            if (currentColumn === targetColumn) {
                if (targetIndex > currentIndex) targetIndex--
                const targetItems = [...sourceItems]
                targetItems.splice(targetIndex, 0, moved)
                layout[targetColumn] = targetItems
            } else {
                const targetItems = [...layout[targetColumn]]
                targetItems.splice(targetIndex, 0, moved)
                layout[currentColumn] = sourceItems
                layout[targetColumn] = targetItems
            }

            updateLayout(layout)
        }
    }

    return (
        <div className="flex flex-col space-y-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between z-10 gap-6 w-full flex-shrink-0">
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <button 
                        onClick={() => router.push('/health')}
                        className="w-9 h-9 rounded-xl bg-black/[0.03] flex items-center justify-center hover:bg-black/[0.06] transition-colors flex-shrink-0"
                    >
                        <ArrowLeft className="w-4 h-4 text-black/40" />
                    </button>
                    <div className="min-w-0 flex-1 space-y-1">
                        <h2 className="text-[11px] font-black text-rose-500 uppercase tracking-[0.3em] truncate">Wellbeing Protocol</h2>
                        <h1 className="text-3xl sm:text-4xl font-black text-black tracking-tighter uppercase grayscale truncate">Biometric Data</h1>
                    </div>
                </div>
            </div>

            <div className="w-full space-y-8">
                {/* Profile Section - Maintains standard size for accessibility */}
                <div className="bg-white border border-black/5 rounded-[32px] p-6 md:p-8 shadow-sm space-y-8">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <User className="w-3.5 h-3.5 text-rose-500" />
                            <h2 className="text-[10px] font-black text-black/30 uppercase tracking-[0.25em]">Personal Metrics</h2>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Core Metrics</h3>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-black/40 uppercase tracking-wider ml-2 flex items-center gap-2">
                                        <Baby className="w-2.5 h-2.5" /> Age
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.age}
                                        onChange={(e) => handleChange('age', parseInt(e.target.value))}
                                        className="w-full bg-[#fafafa] border border-black/5 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-black/40 uppercase tracking-wider ml-2 flex items-center gap-2">
                                        <Ruler className="w-2.5 h-2.5" /> Height (cm)
                                    </label>
                                    <input
                                        type="number"
                                        value={formData.height}
                                        onChange={(e) => handleChange('height', parseInt(e.target.value))}
                                        className="w-full bg-[#fafafa] border border-black/5 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-black/40 uppercase tracking-wider ml-2 flex items-center gap-2">
                                        <Weight className="w-2.5 h-2.5" /> Current Weight (kg)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.weight}
                                        onChange={(e) => handleChange('weight', parseFloat(e.target.value))}
                                        className="w-full bg-[#fafafa] border border-black/5 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[9px] font-black text-black/40 uppercase tracking-wider ml-2 flex items-center gap-2">
                                        <Scale className="w-2.5 h-2.5" /> Goal Weight (kg)
                                    </label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        value={formData.goalWeight}
                                        onChange={(e) => handleChange('goalWeight', parseFloat(e.target.value))}
                                        className="w-full bg-[#fafafa] border border-black/5 rounded-xl px-4 py-2.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Identity</h3>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-black/40 uppercase tracking-wider ml-2">Gender</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['male', 'female'] as Gender[]).map((g) => (
                                        <button
                                            key={g}
                                            type="button"
                                            onClick={() => handleChange('gender', g)}
                                            className={cn(
                                                "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all",
                                                formData.gender === g
                                                    ? "bg-black text-white border-black"
                                                    : "bg-[#fafafa] border-black/5 text-black/40 hover:bg-black/5"
                                            )}
                                        >
                                            {g}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-1.5 pt-1">
                                <label className="text-[9px] font-black text-black/40 uppercase tracking-wider ml-2">Activity Level</label>
                                <div className="grid grid-cols-1 gap-1.5">
                                    {(['sedentary', 'light', 'moderate', 'active', 'very_active'] as ActivityLevel[]).map((level) => (
                                        <button
                                            key={level}
                                            type="button"
                                            onClick={() => handleChange('activityLevel', level)}
                                            className={cn(
                                                "px-3 py-2 rounded-lg text-[8px] font-black uppercase text-left border transition-all",
                                                formData.activityLevel === level
                                                    ? "bg-black text-white border-black"
                                                    : "bg-[#fafafa] border-black/5 text-black/30 hover:bg-black/5"
                                            )}
                                        >
                                            {level.replace('_', ' ')}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">Objective</h3>
                            <div className="grid grid-cols-1 gap-2">
                                {(['cut', 'maintenance', 'bulk'] as WellbeingGoal[]).map((g) => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => handleChange('goal', g)}
                                        className={cn(
                                            "p-3 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all flex items-center justify-between group",
                                            formData.goal === g
                                                ? "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-200"
                                                : "bg-[#fafafa] border-black/5 text-black/40 hover:bg-rose-50"
                                        )}
                                    >
                                        {g === 'cut' ? 'Reduction' : g === 'maintenance' ? 'Stasis' : 'Augmentation'}
                                        <Target className={cn(
                                            "w-3.5 h-3.5 transition-transform group-hover:scale-125",
                                            formData.goal === g ? "text-white" : "text-black/10"
                                        )} />
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-6 border-t border-black/[0.03]">
                        <div className="flex items-center gap-3 text-black/30">
                            <Info className="w-3.5 h-3.5" />
                            <p className="text-[9px] font-bold uppercase tracking-tight">Recalculating macro targets upon commit.</p>
                        </div>
                        <button
                            type="submit"
                            disabled={isSaving}
                            className="bg-black text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-black/10 flex items-center gap-2 disabled:opacity-50"
                        >
                            {isSaving ? 'Processing...' : (
                                <>
                                    <Save className="w-3.5 h-3.5" />
                                    Commit Sync
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>

            </div>
        </div>
    )
}
