import React from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout';
import { EnvelopeSimple, ArrowLeft, PaperPlaneTilt, Sparkle } from '@phosphor-icons/react';

const CheckEmail: React.FC = () => {
  const testimonial = (
    <div className="bg-surface border border-border rounded-xl p-6 relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-black font-bold">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M21 12C21 16.9706 16.9706 21 12 21H3V3H12C16.9706 3 21 7.02944 21 12Z" fill="black" />
            <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" fill="white" />
          </svg>
        </div>
        <div>
          <div className="font-semibold text-textMain">Deepgram</div>
          <div className="text-sm text-textMuted">@DeepgramAI</div>
        </div>
      </div>
      <p className="text-textMain text-sm leading-relaxed mb-4">
        <span className="text-primary">@Cally_AI</span> thank you for making my end to end journey easier by:
      </p>
      <ul className="text-textMain text-sm leading-relaxed space-y-2 mb-4">
        <li>1. Optimizing streaming and colocating servers that shave off every possible millisecond of latency</li>
        <li>2. Customizing by allowing to connect to WebRTC stream through Web, iOS and Python clients</li>
        <li>3. Easy Scaling</li>
      </ul>
    </div>
  );

  return (
    <AuthLayout testimonial={testimonial}>
      <div className="bg-surface/50 border border-border rounded-2xl p-8 backdrop-blur-xl text-center relative overflow-hidden">
        {/* Ambient glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/10">
              <EnvelopeSimple size={40} weight="duotone" className="text-primary" />
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2 mb-2">
            <Sparkle size={16} weight="fill" className="text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wider">Almost there!</span>
            <Sparkle size={16} weight="fill" className="text-primary" />
          </div>
          
          <h2 className="text-2xl font-bold text-textMain mb-4">Check your email</h2>
          <p className="text-textMuted text-sm mb-8 leading-relaxed">
            We've sent a verification link to your email address.<br />
            Please click the link to verify your account and access the dashboard.
          </p>

          <div className="space-y-4">
            <Link 
              to="/login" 
              className="group flex items-center justify-center gap-2 w-full bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg hover:shadow-primary/25 text-black font-semibold py-3 rounded-xl transition-all duration-300"
            >
              <ArrowLeft size={18} weight="bold" />
              Back to Sign In
            </Link>
            
            <button className="group flex items-center justify-center gap-2 w-full bg-surface border border-border hover:border-primary/30 text-textMain font-medium py-3 rounded-xl transition-all duration-200">
              <PaperPlaneTilt size={18} weight="duotone" className="text-primary" />
              Resend verification email
            </button>
            
            <p className="text-xs text-textMuted">
              Didn't receive the email? Check your spam folder or try resending.
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default CheckEmail;
