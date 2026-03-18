'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Save, Plus, Trash2, Search, Flame, Zap, Apple, Coffee, UtensilsCrossed, Moon } from 'lucide-react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { cn } from '@/lib/utils'
import type { LibraryMeal } from '../types'
import { ComboEmojiStack } from './ComboEmojiStack'

interface EditLibraryMealModalProps {
    isOpen: boolean
    onClose: () => void
    meal: LibraryMeal
}

const CATEGORIES = ['dewbit', 'breakfast', 'lunch', 'dinner', 'snack'] as const

export function EditLibraryMealModal({ isOpen, onClose, meal }: EditLibraryMealModalProps) {
    const { library, updateLibraryMeal, updateCombo } = useWellbeing()
    
    // Core state
    const [name, setName] = useState(meal.name)
    const [emoji, setEmoji] = useState(meal.emoji || (meal.isCombo ? '📦' : '🍽️'))
    const [selectedTypes, setSelectedTypes] = useState<string[]>(Array.isArray(meal.type) ? meal.type : [meal.type as any])
    
    // Standard Meal state
    const [calories, setCalories] = useState(meal.calories.toString())
    const [protein, setProtein] = useState(meal.protein.toString())
    const [carbs, setCarbs] = useState(meal.carbs.toString())
    const [fat, setFat] = useState(meal.fat.toString())
    
    // Combo state
    const [comboItems, setComboItems] = useState<{ id: string, quantity: number }[]>(
        meal.contents?.map(c => ({ id: c.itemId, quantity: c.quantity })) || []
    )
    const [searchQuery, setSearchQuery] = useState('')
    const [isSaving, setIsSaving] = useState(false)

    // Derived Combo state
    const comboTotals = useMemo(() => {
        if (!meal.isCombo) return null
        let cals = 0, p = 0, c = 0, f = 0
        comboItems.forEach(item => {
            const libItem = library.find(l => l.id === item.id)
            if (libItem) {
                cals += libItem.calories * item.quantity
                p += libItem.protein * item.quantity
                c += libItem.carbs * item.quantity
                f += libItem.fat * item.quantity
            }
        })
        return { calories: Math.round(cals), protein: Math.round(p), carbs: Math.round(c), fat: Math.round(f) }
    }, [comboItems, library, meal.isCombo])

    const filteredLibrary = useMemo(() => {
        if (!searchQuery) return []
        return library.filter(l => 
            !l.isCombo && 
            l.id !== meal.id && 
            l.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !comboItems.some(ci => ci.id === l.id)
        ).slice(0, 5)
    }, [library, searchQuery, meal.id, comboItems])

    const handleSave = async () => {
        setIsSaving(true)
        try {
            if (meal.isCombo) {
                await updateCombo(meal.id, name, comboItems, selectedTypes as any)
            } else {
                await updateLibraryMeal(meal.id, {
                    name,
                    emoji,
                    type: selectedTypes as any,
                    calories: parseInt(calories) || 0,
                    protein: parseInt(protein) || 0,
                    carbs: parseInt(carbs) || 0,
                    fat: parseInt(fat) || 0
                })
            }
            onClose()
        } catch (e) {
            console.error('Save failed:', e)
        } finally {
            setIsSaving(false)
        }
    }

    const toggleType = (type: string) => {
        setSelectedTypes(prev => 
            prev.includes(type) 
                ? (prev.length > 1 ? prev.filter(t => t !== type) : prev) 
                : [...prev, type]
        )
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-md"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-[32px] w-full max-w-lg shadow-2xl relative overflow-hidden flex flex-col max-h-[85vh]"
                    >
                        {/* Header */}
                        <div className="p-6 border-b border-black/5 flex items-center justify-between bg-black/[0.01]">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center">
                                    {meal.isCombo ? <Zap className="w-5 h-5 text-black/60" /> : <Apple className="w-5 h-5 text-black/60" />}
                                </div>
                                <div>
                                    <h3 className="text-[14px] font-black uppercase tracking-widest text-black">Edit {meal.isCombo ? 'Combo' : 'Meal'}</h3>
                                    <p className="text-[10px] font-bold text-black/40 uppercase tracking-widest">Update Library Record</p>
                                </div>
                            </div>
                            <button onClick={onClose} className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center transition-colors">
                                <X className="w-4 h-4 text-black/60" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h4 className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">General Information</h4>
                                <div className="flex gap-4">
                                    <div className="w-16 h-16 rounded-2xl bg-black/[0.03] border border-black/5 flex items-center justify-center text-3xl">
                                        <input 
                                            value={emoji} 
                                            onChange={e => setEmoji(e.target.value)}
                                            className="w-full text-center bg-transparent border-none focus:ring-0 p-0"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <input 
                                            value={name}
                                            onChange={e => setName(e.target.value)}
                                            placeholder="Meal Name"
                                            className="w-full bg-black/[0.03] border-none rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 ring-black/5"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {CATEGORIES.map(category => (
                                        <button
                                            key={category}
                                            onClick={() => toggleType(category)}
                                            className={cn(
                                                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                                selectedTypes.includes(category)
                                                    ? "bg-black text-white border-black"
                                                    : "bg-black/[0.03] text-black/40 border-transparent hover:bg-black/[0.06]"
                                            )}
                                        >
                                            {category}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {meal.isCombo ? (
                                /* Combo Builder */
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Combo Contents</h4>
                                        <div className="flex items-center gap-3 text-[11px] font-black uppercase text-rose-500">
                                            <Flame className="w-3.5 h-3.5" />
                                            {comboTotals?.calories} kcal
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-2">
                                        {comboItems.map((item, idx) => {
                                            const libItem = library.find(l => l.id === item.id)
                                            return (
                                                <div key={item.id} className="flex items-center justify-between p-4 bg-black/[0.02] border border-black/5 rounded-2xl">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-xl">{libItem?.emoji || '🍽️'}</span>
                                                        <div>
                                                            <p className="text-xs font-bold leading-none">{libItem?.name}</p>
                                                            <p className="text-[9px] font-black text-black/30 uppercase tracking-widest mt-1">
                                                                {libItem ? Math.round(libItem.calories * item.quantity) : 0} kcal
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="flex items-center bg-white rounded-lg border border-black/5 p-0.5">
                                                            <button 
                                                                onClick={() => setComboItems(prev => prev.map((ci, i) => i === idx ? { ...ci, quantity: Math.max(1, ci.quantity - 1) } : ci))}
                                                                className="w-6 h-6 flex items-center justify-center text-black/40 hover:text-black"
                                                            >-</button>
                                                            <span className="w-8 text-center text-xs font-black">{item.quantity}</span>
                                                            <button 
                                                                onClick={() => setComboItems(prev => prev.map((ci, i) => i === idx ? { ...ci, quantity: ci.quantity + 1 } : ci))}
                                                                className="w-6 h-6 flex items-center justify-center text-black/40 hover:text-black"
                                                            >+</button>
                                                        </div>
                                                        <button 
                                                            onClick={() => setComboItems(prev => prev.filter((_, i) => i !== idx))}
                                                            className="text-rose-500 hover:text-rose-600 p-1"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                        
                                        {/* Add Item Search */}
                                        <div className="relative mt-4">
                                            <div className="relative">
                                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                                <input 
                                                    placeholder="Search to add item..."
                                                    value={searchQuery}
                                                    onChange={e => setSearchQuery(e.target.value)}
                                                    className="w-full bg-black/[0.03] border-none rounded-2xl pl-11 pr-4 py-4 text-sm font-bold focus:ring-2 ring-black/5"
                                                />
                                            </div>
                                            
                                            <AnimatePresence>
                                                {searchQuery && filteredLibrary.length > 0 && (
                                                    <motion.div 
                                                        initial={{ opacity: 0, y: 10 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="absolute top-full left-0 right-0 mt-2 bg-white border border-black/5 rounded-2xl shadow-xl z-10 overflow-hidden"
                                                    >
                                                        {filteredLibrary.map(l => (
                                                            <button
                                                                key={l.id}
                                                                onClick={() => {
                                                                    setComboItems(prev => [...prev, { id: l.id, quantity: 1 }])
                                                                    setSearchQuery('')
                                                                }}
                                                                className="w-full px-4 py-3 text-left hover:bg-black/[0.02] flex items-center justify-between border-b border-black/[0.02] last:border-none"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <span>{l.emoji || '🍽️'}</span>
                                                                    <span className="text-xs font-bold">{l.name}</span>
                                                                </div>
                                                                <span className="text-[10px] font-black text-black/30 uppercase">{l.calories} kcal</span>
                                                            </button>
                                                        ))}
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* Standard Macros */
                                <div className="space-y-4">
                                    <h4 className="text-[10px] font-black text-black/30 uppercase tracking-[0.2em]">Nutritional Breakdown</h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <p className="text-[9px] font-black text-black/30 uppercase tracking-widest ml-1">Calories</p>
                                            <div className="relative">
                                                <Flame className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                                <input 
                                                    type="number"
                                                    value={calories}
                                                    onChange={e => setCalories(e.target.value)}
                                                    className="w-full bg-black/[0.03] border-none rounded-2xl pl-11 pr-4 py-4 text-sm font-bold focus:ring-2 ring-black/5"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[9px] font-black text-rose-500/50 uppercase tracking-widest ml-1">Protein (g)</p>
                                            <input 
                                                type="number"
                                                value={protein}
                                                onChange={e => setProtein(e.target.value)}
                                                className="w-full bg-rose-500/[0.03] border border-rose-500/10 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 ring-rose-500/5 text-rose-600"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[9px] font-black text-emerald-500/50 uppercase tracking-widest ml-1">Carbs (g)</p>
                                            <input 
                                                type="number"
                                                value={carbs}
                                                onChange={e => setCarbs(e.target.value)}
                                                className="w-full bg-emerald-500/[0.03] border border-emerald-500/10 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 ring-emerald-500/5 text-emerald-600"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[9px] font-black text-amber-500/50 uppercase tracking-widest ml-1">Fat (g)</p>
                                            <input 
                                                type="number"
                                                value={fat}
                                                onChange={e => setFat(e.target.value)}
                                                className="w-full bg-amber-500/[0.03] border border-amber-500/10 rounded-2xl px-4 py-4 text-sm font-bold focus:ring-2 ring-amber-500/5 text-amber-600"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="p-6 border-t border-black/5 bg-black/[0.01]">
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !name || (meal.isCombo && comboItems.length === 0)}
                                className="w-full bg-black text-white h-14 rounded-2xl flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:scale-100 shadow-xl shadow-black/10"
                            >
                                {isSaving ? <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                                Save Changes
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
