'use client'

import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { 
  Palette, 
  Microphone, 
  Brain, 
  Sliders,
  Clock,
  Lightning,
  Gear
} from '@phosphor-icons/react'

export function CustomizationSection() {
  const [pitch, setPitch] = useState(50)
  const [speed, setSpeed] = useState(1.0)
  
  const pitchRef = useRef<HTMLDivElement>(null)
  const speedRef = useRef<HTMLDivElement>(null)

  const handlePitchInteraction = (e: React.MouseEvent) => {
    if (!pitchRef.current) return
    const rect = pitchRef.current.getBoundingClientRect()
    const height = rect.height
    const y = e.clientY - rect.top
    let newPitch = 100 - (y / height) * 100
    newPitch = Math.max(0, Math.min(100, newPitch))
    setPitch(newPitch)
  }

  const handleSpeedInteraction = (e: React.MouseEvent) => {
    if (!speedRef.current) return
    const rect = speedRef.current.getBoundingClientRect()
    const width = rect.width
    const x = e.clientX - rect.left
    let percentage = x / width
    percentage = Math.max(0, Math.min(1, percentage))
    const newSpeed = 0.5 + percentage * 1.0
    setSpeed(newSpeed)
  }

  const advancedFeatures = [
    { icon: Lightning, label: 'Real-time Analytics' },
    { icon: Gear, label: 'API Integration' },
    { icon: Sliders, label: 'A/B Testing' },
    { icon: Palette, label: 'White Labeling' },
  ]

  return (
    <section id="customization" className="w-full max-w-7xl mx-auto px-6 md:px-8 py-24">
      {/* Header */}
      <div className="mb-16 text-center max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <Sliders size={16} weight="bold" />
            Full Customization
          </span>
          <h2 className="text-4xl md:text-5xl font-bold mb-6">Advanced Customization</h2>
          <p className="text-textMuted text-lg">
            Generate the perfect voice with precision using our advanced customization suite. 
            Clone your voice or use our voice changer feature to generate the exact voice you need, every single time!
          </p>
        </motion.div>
      </div>

      {/* Interactive Customization Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Change Pitch */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="bg-surface border border-border rounded-3xl p-8 flex flex-col justify-between h-[400px] group hover:border-primary/50 transition-colors"
        >
          <div>
            <h3 className="text-2xl font-bold mb-3">Change Pitch</h3>
            <p className="text-textMuted text-sm">Achieve a more shrill or deep voice tone by changing the pitch upto 50%.</p>
          </div>
          <div className="flex justify-center items-center flex-1 mt-4">
            <div 
              ref={pitchRef}
              onMouseDown={(e) => handlePitchInteraction(e)}
              onMouseMove={(e) => { if (e.buttons === 1) handlePitchInteraction(e) }}
              className="relative h-40 w-12 bg-surfaceHover rounded-full p-1 cursor-pointer"
            >
              <div className="absolute bottom-1 left-1 right-1 top-1 bg-border rounded-full overflow-hidden pointer-events-none">
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
        </motion.div>

        {/* Voice Styles */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-surface border border-border rounded-3xl p-8 flex flex-col justify-between h-[400px] group hover:border-primary/50 transition-colors"
        >
          <div className="order-2">
            <h3 className="text-2xl font-bold mb-3">Voice Styles</h3>
            <p className="text-textMuted text-sm">Choose from 10+ voice styles - from sad, angry to promo, meditative, and much more.</p>
          </div>
          <div className="flex justify-center items-center flex-1 mb-4 order-1 bg-surfaceHover rounded-2xl p-4 overflow-hidden relative w-full">
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
        </motion.div>

        {/* Speed Control */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="bg-surface border border-border rounded-3xl p-8 flex flex-col justify-between h-[400px] group hover:border-primary/50 transition-colors"
        >
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
                onMouseDown={(e) => handleSpeedInteraction(e)}
                onMouseMove={(e) => { if (e.buttons === 1) handleSpeedInteraction(e) }}
                className="relative h-2 bg-border rounded-full cursor-pointer py-4 -my-4 bg-clip-content"
              >
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-2 bg-border rounded-full pointer-events-none"></div>
                <div 
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-2 bg-primary rounded-full pointer-events-none transition-all duration-75"
                  style={{ width: `${(speed - 0.5) * 100}%` }}
                ></div>
                <div 
                  className="absolute top-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg pointer-events-none transition-all duration-75"
                  style={{ left: `${(speed - 0.5) * 100}%`, transform: 'translate(-50%, -50%)' }}
                ></div>
                <div 
                  className="absolute -top-8 -translate-x-1/2 bg-background border border-border px-2 py-1 rounded text-xs text-white pointer-events-none"
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
        </motion.div>

        {/* Add Pauses */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-surface border border-border rounded-3xl p-8 flex flex-col justify-between h-[400px] group hover:border-primary/50 transition-colors"
        >
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
        </motion.div>
      </div>

      {/* Advanced Features Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-12 bg-surface/50 backdrop-blur border border-border rounded-2xl p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-textMuted text-sm">Also included:</div>
          <div className="flex flex-wrap gap-4">
            {advancedFeatures.map((feature) => (
              <div 
                key={feature.label}
                className="flex items-center gap-2 bg-background/50 px-4 py-2 rounded-lg"
              >
                <feature.icon size={18} weight="bold" className="text-primary" />
                <span className="text-sm font-medium">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.6 }}
        className="mt-12 text-center"
      >
        <a 
          href="https://app.voicory.com/signup"
          className="inline-flex items-center gap-2 bg-primary hover:bg-primaryHover text-background font-bold py-4 px-8 rounded-xl transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/25"
        >
          Start Customizing
          <Lightning size={20} weight="bold" />
        </a>
      </motion.div>
    </section>
  )
}
