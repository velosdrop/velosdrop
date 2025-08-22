// app/customer/customer-dashboard/components/OrdersSection.tsx
export default function OrdersSection() {
    const orders = [
      { id: 1, status: "Delivered", date: "2023-10-15", price: "$12.50" },
      { id: 2, status: "In Transit", date: "2023-10-16", price: "$18.75" },
      { id: 3, status: "Processing", date: "2023-10-17", price: "$9.99" },
    ];
  
    return (
      <div className="h-full">
        <h2 className="text-2xl font-bold text-purple-400 mb-6">Your Orders</h2>
        <div className="grid gap-4">
          {orders.map((order) => (
            <div key={order.id} className="bg-gray-900 p-4 rounded-lg border border-purple-900/50">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-semibold">Order #{order.id}</h3>
                  <p className="text-sm text-gray-400">{order.date}</p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    order.status === "Delivered" 
                      ? "bg-green-900/50 text-green-400" 
                      : order.status === "In Transit"
                      ? "bg-yellow-900/50 text-yellow-400"
                      : "bg-blue-900/50 text-blue-400"
                  }`}>
                    {order.status}
                  </span>
                  <p className="font-bold mt-1">{order.price}</p>
                </div>
              </div>
              <button className="mt-3 w-full bg-purple-900 hover:bg-purple-800 text-white py-2 rounded-lg transition-colors">
                View Details
              </button>
            </div>
          ))}
        </div>
      </div>
    );
  }