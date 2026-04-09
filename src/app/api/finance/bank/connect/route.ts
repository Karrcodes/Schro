export const dynamic = (process.env.TAURI_PLATFORM !== undefined || process.env.IS_TAURI === 'true') ? 'force-static' : 'force-dynamic';
import { NextResponse } from 'next/server';
import { createCustomer, createConnectSession } from '@/lib/saltedge';

export async function POST(req: Request) {
    try {
        const { profile } = await req.json();

        // 1. Create a Salt Edge Customer if one doesn't exist for this profile
        // In a real app, you'd store this in your DB. For now, we use a unique string.
        const customerIdentifier = `schrö_${profile || 'personal'}`;

        let customer;
        try {
            customer = await createCustomer(customerIdentifier);
        } catch (e: any) {
            // If customer already exists, just handle it (Salt Edge might return error if duplicate)
            console.log('Customer might already exist, continuing...');
        }

        const customerId = customer?.data?.id || (customerIdentifier === 'schrö_personal' ? 'placeholder_id' : 'placeholder_id');
        // Note: In production, you MUST store and fetch the customer_id from Supabase

        // 2. Create a Connect Session
        // The relative URL for the callback
        const host = req.headers.get('host');
        const protocol = host?.includes('localhost') ? 'http' : 'https';
        const returnUrl = `${protocol}://${host}/api/finance/bank/callback`;

        const session = await createConnectSession(customerId, returnUrl);

        return NextResponse.json({
            url: session.data.connect_url
        });

    } catch (error: any) {
        console.error('Salt Edge Connect Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
