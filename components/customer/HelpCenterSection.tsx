// app/customer/customer-dashboard/components/HelpCenterSection.tsx
export default function HelpCenterSection() {
    const faqs = [
      {
        question: "How do I track my delivery?",
        answer: "You can track your delivery in real-time from the Orders section of your dashboard."
      },
      {
        question: "What areas do you serve?",
        answer: "We currently serve all major urban areas in Zimbabwe. Check our coverage map for details."
      },
      {
        question: "How do I pay for deliveries?",
        answer: "You can pay using your wallet balance, mobile money, or cash on delivery."
      }
    ];
  
    return (
      <div className="h-full">
        <h2 className="text-2xl font-bold text-purple-400 mb-6">Help Center</h2>
        
        <div className="bg-gray-900 p-6 rounded-xl mb-6">
          <h3 className="text-lg font-semibold mb-4">Get Help Quickly</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="bg-purple-900 hover:bg-purple-800 text-white py-3 rounded-lg transition-colors">
              Live Chat
            </button>
            <button className="bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors">
              Call Support
            </button>
            <button className="bg-gray-800 hover:bg-gray-700 text-white py-3 rounded-lg transition-colors">
              Email Us
            </button>
          </div>
        </div>
  
        <h3 className="text-lg font-semibold mb-4">Frequently Asked Questions</h3>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-gray-900 p-4 rounded-lg">
              <h4 className="font-semibold text-purple-300">{faq.question}</h4>
              <p className="mt-2 text-gray-400">{faq.answer}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }