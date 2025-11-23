//pages/api/admin/WalletHistory.tsx
'use client';
import { useState, useEffect } from 'react';
import { SelectAdminWalletAdjustment } from '@/src/db/schema';
import { 
  Download, 
  Filter, 
  Search,
  Plus,
  Minus,
  Settings,
  Calendar,
  User
} from 'lucide-react';

interface WalletHistoryProps {
  driverId: number;
}

export default function WalletHistory({ driverId }: WalletHistoryProps) {
  const [adjustments, setAdjustments] = useState<SelectAdminWalletAdjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWalletHistory();
  }, [driverId]);

  const fetchWalletHistory = async () => {
    try {
      const response = await fetch(`/api/admin/wallet/history?driverId=${driverId}`);
      const data = await response.json();
      
      if (response.ok) {
        setAdjustments(data.adjustments);
      }
    } catch (error) {
      console.error('Error fetching wallet history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(balance / 100);
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

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'add_funds':
        return { color: 'text-emerald-400', icon: <Plus className="w-4 h-4" />, label: 'Funds Added' };
      case 'deduct_funds':
        return { color: 'text-red-400', icon: <Minus className="w-4 h-4" />, label: 'Funds Deducted' };
      case 'set_balance':
        return { color: 'text-blue-400', icon: <Settings className="w-4 h-4" />, label: 'Balance Set' };
      default:
        return { color: 'text-gray-400', icon: <Settings className="w-4 h-4" />, label: 'Adjustment' };
    }
  };

  const getReasonConfig = (reason: string) => {
    const reasonMap: { [key: string]: string } = {
      reward: 'Reward / Bonus',
      refund: 'Refund',
      correction: 'System Correction',
      penalty: 'Penalty',
      other: 'Other'
    };
    return reasonMap[reason] || reason;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-bold text-white">Wallet History</h3>
          <p className="text-purple-300 mt-1">
            {adjustments.length} adjustment{adjustments.length !== 1 ? 's' : ''} recorded
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white py-2.5 px-4 rounded-xl transition-all duration-200">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-4 h-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by reason, note, or admin..."
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-purple-500/30 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>
          <div className="lg:col-span-4">
            <select className="w-full px-4 py-3 bg-gray-700 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200">
              <option value="all">All Types</option>
              <option value="add_funds">Add Funds</option>
              <option value="deduct_funds">Deduct Funds</option>
              <option value="set_balance">Set Balance</option>
            </select>
          </div>
        </div>
      </div>

      {/* Adjustments List */}
      <div className="space-y-4">
        {adjustments.length === 0 ? (
          <div className="text-center py-12 bg-gray-800/30 rounded-2xl border border-purple-500/20">
            <div className="text-purple-400 text-6xl mb-4">💸</div>
            <h4 className="text-xl font-semibold text-white mb-2">No Adjustments Yet</h4>
            <p className="text-purple-300">
              No wallet adjustments have been made for this driver.
            </p>
          </div>
        ) : (
          adjustments.map((adjustment) => {
            const typeConfig = getTypeConfig(adjustment.type);
            
            return (
              <div
                key={adjustment.id}
                className="bg-gray-800/50 rounded-2xl border border-gray-700/50 p-6 backdrop-blur-sm hover:border-purple-500/30 transition-all duration-200"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${typeConfig.color} bg-current/20`}>
                      {typeConfig.icon}
                    </div>
                    <div>
                      <h4 className="text-white font-semibold">{typeConfig.label}</h4>
                      <p className="text-purple-300 text-sm">
                        {getReasonConfig(adjustment.reason)}
                      </p>
                    </div>
                  </div>
                  <div className={`text-lg font-bold ${
                    adjustment.amount >= 0 ? 'text-emerald-400' : 'text-red-400'
                  }`}>
                    {adjustment.amount >= 0 ? '+' : ''}{formatBalance(adjustment.amount)}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-purple-300">Previous Balance:</span>
                    <div className="text-white font-medium">{formatBalance(adjustment.previousBalance)}</div>
                  </div>
                  <div>
                    <span className="text-purple-300">New Balance:</span>
                    <div className="text-white font-medium">{formatBalance(adjustment.newBalance)}</div>
                  </div>
                  <div>
                    <span className="text-purple-300">Date:</span>
                    <div className="text-white font-medium">{formatDate(adjustment.createdAt)}</div>
                  </div>
                </div>

                {adjustment.note && (
                  <div className="mt-4 p-3 bg-gray-700/30 rounded-lg border border-gray-600/30">
                    <p className="text-purple-300 text-sm">{adjustment.note}</p>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}