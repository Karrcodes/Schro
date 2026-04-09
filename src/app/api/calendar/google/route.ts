export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl!, supabaseServiceKey!)

export async function POST(req: NextRequest) {
    try {
        const { title, date } = await req.json()

        if (!title || !date) {
            return NextResponse.json({ error: 'Title and date are required' }, { status: 400 })
        }

        // 1. Fetch User Tokens
        const { data: tokenData, error: tokenError } = await supabase
            .from('sys_auth_tokens')
            .select('*')
            .eq('user_id', 'karr')
            .single()

        if (tokenError || !tokenData) {
            return NextResponse.json({ error: 'OAuth tokens not found. Please connect Google.' }, { status: 401 })
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

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

        // 2. Create Event (Standard All-Day event for Quick-Add)
        const event = {
            summary: title,
            start: {
                date: date // YYYY-MM-DD
            },
            end: {
                date: date
            }
        }

        const response = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: event
        })

        return NextResponse.json({ 
            success: true, 
            event: response.data 
        })

    } catch (err: any) {
        console.error('[Google Calendar API] Failed to create event:', err)
        return NextResponse.json({ error: 'Failed to create Google event' }, { status: 500 })
    }
}

export async function PUT(req: NextRequest) {
    try {
        const { id, title, date } = await req.json()

        if (!id || !title || !date) {
            return NextResponse.json({ error: 'ID, title, and date are required' }, { status: 400 })
        }

        const realId = id.replace('google-', '')

        const { data: tokenData, error: tokenError } = await supabase
            .from('sys_auth_tokens')
            .select('*')
            .eq('user_id', 'karr')
            .single()

        if (tokenError || !tokenData) {
            return NextResponse.json({ error: 'OAuth tokens not found' }, { status: 401 })
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

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

        const event = {
            summary: title,
            start: { date: date },
            end: { date: date }
        }

        const response = await calendar.events.update({
            calendarId: 'primary',
            eventId: realId,
            requestBody: event
        })

        return NextResponse.json({ success: true, event: response.data })

    } catch (err: any) {
        console.error('[Google Calendar API] Failed to update event:', err)
        return NextResponse.json({ error: 'Failed to update Google event' }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const { id } = await req.json()

        if (!id) {
            return NextResponse.json({ error: 'Event ID is required' }, { status: 400 })
        }

        const realId = id.replace('google-', '')

        const { data: tokenData, error: tokenError } = await supabase
            .from('sys_auth_tokens')
            .select('*')
            .eq('user_id', 'karr')
            .single()

        if (tokenError || !tokenData) {
            return NextResponse.json({ error: 'OAuth tokens not found' }, { status: 401 })
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

        const calendar = google.calendar({ version: 'v3', auth: oauth2Client })

        await calendar.events.delete({
            calendarId: 'primary',
            eventId: realId
        })

        return NextResponse.json({ success: true })

    } catch (err: any) {
        console.error('[Google Calendar API] Failed to delete event:', err)
        return NextResponse.json({ error: 'Failed to delete Google event' }, { status: 500 })
    }
}
