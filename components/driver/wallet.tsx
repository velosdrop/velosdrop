// components/driver/wallet.tsx
'use client';

import { FiPlus, FiArrowUpRight, FiRefreshCw } from 'react-icons/fi';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { db } from '@/src/db/index';
import { driversTable, driverTransactions, paymentReferencesTable } from '@/src/db/schema';
import { eq, and } from 'drizzle-orm';

export default function Wallet() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [driverId, setDriverId] = useState<number | null>(null);

  useEffect(() => {
    // Check for refresh parameter
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('refresh') === 'true') {
        console.log('🔄 MANUAL REFRESH TRIGGERED VIA URL PARAM');
        const paymentAmount = urlParams.get('amount');
        if (paymentAmount) {
          console.log('💰 PAYMENT SUCCESS DETECTED, AMOUNT:', paymentAmount);
        }
        refreshWallet();
        
        // Clean up URL
        window.history.replaceState({}, '', '/driver/wallet');
      }
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get driver ID from localStorage (saved during registration/login)
        let currentDriverId: number | null = null;
        
        if (typeof window !== 'undefined') {
          const savedDriverId = localStorage.getItem('driverId');
          if (savedDriverId) {
            currentDriverId = parseInt(savedDriverId);
            setDriverId(currentDriverId);
          }
        }

        // If no driver ID found, redirect to login
        if (!currentDriverId) {
          console.error('❌ No driver ID found. Please log in.');
          setLoading(false);
          return;
        }

        console.log('🔄 Fetching wallet data for driver:', currentDriverId);

        // Fetch balance from database
        const balanceResult = await db.select({ 
          balance: driversTable.balance 
        }).from(driversTable).where(eq(driversTable.id, currentDriverId));
        
        if (balanceResult.length > 0) {
          const balanceInDollars = balanceResult[0].balance / 100;
          setBalance(balanceInDollars);
          console.log('✅ Balance fetched:', balanceInDollars, '(Raw balance:', balanceResult[0].balance, 'cents)');
        } else {
          console.error('❌ No driver found with ID:', currentDriverId);
          setBalance(0);
        }

        // ✅ UPDATED: Fetch transactions from BOTH driverTransactions AND paymentReferencesTable
        const driverTxResult = await db.select()
          .from(driverTransactions)
          .where(eq(driverTransactions.driver_id, currentDriverId))
          .orderBy(driverTransactions.created_at)
          .limit(10);

        const paymentRefResult = await db.select()
          .from(paymentReferencesTable)
          .where(eq(paymentReferencesTable.driverId, currentDriverId))
          .orderBy(paymentReferencesTable.createdAt)
          .limit(10);

        console.log('📊 TRANSACTION SOURCES:', {
          driverTransactions: driverTxResult.length,
          paymentReferences: paymentRefResult.length
        });

        // Combine both transaction sources
        const allTransactions = [
          ...driverTxResult.map(tx => ({
            id: tx.id,
            amount: tx.amount,
            status: tx.status,
            created_at: tx.created_at,
            type: 'wallet_topup',
            description: 'Wallet Top Up'
          })),
          ...paymentRefResult.map(ref => ({
            id: ref.id,
            amount: ref.amount,
            status: ref.status,
            created_at: ref.createdAt,
            type: 'payment_reference',
            description: 'Mobile Payment',
            reference: ref.reference
          }))
        ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
         .slice(0, 8); // Get latest 8 transactions

        setTransactions(allTransactions);
        console.log('✅ Combined transactions fetched:', allTransactions.length);
        
      } catch (error) {
        console.error('❌ Error fetching wallet data:', error);
        setBalance(0);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();

    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  // ✅ UPDATED: Enhanced manual refresh function with debugging
  const refreshWallet = async () => {
    setRefreshing(true);
    
    if (!driverId) {
      console.error('❌ No driver ID for refresh');
      setRefreshing(false);
      return;
    }

    try {
      console.log('🔄 MANUALLY REFRESHING WALLET DATA FOR DRIVER:', driverId);
      
      const balanceResult = await db.select({ 
        balance: driversTable.balance 
      }).from(driversTable).where(eq(driversTable.id, driverId));
      
      if (balanceResult.length > 0) {
        const newBalance = balanceResult[0].balance / 100;
        setBalance(newBalance);
        console.log('✅ Wallet balance refreshed:', newBalance, '(Raw balance:', balanceResult[0].balance, 'cents)');
        
        // ✅ ADDED: Debug - check if there are any completed payments
        const completedPayments = await db.select()
          .from(paymentReferencesTable)
          .where(
            and(
              eq(paymentReferencesTable.driverId, driverId),
              eq(paymentReferencesTable.status, 'completed')
            )
          );
        
        console.log('🔍 COMPLETED PAYMENTS COUNT:', completedPayments.length);
        completedPayments.forEach(payment => {
          console.log('💰 COMPLETED PAYMENT:', {
            amount: payment.amount,
            amountInDollars: (payment.amount / 100).toFixed(2),
            reference: payment.reference,
            createdAt: payment.createdAt
          });
        });

        // ✅ ADDED: Check driver transactions too
        const driverTx = await db.select()
          .from(driverTransactions)
          .where(eq(driverTransactions.driver_id, driverId));

        console.log('🔍 DRIVER TRANSACTIONS COUNT:', driverTx.length);
        driverTx.forEach(tx => {
          console.log('💳 DRIVER TRANSACTION:', {
            amount: tx.amount,
            amountInDollars: (tx.amount / 100).toFixed(2),
            status: tx.status,
            created_at: tx.created_at
          });
        });
      } else {
        console.error('❌ No driver found during refresh');
      }

      // Refresh transactions too
      const driverTxResult = await db.select()
        .from(driverTransactions)
        .where(eq(driverTransactions.driver_id, driverId))
        .orderBy(driverTransactions.created_at)
        .limit(10);

      const paymentRefResult = await db.select()
        .from(paymentReferencesTable)
        .where(eq(paymentReferencesTable.driverId, driverId))
        .orderBy(paymentReferencesTable.createdAt)
        .limit(10);

      const allTransactions = [
        ...driverTxResult.map(tx => ({
          id: tx.id,
          amount: tx.amount,
          status: tx.status,
          created_at: tx.created_at,
          type: 'wallet_topup',
          description: 'Wallet Top Up'
        })),
        ...paymentRefResult.map(ref => ({
          id: ref.id,
          amount: ref.amount,
          status: ref.status,
          created_at: ref.createdAt,
          type: 'payment_reference',
          description: 'Mobile Payment',
          reference: ref.reference
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
       .slice(0, 8);

      setTransactions(allTransactions);
      console.log('✅ Transactions refreshed:', allTransactions.length);
    } catch (error) {
      console.error('❌ Error refreshing wallet:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Format transaction amount for display
  const formatTransactionAmount = (amount: number, type: string) => {
    const amountInDollars = Math.abs(amount) / 100;
    const sign = amount > 0 ? '+' : '-';
    return `${sign}$${amountInDollars.toFixed(2)}`;
  };

  // Format transaction date
  const formatTransactionDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // Get transaction status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'text-green-600 bg-green-100';
      case 'pending':
        return 'text-yellow-600 bg-yellow-100';
      case 'failed':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <div className="space-y-6">
        {/* Balance Card */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-medium">Available Balance</h3>
            <button 
              onClick={refreshWallet}
              disabled={refreshing || loading}
              className="text-purple-200 hover:text-white text-sm font-medium disabled:opacity-50 transition flex items-center"
            >
              {refreshing ? (
                <>
                  <FiRefreshCw className="w-3 h-3 mr-1 animate-spin" />
                  Refreshing...
                </>
              ) : (
                <>
                  <FiRefreshCw className="w-3 h-3 mr-1" />
                  Refresh
                </>
              )}
            </button>
          </div>
          <div className="flex items-end justify-between">
            <div>
              <p className="text-3xl font-bold">
                {loading ? 'Loading...' : `$${balance.toFixed(2)}`}
              </p>
              <p className="text-purple-200 text-sm mt-1">
                {balance === 0 ? 'Start by adding funds to your wallet' : 'Your current available balance'}
              </p>
            </div>
            <Link 
              href="/driver/topup" 
              className="px-4 py-2 bg-white text-purple-600 rounded-lg text-sm font-medium hover:bg-opacity-90 transition shadow-sm"
            >
              Top Up
            </Link>
          </div>
        </div>
        {/* Recent Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
            <button className="text-sm text-purple-600 hover:text-purple-800 font-medium">
              View All
            </button>
          </div>
          <div className="space-y-3">
            {loading ? (
              <div className="animate-pulse space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
                ))}
              </div>
            ) : transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:border-purple-200 transition-colors">
                  <div className="flex items-center">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                      tx.amount > 0 ? 'bg-green-100 text-green-600' : 'bg-purple-100 text-purple-600'
                    }`}>
                      {tx.amount > 0 ? (
                        <FiArrowUpRight className="w-5 h-5" />
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                          <path d="M4.5 3.75a3 3 0 00-3 3v.75h21v-.75a3 3 0 00-3-3h-15z" />
                        </svg>
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">
                        {tx.description || (tx.amount > 0 ? 'Top Up' : 'Withdrawal')}
                      </h4>
                      <p className="text-sm text-gray-500">
                        {formatTransactionDate(tx.created_at)}
                      </p>
                      {tx.reference && (
                        <p className="text-xs text-gray-400 font-mono">
                          {tx.reference.substring(0, 8)}...
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-medium ${tx.amount > 0 ? 'text-green-600' : 'text-purple-600'}`}>
                      {formatTransactionAmount(tx.amount, tx.type)}
                    </p>
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                      {tx.status}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <FiArrowUpRight className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                <p>No transactions yet</p>
                <p className="text-sm text-gray-400 mt-1">Your transactions will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}