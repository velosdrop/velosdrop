//app/page.tsx
import Services from "@/components/Services";
import Features from "@/components/Features";
import Guide from "@/components/HowItWorks";
import Hero from "@/components/Hero";
import Footer from "@/components/Footer";


export default function Home() {
  return (
    <>
      <Hero />
      <Services />
      <Guide />
      <Features />
      <Footer /> 
    </>
  )
}