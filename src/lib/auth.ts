// src/lib/auth.ts
import jwt from 'jsonwebtoken';
import { db } from '@/src/db';
import { customersTable } from '@/src/db/schema';
import { eq } from 'drizzle-orm';

export async function getCustomerFromToken(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as { id: number };
    
    const [customer] = await db
      .select()
      .from(customersTable)
      .where(eq(customersTable.id, decoded.id))
      .limit(1);

    return customer;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}