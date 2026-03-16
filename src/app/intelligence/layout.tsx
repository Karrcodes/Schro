import { KarrFooter } from '@/components/KarrFooter'

export default function IntelligenceLayout({ children }: { children: React.ReactNode }) {
    return (
        <div className="bg-[#FAFAFA] flex flex-col h-screen overflow-hidden">
            <div className="flex-1 overflow-hidden">
                <div className="w-full h-full flex flex-col max-w-7xl mx-auto p-6 md:p-10">
                    <div className="flex-1 flex flex-col min-h-0 min-w-0">
                        {children}
                    </div>
                    <div className="mt-4 pt-4 border-t border-black/[0.03]">
                        <KarrFooter />
                    </div>
                </div>
            </div>
        </div>
    )
}
