import { google } from 'googleapis'
import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const { origin } = new URL(req.url)
    let appUrl = origin

    // If the origin is a local network IP, enforce localhost mapping (or use current if preferred)
    if (appUrl.includes('192.168') || appUrl.includes('10.') || appUrl.includes('172.')) {
        appUrl = appUrl.replace(/(192\.168\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2[0-9]|3[0-1])\.\d+\.\d+)/, 'localhost');
    }
    
    console.log('[Google Auth] Initiating auth using base URL:', appUrl)
    
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        `${appUrl}/api/auth/google/callback`
    )
    
    const scopes = [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/drive.metadata.readonly',
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/calendar.readonly',
        'https://www.googleapis.com/auth/calendar.events'
    ]

    const state = req.nextUrl.searchParams.get('redirect') || '/intelligence'

    const authUrl = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        state: state,
        prompt: 'consent'
    })

    return NextResponse.redirect(authUrl)
}
