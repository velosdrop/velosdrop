// components/Navbar.tsx
'use client';

import { NAV_LINKS } from "@/constants";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const Navbar = () => {
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Handle scroll effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  return (
    <>
      <nav className={`
        fixed top-0 left-0 right-0 z-50 transition-all duration-300 navbar-enter
        ${isScrolled 
          ? 'bg-gray-900/95 backdrop-blur-md shadow-lg border-b border-gray-800' 
          : 'bg-transparent'
        }
      `}>
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            
            {/* --- LEFT: Logo Section --- */}
            <Link 
              href="/" 
              className="flex items-center space-x-2 sm:space-x-3 group flex-shrink-0"
            >
              <div className={`
                relative transition-all duration-300 group-hover:scale-105
                ${isScrolled ? 'w-8 h-8 sm:w-10 sm:h-10' : 'w-10 h-10 sm:w-12 sm:h-12'}
              `}>
                <Image
                  src="/velosdroplogo.svg"
                  alt="VelosDrop"
                  width={isScrolled ? 40 : 48}
                  height={isScrolled ? 40 : 48}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="flex flex-col">
                <span className={`
                  font-bold tracking-tight transition-colors duration-300
                  ${isScrolled 
                    ? 'text-lg sm:text-2xl text-gray-100' 
                    : 'text-xl sm:text-3xl text-white'
                  }
                `}>
                  VelosDrop
                </span>
                {!isScrolled && (
                  <span className="hidden sm:block text-xs text-purple-300 font-medium tracking-wide">
                    Premium Delivery
                  </span>
                )}
              </div>
            </Link>

            {/* --- RIGHT SIDE WRAPPER: Contains Logins + Hamburger --- */}
            <div className="flex items-center gap-2 sm:gap-4">
              
              {/* Login Buttons - Visible on Mobile & Desktop */}
              {isHomePage && (
                <div className="flex items-center gap-2 sm:gap-4 mr-1 sm:mr-0">
                  <Link
                    href="/driver-login"
                    className={`
                      font-medium transition-colors duration-300 whitespace-nowrap
                      text-[10px] sm:text-sm lg:text-base
                      ${isScrolled 
                        ? 'text-gray-300 hover:text-purple-400' 
                        : 'text-gray-200 hover:text-white'
                      }
                    `}
                  >
                    Driver Login
                  </Link>
                  <span className={`text-[10px] sm:text-sm ${isScrolled ? 'text-gray-600' : 'text-gray-500'}`}>|</span>
                  <Link
                    href="/customer/customer-login"
                    className={`
                      font-medium transition-colors duration-300 whitespace-nowrap
                      text-[10px] sm:text-sm lg:text-base
                      ${isScrolled 
                        ? 'text-gray-300 hover:text-purple-400' 
                        : 'text-gray-200 hover:text-white'
                      }
                    `}
                  >
                    Customer Login
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button - Sits to the right of logins */}
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className={`
                  lg:hidden flex flex-col items-center justify-center w-9 h-9 sm:w-10 sm:h-10
                  rounded-lg transition-all duration-300 group flex-shrink-0
                  ${isScrolled 
                    ? 'text-gray-400 hover:bg-gray-800 hover:text-white' 
                    : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  }
                `}
                aria-label="Toggle menu"
              >
                <span className={`w-5 sm:w-6 h-0.5 bg-current transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : 'group-hover:bg-purple-400'}`}></span>
                <span className={`w-5 sm:w-6 h-0.5 bg-current my-1 sm:my-1.5 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100 group-hover:bg-purple-400'}`}></span>
                <span className={`w-5 sm:w-6 h-0.5 bg-current transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : 'group-hover:bg-purple-400'}`}></span>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu Dropdown (Only contains NAV_LINKS now) */}
        <div className={`
          lg:hidden absolute top-full left-0 right-0 
          bg-gray-900/95 backdrop-blur-md border-t border-gray-800
          transition-all duration-300 overflow-hidden
          ${isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}>
          <div className="px-4 py-6 space-y-4">
            {isHomePage && (
              <>
                {/* Regular Nav Links only - Logins moved to top bar */}
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className="block text-gray-300 hover:text-purple-400 font-medium py-3 px-2 transition-colors duration-200 border-b border-gray-800 last:border-0"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-16 lg:h-20"></div>
    </>
  );
};

export default Navbar;