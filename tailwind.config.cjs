/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        base: {
          900: '#020617',
          800: '#0b1220',
          700: '#0f172a',
          600: '#1e293b',
          500: '#334155',
        },
        accent: {
          DEFAULT: '#38bdf8',
          soft: '#7dd3fc',
        },
        ok: '#4ade80',
        warn: '#fbbf24',
        danger: '#f87171',
      },
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
        heading: ['"Instrument Serif"', 'serif'],
        body: ['"Barlow"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
