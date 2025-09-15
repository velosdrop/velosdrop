 // lib/sse.ts
type Connection = {
  writer: WritableStreamDefaultWriter<Uint8Array>;
  encoder: TextEncoder;
  driverId?: number;
  customerId?: number;
  type: 'driver' | 'customer';
  heartbeatInterval?: NodeJS.Timeout;
  connectedAt?: number;
  lastActivity?: number;
};

// Use globalThis to store connections that survive Fast Refresh
declare global {
  var globalConnections: {
    activeConnections: Set<Connection>;
    driverConnections: Map<number, Connection>;
    customerConnections: Map<number, Connection>;
  };
}

// Initialize globals
if (!global.globalConnections) {
  global.globalConnections = {
    activeConnections: new Set(),
    driverConnections: new Map(),
    customerConnections: new Map()
  };
}

export const activeConnections = global.globalConnections.activeConnections;
export const driverConnections = global.globalConnections.driverConnections;
export const customerConnections = global.globalConnections.customerConnections;

// Enhanced connection management
export function setupSSEConnection(connection: Connection) {
  // Add connection timeout
  connection.heartbeatInterval = setInterval(async () => {
    try {
      await connection.writer.write(
        connection.encoder.encode(': heartbeat\n\n')
      );
      connection.lastActivity = Date.now();
    } catch (err) {
      console.error("💔 Heartbeat failed:", err);
      removeConnection(connection);
    }
  }, 15000); // 15 seconds is safer for Vercel

  // Add connection timestamp
  connection.connectedAt = Date.now();
  connection.lastActivity = Date.now();
  
  addConnection(connection);
}

export function broadcastDriverUpdate(update: any) {
  const payload = `event: driverUpdate\ndata: ${JSON.stringify(update)}\n\n`;

  activeConnections.forEach((connection) => {
    try {
      connection.writer.write(connection.encoder.encode(payload));
      connection.lastActivity = Date.now();
    } catch (err) {
      console.error("Error broadcasting update:", err);
      removeConnection(connection);
    }
  });
}

// Add real-time location updates
export function broadcastDriverLocationUpdate(driverId: number, location: any) {
  const payload = `event: locationUpdate\ndata: ${JSON.stringify({
    type: 'locationUpdate',
    driverId,
    location,
    timestamp: new Date().toISOString()
  })}\n\n`;

  activeConnections.forEach((connection) => {
    if (connection.type === 'customer') {
      try {
        connection.writer.write(connection.encoder.encode(payload));
        connection.lastActivity = Date.now();
      } catch (err) {
        console.error("Error broadcasting location update:", err);
        removeConnection(connection);
      }
    }
  });
}

// FIXED: Broadcast booking request to specific drivers using efficient map lookup
export function broadcastBookingRequest(driverIds: number[], request: any) {
  // CORRECT: Wrap in proper structure that the client expects
  const payload = `event: bookingRequest\ndata: ${JSON.stringify({
    type: 'bookingRequest',
    request: request
  })}\n\n`;
  
  console.log(`📤 Broadcasting to drivers: ${driverIds.join(', ')}`);
  
  let broadcastCount = 0;
  const connectedDriverIds: number[] = [];
  const missingDriverIds: number[] = [];
  
  // Check each driver connection using the efficient map lookup
  driverIds.forEach(driverId => {
    const connection = driverConnections.get(driverId);
    
    if (connection) {
      try {
        connection.writer.write(connection.encoder.encode(payload));
        connection.lastActivity = Date.now();
        broadcastCount++;
        connectedDriverIds.push(driverId);
        console.log(`✅ Sent to driver ${driverId}`);
      } catch (err) {
        console.error(`❌ Error sending to driver ${driverId}:`, err);
        removeConnection(connection);
        missingDriverIds.push(driverId);
      }
    } else {
      missingDriverIds.push(driverId);
      console.log(`⚠️ Driver ${driverId} not connected`);
    }
  });
  
  console.log(`📊 Broadcast complete: ${broadcastCount}/${driverIds.length} drivers notified`);
  
  if (missingDriverIds.length > 0) {
    console.log(`⚠️ Drivers not connected: ${missingDriverIds.join(', ')}`);
  }
  
  return {
    notified: connectedDriverIds,
    notConnected: missingDriverIds
  };
}

// FIXED: Broadcast booking update to customer using efficient map lookup
export function broadcastBookingUpdate(customerId: number, update: any) {
  const payload = `event: bookingUpdate\ndata: ${JSON.stringify(update)}\n\n`;
  
  const connection = customerConnections.get(customerId);
  
  if (connection) {
    try {
      connection.writer.write(connection.encoder.encode(payload));
      connection.lastActivity = Date.now();
      console.log(`✅ Booking update sent to customer ${customerId}`);
      return true;
    } catch (err) {
      console.error("Error broadcasting booking update:", err);
      removeConnection(connection);
      return false;
    }
  } else {
    console.log(`⚠️ Customer ${customerId} not connected for booking update`);
    return false;
  }
}

// FIXED: Add connection with metadata - PREVENT DUPLICATES
export function addConnection(connection: Connection) {
  // Check for existing connection first and remove it
  if (connection.type === 'driver' && connection.driverId) {
    const existingConnection = driverConnections.get(connection.driverId);
    if (existingConnection) {
      console.log(`🔄 Replacing existing connection for driver ${connection.driverId}`);
      removeConnection(existingConnection);
    }
  } else if (connection.type === 'customer' && connection.customerId) {
    const existingConnection = customerConnections.get(connection.customerId);
    if (existingConnection) {
      console.log(`🔄 Replacing existing connection for customer ${connection.customerId}`);
      removeConnection(existingConnection);
    }
  }
  
  activeConnections.add(connection);
  
  // Add to lookup maps
  if (connection.type === 'driver' && connection.driverId) {
    driverConnections.set(connection.driverId, connection);
  } else if (connection.type === 'customer' && connection.customerId) {
    customerConnections.set(connection.customerId, connection);
  }
  
  console.log(`🔌 New ${connection.type} connection. DriverID: ${connection.driverId}, CustomerID: ${connection.customerId}. Total: ${activeConnections.size}`);
}

// FIXED: Remove connection - MAINTAINS LOOKUP MAPS
export function removeConnection(connection: Connection) {
  // Clean up heartbeat interval
  if (connection.heartbeatInterval) {
    clearInterval(connection.heartbeatInterval);
  }
  
  activeConnections.delete(connection);
  
  // Remove from lookup maps
  if (connection.type === 'driver' && connection.driverId) {
    driverConnections.delete(connection.driverId);
  } else if (connection.type === 'customer' && connection.customerId) {
    customerConnections.delete(connection.customerId);
  }
  
  console.log(`❌ ${connection.type} connection removed. DriverID: ${connection.driverId}, CustomerID: ${connection.customerId}. Total: ${activeConnections.size}`);
}

// NEW: Debug function to check active connections
export function debugConnections() {
  console.log('🔍 Active Connections:');
  activeConnections.forEach((conn) => {
    console.log(`- Type: ${conn.type}, DriverID: ${conn.driverId}, CustomerID: ${conn.customerId}`);
  });
  
  console.log(`📊 Stats: ${driverConnections.size} drivers, ${customerConnections.size} customers`);
  
  return {
    all: Array.from(activeConnections),
    drivers: Array.from(driverConnections.values()),
    customers: Array.from(customerConnections.values())
  };
}

// FIXED: Get all connected driver IDs - NOW USING MAP
export function getConnectedDriverIds(): number[] {
  return Array.from(driverConnections.keys());
}

// FIXED: Check if specific driver is connected - NOW USING MAP
export function isDriverConnected(driverId: number): boolean {
  return driverConnections.has(driverId);
}

// FIXED: Check if specific customer is connected - NOW USING MAP
export function isCustomerConnected(customerId: number): boolean {
  return customerConnections.has(customerId);
}

// FIXED: Get connection by driver ID - NOW USING MAP
export function getDriverConnection(driverId: number): Connection | undefined {
  return driverConnections.get(driverId);
}

// FIXED: Get connection by customer ID - NOW USING MAP
export function getCustomerConnection(customerId: number): Connection | undefined {
  return customerConnections.get(customerId);
}

// NEW: Send test message to all connections (for debugging)
export function broadcastTestMessage(message: string) {
  const payload = `event: test\ndata: ${JSON.stringify({
    type: 'test',
    message: message,
    timestamp: new Date().toISOString()
  })}\n\n`;
  
  console.log('🧪 Broadcasting test message:', message);
  
  let sentCount = 0;
  let errorCount = 0;
  
  activeConnections.forEach((connection) => {
    try {
      connection.writer.write(connection.encoder.encode(payload));
      connection.lastActivity = Date.now();
      sentCount++;
      console.log(`✅ Test sent to ${connection.type} ${connection.driverId || connection.customerId}`);
    } catch (err) {
      errorCount++;
      console.error(`❌ Error sending test to ${connection.type}:`, err);
      removeConnection(connection);
    }
  });
  
  console.log(`🧪 Test results: ${sentCount} sent, ${errorCount} errors`);
}

// FIXED: Send message to specific driver - NOW USING MAP
export function sendToDriver(driverId: number, message: any, eventType: string = 'message') {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(message)}\n\n`;
  
  const connection = driverConnections.get(driverId);
  
  if (connection) {
    try {
      connection.writer.write(connection.encoder.encode(payload));
      connection.lastActivity = Date.now();
      console.log(`✅ Message sent to driver ${driverId}`);
      return true;
    } catch (err) {
      console.error(`❌ Error sending to driver ${driverId}:`, err);
      removeConnection(connection);
      return false;
    }
  } else {
    console.log(`⚠️ Driver ${driverId} not connected for message`);
    return false;
  }
}

// FIXED: Send message to specific customer - NOW USING MAP
export function sendToCustomer(customerId: number, message: any, eventType: string = 'message') {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(message)}\n\n`;
  
  const connection = customerConnections.get(customerId);
  
  if (connection) {
    try {
      connection.writer.write(connection.encoder.encode(payload));
      connection.lastActivity = Date.now();
      console.log(`✅ Message sent to customer ${customerId}`);
      return true;
    } catch (err) {
      console.error(`❌ Error sending to customer ${customerId}:`, err);
      removeConnection(connection);
      return false;
    }
  } else {
    console.log(`⚠️ Customer ${customerId} not connected for message`);
    return false;
  }
}

// FIXED: Clean up stale connections - MORE AGGRESSIVE
export function cleanupStaleConnections() {
  const initialCount = activeConnections.size;
  const now = Date.now();
  
  // Remove connections that haven't had activity in the last 2 minutes
  const staleConnections = Array.from(activeConnections).filter(conn => {
    return conn.lastActivity && (now - conn.lastActivity) > 2 * 60 * 1000; // 2 minutes
  });
  
  staleConnections.forEach(conn => {
    console.log(`🧹 Removing stale connection: ${conn.type} ${conn.driverId || conn.customerId}`);
    removeConnection(conn);
  });
  
  console.log(`🧹 Connection cleanup: ${initialCount} -> ${activeConnections.size} connections`);
  
  return {
    before: initialCount,
    after: activeConnections.size,
    removed: initialCount - activeConnections.size
  };
}

// FIXED: Get connection statistics - NOW USING MAPS
export function getConnectionStats() {
  return {
    total: activeConnections.size,
    drivers: driverConnections.size,
    customers: customerConnections.size,
    driverIds: Array.from(driverConnections.keys()),
    customerIds: Array.from(customerConnections.keys())
  };
}

// NEW: Add this function to monitor connections periodically
export function logActiveConnections() {
  console.log('=== ACTIVE CONNECTIONS DEBUG ===');
  console.log(`Total connections: ${activeConnections.size}`);
  
  const connectionsArray = Array.from(activeConnections);
  connectionsArray.forEach((conn, index) => {
    console.log(`${index + 1}. Type: ${conn.type}, DriverID: ${conn.driverId}, CustomerID: ${conn.customerId}`);
  });
  
  console.log(`Drivers: ${driverConnections.size}, Customers: ${customerConnections.size}`);
  console.log('=================================');
}

// NEW: Update connection activity timestamp
export function updateConnectionActivity(connection: Connection) {
  connection.lastActivity = Date.now();
}

// Call this every 30 seconds to monitor connections
setInterval(logActiveConnections, 30000);

// Call this every minute to clean up stale connections
setInterval(cleanupStaleConnections, 60000);