'use client'

import { useState } from 'react'
import { useTasks } from '../hooks/useTasks'
import { cn } from '@/lib/utils'
import { KarrFooter } from '@/components/KarrFooter'
import { TaskList } from './TaskList'
import { useTasksProfile } from '../contexts/TasksProfileContext'
import { TasksProfileToggle } from './TasksProfileToggle'
import Link from 'next/link'
import { LayoutDashboard, Target, Calendar } from 'lucide-react'
import { motion } from 'framer-motion'


export function TasksDashboard() {
    return <TasksDashboardContent />
}

function TasksDashboardContent() {
    const [activeTab, setActiveTab] = useState<'todo' | 'reminder' | 'grocery'>('todo')
    const { activeProfile } = useTasksProfile()

    // Fetch all categories at top level for counts and to comply with Hooks rules
    const { tasks: todoTasks } = useTasks('todo')
    const { tasks: reminderTasks } = useTasks('reminder')
    const { tasks: groceryTasks } = useTasks('grocery')

    const TABS = [
        { label: 'Deployment', value: 'todo' as const, dot: 'bg-blue-500', tasks: todoTasks },
        { label: 'Reminders', value: 'reminder' as const, dot: 'bg-purple-500', tasks: reminderTasks },
        { label: 'Groceries', value: 'grocery' as const, dot: 'bg-emerald-500', tasks: groceryTasks },
    ].filter(tab => !(activeProfile === 'business' && tab.value === 'grocery'))

    return (
        <div className="flex flex-col min-h-screen bg-[#fafafa]">
            {/* Standard Module Header */}
            <header className="px-6 md:px-10 py-8 md:py-10 shrink-0 z-30">
                <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">Operations Protocol</h2>
                        <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Focus & Execution</h1>
                    </div>

                    <div className="flex items-center gap-4 mb-2">
                        {/* Matrix */}
                        <Link
                            href="/tasks/matrix"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all bg-black/[0.03] border border-black/[0.05] text-black/40 hover:text-black hover:bg-black/[0.05] whitespace-nowrap"
                        >
                            <Target className="w-3.5 h-3.5" />
                            <span>Matrix</span>
                        </Link>

                        {/* Calendar */}
                        <Link
                            href="/tasks/calendar"
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all bg-black/[0.03] border border-black/[0.05] text-black/40 hover:text-black hover:bg-black/[0.05] whitespace-nowrap"
                        >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Calendar</span>
                        </Link>

                        {/* Planner */}
                        <div
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all bg-black/[0.01] border border-black/[0.03] text-black/20 whitespace-nowrap cursor-not-allowed"
                        >
                            <LayoutDashboard className="w-3.5 h-3.5" />
                            <span>Planner (Coming Soon)</span>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full px-6 md:px-10 py-8 md:py-10">
                <div className="max-w-7xl mx-auto space-y-10">
                    {/* Controls Row: Tabs & Toggle */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
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
                                            "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all relative whitespace-nowrap",
                                            isActive
                                                ? "bg-white text-black shadow-sm"
                                                : "text-black/30 hover:text-black/60"
                                        )}
                                    >
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

                        <TasksProfileToggle />
                    </div>

                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                        <TaskList category={activeTab} />
                    </div>
                </div>
            </main>

            <KarrFooter />
        </div>
    )
}
