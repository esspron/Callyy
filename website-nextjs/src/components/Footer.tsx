'use client'

import Link from 'next/link'
import { 
  GithubLogo, 
  LinkedinLogo, 
  TwitterLogo, 
  EnvelopeSimple,
  Phone,
  MapPin 
} from '@phosphor-icons/react'

export function Footer() {
  const currentYear = new Date().getFullYear()

  const footerLinks = {
    product: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '#pricing' },
      { label: 'Demo', href: '#demo' },
      { label: 'Voice Library', href: '/voices' },
    ],
    company: [
      { label: 'About Us', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Blog', href: '/blog' },
      { label: 'Contact', href: '/contact' },
    ],
    legal: [
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Terms of Service', href: '/terms' },
      { label: 'Refund Policy', href: '/refund' },
      { label: 'Cookie Policy', href: '/cookies' },
    ],
    resources: [
      { label: 'Documentation', href: '/docs' },
      { label: 'API Reference', href: '/docs/api' },
      { label: 'Status', href: 'https://status.voicory.com' },
      { label: 'Support', href: '/support' },
    ],
  }

  return (
    <footer className="bg-surface border-t border-border">
      <div className="max-w-7xl mx-auto px-6 py-16">
        {/* Main Footer Content */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8 mb-12">
          {/* Brand Column */}
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
                <span className="text-background font-bold text-xl">V</span>
              </div>
              <span className="text-xl font-bold text-textMain">Voicory</span>
            </Link>
            <p className="text-textMuted text-sm mb-6 max-w-xs">
              Build intelligent voice AI agents that speak Hindi, English, and 10+ Indian languages.
            </p>
            
            {/* Contact Info */}
            <div className="space-y-2 text-sm text-textMuted">
              <div className="flex items-center gap-2">
                <EnvelopeSimple size={16} />
                <a href="mailto:hello@voicory.com" className="hover:text-primary transition-colors">
                  hello@voicory.com
                </a>
              </div>
              <div className="flex items-center gap-2">
                <Phone size={16} />
                <a href="tel:+919876543210" className="hover:text-primary transition-colors">
                  +91 98765 43210
                </a>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={16} />
                <span>Mumbai, India</span>
              </div>
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="text-textMain font-semibold mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-textMuted hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="text-textMain font-semibold mb-4">Company</h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-textMuted hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources Links */}
          <div>
            <h4 className="text-textMain font-semibold mb-4">Resources</h4>
            <ul className="space-y-3">
              {footerLinks.resources.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-textMuted hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="text-textMain font-semibold mb-4">Legal</h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-textMuted hover:text-primary transition-colors text-sm">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-textMuted text-sm">
            © {currentYear} Voicory. All rights reserved.
          </p>
          
          {/* Social Links */}
          <div className="flex items-center gap-4">
            <a
              href="https://twitter.com/voicory"
              target="_blank"
              rel="noopener noreferrer"
              className="text-textMuted hover:text-primary transition-colors"
            >
              <TwitterLogo size={20} weight="fill" />
            </a>
            <a
              href="https://linkedin.com/company/voicory"
              target="_blank"
              rel="noopener noreferrer"
              className="text-textMuted hover:text-primary transition-colors"
            >
              <LinkedinLogo size={20} weight="fill" />
            </a>
            <a
              href="https://github.com/voicory"
              target="_blank"
              rel="noopener noreferrer"
              className="text-textMuted hover:text-primary transition-colors"
            >
              <GithubLogo size={20} weight="fill" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
