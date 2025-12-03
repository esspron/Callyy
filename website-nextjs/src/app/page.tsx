import { HeroSection } from '@/components/sections/HeroSection'
import { DemoSection } from '@/components/sections/DemoSection'
import { LanguageSection } from '@/components/sections/LanguageSection'
import { CustomizationSection } from '@/components/sections/CustomizationSection'
import { PricingSection } from '@/components/sections/PricingSection'
import { Footer } from '@/components/Footer'
import { Navbar } from '@/components/Navbar'

export default function Home() {
  return (
    <main className="min-h-screen bg-background text-textMain overflow-hidden">
      <Navbar />
      <HeroSection />
      <DemoSection />
      <LanguageSection />
      <CustomizationSection />
      <PricingSection />
      <Footer />
    </main>
  )
}
