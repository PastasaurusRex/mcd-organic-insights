import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { password } = await request.json();

        if (password === process.env.ADMIN_PASSWORD) {
            const cookieStore = await cookies();
            cookieStore.set('admin_auth', 'true', {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 60 * 60 * 24 * 7 // 1 week
            });
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ success: false, error: 'Invalid password' }, { status: 401 });
    } catch {
        return NextResponse.json({ success: false, error: 'Bad request' }, { status: 400 });
    }
}
