/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0E0E13',
        surface: '#131319',
        surfaceHover: '#1A1A22',
        border: '#2D3139',
        primary: '#2EC7B7',
        primaryHover: '#25A89A',
        textMain: '#F5F5F5',
        textMuted: '#8B8B9E',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
