'use client'

import * as React from 'react'
import { KarrFooter } from '@/components/KarrFooter'

export default function VaultLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-[#FAFAFA] flex flex-col min-h-screen">
            <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                {/* Tab Content */}
                <div className="flex-1 p-6 md:p-10">
                    <div className="w-full h-full flex flex-col max-w-7xl mx-auto space-y-12">
                        {children}
                    </div>
                </div>
                <KarrFooter />
            </div>
        </div>
    )
}
