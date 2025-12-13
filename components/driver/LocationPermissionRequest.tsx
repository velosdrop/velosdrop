'use client';
import { useState, useEffect, useRef } from 'react';
import { FiMapPin, FiX } from 'react-icons/fi';

interface LocationPermissionRequestProps {
  onGranted: () => void;
  onDenied?: () => void;
}

export default function LocationPermissionRequest({ 
  onGranted, 
  onDenied = () => {} 
}: LocationPermissionRequestProps) {
  const [showPrompt, setShowPrompt] = useState(false);
  const [status, setStatus] = useState<'unknown'|'granted'|'denied'>('unknown');
  const hasRequestedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const getGeolocationErrorText = (code: number): string => {
    switch(code) {
      case 1:
        return 'Location access denied. Enable it in browser settings.';
      case 2:
        return 'Location unavailable. Try again.';
      case 3:
        return 'Location request timed out.';
      default:
        return 'Location access error.';
    }
  };

  useEffect(() => {
    if (!('geolocation' in navigator) || hasRequestedRef.current) {
      setStatus('denied');
      return;
    }
    
    const checkPermission = () => {
      navigator.permissions?.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') {
          if (mountedRef.current) {
            setStatus('granted');
            onGranted();
          }
        } else if (result.state === 'prompt') {
          hasRequestedRef.current = true;
          if (mountedRef.current) {
            setShowPrompt(true);
          }
        } else {
          if (mountedRef.current) {
            setStatus('denied');
            onDenied();
          }
        }
        
        result.onchange = () => {
          if (result.state === 'granted' && mountedRef.current) {
            setStatus('granted');
            setShowPrompt(false);
            onGranted();
          }
        };
      }).catch(() => {
        if (mountedRef.current && !hasRequestedRef.current) {
          hasRequestedRef.current = true;
          setShowPrompt(true);
        }
      });
    };

    checkPermission();
  }, [onGranted, onDenied]);

  const handleEnableLocation = () => {
    hasRequestedRef.current = true;
    navigator.geolocation.getCurrentPosition(
      () => {
        if (mountedRef.current) {
          setStatus('granted');
          setShowPrompt(false);
          onGranted();
        }
      },
      (error) => {
        console.error('Geolocation error:', error.code);
        if (mountedRef.current) {
          setStatus('denied');
          setShowPrompt(false);
          onDenied();
        }
        alert(`Location Required: ${getGeolocationErrorText(error.code)}`);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleClose = () => {
    hasRequestedRef.current = true;
    if (mountedRef.current) {
      setShowPrompt(false);
      onDenied();
    }
  };

  if (!showPrompt || status === 'granted') return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="relative w-full max-w-sm md:max-w-md">
        {/* Main Card */}
        <div className="bg-black border border-purple-500/20 rounded-xl shadow-xl shadow-purple-900/20 overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-purple-900/30 to-purple-700/10 px-4 py-3 md:px-5 md:py-4 border-b border-purple-500/10">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 md:space-x-3">
                <div className="p-1.5 md:p-2 bg-gradient-to-br from-purple-600 to-purple-800 rounded-lg">
                  <FiMapPin className="text-white text-sm md:text-base" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm md:text-base">Location Access</h3>
                  <p className="text-purple-300/70 text-xs md:text-sm">Velosdrop Delivery</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="text-purple-300 hover:text-white p-1 hover:bg-purple-900/30 rounded transition-colors"
              >
                <FiX className="text-base md:text-lg" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="px-4 py-4 md:px-5 md:py-5">
            <div className="mb-4">
              <h4 className="font-semibold text-white text-sm md:text-base mb-2">Enable Location Tracking</h4>
              <p className="text-gray-300 text-xs md:text-sm mb-3">
                Required for accurate delivery tracking and optimized routes.
              </p>
              
              {/* Benefits */}
              <div className="space-y-2 mb-4">
                <div className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 mr-2 md:mr-3 flex-shrink-0"></div>
                  <span className="text-gray-300 text-xs md:text-sm">Real-time position updates</span>
                </div>
                <div className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 mr-2 md:mr-3 flex-shrink-0"></div>
                  <span className="text-gray-300 text-xs md:text-sm">Optimized delivery routes</span>
                </div>
                <div className="flex items-start">
                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full mt-1.5 mr-2 md:mr-3 flex-shrink-0"></div>
                  <span className="text-gray-300 text-xs md:text-sm">Accurate delivery confirmation</span>
                </div>
              </div>
            </div>

            {/* Privacy Note */}
            <div className="bg-gray-900/40 border border-gray-800 rounded-lg p-3 mb-4 md:mb-5">
              <p className="text-gray-400 text-xs md:text-sm">
                <span className="font-medium text-purple-300">Privacy:</span> Your location is encrypted and only used for active deliveries.
              </p>
            </div>

            {/* Action Buttons - Stack on mobile, side-by-side on larger screens */}
            <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
              <button
                onClick={handleClose}
                className="px-3 py-2.5 md:px-4 md:py-3 text-gray-300 hover:text-white hover:bg-gray-800 border border-gray-700 hover:border-gray-600 rounded-lg font-medium transition-colors text-sm md:text-base flex-1"
              >
                Deny Access
              </button>
              <button
                onClick={handleEnableLocation}
                className="px-3 py-2.5 md:px-4 md:py-3 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white rounded-lg font-medium shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 transition-all text-sm md:text-base flex-1"
              >
                Allow Access
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 md:px-5 md:py-3 bg-black/30 border-t border-gray-800">
            <p className="text-gray-500 text-xs text-center">
              Required for delivery • Can change in settings
            </p>
          </div>
        </div>

        {/* Mobile Bottom Sheet Style (Alternative for very small screens) */}
        <div className="sm:hidden mt-4">
          <div className="bg-black border border-purple-500/20 rounded-xl p-4 text-center">
            <p className="text-gray-400 text-xs">
              Enable location for the best delivery experience
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}