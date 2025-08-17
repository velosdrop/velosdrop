// app/driver/registration-success/page.tsx
'use client';

import { motion } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function RegistrationSuccess() {
  const router = useRouter();
  const [timeLeft, setTimeLeft] = useState({
    hours: 24,
    minutes: 0,
    seconds: 0
  });

  useEffect(() => {
    // Set expiration time (24 hours from now)
    const expirationTime = new Date();
    expirationTime.setHours(expirationTime.getHours() + 24);
    
    const timer = setInterval(() => {
      const now = new Date();
      const diff = expirationTime.getTime() - now.getTime();
      
      if (diff <= 0) {
        clearInterval(timer);
        return;
      }
      
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      setTimeLeft({ hours, minutes, seconds });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="min-h-screen bg-black p-4 flex items-center justify-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full bg-gray-900 rounded-xl border border-purple-900/50 p-8 shadow-lg"
      >
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <CheckCircle2 className="h-16 w-16 text-purple-500" />
          </div>
          
          <div className="space-y-3">
            <h1 className="text-2xl font-bold text-purple-300">Registration Successful!</h1>
            <p className="text-gray-300">
              Your details are being verified. Expected verification completion in:
            </p>
          </div>

          {/* Countdown Timer */}
          <div className="bg-black border border-purple-800 rounded-lg p-4">
            <div className="flex justify-center gap-4 font-mono">
              <div className="text-center">
                <span className="text-3xl font-bold text-purple-400">{timeLeft.hours.toString().padStart(2, '0')}</span>
                <span className="block text-xs text-gray-400 mt-1">HOURS</span>
              </div>
              <span className="text-3xl text-purple-500">:</span>
              <div className="text-center">
                <span className="text-3xl font-bold text-purple-400">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                <span className="block text-xs text-gray-400 mt-1">MINUTES</span>
              </div>
              <span className="text-3xl text-purple-500">:</span>
              <div className="text-center">
                <span className="text-3xl font-bold text-purple-400">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                <span className="block text-xs text-gray-400 mt-1">SECONDS</span>
              </div>
            </div>
          </div>

          <div className="bg-purple-900/20 border border-purple-800/50 rounded-lg p-4 text-sm text-purple-200">
            <p>We'll notify you via email when verification is complete.</p>
            <p className="mt-1">Check your spam folder if you don't see our emails.</p>
          </div>

          <Button
            onClick={() => router.push('/')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          >
            Return to Home
          </Button>

          <p className="text-xs text-gray-500">
            Need help? <span className="text-purple-400 cursor-pointer">Contact support</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}