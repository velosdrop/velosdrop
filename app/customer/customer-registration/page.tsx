// app/customer/customer-registration/page.tsx
"use client";

import { useState,  useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/src/db";
import { customersTable, otpTable } from "@/src/db/schema";
import { eq, or } from "drizzle-orm";
import { hash } from "bcryptjs";
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Button } from "@/components/ui/button";
import { FaMobile } from 'react-icons/fa';
import { motion } from 'framer-motion';

export default function CustomerRegistration() {
  const [step, setStep] = useState<"registration" | "verification">("registration");
  const [formData, setFormData] = useState({
    username: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });
  const [otp, setOtp] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown(resendCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.username.trim())
      newErrors.username = "Username is required";
    if (!formData.phone.trim())
      newErrors.phone = "Phone number is required";
    if (!formData.phone.startsWith('+263'))
      newErrors.phone = "Please use a Zimbabwean number starting with +263";
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
      const response = await fetch('/api/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formData.phone })
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
      const response = await fetch('/api/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: formData.phone, otp })
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
      // Check if username or phone already exists
      const existingUser = await db
        .select()
        .from(customersTable)
        .where(
          or(
            eq(customersTable.username, formData.username),
            eq(customersTable.phoneNumber, formData.phone)
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
          phoneNumber: formData.phone,
          password: hashedPassword,
          isVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .run();

      // Store user data in localStorage
      localStorage.setItem('customerData', JSON.stringify({
        username: formData.username,
        phoneNumber: formData.phone
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
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-lg p-8 border border-purple-600">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-500">
            {step === "registration" ? "Create Account" : "Verify Phone"}
          </h1>
          <p className="text-gray-400 mt-2">
            {step === "registration" 
              ? "Join our delivery network" 
              : `Enter the code sent to ${formData.phone}`}
          </p>
        </div>

        {/* Error Message */}
        {errors.form && (
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 text-red-300 rounded-lg text-sm">
            {errors.form}
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-green-900/50 border border-green-500 text-green-300 rounded-lg text-sm">
            {success}
          </div>
        )}

        {step === "registration" ? (
          <motion.form 
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Username */}
            <div>
              <label
                htmlFor="username"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                className={`w-full px-4 py-3 rounded-lg bg-gray-800 border ${
                  errors.username ? "border-red-500" : "border-gray-700"
                } focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500`}
                placeholder="your_username"
              />
              {errors.username && (
                <p className="mt-1 text-sm text-red-500">{errors.username}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Phone Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-purple-400">
                  <FaMobile className="w-4 h-4" />
                </div>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className={`w-full pl-10 px-4 py-3 rounded-lg bg-gray-800 border ${
                    errors.phone ? "border-red-500" : "border-gray-700"
                  } focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500`}
                  placeholder="+263778238674"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                className={`w-full px-4 py-3 rounded-lg bg-gray-800 border ${
                  errors.password ? "border-red-500" : "border-gray-700"
                } focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500`}
                placeholder="••••••••"
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password */}
            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-gray-300 mb-1"
              >
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) =>
                  setFormData({ ...formData, confirmPassword: e.target.value })
                }
                className={`w-full px-4 py-3 rounded-lg bg-gray-800 border ${
                  errors.confirmPassword ? "border-red-500" : "border-gray-700"
                } focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500`}
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.confirmPassword}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 flex items-center justify-center"
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
                      d="M4 12a8 8 0 018-8V0C5.373 
                         0 0 5.373 0 12h4zm2 5.291A7.962 
                         7.962 0 014 12H0c0 3.042 1.135 
                         5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  Sending OTP...
                </>
              ) : (
                "Continue"
              )}
            </button>
          </motion.form>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div className="text-center">
              <label className="block text-sm font-medium text-gray-300 mb-4">
                Verification Code
              </label>
              <InputOTP 
                maxLength={6} 
                value={otp} 
                onChange={(value) => setOtp(value)}
                disabled={isLoading}
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
                Enter the 6-digit code sent to {formData.phone}
              </p>
            </div>

            <Button
              onClick={verifyOtp}
              disabled={otp.length !== 6 || isLoading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? "Verifying..." : "Verify and Register"}
            </Button>

            <Button
              onClick={sendOTP}
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

        {/* Footer */}
        {step === "registration" && (
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Already have an account?{" "}
              <Link
                href="/customer/customer-login"
                className="text-purple-500 hover:text-purple-400 font-medium"
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