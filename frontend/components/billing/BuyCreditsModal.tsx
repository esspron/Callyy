import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, CreditCard, Lightning, Check, CircleNotch, CurrencyInr, Warning, Sparkle, CaretRight } from '@phosphor-icons/react';
import { 
    CREDIT_PACKAGES, 
    PAYMENT_PROVIDERS, 
    openRazorpayCheckout,
    createStripePaymentIntent,
    getStripe,
    PaymentResult,
    CreditPackage,
    validateCoupon,
    applyDiscount,
    Coupon
} from '../../services/paymentService';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

interface BuyCreditsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (result: PaymentResult) => void;
    currentBalance: number;
}

// Stripe Checkout Form Component
const StripeCheckoutForm: React.FC<{
    onSuccess: (result: PaymentResult) => void;
    onError: (error: string) => void;
    amount: number;
    credits: number;
}> = ({ onSuccess, onError, amount, credits }) => {
    const stripe = useStripe();
    const elements = useElements();
    const [isProcessing, setIsProcessing] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        setIsProcessing(true);

        const { error, paymentIntent } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: window.location.origin + '/billing?payment=success',
            },
            redirect: 'if_required'
        });

        if (error) {
            onError(error.message || 'Payment failed');
            setIsProcessing(false);
        } else if (paymentIntent && paymentIntent.status === 'succeeded') {
            onSuccess({
                success: true,
                transactionId: paymentIntent.id,
                credits: credits
            });
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <PaymentElement 
                options={{
                    layout: 'tabs'
                }}
            />
            <button
                type="submit"
                disabled={!stripe || isProcessing}
                className="w-full py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isProcessing ? (
                    <>
                        <CircleNotch size={20} className="animate-spin" />
                        Processing...
                    </>
                ) : (
                    <>
                        <CreditCard size={20} weight="bold" />
                        Pay ${(amount / 100).toFixed(2)}
                    </>
                )}
            </button>
        </form>
    );
};

const BuyCreditsModal: React.FC<BuyCreditsModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
    currentBalance
}) => {
    const [step, setStep] = useState<'packages' | 'payment' | 'processing' | 'success'>('packages');
    const [selectedPackage, setSelectedPackage] = useState<CreditPackage | null>(null);
    const [selectedProvider, setSelectedProvider] = useState<'stripe' | 'razorpay'>('razorpay');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [paymentResult, setPaymentResult] = useState<PaymentResult | null>(null);
    
    // Stripe state
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    
    // Coupon state
    const [couponCode, setCouponCode] = useState('');
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState<string | null>(null);

    // Reset state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setStep('packages');
            setSelectedPackage(null);
            setError(null);
            setPaymentResult(null);
            setClientSecret(null);
            setCouponCode('');
            setAppliedCoupon(null);
            setCouponError(null);
        }
    }, [isOpen]);

    const handlePackageSelect = (pkg: CreditPackage) => {
        setSelectedPackage(pkg);
        setError(null);
    };

    const handleApplyCoupon = async () => {
        if (!couponCode.trim()) return;
        
        setCouponLoading(true);
        setCouponError(null);
        
        const coupon = await validateCoupon(couponCode);
        
        if (coupon) {
            setAppliedCoupon(coupon);
        } else {
            setCouponError('Invalid or expired coupon code');
        }
        
        setCouponLoading(false);
    };

    const getDiscountedPrice = (price: number): number => {
        if (!appliedCoupon) return price;
        return applyDiscount(price, appliedCoupon);
    };

    const handleProceedToPayment = async () => {
        if (!selectedPackage) return;
        
        setIsLoading(true);
        setError(null);

        if (selectedProvider === 'razorpay') {
            // Use Razorpay
            openRazorpayCheckout(
                selectedPackage.id,
                (result) => {
                    setPaymentResult(result);
                    setStep('success');
                    setIsLoading(false);
                },
                (err) => {
                    setError(err);
                    setIsLoading(false);
                }
            );
        } else {
            // Use Stripe
            try {
                const intent = await createStripePaymentIntent(selectedPackage.id, 'USD');
                if (intent) {
                    setClientSecret(intent.clientSecret);
                    setStep('payment');
                } else {
                    setError('Failed to initialize payment');
                }
            } catch (err: any) {
                setError(err.message || 'Failed to initialize payment');
            }
            setIsLoading(false);
        }
    };

    const handleStripeSuccess = (result: PaymentResult) => {
        setPaymentResult(result);
        setStep('success');
        onSuccess(result);
    };

    const handleStripeError = (errorMsg: string) => {
        setError(errorMsg);
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            {/* Modal */}
            <div className="relative bg-surface border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
                {/* Ambient glow */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/10 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-primary/5 blur-3xl pointer-events-none" />
                
                {/* Header */}
                <div className="relative flex items-center justify-between p-6 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                            <Lightning size={24} weight="fill" className="text-primary" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-textMain">Buy Credits</h2>
                            <p className="text-sm text-textMuted">Current balance: ₹{currentBalance.toFixed(2)}</p>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-lg transition-colors"
                    >
                        <X size={20} className="text-textMuted" />
                    </button>
                </div>

                {/* Content */}
                <div className="relative p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-3">
                            <Warning size={20} weight="fill" className="text-red-400" />
                            <p className="text-sm text-red-400">{error}</p>
                        </div>
                    )}

                    {/* Step: Select Package */}
                    {step === 'packages' && (
                        <div className="space-y-6">
                            {/* Credit Packages Grid */}
                            <div>
                                <h3 className="text-sm font-medium text-textMuted mb-4">Select a credit package</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                    {CREDIT_PACKAGES.map((pkg) => (
                                        <button
                                            key={pkg.id}
                                            onClick={() => handlePackageSelect(pkg)}
                                            className={`relative p-4 rounded-xl border transition-all duration-200 text-left ${
                                                selectedPackage?.id === pkg.id
                                                    ? 'bg-primary/10 border-primary/30 shadow-lg shadow-primary/10'
                                                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05] hover:border-white/10'
                                            }`}
                                        >
                                            {pkg.popular && (
                                                <div className="absolute -top-2 -right-2 px-2 py-0.5 bg-primary text-black text-[10px] font-bold rounded-full flex items-center gap-1">
                                                    <Sparkle size={10} weight="fill" />
                                                    POPULAR
                                                </div>
                                            )}
                                            {pkg.savings && (
                                                <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-medium rounded">
                                                    {pkg.savings}
                                                </div>
                                            )}
                                            <div className="text-2xl font-bold text-textMain mb-1">
                                                {pkg.credits.toLocaleString()}
                                            </div>
                                            <div className="text-xs text-textMuted mb-2">credits</div>
                                            <div className="flex items-center gap-1">
                                                <CurrencyInr size={14} className="text-primary" />
                                                <span className="text-lg font-semibold text-primary">
                                                    {appliedCoupon ? getDiscountedPrice(pkg.priceINR).toFixed(0) : pkg.priceINR}
                                                </span>
                                                {appliedCoupon && (
                                                    <span className="text-xs text-textMuted line-through ml-1">₹{pkg.priceINR}</span>
                                                )}
                                            </div>
                                            {selectedPackage?.id === pkg.id && (
                                                <div className="absolute top-2 left-2">
                                                    <Check size={16} weight="bold" className="text-primary" />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Coupon Code */}
                            <div>
                                <h3 className="text-sm font-medium text-textMuted mb-2">Have a coupon?</h3>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                                        placeholder="Enter coupon code"
                                        className="flex-1 bg-background border border-white/10 rounded-xl px-4 py-2.5 text-sm text-textMain outline-none focus:border-primary placeholder:text-textMuted/50"
                                    />
                                    <button
                                        onClick={handleApplyCoupon}
                                        disabled={!couponCode.trim() || couponLoading}
                                        className="px-4 py-2.5 bg-surface border border-white/10 text-textMain text-sm font-medium rounded-xl hover:bg-surfaceHover transition-colors disabled:opacity-50"
                                    >
                                        {couponLoading ? <CircleNotch size={16} className="animate-spin" /> : 'Apply'}
                                    </button>
                                </div>
                                {couponError && (
                                    <p className="text-xs text-red-400 mt-1">{couponError}</p>
                                )}
                                {appliedCoupon && (
                                    <div className="mt-2 p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                                        <span className="text-xs text-emerald-400">
                                            Coupon applied: {appliedCoupon.discountPercent}% off
                                        </span>
                                        <button 
                                            onClick={() => setAppliedCoupon(null)}
                                            className="text-xs text-textMuted hover:text-textMain"
                                        >
                                            Remove
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Payment Provider Selection */}
                            <div>
                                <h3 className="text-sm font-medium text-textMuted mb-3">Payment method</h3>
                                <div className="flex gap-3">
                                    {PAYMENT_PROVIDERS.map((provider) => (
                                        <button
                                            key={provider.id}
                                            onClick={() => setSelectedProvider(provider.id)}
                                            disabled={!provider.available}
                                            className={`flex-1 p-4 rounded-xl border transition-all duration-200 ${
                                                selectedProvider === provider.id
                                                    ? 'bg-primary/10 border-primary/30'
                                                    : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                                            } ${!provider.available ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{provider.icon}</span>
                                                <div className="text-left">
                                                    <div className="text-sm font-medium text-textMain">{provider.name}</div>
                                                    <div className="text-xs text-textMuted">{provider.description}</div>
                                                </div>
                                            </div>
                                            {selectedProvider === provider.id && (
                                                <Check size={16} weight="bold" className="text-primary absolute top-2 right-2" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step: Stripe Payment Form */}
                    {step === 'payment' && clientSecret && (
                        <div className="space-y-6">
                            <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-textMuted">Package</span>
                                    <span className="text-sm font-medium text-textMain">{selectedPackage?.name}</span>
                                </div>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-sm text-textMuted">Credits</span>
                                    <span className="text-sm font-medium text-textMain">{selectedPackage?.credits.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between pt-2 border-t border-white/5">
                                    <span className="text-sm font-medium text-textMain">Total</span>
                                    <span className="text-lg font-bold text-primary">${selectedPackage?.priceUSD.toFixed(2)}</span>
                                </div>
                            </div>

                            <Elements 
                                stripe={stripePromise} 
                                options={{ 
                                    clientSecret,
                                    appearance: {
                                        theme: 'night',
                                        variables: {
                                            colorPrimary: '#2EC7B7',
                                            colorBackground: '#1B1E23',
                                            colorText: '#EBEBEB',
                                            colorDanger: '#ef4444',
                                            borderRadius: '12px',
                                        }
                                    }
                                }}
                            >
                                <StripeCheckoutForm
                                    onSuccess={handleStripeSuccess}
                                    onError={handleStripeError}
                                    amount={Math.round((selectedPackage?.priceUSD || 0) * 100)}
                                    credits={selectedPackage?.credits || 0}
                                />
                            </Elements>

                            <button
                                onClick={() => setStep('packages')}
                                className="w-full text-center text-sm text-textMuted hover:text-textMain transition-colors"
                            >
                                ← Back to packages
                            </button>
                        </div>
                    )}

                    {/* Step: Success */}
                    {step === 'success' && paymentResult && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check size={32} weight="bold" className="text-emerald-400" />
                            </div>
                            <h3 className="text-xl font-bold text-textMain mb-2">Payment Successful!</h3>
                            <p className="text-textMuted mb-6">
                                {paymentResult.credits?.toLocaleString()} credits have been added to your account.
                            </p>
                            {paymentResult.newBalance !== undefined && (
                                <div className="p-4 bg-white/[0.02] border border-white/5 rounded-xl inline-block">
                                    <div className="text-sm text-textMuted mb-1">New Balance</div>
                                    <div className="flex items-center gap-1 justify-center">
                                        <CurrencyInr size={20} className="text-primary" />
                                        <span className="text-2xl font-bold text-primary">{paymentResult.newBalance.toFixed(2)}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="relative p-6 border-t border-white/5 bg-background/50">
                    {step === 'packages' && (
                        <div className="flex items-center justify-between">
                            <div>
                                {selectedPackage && (
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm text-textMuted">Selected:</span>
                                        <span className="text-sm font-medium text-textMain">
                                            {selectedPackage.credits.toLocaleString()} credits
                                        </span>
                                        <span className="text-sm text-primary font-semibold">
                                            ₹{appliedCoupon ? getDiscountedPrice(selectedPackage.priceINR).toFixed(0) : selectedPackage.priceINR}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <button
                                onClick={handleProceedToPayment}
                                disabled={!selectedPackage || isLoading}
                                className="px-6 py-2.5 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <CircleNotch size={18} className="animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        Proceed to Pay
                                        <CaretRight size={18} weight="bold" />
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {step === 'success' && (
                        <button
                            onClick={() => {
                                onSuccess(paymentResult!);
                                onClose();
                            }}
                            className="w-full py-3 bg-gradient-to-r from-primary to-primary/80 text-black font-semibold rounded-xl hover:shadow-lg hover:shadow-primary/25 transition-all duration-200"
                        >
                            Done
                        </button>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BuyCreditsModal;
