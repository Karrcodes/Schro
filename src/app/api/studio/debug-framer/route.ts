export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseAdmin'

export async function GET() {
    try {
        const { data: settings } = await supabase.from('sys_settings').select('key, value').in('key', ['framer_access_token', 'framer_site_id'])
        const accessToken = settings?.find(s => s.key === 'framer_access_token')?.value
        const siteId = settings?.find(s => s.key === 'framer_site_id')?.value

        if (!accessToken || !siteId) return NextResponse.json({ error: 'No token' })

        const { connect } = await import('framer-api')
        const framer = await connect(siteId, accessToken)
        
        const collections = await framer.getCollections()
        
        const dump: any = {}
        for (const c of collections.slice(0, 4)) { // check first few
            try {
                const items = await c.getItems()
                const fields = await c.getFields()
                dump[c.name] = {
                    fields: fields.map((f: any) => ({ name: f.name, id: f.id, type: f.type, slug: f.slug })),
                    sampleItem: items[0]
                }
            } catch(e) {}
        }
        
        await framer.disconnect()
        return NextResponse.json(dump)
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 })
    }
}
