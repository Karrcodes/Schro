'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTasks } from '../hooks/useTasks'
import { useQueryState, useBooleanQueryState } from '@/hooks/useQueryState'
import { cn } from '@/lib/utils'
import { KarrFooter } from '@/components/KarrFooter'
import { TaskList } from './TaskList'
import { useTasksProfile } from '../contexts/TasksProfileContext'
import { TasksProfileToggle } from './TasksProfileToggle'
import Link from 'next/link'
import { LayoutDashboard, Target, ListTodo, Bell, ShoppingCart, Package } from 'lucide-react'


export function TasksDashboard() {
    return <TasksDashboardContent />
}

function TasksDashboardContent() {
    const [activeTab, setActiveTab] = useQueryState<'todo' | 'reminder' | 'shopping'>('tab', 'todo')
    const [shoppingTab, setShoppingTab] = useQueryState<'grocery' | 'essential'>('shop', 'grocery')
    const { activeProfile } = useTasksProfile()

    // Fetch all categories at top level for counts and to comply with Hooks rules
    const { tasks: todoTasks } = useTasks('todo')
    const { tasks: reminderTasks } = useTasks('reminder')
    const { tasks: groceryTasks } = useTasks('grocery')
    const { tasks: essentialTasks } = useTasks('essential')

    const TABS = [
        { label: 'Tasks', value: 'todo' as const, dot: 'bg-blue-500', tasks: todoTasks },
        { label: 'Reminders', value: 'reminder' as const, dot: 'bg-purple-500', tasks: reminderTasks },
        { label: 'Shopping', value: 'shopping' as const, dot: 'bg-emerald-500', tasks: [...groceryTasks, ...essentialTasks] },
    ].filter(tab => !(activeProfile === 'business' && tab.value === 'shopping'))

    return (
        <div className="flex flex-col min-h-screen bg-[#fafafa]">
            {/* Standard Module Header */}
            <header className="px-6 md:px-10 pt-8 md:pt-10 pb-4 shrink-0 z-30">
                <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">Focus & Execution</h2>
                        <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Operations</h1>
                    </div>

                </div>
            </header>

            <main className="flex-1 w-full px-6 md:px-10 pt-4 pb-8 md:pb-10">
                <div className="max-w-7xl mx-auto space-y-8">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <div className="flex flex-col gap-4">
                                {/* Content-Style Focus Tabs */}
                                <div className="flex items-center gap-1 p-1 bg-black/[0.03] rounded-2xl w-fit max-w-full overflow-x-auto no-scrollbar">
                                    {TABS.map((tab) => {
                                        const isActive = activeTab === tab.value
                                        const pendingCount = tab.tasks.filter(t => !t.is_completed).length

                                        return (
                                            <button
                                                key={tab.value}
                                                onClick={() => setActiveTab(tab.value)}
                                                className={cn(
                                                    "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all relative whitespace-nowrap z-10",
                                                    isActive
                                                        ? "text-black"
                                                        : "text-black/30 hover:text-black/60"
                                                )}
                                            >
                                                {isActive && (
                                                    <motion.div
                                                        layoutId="activeTabHighlight"
                                                        className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10"
                                                        transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                                    />
                                                )}
                                                <div className={cn("w-1.5 h-1.5 rounded-full", tab.dot)} />
                                                {tab.label}
                                                {pendingCount > 0 && (
                                                    <span className={cn(
                                                        "px-1.5 py-0.5 rounded-md text-[9px]",
                                                        isActive ? "bg-black text-white" : "bg-black/5 text-black/30"
                                                    )}>
                                                        {pendingCount}
                                                    </span>
                                                )}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {activeTab !== 'shopping' ? (
                                <TasksProfileToggle />
                            ) : (
                                <div className="flex bg-black/[0.04] p-0.5 rounded-xl border border-black/[0.06] items-center w-fit relative">
                                    <button 
                                        onClick={() => setShoppingTab('grocery')}
                                        className={cn(
                                            "px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-[0.05em] transition-all relative z-10",
                                            shoppingTab === 'grocery' ? "text-black" : "text-black/40 hover:text-black/60"
                                        )}
                                    >
                                        {shoppingTab === 'grocery' && (
                                            <motion.div
                                                layoutId="shoppingTabHighlight"
                                                className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                                                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                            />
                                        )}
                                        Groceries
                                    </button>
                                    <button 
                                        onClick={() => setShoppingTab('essential')}
                                        className={cn(
                                            "px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-[0.05em] transition-all relative z-10",
                                            shoppingTab === 'essential' ? "text-black" : "text-black/40 hover:text-black/60"
                                        )}
                                    >
                                        {shoppingTab === 'essential' && (
                                            <motion.div
                                                layoutId="shoppingTabHighlight"
                                                className="absolute inset-0 bg-white rounded-lg shadow-sm -z-10"
                                                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
                                            />
                                        )}
                                        Essentials
                                    </button>
                                </div>
                            )}
                        </div>

                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab === 'shopping' ? shoppingTab : activeTab}
                                initial={{ opacity: 0, y: 4, filter: 'blur(4px)' }}
                                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                exit={{ opacity: 0, y: -4, filter: 'blur(4px)' }}
                                transition={{ duration: 0.2, ease: "easeOut" }}
                            >
                                <TaskList 
                                    category={activeTab === 'shopping' ? shoppingTab : activeTab} 
                                />
                            </motion.div>
                        </AnimatePresence>
                </div>
            </main>

            <KarrFooter />
        </div>
    )
}
