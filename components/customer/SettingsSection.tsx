// app/customer/customer-dashboard/components/SettingsSection.tsx
export default function SettingsSection() {
    return (
      <div className="h-full">
        <h2 className="text-2xl font-bold text-purple-400 mb-6">Settings</h2>
        
        <div className="space-y-6">
          <div className="bg-gray-900 p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-4">Account Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Full Name</label>
                <input 
                  type="text" 
                  defaultValue="John Doe" 
                  className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Phone Number</label>
                <input 
                  type="tel" 
                  defaultValue="+263 77 123 4567" 
                  className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
                <input 
                  type="email" 
                  defaultValue="john.doe@example.com" 
                  className="w-full px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-white focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
  
          <div className="bg-gray-900 p-6 rounded-xl">
            <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
            <div className="space-y-3">
              <label className="flex items-center">
                <input type="checkbox" className="rounded bg-gray-800 border-gray-700 text-purple-600 focus:ring-purple-500" defaultChecked />
                <span className="ml-2">Order Updates</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded bg-gray-800 border-gray-700 text-purple-600 focus:ring-purple-500" defaultChecked />
                <span className="ml-2">Promotional Offers</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded bg-gray-800 border-gray-700 text-purple-600 focus:ring-purple-500" />
                <span className="ml-2">Newsletter</span>
              </label>
            </div>
          </div>
  
          <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg transition-colors">
            Save Changes
          </button>
        </div>
      </div>
    );
  }