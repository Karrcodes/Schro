import { createClient } from '@supabase/supabase-js';

const supabase = createClient('https://hvkoeyxgvvtkcrxnurot.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh2a29leXhndnZ0a2NyeG51cm90Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MTU3NDI5NywiZXhwIjoyMDg3MTUwMjk3fQ.w74Ie3pi-TX6WRKI6vqtFk2-B0h0zYCjMPGTwBExyPY');

async function go() {
  const { data, error } = await (supabase.from('fin_tasks') as any).insert([{
    title: 'Body lotion',
    category: 'grocery',
    price: 3.99,
    amount: 'x1',
    user_id: '6f516e31-3a17-44a6-b992-d248595fcf83',
    strategic_category: 'personal',
    priority: 'mid',
    is_completed: false,
    impact_score: 5,
    notes: { content: "Staged via Neural Intelligence Protocol" }
  }]);
  
  if (error) {
    console.error(JSON.stringify(error));
    process.exit(1);
  }
  
  console.log('Success');
  process.exit(0);
}

go();
