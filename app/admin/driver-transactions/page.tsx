//app/admin/driver-transactions/page.tsx
'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, Filter, Download, Eye, CreditCard, User, Phone, Calendar, DollarSign, Hash, RefreshCw, TrendingUp, BarChart3, Clock, CheckCircle, XCircle, Trash2, Copy } from 'lucide-react';
import { createPubNubClient } from '@/lib/pubnub-booking';

// Type definitions based on your schema
interface DriverTransaction {
  id: number;
  driver_id: number;
  amount: number;
  payment_intent_id: string;
  status: 'completed' | 'pending' | 'failed';
  created_at: string;
  driver?: {
    id: number;
    firstName: string;
    lastName: string;
    phoneNumber: string;
    profilePictureUrl?: string;
    email: string;
  };
}

interface TransactionFilters {
  status: string;
  dateRange: {
    start: string;
    end: string;
  };
  minAmount: number;
  maxAmount: number;
  driverId: string;
}

export default function DriverTransactionsPage() {
  const [transactions, setTransactions] = useState<DriverTransaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<DriverTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<TransactionFilters>({
    status: 'all',
    dateRange: {
      start: '',
      end: ''
    },
    minAmount: 0,
    maxAmount: 10000,
    driverId: ''
  });
  const [stats, setStats] = useState({
    totalTransactions: 0,
    totalAmount: 0,
    completedTransactions: 0,
    pendingTransactions: 0,
    failedTransactions: 0
  });
  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Load initial transactions
  const loadTransactions = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/driver-transactions');
      
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      
      const data = await response.json();
      setTransactions(data.transactions || []);
      updateStats(data.transactions || []);
    } catch (error) {
      console.error('Error loading transactions:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Update statistics
  const updateStats = (txs: DriverTransaction[]) => {
    const totalAmount = txs.reduce((sum, tx) => sum + tx.amount, 0);
    const completedTransactions = txs.filter(tx => tx.status === 'completed').length;
    const pendingTransactions = txs.filter(tx => tx.status === 'pending').length;
    const failedTransactions = txs.filter(tx => tx.status === 'failed').length;

    setStats({
      totalTransactions: txs.length,
      totalAmount,
      completedTransactions,
      pendingTransactions,
      failedTransactions
    });
  };

  // Apply filters and search
  useEffect(() => {
    let filtered = transactions;

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.driver?.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.driver?.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.driver?.phoneNumber?.includes(searchTerm) ||
        tx.payment_intent_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.driver?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(tx => tx.status === filters.status);
    }

    // Apply date range filter
    if (filters.dateRange.start) {
      filtered = filtered.filter(tx => 
        new Date(tx.created_at) >= new Date(filters.dateRange.start)
      );
    }
    if (filters.dateRange.end) {
      filtered = filtered.filter(tx => 
        new Date(tx.created_at) <= new Date(filters.dateRange.end + 'T23:59:59')
      );
    }

    // Apply amount range filter
    filtered = filtered.filter(tx => 
      tx.amount >= filters.minAmount && tx.amount <= filters.maxAmount
    );

    // Apply driver ID filter
    if (filters.driverId) {
      filtered = filtered.filter(tx => 
        tx.driver_id.toString() === filters.driverId
      );
    }

    setFilteredTransactions(filtered);
  }, [transactions, searchTerm, filters]);

  // Delete transaction
  const deleteTransaction = async (transactionId: number) => {
    if (!confirm('Are you sure you want to delete this transaction? This action cannot be undone.')) {
      return;
    }

    try {
      setDeletingId(transactionId);
      const response = await fetch(`/api/admin/driver-transactions`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ transactionId }),
      });

      if (!response.ok) {
        throw new Error('Failed to delete transaction');
      }

      // Remove from local state
      setTransactions(prev => prev.filter(tx => tx.id !== transactionId));
      
      console.log('✅ Transaction deleted successfully');
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Failed to delete transaction');
    } finally {
      setDeletingId(null);
    }
  };

  // Copy payment ID to clipboard
  const copyPaymentId = (paymentId: string) => {
    navigator.clipboard.writeText(paymentId);
    // You could add a toast notification here
    console.log('Payment ID copied to clipboard:', paymentId);
  };

  // PubNub real-time updates using your existing setup
  useEffect(() => {
    // Create PubNub client for admin dashboard
    const pubnub = createPubNubClient('admin_dashboard');
    
    // Subscribe to transaction updates channel
    const channel = 'driver-transactions-updates';
    
    const listener = {
      message: (event: any) => {
        console.log('Real-time transaction update:', event);
        
        if (event.message.type === 'TRANSACTION_UPDATE') {
          const updatedTransaction = event.message.data;
          
          setTransactions(prev => {
            const existingIndex = prev.findIndex(tx => tx.id === updatedTransaction.id);
            let newTransactions;
            
            if (existingIndex >= 0) {
              // Update existing transaction
              newTransactions = [...prev];
              newTransactions[existingIndex] = updatedTransaction;
            } else {
              // Add new transaction
              newTransactions = [updatedTransaction, ...prev];
            }
            
            updateStats(newTransactions);
            return newTransactions;
          });
        }
      },
      status: (event: any) => {
        console.log('PubNub status:', event);
      }
    };

    pubnub.addListener(listener);
    pubnub.subscribe({ channels: [channel] });

    return () => {
      pubnub.removeListener(listener);
      pubnub.unsubscribe({ channels: [channel] });
    };
  }, []);

  // Initial load
  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Export transactions to CSV
  const exportToCSV = () => {
    const headers = ['ID', 'Driver Name', 'Phone', 'Amount', 'Status', 'Payment ID', 'Date'];
    const csvData = filteredTransactions.map(tx => [
      tx.id,
      `${tx.driver?.firstName} ${tx.driver?.lastName}`,
      tx.driver?.phoneNumber,
      `$${(tx.amount / 100).toFixed(2)}`,
      tx.status,
      tx.payment_intent_id,
      new Date(tx.created_at).toLocaleDateString()
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `driver-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
      case 'pending': return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'failed': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const formatAmount = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-amber-200 bg-clip-text text-transparent">
            Driver Transactions
          </h1>
          <p className="text-purple-300 text-lg">
            Monitor and manage all driver payments and earnings in real-time
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={loadTransactions}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded-xl border border-amber-500/20 text-amber-300 hover:border-amber-500/40 hover:text-amber-200 transition-all duration-200 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-500/20 rounded-xl border border-amber-500/30 text-amber-300 hover:bg-amber-500/30 hover:border-amber-500/40 transition-all duration-200"
          >
            <Download className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          title="Total Transactions"
          value={stats.totalTransactions.toString()}
          change="+12%"
          trend="up"
          icon={<CreditCard className="w-5 h-5" />}
          color="purple"
        />
        <StatsCard
          title="Total Amount"
          value={formatAmount(stats.totalAmount)}
          change="+18%"
          trend="up"
          icon={<DollarSign className="w-5 h-5" />}
          color="green"
        />
        <StatsCard
          title="Completed"
          value={stats.completedTransactions.toString()}
          change="+8%"
          trend="up"
          icon={<CheckCircle className="w-5 h-5" />}
          color="emerald"
        />
        <StatsCard
          title="Pending"
          value={stats.pendingTransactions.toString()}
          change="+3%"
          trend="neutral"
          icon={<Clock className="w-5 h-5" />}
          color="amber"
        />
        <StatsCard
          title="Failed"
          value={stats.failedTransactions.toString()}
          change="-5%"
          trend="down"
          icon={<XCircle className="w-5 h-5" />}
          color="red"
        />
      </div>

      {/* Search and Filters */}
      <div className="bg-gray-800 rounded-2xl border border-amber-500/20 p-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-amber-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by driver name, phone, email, or payment ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-amber-500/20 rounded-xl text-white placeholder-purple-300 focus:border-amber-500/40 focus:outline-none transition-colors duration-200"
            />
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center space-x-2 px-4 py-3 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-300 hover:bg-amber-500/30 hover:border-amber-500/40 transition-all duration-200"
          >
            <Filter className="w-4 h-4" />
            <span>Filters</span>
          </button>
        </div>

        {/* Advanced Filters */}
        {showFilters && (
          <div className="mt-6 p-4 bg-gray-700/50 rounded-xl border border-amber-500/20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className="block text-amber-300 text-sm font-medium mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-amber-500/20 rounded-lg text-white focus:border-amber-500/40 focus:outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Date Range */}
              <div>
                <label className="block text-amber-300 text-sm font-medium mb-2">From Date</label>
                <input
                  type="date"
                  value={filters.dateRange.start}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, start: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-amber-500/20 rounded-lg text-white focus:border-amber-500/40 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-amber-300 text-sm font-medium mb-2">To Date</label>
                <input
                  type="date"
                  value={filters.dateRange.end}
                  onChange={(e) => setFilters(prev => ({ 
                    ...prev, 
                    dateRange: { ...prev.dateRange, end: e.target.value }
                  }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-amber-500/20 rounded-lg text-white focus:border-amber-500/40 focus:outline-none"
                />
              </div>

              {/* Driver ID */}
              <div>
                <label className="block text-amber-300 text-sm font-medium mb-2">Driver ID</label>
                <input
                  type="text"
                  placeholder="Driver ID"
                  value={filters.driverId}
                  onChange={(e) => setFilters(prev => ({ ...prev, driverId: e.target.value }))}
                  className="w-full px-3 py-2 bg-gray-600 border border-amber-500/20 rounded-lg text-white placeholder-purple-300 focus:border-amber-500/40 focus:outline-none"
                />
              </div>
            </div>

            {/* Amount Range */}
            <div className="mt-4">
              <label className="block text-amber-300 text-sm font-medium mb-2">
                Amount Range: ${filters.minAmount} - ${filters.maxAmount}
              </label>
              <div className="flex space-x-4">
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={filters.minAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, minAmount: parseInt(e.target.value) }))}
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max="10000"
                  step="100"
                  value={filters.maxAmount}
                  onChange={(e) => setFilters(prev => ({ ...prev, maxAmount: parseInt(e.target.value) }))}
                  className="flex-1"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Transactions Table */}
      <div className="bg-gray-800 rounded-2xl border border-amber-500/20 overflow-hidden">
        <div className="p-6 border-b border-amber-500/20">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center space-x-3">
              <CreditCard className="w-6 h-6 text-amber-400" />
              <span>Transaction History</span>
            </h2>
            <div className="text-amber-300 text-sm">
              Showing {filteredTransactions.length} of {transactions.length} transactions
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500 mx-auto mb-4"></div>
            <p className="text-amber-300">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-12 text-center">
            <CreditCard className="w-16 h-16 text-amber-400 mx-auto mb-4 opacity-50" />
            <p className="text-amber-300 text-lg">No transactions found</p>
            <p className="text-purple-300 mt-2">
              {transactions.length === 0 ? 'No transactions have been processed yet.' : 'Try adjusting your search or filters.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-amber-500/20">
                  <th className="text-left p-4 text-amber-300 font-medium">Driver</th>
                  <th className="text-left p-4 text-amber-300 font-medium">Contact</th>
                  <th className="text-left p-4 text-amber-300 font-medium">Amount</th>
                  <th className="text-left p-4 text-amber-300 font-medium">Status</th>
                  <th className="text-left p-4 text-amber-300 font-medium">Payment ID</th>
                  <th className="text-left p-4 text-amber-300 font-medium">Date</th>
                  <th className="text-left p-4 text-amber-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((transaction) => (
                  <tr 
                    key={transaction.id}
                    className="border-b border-amber-500/10 hover:bg-amber-500/5 transition-colors duration-150"
                  >
                    <td className="p-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 font-medium">
                          {transaction.driver?.profilePictureUrl ? (
                            <img 
                              src={transaction.driver.profilePictureUrl} 
                              alt={`${transaction.driver.firstName} ${transaction.driver.lastName}`}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <User className="w-5 h-5" />
                          )}
                        </div>
                        <div>
                          <div className="text-white font-medium">
                            {transaction.driver?.firstName} {transaction.driver?.lastName}
                          </div>
                          <div className="text-purple-300 text-sm">
                            ID: {transaction.driver_id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2 text-purple-300">
                          <Phone className="w-4 h-4" />
                          <span className="text-sm">{transaction.driver?.phoneNumber}</span>
                        </div>
                        <div className="text-xs text-gray-400 truncate max-w-[200px]">
                          {transaction.driver?.email}
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="text-white font-semibold text-lg">
                        {formatAmount(transaction.amount)}
                      </div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(transaction.status)}`}>
                        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2 group">
                        <Hash className="w-4 h-4 text-amber-400" />
                        <code 
                          className="text-purple-300 text-sm font-mono bg-gray-700 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors duration-200 group relative"
                          onClick={() => copyPaymentId(transaction.payment_intent_id)}
                          title="Click to copy full Payment ID"
                        >
                          {transaction.payment_intent_id}
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                            Click to copy
                          </div>
                        </code>
                        <button 
                          onClick={() => copyPaymentId(transaction.payment_intent_id)}
                          className="p-1 text-amber-400 hover:text-amber-300 transition-colors duration-200"
                          title="Copy Payment ID"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2 text-purple-300">
                        <Calendar className="w-4 h-4" />
                        <span className="text-sm">{formatDate(transaction.created_at)}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center space-x-2">
                        <button 
                          className="flex items-center space-x-2 px-3 py-2 bg-amber-500/20 border border-amber-500/30 rounded-lg text-amber-300 hover:bg-amber-500/30 hover:border-amber-500/40 transition-all duration-200"
                          title="View transaction details"
                        >
                          <Eye className="w-4 h-4" />
                          <span className="text-sm">View</span>
                        </button>
                        <button 
                          onClick={() => deleteTransaction(transaction.id)}
                          disabled={deletingId === transaction.id}
                          className="flex items-center space-x-2 px-3 py-2 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300 hover:bg-red-500/30 hover:border-red-500/40 transition-all duration-200 disabled:opacity-50"
                          title="Delete transaction"
                        >
                          {deletingId === transaction.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                          <span className="text-sm">Delete</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Stats Card Component
interface StatsCardProps {
  title: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

function StatsCard({ title, value, change, trend, icon, color }: StatsCardProps) {
  const colorClasses = {
    purple: 'from-purple-600 to-purple-700',
    green: 'from-emerald-600 to-emerald-700', 
    emerald: 'from-emerald-600 to-emerald-700',
    amber: 'from-amber-600 to-amber-700',
    red: 'from-red-600 to-red-700'
  };

  const trendIcons = {
    up: <TrendingUp className="w-4 h-4" />,
    down: <TrendingUp className="w-4 h-4 rotate-180" />,
    neutral: <BarChart3 className="w-4 h-4" />
  };

  const trendColors = {
    up: 'text-emerald-400',
    down: 'text-red-400', 
    neutral: 'text-amber-400'
  };

  return (
    <div className="bg-gray-800 rounded-2xl border border-amber-500/20 p-6 hover:border-amber-500/40 transition-all duration-300 group">
      <div className="flex items-center justify-between">
        <div className="space-y-3">
          <p className="text-amber-300 text-sm font-medium">{title}</p>
          <p className="text-white font-bold text-2xl">{value}</p>
          <div className={`flex items-center space-x-2 ${trendColors[trend]}`}>
            {trendIcons[trend]}
            <span className="text-sm font-medium">{change}</span>
          </div>
        </div>
        <div className="p-3 bg-amber-500/20 rounded-xl text-amber-400 group-hover:scale-110 transition-transform duration-300">
          {icon}
        </div>
      </div>
    </div>
  );
}