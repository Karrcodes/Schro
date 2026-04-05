import { NextResponse } from 'next/server'

const API_BASE = 'https://home-api.eufylife.com/v1'
const APP_NAME = 'eufylife'
const OS_TYPE = 1 // 1 for iOS, 2 for Android

export async function POST(req: Request) {
    try {
        const { email, password } = await req.json()

        if (!email || !password) {
            return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
        }

        const response = await fetch(`${API_BASE}/user/email/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                email,
                password,
                app_name: APP_NAME,
                os_type: OS_TYPE
            })
        })

        const result = await response.json()
        
        if (result.code !== 1) {
            return NextResponse.json({ error: result.msg || 'Login failed' }, { status: 401 })
        }

        return NextResponse.json({
            accessToken: result.data.access_token,
            userId: result.data.user_id,
            userInfo: result.data.user_info
        })
    } catch (error) {
        console.error('Eufy login API error:', error)
        return NextResponse.json(
            { error: 'Internal server error while connecting to EufyLife' },
            { status: 500 }
        )
    }
}
