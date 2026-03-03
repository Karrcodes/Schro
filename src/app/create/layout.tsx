import { StudioProvider } from '@/features/studio/context/StudioContext'
import { KarrFooter } from '@/components/KarrFooter'

export default function StudioLayout({ children }: { children: React.ReactNode }) {
    return (
        <StudioProvider>
            <div className="flex flex-col min-h-screen bg-[#FAFAFA] font-outfit">
                {/* Internal scroll container to keep footer at the bottom of content but reachable */}
                <div className="flex-1 flex flex-col min-h-0 overflow-y-auto">
                    <div className="flex-1">
                        {children}
                    </div>
                    <KarrFooter />
                </div>
            </div>
        </StudioProvider>
    )
}
