'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'

/**
 * Syncs a piece of state with a URL query parameter.
 * Perfect for tabs, filters, and views that should persist on reload.
 */
export function useQueryState<T extends string>(
  key: string,
  defaultValue: T
): [T, (newValue: T) => void] {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Initial state from URL or default
  const [state, setState] = useState<T>(() => {
    const param = searchParams.get(key)
    return (param as T) || defaultValue
  })

  // Sync internal state if URL changes externally (e.g. back button)
  useEffect(() => {
    const param = searchParams.get(key)
    const normalizedValue = (param as T) || defaultValue
    if (normalizedValue !== state) {
      setState(normalizedValue)
    }
  }, [searchParams, key, defaultValue, state])

  const setQueryValue = useCallback(
    (newValue: T) => {
      setState(newValue)
      const params = new URLSearchParams(searchParams.toString())
      
      if (newValue === defaultValue) {
        params.delete(key)
      } else {
        params.set(key, newValue)
      }
      
      const query = params.toString()
      const newPath = `${pathname}${query ? `?${query}` : ''}`
      router.replace(newPath, { scroll: false })
    },
    [key, defaultValue, pathname, router, searchParams]
  )

  return [state, setQueryValue]
}

/**
 * Boolean version of useQueryState.
 */
export function useBooleanQueryState(
  key: string,
  defaultValue: boolean = false
): [boolean, (newValue: boolean) => void] {
  const [state, setState] = useQueryState(key, defaultValue ? 'true' : 'false')
  
  const setBool = useCallback((val: boolean) => {
    setState(val ? 'true' : 'false')
  }, [setState])

  return [state === 'true', setBool]
}
