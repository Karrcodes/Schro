import { GymBusyness, GymVisit } from '../types'

export const GymService = {
    async login(username: string, password: string) {
        const res = await fetch('/api/wellbeing/gym/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        })
        if (!res.ok) {
            const data = await res.json()
            throw new Error(data.details || data.error || 'Authentication failed')
        }
        return res.json()
    },

    async getBusyness(uuid: string, locationId: string, cookie: string, memberId?: string, accessToken?: string) {
        const url = new URL('/api/wellbeing/gym/busyness', window.location.origin)
        url.searchParams.append('uuid', uuid)
        url.searchParams.append('locationId', locationId)
        if (memberId) url.searchParams.append('memberId', memberId)

        const headers: Record<string, string> = {
            'x-gym-cookie': cookie
        }
        if (accessToken) headers['x-gym-token'] = accessToken

        const res = await fetch(url.toString(), { headers, cache: 'no-store' })
        if (!res.ok) {
            const errorData = await res.json().catch(() => ({}))
            console.warn(`Gym Busyness Unavailable: ${res.status} - ${JSON.stringify(errorData)}`)
            return null
        }
        return res.json()
    },

    async getHistory(uuid: string, cookie: string): Promise<any> {
        const res = await fetch(`/api/wellbeing/gym/history?uuid=${uuid}`, {
            headers: { 'x-gym-cookie': cookie },
            cache: 'no-store'
        })
        if (!res.ok) {
            const text = await res.text()
            throw new Error(`History Sync Failure: ${res.status} ${res.statusText} - ${text.substring(0, 100)}`)
        }
        return res.json()
    },

    async getLocations(cookie: string, accessToken?: string, uuid?: string): Promise<any[]> {
        const params = new URLSearchParams()
        if (uuid) params.set('uuid', uuid)
        const headers: Record<string, string> = { 'x-gym-cookie': cookie }
        if (accessToken) headers['x-gym-token'] = accessToken
        const res = await fetch(`/api/wellbeing/gym/locations?${params.toString()}`, { headers })
        if (!res.ok) return []
        const data = await res.json()
        return data.gyms || []
    }
}
