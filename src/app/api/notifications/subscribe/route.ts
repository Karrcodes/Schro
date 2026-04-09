export const dynamic = 'force-dynamic'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Supabase credentials missing in API route')
            return NextResponse.json({ error: 'Server config error' }, { status: 500 })
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Save to Supabase using RPC to handle JSONB upsert logic
        const { error } = await supabase.rpc('upsert_push_subscription', {
            p_subscription: subscription,
            p_user_id: 'karr'
        })

        if (error) {
            console.error('Database error saving subscription:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Subscription API crash:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function DELETE(req: Request) {
    try {
        const { endpoint } = await req.json()

        if (!endpoint) {
            return NextResponse.json({ error: 'Endpoint missing' }, { status: 400 })
        }

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
        const supabase = createClient(supabaseUrl, supabaseKey)

        const { error } = await supabase
            .from('sys_push_subscriptions')
            .delete()
            .match({ 'subscription->>endpoint': endpoint })

        if (error) {
            console.error('Database error deleting subscription:', error)
            return NextResponse.json({ error: error.message }, { status: 500 })
        }

        return NextResponse.json({ success: true })
    } catch (error: any) {
        console.error('Subscription DELETE API crash:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
