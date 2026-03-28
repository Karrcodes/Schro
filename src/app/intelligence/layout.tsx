import { KarrFooter } from '@/components/KarrFooter'

export default function IntelligenceLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-[#FAFAFA] flex flex-col h-screen overflow-hidden">
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="w-full flex-1 flex flex-col min-h-0 max-w-7xl mx-auto px-6 md:px-10 pt-6 md:pt-10 pb-6 md:pb-10">
                    {children}
                </div>
            </div>
        </div>
    )
}
