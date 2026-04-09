export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'


export async function GET(req: NextRequest) {
    return handleSpeech(req)
}

export async function POST(req: NextRequest) {
    return handleSpeech(req)
}

async function handleSpeech(req: NextRequest) {
    try {
        let text: string | null = null
        let voice: string = 'shimmer'

        if (req.method === 'GET') {
            const { searchParams } = new URL(req.url)
            text = searchParams.get('text')
            voice = searchParams.get('voice') || 'shimmer'
        } else {
            const body = await req.json()
            text = body.text
            voice = body.voice || 'shimmer'
        }

        const apiKey = process.env.OPENAI_API_KEY

        // Skip execution during static build if key is missing
        if (!apiKey && process.env.NODE_ENV === 'production' && process.env.TAURI_PLATFORM) {
            return NextResponse.json({ error: 'AI Speech skipped during static build' }, { status: 200 })
        }

        if (!apiKey) {
            return NextResponse.json({ error: 'OPENAI_API_KEY is not configured in .env.local' }, { status: 500 })
        }

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 })
        }

        const response = await fetch('https://api.openai.com/v1/audio/speech', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'tts-1',
                input: text,
                voice: voice,
                response_format: 'mp3'
            })
        })

        if (!response.ok) {
            const error = await response.json()
            console.error('OpenAI TTS Error Detail:', JSON.stringify(error, null, 2))
            return NextResponse.json({ error: error.error?.message || 'Failed to generate speech' }, { status: response.status })
        }

        // Stream the response directly to the client for zero-latency
        return new NextResponse(response.body, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Transfer-Encoding': 'chunked',
            }
        })

    } catch (e: any) {
        console.error('OpenAI TTS Proxy Error:', e)
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
    }
}
