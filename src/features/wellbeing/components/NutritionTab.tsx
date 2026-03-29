'use client'

import React, { useMemo, useState } from 'react'
import { useWellbeing } from '@/features/wellbeing/contexts/WellbeingContext'
import { MealPlanner } from './MealPlanner'
import { NutritionHeatmap } from './NutritionHeatmap'
import { Flame, Activity, Utensils, Target, Database, Calendar, ChefHat, ActivitySquare, ChevronRight } from 'lucide-react'
import { NutritionFridgeModal } from './NutritionFridgeModal'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { ComboEmojiStack } from './ComboEmojiStack'
import { WellbeingHeader } from './WellbeingHeader'
import { WellbeingControls } from './WellbeingControls'
import { WellbeingTabs } from './WellbeingTabs'

export function NutritionTab() {
    const { macros, dailyNutrition, fridge, library } = useWellbeing()

    const [isFridgeModalOpen, setIsFridgeModalOpen] = useState(false)


    const stats = [
        { label: 'CALORIES', value: Math.max(0, Math.round(macros.calories - dailyNutrition.calories)), unit: 'kcal', icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50' },
        { label: 'PROTEIN', value: Math.max(0, Math.round(macros.protein - dailyNutrition.protein)), unit: 'g', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-50' },
        { label: 'CARBS', value: Math.max(0, Math.round(macros.carbs - dailyNutrition.carbs)), unit: 'g', icon: Utensils, color: 'text-emerald-500', bg: 'bg-emerald-50' },
        { label: 'FAT', value: Math.max(0, Math.round(macros.fat - dailyNutrition.fat)), unit: 'g', icon: Target, color: 'text-amber-500', bg: 'bg-amber-50' },
    ]

    return (
        <div className="flex flex-col space-y-12">
            <WellbeingHeader
                title="Nutrition & Fuel"
                subtitle="Wellbeing Protocol"
                activeColor="text-emerald-500"
            />

            <div className="w-full space-y-12">
                {/* Module Controls Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <WellbeingTabs />
                    <WellbeingControls />
                </div>

                {/* Macro Summary */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {stats.map((stat, i) => (
                        <motion.div
                            key={stat.label}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.1 }}
                            className="bg-white border border-black/5 rounded-[32px] p-6 shadow-sm hover:shadow-md transition-all group"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className={cn("p-3 rounded-2xl", stat.bg)}>
                                    <stat.icon className={cn("w-5 h-5", stat.color)} />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-[10px] font-black text-black/30 uppercase tracking-widest">{stat.label} REMAINING</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-3xl font-black text-black">{stat.value}</span>
                                    <span className="text-[13px] font-bold text-black/40 uppercase">{stat.unit}</span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                    <div className="lg:col-span-2 space-y-8">
                        <MealPlanner />
                    </div>

                    <div className="space-y-6">
                        {/* Nutrition Trends */}
                        <div className="bg-white border border-black/5 rounded-[32px] p-8 space-y-6 w-full h-[340px] xl:h-[390px] overflow-y-auto no-scrollbar">
                            <div className="flex items-center justify-between">
                                <h3 className="text-[11px] font-black text-black/30 uppercase tracking-[0.3em]">Monthly Adherence</h3>
                                <ActivitySquare className="w-4 h-4 text-black/20" />
                            </div>
                            <NutritionHeatmap />
                        </div>
                    </div>
                </div>

                {/* The Fridge (Inventory) */}
                <div className="w-full h-[340px] pb-12">
                        <motion.div
                            whileHover={{ scale: 1.01 }}
                            whileTap={{ scale: 0.99 }}
                            onClick={() => setIsFridgeModalOpen(true)}
                            className="bg-white border border-black/5 rounded-[40px] p-8 h-full cursor-pointer group hover:border-black/10 transition-all hover:shadow-lg flex flex-col md:flex-row gap-8"
                        >
                            <div className="space-y-4 shrink-0 md:w-64 flex flex-col justify-center">
                                <div className="flex items-center gap-3">
                                    <h3 className="text-[11px] font-black text-black/30 uppercase tracking-[0.3em]">The Fridge</h3>
                                    <Database className="w-4 h-4 text-black/20 group-hover:text-black/40 transition-colors" />
                                </div>
                                <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">Meal Prep Inventory</h2>

                                <div className="hidden md:inline-flex items-center gap-2 px-6 py-4 bg-black/5 rounded-2xl text-[10px] font-black text-black/40 uppercase tracking-widest group-hover:bg-black group-hover:text-white transition-all w-fit mt-4">
                                    <span>Open Inventory</span>
                                    <ChevronRight className="w-4 h-4" />
                                </div>
                            </div>

                            {fridge.length === 0 ? (
                                <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-black/[0.02] rounded-[32px] border border-black/5 transition-colors group-hover:bg-black/[0.04]">
                                    <div className="w-16 h-16 rounded-[24px] bg-black/5 flex items-center justify-center">
                                        <ChefHat className="w-8 h-8 text-black/10" />
                                    </div>
                                    <span className="text-[11px] font-black text-black/20 uppercase tracking-[0.2em]">Fridge Empty</span>
                                </div>
                            ) : (
                                <div className="flex-1 flex items-center justify-between px-16 bg-black/[0.02] rounded-[32px] border border-black/5 transition-colors group-hover:bg-black/[0.04]">
                                    <div className="flex -space-x-6 overflow-visible py-3 px-2">
                                        {fridge.slice(0, 5).map((item, i) => {
                                            const meal = library.find(m => m.id === item.mealId)
                                            return (
                                                <div key={item.id} className="transition-transform hover:scale-110 hover:z-10" style={{ zIndex: 5 - i }}>
                                                    <ComboEmojiStack
                                                        isCombo={meal?.isCombo}
                                                        contents={meal?.contents}
                                                        fallbackEmoji={meal?.emoji}
                                                        size="xl"
                                                        className="border-[3px] border-white shadow-xl rounded-3xl"
                                                        itemClassName="rounded-3xl"
                                                    />
                                                </div>
                                            )
                                        })}
                                        {fridge.length > 5 && (
                                            <div className="w-20 h-20 rounded-3xl bg-black/5 border-[3px] border-white flex items-center justify-center text-sm font-black text-black/40 shadow-xl z-0">
                                                +{fridge.length - 5}
                                            </div>
                                        )}
                                    </div>

                                    <div className="w-px h-24 bg-black/10 hidden lg:block mx-12" />

                                    <div className="flex flex-col items-end justify-center">
                                        <div className="text-7xl font-black text-black leading-none tracking-tighter drop-shadow-sm">
                                            {fridge.reduce((acc, item) => acc + item.portions, 0)}
                                        </div>
                                        <div className="text-[11px] font-black text-black/30 uppercase tracking-[0.2em] mt-3 mr-1">
                                            Portions Ready
                                        </div>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </div>


                </div>

            <NutritionFridgeModal
                isOpen={isFridgeModalOpen}
                onClose={() => setIsFridgeModalOpen(false)}
            />
        </div>
    )
}
