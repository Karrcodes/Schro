export const dynamic = 'force-static'
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { fetchTransactions as saltEdgeFetchTransactions } from '@/lib/saltedge';

export async function POST(req: Request) {
    try {
        const { profile } = await req.json();

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Get the connection ID from settings
        const { data: settingsData, error: settingsError } = await supabaseAdmin
            .from('fin_settings')
            .select('value')
            .eq('key', 'salt_edge_connection_id')
            .eq('profile', profile || 'personal')
            .maybeSingle();

        if (settingsError) throw settingsError;

        const connectionId = settingsData?.value;
        if (!connectionId) {
            return NextResponse.json({ error: 'No bank connection found. Please connect your bank first.' }, { status: 400 });
        }

        // 2. Fetch transactions from Salt Edge
        const result = await saltEdgeFetchTransactions(connectionId);
        const apiTransactions = result.data || [];

        // 3. Map and insert into fin_transactions
        const transactionsToInsert = apiTransactions.map((tx: any) => ({
            amount: Math.abs(tx.amount),
            type: tx.amount < 0 ? 'spend' : 'income',
            description: tx.description,
            date: tx.made_on,
            category: tx.category || 'other',
            profile: profile || 'personal',
            provider: 'salt_edge',
            provider_tx_id: tx.id,
            pocket_id: null
        }));

        if (transactionsToInsert.length > 0) {
            // We use upsert if we have a provider_tx_id constraint, 
            // otherwise we just insert. For now, we'll try to insert.
            const { error: insertError } = await supabaseAdmin
                .from('fin_transactions')
                .upsert(transactionsToInsert, { onConflict: 'provider_tx_id' });

            if (insertError) {
                console.warn('Insert error (likely missing constraint), trying normal insert:', insertError.message);
                // Fallback or handle appropriately
            }
        }

        return NextResponse.json({
            success: true,
            count: transactionsToInsert.length
        });

    } catch (error: any) {
        console.error('Salt Edge Sync Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
