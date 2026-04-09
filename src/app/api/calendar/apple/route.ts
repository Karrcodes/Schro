export const dynamic = 'force-dynamic'
')[0]
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
