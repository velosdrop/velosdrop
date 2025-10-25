//app/api/admin/auth/check/route.ts
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies(); // Add 'await' here
    const sessionCookie = cookieStore.get('admin-session');

    if (!sessionCookie) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    // Session exists - user is authenticated
    return NextResponse.json({ authenticated: true });
  } catch (error) {
    return NextResponse.json({ error: 'Auth check failed' }, { status: 500 });
  }
}