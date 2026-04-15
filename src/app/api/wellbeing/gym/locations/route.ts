export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const uuid = searchParams.get('uuid')
        const cookie = req.headers.get('x-gym-cookie')
        const token = req.headers.get('x-gym-token')

        if (!cookie) {
            return NextResponse.json({ error: 'Missing gym cookie' }, { status: 400 })
        }

        const headers: Record<string, string> = {
            'Cookie': cookie,
            'Accept': 'application/json',
            'X-NP-Api-Version': '1.5',
            'X-NP-App-Version': '9999',
            'User-Agent': 'TheGymGroup/2.14.0 (iPhone; iOS 16.1.1; Scale/3.00)',
            'X-NP-User-Agent': 'clientType=MOBILE;devicePlatform=IOS;applicationName=The Gym Group;applicationVersion=2.14.0'
        }
        if (token) headers['Authorization'] = `Bearer ${token}`

        // Strategy 1: Exerciser's accessible gyms (multi-access membership)
        if (uuid) {
            const urls = [
                `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/exerciser/${uuid}/accessible-gyms`,
                `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/exerciser/${uuid}/gyms`,
                `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/exerciser/${uuid}/memberships`,
                `https://thegymgroup.netpulse.com/np/exerciser/${uuid}/gyms`,
            ]

            for (const url of urls) {
                try {
                    const res = await fetch(url, { headers })
                    if (res.ok) {
                        const data = await res.json()
                        console.log(`Gym locations from ${url}:`, JSON.stringify(data).substring(0, 500))
                        const gyms = extractGyms(data)
                        if (gyms.length) return NextResponse.json({ gyms, source: url })
                    } else {
                        console.log(`Gym location attempt failed (${res.status}) for:`, url)
                    }
                } catch (e) {
                    console.warn(`Error fetching ${url}:`, e)
                }
            }
        }

        // Strategy 2: All The Gym Group locations (public/semi-public)
        const allGymUrls = [
            `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/gyms?pageSize=500`,
            `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/gyms?page=0&size=500`,
            `https://thegymgroup.netpulse.com/np/thegymgroup/v1.0/gym-locations`,
            `https://thegymgroup.netpulse.com/np/thegymgroup/gyms`,
        ]

        for (const url of allGymUrls) {
            try {
                const res = await fetch(url, { headers })
                if (res.ok) {
                    const data = await res.json()
                    console.log(`All gyms from ${url}:`, JSON.stringify(data).substring(0, 500))
                    const gyms = extractGyms(data)
                    if (gyms.length) return NextResponse.json({ gyms, source: url })
                } else {
                    console.log(`All gyms attempt failed (${res.status}) for:`, url)
                }
            } catch (e) {
                console.warn(`Error fetching ${url}:`, e)
            }
        }

        // Nothing worked — return empty so modal shows manual-entry fallback
        return NextResponse.json({ gyms: [], source: 'none' })

    } catch (error) {
        console.error('Gym locations fetch error:', error)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}

function extractGyms(data: any): { id: string; name: string; city?: string }[] {
    const list: any[] = Array.isArray(data)
        ? data
        : data?.gyms ?? data?.results ?? data?.data ?? data?.content
            ?? data?.gymLocations ?? data?.locations ?? data?.items ?? []

    return list
        .map((g: any) => ({
            id: g.uuid || g.gymUuid || g.locationUuid || g.id || g.gymId,
            name: g.name || g.gymName || g.locationName || g.displayName,
            city: g.city || g.town || g.location?.city || null,
            address: g.address || null,
        }))
        .filter((g: any) => g.id && g.name)
}
