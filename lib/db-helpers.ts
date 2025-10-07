/// lib/db-helpers.ts
import { db } from '@/src/db'; // Import your db instance
import { deliveryRequestsTable, driverResponsesTable } from '@/src/db/schema'; // Import your tables
import { eq } from 'drizzle-orm'; // Import the Drizzle ORM operator

export async function updateDeliveryRequestStatus(
  requestId: number, 
  driverId: number, 
  response: string
) {
  // Update the delivery request status
  if (response === 'accepted') {
    await db.update(deliveryRequestsTable)
      .set({ 
        status: 'accepted',
        assignedDriverId: driverId
      })
      .where(eq(deliveryRequestsTable.id, requestId));
  }
  
  // Create driver response record
  await db.insert(driverResponsesTable).values({
    requestId,
    driverId,
    response,
    respondedAt: new Date().toISOString()
  });
  
  return await db.select()
    .from(deliveryRequestsTable)
    .where(eq(deliveryRequestsTable.id, requestId))
    .then(rows => rows[0]);
}