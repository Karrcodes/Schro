'use client'

import React from 'react'
import { useTasksProfile } from '../contexts/TasksProfileContext'
import { cn } from '@/lib/utils'

export function TasksProfileToggle() {
    const { activeProfile, setActiveProfile } = useTasksProfile()

    return (
        <div className="flex bg-black/[0.04] p-0.5 rounded-xl border border-black/[0.06] items-center w-fit">
            <button
                onClick={() => setActiveProfile('personal')}
                className={cn(
                    "px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-[0.05em] transition-all",
                    activeProfile === 'personal' ? 'bg-white text-black shadow-sm' : 'text-black/40 hover:text-black/60'
                )}
            >
                Personal
            </button>
            <button
                onClick={() => setActiveProfile('business')}
                className={cn(
                    "px-5 py-2 rounded-lg text-[11px] font-black uppercase tracking-[0.05em] transition-all",
                    activeProfile === 'business' ? 'bg-white text-black shadow-sm' : 'text-black/40 hover:text-black/60'
                )}
            >
                Business
            </button>
        </div>
    )
}
