// app/customer/customer-dashboard/components/WalletSection.tsx
export default function WalletSection() {
    return (
      <div className="h-full">
        <h2 className="text-2xl font-bold text-purple-400 mb-6">Your Wallet</h2>
        
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 p-6 rounded-xl mb-6">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-gray-400">Current Balance</p>
              <h3 className="text-3xl font-bold">$45.75</h3>
            </div>
            <div className="text-4xl">💳</div>
          </div>
        </div>
  
        <div className="grid grid-cols-2 gap-4 mb-6">
          <button className="bg-purple-900 hover:bg-purple-800 text-white py-3 rounded-lg transition-colors">
            Add Funds
          </button>
          <button className="bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors">
            Withdraw
          </button>
        </div>
  
        <h4 className="text-lg font-semibold mb-4">Recent Transactions</h4>
        <div className="space-y-3">
          {[
            { type: "Top-up", amount: "+$20.00", date: "Oct 15", time: "10:30 AM" },
            { type: "Delivery Payment", amount: "-$12.50", date: "Oct 14", time: "02:15 PM" },
            { type: "Top-up", amount: "+$30.00", date: "Oct 12", time: "09:45 AM" },
          ].map((transaction, index) => (
            <div key={index} className="flex justify-between items-center bg-gray-900 p-3 rounded-lg">
              <div>
                <p className="font-medium">{transaction.type}</p>
                <p className="text-sm text-gray-400">{transaction.date} · {transaction.time}</p>
              </div>
              <span className={transaction.amount.startsWith("+") ? "text-green-400 font-bold" : "text-red-400 font-bold"}>
                {transaction.amount}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }