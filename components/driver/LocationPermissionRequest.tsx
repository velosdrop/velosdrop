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
    if (!('geolocation' in navigator)) {
      setStatus('denied');
      return;
    }

    const checkPermission = () => {
      navigator.permissions?.query({ name: 'geolocation' }).then(result => {
        if (result.state === 'granted') {
          setStatus('granted');
          onGranted();
        } else if (result.state === 'prompt') {
          setShowPrompt(true);
        } else {
          setStatus('denied');
          onDenied();
        }
        
        result.onchange = () => {
          if (result.state === 'granted') {
            setStatus('granted');
            onGranted();
          } else {
            setStatus('denied');
            onDenied();
          }
        };
      }).catch(() => {
        // Fallback for browsers that don't support permissions API
        setShowPrompt(true);
      });
    };

    checkPermission();
  }, [onGranted, onDenied]);

  const handleEnableLocation = () => {
    navigator.geolocation.getCurrentPosition(
      () => {
        setStatus('granted');
        setShowPrompt(false);
        onGranted();
      },
      (error) => {
        console.error('Geolocation error:', {
          code: error.code,
          message: error.message || 'Unknown geolocation error'
        });
        setStatus('denied');
        setShowPrompt(false);
        onDenied();
        
        // Show a more specific error message to the user
        alert(`Location access denied: ${getGeolocationErrorText(error.code)}`);
      },
      { enableHighAccuracy: true, timeout: 5000 }
    );
  };

  if (!showPrompt || status === 'granted') return null;

  return (
    <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md">
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-300 flex items-start">
        <div className="bg-blue-100 p-2 rounded-full mr-3">
          <FiMapPin className="text-blue-600" size={20} />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">Enable Your Location</h3>
          <p className="text-sm text-gray-600 mt-1">
            Allow location access to see your real-time position on the map.
          </p>
          <div className="flex justify-end mt-3 space-x-2">
            <button
              onClick={() => setShowPrompt(false)}
              className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded"
            >
              Not Now
            </button>
            <button
              onClick={handleEnableLocation}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Enable Location
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowPrompt(false)}
          className="text-gray-400 hover:text-gray-500 ml-2"
        >
          <FiX size={18} />
        </button>
      </div>
    </div>
  );
}