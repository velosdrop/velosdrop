// app/customer/customer-dashboard/components/NotificationsSection.tsx
export default function NotificationsSection() {
  const notifications = [
    { id: 1, title: "Order Delivered", message: "Your order #1234 has been successfully delivered.", time: "2 hours ago", read: false },
    { id: 2, title: "Promotion", message: "Special offer: 20% off your next delivery. Use code SAVE20.", time: "1 day ago", read: true },
    { id: 3, title: "New Feature", message: "Track your delivery in real-time with our new map feature.", time: "2 days ago", read: true },
  ];

  return (
    <div className="h-full">
      <h2 className="text-xl lg:text-2xl font-bold text-purple-400 mb-4 lg:mb-6">Notifications</h2>
      
      <div className="space-y-3 lg:space-y-4">
        {notifications.map((notification) => (
          <div key={notification.id} className={`bg-gray-900 p-4 lg:p-6 rounded-xl lg:rounded-2xl border shadow-lg ${
            notification.read ? "border-gray-800" : "border-purple-900"
          }`}>
            <div className="flex justify-between items-start space-x-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-base lg:text-lg truncate">{notification.title}</h3>
                  {!notification.read && (
                    <span className="w-2 h-2 lg:w-3 lg:h-3 bg-purple-500 rounded-full flex-shrink-0"></span>
                  )}
                </div>
                <p className="text-gray-400 text-sm lg:text-base leading-relaxed">{notification.message}</p>
                <p className="text-xs lg:text-sm text-gray-500 mt-2 lg:mt-3">{notification.time}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}