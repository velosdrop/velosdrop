// app/customer/customer-registration/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/src/db";
import { customersTable, otpTable } from "@/src/db/schema";
import { eq, or } from "drizzle-orm";
import { hash } from "bcryptjs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from "@/components/ui/button";
import { countries } from "countries-list";

interface Country {
  code: string;
  name: string;
  phone: string;
  emoji: string;
}

// Zimbabwe country data - ALWAYS available
const ZIMBABWE_COUNTRY: Country = {
  code: "ZW",
  name: "Zimbabwe",
  phone: "263",
  emoji: "🇿🇼",
};

export default function CustomerRegistration() {
  const [step, setStep] = useState<"registration" | "verification">("registration");
  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [selectedCountry, setSelectedCountry] = useState<Country>(ZIMBABWE_COUNTRY);
  const [countryList, setCountryList] = useState<Country[]>([]);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const router = useRouter();

  useEffect(() => {
    const loadCountries = () => {
      try {
        const countriesData = Object.entries(countries)
          .map(([code, country]) => ({
            code,
            name: country.name,
            phone: country.phone,
            emoji: country.emoji,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));

        setCountryList(countriesData);
      } catch (error) {
        console.error("Error loading countries:", error);
      }
    };

    loadCountries();
  }, []);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const handleCountrySelect = (country: Country) => {
    setSelectedCountry(country);
    setIsCountryOpen(false);
  };

  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, "");
    if (selectedCountry.code === "US" || selectedCountry.code === "CA") {
      const match = cleaned.match(/^(\d{0,3})(\d{0,3})(\d{0,4})$/);
      if (match) {
        let formatted = "";
        if (match[1]) formatted += `(${match[1]}`;
        if (match[2]) formatted += `) ${match[2]}`;
        if (match[3]) formatted += `-${match[3]}`;
        return formatted;
      }
    }
    return cleaned.replace(/(\d{3})(?=\d)/g, "$1 ");
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneNumber(e.target.value);
    setFormData({ ...formData, phone: formatted });
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim())
      newErrors.username = "Username is required";
    else if (formData.username.length < 3)
      newErrors.username = "Username must be at least 3 characters";
    
    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (!phoneDigits)
      newErrors.phone = "Phone number is required";
    else if (phoneDigits.length < 6)
      newErrors.phone = "Phone number is too short";
    
    if (formData.password.length < 6)
      newErrors.password = "Password must be at least 6 characters";
    if (formData.password !== formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const sendOTP = async () => {
    setIsLoading(true);
    setErrors({});
    setSuccess("");

    try {
      const phoneDigits = formData.phone.replace(/\D/g, "");
      const fullPhoneNumber = `+${selectedCountry.phone}${phoneDigits}`;

      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhoneNumber })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Failed to send OTP");

      setSuccess("OTP sent successfully!");
      setResendCountdown(60);
      setStep("verification");
    } catch (err: any) {
      setErrors({ form: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    setIsLoading(true);
    setErrors({});
    
    try {
      const phoneDigits = formData.phone.replace(/\D/g, "");
      const fullPhoneNumber = `+${selectedCountry.phone}${phoneDigits}`;

      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: fullPhoneNumber, otp })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      // If OTP is valid, proceed with registration
      await completeRegistration();
    } catch (err: any) {
      setErrors({ form: err.message });
      setOtp('');
    } finally {
      setIsLoading(false);
    }
  };

  const completeRegistration = async () => {
    try {
      const phoneDigits = formData.phone.replace(/\D/g, "");
      const fullPhoneNumber = `+${selectedCountry.phone}${phoneDigits}`;

      // Check if username or phone already exists
      const existingUser = await db
        .select()
        .from(customersTable)
        .where(
          or(
            eq(customersTable.username, formData.username),
            eq(customersTable.phoneNumber, fullPhoneNumber)
          )
        )
        .get();

      if (existingUser) {
        setErrors({ form: "Username or phone number already registered" });
        return;
      }

      // Hash password before storing
      const hashedPassword = await hash(formData.password, 12);

      // Create new customer
      await db
        .insert(customersTable)
        .values({
          username: formData.username,
          phoneNumber: fullPhoneNumber,
          password: hashedPassword,
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .run();

      // Store user data in localStorage
      localStorage.setItem('customerData', JSON.stringify({
        username: formData.username,
        phoneNumber: fullPhoneNumber
      }));

      router.push("/customer/customer-dashboard");
    } catch (error) {
      console.error("Registration failed:", error);
      setErrors({ form: "Registration failed. Please try again." });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    await sendOTP();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Main Container - Enhanced mobile responsiveness */}
      <div className="w-full max-w-[95vw] sm:max-w-md bg-gray-950/95 backdrop-blur-2xl rounded-3xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-purple-500/50 relative overflow-hidden">
        {/* Enhanced Neon Glow Effects */}
        <div className="absolute -top-20 -right-20 w-60 h-60 sm:w-80 sm:h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-4xl opacity-20 animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 sm:w-80 sm:h-80 bg-indigo-500 rounded-full mix-blend-multiply filter blur-4xl opacity-20 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-bounce"></div>

        {/* Header */}
        <div className="text-center mb-6 sm:mb-8 relative z-10">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/25">
            <svg className="w-8 h-8 sm:w-10 sm:h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-purple-400 to-indigo-300 bg-clip-text text-transparent mb-2 drop-shadow-lg">
            {step === "registration" ? "Create Account" : "Verify Phone"}
          </h1>
          <p className="text-sm sm:text-base text-gray-300">
            {step === "registration" 
              ? "Join our delivery network" 
              : `Enter the code sent to +${selectedCountry.phone}${formData.phone.replace(/\D/g, "")}`}
          </p>
        </div>

        {/* Status Messages */}
        {errors.form && (
          <div className="mb-4 p-4 bg-red-900/40 border border-red-500/50 text-red-300 rounded-xl text-sm relative z-10 backdrop-blur-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {errors.form}
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-900/40 border border-green-500/50 text-green-300 rounded-xl text-sm relative z-10 backdrop-blur-sm flex items-center gap-3">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            {success}
          </div>
        )}

        {step === "registration" ? (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 relative z-10">
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300 mb-3"
              >
                Username
              </label>
              <div className="relative">
                <input
                  id="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className={`w-full px-4 py-4 rounded-xl bg-gray-800/60 border-2 ${
                    errors.username ? "border-red-500/50" : "border-gray-700/50"
                  } text-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 text-base placeholder-gray-400 transition-all duration-300 backdrop-blur-sm`}
                  placeholder="Enter your username"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              </div>
              {errors.username && (
                <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.username}
                </p>
              )}
            </div>

            {/* Phone Input Section */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-300 mb-3"
              >
                Phone Number
              </label>
              
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Country Dropdown */}
                <div className="relative w-full sm:w-40">
                  <button
                    type="button"
                    onClick={() => setIsCountryOpen(!isCountryOpen)}
                    className="w-full px-4 py-4 rounded-xl bg-gray-800/60 border-2 border-gray-700/50 text-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 flex items-center justify-between hover:bg-gray-700/60 transition-all duration-300 backdrop-blur-sm"
                  >
                    <span className="flex items-center gap-2">
                      <span className="text-xl">{selectedCountry.emoji}</span>
                      <span className="text-sm font-medium">+{selectedCountry.phone}</span>
                    </span>
                    <svg
                      className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${isCountryOpen ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  {/* Country Dropdown Menu */}
                  {isCountryOpen && (
                    <>
                      <div 
                        className="fixed inset-0 z-40 sm:hidden"
                        onClick={() => setIsCountryOpen(false)}
                      />
                      
                      <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800/95 backdrop-blur-xl border-2 border-gray-700/50 rounded-xl shadow-2xl z-50 max-h-80 overflow-hidden">
                        <div className="p-3 border-b border-gray-700/50">
                          <div className="text-sm font-medium text-gray-300 mb-2">Select Country</div>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Search countries..."
                              className="w-full px-3 py-2 pl-9 bg-gray-900/60 border-2 border-gray-600/50 rounded-lg text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500 backdrop-blur-sm"
                            />
                            <svg
                              className="absolute left-3 top-2.5 w-4 h-4 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                              />
                            </svg>
                          </div>
                        </div>
                        
                        <div className="max-h-60 overflow-y-auto">
                          {countryList.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => handleCountrySelect(country)}
                              className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-700/50 transition-all duration-200 ${
                                selectedCountry.code === country.code 
                                  ? 'bg-purple-600/20 border-r-4 border-purple-500' 
                                  : 'border-r-4 border-transparent'
                              }`}
                            >
                              <span className="text-xl flex-shrink-0">{country.emoji}</span>
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">
                                  {country.name}
                                </div>
                                <div className="text-xs text-gray-400">
                                  +{country.phone}
                                </div>
                              </div>
                              {selectedCountry.code === country.code && (
                                <svg
                                  className="w-4 h-4 text-purple-500 flex-shrink-0"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Phone Input */}
                <div className="flex-1 relative">
                  <input
                    id="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handlePhoneChange}
                    className={`w-full px-4 py-4 rounded-xl bg-gray-800/60 border-2 ${
                      errors.phone ? "border-red-500/50" : "border-gray-700/50"
                    } text-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 text-base placeholder-gray-400 transition-all duration-300 backdrop-blur-sm`}
                    placeholder="Enter phone number"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>
              </div>
              {errors.phone && (
                <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.phone}
                </p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-3"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className={`w-full px-4 py-4 rounded-xl bg-gray-800/60 border-2 ${
                    errors.password ? "border-red-500/50" : "border-gray-700/50"
                  } text-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 text-base placeholder-gray-400 transition-all duration-300 backdrop-blur-sm`}
                  placeholder="Enter your password"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              {errors.password && (
                <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.password}
                </p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-300 mb-3"
              >
                Confirm Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  className={`w-full px-4 py-4 rounded-xl bg-gray-800/60 border-2 ${
                    errors.confirmPassword ? "border-red-500/50" : "border-gray-700/50"
                  } text-white focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/20 text-base placeholder-gray-400 transition-all duration-300 backdrop-blur-sm`}
                  placeholder="Confirm your password"
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
              </div>
              {errors.confirmPassword && (
                <p className="mt-2 text-sm text-red-400 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-700 disabled:to-gray-800 text-white font-bold py-4 px-4 rounded-xl shadow-2xl shadow-purple-900/30 hover:shadow-purple-900/50 transition-all duration-300 flex items-center justify-center text-base min-h-[3.5rem] disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending OTP...
                </>
              ) : (
                "Continue"
              )}
            </button>
          </form>
        ) : (
          <div className="space-y-6 relative z-10">
            {/* Enhanced OTP Section */}
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-purple-600/20 to-indigo-600/20 rounded-2xl flex items-center justify-center border-2 border-purple-500/30">
                <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              
              <label className="block text-lg font-semibold text-gray-300 mb-2">
                Enter Verification Code
              </label>
              
              {/* Enhanced OTP Input - Fixed Version */}
              <div className="flex justify-center mb-6">
                <InputOTP 
                  maxLength={6} 
                  value={otp} 
                  onChange={(value) => setOtp(value)}
                  disabled={isLoading}
                  className="gap-2 sm:gap-3"
                >
                  <InputOTPGroup className="gap-2 sm:gap-3">
                    {[...Array(6)].map((_, index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-xl font-bold border-2 border-gray-600 bg-gray-800/60 text-white transition-all duration-300 rounded-xl backdrop-blur-sm
                                  focus:border-purple-500 focus:ring-4 focus:ring-purple-500/20
                                  hover:border-purple-400/50
                                  data-[character-index]:border-purple-500 data-[character-index]:bg-purple-600/20 data-[character-index]:text-white
                                  shadow-lg"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <p className="text-sm text-gray-400 mt-4">
                We sent a 6-digit code to <br />
                <span className="text-purple-400 font-medium">
                  +{selectedCountry.phone}{formData.phone.replace(/\D/g, "")}
                </span>
              </p>
            </div>

            {/* Verify Button */}
            <button
              onClick={verifyOtp}
              disabled={otp.length !== 6 || isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-700 disabled:to-gray-800 text-white font-bold py-4 px-4 rounded-xl shadow-2xl shadow-purple-900/30 hover:shadow-purple-900/50 transition-all duration-300 flex items-center justify-center text-base min-h-[3.5rem] disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Verifying...
                </>
              ) : (
                "Verify and Register"
              )}
            </button>

            {/* Resend OTP Button */}
            <button
              onClick={sendOTP}
              disabled={resendCountdown > 0}
              className="w-full text-purple-400 border-2 border-gray-700/50 hover:bg-gray-800/60 hover:border-purple-500/50 font-medium py-4 px-4 rounded-xl transition-all duration-300 flex items-center justify-center text-base min-h-[3.5rem] disabled:cursor-not-allowed disabled:opacity-50 backdrop-blur-sm"
            >
              {resendCountdown > 0 ? (
                `Resend code in ${resendCountdown}s`
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Resend OTP
                </span>
              )}
            </button>

            {/* Back to Registration */}
            <button
              onClick={() => setStep("registration")}
              className="w-full text-gray-400 hover:text-gray-300 font-medium py-3 px-4 rounded-lg transition-all duration-300 flex items-center justify-center text-sm"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to registration
            </button>
          </div>
        )}

        {/* Footer */}
        {step === "registration" && (
          <div className="mt-6 text-center relative z-10">
            <p className="text-sm sm:text-base text-gray-400">
              Already have an account?{" "}
              <Link
                href="/customer/customer-login"
                className="text-purple-400 hover:text-purple-300 font-medium transition-all duration-300 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}