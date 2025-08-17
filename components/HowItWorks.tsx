import Image from 'next/image'

const HowItWorks = () => {
  return (
    <section className="flexCenter flex-col bg-dark-950 py-20">
      <div className="padding-container max-container w-full">
        <div className="text-center mb-16">
          <h2 className="bold-40 lg:bold-64 text-white mb-4">
            How VelosDrop Works
          </h2>
          <p className="regular-18 text-gray-400 max-w-3xl mx-auto">
            Fast, reliable deliveries in just 3 simple steps
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            {
              icon: 'request.svg',
              title: '1. Request Delivery',
              description: 'Tell us what you need delivered and where',
              highlight: 'Takes 30 seconds'
            },
            {
              icon: '/drivertaxi.svg',
              title: '2. Driver Assigned',
              description: 'We match you with the perfect vehicle for your items',
              highlight: 'Average 2 minute wait'
            },
            {
              icon: 'location.svg',
              title: '3. Track & Receive',
              description: 'Follow your delivery in real-time until it arrives',
              highlight: 'Live GPS tracking'
            }
          ].map((step, index) => (
            <div 
              key={index}
              className="group bg-gray-900 p-8 rounded-2xl border border-gray-800 hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
            >
              <div className="flex flex-col h-full">
                <div className="bg-purple-600/20 p-4 rounded-xl w-16 h-16 flex items-center justify-center mb-6 group-hover:bg-purple-500/30 transition-colors">
                  <Image 
                    src={step.icon} 
                    alt={step.title} 
                    width={32} 
                    height={32}
                    className="text-purple-400"
                  />
                </div>
                <h3 className="bold-24 text-white mb-3">{step.title}</h3>
                <p className="regular-16 text-gray-300 mb-4 flex-grow">{step.description}</p>
                <p className="regular-14 text-purple-400 mt-auto">
                  {step.highlight}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <button className="bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-full px-8 py-3 transition-colors">
            Download the App
          </button>
          <p className="regular-14 text-gray-500 mt-4">
            Available on iOS and Android
          </p>
        </div>
      </div>
    </section>
  )
}

export default HowItWorks