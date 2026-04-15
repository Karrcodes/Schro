import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'

export function createClient(): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    // During Tauri static export, env vars aren't available at build time.
    // Return a safe no-op stub so SSR prerendering doesn't throw.
    if (!url || !key) {
        // Only log this warning in development/browser at runtime, not during static build/prerender
        if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
            console.warn('Supabase env vars missing. Returning stub client.')
        }
        const stub: any = {
            from: () => stub,
            select: () => stub,
            eq: () => stub,
            order: () => stub,
            single: () => stub,
            insert: () => stub,
            update: () => stub,
            delete: () => stub,
            upsert: () => stub,
            match: () => stub,
            filter: () => stub,
            range: () => stub,
            limit: () => stub,
            then: (onfulfilled: any) => Promise.resolve({ data: [], error: null }).then(onfulfilled),
            storage: { from: () => stub },
            upload: async () => ({ data: {}, error: null }),
            getPublicUrl: () => ({ data: { publicUrl: '/placeholder-image.png' } }),
            channel: () => ({ on: () => ({ subscribe: () => ({}) }), subscribe: () => ({}) }),
            removeChannel: () => ({}),
            auth: {
                getSession: async () => ({ data: { session: null }, error: null }),
                getUser: async () => ({ data: { user: null }, error: null }),
                onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
                signOut: async () => ({ error: null }),
            },
        }
        return stub as unknown as SupabaseClient
    }

    return createBrowserClient(url, key)
}
