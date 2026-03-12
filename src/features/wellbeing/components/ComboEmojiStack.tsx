import React from 'react'
import { cn } from '@/lib/utils'

interface ComboEmojiStackProps {
    isCombo?: boolean
    contents?: any[] // Support both LibraryMeal contents and MealLog contents
    fallbackEmoji?: string
    className?: string
    itemClassName?: string
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

export function ComboEmojiStack({ 
    isCombo, 
    contents, 
    fallbackEmoji = '🍽️', 
    className,
    itemClassName,
    size = 'md' 
}: ComboEmojiStackProps) {
    
    // Default styles for the container and items
    const styles = {
        xs: { container: 'w-6 h-6', item: 'w-5 h-5 text-[10px]', overlap: '-space-x-3' },
        sm: { container: 'w-8 h-8', item: 'w-7 h-7 text-sm', overlap: '-space-x-4' },
        md: { container: 'w-12 h-12', item: 'w-10 h-10 text-2xl', overlap: '-space-x-5' },
        lg: { container: 'w-16 h-16', item: 'w-14 h-14 text-4xl', overlap: '-space-x-7' },
        xl: { container: 'w-20 h-20', item: 'w-18 h-18 text-5xl', overlap: '-space-x-8' }
    }

    const currentStyle = styles[size]

    if (!isCombo || !contents || contents.length === 0) {
        return (
            <div className={cn(
                currentStyle.container, 
                "bg-white rounded-2xl flex items-center justify-center shadow-sm text-2xl", 
                size === 'xs' && "text-[10px]",
                size === 'sm' && "text-sm",
                size === 'lg' && "text-4xl",
                size === 'xl' && "text-5xl",
                className
            )}>
                {fallbackEmoji}
            </div>
        )
    }

    return (
        <div className={cn("flex items-center", currentStyle.overlap, className)}>
            {contents.slice(0, 3).map((content, i) => {
                const emoji = content.meal?.emoji || content.emoji || '🍽️'
                return (
                    <div 
                        key={i} 
                        className={cn(
                            currentStyle.item,
                            "rounded-2xl bg-white border-2 border-white shadow-sm flex items-center justify-center z-[1]",
                            itemClassName
                        )}
                        style={{ zIndex: 3 - i }}
                    >
                        {emoji}
                    </div>
                )
            })}
        </div>
    )
}
