export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    return NextResponse.json({
        error: 'Nanobana Gen is temporarily offline for quality upgrades. Coming soon!'
    }, { status: 501 })
}
