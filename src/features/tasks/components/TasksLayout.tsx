'use client'

import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { KarrFooter } from '@/components/KarrFooter'
import { ShoppingCart, Bell, Calendar, Target, LayoutDashboard, ListTodo } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTasksProfile } from '../contexts/TasksProfileContext'
import { TasksProfileToggle } from './TasksProfileToggle'
import { motion } from 'framer-motion'

const TABS = [
    { title: 'Tasks', href: '/tasks/todo', icon: ListTodo },
    { title: 'Reminders', href: '/tasks/reminders', icon: Bell },
    { title: 'Groceries', href: '/tasks/groceries', icon: ShoppingCart },
]


export function TasksLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname()
    const router = useRouter()
    const { activeProfile } = useTasksProfile()

    const isOnCalendar = pathname === '/tasks/calendar'
    const isPlanner = pathname === '/tasks/planner'
    const isMatrix = pathname === '/tasks/matrix'
    const isGroceries = pathname === '/tasks/groceries'
    const isSpecialView = isOnCalendar || isPlanner || isMatrix

    return (
        <div className="flex flex-col min-h-screen">
            {/* Standard Module Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between px-6 pt-8 pb-4 md:px-10 md:pt-10 md:pb-8 z-10 gap-6 max-w-7xl mx-auto w-full">
                <div className="space-y-1">
                    <h2 className="text-[11px] font-black text-blue-500 uppercase tracking-[0.3em]">Focus & Execution</h2>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Operations</h1>
                    {!isOnCalendar && !isPlanner && !isGroceries && (
                        <div className="pt-2">
                            <TasksProfileToggle />
                        </div>
                    )}
                </div>

            </div>

            {/* Tabs — hidden on special view pages */}
            {!isSpecialView && (
                <div className="px-6 md:px-10 z-10 max-w-7xl mx-auto w-full mb-6">
                    <div className="flex items-center gap-1 p-1 bg-black/[0.03] rounded-2xl border border-black/[0.05] w-fit max-w-full overflow-x-auto no-scrollbar">
                        {TABS.filter(tab => !(activeProfile === 'business' && tab.href.includes('groceries'))).map(tab => {
                            const isActive = pathname === tab.href
                            const Icon = tab.icon
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
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{tab.title}</span>
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
                <div className="max-w-7xl mx-auto w-full px-6 md:px-10 pb-10">
                    <KarrFooter />
                </div>
            </div>
        </div>
    )
}
