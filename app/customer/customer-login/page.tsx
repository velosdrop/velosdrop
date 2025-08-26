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

export default function CustomerLogin() {
  const [formData, setFormData] = useState({
    phone: "",
    password: "",
  });
  const [selectedCountry, setSelectedCountry] = useState<Country>({
    code: "ZW",
    name: "Zimbabwe",
    phone: "263",
    emoji: "🇿🇼",
  });
  const [countryList, setCountryList] = useState<Country[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setCustomer } = useUser();

  useEffect(() => {
    const countriesData = Object.entries(countries)
      .map(([code, country]) => ({
        code,
        name: country.name,
        phone: country.phone,
        emoji: country.emoji,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    setCountryList(countriesData);

    // Zimbabwe default
    const zim = countriesData.find((c) => c.code === "ZW");
    if (zim) setSelectedCountry(zim);
  }, []);

  const handleCountryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const countryCode = e.target.value;
    const country = countryList.find((c) => c.code === countryCode);
    if (country) {
      setSelectedCountry(country);
    }
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

      const customer = await db
        .select()
        .from(customersTable)
        .where(eq(customersTable.phoneNumber, fullPhoneNumber))
        .get();

      if (!customer || !(await compare(formData.password, customer.password))) {
        setErrors({ form: "Invalid phone number or password" });
        return;
      }

      await db
        .update(customersTable)
        .set({ lastLogin: new Date().toISOString() })
        .where(eq(customersTable.id, customer.id))
        .run();

      // Store complete customer data including ID
      const customerData = {
        id: customer.id,
        username: customer.username,
        phoneNumber: customer.phoneNumber,
        profilePictureUrl: customer.profilePictureUrl || undefined
      };
      
      setCustomer(customerData);

      router.push("/customer/customer-dashboard");
    } catch (error) {
      console.error("Login failed:", error);
      setErrors({ form: "Login failed. Please try again." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-purple-900 text-white flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-950/90 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-purple-600 relative overflow-hidden">
        {/* Neon Glow */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>

        <div className="text-center mb-8 relative z-10">
          <h1 className="text-4xl font-extrabold text-purple-400 mb-2 drop-shadow-lg">
            Welcome
          </h1>
          <p className="text-gray-400">Sign in with your phone number</p>
        </div>

        {errors.form && (
          <div className="mb-4 p-3 bg-red-900/60 border border-red-500 text-red-300 rounded-lg text-sm">
            {errors.form}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-300 mb-1"
            >
              Phone Number
            </label>
            <div className="flex">
              <div className="relative w-1/3 mr-2">
                <select
                  value={selectedCountry.code}
                  onChange={handleCountryChange}
                  className="w-full px-3 py-3 rounded-lg bg-gray-800/80 border border-gray-700 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
                >
                  {countryList.map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.emoji} +{country.phone}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <svg
                    className="w-5 h-5 text-gray-400"
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
                </div>
              </div>
              <input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={handlePhoneChange}
                className={`flex-1 px-4 py-3 rounded-lg bg-gray-800/80 border ${
                  errors.phone ? "border-red-500" : "border-gray-700"
                } text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500`}
                placeholder={
                  selectedCountry.code === "ZW"
                    ? "77 123 4567"
                    : "123 456 7890"
                }
              />
            </div>
            {errors.phone && (
              <p className="mt-1 text-sm text-red-500">{errors.phone}</p>
            )}
          </div>

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
              className={`w-full px-4 py-3 rounded-lg bg-gray-800/80 border ${
                errors.password ? "border-red-500" : "border-gray-700"
              } text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500`}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">{errors.password}</p>
            )}
          </div>

          <div className="flex items-center justify-between">
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
                className="text-purple-500 hover:text-purple-400"
              >
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-lg shadow-purple-900/50 transition duration-300 flex items-center justify-center"
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

        <div className="mt-6 text-center relative z-10">
          <p className="text-gray-400">
            Don&apos;t have an account?{" "}
            <Link
              href="/customer/customer-registration"
              className="text-purple-500 hover:text-purple-400 font-medium"
            >
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}