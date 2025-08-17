'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Input } from "@/components/ui/input";
import { Button } from "./ui/button";
import { useDriverForm } from '@/app/context/DriverFormContext';
import { FaMobile, FaArrowRight } from 'react-icons/fa';
import { motion } from 'framer-motion';

export function OtpLogin({ onVerificationSuccess }: { 
  onVerificationSuccess?: (phoneNumber: string) => void 
}) {
  const router = useRouter();
  const { setPersonalData } = useDriverForm();

  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  useEffect(() => {
    if (otp.length === 6) {
      verifyOtp();
    }
  }, [otp]);

  const sendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsPending(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to send OTP");

      setSuccess("OTP sent successfully!");
      setResendCountdown(60);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsPending(false);
    }
  };

  const verifyOtp = async () => {
    setIsPending(true);
    setError("");
    
    try {
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber, otp })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      setPersonalData({ phoneNumber });
      
      if (onVerificationSuccess) {
        onVerificationSuccess(phoneNumber);
      } else {
        router.push('/driver/personal');
      }
    } catch (err: any) {
      setError(err.message);
      setOtp('');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {!success ? (
        <motion.form 
          onSubmit={sendOTP}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                <FaMobile className="w-4 h-4" />
              </div>
              <Input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="pl-10 w-full bg-gray-800 border-gray-700 text-white"
                placeholder="+263778238674"
                required
              />
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Enter your Zimbabwean number with +263 country code
            </p>
          </div>

          <Button
            type="submit"
            disabled={!phoneNumber || isPending || resendCountdown > 0}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                Send OTP <FaArrowRight className="w-3 h-3" />
              </span>
            )}
          </Button>
        </motion.form>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Verification Code
            </label>
            <InputOTP 
              maxLength={6} 
              value={otp} 
              onChange={(value) => setOtp(value)}
              disabled={isPending}
              className="justify-center"
            >
              <InputOTPGroup className="gap-2">
                {[...Array(6)].map((_, i) => (
                  <InputOTPSlot 
                    key={i} 
                    index={i} 
                    className="border-gray-700 bg-gray-800 text-white"
                  />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <p className="text-xs text-gray-400 mt-2">
              Enter the 6-digit code sent to {phoneNumber}
            </p>
          </div>

          <Button
            onClick={() => sendOTP()}
            disabled={resendCountdown > 0}
            variant="outline"
            className="w-full text-purple-400 border-gray-700 hover:bg-gray-800"
          >
            {resendCountdown > 0 ? (
              `Resend in ${resendCountdown}s`
            ) : (
              "Resend OTP"
            )}
          </Button>
        </motion.div>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 bg-red-900/20 text-red-400 text-sm rounded-lg border border-red-800/50"
        >
          {error}
        </motion.div>
      )}

      {isPending && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )}
    </div>
  );
}