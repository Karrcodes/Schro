'use client'

import * as React from 'react'
import { useState } from 'react'
import { useWellbeing } from '../contexts/WellbeingContext'
import { Plus, Utensils, X, Clock, Flame, ChevronRight, Trash2, BookMarked, CheckCircle2 } from 'lucide-react'
import { QuickLogModal } from './QuickLogModal'
import { NutritionLibraryModal } from './NutritionLibraryModal'
import ConfirmationModal from '@/components/ConfirmationModal'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import { ComboEmojiStack } from './ComboEmojiStack'
import type { MealLog, MacroTargets } from '../types'

export function MealPlanner() {
    const { library, mealLogs, macros, dailyNutrition, deleteMealLog, updateMealLog, addMealToLibrary, removeMealFromLibrary } = useWellbeing()
    const [showQuickAdd, setShowQuickAdd] = useState(false)
    const [showLibrary, setShowLibrary] = useState(false)
    const [mealToDelete, setMealToDelete] = useState<MealLog | null>(null)
    const [libraryActionMeal, setLibraryActionMeal] = useState<{ meal: MealLog, isSaved: boolean, libraryMealId?: string } | null>(null)
    const [openCategoryMealId, setOpenCategoryMealId] = useState<string | null>(null)

    const today = new Date().toISOString().split('T')[0]
    const todayMeals = mealLogs.filter((m: MealLog) => m.date === today)

    const macroProgress = (current: number, target: number) => {
        if (target === 0) return 0
        return Math.min(Math.round((current / target) * 100), 100)
    }

    return (
        <div className="space-y-8">
            {/* Macro Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Calories', current: dailyNutrition.calories, target: macros.calories, color: 'bg-black', text: 'text-black' },
                    { label: 'Protein', current: dailyNutrition.protein, target: macros.protein, color: 'bg-rose-500', text: 'text-rose-500' },
                    { label: 'Fats', current: dailyNutrition.fat, target: macros.fat, color: 'bg-amber-500', text: 'text-amber-500' },
                    { label: 'Carbs', current: dailyNutrition.carbs, target: macros.carbs, color: 'bg-emerald-500', text: 'text-emerald-500' },
                ].map((m) => (
                    <div key={m.label} className="bg-white border border-black/5 rounded-[32px] p-6 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <p className="text-[11px] font-black text-black/40 uppercase tracking-widest">{m.label}</p>
                            <p className={cn("text-xs font-black uppercase tracking-widest", m.text)}>
                                {macroProgress(m.current, m.target)}%
                            </p>
                        </div>
                        <div className="flex items-baseline gap-1 mb-4">
                            <span className="text-2xl font-bold">{Math.round(m.current)}</span>
                            <span className="text-sm font-bold text-black/20">/ {m.target}{m.label === 'Calories' ? '' : 'g'}</span>
                        </div>
                        <div className="h-1.5 w-full bg-black/5 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${macroProgress(m.current, m.target)}%` }}
                                className={cn("h-full rounded-full transition-all duration-1000", m.color)}
                            />
                        </div>
                    </div>
                ))}
            </div>

            {/* Daily Log */}
            <div className="bg-white border border-black/5 rounded-[40px] p-8 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                    <div>
                        <h3 className="text-2xl font-bold tracking-tight">Today's Meals</h3>
                        <p className="text-black/40 text-sm font-medium">Logged {todayMeals.length} items</p>
                    </div>
                    <div className="flex gap-2 xl:gap-3">
                        <button
                            onClick={() => setShowQuickAdd(true)}
                            className="p-3 xl:px-6 xl:py-3 bg-white border border-black/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:border-black/20 transition-all flex items-center justify-center gap-2"
                            title="Quick Log"
                        >
                            <Plus className="h-4 w-4" /> <span className="hidden xl:inline">Quick Log</span>
                        </button>
                        <button
                            onClick={() => setShowLibrary(true)}
                            className="p-3 xl:px-6 xl:py-3 bg-black/5 text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-black/10 transition-all flex items-center justify-center gap-2"
                            title="Library"
                        >
                            <BookMarked className="h-4 w-4" /> <span className="hidden xl:inline">Library</span>
                        </button>
                    </div>
                </div>

                <div className="space-y-4">
                    {todayMeals.length === 0 ? (
                        <div className="py-12 text-center border-2 border-dashed border-black/5 rounded-[32px]">
                            <p className="text-black/30 font-bold uppercase text-xs tracking-widest mb-2">No meals logged yet</p>
                            <p className="text-black/20 text-sm">Start your day by logging breakfast</p>
                        </div>
                    ) : (
                        (() => {
                            const standardTypes = ['breakfast', 'lunch', 'dinner', 'snack', 'dewbit']
                            const otherMeals = todayMeals.filter(m => !m.type || !standardTypes.includes(m.type.toLowerCase()))
                            
                            return (
                                <>
                                    {standardTypes.map(type => {
                                        const mealsOfType = todayMeals.filter((m: MealLog) => m.type?.toLowerCase() === type)
                                        if (mealsOfType.length === 0) return null
                                        return (
                                            <div key={type} className="mb-6 last:mb-0">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-black/30 mb-3 ml-2">{type}</h4>
                                                <div className="space-y-2">
                                                    {mealsOfType.map(meal => (
                                                        <div key={meal.id} className="flex items-center justify-between p-6 bg-black/[0.02] border border-black/5 rounded-[24px] hover:bg-black/[0.04] transition-all group">
                                                            <div className="flex items-center gap-6">
                                                                <ComboEmojiStack 
                                                                    isCombo={meal.isCombo}
                                                                    contents={meal.contents}
                                                                    fallbackEmoji={meal.emoji}
                                                                    size="md"
                                                                />
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-1">
                                                                        <div className={cn("relative transition-all", openCategoryMealId === meal.id ? "z-50" : "z-10")}>
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    setOpenCategoryMealId(openCategoryMealId === meal.id ? null : meal.id)
                                                                                }}
                                                                                className={cn(
                                                                                    "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-all",
                                                                                    meal.type?.toLowerCase() === 'breakfast' ? "bg-amber-50 text-amber-600 hover:bg-amber-100" :
                                                                                        meal.type?.toLowerCase() === 'lunch' ? "bg-emerald-50 text-emerald-600 hover:bg-emerald-100" :
                                                                                            meal.type?.toLowerCase() === 'dinner' ? "bg-blue-50 text-blue-600 hover:bg-blue-100" :
                                                                                                meal.type?.toLowerCase() === 'dewbit' ? "bg-purple-50 text-purple-600 hover:bg-purple-100" :
                                                                                                    "bg-rose-50 text-rose-600 hover:bg-rose-100"
                                                                                )}
                                                                            >
                                                                                {meal.type}
                                                                            </button>
                                                                            
                                                                            <AnimatePresence>
                                                                                {openCategoryMealId === meal.id && (
                                                                                    <motion.div 
                                                                                        initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                                                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                                                                        exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                                                                        transition={{ duration: 0.15 }}
                                                                                        className="absolute left-0 top-full mt-1 w-28 bg-white border border-black/5 rounded-xl shadow-xl overflow-hidden origin-top-left z-50"
                                                                                    >
                                                                                        {(['dewbit', 'breakfast', 'lunch', 'dinner', 'snack'] as const).map(t => (
                                                                                            <button
                                                                                                key={t}
                                                                                                onClick={(e) => {
                                                                                                    e.stopPropagation()
                                                                                                    updateMealLog(meal.id, { type: t })
                                                                                                    setOpenCategoryMealId(null)
                                                                                                }}
                                                                                                className="w-full text-left px-3 py-2 text-[10px] font-black uppercase tracking-widest hover:bg-black/5 transition-colors"
                                                                                            >
                                                                                                {t}
                                                                                            </button>
                                                                                        ))}
                                                                                    </motion.div>
                                                                                )}
                                                                            </AnimatePresence>
                                                                        </div>
                                                                        <span className="text-[9px] font-black uppercase tracking-widest text-black/20">•</span>
                                                                        <span className="px-2 py-0.5 bg-black/5 rounded-full text-[9px] font-black uppercase tracking-widest text-black/40">
                                                                            {meal.time}
                                                                        </span>
                                                                    </div>
                                                                    <h4 className="font-bold tracking-tight text-sm sm:text-base line-clamp-2">{meal.name}</h4>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-4 sm:gap-6 shrink-0 ml-4">
                                                                <div className="text-right hidden sm:block">
                                                                    <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Protein</p>
                                                                    <p className="font-bold">{meal.protein}g</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-[10px] font-black text-black/40 uppercase tracking-widest leading-tight">Calories</p>
                                                                    <p className="text-lg font-bold">{meal.calories}</p>
                                                                </div>
                                                                <div className="flex items-center gap-1">
                                                                    {(() => {
                                                                        const libraryMatch = library.find(m => m.name.toLowerCase() === meal.name.toLowerCase())
                                                                        const isSaved = !!libraryMatch
                                                                        return (
                                                                            <button
                                                                                onClick={(e) => {
                                                                                    e.stopPropagation()
                                                                                    setLibraryActionMeal({ meal, isSaved, libraryMealId: libraryMatch?.id })
                                                                                }}
                                                                                className={cn(
                                                                                    "p-2.5 rounded-xl transition-all flex items-center justify-center",
                                                                                    isSaved
                                                                                        ? "bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm"
                                                                                        : "bg-black/5 text-black/40 hover:bg-emerald-500 hover:text-white"
                                                                                )}
                                                                                title={isSaved ? "Remove from Library" : "Save to Library"}
                                                                            >
                                                                                {isSaved ? <CheckCircle2 className="h-4 w-4" /> : <BookMarked className="h-4 w-4" />}
                                                                            </button>
                                                                        )
                                                                    })()}
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation()
                                                                            setMealToDelete(meal)
                                                                        }}
                                                                        className="p-2.5 rounded-xl bg-black/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                                                                        title="Delete Meal"
                                                                    >
                                                                        <Trash2 className="h-4 w-4" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )
                                    })}

                                    {otherMeals.length > 0 && (
                                        <div className="mb-6 last:mb-0">
                                            <h4 className="text-[10px] font-black uppercase tracking-widest text-black/30 mb-3 ml-2">Other</h4>
                                            <div className="space-y-2">
                                                {otherMeals.map(meal => (
                                                    <div key={meal.id} className="flex items-center justify-between p-6 bg-black/[0.02] border border-black/5 rounded-[24px] hover:bg-black/[0.04] transition-all group">
                                                        <div className="flex items-center gap-6">
                                                            <ComboEmojiStack 
                                                                isCombo={meal.isCombo}
                                                                contents={meal.contents}
                                                                fallbackEmoji={meal.emoji}
                                                                size="md"
                                                            />
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <div className={cn("relative transition-all", openCategoryMealId === meal.id ? "z-50" : "z-10")}>
                                                                        <button
                                                                            onClick={(e) => {
                                                                                e.stopPropagation()
                                                                                setOpenCategoryMealId(openCategoryMealId === meal.id ? null : meal.id)
                                                                            }}
                                                                            className={cn(
                                                                                "px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1 transition-all",
                                                                                "bg-rose-50 text-rose-600 hover:bg-rose-100"
                                                                            )}
                                                                        >
                                                                            {meal.type || 'other'}
                                                                        </button>
                                                                    </div>
                                                                    <span className="text-[9px] font-black uppercase tracking-widest text-black/20">•</span>
                                                                    <span className="px-2 py-0.5 bg-black/5 rounded-full text-[9px] font-black uppercase tracking-widest text-black/40">
                                                                        {meal.time}
                                                                    </span>
                                                                </div>
                                                                <h4 className="font-bold tracking-tight text-sm sm:text-base line-clamp-2">{meal.name}</h4>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 sm:gap-6 shrink-0 ml-4">
                                                            <div className="text-right hidden sm:block">
                                                                <p className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Protein</p>
                                                                <p className="font-bold">{meal.protein}g</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-[10px] font-black text-black/40 uppercase tracking-widest leading-tight">Calories</p>
                                                                <p className="text-lg font-bold">{meal.calories}</p>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation()
                                                                        setMealToDelete(meal)
                                                                    }}
                                                                    className="p-2.5 rounded-xl bg-black/5 text-rose-500 hover:bg-rose-500 hover:text-white transition-all"
                                                                    title="Delete Meal"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )
                        })()
                    )}
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {/* Advanced Quick Log (with AI & Library) */}
                <QuickLogModal key="quick-log" isOpen={showQuickAdd} onClose={() => setShowQuickAdd(false)} />
                <NutritionLibraryModal key="nutrition-library" isOpen={showLibrary} onClose={() => setShowLibrary(false)} />
            </AnimatePresence>

            <ConfirmationModal
                isOpen={!!mealToDelete}
                onClose={() => setMealToDelete(null)}
                onConfirm={async () => {
                    if (mealToDelete) {
                        await deleteMealLog(mealToDelete.id)
                        setMealToDelete(null)
                    }
                }}
                title="Delete Meal Log"
                message={`Are you sure you want to delete "${mealToDelete?.name}"? This action cannot be undone and your macros will be updated.`}
                confirmText="Delete"
                type="danger"
            />

            <ConfirmationModal
                isOpen={!!libraryActionMeal}
                onClose={() => setLibraryActionMeal(null)}
                onConfirm={async () => {
                    if (libraryActionMeal) {
                        if (libraryActionMeal.isSaved && libraryActionMeal.libraryMealId) {
                            await removeMealFromLibrary(libraryActionMeal.libraryMealId)
                        } else {
                                await addMealToLibrary({
                                    name: libraryActionMeal.meal.name,
                                    type: libraryActionMeal.meal.type ? [libraryActionMeal.meal.type] : ['snack'],
                                    emoji: libraryActionMeal.meal.emoji,
                                    calories: libraryActionMeal.meal.calories,
                                    protein: libraryActionMeal.meal.protein,
                                    carbs: libraryActionMeal.meal.carbs,
                                    fat: libraryActionMeal.meal.fat,
                                    ingredients: []
                                })
                        }
                        setLibraryActionMeal(null)
                    }
                }}
                title={libraryActionMeal?.isSaved ? "Remove from Library" : "Save to Library"}
                message={libraryActionMeal?.isSaved
                    ? `Are you sure you want to remove "${libraryActionMeal.meal.name}" from your saved meals library?`
                    : `Are you sure you want to save "${libraryActionMeal?.meal.name}" to your library?`}
                confirmText={libraryActionMeal?.isSaved ? "Remove" : "Save"}
                type={libraryActionMeal?.isSaved ? "danger" : "info"}
            />
        </div>
    )
}
