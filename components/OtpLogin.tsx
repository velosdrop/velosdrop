//components/OtpLogin.tsx
'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Input } from "@/components/ui/input";
import { Button } from "./ui/button";
import { useDriverForm } from '@/app/context/DriverFormContext';
import { FaArrowRight, FaChevronDown } from 'react-icons/fa';
import { motion } from 'framer-motion';

// Country data with flags and codes
const countries = [
  { code: '+263', flag: '🇿🇼', name: 'Zimbabwe' },
  { code: '+27', flag: '🇿🇦', name: 'South Africa' },
  { code: '+254', flag: '🇰🇪', name: 'Kenya' },
  { code: '+234', flag: '🇳🇬', name: 'Nigeria' },
  { code: '+233', flag: '🇬🇭', name: 'Ghana' },
  { code: '+256', flag: '🇺🇬', name: 'Uganda' },
  { code: '+255', flag: '🇹🇿', name: 'Tanzania' },
  { code: '+260', flag: '🇿🇲', name: 'Zambia' },
  { code: '+258', flag: '🇲🇿', name: 'Mozambique' },
  { code: '+267', flag: '🇧🇼', name: 'Botswana' },
  { code: '+266', flag: '🇱🇸', name: 'Lesotho' },
  { code: '+268', flag: '🇸🇿', name: 'Eswatini' },
  { code: '+250', flag: '🇷🇼', name: 'Rwanda' },
  { code: '+257', flag: '🇧🇮', name: 'Burundi' },
  { code: '+252', flag: '🇸🇴', name: 'Somalia' },
  { code: '+253', flag: '🇩🇯', name: 'Djibouti' },
  { code: '+251', flag: '🇪🇹', name: 'Ethiopia' },
  { code: '+249', flag: '🇸🇩', name: 'Sudan' },
  { code: '+211', flag: '🇸🇸', name: 'South Sudan' },
  { code: '+244', flag: '🇦🇴', name: 'Angola' },
  { code: '+1', flag: '🇺🇸', name: 'United States' },
  { code: '+44', flag: '🇬🇧', name: 'United Kingdom' },
  { code: '+91', flag: '🇮🇳', name: 'India' },
  { code: '+86', flag: '🇨🇳', name: 'China' },
  { code: '+81', flag: '🇯🇵', name: 'Japan' },
  { code: '+49', flag: '🇩🇪', name: 'Germany' },
  { code: '+33', flag: '🇫🇷', name: 'France' },
  { code: '+39', flag: '🇮🇹', name: 'Italy' },
  { code: '+34', flag: '🇪🇸', name: 'Spain' },
  { code: '+55', flag: '🇧🇷', name: 'Brazil' }
];

export function OtpLogin({ onVerificationSuccess }: { 
  onVerificationSuccess?: (phoneNumber: string) => void 
}) {
  const router = useRouter();
  const { setPersonalData } = useDriverForm();
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const [selectedCountry, setSelectedCountry] = useState(countries[0]); // Zimbabwe as default
  const [phoneNumber, setPhoneNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [resendCountdown, setResendCountdown] = useState(0);
  const [isPending, setIsPending] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setShowCountryDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const getFullPhoneNumber = () => {
    return selectedCountry.code + phoneNumber.replace(/^\++/, '');
  };

  const sendOTP = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setIsPending(true);
    setError("");
    setSuccess("");

    const fullPhoneNumber = getFullPhoneNumber();

    try {
      const response = await fetch('/api/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhoneNumber })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to send OTP");

      setSuccess("Verification code sent successfully!");
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
    
    const fullPhoneNumber = getFullPhoneNumber();

    try {
      const response = await fetch('/api/whatsapp/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhoneNumber, otp })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid verification code');
      }

      setPersonalData({ phoneNumber: fullPhoneNumber });
      
      if (onVerificationSuccess) {
        onVerificationSuccess(fullPhoneNumber);
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

  const handlePhoneNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/[^\d]/g, '').slice(0, 9);
    setPhoneNumber(value);
  };

  return (
    <div className="space-y-6">
      {!success ? (
        <motion.form 
          onSubmit={sendOTP}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* Country Selection */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="space-y-3"
          >
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Select Country
            </label>
            <div className="relative" ref={countryDropdownRef}>
              <motion.button
                type="button"
                onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                className="w-full bg-gray-700/50 border border-gray-600 rounded-xl px-4 py-4 text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 hover:bg-gray-700/70"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{selectedCountry.flag}</span>
                  <span className="text-white font-medium">{selectedCountry.name}</span>
                  <span className="text-gray-400 text-sm">({selectedCountry.code})</span>
                </div>
                <motion.div
                  animate={{ rotate: showCountryDropdown ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <FaChevronDown className="w-4 h-4 text-gray-400" />
                </motion.div>
              </motion.button>

              {/* Country Dropdown */}
              {showCountryDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-xl shadow-2xl max-h-60 overflow-y-auto"
                >
                  <div className="py-2">
                    {countries.map((country, index) => (
                      <motion.button
                        key={country.code + country.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                          setSelectedCountry(country);
                          setShowCountryDropdown(false);
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors duration-200 ${
                          selectedCountry.code === country.code 
                            ? 'bg-purple-600/20 text-purple-400' 
                            : 'hover:bg-gray-700/50 text-gray-300'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="text-xl">{country.flag}</span>
                        <span className="font-medium flex-1">{country.name}</span>
                        <span className="text-gray-400 text-sm">{country.code}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>

          {/* Phone Input - Professional Industry Standard */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-3"
          >
            <label className="block text-sm font-medium text-gray-300 mb-3">
              Phone Number
            </label>
            
            <div className="flex space-x-3">
              {/* Country Code - Fixed Display */}
              <motion.div
                className="flex-shrink-0"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="h-14 bg-gray-700/50 border border-gray-600 rounded-xl px-4 flex items-center justify-center min-w-[120px]">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">{selectedCountry.flag}</span>
                    <span className="text-white font-semibold text-sm">{selectedCountry.code}</span>
                  </div>
                </div>
              </motion.div>

              {/* Phone Number Input */}
              <motion.div 
                className="flex-1"
                whileFocus={{ scale: 1.01 }}
              >
                <Input
                  type="tel"
                  value={phoneNumber}
                  onChange={handlePhoneNumberChange}
                  className="w-full h-14 bg-gray-700/50 border-gray-600 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg font-medium px-4"
                  placeholder="Enter phone number"
                  required
                  maxLength={9}
                  pattern="[0-9]*"
                  inputMode="numeric"
                />
              </motion.div>
            </div>

            {/* Helper Text */}
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xs text-gray-400 text-center pt-2"
            >
              {selectedCountry.code === '+263' 
                ? 'Enter your 9-digit Zimbabwean phone number' 
                : `Enter your ${selectedCountry.name} phone number`
              }
            </motion.p>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Button
              type="submit"
              disabled={!phoneNumber || phoneNumber.length < 8 || isPending || resendCountdown > 0}
              className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 py-4 text-base font-semibold shadow-lg shadow-purple-600/25 hover:shadow-purple-600/40 transition-all duration-200"
            >
              {isPending ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sending Code...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-3">
                  Send Verification Code 
                  <FaArrowRight className="w-4 h-4" />
                </span>
              )}
            </Button>
          </motion.div>
        </motion.form>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* OTP Input Section */}
          <div className="text-center space-y-4">
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Enter Verification Code
              </label>
              <InputOTP 
                maxLength={6} 
                value={otp} 
                onChange={(value) => setOtp(value)}
                disabled={isPending}
                className="justify-center"
              >
                <InputOTPGroup className="gap-3">
                  {[...Array(6)].map((_, i) => (
                    <InputOTPSlot 
                      key={i} 
                      index={i} 
                      className="w-14 h-14 border-2 border-gray-600 bg-gray-800 text-white text-xl font-bold rounded-xl focus:border-purple-500 focus:ring-2 focus:ring-purple-500 transition-all duration-200"
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              <p className="text-sm text-gray-400 mt-4">
                Enter the 6-digit code sent to <br />
                <span className="font-semibold text-white">{getFullPhoneNumber()}</span>
              </p>
            </div>
          </div>

          {/* Resend OTP Button */}
          <Button
            onClick={() => sendOTP()}
            disabled={resendCountdown > 0}
            variant="outline"
            className="w-full text-purple-400 border-gray-700 hover:bg-gray-800 hover:text-purple-300 py-4 font-medium transition-all duration-200"
          >
            {resendCountdown > 0 ? (
              `Resend code in ${resendCountdown}s`
            ) : (
              "Resend Verification Code"
            )}
          </Button>
        </motion.div>
      )}

      {/* Error Message */}
      {error && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-red-900/20 text-red-400 text-sm rounded-xl border border-red-800/50 text-center"
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        </motion.div>
      )}

      {/* Success Message */}
      {success && !otp && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-4 bg-green-900/20 text-green-400 text-sm rounded-xl border border-green-800/50 text-center"
        >
          <div className="flex items-center justify-center space-x-2">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>{success}</span>
          </div>
        </motion.div>
      )}

      {/* Loading Overlay */}
      {isPending && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-2xl p-6 flex items-center space-x-4 shadow-2xl"
          >
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-purple-500"></div>
            <span className="text-white font-medium">Verifying code...</span>
          </motion.div>
        </div>
      )}
    </div>
  );
}