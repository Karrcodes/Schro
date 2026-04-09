export const dynamic = 'force-static'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const uuid = searchParams.get('uuid')
        const cookie = req.headers.get('x-gym-cookie')

        if (!uuid || !cookie) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
        }

        const now = new Date()
        const monthAgo = new Date()
        monthAgo.setDate(now.getDate() - 30)

        const formatDate = (date: Date) => date.toISOString().split('.')[0]
        const startDate = formatDate(monthAgo)
        const endDate = formatDate(now)

        const historyUrl = `https://thegymgroup.netpulse.com/np/exercisers/${uuid}/check-ins/history?startDate=${startDate}&endDate=${endDate}`
        console.log('Fetching History URL:', historyUrl)

        const response = await fetch(historyUrl, {
            headers: {
                'Cookie': cookie,
                'Accept': 'application/json',
                'X-NP-Api-Version': '1.5',
                'X-NP-App-Version': '9999',
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
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
