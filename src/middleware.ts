import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@supabase/supabase-js'

// Routes that don't require authentication
const PUBLIC_ROUTES = [
    '/',
    '/home',
    '/login',
    '/waitlist',
    '/privacy',
    '/terms',
    '/api/auth',
    '/api/studio',
    '/api/calendar',
    '/api/apple-sync',
    '/api/calendar/apple',
]

function isPublicRoute(pathname: string) {
    const isPublic = PUBLIC_ROUTES.some(route => pathname.startsWith(route))
    if (!isPublic && pathname.includes('api')) {
        console.log(`[Proxy] NON-PUBLIC API ROUTE: ${pathname}`)
    }
    return isPublic
}

async function getUserStatus(userId: string): Promise<string | null> {
    // Use service role key to bypass RLS in middleware
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { data } = await supabase
        .from('user_profiles')
        .select('status')
        .eq('id', userId)
        .single()
    return data?.status ?? null
}

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl
    
    // REDIRECT '/home' to '/'
    if (pathname === '/home') {
        return NextResponse.redirect(new URL('/', request.url))
    }

    // 🚨 EMERGENCY BYPASS FOR APPLE SYNC 🚨
    if (pathname.includes('apple')) {
        return NextResponse.next()
    }

    // Always set x-pathname for use in layouts
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', pathname)

    // Refresh session and get user
    const { supabaseResponse, user } = await updateSession(request)

    // Copy x-pathname to the supabase response headers
    supabaseResponse.headers.set('x-pathname', pathname)

    // If visiting root, redirect based on auth state
    if (pathname === '/') {
        if (!user) {
            // Guests see the landing page
            return supabaseResponse
        }
        // Has session — check if approved
        const status = await getUserStatus(user.id)
        const redirectUrl = (status === 'beta' || status === 'admin')
            ? '/system/control-centre'
            : '/waitlist'
        return NextResponse.redirect(new URL(redirectUrl, request.url))
    }

    // Allow public routes through
    if (isPublicRoute(pathname)) {
        // If already logged in and approved, skip past login page
        if (pathname === '/login' && user) {
            const status = await getUserStatus(user.id)
            if (status === 'beta' || status === 'admin') {
                return NextResponse.redirect(new URL('/system/control-centre', request.url))
            }
            // Logged in but not approved — let them see login or go to waitlist
            return NextResponse.redirect(new URL('/waitlist', request.url))
        }
        // Ensure we don't redirect public API routes to login
        if (pathname.includes('/api/') && (supabaseResponse.status === 307 || supabaseResponse.status === 302)) {
            return NextResponse.next()
        }
        return supabaseResponse
    }

    // Protected route: no user → redirect to login
    if (!user) {
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirectTo', pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Has session but check approval status for all protected routes
    const status = await getUserStatus(user.id)
    if (!status || status === 'waitlist') {
        return NextResponse.redirect(new URL('/waitlist', request.url))
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

