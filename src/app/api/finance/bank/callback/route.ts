export const dynamic = 'force-static'
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const connectionId = searchParams.get('connection_id');
    const status = searchParams.get('status');

    // After Salt Edge is done, they redirect back here
    // We should save the connectionId to the user's settings or profile

    if (status === 'success' && connectionId) {
        console.log(`Successfully connected bank with ID: ${connectionId}`);

        // In a real implementation, you would update Supabase here:
        // await supabase.from('finance_settings').upsert({ key: 'salt_edge_connection_id', value: connectionId })

        // Redirect back to the dashboard
        return NextResponse.redirect(new URL('/finances', req.url));
    }

    return NextResponse.redirect(new URL('/finances?error=bank_connection_failed', req.url));
}
