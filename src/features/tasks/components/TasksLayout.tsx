'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { KarrFooter } from '@/components/KarrFooter'
import { ShoppingCart, Bell, Calendar, Target, LayoutDashboard, ListTodo, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTasksProfile } from '../contexts/TasksProfileContext'
import { TasksProfileToggle } from './TasksProfileToggle'
import { motion } from 'framer-motion'

import { useTasks } from '../hooks/useTasks'
import { useQueryState } from '@/hooks/useQueryState'

export function TasksLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { activeProfile } = useTasksProfile()
    const [activeTab] = useQueryState('tab', 'todo')

    // Fetch all categories for counts
    const { tasks: todoTasks } = useTasks('todo')
    const { tasks: reminderTasks } = useTasks('reminder')
    const { tasks: groceryTasks } = useTasks('grocery')
    const { tasks: essentialTasks } = useTasks('essential')

    const TABS = [
        { title: 'Tasks', href: '/tasks?tab=todo', icon: ListTodo, color: 'bg-blue-500', tasks: todoTasks, value: 'todo' },
        { title: 'Reminders', href: '/tasks?tab=reminder', icon: Bell, color: 'bg-purple-500', tasks: reminderTasks, value: 'reminder' },
        { title: 'Shopping', href: '/tasks?tab=shopping&shop=grocery', icon: ShoppingCart, color: 'bg-emerald-500', tasks: [...groceryTasks, ...essentialTasks], value: 'shopping' },
    ]

    const isOnCalendar = pathname === '/tasks/calendar'
    const isPlanner = pathname === '/tasks/planner'
    const isMatrix = pathname === '/tasks/matrix'
    const isGroceries = pathname === '/tasks/groceries'
    const isEssentials = pathname === '/tasks/essentials'
    const isSpecialView = isOnCalendar || isPlanner || isMatrix

    return (
        <div className="flex flex-col min-h-screen">
            <header className="px-6 md:px-10 pt-8 md:pt-10 pb-4 shrink-0 z-30">
                <div className="max-w-7xl mx-auto w-full flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div className="space-y-1">
                        <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">Focus & Execution</h2>
                        <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Operations</h1>
                        {!isSpecialView && !isGroceries && !isEssentials && (
                            <div className="pt-2">
                                <TasksProfileToggle />
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Tabs — hidden on special view pages */}
            {!isSpecialView && (
                <div className="px-6 md:px-10 z-10 max-w-7xl mx-auto w-full mb-6">
                    <div className="flex items-center gap-1 p-1 bg-black/[0.03] rounded-2xl border border-black/[0.05] w-fit max-w-full overflow-x-auto no-scrollbar">
                        {TABS.filter(tab => {
                            if (activeProfile === 'business' && tab.value === 'shopping') return false
                            return true
                        }).map(tab => {
                            // Check if current tab is active based on pathname OR query param (tab=...)
                            const isActive = pathname === tab.href || (pathname === '/tasks' && activeTab === tab.value)
                            const Icon = tab.icon
                            const pendingCount = tab.tasks.filter(t => !t.is_completed).length

                            return (
                                <Link
                                    key={tab.href}
                                    href={tab.href}
                                    className={cn(
                                        "flex items-center gap-2 px-5 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-tight transition-all relative whitespace-nowrap",
                                        isActive
                                            ? "text-black"
                                            : "text-black/30 hover:text-black/60"
                                    )}
                                >
                                    <div className={cn("w-1.5 h-1.5 rounded-full", tab.color)} />
                                    <span>{tab.title}</span>
                                    {pendingCount > 0 && (
                                        <span className={cn(
                                            "px-1.5 py-0.5 rounded-md text-[9px]",
                                            isActive ? "bg-black text-white" : "bg-black/5 text-black/30"
                                        )}>
                                            {pendingCount}
                                        </span>
                                    )}
                                    {isActive && (
                                        <motion.div
                                            layoutId="activeTab"
                                            className="absolute inset-0 bg-white rounded-xl shadow-sm -z-10"
                                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                        />
                                    )}
                                </Link>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Main content — flexible container */}
            <div className={cn("flex flex-col min-h-0 overflow-y-auto w-full", !isMatrix && "flex-1")}>
                <div className={cn("mx-auto w-full max-w-7xl px-6 md:px-10", !isMatrix && "flex-1 flex flex-col")}>
                    {children}
                </div>
                <KarrFooter />
            </div>
        </div>
    )
}
