export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';
import { NextResponse } from 'next/server'
export async function GET() {
    return NextResponse.json({ ping: 'pong' })
}
