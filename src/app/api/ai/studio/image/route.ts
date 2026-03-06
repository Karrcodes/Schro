import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    try {
        const { prompt } = await req.json()

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
        }

        // Use Pollinations AI for quick, free image generation based on the text prompt
        // Pollinations is a free open source AI image generator API.
        const encodedPrompt = encodeURIComponent(prompt.substring(0, 150) + " cinematic lighting, high quality, highly detailed")
        const imageUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?nologo=true&enhance=true`

        return NextResponse.json({ url: imageUrl })
    } catch (err: any) {
        console.error('[Studio Image Gen Error]', err)
        return NextResponse.json({ error: err.message || 'AI service error' }, { status: 500 })
    }
}
