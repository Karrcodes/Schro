export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'



export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const uuid = searchParams.get('uuid')
        const memberId = searchParams.get('memberId')
        const locationId = searchParams.get('locationId')
        const cookie = req.headers.get('x-gym-cookie')
        const token = req.headers.get('x-gym-token')

        if (!(uuid || memberId) || !locationId || !cookie) {
            return NextResponse.json({ error: 'Missing parameters' }, { status: 400 })
        }

        // Strategy 1: Exerciser-specific busyness using UUID (most common for Netpulse)
        // Strategy 2: Exerciser-specific busyness using MemberID (Salesforce ID)
        // Strategy 3: Exerciser-specific busyness using Auth0 Sub (extracted from token)
        // Strategy 4: Global Gym busyness (permissive fallback)

        const identifiers = [uuid, memberId].filter(Boolean) as string[]

        // Extract Auth0 Sub from token if possible
        if (token) {
            try {
                const payloadBase64 = token.split('.')[1]
                const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString())
                if (payload.sub && !identifiers.includes(payload.sub)) {
                    identifiers.push(payload.sub)
                    console.log('Added Auth0 Sub to strategies:', payload.sub)
                }
            } catch (e) {
                console.warn('Failed to parse JWT payload for sub extraction')
            }
        }

        let lastError = null

        for (const id of identifiers) {
            const busynessUrl = `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/exerciser/${id}/gym-busyness?gymLocationId=${locationId}`
            console.log('Attempting Busyness with ID:', id, 'URL:', busynessUrl)

            const headers: Record<string, string> = {
                'Cookie': cookie,
                'Accept': 'application/json',
                'X-NP-Api-Version': '1.5',
                'X-NP-App-Version': '9999',
                'User-Agent': 'TheGymGroup/2.14.0 (iPhone; iOS 16.1.1; Scale/3.00)',
                'X-NP-User-Agent': 'clientType=MOBILE;devicePlatform=IOS;applicationName=The Gym Group;applicationVersion=2.14.0'
            }
            if (token) headers['Authorization'] = `Bearer ${token}`

            const response = await fetch(busynessUrl, { headers })
            if (response.ok) {
                let data = await response.json()
                
                // Attempt to fetch live occupancy via probing multiple endpoints
                const probes: Record<string, any> = {}
                const endpoints = [
                    `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/gyms/${locationId}/live-occupancy`,
                    `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/gyms/${locationId}/activity`,
                    `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/gym-locations/${locationId}/busyness`,
                    `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/gyms/${locationId}/occupancy`,
                    `https://thegymgroup.netpulse.com/np/thegymgroup/v2.0/gyms/${locationId}/busyness`
                ]
                
                await Promise.allSettled(endpoints.map(async (url) => {
                    try {
                        const res = await fetch(url, { headers })
                        if (res.ok) probes[url] = await res.json()
                        else probes[url] = `Error ${res.status}`
                    } catch (e: any) {
                        probes[url] = e.message
                    }
                }))
                
                try {
                    const liveUrl = `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/gyms/${locationId}`
                    const liveRes = await fetch(liveUrl, { headers })
                    if (liveRes.ok) probes['baseGymDetails'] = await liveRes.json()
                } catch (e) {}

                data._debugProbes = probes
                console.log('Gym Busyness Raw Data:', JSON.stringify(data))
                return NextResponse.json(data)
            }

            const errorBody = await response.text()
            lastError = { status: response.status, body: errorBody }
            console.warn(`Busyness failed for ID ${id}:`, lastError)
        }

        // Final Fallback: Try the direct gym endpoint (no exerciser needed)
        const fallbackUrl = `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/gyms/${locationId}/busyness`
        console.log('Attempting Fallback Busyness URL:', fallbackUrl)

        const fallbackHeaders: Record<string, string> = {
            'Cookie': cookie,
            'Accept': 'application/json',
            'X-NP-Api-Version': '1.5',
            'User-Agent': 'TheGymGroup/2.14.0 (iPhone; iOS 16.1.1; Scale/3.00)'
        }
        if (token) fallbackHeaders['Authorization'] = `Bearer ${token}`

        const fallbackResponse = await fetch(fallbackUrl, { headers: fallbackHeaders })

        if (fallbackResponse.ok) {
            const data = await fallbackResponse.json()
            
            // Attempt to fetch live occupancy via probing multiple endpoints
            const probes: Record<string, any> = {}
            const endpoints = [
                `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/gyms/${locationId}/live-occupancy`,
                `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/gyms/${locationId}/activity`,
                `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/gym-locations/${locationId}/busyness`,
                `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/gyms/${locationId}/occupancy`,
                `https://thegymgroup.netpulse.com/np/thegymgroup/v2.0/gyms/${locationId}/busyness`
            ]
            
            await Promise.allSettled(endpoints.map(async (url) => {
                try {
                    const res = await fetch(url, { headers: fallbackHeaders })
                    if (res.ok) probes[url] = await res.json()
                    else probes[url] = `Error ${res.status}`
                } catch (e: any) {
                    probes[url] = e.message
                }
            }))
            
            try {
                const liveUrl = `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/gyms/${locationId}`
                const liveRes = await fetch(liveUrl, { headers: fallbackHeaders })
                if (liveRes.ok) probes['baseGymDetails'] = await liveRes.json()
            } catch (e) {}

            data._debugProbes = probes
            
            console.log('Gym Busyness Raw Data (Fallback):', JSON.stringify(data))
            return NextResponse.json(data)
        }

        return NextResponse.json({
            error: 'Failed to fetch busyness after multiple attempts',
            details: lastError?.body,
            fallback_details: await fallbackResponse.text()
        }, { status: 403 })
    } catch (error) {
        console.error('Internal Server Error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
