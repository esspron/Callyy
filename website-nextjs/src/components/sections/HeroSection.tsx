'use client'

import { useState } from 'react'
import Link from 'next/link'

const SOUNDWAVE_COLORS = [
  'rgb(97, 245, 180)',   // Green
  'rgb(255, 221, 3)',    // Yellow
  'rgb(255, 250, 233)',  // Off-white
  'rgb(77, 202, 250)',   // Blue
  'rgb(153, 119, 255)',  // Purple
  'rgb(232, 106, 51)',   // Orange
  'rgb(222, 148, 226)',  // Pink
]

function SoundwaveVisualization() {
  const bars = Array.from({ length: 33 }, (_, i) => ({
    id: i,
    color: SOUNDWAVE_COLORS[Math.floor(Math.random() * SOUNDWAVE_COLORS.length)],
    delay: Math.random() * 2,
  }))

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
    </div>
  )
}

export function HeroSection() {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <section className="relative flex w-full flex-col gap-12 pt-24 md:pt-32 xl:pt-36 text-center">
      {/* Dotted Background */}
      <div className="absolute inset-0 z-[-1] opacity-30">
        <div 
          className="absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(46, 199, 183, 0.15) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      {/* Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Heading */}
      <h1 className="px-6 text-balance text-4xl leading-tight tracking-tight md:text-7xl md:leading-tight md:tracking-tighter xl:text-8xl xl:leading-tight font-bold">
        <span>Voice AI agents</span>
        <br />
        <span className="gradient-text">for India</span>
      </h1>

      {/* Subtitle */}
      <p className="text-textMuted text-lg md:text-xl max-w-2xl mx-auto px-6">
        Build intelligent voice assistants that speak Hindi, English, and 10+ Indian languages. 
        Perfect for customer service, sales, and support automation.
      </p>

      {/* CTA Buttons */}
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-3 px-6 pb-2 md:flex-row md:pb-14 xl:pb-2">
        <Link
          href="https://app.voicory.com/signup"
          className="group flex w-full md:flex-1 text-center justify-center items-center font-medium rounded-full transition-all duration-300 font-mono uppercase active:scale-95 bg-primary hover:bg-primaryHover text-background h-14 px-5 py-2 gap-4 tracking-wider text-xs leading-5"
        >
          <span>Get Started Free</span>
          <span className="relative overflow-hidden">
            <svg height="16" viewBox="0 0 8 16" width="8" xmlns="http://www.w3.org/2000/svg" fill="none" className="origin-center transition-transform duration-300 group-hover:translate-x-4">
              <g clipPath="url(#clip0_hero)">
                <circle cx="1" cy="2" fill="currentColor" r="1" />
                <circle cx="4" cy="5" fill="currentColor" r="1" />
                <circle cx="7" cy="8" fill="currentColor" r="1" />
                <circle cx="4" cy="11" fill="currentColor" r="1" />
                <circle cx="1" cy="14" fill="currentColor" r="1" />
              </g>
              <defs>
                <clipPath id="clip0_hero">
                  <rect fill="white" height="15" transform="translate(0 0.5)" width="8" />
                </clipPath>
              </defs>
            </svg>
          </span>
        </Link>

        <Link
          href="#demo"
          className="group flex w-full md:flex-1 text-center justify-center items-center font-medium rounded-full transition-all duration-300 font-mono uppercase active:scale-95 bg-surface border border-border text-textMuted hover:text-textMain hover:border-textMuted h-14 px-5 py-2 gap-4 tracking-wider text-xs leading-5"
        >
          <span>See Demo</span>
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
        </Link>
      </div>

      {/* Soundwave Visualization */}
      <div className="-mt-5 md:-mt-10 relative">
        <div className="relative mx-auto min-h-[230px] w-full max-w-7xl sm:min-h-[396px]">
          <div className="absolute inset-0 grid place-items-center">
            {/* "Talk to Voicory" Button */}
            <div className="flex flex-col gap-4 relative z-10">
              <button
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                className="group flex text-center justify-center items-center rounded-full transition-all duration-300 uppercase active:scale-95 bg-textMain border border-border text-background hover:bg-background hover:border-textMain hover:text-textMain px-5 py-2 tracking-wider font-mono font-medium h-14 w-[13.5rem] gap-3 sm:h-24 sm:w-[23.3125rem] sm:gap-4 sm:text-xl relative after:absolute after:rounded-full after:border after:border-white/50 after:-inset-2 sm:after:-inset-3"
              >
                <span className="relative grid text-nowrap">
                  <span className={`col-start-1 row-start-1 block transition-opacity duration-250 ${isHovered ? 'opacity-0' : 'opacity-100'}`}>
                    Talk to Voicory
                  </span>
                  <span className={`col-start-1 row-start-1 transition-opacity duration-250 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                    Give it a Try
                  </span>
                </span>
              </button>
            </div>
          </div>

          {/* Animated Soundwave */}
          <SoundwaveVisualization />
        </div>
      </div>

      {/* Trust Badges */}
      <div className="flex flex-wrap justify-center items-center gap-8 px-6 pb-12 opacity-50">
        <span className="text-textMuted text-sm">Trusted by 500+ businesses in India</span>
      </div>
    </section>
  )
}
