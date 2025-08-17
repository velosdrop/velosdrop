'use client';
import WalletComponent from '@/components/driver/wallet';

export default function Wallet() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-8 px-4">
      <div className="max-w-md mx-auto">
        <WalletComponent />
      </div>
    </div>
  );
}