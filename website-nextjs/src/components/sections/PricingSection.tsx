'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  Check, 
  Lightning, 
  Star, 
  Rocket,
  Phone,
  ChatCircle,
  HeadsetIcon,
  Crown
} from '@phosphor-icons/react'

interface PricingPlan {
  id: string
  name: string
  description: string
  price: number
  yearlyPrice?: number
  currency: string
  period: string
  icon: React.ElementType
  features: string[]
  popular?: boolean
  cta: string
  ctaLink: string
}

const plans: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for small businesses getting started',
    price: 2999,
    yearlyPrice: 29990,
    currency: '₹',
    period: '/month',
    icon: Phone,
    features: [
      '500 minutes/month',
      '2 AI agents',
      'Hindi + English',
      'Basic analytics',
      'Email support',
      'API access',
    ],
    cta: 'Start Free Trial',
    ctaLink: 'https://app.voicory.com/signup?plan=starter',
  },
  {
    id: 'growth',
    name: 'Growth',
    description: 'For growing teams with higher volume',
    price: 9999,
    yearlyPrice: 99990,
    currency: '₹',
    period: '/month',
    icon: Rocket,
    popular: true,
    features: [
      '2,500 minutes/month',
      '10 AI agents',
      'All 15 languages',
      'Advanced analytics',
      'Priority support',
      'Voice cloning',
      'CRM integrations',
      'Webhook support',
    ],
    cta: 'Start Free Trial',
    ctaLink: 'https://app.voicory.com/signup?plan=growth',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for large organizations',
    price: 0,
    currency: '',
    period: '',
    icon: Crown,
    features: [
      'Unlimited minutes',
      'Unlimited agents',
      'All languages + custom',
      'Dedicated account manager',
      '24/7 phone support',
      'Custom voice training',
      'On-premise deployment',
      'SLA guarantee',
      'Custom integrations',
    ],
    cta: 'Contact Sales',
    ctaLink: 'https://app.voicory.com/contact-sales',
  },
]

const addons = [
  { name: 'Extra Minutes', price: '₹0.80/min' },
  { name: 'Additional Agent', price: '₹499/month' },
  { name: 'WhatsApp Integration', price: '₹1,999/month' },
  { name: 'Custom Voice Clone', price: '₹4,999 one-time' },
]

export function PricingSection() {
  const [isYearly, setIsYearly] = useState(false)

  return (
    <section id="pricing" className="w-full max-w-7xl mx-auto px-6 md:px-8 py-24">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
          <Star size={16} weight="fill" />
          Simple Pricing
        </span>
        <h2 className="text-4xl md:text-5xl font-bold mb-4">
          Choose Your Plan
        </h2>
        <p className="text-textMuted text-lg max-w-2xl mx-auto">
          Start with a 14-day free trial. No credit card required. 
          Cancel anytime.
        </p>

        {/* Billing Toggle */}
        <div className="flex items-center justify-center gap-4 mt-8">
          <span className={`text-sm ${!isYearly ? 'text-textMain' : 'text-textMuted'}`}>
            Monthly
          </span>
          <button
            onClick={() => setIsYearly(!isYearly)}
            className={`relative w-14 h-7 rounded-full transition-colors ${
              isYearly ? 'bg-primary' : 'bg-surface'
            }`}
          >
            <div
              className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform ${
                isYearly ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
          <span className={`text-sm ${isYearly ? 'text-textMain' : 'text-textMuted'}`}>
            Yearly
            <span className="ml-1 text-primary font-medium">(-17%)</span>
          </span>
        </div>
      </motion.div>

      {/* Pricing Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
        {plans.map((plan, index) => {
          const displayPrice = isYearly && plan.yearlyPrice 
            ? Math.round(plan.yearlyPrice / 12) 
            : plan.price

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 * index }}
              className={`relative bg-surface border rounded-3xl p-8 ${
                plan.popular 
                  ? 'border-primary ring-2 ring-primary/20' 
                  : 'border-border'
              }`}
            >
              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-background px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Most Popular
                  </span>
                </div>
              )}

              {/* Plan Header */}
              <div className="mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                  <plan.icon size={24} weight="duotone" className="text-primary" />
                </div>
                <h3 className="text-2xl font-bold">{plan.name}</h3>
                <p className="text-textMuted text-sm mt-1">{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                {plan.price === 0 ? (
                  <div className="text-3xl font-bold">Custom</div>
                ) : (
                  <div className="flex items-baseline gap-1">
                    <span className="text-textMuted">{plan.currency}</span>
                    <span className="text-4xl font-bold">{displayPrice.toLocaleString('en-IN')}</span>
                    <span className="text-textMuted">{plan.period}</span>
                  </div>
                )}
                {isYearly && plan.yearlyPrice && (
                  <div className="text-sm text-primary mt-1">
                    Billed ₹{plan.yearlyPrice.toLocaleString('en-IN')}/year
                  </div>
                )}
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check size={20} weight="bold" className="text-primary flex-shrink-0 mt-0.5" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <a
                href={plan.ctaLink}
                className={`block text-center py-3 px-6 rounded-xl font-semibold transition-all ${
                  plan.popular
                    ? 'bg-primary text-background hover:bg-primaryHover'
                    : 'bg-surface border border-border hover:border-primary/50'
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          )
        })}
      </div>

      {/* Add-ons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="bg-surface/50 border border-border rounded-2xl p-8"
      >
        <h3 className="text-lg font-semibold mb-6 text-center">Add-ons & Extras</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {addons.map((addon) => (
            <div key={addon.name} className="text-center p-4 bg-background/50 rounded-xl">
              <div className="text-sm text-textMuted mb-1">{addon.name}</div>
              <div className="font-semibold text-primary">{addon.price}</div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Trust Badges */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-12 text-center"
      >
        <div className="flex flex-wrap items-center justify-center gap-8 text-textMuted text-sm">
          <div className="flex items-center gap-2">
            <Check size={18} weight="bold" className="text-primary" />
            <span>14-day free trial</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={18} weight="bold" className="text-primary" />
            <span>No credit card required</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={18} weight="bold" className="text-primary" />
            <span>Cancel anytime</span>
          </div>
          <div className="flex items-center gap-2">
            <Check size={18} weight="bold" className="text-primary" />
            <span>GST invoice available</span>
          </div>
        </div>
      </motion.div>
    </section>
  )
}
