import React, { useRef, useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface DatePickerInputProps {
    value: string
    onChange: (val: string) => void
    className?: string
    placeholder?: string
    readOnly?: boolean
}

export default function DatePickerInput({ value, onChange, className, placeholder, readOnly }: DatePickerInputProps) {
    const inputRef = useRef<HTMLInputElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handlePointerDown = (e: PointerEvent) => {
            if (inputRef.current && document.activeElement === inputRef.current) {
                if (e.target instanceof Node && containerRef.current && !containerRef.current.contains(e.target)) {
                    inputRef.current.blur()
                }
            }
        }
        
        document.addEventListener('pointerdown', handlePointerDown, { capture: true })
        document.addEventListener('scroll', () => inputRef.current?.blur(), { capture: true })
        
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown, { capture: true })
            document.removeEventListener('scroll', () => inputRef.current?.blur(), { capture: true })
        }
    }, [])

    return (
        <div ref={containerRef} className={cn("relative flex items-center w-full group", className)}>
            <input
                ref={inputRef}
                type="date"
                value={value}
                readOnly={readOnly}
                onChange={(e) => {
                    if (readOnly) return
                    onChange(e.target.value)
                    inputRef.current?.blur() // Automatically close on Chrome after picking
                }}
                className={cn(
                    "w-full bg-black/[0.03] border border-black/5 rounded-xl px-4 py-3 text-[12px] font-bold outline-none focus:bg-white transition-all [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:mr-7",
                    value ? "pr-20" : "pr-4",
                    readOnly && "pointer-events-none opacity-80"
                )}
                placeholder={placeholder}
            />
            
            {value && !readOnly && (
                <button
                    type="button"
                    onPointerDown={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        onChange('')
                    }}
                    className="absolute right-3 p-1.5 rounded-full hover:bg-black/10 text-black/30 hover:text-black/60 transition-colors z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Clear date"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            )}
        </div>
    )
}
