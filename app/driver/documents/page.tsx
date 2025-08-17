import { Suspense } from 'react';
import Loading from '@/app/driver/documents/loading';
import Documents from '@/components/driver/Documents';

export default function Page() {
  return (
    <div className="container mx-auto p-4">
      <Suspense fallback={<Loading />}>
        <Documents />
      </Suspense>
    </div>
  );
}
