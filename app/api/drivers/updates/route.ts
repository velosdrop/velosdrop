import { NextRequest } from "next/server";
import { activeConnections, addConnection, removeConnection, getDriverConnection, getCustomerConnection } from "@/lib/sse";

// Ensures the route is not cached and runs as a dynamic function
export const dynamic = 'force-dynamic';
// Extends the function execution timeout to 60 seconds (Vercel Hobby plan limit)
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const driverId = searchParams.get('driverId');
    const customerId = searchParams.get('customerId');
    const type = searchParams.get('type') as 'driver' | 'customer';

    // BETTER VALIDATION: Check if type is provided first
    if (!type || (type !== 'driver' && type !== 'customer')) {
      return new Response("Type must be 'driver' or 'customer'", { status: 400 });
    }

    // Parse IDs safely
    const parsedDriverId = driverId ? parseInt(driverId) : undefined;
    const parsedCustomerId = customerId ? parseInt(customerId) : undefined;

    // Validate based on type
    if (type === 'driver') {
      if (!driverId || isNaN(parsedDriverId!) || parsedDriverId! <= 0) {
        return new Response("Valid Driver ID required for driver connections", { status: 400 });
      }
    } else if (type === 'customer') {
      if (!customerId || isNaN(parsedCustomerId!) || parsedCustomerId! <= 0) {
        return new Response("Valid Customer ID required for customer connections", { status: 400 });
      }
    }

    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const connection = { 
      writer, 
      encoder,
      driverId: parsedDriverId,
      customerId: parsedCustomerId,
      type,
      connectedAt: Date.now(),
      lastActivity: Date.now()
    };

    addConnection(connection);

    console.log(`🔌 New ${type} connection. DriverID: ${parsedDriverId}, CustomerID: ${parsedCustomerId}. Total: ${activeConnections.size}`);

    // Initial connect message
    try {
      await writer.write(
        encoder.encode(
          `event: connected\ndata: ${JSON.stringify({
            type: "CONNECTED",
            message: `Connected to ${type} updates`,
            driverId: parsedDriverId,
            customerId: parsedCustomerId,
            timestamp: new Date().toISOString()
          })}\n\n`
        )
      );
    } catch (error) {
      console.error("Error sending initial connection message:", error);
      removeConnection(connection);
      writer.close();
      return new Response("Error establishing connection", { status: 500 });
    }

    // Heartbeat (keep-alive) at a safe interval - reduced from 25s to 15s for Vercel compatibility
    const heartbeatInterval = setInterval(async () => {
      try {
        await writer.write(
          encoder.encode(`: heartbeat\n\n`)
        );
        // Update last activity timestamp
        connection.lastActivity = Date.now();
      } catch (err) {
        console.error("💔 Heartbeat failed:", err);
        clearInterval(heartbeatInterval);
        removeConnection(connection);
      }
    }, 15000); // 15 seconds is safer for Vercel's environment

    // Clean up when the client disconnects
    request.signal.addEventListener("abort", () => {
      clearInterval(heartbeatInterval);
      removeConnection(connection);
      writer.close();
      console.log(`❌ ${type} connection closed. DriverID: ${parsedDriverId}, CustomerID: ${parsedCustomerId}. Total: ${activeConnections.size}`);
    });

    // Handle connection close
    request.signal.addEventListener("close", () => {
      clearInterval(heartbeatInterval);
      removeConnection(connection);
      writer.close();
    });

    return new Response(stream.readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'Content-Encoding': 'none',
        'Access-Control-Allow-Origin': '*',
        'X-Accel-Buffering': 'no', // Prevent buffering by Nginx
        'Transfer-Encoding': 'chunked'
      },
    });
  } catch (error) {
    console.error("Error in SSE endpoint:", error);
    return new Response("Error establishing SSE connection", { status: 500 });
  }
}