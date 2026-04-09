export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';
import { NextResponse } from 'next/server'

const API_BASE = 'https://home-api.eufylife.com/v1'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const limit = searchParams.get('limit') || '50'
        
        // Read auth headers sent from the client
        const accessToken = req.headers.get('x-eufy-token')
        const userId = req.headers.get('x-eufy-user')

        if (!accessToken || !userId) {
            return NextResponse.json({ error: 'Missing Eufy authentication headers' }, { status: 401 })
        }

        const response = await fetch(`${API_BASE}/health/weight/list?limit=${limit}`, {
            method: 'GET',
            headers: {
                'access_token': accessToken,
                'user_id': userId,
                'Accept': 'application/json'
            }
        })

        const result = await response.json()
        
        if (result.code !== 1) {
            return NextResponse.json({ error: result.msg || 'Failed to fetch weight data' }, { status: 400 })
        }

        return NextResponse.json({ data: result.data })
    } catch (error) {
        console.error('Eufy history API error:', error)
        return NextResponse.json(
            { error: 'Internal server error while syncing records' },
            { status: 500 }
        )
    }
}
