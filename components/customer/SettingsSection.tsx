// app/customer/customer-dashboard/components/SettingsSection.tsx
export default function SettingsSection() {
  return (
    <div className="h-full">
      <h2 className="text-xl lg:text-2xl font-bold text-purple-400 mb-4 lg:mb-6">Settings</h2>
      
      <div className="space-y-4 lg:space-y-6">
        <div className="bg-gray-900 p-4 lg:p-6 rounded-xl lg:rounded-2xl shadow-lg">
          <h3 className="text-lg lg:text-xl font-semibold mb-3 lg:mb-4">Account Settings</h3>
          <div className="space-y-3 lg:space-y-4">
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-300 mb-1 lg:mb-2">Full Name</label>
              <input 
                type="text" 
                defaultValue="John Doe" 
                className="w-full px-3 lg:px-4 py-2 lg:py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm lg:text-base"
              />
            </div>
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-300 mb-1 lg:mb-2">Phone Number</label>
              <input 
                type="tel" 
                defaultValue="+263 77 123 4567" 
                className="w-full px-3 lg:px-4 py-2 lg:py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm lg:text-base"
              />
            </div>
            <div>
              <label className="block text-sm lg:text-base font-medium text-gray-300 mb-1 lg:mb-2">Email Address</label>
              <input 
                type="email" 
                defaultValue="john.doe@example.com" 
                className="w-full px-3 lg:px-4 py-2 lg:py-3 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm lg:text-base"
              />
            </div>
          </div>
        </div>

        <div className="bg-gray-900 p-4 lg:p-6 rounded-xl lg:rounded-2xl shadow-lg">
          <h3 className="text-lg lg:text-xl font-semibold mb-3 lg:mb-4">Notification Preferences</h3>
          <div className="space-y-2 lg:space-y-3">
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="rounded bg-gray-800 border-gray-700 text-purple-600 focus:ring-purple-500 w-4 h-4 lg:w-5 lg:h-5" defaultChecked />
              <span className="text-sm lg:text-base">Order Updates</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="rounded bg-gray-800 border-gray-700 text-purple-600 focus:ring-purple-500 w-4 h-4 lg:w-5 lg:h-5" defaultChecked />
              <span className="text-sm lg:text-base">Promotional Offers</span>
            </label>
            <label className="flex items-center space-x-3">
              <input type="checkbox" className="rounded bg-gray-800 border-gray-700 text-purple-600 focus:ring-purple-500 w-4 h-4 lg:w-5 lg:h-5" />
              <span className="text-sm lg:text-base">Newsletter</span>
            </label>
          </div>
        </div>

        <button className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 lg:py-4 px-4 rounded-lg transition-all duration-300 text-sm lg:text-base">
          Save Changes
        </button>
      </div>
    </div>
  );
}