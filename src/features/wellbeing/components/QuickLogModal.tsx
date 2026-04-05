'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Search, Sparkles, Check, Database, ChefHat } from 'lucide-react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { ComboEmojiStack } from './ComboEmojiStack'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { LibraryMeal } from '../types'

interface QuickLogModalProps {
    isOpen: boolean
    onClose: () => void
}

export function QuickLogModal({ isOpen, onClose }: QuickLogModalProps) {
    const { logMeal, consumeFromFridge, addMealToLibrary, library, fridge } = useWellbeing()
    const [activeTab, setActiveTab] = useState<'custom' | 'library' | 'combos' | 'fridge'>('custom')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    // Selection State
    const [selectedLibraryId, setSelectedLibraryId] = useState<string | null>(null)
    const [selectedFridgeId, setSelectedFridgeId] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    // Custom Meal State
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

    const filteredMeals = useMemo(() => {
        const meals = library.filter(m => !m.isCombo)
        if (!searchQuery.trim()) return meals
        return meals.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }, [searchQuery, library])

    const filteredCombos = useMemo(() => {
        const combos = library.filter(m => !!m.isCombo)
        if (!searchQuery.trim()) return combos
        return combos.filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
    }, [searchQuery, library])

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
            setSelectedLibraryId(null)
            setSelectedFridgeId(null)
            setSearchQuery('')
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

        const typeToLog = mealType.length > 0 ? mealType[0] : 'snack'

        try {
            if (activeTab === 'fridge') {
                if (selectedFridgeId) {
                    await consumeFromFridge(selectedFridgeId, typeToLog)
                }
            } else if (activeTab === 'library' || activeTab === 'combos') {
                if (selectedLibraryId) {
                    const libItem = library.find(m => m.id === selectedLibraryId)
                    if (libItem) {
                        await logMeal({
                            name: libItem.name,
                            emoji: libItem.emoji || '🍽️',
                            calories: libItem.calories,
                            protein: libItem.protein,
                            fat: libItem.fat,
                            carbs: libItem.carbs,
                            type: typeToLog,
                            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            date: new Date().toISOString().split('T')[0],
                            isCombo: !!libItem.isCombo,
                            contents: libItem.contents || []
                        })
                    }
                }
            } else if (activeTab === 'custom') {
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
                    type: typeToLog,
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
                    {(['custom', 'library', 'combos', 'fridge'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => {
                                setActiveTab(tab)
                                setSelectedLibraryId(null)
                                setSelectedFridgeId(null)
                            }}
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
                            {activeTab === 'custom' && (
                                <motion.div
                                    key="custom"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    {/* Manual Fields */}
                                    <div className="grid grid-cols-2 gap-4">
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
                                                    onChange={e => setMealName(e.target.value)}
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

                            {(activeTab === 'library' || activeTab === 'combos') && (
                                <motion.div
                                    key={activeTab}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                        <input
                                            type="text"
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            placeholder={`Search ${activeTab}...`}
                                            className="w-full bg-black/[0.02] border border-black/5 rounded-2xl pl-12 pr-4 py-3.5 text-[14px] font-black uppercase focus:outline-none focus:border-emerald-500/50 transition-colors placeholder:text-black/20"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        {(activeTab === 'library' ? filteredMeals : filteredCombos).map(libItem => (
                                            <div
                                                key={libItem.id}
                                                onClick={() => setSelectedLibraryId(libItem.id)}
                                                className={cn(
                                                    "w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                                                    selectedLibraryId === libItem.id 
                                                        ? "bg-black text-white border-black shadow-lg" 
                                                        : "bg-transparent border-black/5 hover:border-black/10 hover:bg-black/[0.02]"
                                                )}
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className={cn("shrink-0", selectedLibraryId === libItem.id ? "opacity-90" : "")}>
                                                        <ComboEmojiStack 
                                                            isCombo={libItem.isCombo}
                                                            contents={libItem.contents}
                                                            fallbackEmoji={libItem.emoji}
                                                            size="md"
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className={cn("text-[14px] font-bold", selectedLibraryId === libItem.id ? "text-white" : "text-black")}>
                                                            {libItem.name}
                                                        </div>
                                                        <div className={cn("text-[11px] font-bold mt-1 tracking-wide", selectedLibraryId === libItem.id ? "text-white/60" : "text-black/40")}>
                                                            {libItem.calories} kcal • {libItem.protein}P • {libItem.carbs}C • {libItem.fat}F
                                                            {libItem.isCombo && libItem.contents && ` • ${libItem.contents.length} Items`}
                                                        </div>
                                                    </div>
                                                </div>
                                                {selectedLibraryId === libItem.id && (
                                                    <Check className="w-5 h-5 text-white" />
                                                )}
                                            </div>
                                        ))}
                                        {(activeTab === 'library' ? filteredMeals : filteredCombos).length === 0 && (
                                            <p className="text-center text-[11px] font-bold tracking-widest uppercase text-black/30 py-8">No items found.</p>
                                        )}
                                    </div>
                                </motion.div>
                            )}

                            {activeTab === 'fridge' && (
                                <motion.div
                                    key="fridge"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    {fridge.length === 0 ? (
                                        <div className="text-center py-12 space-y-3">
                                            <div className="w-16 h-16 bg-black/[0.02] rounded-full flex items-center justify-center mx-auto mb-2">
                                                <ChefHat className="w-8 h-8 text-black/10" />
                                            </div>
                                            <h3 className="text-[12px] font-black text-black/60 uppercase tracking-widest">Fridge is Empty</h3>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {fridge.map(item => {
                                                const meal = library.find(m => m.id === item.mealId)
                                                if (!meal) return null

                                                return (
                                                    <div
                                                        key={item.id}
                                                        onClick={() => setSelectedFridgeId(item.id)}
                                                        className={cn(
                                                            "w-full text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between group",
                                                            selectedFridgeId === item.id 
                                                                ? "bg-black text-white border-black shadow-lg" 
                                                                : "bg-transparent border-black/5 hover:border-black/10 hover:bg-black/[0.02]"
                                                        )}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn("shrink-0", selectedFridgeId === item.id ? "opacity-90" : "")}>
                                                                <ComboEmojiStack 
                                                                    isCombo={meal.isCombo}
                                                                    contents={meal.contents}
                                                                    fallbackEmoji={meal.emoji}
                                                                    size="md"
                                                                />
                                                            </div>
                                                            <div>
                                                                <div className={cn("text-[14px] font-bold", selectedFridgeId === item.id ? "text-white" : "text-black")}>
                                                                    {meal.name}
                                                                </div>
                                                                <div className={cn("text-[11px] font-bold mt-1 tracking-wide", selectedFridgeId === item.id ? "text-white/60" : "text-black/40")}>
                                                                    {item.portions} portion{item.portions !== 1 ? 's' : ''} left • {meal.calories} kcal
                                                                </div>
                                                            </div>
                                                        </div>
                                                        {selectedFridgeId === item.id && (
                                                            <Check className="w-5 h-5 text-white" />
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                </div>

                {/* Footer Pinned Area */}
                <div className="p-8 pt-4 shrink-0 bg-white border-t border-black/5 space-y-5 z-10">
                    <div className="space-y-2">
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
                                        onClick={() => setMealType([type])}
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

                    <button
                        type="submit"
                        form="quick-log-form"
                        disabled={
                            isSubmitting || showSuccess || 
                            (activeTab === 'custom' && !mealName) ||
                            ((activeTab === 'library' || activeTab === 'combos') && !selectedLibraryId) ||
                            (activeTab === 'fridge' && !selectedFridgeId)
                        }
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

