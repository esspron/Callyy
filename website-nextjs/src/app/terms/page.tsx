import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service | Voicory',
  description: 'Terms of Service for Voicory AI Voice Calling Platform',
}

export default function TermsOfServicePage() {
  return (
    <main className="min-h-screen bg-background text-textMain py-24">
      <div className="max-w-4xl mx-auto px-6 md:px-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">Terms of Service</h1>
        <p className="text-textMuted mb-8">Last updated: January 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Acceptance of Terms</h2>
            <p className="text-textMuted leading-relaxed">
              By accessing or using Voicory&apos;s AI voice calling platform (&quot;Service&quot;), 
              you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not 
              agree to these Terms, you may not use the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Description of Service</h2>
            <p className="text-textMuted leading-relaxed">
              Voicory provides an AI-powered voice calling platform that enables businesses 
              to automate phone calls and conversations. The Service includes:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>AI voice agents for inbound and outbound calls</li>
              <li>Multi-language support (15+ Indian languages)</li>
              <li>Call analytics and transcription</li>
              <li>CRM integrations and API access</li>
              <li>Voice cloning technology</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Account Registration</h2>
            <p className="text-textMuted leading-relaxed">
              To use the Service, you must:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>Be at least 18 years of age</li>
              <li>Provide accurate and complete registration information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Notify us immediately of any unauthorized access</li>
              <li>Be responsible for all activities under your account</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Acceptable Use Policy</h2>
            <p className="text-textMuted leading-relaxed mb-4">
              You agree NOT to use the Service for:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4">
              <li>Illegal activities or promoting illegal activities</li>
              <li>Harassment, threats, or abusive communications</li>
              <li>Spam, unsolicited marketing, or robocalling without consent</li>
              <li>Impersonating individuals or organizations</li>
              <li>Fraud, phishing, or deceptive practices</li>
              <li>Violating telecommunications regulations (TRAI, TCPA, etc.)</li>
              <li>Collecting sensitive personal information without proper consent</li>
              <li>Any activity that could harm minors</li>
            </ul>
            <p className="text-textMuted leading-relaxed mt-4">
              Violation of these policies may result in immediate account termination 
              without refund.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Compliance Requirements</h2>
            <p className="text-textMuted leading-relaxed">
              You are responsible for ensuring your use of the Service complies with:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>TRAI regulations for telemarketing in India</li>
              <li>DND (Do Not Disturb) registry compliance</li>
              <li>Applicable data protection laws (IT Act, GDPR if applicable)</li>
              <li>Call recording consent requirements</li>
              <li>Industry-specific regulations (healthcare, finance, etc.)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Pricing and Payment</h2>
            <h3 className="text-xl font-medium mb-3">6.1 Subscription Plans</h3>
            <p className="text-textMuted leading-relaxed">
              We offer monthly and annual subscription plans. Prices are displayed in 
              Indian Rupees (INR) and are subject to applicable taxes (GST at 18%).
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">6.2 Payment Processing</h3>
            <p className="text-textMuted leading-relaxed">
              Payments are processed securely through Razorpay and Stripe. We accept 
              credit cards, debit cards, UPI, net banking, and international cards.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">6.3 Billing Cycle</h3>
            <p className="text-textMuted leading-relaxed">
              Subscriptions are billed in advance on a monthly or annual basis. 
              Usage-based charges (extra minutes) are billed at the end of each cycle.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Free Trial</h2>
            <p className="text-textMuted leading-relaxed">
              We offer a 14-day free trial for new users. The trial includes:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>100 minutes of call time</li>
              <li>Access to all features</li>
              <li>No credit card required</li>
            </ul>
            <p className="text-textMuted leading-relaxed mt-4">
              At the end of the trial, you must upgrade to a paid plan to continue using 
              the Service. Trial abuse (creating multiple accounts) is prohibited.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Cancellation and Refunds</h2>
            <p className="text-textMuted leading-relaxed">
              Please refer to our <a href="/refund" className="text-primary hover:underline">Refund Policy</a> for 
              detailed information on cancellations and refunds.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Intellectual Property</h2>
            <h3 className="text-xl font-medium mb-3">9.1 Our IP</h3>
            <p className="text-textMuted leading-relaxed">
              The Service, including its AI technology, voice models, software, and 
              content, is owned by Voicory and protected by intellectual property laws.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">9.2 Your Content</h3>
            <p className="text-textMuted leading-relaxed">
              You retain ownership of your call scripts, configurations, and data. 
              You grant us a license to use this content to provide the Service.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">9.3 Voice Cloning</h3>
            <p className="text-textMuted leading-relaxed">
              You represent that you have the rights to any voice samples you submit 
              for cloning. You may not clone voices without proper authorization.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Data and Privacy</h2>
            <p className="text-textMuted leading-relaxed">
              Your use of the Service is also governed by our <a href="/privacy" className="text-primary hover:underline">Privacy Policy</a>, 
              which describes how we collect, use, and protect your data.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Service Level Agreement</h2>
            <p className="text-textMuted leading-relaxed">
              We strive for 99.9% uptime for our Service. Scheduled maintenance will 
              be communicated in advance. Enterprise customers may have custom SLAs.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">12. Limitation of Liability</h2>
            <p className="text-textMuted leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY LAW, VOICORY SHALL NOT BE LIABLE FOR:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>Indirect, incidental, special, or consequential damages</li>
              <li>Loss of profits, revenue, or data</li>
              <li>Business interruption</li>
              <li>Actions of third parties</li>
            </ul>
            <p className="text-textMuted leading-relaxed mt-4">
              Our total liability shall not exceed the amount paid by you in the 
              12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">13. Indemnification</h2>
            <p className="text-textMuted leading-relaxed">
              You agree to indemnify and hold harmless Voicory from any claims, damages, 
              or expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">14. Termination</h2>
            <p className="text-textMuted leading-relaxed">
              We may suspend or terminate your account if you violate these Terms. 
              Upon termination, your right to use the Service ceases immediately. 
              You may request data export within 30 days of termination.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">15. Governing Law</h2>
            <p className="text-textMuted leading-relaxed">
              These Terms are governed by the laws of India. Any disputes shall be 
              resolved in the courts of Bengaluru, Karnataka.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">16. Changes to Terms</h2>
            <p className="text-textMuted leading-relaxed">
              We may update these Terms periodically. Material changes will be 
              communicated via email or through the Service. Continued use after 
              changes constitutes acceptance.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">17. Contact</h2>
            <div className="mt-4 bg-surface border border-border rounded-xl p-6">
              <p className="text-textMuted">
                <strong className="text-textMain">Email:</strong> legal@voicory.com
              </p>
              <p className="text-textMuted mt-2">
                <strong className="text-textMain">Address:</strong> Voicory Technologies Pvt. Ltd.<br />
                Bengaluru, Karnataka, India
              </p>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
