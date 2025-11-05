//components/Hero.tsx
"use client";

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, type Variants } from 'framer-motion';
import { ArrowRight, Bike } from 'lucide-react'; // You might need to run: npm install lucide-react

const Hero = () => {
  const router = useRouter();

  const handleBecomeDriverClick = () => {
    // Redirect to driver otp authentication
    router.push('/driver/registration');
  };

  const handleBookDeliveryClick = () => {
    // Redirect to customer login page
    router.push('/customer/customer-login');
  };

  // Animation variants for Framer Motion, now correctly typed
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.3 }
    }
  };

  const itemVariants: Variants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: 'spring', stiffness: 100 }
    }
  };

  return (
    <section className="relative min-h-screen max-container padding-container flex flex-col items-center justify-center lg:py-20 xl:flex-row bg-gray-900 text-white overflow-hidden">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute bottom-0 left-[-20%] right-[-20%] top-[-10%] h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(168,85,247,0.15),rgba(255,255,255,0))]"></div>
        <div className="absolute bottom-[-20%] right-[0%] top-[-10%] h-[700px] w-[700px] rounded-full bg-[radial-gradient(circle_farthest-side,rgba(168,85,247,0.1),rgba(255,255,255,0))]"></div>
      </div>
      
      {/* Main Content */}
      <motion.div
        className="relative z-20 flex flex-1 flex-col items-center text-center xl:items-start xl:text-left xl:w-1/2"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <motion.h1 variants={itemVariants} className="bold-52 lg:bold-88">
          On-Demand <span className="text-purple-500">Local Delivery</span> & Transportation
        </motion.h1>

        <motion.p variants={itemVariants} className="regular-16 mt-6 text-gray-300 xl:max-w-[520px]">
          VelosDrop provides fast and reliable delivery of your packages and goods, connecting you with professional drivers in minutes. 🚀
        </motion.p>
        
        <motion.div variants={itemVariants} className="my-11 flex flex-col sm:flex-row items-center gap-5">
          <div className="flex items-center gap-2">
            {Array(5).fill(1).map((_, index) => (
              <Image 
                src="/star.svg"
                key={index}
                alt="star"
                width={24}
                height={24}
              />
            ))}
          </div>
          <p className="bold-16 lg:bold-20 text-purple-400">
            10,000+ Successful Deliveries
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-col w-full gap-4 sm:flex-row">
          <motion.button
            onClick={handleBookDeliveryClick}
            className="flex items-center justify-center gap-3 rounded-full bg-purple-600 px-8 py-4 text-lg font-bold text-white shadow-lg shadow-purple-600/30 transition-all hover:bg-purple-700 focus:outline-none focus:ring-4 focus:ring-purple-400"
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
            animate={{ scale: [1, 1.03, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Bike size={24} />
            Book a Delivery
          </motion.button>
          
          <motion.button
            onClick={handleBecomeDriverClick}
            className="flex items-center justify-center gap-3 rounded-full border-2 border-purple-500 px-8 py-4 text-lg font-bold text-purple-400 transition-all hover:bg-purple-500 hover:text-white focus:outline-none focus:ring-4 focus:ring-purple-500/50"
            whileHover={{ scale: 1.05, y: -5 }}
            whileTap={{ scale: 0.95 }}
          >
            Become a Driver
            <ArrowRight size={24} />
          </motion.button>
        </motion.div>
      </motion.div>
      
      {/* Right Side Info Card */}
      <motion.div 
        className="relative hidden xl:flex flex-1 items-start justify-center"
        initial={{ opacity: 0, x: 100 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, delay: 0.8, ease: "easeOut" }}
      >
        <motion.div 
          className="relative z-20 flex w-full max-w-[400px] flex-col gap-8 rounded-3xl bg-gray-900/50 border border-gray-700 p-8 shadow-2xl backdrop-blur-md"
          whileHover={{ y: -10, boxShadow: '0 20px 30px -10px rgba(168, 85, 247, 0.3)' }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
          {/* Delivery Time */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <Image src="/deliverytime.svg" alt="Delivery time" width={28} height={28} />
            </div>
            <div>
              <p className="regular-14 text-gray-400 mb-1">Average Delivery Time</p>
              <div className="flex items-center gap-2">
                <p className="bold-20 text-white">Under 30 mins</p>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full font-semibold">Guaranteed</span>
              </div>
            </div>
          </div>

          {/* Active Drivers */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <Image src="/driver.svg" alt="Drivers" width={28} height={28} />
            </div>
            <div>
              <p className="regular-14 text-gray-400 mb-1">Active Drivers</p>
              <div className="flex items-center gap-2">
                <p className="bold-20 text-white">500+</p>
                <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-purple-900/30 text-purple-300">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Verified
                </span>
              </div>
              <p className="regular-12 text-gray-500 mt-1">Background-checked professionals</p>
            </div>
          </div>

          {/* Cities of Operation */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-purple-600/20 rounded-lg">
              <Image src="/location.svg" alt="Cities" width={28} height={28} />
            </div>
            <div>
              <p className="regular-14 text-gray-400 mb-1">Cities of Operation</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-sm px-3 py-1 bg-gray-800 text-purple-300 rounded-full">Harare</span>
                <span className="text-sm px-3 py-1 bg-gray-800 text-purple-300 rounded-full">Bulawayo</span>
                <span className="text-sm px-3 py-1 bg-gray-800 text-purple-300 rounded-full">+22 more</span>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </section>
  );
};

export default Hero;