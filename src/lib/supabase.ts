import { createBrowserClient } from '@supabase/ssr'
import { SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Gracefully handle missing env vars — UI will render but data won't load
// until you create .env.local with real credentials
let supabaseInstance: SupabaseClient

if (supabaseUrl && supabaseAnonKey) {
    supabaseInstance = createBrowserClient(supabaseUrl, supabaseAnonKey)
} else {
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
        // Thenable for await
        then: (onfulfilled: any) => Promise.resolve({ data: [], error: null }).then(onfulfilled),
        storage: {
            from: () => stub,
        },
        upload: async () => ({ data: {}, error: null }),
        getPublicUrl: () => ({ data: { publicUrl: '/placeholder-image.png' } }),
        channel: () => ({
            on: () => ({
                subscribe: () => ({})
            }),
            subscribe: () => ({})
        }),
        removeChannel: () => ({}),
        auth: {
            getSession: async () => ({ data: { session: null }, error: null }),
            getUser: async () => ({ data: { user: null }, error: null }),
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } }),
        }
    }
    supabaseInstance = stub as unknown as SupabaseClient
}



export const supabase = supabaseInstance

