import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/db";
import { driversTable } from "@/src/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { publishDriverLocationUpdate } from "@/lib/pubnub-booking";

export async function GET(request: NextRequest) {
  try {
    // Get online drivers updated in last 5 minutes
    const onlineDrivers = await db
      .select()
      .from(driversTable)
      .where(
        and(
          eq(driversTable.isOnline, true),
          eq(driversTable.status, "approved"),
          gt(driversTable.updatedAt, new Date(Date.now() - 5 * 60 * 1000).toISOString())
        )
      );

    return NextResponse.json(onlineDrivers);
  } catch (error) {
    console.error("Error fetching online drivers:", error);
    return NextResponse.json(
      { error: "Failed to fetch online drivers" },
      { status: 500 }
    );
  }
}

// ✅ Updated POST to toggle/update driver online status with PubNub
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { driverId, isOnline, latitude, longitude } = body;

    if (!driverId) {
      return NextResponse.json({ error: "Driver ID is required" }, { status: 400 });
    }

    const result = await db
      .update(driversTable)
      .set({
        isOnline,
        latitude,
        longitude,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(driversTable.id, driverId))
      .returning();

    const updatedDriver = result[0];

    // 🔴 Broadcast driver update via PubNub
    if (latitude && longitude) {
      await publishDriverLocationUpdate(updatedDriver.id, {
        latitude: updatedDriver.latitude || latitude,
        longitude: updatedDriver.longitude || longitude
      });
    }

    return NextResponse.json({
      success: true,
      driver: updatedDriver,
    });
  } catch (error) {
    console.error("Error updating driver online status:", error);
    return NextResponse.json(
      { error: "Failed to update driver status" },
      { status: 500 }
    );
  }
}