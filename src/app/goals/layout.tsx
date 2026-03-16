'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'
import { KarrFooter } from '@/components/KarrFooter'

export default function GoalsLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-[#FAFAFA] flex flex-col min-h-screen">
            <div className="flex-1 overflow-y-auto bg-[#fafafa]">
                {/* Tab Content */}
                <div className="p-6 md:p-10">
                    <div className="w-full h-full flex flex-col max-w-7xl mx-auto space-y-12">
                        {children}
                        <div className="mt-auto pt-10">
                            <KarrFooter />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
