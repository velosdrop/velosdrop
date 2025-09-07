// lib/sse.ts
type Connection = {
    writer: WritableStreamDefaultWriter<Uint8Array>;
    encoder: TextEncoder;
  };
  
  export const activeConnections = new Set<Connection>();
  
  export function broadcastDriverUpdate(update: any) {
    const payload = `event: driverUpdate\ndata: ${JSON.stringify(update)}\n\n`;
  
    activeConnections.forEach((connection) => {
      try {
        connection.writer.write(connection.encoder.encode(payload));
      } catch (err) {
        console.error("Error broadcasting update:", err);
        activeConnections.delete(connection);
      }
    });
  }