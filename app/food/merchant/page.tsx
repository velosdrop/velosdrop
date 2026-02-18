import Link from 'next/link';
import { Store, TrendingUp, Users, CreditCard, Clock, Shield, ArrowRight, CheckCircle2, ShoppingBag, Sparkles, Zap, BarChart3 } from 'lucide-react';

export default function MerchantLandingPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-white selection:bg-purple-500/30">
      {/* Navigation - Clean & Minimal */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/[0.03] bg-black/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
              V
            </div>
            <span className="tracking-tight">VelosDrop<span className="text-purple-500">Food</span></span>
          </Link>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-400">
            <Link href="#benefits" className="hover:text-white transition-colors">Benefits</Link>
            <Link href="#how-it-works" className="hover:text-white transition-colors">How it Works</Link>
            <Link href="/food/merchant/login" className="hover:text-white transition-colors">Merchant Login</Link>
            <Link 
              href="/food/merchant/registration" 
              className="bg-white text-black px-5 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all hover:scale-105"
            >
              Join Now
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
        {/* Background Glow */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full" />
          <div className="absolute bottom-0 right-[-5%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-semibold uppercase tracking-wider mb-6">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500" />
              </span>
              Now onboarding in Zimbabwe
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]">
              Turn Your Store Into{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-purple-300">
                a Revenue Machine
              </span>
            </h1>
            
            <p className="text-gray-400 text-lg lg:text-xl mb-10 max-w-xl leading-relaxed">
              Join hundreds of local restaurants and shops already growing with VelosDrop. Zero upfront costs, instant payouts, and more customers daily.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link 
                href="/restaurant/register" 
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-purple-600 rounded-2xl font-semibold text-lg hover:bg-purple-500 transition-all group shadow-xl shadow-purple-600/20"
              >
                Register Your Business
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              
              <div className="flex items-center gap-4 px-6 text-sm text-gray-500">
                <div className="flex -space-x-3">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-gradient-to-br from-gray-700 to-gray-800" />
                  ))}
                </div>
                <span className="text-gray-400">500+ local partners</span>
              </div>
            </div>
          </div>

          {/* Dashboard Preview */}
          <div className="relative lg:block">
            <div className="relative z-10 bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden group hover:border-purple-500/50 transition-all">
              <div className="absolute inset-0 bg-purple-600/5 group-hover:bg-purple-600/10 transition-colors" />
              
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="text-sm font-medium text-gray-400">Today's Performance</div>
                  <div className="flex items-center gap-1 text-xs bg-purple-500/10 text-purple-400 px-2 py-1 rounded-full">
                    <Sparkles className="w-3 h-3" />
                    Live
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="text-xs text-gray-500 mb-1">Orders</div>
                    <div className="text-2xl font-bold">147</div>
                    <div className="text-xs text-green-400">↑ 23%</div>
                  </div>
                  <div className="bg-white/5 rounded-xl p-4">
                    <div className="text-xs text-gray-500 mb-1">Revenue</div>
                    <div className="text-2xl font-bold">$2,845</div>
                    <div className="text-xs text-green-400">↑ 18%</div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-purple-600/10 rounded-xl border border-purple-500/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-5 h-5 text-purple-400" />
                    <span className="text-sm font-medium">Next payout</span>
                  </div>
                  <span className="text-sm font-bold">Tomorrow</span>
                </div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -top-4 -right-4 w-24 h-24 bg-purple-600/20 blur-2xl rounded-full -z-10" />
            <div className="absolute -bottom-4 -left-4 w-32 h-32 bg-blue-600/10 blur-2xl rounded-full -z-10" />
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="border-y border-white/[0.03] bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: "Commission", value: "15%", sub: "flat rate" },
            { label: "Active Users", value: "50k+", sub: "monthly" },
            { label: "Avg Growth", value: "3.2x", sub: "revenue boost" },
            { label: "Payouts", value: "Instant", sub: "next day" }
          ].map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-2xl lg:text-3xl font-bold text-white mb-1">{stat.value}</div>
              <div className="text-xs text-gray-500 uppercase tracking-wider">{stat.label}</div>
              <div className="text-xs text-gray-600 mt-1">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features Grid */}
      <section id="benefits" className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold mb-4">Everything You Need to Scale</h2>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Powerful tools designed to help you grow, whether you're a small cafe or a growing chain.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <Zap className="w-6 h-6 text-purple-400" />,
              title: "Lightning Fast Setup",
              description: "Get your store online in under 15 minutes. No technical skills required."
            },
            {
              icon: <BarChart3 className="w-6 h-6 text-blue-400" />,
              title: "Real-time Analytics",
              description: "Track orders, revenue, and customer behavior as it happens."
            },
            {
              icon: <CreditCard className="w-6 h-6 text-green-400" />,
              title: "Next-day Payouts",
              description: "Keep your cash flow healthy with fast, reliable settlements."
            },
            {
              icon: <Users className="w-6 h-6 text-orange-400" />,
              title: "Customer Insights",
              description: "Understand who's ordering and what they love most."
            },
            {
              icon: <Shield className="w-6 h-6 text-purple-400" />,
              title: "Delivery Protection",
              description: "Every order insured and tracked from kitchen to door."
            },
            {
              icon: <Store className="w-6 h-6 text-pink-400" />,
              title: "Multi-location Support",
              description: "Manage all your branches from a single dashboard."
            }
          ].map((feature, i) => (
            <div 
              key={i}
              className="group bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 hover:border-purple-500/30 hover:bg-white/[0.04] transition-all"
            >
              <div className="bg-white/[0.05] w-12 h-12 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works - Simplified */}
      <section id="how-it-works" className="bg-white/[0.02] py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl lg:text-4xl font-bold mb-4">Three Steps to More Sales</h2>
            <p className="text-gray-400">Getting started takes less time than your lunch break.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create Account", desc: "Fill in your basic details. Takes 5 minutes." },
              { step: "02", title: "Add Your Menu", desc: "Upload photos and prices. We'll help format it." },
              { step: "03", title: "Start Selling", desc: "Go live and receive orders immediately." }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="text-5xl font-black text-purple-500/20 mb-4">{item.step}</div>
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-gray-500 text-sm">{item.desc}</p>
                {i < 2 && <div className="hidden md:block text-purple-500/30 mt-4">→</div>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA - Clean */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-4xl lg:text-5xl font-bold mb-6 tracking-tight">
            Ready to grow your business?
          </h2>
          <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
            Join the 500+ merchants already earning more with VelosDrop. No hidden fees, no long-term contracts.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link 
              href="/restaurant/register" 
              className="px-10 py-4 bg-purple-600 rounded-xl font-semibold text-lg hover:bg-purple-500 transition-all shadow-xl shadow-purple-600/20 inline-flex items-center justify-center gap-2"
            >
              Get Started Free
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link 
              href="/restaurant/login" 
              className="px-10 py-4 border border-white/10 rounded-xl font-semibold text-lg hover:bg-white/5 transition-colors"
            >
              Merchant Login
            </Link>
          </div>
          
          <p className="text-xs text-gray-600 mt-8">
            By signing up, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.03] py-8 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4 text-sm">
          <div className="font-semibold tracking-tight">VelosDrop<span className="text-purple-500">Business</span></div>
          <div className="text-gray-600">© 2025 VelosDrop. All rights reserved.</div>
          <div className="flex gap-6">
            <Link href="#" className="text-gray-500 hover:text-white transition-colors">Privacy</Link>
            <Link href="#" className="text-gray-500 hover:text-white transition-colors">Terms</Link>
            <Link href="#" className="text-gray-500 hover:text-white transition-colors">Support</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}