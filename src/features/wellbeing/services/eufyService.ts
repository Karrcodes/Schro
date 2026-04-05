import { supabase } from '@/lib/supabase'

export interface EufyMeasurement {
    weight: number
    bmi?: number
    body_fat?: number
    muscle_mass?: number
    water_percentage?: number
    bone_mass?: number
    visceral_fat?: number
    bmr?: number
    measure_time: number // unix timestamp
    id: string
}

export class EufyService {
    private static API_BASE = 'https://home-api.eufylife.com/v1'
    private static APP_NAME = 'eufylife'
    private static OS_TYPE = 1 // 1 for iOS, 2 for Android

    static async login(email: string, password: string) {
        try {
            const response = await fetch('/api/wellbeing/scale/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            })

            const result = await response.json()
            if (!response.ok) {
                throw new Error(result.error || 'Login failed')
            }

            return {
                accessToken: result.accessToken,
                userId: result.userId,
                userInfo: result.userInfo
            }
        } catch (error) {
            console.error('Eufy login error:', error)
            throw error
        }
    }

    static async getWeightList(accessToken: string, userId: string, limit = 50) {
        try {
            const response = await fetch(`/api/wellbeing/scale/history?limit=${limit}`, {
                method: 'GET',
                headers: {
                    'x-eufy-token': accessToken,
                    'x-eufy-user': userId
                }
            })

            const result = await response.json()
            if (!response.ok) {
                throw new Error(result.error || 'Failed to fetch weight data')
            }

            return result.data as EufyMeasurement[]
        } catch (error) {
            console.error('Eufy data fetch error:', error)
            throw error
        }
    }

    static async saveAuth(email: string, accessToken: string, userId: string) {
        if (typeof window === 'undefined') return
        localStorage.setItem('eufy_auth', JSON.stringify({
            email,
            accessToken,
            userId,
            lastSync: new Date().toISOString()
        }))
    }

    static getSavedAuth() {
        if (typeof window === 'undefined') return null
        const saved = localStorage.getItem('eufy_auth')
        return saved ? JSON.parse(saved) : null
    }

    static clearAuth() {
        if (typeof window === 'undefined') return
        localStorage.removeItem('eufy_auth')
    }
}
