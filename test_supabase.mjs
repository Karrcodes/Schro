import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function testInsert() {
  const { data, error } = await supabase
    .from('fin_task_templates')
    .insert([{
      title: 'Test Preset',
      category: 'todo',
      priority: 'low',
      impact_score: 5,
      work_type: 'light',
      profile: 'personal',
      notes: { type: 'text', content: '' }
    }])

  console.log('Result:', { data, error })
}

testInsert()
