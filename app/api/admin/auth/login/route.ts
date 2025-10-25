//app/api/admin/auth/login/route.ts
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/src/db';
import { adminsTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    console.log('Login attempt for username:', username);

    // Validate input
    if (!username || !password) {
      return NextResponse.json(
        { message: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find admin in database using Drizzle
    const admin = await db
      .select()
      .from(adminsTable)
      .where(eq(adminsTable.username, username))
      .get();

    console.log('Found admin:', admin);

    if (!admin) {
      console.log('No admin found with username:', username);
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if admin is active
    if (!admin.isActive) {
      console.log('Admin account is inactive:', username);
      return NextResponse.json(
        { message: 'Account is deactivated' },
        { status: 401 }
      );
    }

    // SMART PASSWORD VERIFICATION: Handle both plain text and hashed passwords
    let isValidPassword = false;
    
    // Check if password is already hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
    if (admin.password.startsWith('$2a$') || admin.password.startsWith('$2b$') || admin.password.startsWith('$2y$')) {
      // Password is hashed, use bcrypt.compare
      console.log('Password appears to be hashed, using bcrypt.compare...');
      isValidPassword = await bcrypt.compare(password, admin.password);
    } else {
      // Password is plain text - compare directly
      console.log('Password appears to be plain text, comparing directly...');
      isValidPassword = password === admin.password;
      
      // Auto-update to hashed password for future logins
      if (isValidPassword) {
        console.log('Auto-updating plain text password to hashed version...');
        const newHashedPassword = await bcrypt.hash(password, 12);
        await db
          .update(adminsTable)
          .set({ 
            password: newHashedPassword,
            updatedAt: new Date().toISOString()
          })
          .where(eq(adminsTable.id, admin.id))
          .run();
        console.log('Password automatically updated to hashed version');
      }
    }

    console.log('Password valid:', isValidPassword);
    
    if (!isValidPassword) {
      console.log('Invalid password for admin:', username);
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login
    await db
      .update(adminsTable)
      .set({ 
        lastLogin: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .where(eq(adminsTable.id, admin.id))
      .run();

    // Create session
    const sessionData = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
      isAuthenticated: true
    };

    const response = NextResponse.json(
      { message: 'Login successful', user: sessionData },
      { status: 200 }
    );

    // Set secure HTTP-only cookie
    response.cookies.set('admin-session', JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24 hours
    });

    console.log('Login successful for:', username);
    return response;

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}