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
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 lg:h-20">
            {/* Logo */}
            <Link 
              href="/" 
              className="flex items-center space-x-3 group"
            >
              <div className={`
                relative transition-all duration-300 group-hover:scale-105
                ${isScrolled ? 'w-10 h-10' : 'w-12 h-12'}
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
                    ? 'text-2xl text-gray-100' 
                    : 'text-3xl text-white'
                  }
                `}>
                  VelosDrop
                </span>
                {!isScrolled && (
                  <span className="text-xs text-purple-300 font-medium tracking-wide">
                    Premium Delivery
                  </span>
                )}
              </div>
            </Link>

            {/* Navigation Links - Desktop */}
            {isHomePage && (
              <div className="hidden lg:flex items-center space-x-8">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.key}
                    href={link.href}
                    className={`
                      relative font-medium transition-all duration-300 px-1 py-2
                      ${isScrolled 
                        ? 'text-gray-300 hover:text-purple-400' 
                        : 'text-gray-200 hover:text-white'
                      }
                      after:content-[''] after:absolute after:w-0 after:h-0.5 
                      after:bg-gradient-to-r after:from-purple-500 after:to-purple-400
                      after:bottom-0 after:left-1/2 after:transition-all after:duration-300
                      hover:after:w-full hover:after:left-0
                    `}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            )}

            {/* Spacer for non-homepage */}
            {!isHomePage && (
              <div className="hidden lg:flex flex-1"></div>
            )}

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`
                lg:hidden flex flex-col items-center justify-center w-10 h-10 
                rounded-lg transition-all duration-300 group
                ${isScrolled 
                  ? 'text-gray-400 hover:bg-gray-800 hover:text-white' 
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
                }
              `}
              aria-label="Toggle menu"
            >
              <span className={`w-6 h-0.5 bg-current transition-all duration-300 ${isMobileMenuOpen ? 'rotate-45 translate-y-1.5' : 'group-hover:bg-purple-400'}`}></span>
              <span className={`w-6 h-0.5 bg-current my-1.5 transition-all duration-300 ${isMobileMenuOpen ? 'opacity-0' : 'opacity-100 group-hover:bg-purple-400'}`}></span>
              <span className={`w-6 h-0.5 bg-current transition-all duration-300 ${isMobileMenuOpen ? '-rotate-45 -translate-y-1.5' : 'group-hover:bg-purple-400'}`}></span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        <div className={`
          lg:hidden absolute top-full left-0 right-0 
          bg-gray-900/95 backdrop-blur-md border-t border-gray-800
          transition-all duration-300 overflow-hidden
          ${isMobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}
        `}>
          <div className="px-4 py-6 space-y-4">
            {isHomePage && NAV_LINKS.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="block text-gray-300 hover:text-purple-400 font-medium py-3 px-2 transition-colors duration-200 border-b border-gray-800 last:border-b-0"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Spacer for fixed navbar */}
      <div className="h-16 lg:h-20"></div>
    </>
  );
};

export default Navbar;