import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Calendar, ClipboardList, FileText, Smile, DollarSign, Play, Pause } from 'lucide-react';
import LandingNavbar from '../components/LandingNavbar';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isHovered, setIsHovered] = useState(false);
    const [playingIndex, setPlayingIndex] = useState<number | null>(null);
    const [selectedFeature, setSelectedFeature] = useState('Receptionist');
    
    // Customization State
    const [pitch, setPitch] = useState(50);
    const [speed, setSpeed] = useState(1.2);
    
    const pitchRef = useRef<HTMLDivElement>(null);
    const speedRef = useRef<HTMLDivElement>(null);

    const handlePitchInteraction = (e: React.MouseEvent) => {
        if (!pitchRef.current) return;
        const rect = pitchRef.current.getBoundingClientRect();
        const height = rect.height;
        const y = e.clientY - rect.top;
        // Calculate percentage from bottom (100% at top, 0% at bottom)
        let newPitch = 100 - (y / height) * 100;
        newPitch = Math.max(0, Math.min(100, newPitch));
        setPitch(newPitch);
    };

    const handleSpeedInteraction = (e: React.MouseEvent) => {
        if (!speedRef.current) return;
        const rect = speedRef.current.getBoundingClientRect();
        const width = rect.width;
        const x = e.clientX - rect.left;
        let percentage = x / width;
        percentage = Math.max(0, Math.min(1, percentage));
        // Range 0.5 to 1.5
        const newSpeed = 0.5 + percentage * 1.0;
        setSpeed(newSpeed);
    };

    const features = [
        { id: 'receptionist', label: 'Receptionist', icon: <User />, image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
        { id: 'appointment', label: 'Appointment Setter', icon: <Calendar />, image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
        { id: 'lead', label: 'Lead Qualification', icon: <ClipboardList />, image: 'https://images.unsplash.com/photo-1552581234-26160f608093?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
        { id: 'survey', label: 'Survey', icon: <FileText />, image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
        { id: 'customer', label: 'Customer Service', icon: <Smile />, image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
        { id: 'debt', label: 'Debt Collection', icon: <DollarSign />, image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
    ];

    const handlePlay = (index: number) => {
        if (playingIndex === index) {
            setPlayingIndex(null);
        } else {
            setPlayingIndex(index);
        }
    };

    return (
        <div className="min-h-screen bg-[#0E0E13] text-white overflow-hidden">
            {/* Header */}
            <LandingNavbar />

            {/* Hero Section */}
            <main>
                <section className="relative flex w-full flex-col gap-12 pt-14 text-center md:gap-10 md:pt-24 xl:gap-16 xl:pt-[6.5rem]">
                    {/* Dotted Background */}
                    <div className="absolute inset-0 z-[-1] opacity-30">
                        <div className="absolute inset-0"
                            style={{
                                backgroundImage: 'radial-gradient(circle, rgba(46, 199, 183, 0.15) 1px, transparent 1px)',
                                backgroundSize: '40px 40px',
                            }}
                        />
                    </div>

                    {/* Main Heading */}
                    <h1 className="px-6 text-balance text-4xl leading-[3.5rem] tracking-tight md:text-7xl md:leading-[5.5rem] md:tracking-tighter xl:text-8xl xl:leading-[7rem] xl:tracking-tighter font-bold">
                        <span>Voice AI agents</span>
                        <br />
                        <span className="text-primary">for India</span>
                    </h1>

                    {/* CTA Buttons */}
                    <div className="mx-auto flex w-full max-w-[19.375rem] flex-col items-center gap-3 px-6 pb-2 sm:max-w-[35.5rem] md:flex-row md:pb-14 xl:pb-2">
                        <button
                            onClick={() => navigate('/')}
                            className="group flex w-full md:flex-1 text-center justify-center items-center font-medium rounded-full transition-all duration-300 font-mono uppercase active:scale-95 bg-primary hover:bg-primaryHover text-[#0E0E13] h-14 px-5 py-2 gap-4 tracking-wider text-xs leading-5"
                        >
                            <span>Get Started</span>
                            <span className="relative overflow-hidden">
                                <svg height="16" viewBox="0 0 8 16" width="8" xmlns="http://www.w3.org/2000/svg" fill="none" className="origin-center transition-transform duration-300 group-hover:translate-x-4">
                                    <g clipPath="url(#clip0_12780_10462)">
                                        <circle cx="1" cy="2" fill="currentColor" r="1" />
                                        <circle cx="4" cy="5" fill="currentColor" r="1" />
                                        <circle cx="7" cy="8" fill="currentColor" r="1" />
                                        <circle cx="4" cy="11" fill="currentColor" r="1" />
                                        <circle cx="1" cy="14" fill="currentColor" r="1" />
                                    </g>
                                    <defs>
                                        <clipPath id="clip0_12780_10462">
                                            <rect fill="white" height="15" transform="translate(0 0.5)" width="8" />
                                        </clipPath>
                                    </defs>
                                </svg>
                            </span>
                        </button>

                        <a
                            href="/docs.html"
                            className="group flex w-full md:flex-1 text-center justify-center items-center font-medium rounded-full transition-all duration-300 font-mono uppercase active:scale-95 bg-surface border border-border text-textMuted hover:text-textMain hover:border-textMuted h-14 px-5 py-2 gap-4 tracking-wider text-xs leading-5"
                        >
                            <span>Read the Docs</span>
                            <svg height="16" viewBox="0 0 16 16" width="16" xmlns="http://www.w3.org/2000/svg" fill="none" className="origin-center transition-transform duration-300 group-hover:rotate-45">
                                <circle cx="6" cy="2" fill="currentColor" r="1" />
                                <circle cx="10" cy="2" fill="currentColor" r="1" />
                                <circle cx="2" cy="6" fill="currentColor" r="1" />
                                <circle cx="14" cy="6" fill="currentColor" r="1" />
                                <circle cx="2" cy="10" fill="currentColor" r="1" />
                                <circle cx="14" cy="10" fill="currentColor" r="1" />
                                <circle cx="6" cy="14" fill="currentColor" r="1" />
                                <circle cx="10" cy="14" fill="currentColor" r="1" />
                            </svg>
                        </a>
                    </div>

                    {/* Soundwave Visualization */}
                    <div className="-mt-5 md:-mt-10 relative">
                        <div className="relative mx-auto min-h-[230px] w-full max-w-[96.25rem] sm:min-h-[396px]">
                            <div className="absolute inset-0 grid place-items-center">
                                {/* "Talk to vapi" Button */}
                                <div className="flex flex-col gap-4 relative z-10">
                                    <button
                                        onMouseEnter={() => setIsHovered(true)}
                                        onMouseLeave={() => setIsHovered(false)}
                                        onClick={() => navigate('/')}
                                        className="group flex text-center justify-center items-center rounded-full transition-all duration-300 uppercase active:scale-95 bg-textMain border border-border text-background hover:bg-background hover:border-textMain hover:text-textMain px-5 py-2 tracking-wider font-mono font-medium h-14 w-[13.5rem] gap-3 sm:h-24 sm:w-[23.3125rem] sm:gap-4 sm:text-xl relative after:absolute after:rounded-inherit after:border after:border-white/50 after:-inset-2 sm:after:-inset-3"
                                    >
                                        <span className="relative grid text-nowrap">
                                            <span className={`col-start-1 row-start-1 block transition-opacity duration-250 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
                                                Talk to Voicory
                                            </span>
                                            <span className={`col-start-1 row-start-1 transition-opacity duration-250 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                                                give it a Try
                                            </span>
                                        </span>
                                        <span>
                                            <svg height="33" viewBox="0 0 36 33" width="36" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-8 sm:h-8" fill="none">
                                                <circle className="row-1" cx="13" cy="1.5" fill="currentColor" r="1.5" />
                                                <circle className="row-1" cx="18" cy="1.5" fill="currentColor" r="1.5" />
                                                <circle className="row-1" cx="23" cy="1.5" fill="currentColor" r="1.5" />
                                                <circle className="row-2" cx="13" cy="6.5" fill="currentColor" r="1.5" />
                                                <circle className="row-2" cx="18" cy="6.5" fill="currentColor" r="1.5" />
                                                <circle className="row-2" cx="23" cy="6.5" fill="currentColor" r="1.5" />
                                                <circle className="row-3" cx="13" cy="11.5" fill="currentColor" r="1.5" />
                                                <circle className="row-3" cx="18" cy="11.5" fill="currentColor" r="1.5" />
                                                <circle className="row-3" cx="23" cy="11.5" fill="currentColor" r="1.5" />
                                                <circle className="row-4" cx="13" cy="16.5" fill="currentColor" r="1.5" />
                                                <circle className="row-4" cx="18" cy="16.5" fill="currentColor" r="1.5" />
                                                <circle className="row-4" cx="23" cy="16.5" fill="currentColor" r="1.5" />
                                                <circle className="row-5" cx="13" cy="21.5" fill="currentColor" r="1.5" />
                                                <circle className="row-5" cx="18" cy="21.5" fill="currentColor" r="1.5" />
                                                <circle className="row-5" cx="23" cy="21.5" fill="currentColor" r="1.5" />
                                                <circle className="row-6" cx="18" cy="26.5" fill="currentColor" r="1.5" />
                                                <circle className="row-7" cx="13" cy="31.5" fill="currentColor" r="1.5" />
                                                <circle className="row-7" cx="18" cy="31.5" fill="currentColor" r="1.5" />
                                                <circle className="row-7" cx="23" cy="31.5" fill="currentColor" r="1.5" />
                                            </svg>
                                        </span>
                                    </button>
                                </div>
                            </div>

                            {/* Animated Soundwave */}
                            <SoundwaveVisualization />
                        </div>
                    </div>
                </section>

                {/* Try Our Live Demo Section */}
                <section className="w-full max-w-[86rem] mx-auto px-6 md:px-8 py-24">
                    <div className="mb-12">
                        <h2 className="text-4xl md:text-5xl font-bold mb-4">Try Our Live Demo</h2>
                        <p className="text-textMuted text-lg">Discover how our AI caller transforms customer conversations.</p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left Card - Form & Image */}
                        <div className="lg:col-span-7 bg-[#0E0E13] border border-[#2D3139] rounded-3xl overflow-hidden flex flex-col md:flex-row">
                            {/* Form Side */}
                            <div className="p-8 flex-1 flex flex-col justify-center bg-[#131319]">
                                <h3 className="text-xl text-[#4DCAFA] mb-6 font-medium">Receive a live call from our agent</h3>
                                <form className="space-y-4" onSubmit={(e) => e.preventDefault()}>
                                    <div>
                                        <label className="block text-sm text-textMuted mb-2">Phone Number</label>
                                        <input 
                                            type="tel" 
                                            placeholder="123-456-7890" 
                                            className="w-full bg-white text-black rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-textMuted mb-2">Name</label>
                                        <input 
                                            type="text" 
                                            placeholder="John" 
                                            className="w-full bg-white text-black rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-textMuted mb-2">Email Address</label>
                                        <input 
                                            type="email" 
                                            placeholder="john@company.com" 
                                            className="w-full bg-white text-black rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                                        />
                                    </div>
                                    <button 
                                        type="button" 
                                        className="mt-4 bg-white text-black font-bold py-3 px-6 rounded-lg uppercase text-xs tracking-wider hover:bg-gray-100 transition-colors w-fit"
                                    >
                                        Get a Call
                                    </button>
                                </form>
                            </div>
                            {/* Image Side */}
                            <div className="relative w-full md:w-1/2 h-64 md:h-auto bg-gray-800 transition-all duration-500">
                                <img 
                                    src={features.find(f => f.label === selectedFeature)?.image} 
                                    alt={selectedFeature} 
                                    className="absolute inset-0 w-full h-full object-cover opacity-80 transition-opacity duration-500" 
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                                    {/* Soundwave overlay */}
                                    <div className="flex gap-1 items-center h-12">
                                        {[...Array(12)].map((_, i) => (
                                            <div 
                                                key={i} 
                                                className="w-1 bg-white/90 rounded-full animate-pulse" 
                                                style={{ 
                                                    height: `${Math.max(20, Math.random() * 100)}%`, 
                                                    animationDelay: `${i * 0.1}s`,
                                                    animationDuration: '0.8s'
                                                }}
                                            ></div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Grid - Feature Cards */}
                        <div className="lg:col-span-5 grid grid-cols-2 gap-4">
                            {features.map((feature) => (
                                <FeatureCard 
                                    key={feature.id}
                                    icon={feature.icon} 
                                    label={feature.label} 
                                    isActive={selectedFeature === feature.label}
                                    onClick={() => setSelectedFeature(feature.label)}
                                />
                            ))}
                        </div>
                    </div>
                </section>

                {/* Multi Language Section */}
                <section className="w-full bg-[#0E0E13] py-24 relative overflow-hidden">
                    {/* Background Map/Network Effect */}
                    <div className="absolute inset-0 opacity-20 pointer-events-none">
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-[#0E0E13] to-[#0E0E13]"></div>
                    </div>

                    <div className="max-w-[86rem] mx-auto px-6 md:px-8 relative z-10">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                            {/* Left Content */}
                            <div className="space-y-8">
                                <div className="inline-block rounded-full border border-white/20 px-4 py-1.5 text-sm text-white backdrop-blur-sm">
                                    Speak their Language
                                </div>
                                
                                <h2 className="text-4xl md:text-5xl font-bold leading-tight">
                                    Voicory Supports <br/>
                                    <span className="text-primary">Multiple Languages</span>
                                </h2>
                                
                                <p className="text-textMuted text-lg leading-relaxed max-w-xl">
                                    Whether your audience speaks English, Hindi, Bengali, Tamil, Kannada, Marathi, or more, Voicory handles conversations naturally in multiple languages.
                                    <br/><br/>
                                    Need a custom voice or regional dialect? We'll train it specifically for you!
                                </p>
                                
                                <button 
                                    onClick={() => navigate('/voice-library')}
                                    className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg px-8 py-4 transition-colors duration-300"
                                >
                                    Explore More Voices
                                </button>
                            </div>

                            {/* Right Content - Audio Cards */}
                            <div className="flex flex-col gap-6 relative">
                                {/* Agent 1 - Hindi */}
                                <AudioCard 
                                    name="Agent 1" 
                                    language="Hindi" 
                                    isPlaying={playingIndex === 0}
                                    onPlay={() => handlePlay(0)} 
                                />
                                
                                {/* Agent 2 - English */}
                                <div className="lg:ml-12">
                                    <AudioCard 
                                        name="Agent 2" 
                                        language="English" 
                                        isPlaying={playingIndex === 1}
                                        onPlay={() => handlePlay(1)} 
                                    />
                                </div>

                                {/* Agent 3 - Bengali */}
                                <AudioCard 
                                    name="Agent 3" 
                                    language="Bengali" 
                                    isPlaying={playingIndex === 2}
                                    onPlay={() => handlePlay(2)} 
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* Advanced Customization Section */}
                <section className="w-full max-w-[86rem] mx-auto px-6 md:px-8 py-24">
                    <div className="mb-16 text-center max-w-3xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">Advanced Customization</h2>
                        <p className="text-textMuted text-lg">
                            Generate the perfect voice with precision using our advanced customization suite. 
                            Clone your voice or use our voice changer feature to generate the exact voice you need, every single time!
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        {/* Change Pitch */}
                        <div className="bg-[#131319] border border-[#2D3139] rounded-3xl p-8 flex flex-col justify-between h-[400px] group hover:border-primary/50 transition-colors">
                            <div>
                                <h3 className="text-2xl font-bold mb-3">Change Pitch</h3>
                                <p className="text-textMuted text-sm">Achieve a more shrill or deep voice tone by changing the pitch upto 50%.</p>
                            </div>
                            <div className="flex justify-center items-center flex-1 mt-4">
                                <div 
                                    ref={pitchRef}
                                    onMouseDown={(e) => { handlePitchInteraction(e); }}
                                    onMouseMove={(e) => { if (e.buttons === 1) handlePitchInteraction(e); }}
                                    className="relative h-40 w-12 bg-[#1E1E24] rounded-full p-1 cursor-pointer"
                                >
                                    <div className="absolute bottom-1 left-1 right-1 top-1 bg-[#2D3139] rounded-full overflow-hidden pointer-events-none">
                                        <div 
                                            className="absolute bottom-0 left-0 right-0 bg-primary/20 transition-all duration-75"
                                            style={{ height: `${pitch}%` }}
                                        ></div>
                                    </div>
                                    <div 
                                        className="absolute left-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full shadow-lg pointer-events-none transition-all duration-75"
                                        style={{ top: `${100 - pitch}%`, transform: 'translate(-50%, -50%)' }}
                                    ></div>
                                    <div 
                                        className="absolute left-14 bg-white/10 px-2 py-1 rounded text-xs text-white whitespace-nowrap pointer-events-none"
                                        style={{ top: `${100 - pitch}%`, transform: 'translateY(-50%)' }}
                                    >
                                        {Math.round(pitch - 50)}%
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Voice Styles */}
                        <div className="bg-[#131319] border border-[#2D3139] rounded-3xl p-8 flex flex-col justify-between h-[400px] group hover:border-primary/50 transition-colors">
                            <div className="order-2">
                                <h3 className="text-2xl font-bold mb-3">Voice Styles</h3>
                                <p className="text-textMuted text-sm">Choose form 10+ voice styles - from sad, angry to promo, meditative, and much more.</p>
                            </div>
                            <div className="flex justify-center items-center flex-1 mb-4 order-1 bg-[#1E1E24] rounded-2xl p-4 overflow-hidden relative w-full">
                                <div className="flex items-center gap-1 h-16 w-full justify-center">
                                    {[...Array(15)].map((_, i) => (
                                        <div key={i} className="w-1.5 bg-primary/60 rounded-full" style={{ height: `${Math.random() * 100}%` }}></div>
                                    ))}
                                </div>
                                <div className="absolute top-2 left-2 flex gap-2">
                                    <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                    <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                </div>
                            </div>
                        </div>

                        {/* Speed Control */}
                        <div className="bg-[#131319] border border-[#2D3139] rounded-3xl p-8 flex flex-col justify-between h-[400px] group hover:border-primary/50 transition-colors">
                            <div>
                                <h3 className="text-2xl font-bold mb-3">Speed control</h3>
                                <p className="text-textMuted text-sm">Generate unique voices by making it speak upto 50% faster or slower.</p>
                            </div>
                            <div className="flex justify-center items-center flex-1 mt-4">
                                <div className="w-full px-4">
                                    <div className="flex justify-between text-xs text-textMuted mb-2">
                                        <span>Slower</span>
                                        <span>Faster</span>
                                    </div>
                                    <div 
                                        ref={speedRef}
                                        onMouseDown={(e) => { handleSpeedInteraction(e); }}
                                        onMouseMove={(e) => { if (e.buttons === 1) handleSpeedInteraction(e); }}
                                        className="relative h-2 bg-[#2D3139] rounded-full cursor-pointer py-4 -my-4 bg-clip-content"
                                    >
                                        {/* Track Background */}
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-2 bg-[#2D3139] rounded-full pointer-events-none"></div>
                                        
                                        {/* Active Track */}
                                        <div 
                                            className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-primary rounded-full pointer-events-none transition-all duration-75"
                                            style={{ width: `${(speed - 0.5) * 100}%` }}
                                        ></div>
                                        
                                        {/* Thumb */}
                                        <div 
                                            className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg pointer-events-none transition-all duration-75"
                                            style={{ left: `${(speed - 0.5) * 100}%`, transform: 'translate(-50%, -50%)' }}
                                        ></div>
                                        
                                        {/* Label */}
                                        <div 
                                            className="absolute -top-8 -translate-x-1/2 bg-black border border-[#2D3139] px-2 py-1 rounded text-xs text-white pointer-events-none"
                                            style={{ left: `${(speed - 0.5) * 100}%` }}
                                        >
                                            {speed.toFixed(1)}x
                                        </div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-textMuted mt-2 px-1">
                                        <span>0.5x</span>
                                        <span>1x</span>
                                        <span>1.5x</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Add Pauses */}
                        <div className="bg-[#131319] border border-[#2D3139] rounded-3xl p-8 flex flex-col justify-between h-[400px] group hover:border-primary/50 transition-colors">
                            <div className="order-2">
                                <h3 className="text-2xl font-bold mb-3">Add Pauses</h3>
                                <p className="text-textMuted text-sm">Add shorter or longer pauses and make your AI voiceovers sound like a human.</p>
                            </div>
                            <div className="flex justify-center items-center flex-1 mb-4 order-1">
                                <div className="bg-white rounded-xl shadow-lg p-2 w-full max-w-[180px] transform rotate-[-5deg] group-hover:rotate-0 transition-transform duration-300">
                                    <div className="space-y-1">
                                        <div className="px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 rounded cursor-pointer">Extra Weak (250ms)</div>
                                        <div className="px-3 py-2 text-xs text-black bg-purple-100 rounded font-medium cursor-pointer flex justify-between items-center">
                                            Weak (0.5s)
                                            <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-purple-500 transform rotate-[-45deg]"></div>
                                        </div>
                                        <div className="px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 rounded cursor-pointer">Medium (0.75s)</div>
                                        <div className="px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 rounded cursor-pointer">Strong (1s)</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Footer or additional sections can go here */}
            </main>
        </div>
    );
};

// Feature Card Component
const FeatureCard: React.FC<{ 
    icon: React.ReactNode; 
    label: string; 
    onClick?: () => void;
    isActive?: boolean;
}> = ({ icon, label, onClick, isActive }) => (
    <div 
        onClick={onClick}
        className={`rounded-3xl p-6 flex flex-col items-center justify-center gap-4 text-center hover:shadow-lg transition-all cursor-pointer h-full min-h-[160px] ${isActive ? 'bg-primary text-black scale-105 ring-4 ring-primary/30' : 'bg-white text-black hover:scale-105'}`}
    >
        <div className={isActive ? 'text-black' : 'text-black'}>
            {React.cloneElement(icon as React.ReactElement, { size: 32, strokeWidth: 1.5 })}
        </div>
        <span className={`font-medium text-sm md:text-base leading-tight ${isActive ? 'text-black' : 'text-black'}`}>{label}</span>
    </div>
);

// Audio Card Component
const AudioCard: React.FC<{ 
    name: string; 
    language: string; 
    isPlaying: boolean; 
    onPlay: () => void; 
}> = ({ name, language, isPlaying, onPlay }) => (
    <div className="bg-white rounded-2xl p-6 shadow-lg w-full max-w-md transform transition-transform hover:scale-[1.02]">
        <div className="flex justify-between items-start mb-4">
            <h3 className="text-black font-bold text-lg">{name}</h3>
            <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded text-xs font-medium">
                {language}
            </span>
        </div>
        
        <div className="border border-purple-200 rounded-full p-2 flex items-center gap-4">
            <button 
                onClick={onPlay}
                className="w-10 h-10 rounded-full bg-[#7C3AED] flex items-center justify-center text-white shrink-0 hover:bg-[#6D28D9] transition-colors"
            >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-1" />}
            </button>
            
            {/* Fake Waveform */}
            <div className="flex-1 flex items-center gap-0.5 h-8 overflow-hidden">
                {[...Array(40)].map((_, i) => (
                    <div 
                        key={i}
                        className={`w-1 bg-[#7C3AED] rounded-full transition-all duration-300 ${isPlaying ? 'animate-pulse' : ''}`}
                        style={{ 
                            height: `${Math.max(20, Math.random() * 100)}%`,
                            opacity: isPlaying ? 1 : 0.3
                        }}
                    />
                ))}
            </div>
        </div>
    </div>
);

// Soundwave Component
const SoundwaveVisualization: React.FC = () => {
    const colors = [
        'rgb(97, 245, 180)',   // Green
        'rgb(255, 221, 3)',     // Yellow
        'rgb(255, 250, 233)',   // Off-white
        'rgb(77, 202, 250)',    // Blue
        'rgb(153, 119, 255)',   // Purple
        'rgb(232, 106, 51)',    // Orange
        'rgb(222, 148, 226)',   // Pink
    ];

    // Generate bars for soundwave
    const bars = Array.from({ length: 33 }, (_, i) => ({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        delay: Math.random() * 2,
    }));

    return (
        <div className="pointer-events-none h-[230px] w-full sm:h-[396px] flex items-center justify-center gap-3 overflow-hidden">
            {bars.map((bar) => (
                <div
                    key={bar.id}
                    className="soundwave-bar"
                    style={{
                        backgroundColor: bar.color,
                        animationDelay: `${bar.delay}s`,
                    }}
                />
            ))}
            <style>{`
        .soundwave-bar {
          width: 20px;
          height: 12px;
          border-radius: 6px;
          animation: soundwave 1.5s ease-in-out infinite;
        }

        @keyframes soundwave {
          0%, 100% {
            height: 12px;
          }
          50% {
            height: 80px;
          }
        }

        @media (min-width: 640px) {
          .soundwave-bar {
            width: 32px;
          }
          @keyframes soundwave {
            0%, 100% {
              height: 12px;
            }
            50% {
              height: 140px;
            }
          }
        }
      `}</style>
        </div>
    );
};

export default LandingPage;
