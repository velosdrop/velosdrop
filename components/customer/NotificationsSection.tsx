// app/customer/customer-dashboard/components/NotificationsSection.tsx
export default function NotificationsSection() {
    const notifications = [
      { id: 1, title: "Order Delivered", message: "Your order #1234 has been successfully delivered.", time: "2 hours ago", read: false },
      { id: 2, title: "Promotion", message: "Special offer: 20% off your next delivery. Use code SAVE20.", time: "1 day ago", read: true },
      { id: 3, title: "Wallet Top-up", message: "Your wallet has been credited with $20.00.", time: "2 days ago", read: true },
    ];
  
    return (
      <div className="h-full">
        <h2 className="text-2xl font-bold text-purple-400 mb-6">Notifications</h2>
        
        <div className="space-y-4">
          {notifications.map((notification) => (
            <div key={notification.id} className={`bg-gray-900 p-4 rounded-lg border ${notification.read ? "border-gray-800" : "border-purple-900"}`}>
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{notification.title}</h3>
                  <p className="text-gray-400 mt-1">{notification.message}</p>
                  <p className="text-sm text-gray-500 mt-2">{notification.time}</p>
                </div>
                {!notification.read && (
                  <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }