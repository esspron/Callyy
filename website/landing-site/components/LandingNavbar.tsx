import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, ArrowRight, ExternalLink } from 'lucide-react';

const LandingNavbar: React.FC = () => {
    const navigate = useNavigate();
    const [isSolutionsOpen, setIsSolutionsOpen] = useState(false);

    const industries = [
        "Healthcare", "Financial Services", "Insurance", "Logistics", 
        "Home Services", "Retail & Consumer", "Travel & Hospitality", "Debt Collection"
    ];

    const useCases = [
        "Lead Qualification", "AI Customer Service", "AI Receptionists", "Dispatch Service",
        "AI Answering Service", "AI IVR", "AI Appointment Setter", 
        "AI Telemarketing", "AI Call Center"
    ];

    const integrations = [
        "Cal.com", "Custom LLM", "Make", "Twillio", "Vonage", "n8n", "Go High Level"
    ];

    return (
        <header className="sticky top-0 border-b border-[#2D3139] z-50 bg-[#0E0E13]/90 backdrop-blur-sm">
            <div className="mx-auto max-w-[86rem] px-8">
                <nav className="flex h-16 items-center justify-between gap-5">
                    {/* Logo */}
                    <div className="relative">
                        <a className="relative w-fit shrink-0 cursor-pointer" href="/#/landing">
                            <div className="flex items-center gap-2">
                                <div className="text-2xl font-bold text-white">
                                    <span className="text-primary">Voicory</span>
                                </div>
                            </div>
                        </a>
                    </div>

                    {/* Navigation Links - Hidden on mobile */}
                    <ul className="hidden items-center gap-8 lg:flex font-mono text-xs leading-5 font-medium tracking-wider uppercase text-textMuted">
                        <li className="hover:text-textMain transition-colors duration-300">
                            <a className="py-5 px-4" href="/#/landing#features">Features</a>
                        </li>
                        <li className="hover:text-textMain transition-colors duration-300">
                            <a className="py-5 px-4" href="/#/landing#pricing">Pricing</a>
                        </li>
                        <li className="hover:text-textMain transition-colors duration-300">
                            <a className="py-5 px-4" href="/docs.html">
                                Docs
                                <svg className="inline h-3 w-3 ml-1 opacity-60" fill="none" viewBox="0 0 16 17" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12.3359 10.5007V3.83398H5.66927M4.33594 11.834L12.173 3.99695" stroke="currentColor" strokeLinecap="square" />
                                </svg>
                            </a>
                        </li>
                        
                        {/* Solutions Dropdown */}
                        <li 
                            className="relative group"
                            onMouseEnter={() => setIsSolutionsOpen(true)}
                            onMouseLeave={() => setIsSolutionsOpen(false)}
                        >
                            <button className="py-5 px-4 flex items-center gap-1 hover:text-textMain transition-colors duration-300 uppercase">
                                Solutions
                                <ChevronDown size={14} className={`transition-transform duration-200 ${isSolutionsOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            <div className={`absolute top-full left-1/2 -translate-x-1/2 w-[900px] bg-[#131319] border border-[#2D3139] rounded-2xl shadow-2xl p-6 transition-all duration-200 origin-top ${isSolutionsOpen ? 'opacity-100 scale-100 visible' : 'opacity-0 scale-95 invisible'}`}>
                                <div className="grid grid-cols-12 gap-8">
                                    {/* Left Cards */}
                                    <div className="col-span-3 flex flex-col gap-4">
                                        <div className="bg-[#1E1E24] p-4 rounded-xl border border-[#2D3139] hover:border-primary/50 transition-colors cursor-pointer group/card">
                                            <div className="w-10 h-10 bg-[#2D3139] rounded-lg flex items-center justify-center mb-3 group-hover/card:bg-primary/20 transition-colors">
                                                <span className="text-xl">🎓</span>
                                            </div>
                                            <h4 className="text-white font-bold mb-1 normal-case">Find A Certified Partner</h4>
                                            <p className="text-textMuted text-[10px] normal-case leading-relaxed">Don't know how to implement voice AI. Find a expert!</p>
                                        </div>
                                        <div className="bg-[#1E1E24] p-4 rounded-xl border border-[#2D3139] hover:border-primary/50 transition-colors cursor-pointer group/card">
                                            <div className="w-10 h-10 bg-[#2D3139] rounded-lg flex items-center justify-center mb-3 group-hover/card:bg-primary/20 transition-colors">
                                                <span className="text-xl">🤝</span>
                                            </div>
                                            <h4 className="text-white font-bold mb-1 normal-case">App Partners</h4>
                                            <p className="text-textMuted text-[10px] normal-case leading-relaxed">VOIP companies and voice AI platforms collaborate with Retell.</p>
                                        </div>
                                    </div>

                                    {/* Industries */}
                                    <div className="col-span-3">
                                        <h3 className="text-textMuted text-xs font-bold mb-4 tracking-widest">INDUSTRIES</h3>
                                        <ul className="space-y-3">
                                            {industries.map(item => (
                                                <li key={item}>
                                                    <a href={`/#/solutions/industry/${item.toLowerCase().replace(/ /g, '-')}`} className="text-white hover:text-primary text-sm normal-case block transition-colors">
                                                        {item}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Use Cases */}
                                    <div className="col-span-3">
                                        <h3 className="text-textMuted text-xs font-bold mb-4 tracking-widest">USE CASES</h3>
                                        <ul className="space-y-3">
                                            {useCases.map(item => (
                                                <li key={item}>
                                                    <a href={`/#/solutions/use-case/${item.toLowerCase().replace(/ /g, '-')}`} className="text-white hover:text-primary text-sm normal-case block transition-colors">
                                                        {item}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Integrations */}
                                    <div className="col-span-3">
                                        <h3 className="text-textMuted text-xs font-bold mb-4 tracking-widest">INTEGRATIONS</h3>
                                        <ul className="space-y-3 mb-4">
                                            {integrations.map(item => (
                                                <li key={item}>
                                                    <a href={`/#/solutions/integration/${item.toLowerCase().replace(/ /g, '-')}`} className="text-white hover:text-primary text-sm normal-case block transition-colors">
                                                        {item}
                                                    </a>
                                                </li>
                                            ))}
                                        </ul>
                                        <a href="/#/integrations" className="inline-flex items-center gap-1 text-xs border border-[#2D3139] rounded-lg px-3 py-2 text-white hover:bg-[#2D3139] transition-colors normal-case">
                                            See All Integrations
                                            <ArrowRight size={12} />
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </li>

                        <li className="hover:text-textMain transition-colors duration-300">
                            <a className="py-5 px-4" href="/#/landing#community">Community</a>
                        </li>
                    </ul>

                    {/* CTA Button */}
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => navigate('/')}
                            className="flex text-center justify-center items-center font-medium rounded-full transition-all duration-300 font-mono uppercase active:scale-95 bg-primary hover:bg-primaryHover text-[#0E0E13] h-9 px-4 py-2.5 gap-2 tracking-wider text-xs leading-5 shrink-0"
                        >
                            Open Dashboard
                        </button>
                    </div>
                </nav>
            </div>
        </header>
    );
};

export default LandingNavbar;
