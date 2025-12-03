import { Metadata } from 'next'
import Link from 'next/link'
import { Navbar } from '@/components/Navbar'
import { Footer } from '@/components/Footer'
import { 
  Calendar, 
  Brain, 
  Gear, 
  Phone, 
  Lightning, 
  ArrowRight,
  Plugs
} from '@phosphor-icons/react/dist/ssr'

export const metadata: Metadata = {
  title: 'Integrations | Voicory - Voice AI Agents',
  description: 'Connect Voicory with your favorite tools. Integrate with CRMs, calendars, payment systems, and more.',
}

const integrations = [
  {
    name: 'Cal.com',
    description: 'Automated appointment scheduling and calendar management.',
    category: 'Calendar',
    icon: Calendar,
    color: 'from-blue-500/20 to-cyan-500/20',
    slug: 'cal.com',
  },
  {
    name: 'Custom LLM',
    description: 'Bring your own language model for specialized use cases.',
    category: 'AI',
    icon: Brain,
    color: 'from-purple-500/20 to-pink-500/20',
    slug: 'custom-llm',
  },
  {
    name: 'Make',
    description: 'Automate workflows and connect with 1000+ apps.',
    category: 'Automation',
    icon: Gear,
    color: 'from-orange-500/20 to-red-500/20',
    slug: 'make',
  },
  {
    name: 'Twilio',
    description: 'Use your existing Twilio phone numbers and infrastructure.',
    category: 'Telephony',
    icon: Phone,
    color: 'from-red-500/20 to-pink-500/20',
    slug: 'twillio',
  },
  {
    name: 'Vonage',
    description: 'Enterprise-grade voice and messaging integration.',
    category: 'Telephony',
    icon: Phone,
    color: 'from-green-500/20 to-emerald-500/20',
    slug: 'vonage',
  },
  {
    name: 'n8n',
    description: 'Open-source workflow automation for technical teams.',
    category: 'Automation',
    icon: Lightning,
    color: 'from-yellow-500/20 to-orange-500/20',
    slug: 'n8n',
  },
  {
    name: 'Go High Level',
    description: 'All-in-one CRM and marketing automation platform.',
    category: 'CRM',
    icon: Plugs,
    color: 'from-indigo-500/20 to-purple-500/20',
    slug: 'go-high-level',
  },
]

const categories = ['All', 'Calendar', 'AI', 'Automation', 'Telephony', 'CRM']

export default function IntegrationsPage() {
  return (
    <div className="min-h-screen bg-background text-textMain overflow-hidden flex flex-col">
      <Navbar />
      
      <main className="flex-1 relative pt-20">
        {/* Background Effect */}
        <div className="absolute inset-0 z-[-1] opacity-30 pointer-events-none">
          <div 
            className="absolute inset-0"
            style={{
              backgroundImage: 'radial-gradient(circle, rgba(46, 199, 183, 0.15) 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
        </div>

        {/* Header */}
        <section className="relative flex w-full flex-col gap-8 pt-14 text-center md:pt-24 px-6">
          <div className="inline-block mx-auto rounded-full border border-white/20 bg-white/5 backdrop-blur-sm px-4 py-1.5 text-sm text-textMain">
            <Plugs size={16} className="inline mr-2" />
            Integrations
          </div>

          <h1 className="px-6 text-balance text-4xl leading-tight tracking-tight md:text-6xl md:leading-tight font-bold max-w-4xl mx-auto">
            Connect with <br />
            <span className="gradient-text">Your Favorite Tools</span>
          </h1>

          <p className="text-textMuted text-lg max-w-2xl mx-auto leading-relaxed">
            Seamlessly integrate Voicory with your existing tech stack. 
            CRMs, calendars, automation tools, and more.
          </p>
        </section>

        {/* Category Filters */}
        <section className="max-w-7xl mx-auto px-6 md:px-8 py-12">
          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <button
                key={category}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  category === 'All'
                    ? 'bg-primary text-background'
                    : 'bg-surface border border-border text-textMuted hover:text-textMain hover:border-primary/50'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </section>

        {/* Integrations Grid */}
        <section className="max-w-7xl mx-auto px-6 md:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {integrations.map((integration) => {
              const Icon = integration.icon
              return (
                <Link
                  key={integration.slug}
                  href={`/solutions/integration/${integration.slug}`}
                  className="group relative bg-surface border border-border rounded-3xl p-8 overflow-hidden hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
                >
                  {/* Gradient Background */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${integration.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                  
                  {/* Content */}
                  <div className="relative z-10">
                    <div className="flex items-start justify-between mb-6">
                      <div className="w-14 h-14 bg-surfaceHover rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <Icon size={28} weight="duotone" className="text-primary" />
                      </div>
                      <span className="text-xs text-textMuted bg-background/50 px-3 py-1 rounded-full">
                        {integration.category}
                      </span>
                    </div>
                    
                    <h3 className="text-xl font-bold mb-3">{integration.name}</h3>
                    <p className="text-textMuted text-sm leading-relaxed mb-4">
                      {integration.description}
                    </p>
                    
                    <div className="flex items-center text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Learn more
                      <ArrowRight size={16} className="ml-1" />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* Request Integration Section */}
        <section className="max-w-7xl mx-auto px-6 md:px-8 py-16">
          <div className="bg-surface border border-border rounded-3xl p-12 text-center relative overflow-hidden">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[400px] h-[200px] bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
            
            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Don&apos;t See Your Tool?
              </h2>
              <p className="text-textMuted text-lg max-w-2xl mx-auto mb-8">
                We&apos;re constantly adding new integrations. Let us know what you need!
              </p>
              <Link 
                href="/contact"
                className="inline-flex items-center gap-2 bg-primary hover:bg-primaryHover text-background font-bold py-4 px-8 rounded-xl transition-all duration-300 hover:-translate-y-0.5"
              >
                Request Integration
                <ArrowRight size={20} />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
