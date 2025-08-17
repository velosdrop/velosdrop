'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FaUser, FaLock, FaArrowRight } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { db } from '@/src/db';
import { eq } from 'drizzle-orm';
import { driversTable } from '@/src/db/schema';
import { compareSync, hashSync } from 'bcryptjs';
import Link from 'next/link';

export default function LoginPage() {
  const [firstName, setFirstName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Input validation
      if (!firstName.trim() || !password.trim()) {
        throw new Error('Please fill in all fields');
      }

      const driver = await db.query.driversTable.findFirst({
        where: eq(driversTable.firstName, firstName),
      });

      if (!driver) {
        // Add delay to prevent timing attacks
        await new Promise(resolve => setTimeout(resolve, 500));
        throw new Error('Invalid credentials');
      }

      // Check if password is hashed (bcrypt hashes start with $2a$, $2b$, or $2y$)
      const isPasswordHashed = driver.password.startsWith('$2a$') || 
                             driver.password.startsWith('$2b$') || 
                             driver.password.startsWith('$2y$');

      let isMatch;
      if (isPasswordHashed) {
        // Compare with bcrypt for hashed passwords
        isMatch = compareSync(password, driver.password);
      } else {
        // Migration path for existing plaintext passwords
        isMatch = password === driver.password;
        
        // Upgrade the password to hashed version if it's plaintext
        if (isMatch) {
          const hashedPassword = hashSync(password, 10);
          await db.update(driversTable)
            .set({ password: hashedPassword })
            .where(eq(driversTable.id, driver.id));
        }
      }

      if (!isMatch) {
        throw new Error('Invalid credentials');
      }

      // Store authentication tokens
      sessionStorage.setItem('driver-auth-token', 'true');
      sessionStorage.setItem('driver-id', driver.id.toString());

      // Redirect to dashboard
      router.push('/driver-dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="w-6 h-6"
              >
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold gradient-text">VelosDrop</h1>
          </div>
          <p className="text-gray-400">Driver Authentication Portal</p>
        </div>

        {/* Login Card */}
        <div className="card bg-gray-900/50 backdrop-blur-sm">
          <h2 className="text-2xl font-bold mb-6 text-center">Sign In</h2>

          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 p-3 bg-red-900/30 text-red-300 rounded-lg border border-red-800/50 text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                First Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                  <FaUser className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="pl-10 w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500"
                  placeholder="Enter your first name"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                  <FaLock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500"
                  placeholder="••••••••"
                  required
                  minLength={8}
                />
              </div>
              <div className="mt-1 text-xs text-gray-500">
                Password must be at least 8 characters
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={isLoading}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="btn_purple w-full py-3 px-6 rounded-lg font-medium flex items-center justify-center gap-2 border"
            >
              {isLoading ? (
                <span className="animate-pulse">Authenticating...</span>
              ) : (
                <>
                  <span>Continue</span>
                  <FaArrowRight className="text-sm" />
                </>
              )}
            </motion.button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-800 text-center text-sm text-gray-500">
            No account?{' '}
            <Link
              href="/driver/registration"
              className="text-purple-400 hover:text-purple-300 font-medium hover:underline"
            >
              Register here
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-xs text-gray-600">
          © {new Date().getFullYear()} VelosDrop Technologies
        </div>
      </motion.div>
    </div>
  );
}