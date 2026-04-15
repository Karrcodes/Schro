export const dynamic = 'force-dynamic'
import { NextResponse, NextRequest } from 'next/server'


export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url)
        const uuid = searchParams.get('uuid')
        const cookie = req.headers.get('x-gym-cookie') ?? ''

        if (!uuid || !cookie) {
            return NextResponse.json({ error: 'Missing uuid or session cookie' }, { status: 400 })
        }

        const response = await fetch(`https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/exerciser/${uuid}/history?pageSize=50`, {
            headers: {
                'Cookie': cookie,
                'Accept': 'application/json',
                'X-NP-Api-Version': '1.5',
                'User-Agent': 'TheGymGroup/2.14.0 (iPhone; iOS 16.1.1; Scale/3.00)',
                'X-NP-User-Agent': 'clientType=MOBILE;devicePlatform=IOS;applicationName=The Gym Group;applicationVersion=2.14.0'
            }
        })

        if (!response.ok) {
            const errorBody = await response.text()
            console.error('Gym History Error:', response.status, errorBody)
            return NextResponse.json({ error: 'Failed to fetch history', details: errorBody }, { status: response.status })
        }

        const data = await response.json()
        console.log('Gym History Raw Data:', JSON.stringify(data).substring(0, 500))
        return NextResponse.json(data)
    } catch (error) {
        console.error('Internal Server Error (Gym History):', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
