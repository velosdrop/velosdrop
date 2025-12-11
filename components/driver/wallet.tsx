//components/driver/wallet.tsx
'use client';

import { FiPlus, FiArrowUpRight, FiRefreshCw, FiMinus } from 'react-icons/fi';
import { MdOutlineMoneyOff } from 'react-icons/md';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { db } from '@/src/db/index';
import { driversTable, driverTransactions } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm';

interface DriverTransaction {
  id: number;
  driver_id: number;
  amount: number;
  payment_intent_id: string;
  status: string;
  created_at: string;
}

export default function Wallet() {
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState<DriverTransaction[]>([]);
  const [driverId, setDriverId] = useState<number | null>(null);

  useEffect(() => {
    const loadDriverId = () => {
      if (typeof window !== 'undefined') {
        const savedDriverId = localStorage.getItem('driverId');
        if (savedDriverId) {
          const id = parseInt(savedDriverId);
          setDriverId(id);
          console.log('✅ Driver ID loaded:', id);
          return id;
        } else {
          console.error('❌ No driver ID found in localStorage');
          return null;
        }
      }
      return null;
    };

    const currentDriverId = loadDriverId();
    
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('refresh') === 'true' && currentDriverId) {
        console.log('🔄 Manual refresh triggered');
        refreshWallet(currentDriverId);
        window.history.replaceState({}, '', '/driver/wallet');
      }
    }
  }, []);

  useEffect(() => {
    if (driverId) {
      fetchData(driverId);
      
      const interval = setInterval(() => {
        fetchData(driverId);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [driverId]);

  const fetchData = async (currentDriverId: number) => {
    try {
      console.log('🔄 Fetching wallet data for driver:', currentDriverId);

      const balanceResult = await db.select({ 
        balance: driversTable.balance 
      }).from(driversTable).where(eq(driversTable.id, currentDriverId));
      
      if (balanceResult.length > 0) {
        const balanceInDollars = balanceResult[0].balance / 100;
        setBalance(balanceInDollars);
        console.log('✅ Balance fetched:', balanceInDollars);
      } else {
        console.error('❌ No driver found with ID:', currentDriverId);
        setBalance(0);
      }

      const driverTxResult = await db.select()
        .from(driverTransactions)
        .where(eq(driverTransactions.driver_id, currentDriverId))
        .orderBy(desc(driverTransactions.created_at))
        .limit(20);

      console.log('📊 Transactions from database:', driverTxResult.length);
      setTransactions(driverTxResult);
      
    } catch (error) {
      console.error('❌ Error fetching wallet data:', error);
      setBalance(0);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const refreshWallet = async (currentDriverId?: number) => {
    const idToUse = currentDriverId || driverId;
    
    if (!idToUse) {
      console.error('❌ No driver ID for refresh');
      setRefreshing(false);
      return;
    }

    setRefreshing(true);
    
    try {
      console.log('🔄 Manually refreshing wallet data');
      
      const balanceResult = await db.select({ 
        balance: driversTable.balance 
      }).from(driversTable).where(eq(driversTable.id, idToUse));
      
      if (balanceResult.length > 0) {
        const newBalance = balanceResult[0].balance / 100;
        setBalance(newBalance);
        console.log('✅ Wallet balance refreshed:', newBalance);
      } else {
        console.error('❌ No driver found during refresh');
      }

      const driverTxResult = await db.select()
        .from(driverTransactions)
        .where(eq(driverTransactions.driver_id, idToUse))
        .orderBy(desc(driverTransactions.created_at))
        .limit(20);

      setTransactions(driverTxResult);
      console.log('✅ Transactions refreshed:', driverTxResult.length);
    } catch (error) {
      console.error('❌ Error refreshing wallet:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefreshClick = () => {
    refreshWallet();
  };

  const formatTransactionAmount = (amount: number) => {
    const amountInDollars = Math.abs(amount) / 100;
    const sign = amount > 0 ? '+' : '-';
    return `${sign}$${amountInDollars.toFixed(2)}`;
  };

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

  const getTransactionDescription = (transaction: DriverTransaction) => {
    if (transaction.payment_intent_id.startsWith('commission_')) {
      return 'Service Fee';
    }
    
    if (transaction.amount < 0) {
      return 'Service Fee';
    }
    
    switch (transaction.status) {
      case 'completed':
        return 'Wallet Top Up';
      case 'pending':
        return 'Wallet Top Up - Pending';
      case 'failed':
        return 'Wallet Top Up - Failed';
      default:
        return 'Wallet Transaction';
    }
  };

  const getTransactionIcon = (transaction: DriverTransaction) => {
    if (transaction.payment_intent_id.startsWith('commission_') || transaction.amount < 0) {
      return (
        <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-red-50 text-red-600 shrink-0">
          <FiMinus className="w-5 h-5" />
        </div>
      );
    }
    
    return (
      <div className="w-10 h-10 rounded-full flex items-center justify-center mr-3 bg-green-50 text-green-600 shrink-0">
        <FiArrowUpRight className="w-5 h-5" />
      </div>
    );
  };

  const getTransactionAmountColor = (amount: number) => {
    if (amount < 0) {
      return 'text-red-600';
    }
    return 'text-green-600';
  };

  const calculateStats = () => {
    const totalTopUps = transactions.filter(tx => tx.amount > 0).length;
    const successfulTransactions = transactions.filter(tx => tx.status === 'completed').length;
    const pendingTransactions = transactions.filter(tx => tx.status === 'pending').length;
    
    return {
      totalTopUps,
      successfulTransactions,
      pendingTransactions
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50 py-6 px-4 sm:px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header with Refresh Button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
            <p className="text-gray-600">Manage your earnings and payments</p>
          </div>
          <button
            onClick={handleRefreshClick}
            disabled={refreshing || loading || !driverId}
            className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-white text-gray-700 rounded-lg border border-gray-300 hover:border-purple-500 hover:text-purple-600 transition-all duration-200 disabled:opacity-50 shadow-sm w-full sm:w-auto"
          >
            <FiRefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Balance Card */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-lg font-medium">Available Balance</h3>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${refreshing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                  <span className="text-sm font-medium">
                    {refreshing ? 'Refreshing...' : 'Live'}
                  </span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div className="flex-1">
                  <p className="text-3xl sm:text-4xl font-bold">
                    {loading ? 'Loading...' : `$${balance.toFixed(2)}`}
                  </p>
                  <p className="text-purple-200 text-sm mt-2">
                    {balance === 0 
                      ? 'Start by adding funds to your wallet' 
                      : 'Ready for use'}
                  </p>
                </div>
                <Link 
                  href="/driver/topup" 
                  className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-white text-purple-600 rounded-lg font-medium hover:bg-opacity-90 transition shadow-sm w-full sm:w-auto"
                >
                  <FiPlus className="w-4 h-4" />
                  <span>Top Up</span>
                </Link>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-2">
                <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                <span className="text-sm text-gray-500">
                  {transactions.length} transactions
                </span>
              </div>
              <div className="space-y-3">
                {loading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
                    ))}
                  </div>
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div key={tx.id} className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-200 transition-colors">
                      <div className="flex items-start min-w-0 flex-1">
                        {getTransactionIcon(tx)}
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col">
                            <h4 className="font-medium text-gray-900">
                              {getTransactionDescription(tx)}
                            </h4>
                            <div className="mt-1">
                              <p className="text-sm text-gray-500">
                                {formatTransactionDate(tx.created_at)}
                              </p>
                              {tx.payment_intent_id.startsWith('commission_') ? (
                                <p className="text-xs text-gray-400 mt-0.5">
                                  Delivery #{tx.payment_intent_id.split('_')[1]}
                                </p>
                              ) : (
                                <div className="flex flex-col mt-1">
                                  <p className="text-xs text-gray-500 font-mono break-all" style={{ wordBreak: 'break-all' }}>
                                    Ref: {tx.payment_intent_id}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end ml-3 shrink-0">
                        <p className={`font-semibold text-lg ${getTransactionAmountColor(tx.amount)}`}>
                          {formatTransactionAmount(tx.amount)}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <FiArrowUpRight className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No transactions yet</h3>
                    <p className="text-gray-600 mb-6">Your transaction history will appear here</p>
                    <Link 
                      href="/driver/topup"
                      className="inline-flex items-center justify-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors w-full sm:w-auto"
                    >
                      <FiPlus className="w-5 h-5" />
                      <span>Make Your First Top Up</span>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Wallet Statistics */}
            <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Wallet Overview</h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Total Top Ups</span>
                  <span className="font-semibold text-gray-900">
                    {stats.totalTopUps}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Successful</span>
                  <span className="font-semibold text-green-600">
                    {stats.successfulTransactions}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Pending</span>
                  <span className="font-semibold text-yellow-600">
                    {stats.pendingTransactions}
                  </span>
                </div>
                <div className="pt-4 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Current Balance</span>
                    <span className="font-bold text-lg text-gray-900">
                      ${balance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Card */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Need Help?</h4>
                <p className="text-gray-600 text-sm mb-4">Having issues with payments or transactions?</p>
                <button className="w-full py-2.5 bg-white text-blue-600 border border-blue-200 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}