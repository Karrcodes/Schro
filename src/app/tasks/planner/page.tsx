'use client'

import { TasksLayout } from '@/features/tasks/components/TasksLayout'
import { Rocket, Sparkles, LayoutDashboard } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DayPlannerPage() {
    return (
        <TasksLayout>
            <div className="flex-1 flex flex-col items-center justify-center p-6 bg-[#fafafa]">
                <div className="max-w-md w-full text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <div className="relative inline-block">
                        <div className="w-24 h-24 rounded-[32px] bg-white border border-black/[0.06] flex items-center justify-center shadow-xl relative z-10 group hover:scale-110 transition-transform duration-500">
                            <LayoutDashboard className="w-10 h-10 text-black/20 group-hover:text-black transition-colors duration-500" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-blue-600/10 flex items-center justify-center animate-bounce shadow-sm">
                            <Rocket className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="absolute -bottom-4 -left-4 w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center animate-pulse shadow-sm">
                            <Sparkles className="w-6 h-6 text-amber-600" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-black/[0.03] border border-black/[0.1] rounded-full">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                            <span className="text-[10px] font-mono tracking-widest uppercase text-black/40">Module Status // Restricted Access</span>
                        </div>

                        <h1 className="text-3xl font-black text-black tracking-tight uppercase">Flow Planner</h1>

                        <p className="text-[15px] text-black/50 leading-relaxed max-w-[320px] mx-auto">
                            The next generation of the Action Engine is currently being refined in the Studio.
                            <span className="block mt-4 text-[13px] font-medium text-black italic">Exceptional things take time.</span>
                        </p>
                    </div>

                    <div className="pt-8 flex justify-center">
                        <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-black/10 to-transparent" />
                    </div>

                    <p className="text-[10px] font-mono uppercase tracking-[0.3em] text-black/20">Operational Window Pending</p>
                </div>
            </div>
        </TasksLayout>
    )
}
