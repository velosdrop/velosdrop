// app/customer/customer-dashboard/components/OrdersSection.tsx
export default function OrdersSection() {
  const orders = [
    { id: 1, status: "Delivered", date: "2023-10-15", price: "$12.50" },
    { id: 2, status: "In Transit", date: "2023-10-16", price: "$18.75" },
    { id: 3, status: "Processing", date: "2023-10-17", price: "$9.99" },
  ];

  return (
    <div className="h-full">
      <h2 className="text-xl lg:text-2xl font-bold text-purple-400 mb-4 lg:mb-6">Your Orders</h2>
      <div className="grid gap-3 lg:gap-4">
        {orders.map((order) => (
          <div key={order.id} className="bg-gray-900 p-4 lg:p-6 rounded-xl lg:rounded-2xl border border-purple-900/50 shadow-lg">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center space-y-3 lg:space-y-0">
              <div className="flex-1">
                <h3 className="font-semibold text-base lg:text-lg">Order #{order.id}</h3>
                <p className="text-sm text-gray-400 mt-1">{order.date}</p>
              </div>
              <div className="flex flex-col lg:items-end space-y-2">
                <span className={`px-3 py-1 rounded-full text-xs lg:text-sm font-medium ${
                  order.status === "Delivered" 
                    ? "bg-green-900/50 text-green-400 border border-green-700/30" 
                    : order.status === "In Transit"
                    ? "bg-yellow-900/50 text-yellow-400 border border-yellow-700/30"
                    : "bg-blue-900/50 text-blue-400 border border-blue-700/30"
                }`}>
                  {order.status}
                </span>
                <p className="font-bold text-base lg:text-lg">{order.price}</p>
              </div>
            </div>
            <button className="mt-4 w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white py-2 lg:py-3 rounded-lg transition-all duration-300 font-medium text-sm lg:text-base">
              View Details
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}