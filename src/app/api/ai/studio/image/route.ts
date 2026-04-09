export const dynamic = 'force-static'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    return NextResponse.json({
        error: 'Nanobana Gen is temporarily offline for quality upgrades. Coming soon!'
    }, { status: 501 })
}
