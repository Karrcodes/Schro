'use client'

import { useEffect } from 'react'

export function GlobalDatePickerFix() {
    useEffect(() => {
        // Force blur on change (when user picks a day)
        const handleChange = (e: Event) => {
            const target = e.target as HTMLInputElement
            if (target && target.tagName === 'INPUT' && target.type === 'date') {
                target.blur()
            }
        }

        // Force blur when clicking anywhere else
        const handlePointerDown = (e: Event) => {
            const active = document.activeElement as HTMLInputElement
            if (active && active.tagName === 'INPUT' && active.type === 'date') {
                if (e.target !== active) {
                    active.blur()
                }
            }
        }

        // Force show picker when clicking the text input field itself
        const handleClick = (e: Event) => {
            const target = e.target as HTMLInputElement
            if (target && target.tagName === 'INPUT' && target.type === 'date') {
                try {
                    target.showPicker?.()
                } catch (err) {}
            }
        }

        document.addEventListener('change', handleChange, true)
        document.addEventListener('pointerdown', handlePointerDown, true)
        document.addEventListener('click', handleClick, true)

        return () => {
            document.removeEventListener('change', handleChange, true)
            document.removeEventListener('pointerdown', handlePointerDown, true)
            document.removeEventListener('click', handleClick, true)
        }
    }, [])

    return null
}
