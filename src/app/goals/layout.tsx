'use client'

import * as React from 'react'
import { GoalsProvider } from '@/features/goals/contexts/GoalsContext'
import { KarrFooter } from '@/components/KarrFooter'

export default function GoalsLayout({ children }: { children: React.ReactNode }) {
    return (
        <GoalsProvider>
            <div className="flex flex-col min-h-screen bg-[#FAFAFA]">
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                    <div className="flex-1 p-6 md:p-10">
                        <div className="max-w-7xl mx-auto w-full space-y-8">
                            {children}
                        </div>
                    </div>
                    <KarrFooter />
                </div>
            </div>
        </GoalsProvider>
    )
}
