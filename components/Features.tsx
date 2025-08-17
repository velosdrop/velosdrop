import { FEATURES } from '@/constants'
import Image from 'next/image'

interface FeatureItemProps {
  title: string;
  icon: string;
  description: string;
}

const FeatureItem = ({ title, icon, description }: FeatureItemProps) => {
  return (
    <div className="group bg-gray-900 p-8 rounded-xl border border-gray-800 hover:border-purple-500 transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10">
      <div className="flex flex-col h-full">
        <div className="bg-purple-600/20 p-4 rounded-xl w-16 h-16 flex items-center justify-center mb-6 group-hover:bg-purple-500/30 transition-colors">
          <Image 
            src={icon} 
            alt={title} 
            width={32} 
            height={32}
            className="text-purple-400"
          />
        </div>
        <h3 className="bold-24 text-white mb-3">{title}</h3>
        <p className="regular-16 text-gray-300">{description}</p>
      </div>
    </div>
  )
}

const Features = () => {
  return (
    <section className="padding-container py-20 bg-dark-950">
      <div className="max-container">
        <div className="text-center mb-16">
          <h2 className="bold-40 lg:bold-64 text-white mb-4">
            Why Choose VelosDrop
          </h2>
          <p className="regular-18 text-gray-400 max-w-3xl mx-auto">
            Premium delivery services designed for your convenience
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {FEATURES.map((feature) => (
            <FeatureItem 
              key={feature.title}
              title={feature.title} 
              icon={feature.icon}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default Features