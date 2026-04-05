import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function expandRecurrence(event: any, startRange: Date, endRange: Date) {
    if (!event.rrule) return [event]
    
    const freqMatch = event.rrule.match(/FREQ=(DAILY|WEEKLY|MONTHLY|YEARLY)/)
    if (!freqMatch) return [event]
    
    const freq = freqMatch[1]
    const occurrences: any[] = []
    let current = new Date(event.start)
    
    // Safety break after 100 occurrences or target date
    let count = 0
    while (current <= endRange && count < 100) {
        if (current >= startRange) {
            occurrences.push({ ...event, start: new Date(current), id: `${event.id}-${current.toISOString()}` })
        }
        
        if (freq === 'DAILY') current.setDate(current.getDate() + 1)
        else if (freq === 'WEEKLY') current.setDate(current.getDate() + 7)
        else if (freq === 'MONTHLY') current.setMonth(current.getMonth() + 1)
        else if (freq === 'YEARLY') current.setFullYear(current.getFullYear() + 1)
        else break
        
        count++
    }
    return occurrences
}

function parseICS(text: string) {
    const events: any[] = []
    const unfolded = text.replace(/\r?\n[ \t]/g, '')
    const lines = unfolded.split(/\r?\n/)
    let currentEvent: any = null
    
    const parseValue = (line: string) => {
        const colonIndex = line.indexOf(':')
        if (colonIndex === -1) return ''
        return line.substring(colonIndex + 1).trim()
    }

    const parseDate = (line: string) => {
        let val = parseValue(line)
        if (!val) return null
        const dateTimeMatch = val.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/)
        if (dateTimeMatch) {
            const isUTC = val.endsWith('Z')
            const iso = `${dateTimeMatch[1]}-${dateTimeMatch[2]}-${dateTimeMatch[3]}T${dateTimeMatch[4]}:${dateTimeMatch[5]}:${dateTimeMatch[6]}${isUTC ? 'Z' : ''}`
            return new Date(iso)
        }
        const dateMatch = val.match(/^(\d{4})(\d{2})(\d{2})$/)
        if (dateMatch) return new Date(`${dateMatch[1]}-${dateMatch[2]}-${dateMatch[3]}`)
        return new Date(val)
    }

    for (let line of lines) {
        const trimmed = line.trim()
        if (!trimmed) continue
        if (trimmed.startsWith('BEGIN:VEVENT')) {
            currentEvent = {}
        } else if (trimmed.startsWith('END:VEVENT')) {
            if (currentEvent) events.push(currentEvent)
            currentEvent = null
        } else if (currentEvent) {
            const [keyPart] = trimmed.split(':')
            const cleanKey = keyPart.split(';')[0]
            if (cleanKey === 'SUMMARY') currentEvent.summary = parseValue(trimmed)
            else if (cleanKey === 'DTSTART') currentEvent.start = parseDate(trimmed)
            else if (cleanKey === 'DTEND') currentEvent.end = parseDate(trimmed)
            else if (cleanKey === 'RRULE') currentEvent.rrule = parseValue(trimmed)
            else if (cleanKey === 'UID') currentEvent.uid = parseValue(trimmed)
            else if (cleanKey === 'DESCRIPTION') currentEvent.description = parseValue(trimmed)
            else if (cleanKey === 'LOCATION') currentEvent.location = parseValue(trimmed)
        }
    }
    return events
}

export async function GET(req: NextRequest) {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!supabaseUrl || !supabaseServiceKey) return NextResponse.json({ error: 'Config error' }, { status: 500 })
        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { data: tokenData, error: tokenError } = await supabase.from('sys_auth_tokens').select('*').eq('user_id', 'karr:apple_ical').single()
        if (tokenError || !tokenData?.access_token) return NextResponse.json({ events: [], calendars: [] })

        let calendars = []
        try { calendars = JSON.parse(tokenData.access_token) } catch (e) { calendars = [{ id: 'default', label: 'iCloud', url: tokenData.access_token }] }

        const startRange = new Date()
        startRange.setMonth(startRange.getMonth() - 1) // Buffer back one month
        const endRange = new Date()
        endRange.setMonth(endRange.getMonth() + 2) // Buffer forward two months

        const allResults = await Promise.all(
            calendars.map(async (cal: any) => {
                try {
                    let fetchUrl = cal.url
                    if (fetchUrl.startsWith('webcal://')) fetchUrl = fetchUrl.replace('webcal://', 'https://')
                    const res = await fetch(fetchUrl)
                    if (!res.ok) return []
                    const icsText = await res.text()
                    const rawEvents = parseICS(icsText)
                    
                    return rawEvents.flatMap(ev => expandRecurrence(ev, startRange, endRange)).map(event => ({
                        id: `apple-${cal.id}-${(event.uid || '').replace(/[^a-zA-Z0-9-]/g, '')}-${event.start.getTime()}`,
                        title: event.summary || 'Untitled Apple Event',
                        date: event.start,
                        end_date: event.end,
                        type: 'external-apple',
                        description: event.description,
                        location: event.location,
                        calendarLabel: cal.label
                    }))
                } catch (err) { return [] }
            })
        )

        return NextResponse.json({ events: allResults.flat(), calendars, _debug: { totalEvents: allResults.flat().length } })
    } catch (err: any) { return NextResponse.json({ error: err.message }, { status: 500 }) }
}

export async function POST(req: NextRequest) {
    try {
        const { action, url, label, id } = await req.json()
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
        const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        const supabase = createClient(supabaseUrl!, supabaseServiceKey!)
        
        const { data: current, error: getError } = await supabase
            .from('sys_auth_tokens')
            .select('access_token')
            .eq('user_id', 'karr:apple_ical')
            .single()

        let calendars = []
        if (current?.access_token) {
            try {
                calendars = JSON.parse(current.access_token)
            } catch (e) {
                calendars = [{ id: 'legacy', label: 'Legacy Calendar', url: current.access_token }]
            }
        }

        if (action === 'add') {
            const newCal = { 
                id: Math.random().toString(36).substring(2, 9), 
                label: label || 'Apple Calendar', 
                url 
            }
            calendars.push(newCal)
        } else if (action === 'delete') {
            calendars = calendars.filter((c: any) => c.id !== id)
        }

        const { error: upsertError } = await supabase.from('sys_auth_tokens').upsert({
            user_id: 'karr:apple_ical',
            token_type: 'apple_ical',
            access_token: JSON.stringify(calendars),
            updated_at: new Date().toISOString()
        })

        if (upsertError) throw upsertError
        return NextResponse.json({ success: true, calendars })
    } catch (err: any) {
        console.error('[Apple Sync POST Fatal]', err)
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
