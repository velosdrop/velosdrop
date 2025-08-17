'use client';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { OtpLogin } from '@/components/OtpLogin';
import { useDriverForm } from '@/app/context/DriverFormContext';
import Link from 'next/link';

export default function RegistrationPage() {
    const constraintsRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    const [bypassOTP, setBypassOTP] = useState<boolean>(false);
    const { setPersonalData } = useDriverForm();
    
    useEffect(() => {
        if (process.env.NODE_ENV === 'development') {
            setBypassOTP(true);
        }
    }, []);

    const handleBypass = () => {
        // Set a mock phone number for development
        setPersonalData({ phoneNumber: '+263780517601' });
        router.push('/driver/personal');
    };

    const handleVerificationSuccess = (phoneNumber: string) => {
        setPersonalData({ phoneNumber });
        router.push('/driver/personal');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white p-4 md:p-8">
            <div className="max-w-md mx-auto" ref={constraintsRef}>
                <motion.div 
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2, type: "spring" }}
                    className="text-center mb-10"
                >
                    <motion.h1 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="font-bold text-3xl bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-purple-600 mb-2"
                    >
                        Join Velosdrop
                    </motion.h1>
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="text-gray-400"
                    >
                        Register as a driver and start earning
                    </motion.p>
                </motion.div>

                <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    whileHover={{ scale: 1.01 }}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 md:p-8 border border-gray-700/50 shadow-xl shadow-purple-900/10"
                >
                    <motion.h2 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="font-semibold text-xl mb-6 text-center"
                    >
                        Driver Registration
                    </motion.h2>
                    
                    <OtpLogin 
                        onVerificationSuccess={handleVerificationSuccess}
                    />
                    
                    {bypassOTP && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="mt-4 text-center"
                        >
                            <motion.button
                                onClick={handleBypass}
                                className="text-xs text-gray-400 hover:text-purple-400 transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                [DEV ONLY] Skip OTP Verification
                            </motion.button>
                        </motion.div>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-8 text-center text-sm text-gray-500"
                >
                    <motion.p
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        Already have an account?{' '}
                        <Link 
                            href="/driver-login"
                            className="text-purple-400 hover:text-purple-300 transition-colors"
                            passHref
                        >
                            Sign in
                        </Link>
                    </motion.p>
                    <motion.p 
                        className="mt-2"
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                    >
                        By registering, you agree to our{' '}
                        <Link
                            href="/terms"
                            className="text-purple-400 hover:underline"
                            passHref
                        >
                            Terms
                        </Link>
                    </motion.p>
                </motion.div>
            </div>
        </div>
    );
}