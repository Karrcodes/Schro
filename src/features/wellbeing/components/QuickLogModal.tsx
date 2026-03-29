'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Sparkles, Check, Database } from 'lucide-react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { ComboEmojiStack } from './ComboEmojiStack'
import { cn } from '@/lib/utils'
import type { LibraryMeal } from '../types'

interface QuickLogModalProps {
    isOpen: boolean
    onClose: () => void
}

type LogType = 'meal' | 'weight'

export function QuickLogModal({ isOpen, onClose }: QuickLogModalProps) {
    const { logWeight, logMeal, addMealToLibrary, profile, library } = useWellbeing()
    const [activeTab, setActiveTab] = useState<LogType>('meal')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    // Weight State
    const [weight, setWeight] = useState(profile?.weight?.toString() || '')

    // Meal State
    const [mealName, setMealName] = useState('')
    const [mealEmoji, setMealEmoji] = useState('🍽️')
    const [mealCals, setMealCals] = useState('')
    const [mealMacros, setMealMacros] = useState({ protein: 0, carbs: 0, fat: 0 })
    const [saveToLibrary, setSaveToLibrary] = useState(true)
    const [mealType, setMealType] = useState<('dewbit' | 'breakfast' | 'lunch' | 'dinner' | 'snack')[]>(['snack'])
    const [isEstimating, setIsEstimating] = useState(false)
    const [isCombo, setIsCombo] = useState(false)
    const [comboContents, setComboContents] = useState<any[]>([])
    const [estimatedIngredients, setEstimatedIngredients] = useState<any[]>([])

    // Library Autocomplete State
    const [showLibraryDropdown, setShowLibraryDropdown] = useState(false)
    const filteredLibrary = useMemo(() => {
        if (!mealName.trim() || !showLibraryDropdown) return []
        return library.filter(m => m.name.toLowerCase().includes(mealName.toLowerCase()))
    }, [mealName, library, showLibraryDropdown])

    const handleSuccess = () => {
        setShowSuccess(true)
        setTimeout(() => {
            setShowSuccess(false)
            onClose()
            // Reset state
            setMealName('')
            setMealEmoji('🍽️')
            setMealCals('')
            setMealMacros({ protein: 0, carbs: 0, fat: 0 })
        }, 1500)
    }

    const handleEstimate = async () => {
        if (!mealName) return
        setIsEstimating(true)
        try {
            const res = await fetch('/api/nutrition/estimate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ text: mealName })
            })
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({ error: 'API Error' }))
                throw new Error(errorData.error || 'Failed to estimate macros')
            }
            const data = await res.json()
            setMealName(data.name || 'AI ESTIMATED MEAL')
            setMealEmoji(data.emoji || '🍽️')
            setMealCals(data.calories?.toString() || '0')
            setMealMacros({
                protein: data.protein || 0,
                carbs: data.carbs || 0,
                fat: data.fat || 0
            })
            setEstimatedIngredients(data.ingredients || [])
            setMealType(data.type ? [data.type] : ['snack'])
            setSaveToLibrary(true) // AI meals should usually be saved
        } catch (error: any) {
            console.error(error)
            alert(error.message || 'Failed to estimate macros. Please try again.')
        } finally {
            setIsEstimating(false)
        }
    }

    const loadFromLibrary = (meal: LibraryMeal) => {
        setMealName(meal.name)
        setMealEmoji(meal.emoji || '🍽️')
        setMealCals(meal.calories.toString())
        setMealMacros({
            protein: meal.protein,
            carbs: meal.carbs,
            fat: meal.fat
        })
        setEstimatedIngredients(meal.ingredients || [])
        setMealType(meal.type || ['snack'])
        setIsCombo(!!meal.isCombo)
        setComboContents(meal.contents || [])
        setSaveToLibrary(false) // already in library
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsSubmitting(true)

        try {
            if (activeTab === 'weight') {
                await logWeight(parseFloat(weight))
            } else if (activeTab === 'meal') {
                const cals = parseInt(mealCals) || 0

                if (saveToLibrary) {
                    await addMealToLibrary({
                        name: mealName || 'Custom Meal',
                        type: mealType,
                        emoji: mealEmoji,
                        calories: cals,
                        protein: mealMacros.protein,
                        carbs: mealMacros.carbs,
                        fat: mealMacros.fat,
                        ingredients: estimatedIngredients
                    })
                }

                await logMeal({
                    name: mealName || 'Custom Meal',
                    emoji: mealEmoji,
                    calories: cals,
                    protein: mealMacros.protein,
                    fat: mealMacros.fat,
                    carbs: mealMacros.carbs,
                    type: mealType.length > 0 ? mealType[0] : 'snack', // logMeal expects singular type, use first tag or default
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    date: new Date().toISOString().split('T')[0],
                    isCombo,
                    contents: comboContents
                })
            }
            handleSuccess()
        } catch (error) {
            console.error('Logging failed:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="bg-white rounded-[40px] w-full max-w-md overflow-hidden relative shadow-2xl flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-8 pb-4 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-[10px] font-black text-black/30 uppercase tracking-[0.3em] mb-1">Quick Action</h3>
                        <h2 className="text-2xl font-black uppercase tracking-tighter">Log Protocol</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center hover:bg-black/10 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-8 flex items-center gap-2 mb-6 shrink-0">
                    {(['meal', 'weight'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={cn(
                                "flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                activeTab === tab
                                    ? "bg-black text-white border-black"
                                    : "bg-black/[0.02] border-black/5 text-black/30 hover:bg-black/[0.04]"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Form Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-8 pb-8 custom-scrollbar">
                    <form id="quick-log-form" onSubmit={handleSubmit} className="space-y-6">
                        <AnimatePresence mode="wait">
                            {activeTab === 'meal' && (
                                <motion.div
                                    key="meal"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    {/* Manual Fields */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2 col-span-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Meal Type</label>
                                            <div className="flex bg-black/[0.02] rounded-2xl p-1 gap-1 border border-black/5">
                                                {(['dewbit', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map(type => {
                                                    const isSelected = mealType.includes(type)
                                                    const colorClass = isSelected
                                                        ? type === 'breakfast' ? 'bg-amber-400 text-white shadow-sm'
                                                            : type === 'lunch' ? 'bg-emerald-400 text-white shadow-sm'
                                                            : type === 'dinner' ? 'bg-blue-400 text-white shadow-sm'
                                                            : type === 'snack' ? 'bg-rose-400 text-white shadow-sm'
                                                            : 'bg-violet-400 text-white shadow-sm'
                                                        : 'text-black/30 hover:bg-black/[0.04]'
                                                    return (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => {
                                                                if (saveToLibrary) {
                                                                    setMealType(prev => 
                                                                        prev.includes(type) 
                                                                            ? prev.filter(t => t !== type) 
                                                                            : [...prev, type]
                                                                    )
                                                                } else {
                                                                    setMealType([type])
                                                                }
                                                            }}
                                                            className={cn(
                                                                "flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                                colorClass
                                                            )}
                                                        >
                                                            {type}
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                        <div className="space-y-2 col-span-2 relative">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Meal Name / AI Prompt</label>
                                            <div className="flex bg-black/[0.02] border border-black/5 rounded-2xl overflow-hidden focus-within:border-emerald-500/50 transition-colors">
                                                {isCombo ? (
                                                    <div className="w-16 flex items-center justify-center border-r border-black/5 bg-black/[0.02]">
                                                        <ComboEmojiStack 
                                                            isCombo={true}
                                                            contents={comboContents}
                                                            size="md"
                                                        />
                                                    </div>
                                                ) : (
                                                    <input
                                                        type="text"
                                                        value={mealEmoji}
                                                        onChange={e => setMealEmoji(e.target.value)}
                                                        className="w-16 bg-black/[0.02] text-center border-r border-black/5 text-xl outline-none"
                                                        maxLength={2}
                                                    />
                                                )}
                                                <input
                                                    type="text"
                                                    value={mealName}
                                                    onChange={(e) => {
                                                        setMealName(e.target.value)
                                                        setShowLibraryDropdown(true)
                                                    }}
                                                    onFocus={() => setShowLibraryDropdown(true)}
                                                    onBlur={() => setTimeout(() => setShowLibraryDropdown(false), 200)}
                                                    onKeyDown={e => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault()
                                                            handleEstimate()
                                                        }
                                                    }}
                                                    className="flex-1 bg-transparent px-5 py-3.5 text-[14px] font-black uppercase tracking-tight focus:outline-none placeholder:text-black/20"
                                                    placeholder="E.G. PROTEIN SHAKE OR 2 EGGS"
                                                />
                                                <button
                                                    type="button"
                                                    onClick={handleEstimate}
                                                    disabled={isEstimating || !mealName}
                                                    className="px-4 flex items-center justify-center text-emerald-500 hover:text-emerald-600 hover:bg-emerald-500/10 transition-colors border-l border-black/5 disabled:opacity-50"
                                                    title="Auto-estimate Macros"
                                                >
                                                    {isEstimating ? (
                                                        <div className="w-5 h-5 border-2 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
                                                    ) : (
                                                        <Sparkles className="w-5 h-5" />
                                                    )}
                                                </button>
                                            </div>

                                            {filteredLibrary.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 rounded-2xl shadow-xl z-50 max-h-[200px] overflow-y-auto custom-scrollbar p-2">
                                                    {filteredLibrary.map(libItem => (
                                                        <button
                                                            key={libItem.id}
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.preventDefault()
                                                                loadFromLibrary(libItem)
                                                                setShowLibraryDropdown(false)
                                                            }}
                                                            className="w-full text-left p-2 rounded-xl border border-transparent hover:border-black/5 bg-transparent hover:bg-black/[0.02] transition-colors flex justify-between items-center group"
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <ComboEmojiStack 
                                                                    isCombo={libItem.isCombo}
                                                                    contents={libItem.contents}
                                                                    fallbackEmoji={libItem.emoji}
                                                                    size="sm"
                                                                />
                                                                <div>
                                                                    <div className="text-[12px] font-bold text-black">{libItem.name}</div>
                                                                    <div className="text-[10px] font-bold text-black/40 mt-0.5">
                                                                        {libItem.calories} kcal • {libItem.protein}P • {libItem.carbs}C • {libItem.fat}F
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <Search className="w-4 h-4 text-black/0 group-hover:text-black/20 transition-colors" />
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Calories</label>
                                            <input
                                                type="number"
                                                value={mealCals}
                                                onChange={(e) => setMealCals(e.target.value)}
                                                className="w-full bg-black/[0.02] border border-black/5 rounded-2xl px-5 py-3.5 text-lg font-black focus:outline-none focus:border-emerald-500/50 transition-colors"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Protein (g)</label>
                                            <input
                                                type="number"
                                                value={mealMacros.protein || ''}
                                                onChange={(e) => setMealMacros({ ...mealMacros, protein: Number(e.target.value) })}
                                                className="w-full bg-black/[0.02] border border-black/5 rounded-2xl px-5 py-3.5 text-lg font-black text-blue-500 focus:outline-none focus:border-blue-500/50 transition-colors"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Carbs (g)</label>
                                            <input
                                                type="number"
                                                value={mealMacros.carbs || ''}
                                                onChange={(e) => setMealMacros({ ...mealMacros, carbs: Number(e.target.value) })}
                                                className="w-full bg-black/[0.02] border border-black/5 rounded-2xl px-5 py-3.5 text-lg font-black text-emerald-500 focus:outline-none focus:border-emerald-500/50 transition-colors"
                                                placeholder="0"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Fat (g)</label>
                                            <input
                                                type="number"
                                                value={mealMacros.fat || ''}
                                                onChange={(e) => setMealMacros({ ...mealMacros, fat: Number(e.target.value) })}
                                                className="w-full bg-black/[0.02] border border-black/5 rounded-2xl px-5 py-3.5 text-lg font-black text-amber-500 focus:outline-none focus:border-amber-500/50 transition-colors"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 px-1 pt-2">
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={saveToLibrary} 
                                                onChange={e => {
                                                    const checked = e.target.checked
                                                    setSaveToLibrary(checked)
                                                    if (!checked && mealType.length > 1) {
                                                        setMealType([mealType[0]])
                                                    }
                                                }} 
                                                className="sr-only peer" 
                                            />
                                            <div className="w-9 h-5 bg-black/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-500"></div>
                                        </label>
                                        <span className="text-[11px] font-bold text-black/60 uppercase tracking-widest">Save to Library</span>
                                    </div>

                                </motion.div>
                            )}

                            {activeTab === 'weight' && (
                                <motion.div
                                    key="weight"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-black/30 uppercase tracking-widest px-1">Weight (kg)</label>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={weight}
                                            onChange={(e) => setWeight(e.target.value)}
                                            className="w-full bg-black/[0.02] border border-black/5 rounded-2xl px-6 py-4 text-xl font-black focus:outline-none focus:border-rose-500/50 transition-colors"
                                            placeholder="0.0"
                                            autoFocus
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                </div>

                {/* Footer Pinned Button */}
                <div className="p-8 pt-4 shrink-0 bg-white border-t border-black/5">
                    <button
                        type="submit"
                        form="quick-log-form"
                        disabled={isSubmitting || showSuccess || (activeTab === 'meal' && !mealName)}
                        className={cn(
                            "w-full py-5 rounded-[24px] text-[12px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 disabled:opacity-50",
                            showSuccess
                                ? "bg-emerald-500 text-white"
                                : "bg-black text-white hover:scale-[1.02] active:scale-95 shadow-xl shadow-black/10"
                        )}
                    >
                        {isSubmitting ? (
                            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : showSuccess ? (
                            <>
                                <Check className="w-5 h-5" />
                                LOGGED
                            </>
                        ) : (
                            'Confirm Log'
                        )}
                    </button>
                </div>
            </motion.div>
        </div>
    )
}

