require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

async function run() {
    // Check what's in fin_pockets - specifically monzo_id mapping
    const { data: pockets } = await sb
        .from('fin_pockets')
        .select('id, name, type, profile, monzo_id, balance, user_id')
        .order('name')

    console.log('fin_pockets:')
    pockets?.forEach(p => {
        const hasMonzoId = p.monzo_id ? '✅' : '❌ NO MONZO ID'
        console.log(`  ${hasMonzoId} ${p.name} (${p.type}/${p.profile}) | £${p.balance} | monzo_id: ${p.monzo_id || 'NULL'} | user: ${p.user_id}`)
    })

    // For card payments, the account_id is acc_0000AjgxPvMofucaiSz62L - is that mapped?
    const personalAccountId = 'acc_0000AjgxPvMofucaiSz62L'
    const { data: generalPocket } = await sb
        .from('fin_pockets')
        .select('id, name, monzo_id')
        .eq('monzo_id', personalAccountId)
        .single()

    console.log(`\nPocket mapped to personal account (${personalAccountId}):`, generalPocket ? `${generalPocket.name} (${generalPocket.id})` : '❌ NONE FOUND')

    if (!generalPocket) {
        console.log('\n⚠️  This means card payments (which use account_id as the match key) fall back to General pocket lookup by name.')
        console.log('If the General pocket exists, this is fine. Let\'s check:')
        const { data: genByName } = await sb
            .from('fin_pockets')
            .select('id, name, monzo_id')
            .ilike('name', 'General')
            .eq('profile', 'personal')
            .single()
        console.log('General pocket by name:', genByName ? `${genByName.id} (monzo_id: ${genByName.monzo_id})` : '❌ NOT FOUND - card payments would have no pocket!')
    }
}

run().catch(console.error)
