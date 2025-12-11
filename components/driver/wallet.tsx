// components/driver/wallet.tsx - FIXED VERSION
'use client';

import { FiPlus, FiArrowUpRight, FiRefreshCw, FiMinus } from 'react-icons/fi';
import { MdOutlineMoneyOff } from 'react-icons/md';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { db } from '@/src/db/index';
import { driversTable, driverTransactions } from '@/src/db/schema';
import { eq, desc } from 'drizzle-orm'; // ✅ ADDED 'desc' import

// Updated interface for better transaction typing
interface DriverTransaction {
  id: number;
  driver_id: number;
  amount: number; // in cents, positive for top-ups, negative for commissions
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
  const [showCommissionAlert, setShowCommissionAlert] = useState(false);
  const [recentCommission, setRecentCommission] = useState<number>(0);

  // Load driverId and check for commission alerts
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
    
    // Check for refresh parameter
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('refresh') === 'true' && currentDriverId) {
        console.log('🔄 MANUAL REFRESH TRIGGERED VIA URL PARAM');
        const paymentAmount = urlParams.get('amount');
        if (paymentAmount) {
          console.log('💰 PAYMENT SUCCESS DETECTED, AMOUNT:', paymentAmount);
        }
        
        refreshWallet(currentDriverId);
        window.history.replaceState({}, '', '/driver/wallet');
      }
    }
  }, []);

  // Separate useEffect for initial data load
  useEffect(() => {
    if (driverId) {
      fetchData(driverId);
      
      // Set up polling for real-time updates
      const interval = setInterval(() => {
        fetchData(driverId);
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [driverId]);

  // Check for new commission transactions
  useEffect(() => {
    if (transactions.length > 0) {
      checkForCommissionAlerts();
    }
  }, [transactions]);

  const fetchData = async (currentDriverId: number) => {
    try {
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

      // ✅ FIXED: Use proper Drizzle syntax for ordering
      const driverTxResult = await db.select()
        .from(driverTransactions)
        .where(eq(driverTransactions.driver_id, currentDriverId))
        .orderBy(desc(driverTransactions.created_at)) // ✅ FIXED: Use desc() function
        .limit(20);

      console.log('📊 TRANSACTIONS FROM DATABASE:', {
        totalTransactions: driverTxResult.length,
        topUps: driverTxResult.filter(tx => tx.amount > 0).length,
        commissions: driverTxResult.filter(tx => tx.amount < 0).length,
        latestTransaction: driverTxResult[0]?.created_at
      });

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
      console.log('🔄 MANUALLY REFRESHING WALLET DATA FOR DRIVER:', idToUse);
      
      const balanceResult = await db.select({ 
        balance: driversTable.balance 
      }).from(driversTable).where(eq(driversTable.id, idToUse));
      
      if (balanceResult.length > 0) {
        const newBalance = balanceResult[0].balance / 100;
        setBalance(newBalance);
        console.log('✅ Wallet balance refreshed:', newBalance, '(Raw balance:', balanceResult[0].balance, 'cents)');
      } else {
        console.error('❌ No driver found during refresh');
      }

      // ✅ FIXED: Use proper ordering here too
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

  // Check for new commission deductions and show alert
  const checkForCommissionAlerts = () => {
    const lastSeenCommissionTime = localStorage.getItem('lastSeenCommissionTime') || '0';
    
    // Find commission transactions since last check
    const newCommissions = transactions.filter(tx => 
      (tx.payment_intent_id.startsWith('commission_') || tx.amount < 0) && 
      new Date(tx.created_at).getTime() > parseInt(lastSeenCommissionTime)
    );
    
    if (newCommissions.length > 0) {
      const totalCommission = newCommissions.reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
      setRecentCommission(totalCommission / 100); // Convert to dollars
      setShowCommissionAlert(true);
      
      // Update last seen time
      const latestCommissionTime = Math.max(...newCommissions.map(tx => new Date(tx.created_at).getTime()));
      localStorage.setItem('lastSeenCommissionTime', latestCommissionTime.toString());
      
      // Auto-hide alert after 10 seconds
      setTimeout(() => {
        setShowCommissionAlert(false);
      }, 10000);
    }
  };

  // Format transaction amount for display
  const formatTransactionAmount = (amount: number) => {
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

  // Get transaction description based on transaction type
  const getTransactionDescription = (transaction: DriverTransaction) => {
    // Check if it's a commission transaction
    if (transaction.payment_intent_id.startsWith('commission_')) {
      return 'Commission Fee';
    }
    
    // Check if it's a negative amount (could be commission or other deduction)
    if (transaction.amount < 0) {
      return 'Service Fee';
    }
    
    // Regular top-up transactions
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

  // Get transaction icon based on transaction type
  const getTransactionIcon = (transaction: DriverTransaction) => {
    if (transaction.payment_intent_id.startsWith('commission_') || transaction.amount < 0) {
      return (
        <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4 bg-red-100 text-red-600">
          <FiMinus className="w-6 h-6" />
        </div>
      );
    }
    
    return (
      <div className="w-12 h-12 rounded-full flex items-center justify-center mr-4 bg-green-100 text-green-600">
        <FiArrowUpRight className="w-6 h-6" />
      </div>
    );
  };

  // Get transaction amount color
  const getTransactionAmountColor = (amount: number) => {
    if (amount < 0) {
      return 'text-red-600';
    }
    return 'text-green-600';
  };

  // Calculate wallet statistics
  const calculateStats = () => {
    const totalTopUps = transactions.filter(tx => tx.amount > 0).length;
    const successfulTransactions = transactions.filter(tx => tx.status === 'completed').length;
    const pendingTransactions = transactions.filter(tx => tx.status === 'pending').length;
    const totalCommissionDeductions = transactions
      .filter(tx => tx.amount < 0)
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0) / 100;
    
    return {
      totalTopUps,
      successfulTransactions,
      pendingTransactions,
      totalCommissionDeductions
    };
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Commission Alert Banner */}
        {showCommissionAlert && (
          <div className="mb-6 bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-xl p-4 shadow-lg animate-fade-in">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <MdOutlineMoneyOff className="w-6 h-6 mr-3" />
                <div>
                  <h3 className="font-bold">Commission Deducted</h3>
                  <p className="text-sm opacity-90">${recentCommission.toFixed(2)} was deducted from recent deliveries</p>
                </div>
              </div>
              <button
                onClick={() => setShowCommissionAlert(false)}
                className="text-white opacity-80 hover:opacity-100"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Header with Refresh Button */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Wallet</h1>
            <p className="text-gray-600">Manage your earnings, payments, and commission fees</p>
          </div>
          <button
            onClick={handleRefreshClick}
            disabled={refreshing || loading || !driverId}
            className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-700 rounded-lg border border-gray-300 hover:border-purple-500 hover:text-purple-600 transition-all duration-200 disabled:opacity-50 shadow-sm"
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
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-medium">Available Balance</h3>
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full mr-2 ${refreshing ? 'bg-yellow-400 animate-pulse' : 'bg-green-400'}`}></div>
                  <span className="text-sm font-medium">
                    {refreshing ? 'Refreshing...' : 'Live'}
                  </span>
                </div>
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-3xl font-bold">
                    {loading ? 'Loading...' : `$${balance.toFixed(2)}`}
                  </p>
                  <p className="text-purple-200 text-sm mt-1">
                    {balance === 0 
                      ? 'Start by adding funds to your wallet' 
                      : `Commission fee: 13.5% per delivery`}
                  </p>
                </div>
                <Link 
                  href="/driver/topup" 
                  className="px-6 py-3 bg-white text-purple-600 rounded-lg font-medium hover:bg-opacity-90 transition shadow-sm flex items-center space-x-2"
                >
                  <FiPlus className="w-4 h-4" />
                  <span>Top Up</span>
                </Link>
              </div>
            </div>

            {/* Recent Transactions */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Recent Transactions</h3>
                <span className="text-sm text-gray-500">
                  {transactions.length} transactions
                </span>
              </div>
              <div className="space-y-4">
                {loading ? (
                  <div className="animate-pulse space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-gray-100 rounded-lg"></div>
                    ))}
                  </div>
                ) : transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-purple-200 transition-colors">
                      <div className="flex items-center">
                        {getTransactionIcon(tx)}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">
                            {getTransactionDescription(tx)}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {formatTransactionDate(tx.created_at)}
                          </p>
                          {/* Show delivery ID for commission transactions */}
                          {tx.payment_intent_id.startsWith('commission_') && (
                            <p className="text-xs text-gray-400">
                              Delivery #{tx.payment_intent_id.split('_')[1]}
                            </p>
                          )}
                          {/* Show reference for regular payments */}
                          {!tx.payment_intent_id.startsWith('commission_') && tx.payment_intent_id && (
                            <p className="text-xs text-gray-400 font-mono truncate max-w-[200px]">
                              Ref: {tx.payment_intent_id}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium text-lg ${getTransactionAmountColor(tx.amount)}`}>
                          {formatTransactionAmount(tx.amount)}
                        </p>
                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(tx.status)}`}>
                          {tx.status}
                        </span>
                        {tx.payment_intent_id.startsWith('commission_') && (
                          <p className="text-xs text-gray-500 mt-1">13.5% fee</p>
                        )}
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
                      className="inline-flex items-center space-x-2 px-6 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-colors"
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
            <div className="bg-white rounded-lg p-6 border border-gray-200 shadow-sm">
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
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Commission Deductions</span>
                  <span className="font-semibold text-red-600">
                    ${stats.totalCommissionDeductions.toFixed(2)}
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

            {/* Commission Info Card */}
            <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-lg p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <MdOutlineMoneyOff className="w-6 h-6 text-red-600" />
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Commission Fees</h4>
                <p className="text-gray-600 text-sm mb-4">
                  13.5% of each cash delivery is deducted from your wallet balance upon customer confirmation.
                </p>
                <div className="text-xs text-gray-500 bg-white/50 p-2 rounded-lg mb-4">
                  <p>• $10 fare = $1.35 commission</p>
                  <p>• $20 fare = $2.70 commission</p>
                  <p>• $50 fare = $6.75 commission</p>
                </div>
                <button className="w-full py-2 bg-white text-red-600 border border-red-200 rounded-lg font-medium hover:bg-red-50 transition-colors">
                  View Commission History
                </button>
              </div>
            </div>

            {/* Support Card */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h4 className="font-semibold text-gray-900 mb-2">Need Help?</h4>
                <p className="text-gray-600 text-sm mb-4">Having issues with payments or transactions?</p>
                <button className="w-full py-2 bg-white text-blue-600 border border-blue-200 rounded-lg font-medium hover:bg-blue-50 transition-colors">
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Add CSS for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}