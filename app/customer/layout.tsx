// app/customer/layout.tsx
import { UserProvider } from '@/app/context/UserContext';
import { DeliveryProvider } from '@/app/context/DeliveryContext'; // Import DeliveryProvider

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <UserProvider>
      <DeliveryProvider> {/* Wrap with DeliveryProvider */}
        {children}
      </DeliveryProvider>
    </UserProvider>
  );
}