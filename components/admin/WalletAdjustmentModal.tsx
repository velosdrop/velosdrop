//components/admin/WalletAdjustmentModal.tsx
'use client';
import { useState, useEffect } from 'react';
import { SelectDriver } from '@/src/db/schema';
import { 
  X, 
  DollarSign, 
  Plus, 
  Minus, 
  Settings,
  Gift,
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Info
} from 'lucide-react';

interface WalletAdjustmentModalProps {
  driver: SelectDriver;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface AdjustmentForm {
  type: 'add_funds' | 'deduct_funds' | 'set_balance';
  amount: string;
  reason: 'reward' | 'refund' | 'correction' | 'penalty' | 'other';
  note: string;
}

export default function WalletAdjustmentModal({ 
  driver, 
  isOpen, 
  onClose, 
  onSuccess 
}: WalletAdjustmentModalProps) {
  const [form, setForm] = useState<AdjustmentForm>({
    type: 'add_funds',
    amount: '',
    reason: 'reward',
    note: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState<{ newBalance: number; change: number } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setForm({
        type: 'add_funds',
        amount: '',
        reason: 'reward',
        note: ''
      });
      setError('');
      setPreview(null);
    }
  }, [isOpen]);

  useEffect(() => {
    calculatePreview();
  }, [form.amount, form.type]);

  const calculatePreview = () => {
    if (!form.amount || isNaN(parseFloat(form.amount))) {
      setPreview(null);
      return;
    }

    const amountInCents = Math.round(parseFloat(form.amount) * 100);
    let newBalance = driver.balance;
    let change = 0;

    switch (form.type) {
      case 'add_funds':
        change = amountInCents;
        newBalance = driver.balance + amountInCents;
        break;
      case 'deduct_funds':
        change = -amountInCents;
        newBalance = driver.balance - amountInCents;
        break;
      case 'set_balance':
        change = amountInCents - driver.balance;
        newBalance = amountInCents;
        break;
    }

    setPreview({ newBalance, change });
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(balance / 100);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!form.amount || isNaN(parseFloat(form.amount)) || parseFloat(form.amount) <= 0) {
      setError('Please enter a valid amount');
      setLoading(false);
      return;
    }

    const amountInCents = Math.round(parseFloat(form.amount) * 100);

    // Validation for deduct funds
    if (form.type === 'deduct_funds' && amountInCents > driver.balance) {
      setError('Cannot deduct more than current balance');
      setLoading(false);
      return;
    }

    // Validation for negative balance
    if (form.type === 'deduct_funds' && (driver.balance - amountInCents) < 0) {
      setError('Balance cannot be negative');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/admin/wallet/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          driverId: driver.id,
          amount: amountInCents,
          type: form.type,
          reason: form.reason,
          note: form.note,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        setError(data.error || 'Failed to update wallet balance');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getReasonOptions = () => {
    const baseOptions = [
      { value: 'reward', label: 'Reward / Bonus', icon: <Gift className="w-4 h-4" /> },
      { value: 'refund', label: 'Refund', icon: <RotateCcw className="w-4 h-4" /> },
      { value: 'correction', label: 'System Correction', icon: <Settings className="w-4 h-4" /> },
      { value: 'penalty', label: 'Penalty', icon: <AlertTriangle className="w-4 h-4" /> },
      { value: 'other', label: 'Other', icon: <Info className="w-4 h-4" /> },
    ];

    // Filter out penalty option for add funds
    if (form.type === 'add_funds') {
      return baseOptions.filter(option => option.value !== 'penalty');
    }

    // Filter out reward option for deduct funds
    if (form.type === 'deduct_funds') {
      return baseOptions.filter(option => option.value !== 'reward');
    }

    return baseOptions;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl w-full max-w-md border border-purple-500/20 shadow-2xl shadow-purple-500/10">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-purple-600 to-blue-600 p-6 rounded-t-3xl">
          <div className="absolute inset-0 bg-black/10 rounded-t-3xl"></div>
          <div className="relative flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <DollarSign className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Adjust Wallet Balance</h2>
                <p className="text-purple-100 text-sm">
                  {driver.firstName} {driver.lastName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Current Balance */}
        <div className="p-6 border-b border-gray-700/50">
          <div className="text-center">
            <p className="text-purple-300 text-sm mb-1">Current Balance</p>
            <p className="text-3xl font-bold text-white">{formatBalance(driver.balance)}</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Adjustment Type */}
          <div>
            <label className="block text-sm font-semibold text-purple-300 mb-3">
              Adjustment Type
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, type: 'add_funds' }))}
                className={`p-3 rounded-xl border transition-all duration-200 ${
                  form.type === 'add_funds'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                    : 'bg-gray-700/50 border-gray-600/30 text-gray-400 hover:border-emerald-500/30'
                }`}
              >
                <Plus className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs font-medium">Add Funds</span>
              </button>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, type: 'deduct_funds' }))}
                className={`p-3 rounded-xl border transition-all duration-200 ${
                  form.type === 'deduct_funds'
                    ? 'bg-red-500/20 border-red-500/50 text-red-400'
                    : 'bg-gray-700/50 border-gray-600/30 text-gray-400 hover:border-red-500/30'
                }`}
              >
                <Minus className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs font-medium">Deduct Funds</span>
              </button>
              <button
                type="button"
                onClick={() => setForm(prev => ({ ...prev, type: 'set_balance' }))}
                className={`p-3 rounded-xl border transition-all duration-200 ${
                  form.type === 'set_balance'
                    ? 'bg-blue-500/20 border-blue-500/50 text-blue-400'
                    : 'bg-gray-700/50 border-gray-600/30 text-gray-400 hover:border-blue-500/30'
                }`}
              >
                <Settings className="w-5 h-5 mx-auto mb-1" />
                <span className="text-xs font-medium">Set Balance</span>
              </button>
            </div>
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-semibold text-purple-300 mb-2">
              Amount (USD)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 text-purple-400 w-4 h-4" />
              <input
                type="number"
                step="0.01"
                min="0.01"
                max="10000"
                value={form.amount}
                onChange={(e) => setForm(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
                className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-purple-500/30 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-purple-300 mb-2">
              Reason
            </label>
            <select
              value={form.reason}
              onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value as any }))}
              className="w-full px-4 py-3 bg-gray-700 border border-purple-500/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              required
            >
              {getReasonOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-semibold text-purple-300 mb-2">
              Note (Optional)
            </label>
            <textarea
              value={form.note}
              onChange={(e) => setForm(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Add additional context for this adjustment..."
              rows={3}
              className="w-full px-4 py-3 bg-gray-700 border border-purple-500/30 rounded-xl text-white placeholder-purple-300/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none"
            />
          </div>

          {/* Preview */}
          {preview && (
            <div className="bg-gray-700/30 rounded-xl border border-purple-500/20 p-4">
              <h4 className="text-white font-semibold mb-2 flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Preview Changes</span>
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-purple-300">Current Balance:</span>
                  <span className="text-white">{formatBalance(driver.balance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-purple-300">Adjustment:</span>
                  <span className={preview.change >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                    {preview.change >= 0 ? '+' : ''}{formatBalance(preview.change)}
                  </span>
                </div>
                <div className="flex justify-between border-t border-gray-600/30 pt-2">
                  <span className="text-purple-300 font-semibold">New Balance:</span>
                  <span className="text-white font-bold">{formatBalance(preview.newBalance)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
              <div className="flex items-center space-x-2 text-red-400">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !form.amount || !preview}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Adjustment</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}