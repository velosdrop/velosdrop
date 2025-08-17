"use client";

import Image from 'next/image'
import Button from './Button'
import { useRouter } from 'next/navigation' 

const Hero = () => {
  const router = useRouter()

  const handleBecomeDriverClick = () => {
    // Redirect to driver otp authentication
    router.push('/driver/registration')
  }

  return (
    <section className="max-container padding-container flex flex-col gap-20 py-10 pb-32 md:gap-28 lg:py-20 xl:flex-row bg-dark-950">
      <div className="relative z-20 flex flex-1 flex-col xl:w-1/2">
        <h1 className="bold-52 lg:bold-88 text-white">
          On-Demand <span className="text-purple-500">Local Delivery</span> & Transportation
        </h1>
        <p className="regular-16 mt-6 text-gray-300 xl:max-w-[520px]">
          VelosDrop provides fast and reliable delivery of your packages and goods.
        </p>

        <div className="my-11 flex items-center gap-5">
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
        </div>

        <div className="flex flex-col w-full gap-3 sm:flex-row">
          <Button 
            type="button" 
            title="Book Delivery" 
            variant="btn_purple" 
          />
          <Button 
            type="button" 
            title="Become a Driver" 
            variant="btn_dark_purple_outline" 
            onClick={handleBecomeDriverClick} 
          />
        </div>
      </div>
      <div className="relative flex flex-1 items-start">
        <div className="relative z-20 flex w-full max-w-[350px] flex-col gap-6 rounded-3xl bg-gray-900 border border-gray-800 p-8 shadow-lg hover:shadow-purple-500/20 transition-all">
          {/* Delivery Time */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Image 
                src="deliverytime.svg" 
                alt="Delivery time" 
                width={24} 
                height={24}
              />
            </div>
            <div>
              <p className="regular-14 text-gray-400 mb-1">Average Delivery Time</p>
              <div className="flex items-center gap-2">
                <p className="bold-20 text-white">Under 30 mins</p>
                <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">Guaranteed</span>
              </div>
            </div>
          </div>

          {/* Cities of Operation */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Image 
                src="location.svg" 
                alt="Cities" 
                width={24} 
                height={24}
              />
            </div>
            <div>
              <p className="regular-14 text-gray-400 mb-1">Cities of Operation</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-sm px-3 py-1 bg-gray-800 text-purple-300 rounded-full">Harare</span>
                <span className="text-sm px-3 py-1 bg-gray-800 text-purple-300 rounded-full">Bulawayo</span>
                <span className="text-sm px-3 py-1 bg-gray-800 text-purple-300 rounded-full">Masvingo</span>
                <span className="text-sm px-3 py-1 bg-gray-800 text-purple-300 rounded-full">+22 more</span>
              </div>
            </div>
          </div>

          {/* Active Drivers */}
          <div className="flex items-start gap-4">
            <div className="p-2 bg-purple-600/20 rounded-lg">
              <Image 
                src="driver.svg" 
                alt="Drivers" 
                width={24} 
                height={24}
              />
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
        </div>
      </div>
    </section>
  )
}

export default Hero