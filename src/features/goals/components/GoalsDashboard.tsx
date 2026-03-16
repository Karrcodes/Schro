'use client'

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Wallet, Briefcase, Heart, User, LayoutGrid, Image as ImageIcon, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGoals } from '../hooks/useGoals'
import GoalCreationModal from './GoalCreationModal'
import GoalsViewSwitcher, { type GoalsView } from './GoalsViewSwitcher'
import GoalsMatrix from './GoalsMatrix'
import GoalsRoadmap from './GoalsRoadmap'
import GoalsVisionBoard from './GoalsVisionBoard'
import GoalDetailSheet from './GoalDetailSheet'
import GoalsWishlist from './GoalsWishlist'
import type { Goal, GoalCategory } from '../types/goals.types'
import { KarrFooter } from '@/components/KarrFooter'

export default function GoalsDashboard() {
    const { goals, wishlist, loading, createGoal, toggleMilestone, deleteGoal, updateGoal, updateMilestone } = useGoals()
    const [view, setView] = useState<GoalsView>('matrix')
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<GoalCategory | 'all'>('all')

    const selectedGoal = useMemo(() =>
        goals.find(g => g.id === selectedGoalId) || null,
        [goals, selectedGoalId])

    const filteredGoals = useMemo(() => {
        return goals.filter(goal => {
            const matchesSearch = goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                goal.category.toLowerCase().includes(searchQuery.toLowerCase())
            const matchesCategory = selectedCategory === 'all' || goal.category === selectedCategory
            return matchesSearch && matchesCategory
        })
    }, [goals, searchQuery, selectedCategory])

    const handleEditGoal = (goal: Goal) => {
        setEditingGoal(goal)
        setIsCreateModalOpen(true)
        setSelectedGoalId(null)
    }

    const handleCloseModal = () => {
        setIsCreateModalOpen(false)
        setEditingGoal(null)
    }

    if (loading && goals.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/20">Parsing Strategy...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col space-y-12">
            {/* Standard Module Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between z-10 gap-6 pb-2">
                <div className="space-y-1">
                    <h2 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em]">Strategy Protocol</h2>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Goals Registry</h1>
                </div>

                <div className="flex items-center gap-3 h-fit mb-1">
                    <GoalsViewSwitcher currentView={view} onViewChange={setView} />

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl font-bold text-[12px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 group whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                        <span className="hidden xs:block">Initiate Mission</span>
                    </button>
                </div>
            </header>

            {/* Workspace */}
            <div className={cn(
                "w-full space-y-12",
                view === 'timeline' ? "h-full flex flex-col" : ""
            )}>

                    {/* Toolbar — hidden for roadmap view */}
                    {view !== 'timeline' && (
                        <div className="flex flex-col gap-4 bg-white border border-black/[0.06] p-4 md:p-5 rounded-2xl shadow-sm">
                            <div className="relative w-full text-black">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                <input
                                    type="text"
                                    placeholder="Search strategy..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-black/[0.02] border-transparent focus:bg-white focus:border-black/5 rounded-xl pl-11 pr-4 py-3 md:py-3.5 text-sm font-bold placeholder:text-black/20 outline-none transition-all placeholder:font-bold"
                                />
                            </div>
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar w-full pb-1 md:pb-0 scroll-smooth">
                                <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-black/30 border-r border-black/5 mr-1 shrink-0">
                                    <Filter className="w-3.5 h-3.5" />
                                    Filter
                                </div>
                                <button
                                    onClick={() => setSelectedCategory('all')}
                                    className={cn(
                                        "whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border shrink-0",
                                        selectedCategory === 'all'
                                            ? "bg-black text-white border-black"
                                            : "bg-black/[0.03] text-black/40 border-transparent hover:bg-black hover:text-white"
                                    )}
                                >
                                    All
                                </button>
                                {(['finance', 'career', 'health', 'personal'] as const).map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={cn(
                                            "whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border shrink-0",
                                            selectedCategory === cat
                                                ? "bg-black text-white border-black"
                                                : "bg-black/[0.03] text-black/40 border-transparent hover:bg-black hover:text-white"
                                        )}
                                    >
                                        {cat}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Viewport */}
                    <motion.div
                        key={view}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={view === 'timeline' ? "flex-1 min-h-[600px]" : ""}
                    >
                        {view === 'matrix' && <GoalsMatrix goals={filteredGoals} onGoalClick={g => setSelectedGoalId(g.id)} />}
                        {view === 'timeline' && <GoalsRoadmap goals={filteredGoals} onGoalClick={g => setSelectedGoalId(g.id)} />}
                        {view === 'vision' && <GoalsVisionBoard goals={filteredGoals} onGoalClick={g => setSelectedGoalId(g.id)} />}
                    </motion.div>
                </div>

            {/* Overlays */}
            <GoalCreationModal
                isOpen={isCreateModalOpen}
                initialGoal={editingGoal}
                onClose={handleCloseModal}
                onSave={async (data, file, id) => {
                    if (id) {
                        await updateGoal(id, data, file)
                    } else {
                        await createGoal(data, file)
                    }
                }}
            />

            {selectedGoal && (
                <GoalDetailSheet
                    goal={selectedGoal}
                    isOpen={!!selectedGoal}
                    onClose={() => setSelectedGoalId(null)}
                    onToggleMilestone={toggleMilestone}
                    onUpdateMilestone={updateMilestone}
                    onDeleteGoal={deleteGoal}
                    onEdit={handleEditGoal}
                />
            )}
        </div>
    )
}
