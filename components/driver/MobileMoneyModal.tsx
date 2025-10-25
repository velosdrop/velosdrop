// components/driver/MobileMoneyModal.tsx
'use client';

import { useState } from 'react';
import { FiX, FiSmartphone, FiDollarSign, FiCheck } from 'react-icons/fi';

interface MobileMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (phoneNumber: string) => void;
  amount: string;
  isLoading: boolean;
}

// EcoCash Icon SVG
const EcoCashIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-2h2v2zm0-4h-2V7h2v6zm5 4h-4v-2h4v2zm0-4h-4V7h4v6z" fill="#00A651"/>
  </svg>
);

// VelosDrop Brand Icon
const VelosDropIcon = ({ className = "w-6 h-6" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" fill="#7C3AED"/>
  </svg>
);

export default function MobileMoneyModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  amount, 
  isLoading 
}: MobileMoneyModalProps) {
  const [phoneNumber, setPhoneNumber] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.trim()) {
      onConfirm(phoneNumber.trim());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gradient-to-br from-gray-900 to-black border border-purple-500/20 rounded-2xl shadow-2xl shadow-purple-500/10 max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 bg-white/10 rounded-lg backdrop-blur-sm">
                <EcoCashIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">EcoCash Payment</h3>
                <p className="text-purple-100 text-sm">Powered by VelosDrop</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-white/80 hover:text-white transition-all duration-200 hover:bg-white/10 p-2 rounded-lg"
              disabled={isLoading}
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Payment Info Card */}
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 border border-purple-500/20 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <FiDollarSign className="w-4 h-4 text-purple-400" />
                <span className="text-gray-300 text-sm font-medium">Amount to pay</span>
              </div>
              <div className="flex items-center space-x-2">
                <VelosDropIcon className="w-4 h-4 text-purple-400" />
                <span className="text-gray-400 text-xs">VELOSDROP</span>
              </div>
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-white">${amount}</span>
              <span className="text-gray-400 text-sm">USD</span>
            </div>
          </div>

          {/* Mobile Payment Feature */}
          <div className="bg-gradient-to-r from-green-500/10 to-green-600/10 border border-green-500/20 rounded-xl p-4">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-12 h-12 bg-green-500/20 rounded-lg">
                <FiSmartphone className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-white text-sm">Instant Mobile Payment</h4>
                <p className="text-green-300 text-xs">You'll receive a prompt on your phone to confirm</p>
              </div>
            </div>
          </div>

          {/* Phone Input Section */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-300 mb-3">
                Enter your EcoCash number
              </label>
              
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <span className="text-gray-400 text-sm font-medium">+263</span>
                </div>
                <input
                  type="tel"
                  id="phone"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value.replace(/\s/g, ''))}
                  placeholder="771234567"
                  className="block w-full pl-16 pr-4 py-4 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  pattern="[0-9]{9}"
                  title="Please enter a 9-digit Zimbabwean phone number (without +263)"
                  disabled={isLoading}
                />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                  {phoneNumber.length === 9 && (
                    <FiCheck className="w-5 h-5 text-green-400 animate-pulse" />
                  )}
                </div>
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <p className="text-gray-500 text-xs">
                  {phoneNumber.length}/9 digits
                </p>
                <p className="text-gray-500 text-xs">
                  Format: 77XXXXXXX
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="flex-1 px-6 py-4 bg-gray-700 hover:bg-gray-600 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed border border-gray-600 hover:border-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!phoneNumber.trim() || phoneNumber.length !== 9 || isLoading}
                className="flex-1 px-6 py-4 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/25 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <EcoCashIcon className="w-5 h-5 text-white" />
                    <span>Pay Now</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Security Badge */}
          <div className="flex items-center justify-center space-x-2 text-gray-500 text-xs pt-4 border-t border-gray-700">
            <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
            <span>Secure payment encrypted and processed by EcoCash</span>
          </div>
        </div>
      </div>
    </div>
  );
}