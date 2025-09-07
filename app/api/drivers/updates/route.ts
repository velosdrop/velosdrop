// app/api/drivers/updates/route.ts
import { NextRequest } from "next/server";
import { activeConnections } from "@/lib/sse";

export async function GET(request: NextRequest) {
  try {
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    const encoder = new TextEncoder();

    const connection = { writer, encoder };
    activeConnections.add(connection);

    console.log("🔌 New SSE connection established. Total:", activeConnections.size);

    // Initial connect message
    await writer.write(
      encoder.encode(
        `event: connected\ndata: ${JSON.stringify({
          type: "CONNECTED",
          message: "Connected to driver updates",
        })}\n\n`
      )
    );

    // Heartbeat (keep-alive)
    const heartbeat = setInterval(async () => {
      try {
        await writer.write(
          encoder.encode(`event: heartbeat\ndata: ${JSON.stringify({ type: "HEARTBEAT" })}\n\n`)
        );
      } catch (err) {
        console.error("💔 Heartbeat failed:", err);
        clearInterval(heartbeat);
        activeConnections.delete(connection);
      }
    }, 30000);

    // Clean up on abort
    request.signal.addEventListener("abort", () => {
      clearInterval(heartbeat);
      activeConnections.delete(connection);
      writer.close();
      console.log("❌ SSE connection closed. Total:", activeConnections.size);
    });

    return new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error) {
    console.error("Error in SSE endpoint:", error);
    return new Response("Error establishing SSE connection", { status: 500 });
  }
}