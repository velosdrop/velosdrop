// app/driver/vehicle/page.tsx
'use client';
import VehicleDetails from "@/components/driver/VehicleDetails";  // Removed space

export default function Page() {
  return (
    <div className="container mx-auto p-4">
      <VehicleDetails />
    </div>
  );
}