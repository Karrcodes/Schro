export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';
import { NextResponse } from 'next/server'
import { geminiModel } from '@/lib/gemini'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
    try {
        const { aspirations } = await req.json()

        if (!aspirations || !Array.isArray(aspirations) || aspirations.length === 0) {
            return NextResponse.json({ error: 'No aspirations provided for synthesis.' }, { status: 400 })
        }

        const aspirationsList = aspirations.map(a => `- ${a.title}: ${a.description}`).join('\n')

        const prompt = `
            You are the "Core Axiom" engine for a high-performance personal operating system called Schrö.
            Your task is to synthesize a single, visceral, and deeply-aligned personal directive (an Axiom) for a man who holds the following open-ended aspirations:
            
            ${aspirationsList}
            
            Guidelines:
            1. Output EXACTLY ONE sentence.
            2. The tone must be stoic, powerful, and direct. Avoid generic motivation; aim for a "directive" that feels like a law of nature.
            3. Use strong, active verbs.
            4. Bridge the gap between internal state (agency/courage) and external reality (monetization/sovereignty).
            5. Do not use flowery language or "you can do it" tropes.
            
            Output the raw text of the axiom only.
        `

        const result = await geminiModel.generateContent(prompt)
        const response = await result.response
        const text = response.text().trim()

        return NextResponse.json({ axiom: text })
    } catch (error: any) {
        console.error('Axiom synthesis error:', error)
        return NextResponse.json({ error: 'Failed to synthesize axiom.' }, { status: 500 })
    }
}
