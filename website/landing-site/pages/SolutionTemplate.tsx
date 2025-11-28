import React from 'react';
import { useParams } from 'react-router-dom';
import LandingNavbar from '../components/LandingNavbar';

const SolutionTemplate: React.FC = () => {
    const { category, slug } = useParams<{ category: string; slug: string }>();

    // Helper to format the slug back to title
    const formatTitle = (str: string | undefined) => {
        if (!str) return '';
        return str.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    };

    const title = formatTitle(slug);
    const categoryTitle = formatTitle(category);

    return (
        <div className="min-h-screen bg-[#0E0E13] text-white overflow-hidden flex flex-col">
            <LandingNavbar />
            
            <main className="flex-1 relative">
                {/* Background Effect */}
                <div className="absolute inset-0 z-[-1] opacity-30 pointer-events-none">
                    <div className="absolute inset-0"
                        style={{
                            backgroundImage: 'radial-gradient(circle, rgba(46, 199, 183, 0.15) 1px, transparent 1px)',
                            backgroundSize: '40px 40px',
                        }}
                    />
                </div>

                <section className="relative flex w-full flex-col gap-8 pt-14 text-center md:pt-24 xl:pt-[6.5rem] px-6">
                    <div className="inline-block mx-auto rounded-full border border-white/20 px-4 py-1.5 text-sm text-white backdrop-blur-sm uppercase tracking-wider">
                        {categoryTitle}
                    </div>

                    <h1 className="px-6 text-balance text-4xl leading-[3.5rem] tracking-tight md:text-6xl md:leading-[4.5rem] font-bold max-w-4xl mx-auto">
                        AI Voice Solutions for <br />
                        <span className="text-primary">{title}</span>
                    </h1>

                    <p className="text-textMuted text-lg max-w-2xl mx-auto leading-relaxed">
                        Discover how Voicory transforms {title} with advanced voice AI agents. 
                        Automate calls, improve customer experience, and scale your operations effortlessly.
                    </p>

                    <div className="mx-auto mt-8">
                        <button className="bg-primary hover:bg-primaryHover text-[#0E0E13] font-bold py-4 px-8 rounded-full transition-all duration-300 uppercase tracking-wider text-sm">
                            Get Started with {title}
                        </button>
                    </div>
                </section>

                {/* Placeholder Content Section */}
                <section className="max-w-[86rem] mx-auto px-6 md:px-8 py-24">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="bg-[#131319] border border-[#2D3139] rounded-3xl p-8 hover:border-primary/50 transition-colors">
                                <div className="w-12 h-12 bg-[#1E1E24] rounded-xl mb-6 flex items-center justify-center text-2xl">
                                    ✨
                                </div>
                                <h3 className="text-xl font-bold mb-4">Feature {i} for {title}</h3>
                                <p className="text-textMuted">
                                    Specific capability designed to help {title} businesses succeed with voice AI automation.
                                </p>
                            </div>
                        ))}
                    </div>
                </section>
            </main>
        </div>
    );
};

export default SolutionTemplate;
