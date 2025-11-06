//components/driver/LocationPermissionRequest.tsx
'use client';
import { useState, useEffect } from 'react';
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
  const [hasChecked, setHasChecked] = useState(false);

  const getGeolocationErrorText = (code: number): string => {
    switch(code) {
      case 1:
        return 'Permission denied - Please enable location services in your browser settings';
      case 2:
        return 'Position unavailable - Location information is not available';
      case 3:
        return 'Timeout - The request to get location timed out';
      default:
        return 'Unknown error occurred while getting location';
    }
  };

  useEffect(() => {
    // Only check permissions once
    if (hasChecked) return;

    if (!('geolocation' in navigator)) {
      setStatus('denied');
      setHasChecked(true);
      return;
    }

    const checkPermission = () => {
      navigator.permissions?.query({ name: 'geolocation' }).then(result => {
        console.log('Location permission state:', result.state);
        
        if (result.state === 'granted') {
          setStatus('granted');
          setShowPrompt(false);
          setHasChecked(true);
          onGranted();
        } else if (result.state === 'prompt') {
          setStatus('unknown');
          setShowPrompt(true);
          setHasChecked(true);
        } else {
          setStatus('denied');
          setShowPrompt(false);
          setHasChecked(true);
          onDenied();
        }
        
        result.onchange = () => {
          console.log('Location permission changed to:', result.state);
          if (result.state === 'granted') {
            setStatus('granted');
            setShowPrompt(false);
            onGranted();
          } else {
            setStatus('denied');
            setShowPrompt(false);
            onDenied();
          }
        };
      }).catch(() => {
        // Fallback for browsers that don't support permissions API
        setShowPrompt(true);
        setHasChecked(true);
      });
    };

    checkPermission();
  }, [onGranted, onDenied, hasChecked]);

  const handleEnableLocation = () => {
    setShowPrompt(false);
    
    navigator.geolocation.getCurrentPosition(
      () => {
        console.log('Location access granted');
        setStatus('granted');
        setHasChecked(true);
        onGranted();
      },
      (error) => {
        console.error('Geolocation error:', {
          code: error.code,
          message: error.message || 'Unknown geolocation error'
        });
        setStatus('denied');
        setHasChecked(true);
        onDenied();
        
        // Show a more specific error message to the user
        alert(`Location access denied: ${getGeolocationErrorText(error.code)}`);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  const handleClose = () => {
    setShowPrompt(false);
    setHasChecked(true);
  };

  if (!showPrompt || status === 'granted') return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-300 flex items-start mx-4">
        <div className="bg-blue-100 p-2 rounded-full mr-3 flex-shrink-0">
          <FiMapPin className="text-blue-600" size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">Enable Your Location</h3>
          <p className="text-sm text-gray-600 mt-1">
            Allow location access to see your real-time position on the map.
          </p>
          <div className="flex justify-end mt-3 space-x-2">
            <button
              onClick={handleClose}
              className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded transition-colors"
            >
              Not Now
            </button>
            <button
              onClick={handleEnableLocation}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            >
              Enable Location
            </button>
          </div>
        </div>
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-500 ml-2 flex-shrink-0 transition-colors"
        >
          <FiX size={18} />
        </button>
      </div>
    </div>
  );
}