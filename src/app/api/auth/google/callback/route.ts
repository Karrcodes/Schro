export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

export async function GET(req: NextRequest) {
    // Google OAuth requires HTTPS or exactly localhost, it rejects raw IPs like 192.168.x.x
    // Priority: use current request origin to support Ngrok/Local/Production dynamically
    let appUrl = req.nextUrl.origin;
    
    // If the origin is a local network IP, enforce localhost mapping (or use current if preferred)
    if (appUrl.includes('192.168') || appUrl.includes('10.') || appUrl.includes('172.')) {
        appUrl = appUrl.replace(/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)/, 'localhost');
    }
    
    console.log('[Google Callback] Incoming callback using base URL:', appUrl)
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${appUrl}/api/auth/google/callback`
    )

    const searchParams = req.nextUrl.searchParams
    const code = searchParams.get('code')

    if (!code) {
        return NextResponse.json({ error: 'No code provided' }, { status: 400 })
    }

    try {
        const { tokens } = await oauth2Client.getToken(code)

        // Store tokens securely in Supabase
        const { error } = await supabase.from('sys_auth_tokens').upsert({
            user_id: 'karr',
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            expiry_date: tokens.expiry_date,
            token_type: tokens.token_type,
            scope: tokens.scope,
            updated_at: new Date().toISOString()
        })

        if (error) throw error

        const state = searchParams.get('state') || '/intelligence'
        // Ensure state is a relative path or an absolute URL on the same origin
        const redirectUrl = state.startsWith('http') ? state : `${appUrl}${state}`
        
        return NextResponse.redirect(`${redirectUrl}${redirectUrl.includes('?') ? '&' : '?'}sync=success`)
    } catch (err: any) {
        console.error('[Google Auth Callback Error]', err)
        const state = searchParams.get('state') || '/intelligence'
        const redirectUrl = state.startsWith('http') ? state : `${appUrl}${state}`
        return NextResponse.redirect(`${redirectUrl}${redirectUrl.includes('?') ? '&' : '?'}sync=error`)
    }
}
