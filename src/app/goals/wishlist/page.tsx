'use client'

import { useGoals } from '@/features/goals/hooks/useGoals'
import GoalsWishlist from '@/features/goals/components/GoalsWishlist'
import { Star, Plus } from 'lucide-react'
import { useState } from 'react'
import { KarrFooter } from '@/components/KarrFooter'

export default function WishlistPage() {
    const { wishlist, loading } = useGoals()
    const [isCreating, setIsCreating] = useState(false)

    if (loading && wishlist.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
                <div className="w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin" />
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-black/20">Manifesting Desires...</p>
            </div>
        )
    }

    return (
        <div className="flex flex-col space-y-12">
            {/* Standard Module Header */}
            <header className="flex flex-col md:flex-row md:items-end justify-between z-10 gap-6 pb-2">
                <div className="space-y-1">
                    <h2 className="text-[11px] font-black text-amber-500 uppercase tracking-[0.3em]">Ambitions & Desires</h2>
                    <h1 className="text-4xl font-black text-black tracking-tighter uppercase grayscale">Wishlist</h1>
                </div>

                <div className="flex items-center gap-3 h-fit mb-1">
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center justify-center gap-2 px-6 py-2.5 bg-black text-white rounded-xl font-bold text-[12px] uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-black/10 group whitespace-nowrap"
                    >
                        <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
                        <span>Manifest Desire</span>
                    </button>
                </div>
            </header>

            <GoalsWishlist 
                items={wishlist} 
                isCreatingExternal={isCreating}
                onCreatingExternalChange={setIsCreating}
            />
        </div>
    )
}
