import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { supabase } from '@/lib/supabase';

// Define the incoming API types matching what the client PapaParse will generate
type IngestPayload = {
    type: 'followers' | 'posts';
    data: Record<string, unknown>[];
};

export async function POST(request: Request) {
    try {
        // Authenticate
        const cookieStore = await cookies();
        const authed = cookieStore.get('admin_auth')?.value === 'true';
        if (!authed) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload: IngestPayload = await request.json();
        const { type, data } = payload;

        if (!data || !Array.isArray(data) || data.length === 0) {
            return NextResponse.json({ error: 'No data provided' }, { status: 400 });
        }

        if (type === 'followers') {
            // Upsert on 'date'
            const { error } = await supabase.from('followers_history').upsert(data, { onConflict: 'date' });
            if (error) throw error;
        } else if (type === 'posts') {
            // Upsert on 'id'
            const { error } = await supabase.from('posts').upsert(data, { onConflict: 'id' });
            if (error) throw error;
        } else {
            return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
        }

        return NextResponse.json({ success: true, count: data.length });
    } catch (err) {
        console.error('Ingest error:', err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
    }
}

export async function DELETE() {
    try {
        // Authenticate
        const cookieStore = await cookies();
        const authed = cookieStore.get('admin_auth')?.value === 'true';
        if (!authed) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Wipe both tables
        const { error: postsError } = await supabase.from('posts').delete().neq('id', 'PLACEHOLDER_THAT_NEVER_MATCHES');
        if (postsError) throw postsError;

        const { error: followersError } = await supabase.from('followers_history').delete().neq('date', 'PLACEHOLDER_THAT_NEVER_MATCHES');
        if (followersError) throw followersError;

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error('Clear DB error:', err);
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal server error' }, { status: 500 });
    }
}
