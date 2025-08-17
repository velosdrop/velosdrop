import { FOOTER_CONTACT_INFO, SOCIALS } from '@/constants'
import Image from 'next/image'
import Link from 'next/link'

const Footer = () => {
  return (
    <footer className="flexCenter py-16 bg-dark-950">
      <div className="padding-container max-container flex w-full flex-col gap-14">
        <div className="flex flex-col items-start justify-center gap-[10%] md:flex-row">
          <Link href="/" className="mb-10">
            <h2 className="bold-24 text-purple-500 hover:text-purple-400 transition-colors">VelosDrop</h2>
          </Link>

          <div className='grid grid-cols-2 md:grid-cols-4 gap-10 w-full'>
            {/* Company Column */}
            <div className="flex flex-col gap-5">
              <FooterColumn title="Company">
                <ul className="regular-14 flex flex-col gap-3 text-gray-300">
                  <li><Link href="/about" className="hover:text-purple-400 transition-colors">About Us</Link></li>
                  <li><Link href="/careers" className="hover:text-purple-400 transition-colors">Careers</Link></li>
                  <li><Link href="/blog" className="hover:text-purple-400 transition-colors">Blog</Link></li>
                </ul>
              </FooterColumn>
            </div>

            {/* Customer Services Column */}
            <div className="flex flex-col gap-5">
              <FooterColumn title="Customer Services">
                <ul className="regular-14 flex flex-col gap-3 text-gray-300">
                  <ServiceItem name="Instant Courier" desc="Docs & small packages" href="/instant-courier" />
                  <ServiceItem name="Groceries/Medicines" desc="1-hour delivery" href="/groceries" />
                  <ServiceItem name="Food Delivery" desc="24/7 restaurant meals" href="/food-delivery" />
                  <ServiceItem name="Furniture Moving" desc="With assembly help" href="/furniture" />
                </ul>
              </FooterColumn>
            </div>

            {/* Driver Services Column */}
            <div className="flex flex-col gap-5">
              <FooterColumn title="For Drivers">
                <ul className="regular-14 flex flex-col gap-3 text-gray-300">
                  <ServiceItem name="Flexible Earnings" desc="Choose your jobs" href="/driver-signup" />
                  <ServiceItem name="Instant Payouts" desc="Cash out daily" href="/driver-payouts" />
                  <ServiceItem name="Bulk Orders" desc="Multiple deliveries" href="/driver-bulk" />
                  <ServiceItem name="Priority Jobs" desc="Higher fees" href="/driver-priority" />
                </ul>
              </FooterColumn>
            </div>

            {/* Contact & Social Column */}
            <div className="flex flex-col gap-5">
              <FooterColumn title={FOOTER_CONTACT_INFO.title}>
                <ul className="regular-14 flex flex-col gap-3 text-gray-300">
                  {FOOTER_CONTACT_INFO.links.map((link) => (
                    <li key={link.label}>
                      <Link href="/contact" className="hover:text-purple-400 transition-colors">
                        <span className="text-gray-400">{link.label}: </span>
                        <span className="text-purple-400">{link.value}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </FooterColumn>
              
              <FooterColumn title={SOCIALS.title}>
                <div className="flex gap-3">
                  {SOCIALS.links.map((link) => (
                    <SocialIcon key={link} src={link} />
                  ))}
                </div>
              </FooterColumn>
            </div>
          </div>
        </div>

        <div className="border border-gray-800" />
        <p className="regular-14 w-full text-center text-gray-400">
          © {new Date().getFullYear()} VelosDrop | All rights reserved
        </p>
      </div>
    </footer>
  )
}

// Reusable Components
const ServiceItem = ({ name, desc, href }: { name: string; desc: string; href: string }) => (
  <li className="flex items-start gap-2">
    <span className="text-purple-400 mt-1">•</span>
    <Link href={href} className="hover:text-purple-400 transition-colors">
      {name} <span className="text-gray-500 block regular-12">{desc}</span>
    </Link>
  </li>
)

const SocialIcon = ({ src }: { src: string }) => (
  <Link href="#" className="p-2 bg-gray-800 rounded-full hover:bg-purple-500/20 transition-colors">
    <Image 
      src={src} 
      alt="social icon" 
      width={20} 
      height={20} 
      className="filter brightness-0 invert-[0.8] hover:invert-0 transition-all"
    />
  </Link>
)

type FooterColumnProps = {
  title: string;
  children: React.ReactNode;
}

const FooterColumn = ({ title, children }: FooterColumnProps) => (
  <div className="flex flex-col gap-4">
    <h4 className="bold-18 text-white">{title}</h4>
    {children}
  </div>
)

export default Footer