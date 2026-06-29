/** @type {import('tailwindcss').Config} */
/*
 * Tailwind configuration — Task 3 (Accent Colour Picker)
 * ──────────────────────────────────────────────────────────────────────────
 * The `accent` and `accent-soft` colours were previously hard-coded to
 * `#38bdf8` / `#7dd3fc`. That meant the runtime accent picker in the
 * sidebar's Settings tab could only persist a value to localStorage and
 * a `--color-accent` CSS variable that NOTHING in the compiled CSS
 * actually consumed — so a hard refresh was the only way to see a new
 * accent applied (and even that didn't really work because Tailwind
 * never read the variable).
 *
 * Fix: the accent palette is now defined as `rgb(var(--color-accent) / <alpha>)`
 * / `rgb(var(--color-accent-soft) / <alpha>)`. The SettingsTab simply
 * writes those two CSS variables on :root and EVERY Tailwind utility
 * that uses `text-accent`, `bg-accent/30`, `text-accent-soft`, etc.
 * re-paints instantly without any reload.
 */
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
          DEFAULT: 'rgb(var(--color-accent) / <alpha-value>)',
          soft: 'rgb(var(--color-accent-soft) / <alpha-value>)',
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
      borderRadius: {
        DEFAULT: '9999px',
      },
    },
  },
  plugins: [],
}
