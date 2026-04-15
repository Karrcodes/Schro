export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';


export async function GET(req: NextRequest) {
    // 1. Fetch credentials from sys_settings
    const { data: settings } = await supabase
        .from('sys_settings')
        .select('key, value')
        .in('key', ['framer_access_token', 'framer_site_id']);

    const dbToken = settings?.find(s => s.key === 'framer_access_token')?.value;
    const dbProjectId = settings?.find(s => s.key === 'framer_site_id')?.value;

    const token = dbToken || process.env.FRAMER_API_TOKEN;
    const projectId = dbProjectId || process.env.FRAMER_PROJECT_ID;

    if (!token || !projectId) {
        return NextResponse.json({ 
            success: false, 
            error: 'Missing Framer connection. Please link your project in settings.' 
        }, { status: 400 });
    }

    try {
        console.log(`[TestSync] Project: ${projectId}`);
        const { connect } = await import('framer-api')
        const framer = await connect(projectId, token)
        const info = await framer.getProjectInfo()
        await framer.disconnect()

        return NextResponse.json({ 
            success: true, 
            project: info.name 
        })
    } catch (err: any) {
        console.error(`[TestSync] Connection failed:`, err.message);
        return NextResponse.json({ 
            success: false, 
            error: err.message || 'Connection failed'
        }, { status: 400 });
    }
}
