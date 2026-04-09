export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    return NextResponse.json({
        error: 'Nanobana Gen is temporarily offline for quality upgrades. Coming soon!'
    }, { status: 501 })
}
