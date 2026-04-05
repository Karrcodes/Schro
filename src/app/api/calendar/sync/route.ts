import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

export async function GET(req: NextRequest) {
    try {
        // 1. Fetch User Tokens
        const { data: tokenData, error: tokenError } = await supabase
            .from('sys_auth_tokens')
            .select('*')
            .eq('user_id', 'karr')
            .single()

        if (tokenError || !tokenData) {
            return NextResponse.json({ error: 'OAuth tokens not found. Please connect Google.' }, { status: 400 })
        }

        const oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        )

        oauth2Client.setCredentials({
            access_token: tokenData.access_token,
            refresh_token: tokenData.refresh_token,
            expiry_date: tokenData.expiry_date
        })

        // Handle token refresh
        oauth2Client.on('tokens', async (tokens) => {
            console.log('[Calendar Sync] Refreshing tokens...')
            await supabase.from('sys_auth_tokens').upsert({
                user_id: 'karr',
                access_token: tokens.access_token,
                refresh_token: tokens.refresh_token || tokenData.refresh_token,
                expiry_date: tokens.expiry_date,
                updated_at: new Date().toISOString()
            })
        })

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

        // 2. Fetch Events
        // Get range from query params or default to +/- 30 days
        const searchParams = req.nextUrl.searchParams
        const timeMin = searchParams.get('timeMin') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        const timeMax = searchParams.get('timeMax') || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString()

        const response = await calendar.events.list({
            calendarId: 'primary',
            timeMin: timeMin,
            timeMax: timeMax,
            singleEvents: true,
            orderBy: 'startTime',
        })

        const events = response.data.items || []

        // 3. Transform to ScheduleItem compatible format
        const scheduleItems = events.map(event => {
            const start = event.start?.dateTime || event.start?.date
            const end = event.end?.dateTime || event.end?.date
            
            return {
                id: `google-${event.id}`,
                title: event.summary || 'Untitled Event',
                date: start, 
                type: 'external-google',
                description: event.description,
                location: event.location,
                link: event.htmlLink,
                end_date: end
            }
        })

        return NextResponse.json({ events: scheduleItems })

    } catch (err: any) {
        return NextResponse.json({ error: 'Failed to sync calendar' }, { status: 500 })
    }
}
