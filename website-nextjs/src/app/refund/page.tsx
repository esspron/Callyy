import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Refund Policy | Voicory',
  description: 'Refund and Cancellation Policy for Voicory AI Voice Calling Platform',
}

export default function RefundPolicyPage() {
  return (
    <main className="min-h-screen bg-background text-textMain py-24">
      <div className="max-w-4xl mx-auto px-6 md:px-8">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">Refund & Cancellation Policy</h1>
        <p className="text-textMuted mb-8">Last updated: January 2025</p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Overview</h2>
            <p className="text-textMuted leading-relaxed">
              At Voicory, we want you to be completely satisfied with our AI voice calling 
              platform. This policy outlines our refund and cancellation procedures.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">2. Free Trial</h2>
            <p className="text-textMuted leading-relaxed">
              We offer a 14-day free trial with 100 minutes of call time. No credit card 
              is required to start the trial. This allows you to fully evaluate our 
              Service before committing to a paid plan.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">3. Subscription Cancellation</h2>
            <h3 className="text-xl font-medium mb-3">3.1 Monthly Plans</h3>
            <p className="text-textMuted leading-relaxed">
              You may cancel your monthly subscription at any time. Your cancellation 
              will take effect at the end of the current billing cycle. You will continue 
              to have access to the Service until that date.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">3.2 Annual Plans</h3>
            <p className="text-textMuted leading-relaxed">
              Annual plans can be cancelled at any time. However, refunds for annual 
              plans are subject to the refund eligibility criteria below.
            </p>

            <h3 className="text-xl font-medium mb-3 mt-6">3.3 How to Cancel</h3>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4">
              <li>Log into your Voicory dashboard</li>
              <li>Navigate to Settings → Billing</li>
              <li>Click &quot;Cancel Subscription&quot;</li>
              <li>Confirm your cancellation</li>
            </ul>
            <p className="text-textMuted leading-relaxed mt-4">
              Alternatively, email us at billing@voicory.com with your cancellation request.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">4. Refund Eligibility</h2>
            
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-medium mb-3 text-primary">Full Refund (Within 7 Days)</h3>
              <p className="text-textMuted leading-relaxed">
                If you are not satisfied with our Service, you may request a full refund 
                within 7 days of your first paid subscription. This applies to both monthly 
                and annual plans.
              </p>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6 mb-6">
              <h3 className="text-xl font-medium mb-3">Partial Refund (Annual Plans Only)</h3>
              <p className="text-textMuted leading-relaxed">
                For annual plans cancelled after 7 days but within 30 days:
              </p>
              <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
                <li>Refund = Total paid - (Monthly rate × months used) - 10% admin fee</li>
                <li>Minimum usage period: 1 month</li>
              </ul>
            </div>

            <div className="bg-surface border border-border rounded-xl p-6">
              <h3 className="text-xl font-medium mb-3">No Refund</h3>
              <p className="text-textMuted leading-relaxed">
                Refunds are NOT available for:
              </p>
              <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
                <li>Cancellations after 30 days</li>
                <li>Usage-based charges (extra minutes consumed)</li>
                <li>Add-on purchases (voice cloning, integrations)</li>
                <li>Accounts terminated for Terms of Service violations</li>
                <li>Partial months of service</li>
              </ul>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">5. Refund Process</h2>
            <h3 className="text-xl font-medium mb-3">5.1 Request Submission</h3>
            <p className="text-textMuted leading-relaxed">
              To request a refund, email billing@voicory.com with:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>Your registered email address</li>
              <li>Reason for refund request</li>
              <li>Order/Transaction ID (if available)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">5.2 Processing Time</h3>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4">
              <li>Refund requests are reviewed within 3 business days</li>
              <li>Approved refunds are processed within 5-7 business days</li>
              <li>Credit card refunds may take 5-10 additional days to appear</li>
              <li>UPI/Net banking refunds are typically faster (2-3 days)</li>
            </ul>

            <h3 className="text-xl font-medium mb-3 mt-6">5.3 Refund Method</h3>
            <p className="text-textMuted leading-relaxed">
              Refunds are issued to the original payment method used for the purchase. 
              We cannot refund to a different payment method or account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">6. Service Credits</h2>
            <p className="text-textMuted leading-relaxed">
              In some cases, we may offer service credits instead of monetary refunds. 
              Service credits:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>Are applied to your account immediately</li>
              <li>Can be used for future subscription payments or add-ons</li>
              <li>Expire after 12 months if unused</li>
              <li>Are non-transferable and non-refundable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">7. Downgrade Policy</h2>
            <p className="text-textMuted leading-relaxed">
              You may downgrade your plan at any time:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>Downgrade takes effect at the next billing cycle</li>
              <li>No prorated refunds for the current cycle</li>
              <li>Unused minutes do not carry over to lower plans</li>
              <li>Features not included in the lower plan will be disabled</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">8. Upgrade Policy</h2>
            <p className="text-textMuted leading-relaxed">
              When upgrading your plan:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>Upgrade takes effect immediately</li>
              <li>You are charged the prorated difference for the current cycle</li>
              <li>New features are available immediately</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">9. Disputed Charges</h2>
            <p className="text-textMuted leading-relaxed">
              If you believe you were incorrectly charged:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>Contact us at billing@voicory.com within 30 days</li>
              <li>Provide transaction details and reason for dispute</li>
              <li>We will investigate and respond within 5 business days</li>
            </ul>
            <p className="text-textMuted leading-relaxed mt-4">
              Please contact us before initiating a chargeback with your bank. 
              Chargebacks may result in account suspension and additional fees.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">10. Special Circumstances</h2>
            <p className="text-textMuted leading-relaxed">
              We may offer refunds outside of this policy in special circumstances:
            </p>
            <ul className="list-disc list-inside text-textMuted space-y-2 ml-4 mt-3">
              <li>Extended service outages (beyond SLA guarantees)</li>
              <li>Critical bugs affecting core functionality</li>
              <li>Billing errors on our part</li>
              <li>Death of the account holder (with documentation)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">11. Contact Us</h2>
            <p className="text-textMuted leading-relaxed mb-4">
              For billing inquiries, refund requests, or questions about this policy:
            </p>
            <div className="bg-surface border border-border rounded-xl p-6">
              <p className="text-textMuted">
                <strong className="text-textMain">Email:</strong> billing@voicory.com
              </p>
              <p className="text-textMuted mt-2">
                <strong className="text-textMain">Response Time:</strong> Within 24 hours (business days)
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
