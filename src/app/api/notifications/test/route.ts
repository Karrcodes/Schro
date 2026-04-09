export const dynamic = 'force-static'
import { NextResponse } from 'next/server'
import { sendPushNotification } from '@/lib/push-server'

export async function POST(req: Request) {
    try {
        const { title, body, url } = await req.json()
        const result = await sendPushNotification(title, body, url)
        return NextResponse.json(result)
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
