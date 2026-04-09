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
    // 1. Precise check for root vs others
    const isPublic = PUBLIC_ROUTES.some(route => {
        if (route === '/') return pathname === '/'
        return pathname.startsWith(route)
    })
    
    // 2. Extra safety for known protected patterns
    const isProtectedFolder = pathname.startsWith('/system') || 
                               pathname.startsWith('/vault') || 
                               pathname.startsWith('/tasks') ||
                               pathname.startsWith('/finances') ||
                               pathname.startsWith('/goals') ||
                               pathname.startsWith('/intelligence') ||
                               pathname.startsWith('/create')

    if (isProtectedFolder) return false

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

    // 1. Prepare request headers with the current pathname
    const requestHeaders = new Headers(request.headers)
    requestHeaders.set('x-pathname', pathname)

    // 2. Refresh session and get user
    // We pass the original request but we will ensure the response has the headers
    const { supabaseResponse: sessionResponse, user } = await updateSession(request)

    // 3. Create a unified response that carries both the session and our custom headers
    // Using NextResponse.next with the modified request headers is key for layout.tsx to see them via headers()
    const supabaseResponse = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    })

    // Copy any cookies set by updateSession to our new response
    sessionResponse.cookies.getAll().forEach(cookie => {
        supabaseResponse.cookies.set(cookie.name, cookie.value, {
            path: '/',
            domain: cookie.domain,
            maxAge: cookie.maxAge,
            secure: cookie.secure,
            sameSite: cookie.sameSite,
        })
    })

    // 2. Public route handling
    if (isPublicRoute(pathname)) {
        // If logged in and approved, skip past login/landing to control centre
        if (user && (pathname === '/login' || pathname === '/')) {
            const status = await getUserStatus(user.id)
            if (status === 'beta' || status === 'admin') {
                return NextResponse.redirect(new URL('/system/control-centre', request.url))
            }
            // Logged in but not approved -> force to waitlist
            return NextResponse.redirect(new URL('/waitlist', request.url))
        }
        return supabaseResponse
    }

    // 3. Protected route: no user → redirect to login
    if (!user) {
        console.log(`[Middleware] UNAUTHORIZED ACCESS ATTEMPT: ${pathname} -> Redirecting to /login`)
        const loginUrl = new URL('/login', request.url)
        loginUrl.searchParams.set('redirectTo', pathname)
        
        // Wipe any stale cookies to be safe
        const response = NextResponse.redirect(loginUrl)
        response.cookies.delete('sb-hvkoeyxgvvtkcrxnurot-auth-token')
        return response
    }

    // 4. Has session: check approval status for all protected routes
    const status = await getUserStatus(user.id)
    if (!status || status === 'waitlist') {
        if (pathname !== '/waitlist') {
            console.log(`[Middleware] UNAPPROVED USER ATTEMPT: ${pathname} -> Redirecting to /waitlist`)
            return NextResponse.redirect(new URL('/waitlist', request.url))
        }
    }

    return supabaseResponse
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}

