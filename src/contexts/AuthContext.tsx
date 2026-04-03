'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User, Session } from '@supabase/supabase-js'

interface UserProfile {
    id: string
    email: string
    display_name: string
    avatar_url: string | null
    status: 'waitlist' | 'beta' | 'admin'
    modules_enabled: Record<string, boolean>
    vault_pin?: string | null
    vault_locked?: boolean
}

interface AuthContextType {
    user: User | null
    profile: UserProfile | null
    session: Session | null
    isAdmin: boolean
    isBeta: boolean
    isApproved: boolean
    signOut: () => Promise<void>
    loading: boolean
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    session: null,
    isAdmin: false,
    isBeta: false,
    isApproved: false,
    signOut: async () => { },
    loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const supabase = createClient()
    const [user, setUser] = useState<User | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [session, setSession] = useState<Session | null>(null)
    const [loading, setLoading] = useState(true)

    async function fetchProfile(userId: string) {
        const { data } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single()
        setProfile(data)
    }

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
            }
            setLoading(false)
        })

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
            setSession(session)
            setUser(session?.user ?? null)
            if (session?.user) {
                fetchProfile(session.user.id)
            } else {
                setProfile(null)
            }
        })

        return () => subscription.unsubscribe()
    }, [])

    const signOut = async () => {
        await supabase.auth.signOut()
        window.location.href = '/login'
    }

    const isAdmin = profile?.status === 'admin'
    const isBeta = profile?.status === 'beta' || isAdmin
    const isApproved = isBeta || isAdmin

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            session,
            isAdmin,
            isBeta,
            isApproved,
            signOut,
            loading,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

export const useAuth = () => useContext(AuthContext)
