export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
    try {
        const { username, password } = await req.json() // Keep this line to extract username/password from the incoming request body

        // Use form-urlencoded as some Netpulse versions prefer it
        const formData = new URLSearchParams()
        formData.append('username', username)
        formData.append('password', password)

        const response = await fetch('https://thegymgroup.netpulse.com/np/exerciser/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'X-NP-Api-Version': '1.5',
                'X-NP-App-Version': '9999',
                'User-Agent': 'TheGymGroup/2.14.0 (iPhone; iOS 16.1.1; Scale/3.00)',
                'X-NP-User-Agent': 'clientType=MOBILE;devicePlatform=IOS;applicationName=The Gym Group;applicationVersion=2.14.0'
            },
            body: formData.toString()
        })

        if (!response.ok) {
            const errorText = await response.text()
            console.error('Gym Login Failed:', response.status, errorText)
            return NextResponse.json({
                error: 'Invalid credentials',
                details: errorText,
                status: response.status
            }, { status: response.status })
        }

        const data = await response.json()
        console.log('Gym Login Response Data Keys:', Object.keys(data))

        const setCookie = response.headers.get('set-cookie')

        return NextResponse.json({
            uuid: data.uuid || data.id,
            cookie: setCookie,
            homeGymId: data.homeClubUuid || data.homeClubId || data.homeGymId || data.currentGymId || null,
            firstName: data.firstName || 'User',
            memberId: data.customInfo?.memberId || null,
            accessToken: data.customInfo?.jwtAccessToken || null,
            rawUser: data // For debugging mapping
        })
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
