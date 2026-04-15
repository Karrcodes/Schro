export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { MonzoService } from '@/features/finance/services/MonzoService'

export async function GET() {
    const state = Math.random().toString(36).substring(7)
    const authUrl = await MonzoService.getAuthUrl(state)

    // In a real app, we would store 'state' in a secure cookie to verify it on callback
    return NextResponse.redirect(authUrl)
}
