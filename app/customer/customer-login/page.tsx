// app/customer/customer-login/page.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { db } from "@/src/db";
import { customersTable } from "@/src/db/schema";
import { eq } from "drizzle-orm";
import { compare } from "bcryptjs";
import { countries } from "countries-list";
import { useUser } from '@/app/context/UserContext';

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

// Customer interface matching your context
interface Customer {
  id: number;
  username: string;
  phoneNumber: string;
  profilePictureUrl?: string;
}

export default function CustomerLogin() {
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
  });
  const [selectedCountry, setSelectedCountry] = useState<Country>(ZIMBABWE_COUNTRY);
  const [countryList, setCountryList] = useState<Country[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCountryOpen, setIsCountryOpen] = useState(false);
  const router = useRouter();
  const { setCustomer } = useUser();

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
    const phoneDigits = formData.phone.replace(/\D/g, "");
    if (!phoneDigits) newErrors.phone = "Phone number is required";
    else if (phoneDigits.length < 6)
      newErrors.phone = "Phone number is too short";
    if (!formData.password) newErrors.password = "Password is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const phoneDigits = formData.phone.replace(/\D/g, "");
      const fullPhoneNumber = `+${selectedCountry.phone}${phoneDigits}`;

      // Use .execute() instead of .get() for better compatibility
      const result = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.phoneNumber, fullPhoneNumber))
        .execute();

      const customer = result[0]; // Get first result

      if (!customer) {
        setErrors({ form: "Invalid phone number or password" });
        setIsLoading(false);
        return;
      }

      // Check if customer has a password (it might be null if they used OTP or Google auth)
      if (!customer.password) {
        setErrors({ form: "This account doesn't have a password. Please use OTP login or reset your password." });
        setIsLoading(false);
        return;
      }

      // Now we know customer.password is a string, so we can safely compare
      const isPasswordValid = await compare(formData.password, customer.password);

      if (!isPasswordValid) {
        setErrors({ form: "Invalid phone number or password" });
        setIsLoading(false);
        return;
      }

      // Update last login
      await db
        .update(customersTable)
        .set({ lastLogin: new Date().toISOString() })
        .where(eq(customersTable.id, customer.id))
        .execute();

      // Prepare customer data for context
      const customerData: Customer = {
        id: customer.id,
        username: customer.username,
        phoneNumber: customer.phoneNumber || "", // Ensure it's a string
        profilePictureUrl: customer.profilePictureUrl || undefined
      };
      
      // Set customer in context
      setCustomer(customerData);

      // Redirect to dashboard
      router.push("/customer/customer-dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      setErrors({ form: "Login failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 text-white flex items-center justify-center p-4 sm:p-6 lg:p-8">
      {/* Main Container - Responsive sizing */}
      <div className="w-full max-w-[90vw] sm:max-w-md bg-gray-950/90 backdrop-blur-xl rounded-2xl shadow-2xl p-4 sm:p-6 lg:p-8 border border-purple-600 relative overflow-hidden">
        {/* Neon Glow Effects */}
        <div className="absolute -top-10 -right-10 w-40 h-40 sm:w-60 sm:h-60 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-10 -left-10 w-40 h-40 sm:w-60 sm:h-60 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>

        {/* Header Section */}
        <div className="text-center mb-6 sm:mb-8 relative z-10">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-purple-400 mb-2 drop-shadow-lg">
            Welcome
          </h1>
          <p className="text-sm sm:text-base text-gray-400">Sign in with your phone number</p>
        </div>

        {/* Error Message */}
        {errors.form && (
          <div className="mb-4 p-3 bg-red-900/60 border border-red-500 text-red-300 rounded-lg text-sm">
            {errors.form}
          </div>
        )}

        {/* Form Section */}
        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6 relative z-10">
          {/* Phone Input Section */}
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-300 mb-2"
            >
              Phone Number
            </label>
            
            {/* Country Selector - Mobile Optimized */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Country Dropdown */}
              <div className="relative w-full sm:w-40">
                <button
                  type="button"
                  onClick={() => setIsCountryOpen(!isCountryOpen)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-800/80 border border-gray-700 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-between hover:bg-gray-700/80 transition-colors"
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
                    {/* Backdrop for mobile */}
                    <div 
                      className="fixed inset-0 z-40 sm:hidden"
                      onClick={() => setIsCountryOpen(false)}
                    />
                    
                    <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-2xl z-50 max-h-80 overflow-hidden">
                      {/* Search Header */}
                      <div className="p-3 border-b border-gray-700">
                        <div className="text-sm font-medium text-gray-300 mb-2">Select Country</div>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search countries..."
                            className="w-full px-3 py-2 pl-9 bg-gray-900 border border-gray-600 rounded-md text-white text-sm placeholder-gray-400 focus:outline-none focus:border-purple-500"
                            onChange={(e) => {
                              // You can add search functionality here if needed
                            }}
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
                      
                      {/* Countries List */}
                      <div className="max-h-60 overflow-y-auto">
                        {countryList.length > 0 ? (
                          countryList.map((country) => (
                            <button
                              key={country.code}
                              type="button"
                              onClick={() => handleCountrySelect(country)}
                              className={`w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-gray-700/50 transition-colors ${
                                selectedCountry.code === country.code 
                                  ? 'bg-purple-600/20 border-r-2 border-purple-500' 
                                  : 'border-r-2 border-transparent'
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
                          ))
                        ) : (
                          <div className="p-4 text-center text-gray-400">
                            Loading countries...
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Phone Input */}
              <div className="flex-1">
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  className={`w-full px-4 py-3 rounded-lg bg-gray-800/80 border ${
                    errors.phone ? "border-red-500" : "border-gray-700"
                  } text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base placeholder-gray-400`}
                  placeholder="Enter phone number"
                />
              </div>
            </div>
            {errors.phone && (
              <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.phone}
              </p>
            )}
          </div>

          {/* Password Input */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-300 mb-2"
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
              className={`w-full px-4 py-3 rounded-lg bg-gray-800/80 border ${
                errors.password ? "border-red-500" : "border-gray-700"
              } text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-base placeholder-gray-400`}
              placeholder="Enter your password"
            />
            {errors.password && (
              <p className="mt-2 text-sm text-red-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.password}
              </p>
            )}
          </div>

          {/* Remember Me & Forgot Password */}
          <div className="flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3 xs:gap-0">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-700 rounded bg-gray-800"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-sm text-gray-400"
              >
                Remember me
              </label>
            </div>

            <div className="text-sm">
              <Link
                href="/forgot-password"
                className="text-purple-500 hover:text-purple-400 transition-colors font-medium"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-purple-800 disabled:to-indigo-800 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-purple-900/50 transition-all duration-300 flex items-center justify-center text-base min-h-[3rem] disabled:cursor-not-allowed"
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
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </button>
        </form>

        {/* Registration Link */}
        <div className="mt-6 text-center relative z-10">
          <p className="text-sm sm:text-base text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/customer/customer-registration"
              className="text-purple-500 hover:text-purple-400 font-medium transition-colors underline"
            >
              Register now
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}