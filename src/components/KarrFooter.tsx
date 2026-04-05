import { cn } from '@/lib/utils'
import Image from 'next/image'

export function KarrFooter({ dark }: { dark?: boolean }) {
    return (
        <div className="pt-1 pb-8 text-center select-none w-full mt-auto flex flex-col items-center gap-1">
            <Image 
                src="/schro-logo-text.svg" 
                alt="Schrö" 
                width={28} 
                height={9} 
                className={cn(
                    "opacity-40 hover:opacity-100 transition-opacity",
                    dark ? "invert brightness-0 opacity-20" : "grayscale opacity-25"
                )} 
            />
            <p className={cn(
                "text-[10px] mt-1",
                dark ? "text-white/5" : "text-black/15"
            )}>v1.2.0 • Studio Karrtesian</p>
        </div>
    )
}

