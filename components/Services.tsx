import Image from "next/image";

const Services = () => {
  const deliveryVehicles = [
    { 
      type: "Motorcycle", 
      icon: "motorcycle.svg", 
      capacity: "Small packages (up to 5kg)",
      description: "Fastest option for small urgent deliveries"
    },
    { 
      type: "Car", 
      icon: "car.svg", 
      capacity: "Medium packages (up to 25kg)",
      description: "Standard deliveries with climate control"
    },
    { 
      type: "Van", 
      icon: "van.svg", 
      capacity: "Large items (up to 500kg)",
      description: "Furniture, appliances, and bulk items"
    },
    { 
      type: "Truck", 
      icon: "truck.svg", 
      capacity: "Heavy freight (500kg+)",
      description: "Commercial and industrial deliveries"
    }
  ];

  return (
    <section className="padding-container py-20 bg-dark-950">
      <h2 className="bold-40 text-center text-white mb-6">Our Delivery Fleet</h2>
      <p className="regular-16 text-gray-400 text-center max-w-2xl mx-auto mb-10">
        We have the right vehicle for every delivery need
      </p>
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 max-container">
        {deliveryVehicles.map((vehicle, index) => (
          <div 
            key={index} 
            className="bg-gray-900 rounded-xl p-6 border border-gray-800 hover:border-purple-500 transition-colors"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-purple-600/20 rounded-lg">
                <Image 
                  src={vehicle.icon} 
                  alt={vehicle.type} 
                  width={32} 
                  height={32}
                />
              </div>
              <h3 className="bold-20 text-white">{vehicle.type}</h3>
            </div>
            <p className="medium-16 text-purple-300 mb-1">{vehicle.capacity}</p>
            <p className="regular-14 text-gray-400">{vehicle.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
};

export default Services;