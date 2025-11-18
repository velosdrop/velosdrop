//pages/api/admin/driver-transactions.ts
import { NextApiRequest, NextApiResponse } from 'next';
import { db } from '@/src/db';
import { paymentReferencesTable, driversTable } from '@/src/db/schema';
import { eq, desc, and, gte, lte } from 'drizzle-orm';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Handle GET request - Fetch transactions
  if (req.method === 'GET') {
    try {
      const { search, status, startDate, endDate, driverId, minAmount, maxAmount } = req.query;

      console.log('🔍 Fetching driver transactions from payment_references table:', {
        search, status, startDate, endDate, driverId, minAmount, maxAmount
      });

      // Build where conditions
      const conditions = [];

      if (status && status !== 'all') {
        conditions.push(eq(paymentReferencesTable.status, status as string));
      }

      if (startDate) {
        conditions.push(gte(paymentReferencesTable.createdAt, startDate as string));
      }

      if (endDate) {
        conditions.push(lte(paymentReferencesTable.createdAt, `${endDate}T23:59:59`));
      }

      if (driverId) {
        conditions.push(eq(paymentReferencesTable.driverId, parseInt(driverId as string)));
      }

      if (minAmount) {
        conditions.push(gte(paymentReferencesTable.amount, parseInt(minAmount as string)));
      }

      if (maxAmount) {
        conditions.push(lte(paymentReferencesTable.amount, parseInt(maxAmount as string)));
      }

      // Fetch transactions from payment_references table with driver information
      const transactions = await db
        .select({
          id: paymentReferencesTable.id,
          driver_id: paymentReferencesTable.driverId,
          amount: paymentReferencesTable.amount,
          payment_intent_id: paymentReferencesTable.reference,
          status: paymentReferencesTable.status,
          created_at: paymentReferencesTable.createdAt,
          driver: {
            id: driversTable.id,
            firstName: driversTable.firstName,
            lastName: driversTable.lastName,
            phoneNumber: driversTable.phoneNumber,
            email: driversTable.email,
            profilePictureUrl: driversTable.profilePictureUrl,
          }
        })
        .from(paymentReferencesTable)
        .leftJoin(driversTable, eq(paymentReferencesTable.driverId, driversTable.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(paymentReferencesTable.createdAt));

      console.log('✅ Found transactions in payment_references:', transactions.length);

      // Apply search filter if provided
      let filteredTransactions = transactions;
      if (search && search !== '') {
        const searchTerm = (search as string).toLowerCase();
        filteredTransactions = transactions.filter(tx =>
          tx.driver?.firstName?.toLowerCase().includes(searchTerm) ||
          tx.driver?.lastName?.toLowerCase().includes(searchTerm) ||
          tx.driver?.phoneNumber?.includes(search as string) ||
          tx.driver?.email?.toLowerCase().includes(searchTerm) ||
          tx.payment_intent_id.toLowerCase().includes(searchTerm)
        );
        console.log('🔍 After search filter:', filteredTransactions.length);
      }

      res.status(200).json({
        transactions: filteredTransactions,
        total: filteredTransactions.length
      });

    } catch (error) {
      console.error('❌ Error fetching driver transactions from payment_references:', error);
      res.status(500).json({ 
        error: 'Failed to fetch transactions',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Handle DELETE request - Delete transaction
  else if (req.method === 'DELETE') {
    try {
      const { transactionId } = req.body;

      if (!transactionId) {
        return res.status(400).json({ 
          error: 'Transaction ID is required' 
        });
      }

      console.log('🗑️ Deleting transaction:', transactionId);

      // Delete the transaction from payment_references table
      const result = await db
        .delete(paymentReferencesTable)
        .where(eq(paymentReferencesTable.id, transactionId))
        .returning();

      if (result.length === 0) {
        return res.status(404).json({ 
          error: 'Transaction not found' 
        });
      }

      console.log('✅ Transaction deleted successfully:', transactionId);
      res.status(200).json({ 
        success: true,
        message: 'Transaction deleted successfully',
        deletedTransaction: result[0]
      });

    } catch (error) {
      console.error('❌ Error deleting transaction:', error);
      res.status(500).json({ 
        error: 'Failed to delete transaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Handle other methods
  else {
    res.status(405).json({ message: 'Method not allowed' });
  }
}