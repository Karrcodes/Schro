import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'

export async function GET(req: NextRequest) {
    // Google OAuth requires HTTPS or exactly localhost, it rejects raw IPs like 192.168.x.x
    let appUrl = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
    if (appUrl.includes('192.168')) {
        appUrl = appUrl.replace(/192\.168\.\d+\.\d+/, 'localhost');
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
        'https://www.googleapis.com/auth/gmail.readonly'
    ]

    const url = oauth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: scopes,
        prompt: 'consent'
    })

    return NextResponse.redirect(url)
}
