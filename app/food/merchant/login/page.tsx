// app/food/merchant/login/page.tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Mail, Lock, Loader2 } from 'lucide-react';

export default function MerchantLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Load saved email on mount
  useEffect(() => {
    const savedEmail = localStorage.getItem('merchantEmail');
    if (savedEmail) setEmail(savedEmail);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/merchant/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials');
      }

      // Save email for next time
      localStorage.setItem('merchantEmail', email);
      
      // Store token
      localStorage.setItem('merchantToken', data.token);
      localStorage.setItem('merchantId', data.merchant.id.toString());

      // Redirect to dashboard
      router.push('/food/merchant/dashboard');
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      {/* Left Side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-gray-900">Merchant Portal</h1>
            <p className="text-sm text-gray-600 mt-1">
              Sign in to manage your business
            </p>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-6 p-3 bg-purple-50 border border-purple-100 rounded-lg">
              <p className="text-sm text-purple-600">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="name@business.com"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-gray-900 placeholder:text-gray-400 disabled:bg-gray-50"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  className="w-4 h-4 rounded border-gray-300 text-purple-500 focus:ring-purple-500"
                />
                <span className="text-sm text-gray-600">Remember me</span>
              </label>
              <Link 
                href="/food/merchant/forgot-password" 
                className="text-sm text-purple-500 hover:text-purple-600"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-purple-300 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>

          {/* Sign up link */}
          <p className="text-center text-sm text-gray-600 mt-8">
            New to VelosDrop?{' '}
            <Link href="/food/merchant/registration" className="text-purple-500 hover:text-purple-600 font-medium">
              Create account
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Cartoon Background Image */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden bg-purple-900">
        {/* Fallback gradient in case image doesn't load */}
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 to-purple-900"></div>
        
        {/* Cartoon Style Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-80"
          style={{
            backgroundImage: "url('https://img.freepik.com/free-vector/hand-drawn-food-delivery-illustration_52683-134041.jpg?t=st=1741718951~exp=1741722551~hmac=5e8a5d5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e5e&w=1060')",
          }}
        >
          {/* Darker overlay for better text contrast */}
          <div className="absolute inset-0 bg-purple-900/60" />
        </div>
        
        {/* Content - Made more visible with better contrast */}
        <div className="relative h-full flex items-center justify-center p-12">
          <div className="max-w-md text-center">
            <h3 className="text-3xl font-bold mb-4 text-white drop-shadow-lg">
              Ready to sell?
            </h3>
            <p className="text-white text-lg mb-8 drop-shadow font-medium">
              Access your dashboard and start managing orders in seconds.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/30 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <div className="text-2xl font-bold text-white">500+</div>
                <div className="text-sm text-white font-medium">Active Merchants</div>
              </div>
              <div className="bg-white/30 backdrop-blur-md rounded-lg p-4 border border-white/20">
                <div className="text-2xl font-bold text-white">10k+</div>
                <div className="text-sm text-white font-medium">Daily Orders</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}