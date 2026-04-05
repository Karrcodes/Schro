'use client'

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Plus, Search, Filter } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGoals } from '../hooks/useGoals'
import GoalCreationModal from './GoalCreationModal'
import GoalsViewSwitcher, { type GoalsView } from './GoalsViewSwitcher'
import GoalsMatrix from './GoalsMatrix'
import GoalsRoadmap from './GoalsRoadmap'
import type { Goal, GoalCategory, Aspiration } from '../types/goals.types'
import { KarrFooter } from '@/components/KarrFooter'
import GoalDetailSheet from './GoalDetailSheet'
import AspirationDetailSheet from './AspirationDetailSheet'

export default function GoalsDashboard({ initialLayer = 'destination' }: { initialLayer?: 'destination' | 'visionary' }) {
    const { goals, aspirations, loading, createGoal, toggleMilestone, deleteGoal, updateGoal, updateMilestone, createAspiration, updateAspiration, deleteAspiration, toggleAspirationMilestone, updateAspirationMilestone } = useGoals()
    const [view, setView] = useState<GoalsView>('matrix')
    const [stratLayer, setStratLayer] = useState<'destination' | 'visionary'>(initialLayer)
    const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null)
    const [selectedAspirationId, setSelectedAspirationId] = useState<string | null>(null)
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
    const [editingAspiration, setEditingAspiration] = useState<Aspiration | null>(null)
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [selectedCategory, setSelectedCategory] = useState<GoalCategory | 'all'>('all')

    const filteredItems = useMemo(() => {
        if (stratLayer === 'destination') {
            return goals.filter(goal => {
                const matchesSearch = goal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    goal.category.toLowerCase().includes(searchQuery.toLowerCase())
                const matchesCategory = selectedCategory === 'all' || goal.category === selectedCategory
                return matchesSearch && matchesCategory
            })
        } else {
            return aspirations.filter(asp => {
                const matchesSearch = asp.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                    (asp.description?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
                    asp.category.toLowerCase().includes(searchQuery.toLowerCase())
                const matchesCategory = selectedCategory === 'all' || asp.category === selectedCategory
                return matchesSearch && matchesCategory
            })
        }
    }, [stratLayer, goals, aspirations, searchQuery, selectedCategory])

    const selectedGoal = useMemo(() =>
        goals.find(g => g.id === selectedGoalId) || null,
        [goals, selectedGoalId])
    
    const selectedAspiration = useMemo(() =>
        aspirations.find(a => a.id === selectedAspirationId) || null,
        [aspirations, selectedAspirationId])

    const handleEditGoal = (goal: Goal) => {
        setEditingGoal(goal)
        setEditingAspiration(null)
        setIsCreateModalOpen(true)
        setSelectedGoalId(null)
    }

    const handleEditAspiration = (aspiration: Aspiration) => {
        setEditingAspiration(aspiration)
        setEditingGoal(null)
        setIsCreateModalOpen(true)
        setSelectedAspirationId(null)
    }

    const handleCloseModal = () => {
        setIsCreateModalOpen(false)
        setEditingGoal(null)
        setEditingAspiration(null)
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
                    <h2 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em]">Ambitions</h2>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Goals</h1>
                </div>

                <div className="flex items-center gap-3 h-fit mb-1">
                    <GoalsViewSwitcher currentView={view} onViewChange={setView} />

                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl font-bold text-[12px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 group whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                        <span className="hidden xs:block">{stratLayer === 'destination' ? 'New Initiative' : 'Make a Wish'}</span>
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
                        <div className="flex flex-col gap-6 bg-white border border-black/[0.06] p-6 md:p-8 rounded-[32px] shadow-sm">
                            {/* Strategic Layer Toggle */}
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-black/[0.04]">
                                <div className="space-y-1">
                                    <h3 className="text-[15px] font-bold text-black tracking-tight">Strategic Architecture</h3>
                                    <p className="text-[11px] font-medium text-black/30">Declare your absolute desires; the dreams are listening.</p>
                                </div>
                                <div className="flex p-1 bg-black/[0.03] rounded-xl border border-black/5">
                                    <button 
                                        onClick={() => setStratLayer('destination')}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                                            stratLayer === 'destination' ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/50"
                                        )}
                                    >
                                        Targets
                                    </button>
                                    <button 
                                        onClick={() => setStratLayer('visionary')}
                                        className={cn(
                                            "px-4 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest transition-all",
                                            stratLayer === 'visionary' ? "bg-white text-black shadow-sm" : "text-black/30 hover:text-black/50"
                                        )}
                                    >
                                        Dreams
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1 text-black">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-black/20" />
                                    <input 
                                        type="text" 
                                        placeholder={`Search ${stratLayer === 'destination' ? 'goals' : 'dreams'}...`}
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-11 pr-4 py-4 bg-black/[0.02] border border-black/5 rounded-2xl text-[13px] font-medium outline-none focus:bg-white focus:border-black/10 transition-all"
                                    />
                                </div>
                                 <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 md:pb-0 scroll-smooth">
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
                        </div>
                    )}

                    {/* Viewport */}
                    <motion.div
                        key={`${view}-${stratLayer}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3 }}
                        className={view === 'timeline' ? "flex-1 min-h-[600px]" : ""}
                    >
                        {view === 'matrix' && (
                            <GoalsMatrix 
                                items={filteredItems} 
                                onItemClick={item => {
                                    if ('horizon' in item) setSelectedAspirationId(item.id)
                                    else setSelectedGoalId(item.id)
                                }} 
                            />
                        )}
                        {view === 'timeline' && (
                            <GoalsRoadmap 
                                goals={filteredItems} 
                                onGoalClick={item => {
                                    if ('horizon' in item) setSelectedAspirationId(item.id)
                                    else setSelectedGoalId(item.id)
                                }} 
                            />
                        )}
                    </motion.div>
                </div>

            {/* Overlays */}
            <GoalCreationModal
                isOpen={isCreateModalOpen}
                initialGoal={editingGoal}
                initialAspiration={editingAspiration}
                onClose={handleCloseModal}
                onSave={async (data, file, id) => {
                    if (id) {
                        await updateGoal(id, data, file)
                    } else {
                        await createGoal(data, file)
                    }
                }}
                onSaveAspiration={async (data, file, id) => {
                    if (id) {
                        await updateAspiration(id, data, file)
                    } else {
                        await createAspiration(data, file)
                    }
                }}
            />

            <GoalDetailSheet
                goal={selectedGoal}
                isOpen={!!selectedGoalId}
                onClose={() => setSelectedGoalId(null)}
                onToggleMilestone={toggleMilestone}
                onUpdateMilestone={updateMilestone}
                onDeleteGoal={deleteGoal}
                onEdit={handleEditGoal}
            />

            <AspirationDetailSheet
                aspiration={selectedAspiration}
                isOpen={!!selectedAspirationId}
                onClose={() => setSelectedAspirationId(null)}
                onToggleMilestone={toggleAspirationMilestone}
                onUpdateMilestone={updateAspirationMilestone}
                onDelete={deleteAspiration}
                onEdit={handleEditAspiration}
            />
        </div>
    )
}
