'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { 
  User, 
  Calendar, 
  ClipboardText, 
  FileText, 
  Smiley, 
  CurrencyInr,
  Play,
  Pause
} from '@phosphor-icons/react'

const features = [
  { id: 'receptionist', label: 'Receptionist', icon: User, image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { id: 'appointment', label: 'Appointment Setter', icon: Calendar, image: 'https://images.unsplash.com/photo-1506784983877-45594efa4cbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { id: 'lead', label: 'Lead Qualification', icon: ClipboardText, image: 'https://images.unsplash.com/photo-1552581234-26160f608093?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { id: 'survey', label: 'Survey', icon: FileText, image: 'https://images.unsplash.com/photo-1450101499163-c8848c66ca85?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { id: 'customer', label: 'Customer Service', icon: Smiley, image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
  { id: 'debt', label: 'Debt Collection', icon: CurrencyInr, image: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80' },
]

interface FeatureCardProps {
  icon: React.ElementType
  label: string
  onClick?: () => void
  isActive?: boolean
}

function FeatureCard({ icon: Icon, label, onClick, isActive }: FeatureCardProps) {
  return (
    <div 
      onClick={onClick}
      className={`rounded-3xl p-6 flex flex-col items-center justify-center gap-4 text-center transition-all cursor-pointer h-full min-h-[160px] ${
        isActive 
          ? 'bg-primary text-background scale-105 ring-4 ring-primary/30' 
          : 'bg-white text-background hover:scale-105 hover:shadow-lg'
      }`}
    >
      <Icon size={32} weight="regular" className={isActive ? 'text-background' : 'text-background'} />
      <span className="font-medium text-sm md:text-base leading-tight">{label}</span>
    </div>
  )
}

interface AudioCardProps {
  name: string
  language: string
  isPlaying: boolean
  onPlay: () => void
}

function AudioCard({ name, language, isPlaying, onPlay }: AudioCardProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-lg w-full max-w-md transform transition-transform hover:scale-[1.02]">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-background font-bold text-lg">{name}</h3>
        <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded text-xs font-medium">
          {language}
        </span>
      </div>
      
      <div className="border border-purple-200 rounded-full p-2 flex items-center gap-4">
        <button 
          onClick={onPlay}
          className="w-10 h-10 rounded-full bg-[#7C3AED] flex items-center justify-center text-white shrink-0 hover:bg-[#6D28D9] transition-colors"
        >
          {isPlaying ? <Pause size={20} weight="fill" /> : <Play size={20} weight="fill" className="ml-0.5" />}
        </button>
        
        {/* Waveform */}
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
  )
}

export function DemoSection() {
  const [selectedFeature, setSelectedFeature] = useState('Receptionist')
  const [formData, setFormData] = useState({ phone: '', name: '', email: '' })
  const [playingIndex, setPlayingIndex] = useState<number | null>(null)
  const waveformRef = useRef<HTMLDivElement>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Demo request:', formData)
  }

  const selectedImage = features.find(f => f.label === selectedFeature)?.image

  const handlePlay = (index: number) => {
    if (playingIndex === index) {
      setPlayingIndex(null)
    } else {
      setPlayingIndex(index)
    }
  }

  return (
    <section id="demo" className="w-full max-w-7xl mx-auto px-6 md:px-8 py-24">
      <div className="mb-12">
        <h2 className="text-4xl md:text-5xl font-bold mb-4">Try Our Live Demo</h2>
        <p className="text-textMuted text-lg">Discover how our AI caller transforms customer conversations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Card - Form & Image */}
        <div className="lg:col-span-7 bg-background border border-border rounded-3xl overflow-hidden flex flex-col md:flex-row">
          {/* Form Side */}
          <div className="p-8 flex-1 flex flex-col justify-center bg-surface">
            <h3 className="text-xl text-[#4DCAFA] mb-6 font-medium">Receive a live call from our agent</h3>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div>
                <label className="block text-sm text-textMuted mb-2">Phone Number</label>
                <input 
                  type="tel" 
                  placeholder="+91 98765 43210" 
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full bg-white text-background rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <div>
                <label className="block text-sm text-textMuted mb-2">Name</label>
                <input 
                  type="text" 
                  placeholder="Your name" 
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full bg-white text-background rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <div>
                <label className="block text-sm text-textMuted mb-2">Email Address</label>
                <input 
                  type="email" 
                  placeholder="you@company.com" 
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full bg-white text-background rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary/50" 
                />
              </div>
              <button 
                type="submit" 
                className="mt-4 bg-white hover:bg-gray-100 text-background font-bold py-3 px-6 rounded-lg uppercase text-xs tracking-wider transition-colors w-fit"
              >
                Get a Call
              </button>
            </form>
          </div>

          {/* Image Side */}
          <div className="relative w-full md:w-1/2 h-64 md:h-auto bg-surface overflow-hidden" ref={waveformRef}>
            {selectedImage && (
              <Image 
                src={selectedImage} 
                alt={selectedFeature} 
                fill
                className="object-cover opacity-80 transition-opacity duration-500" 
              />
            )}
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
                  />
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

      {/* Multi Language Audio Cards Section */}
      <div className="mt-24">
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
              Need a custom voice or regional dialect? We&apos;ll train it specifically for you!
            </p>
            
            <button 
              className="bg-[#7C3AED] hover:bg-[#6D28D9] text-white font-medium rounded-lg px-8 py-4 transition-colors duration-300"
            >
              Explore More Voices
            </button>
          </div>

          {/* Right Content - Audio Cards */}
          <div className="flex flex-col gap-6 relative">
            <AudioCard 
              name="Agent 1" 
              language="Hindi" 
              isPlaying={playingIndex === 0}
              onPlay={() => handlePlay(0)} 
            />
            
            <div className="lg:ml-12">
              <AudioCard 
                name="Agent 2" 
                language="English" 
                isPlaying={playingIndex === 1}
                onPlay={() => handlePlay(1)} 
              />
            </div>

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
  )
}
