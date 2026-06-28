import { motion, useInView } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'

const HERO_VIDEO = '/landing_page.mp4'
const CAP_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_094631_d30ab262-45ee-4b7d-99f3-5d5848c8ef13.mp4'
const EXTRA_VIDEOS = ['/section1.mp4', '/section2.mp4', '/section3.mp4', '/section4.mp4', '/section5.mp4']

const FADE_MS = 500
const FADE_OUT_LEAD = 0.55
const DEFAULT_TRIM_SECONDS = 1.2

const SECTION_IDS = {
  hero: 'home',
  capabilities: 'capabilities',
  voyages: 'voyages',
  worlds: 'worlds',
  innovation: 'innovation',
  planLaunch: 'plan-launch',
  enter: 'enter-dashboard',
} as const

type FadingVideoProps = {
  src: string
  className?: string
  style?: React.CSSProperties
  trimEndSeconds?: number
  onReady?: () => void
}

type CapabilityCard = {
  title: string
  body: string
  tags: string[]
  iconPath: string
}

type CreativeSection = {
  id: string
  label: string
  title: string
  subtitle: string
  video: string
  layout: 'split-panels' | 'signal-grid' | 'timeline' | 'radial-band' | 'cta'
  highlights: string[]
  stats: { value: string; label: string }[]
}

const capabilities: CapabilityCard[] = [
  {
    title: 'AI Scenery',
    body: 'AI analyzes your product to create indistinguishable natural environments — from Icelandic cliffs to misty forests.',
    tags: ['Natural Context', 'Photo Realism', 'Infinite Settings', 'Eco-Vibe'],
    iconPath:
      'M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21H5Zm1-4h12l-3.75-5-3 4L9 13l-3 4Z',
  },
  {
    title: 'Batch Production',
    body: 'Style your entire product line in minutes. Create a unified visual identity for catalogues and social media without weeks of retouching.',
    tags: ['Scale Fast', 'Visual Consistency', 'Time Saver', 'Ready to Post'],
    iconPath:
      'M4 6.47 5.76 10H20v8H4V6.47M22 4h-4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.89-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4Z',
  },
  {
    title: 'Smart Lighting',
    body: 'Automatic lighting and material adjustment. Achieve flawless integration with realistic shadows and sunlight.',
    tags: ['Ray Tracing', 'Physical Shadows', 'Studio Quality', 'Sunlight Sync'],
    iconPath:
      'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1Zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7Z',
  },
]

const creativeSections: CreativeSection[] = [
  {
    id: SECTION_IDS.voyages,
    label: 'Voyages',
    title: 'Mission windows tuned for nonstop velocity',
    subtitle:
      'Each sequence translates the control-terminal philosophy into cinematic, operator-friendly launch surfaces with layered telemetry, softened motion, and high-contrast glass chrome.',
    video: EXTRA_VIDEOS[0],
    layout: 'split-panels',
    highlights: ['Pinned launch rails', 'Adaptive glass telemetry', 'Loop-trimmed hero playback', 'Instant dashboard handoff'],
    stats: [
      { value: '0 dropped', label: 'Hero frames during preload handoff' },
      { value: '7 sections', label: 'Full cinematic landing sequence' },
      { value: '1 file path', label: 'public/landing_page.mp4 for hero replacement' },
    ],
  },
  {
    id: SECTION_IDS.worlds,
    label: 'Worlds',
    title: 'Immersive environments that never hard-cut between scenes',
    subtitle:
      'Blurred seam overlays, overlap stacking, and soft gradient veils dissolve visible lines between consecutive backgrounds so the experience reads like one continuous film strip.',
    video: EXTRA_VIDEOS[1],
    layout: 'signal-grid',
    highlights: ['Top veil blend', 'Bottom bloom blur', 'Shared black stage', 'Crossfaded loop engine'],
    stats: [
      { value: '50px', label: 'Primary CTA glass blur strength' },
      { value: '500ms', label: 'requestAnimationFrame fade window' },
      { value: '0.55s', label: 'Fade-out lead before loop reset' },
    ],
  },
  {
    id: SECTION_IDS.innovation,
    label: 'Innovation',
    title: 'Engineering notes surfaced as animated story modules',
    subtitle:
      'The expanded landing page now carries the same systems narrative as the dashboard: performance, orchestration, preloading, and compositing are explained through motion-first editorial blocks.',
    video: EXTRA_VIDEOS[2],
    layout: 'timeline',
    highlights: ['Creative loader', 'Video prewarming', 'Section-by-section reveals', 'Responsive glass timelines'],
    stats: [
      { value: '6+', label: 'Prewarmed video assets on first visit' },
      { value: '100%', label: 'Landing-first route coverage' },
      { value: '2 states', label: 'Landing shell and live dashboard' },
    ],
  },
  {
    id: SECTION_IDS.planLaunch,
    label: 'Plan Launch',
    title: 'A professional runway from inspiration to control terminal',
    subtitle:
      'Operators can explore the cinematic story, inspect the implementation path, confirm where every background clip belongs in public assets, then jump directly into the live telemetry workspace.',
    video: EXTRA_VIDEOS[3],
    layout: 'radial-band',
    highlights: ['Public asset convention', 'Exact hero replacement path', 'Chart.js dashboard preserved', 'Hash-routed dashboard entry'],
    stats: [
      { value: '/public', label: 'Directory for landing_page.mp4 and section1-5.mp4' },
      { value: '#dashboard', label: 'Instant route for control terminal' },
      { value: '5 more', label: 'Animated creative sections added' },
    ],
  },
  {
    id: SECTION_IDS.enter,
    label: 'Ready',
    title: 'Step through the cinematic shell into the telemetry core',
    subtitle:
      'Use the landing page as the first-touch experience, then hand off into the production dashboard without abandoning the brand system, motion language, or performance-first engineering posture.',
    video: EXTRA_VIDEOS[4],
    layout: 'cta',
    highlights: ['Landing-first UX', 'Dashboard second step', 'Creative preload gate', 'Loop-trimmed playback'],
    stats: [
      { value: 'Enter now', label: 'Control terminal handoff' },
      { value: 'Keep ready', label: 'Upload custom videos into /public' },
      { value: 'Ship static', label: 'Vercel-compatible asset routing' },
    ],
  },
]

function useFadingVideo({ src, trimEndSeconds = DEFAULT_TRIM_SECONDS, onReady }: FadingVideoProps) {
  const ref = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = ref.current
    if (!video) return

    let fadeRaf = 0
    let restartTimeout = 0
    let readyEmitted = false
    let fadingOut = false
    let restarting = false

    const fadeTo = (target: number, duration: number) => {
      cancelAnimationFrame(fadeRaf)
      const startOpacity = Number.parseFloat(video.style.opacity || '0') || 0
      const startedAt = performance.now()

      const step = (time: number) => {
        const progress = Math.min(1, (time - startedAt) / duration)
        const nextOpacity = startOpacity + (target - startOpacity) * progress
        video.style.opacity = String(nextOpacity)
        if (progress < 1) {
          fadeRaf = requestAnimationFrame(step)
        }
      }

      fadeRaf = requestAnimationFrame(step)
    }

    const restartLoop = () => {
      if (restarting) return
      restarting = true
      video.style.opacity = '0'
      window.clearTimeout(restartTimeout)
      restartTimeout = window.setTimeout(() => {
        try {
          video.currentTime = 0
        } catch {
          // noop
        }
        fadingOut = false
        restarting = false
        video.play().catch(() => {})
        fadeTo(1, FADE_MS)
      }, 100)
    }

    const handleReady = () => {
      video.style.opacity = '0'
      video.play().catch(() => {})
      fadeTo(1, FADE_MS)
      if (!readyEmitted) {
        readyEmitted = true
        onReady?.()
      }
    }

    const handleTimeUpdate = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0
      if (!duration) return

      const effectiveEnd = Math.max(0.15, duration - trimEndSeconds)
      const remaining = effectiveEnd - video.currentTime

      if (!fadingOut && remaining > 0 && remaining <= FADE_OUT_LEAD) {
        fadingOut = true
        fadeTo(0, FADE_MS)
      }

      if (video.currentTime >= effectiveEnd) {
        restartLoop()
      }
    }

    const handleEnded = () => restartLoop()

    video.style.opacity = '0'
    video.preload = 'auto'
    video.addEventListener('loadeddata', handleReady)
    video.addEventListener('canplay', handleReady)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('ended', handleEnded)
    video.load()

    return () => {
      cancelAnimationFrame(fadeRaf)
      window.clearTimeout(restartTimeout)
      video.removeEventListener('loadeddata', handleReady)
      video.removeEventListener('canplay', handleReady)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('ended', handleEnded)
    }
  }, [onReady, src, trimEndSeconds])

  return ref
}

function FadingVideo({ src, className, style, trimEndSeconds, onReady }: FadingVideoProps) {
  const ref = useFadingVideo({ src, trimEndSeconds, onReady })
  return (
    <video
      ref={ref}
      src={src}
      autoPlay
      muted
      playsInline
      preload="auto"
      className={className}
      style={style}
    />
  )
}

function ArrowUpRight({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  )
}

function PlayIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <polygon points="6 4 20 12 6 20 6 4" />
    </svg>
  )
}

function BlurText({
  text,
  className,
  delayOffset = 0,
}: {
  text: string
  className?: string
  delayOffset?: number
}) {
  const ref = useRef<HTMLParagraphElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.1 })
  const words = useMemo(() => text.split(' '), [text])

  return (
    <p
      ref={ref}
      className={className}
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        rowGap: '0.1em',
      }}
    >
      {words.map((word, index) => (
        <motion.span
          key={`${word}-${index}`}
          initial={{ filter: 'blur(10px)', opacity: 0, y: 50 }}
          animate={
            inView
              ? {
                  filter: ['blur(10px)', 'blur(5px)', 'blur(0px)'],
                  opacity: [0, 0.5, 1],
                  y: [50, -5, 0],
                }
              : { filter: 'blur(10px)', opacity: 0, y: 50 }
          }
          transition={{
            duration: 0.7,
            times: [0, 0.5, 1],
            ease: 'easeOut',
            delay: delayOffset + index * 0.1,
          }}
          style={{ display: 'inline-block', marginRight: '0.28em' }}
        >
          {word}
        </motion.span>
      ))}
    </p>
  )
}

function SectionReveal({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      className={className}
      initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
      whileInView={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.7, ease: 'easeOut', delay }}
    >
      {children}
    </motion.div>
  )
}

function OrbitalLoader({ visible }: { visible: boolean }) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: visible ? 1 : 0, pointerEvents: visible ? 'auto' : 'none' }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="landing-loader"
      aria-hidden={!visible}
    >
      <div className="landing-loader__core">
        <div className="landing-loader__rings">
          <span className="landing-loader__ring landing-loader__ring--outer" />
          <span className="landing-loader__ring landing-loader__ring--middle" />
          <span className="landing-loader__ring landing-loader__ring--inner" />
          <span className="landing-loader__planet" />
        </div>
        <div className="landing-loader__copy">
          <div className="landing-loader__eyebrow">Preparing launch surface</div>
          <div className="landing-loader__title">Crossfading the cinematic stream</div>
          <div className="landing-loader__bar">
            <span className="landing-loader__barFill" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function SectionFrame({
  id,
  video,
  className = '',
  children,
  heroScale = false,
  onReady,
  trimEndSeconds = DEFAULT_TRIM_SECONDS,
}: {
  id?: string
  video: string
  className?: string
  children: React.ReactNode
  heroScale?: boolean
  onReady?: () => void
  trimEndSeconds?: number
}) {
  return (
    <section id={id} className={`section-seam relative min-h-screen w-full overflow-hidden bg-black ${className}`}>
      <FadingVideo
        src={video}
        trimEndSeconds={trimEndSeconds}
        onReady={onReady}
        className={
          heroScale
            ? 'absolute left-1/2 top-0 z-0 -translate-x-1/2 object-cover object-top'
            : 'absolute inset-0 z-0 h-full w-full object-cover'
        }
        style={heroScale ? { width: '120%', height: '120%' } : undefined}
      />
      <div className="relative z-10 min-h-screen">{children}</div>
    </section>
  )
}

function SplitPanelSection({ section }: { section: CreativeSection }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionReveal>
        <div className="mb-6 text-sm font-body text-white/80">// {section.label}</div>
      </SectionReveal>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <SectionReveal>
          <div className="liquid-glass rounded-[2rem] p-8 md:p-10">
            <h2 className="font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl">
              {section.title}
            </h2>
            <p className="mt-6 max-w-2xl font-body text-sm font-light leading-relaxed text-white/90 md:text-base">
              {section.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {section.highlights.map((item) => (
                <span
                  key={item}
                  className="liquid-glass rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/90"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </SectionReveal>
        <SectionReveal delay={0.12}>
          <div className="grid gap-4">
            {section.stats.map((stat, index) => (
              <div key={stat.label} className="liquid-glass rounded-[1.5rem] p-6">
                <div className="text-xs font-body uppercase tracking-[0.18em] text-white/55">
                  Module 0{index + 1}
                </div>
                <div className="mt-3 font-heading text-4xl italic leading-none tracking-[-1px] text-white md:text-5xl">
                  {stat.value}
                </div>
                <p className="mt-2 max-w-[24ch] font-body text-sm font-light leading-relaxed text-white/85">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </SectionReveal>
      </div>
    </div>
  )
}

function SignalGridSection({ section }: { section: CreativeSection }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionReveal>
        <div className="mb-6 text-sm font-body text-white/80">// {section.label}</div>
      </SectionReveal>
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <SectionReveal>
          <div className="liquid-glass rounded-[2rem] p-8 md:p-10">
            <h2 className="font-heading text-5xl italic leading-[0.92] tracking-[-3px] text-white md:text-7xl">
              {section.title}
            </h2>
            <p className="mt-6 max-w-xl font-body text-sm font-light leading-relaxed text-white/90 md:text-base">
              {section.subtitle}
            </p>
          </div>
        </SectionReveal>
        <SectionReveal delay={0.12}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {section.highlights.map((item, index) => (
              <div key={item} className="liquid-glass rounded-[1.5rem] p-5 md:min-h-[180px]">
                <div className="mb-10 text-[11px] font-body uppercase tracking-[0.18em] text-white/55">
                  Seam signal {index + 1}
                </div>
                <div className="font-heading text-3xl italic leading-none tracking-[-1px] text-white">
                  {item}
                </div>
                <p className="mt-3 font-body text-sm font-light leading-relaxed text-white/82">
                  {section.stats[index % section.stats.length].label}
                </p>
              </div>
            ))}
          </div>
        </SectionReveal>
      </div>
      <SectionReveal delay={0.18} className="mt-6">
        <div className="liquid-glass rounded-[1.5rem] p-4 md:p-6">
          <div className="grid gap-4 md:grid-cols-3">
            {section.stats.map((stat) => (
              <div key={stat.label} className="rounded-[1.25rem] bg-white/[0.03] p-4">
                <div className="font-heading text-4xl italic leading-none tracking-[-1px] text-white">
                  {stat.value}
                </div>
                <div className="mt-2 font-body text-sm font-light text-white/82">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </SectionReveal>
    </div>
  )
}

function TimelineSection({ section }: { section: CreativeSection }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionReveal>
        <div className="mb-6 text-sm font-body text-white/80">// {section.label}</div>
      </SectionReveal>
      <SectionReveal>
        <div className="liquid-glass rounded-[2rem] p-8 md:p-10">
          <h2 className="font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl">
            {section.title}
          </h2>
          <p className="mt-6 max-w-3xl font-body text-sm font-light leading-relaxed text-white/90 md:text-base">
            {section.subtitle}
          </p>
        </div>
      </SectionReveal>
      <div className="mt-8 grid gap-4 md:grid-cols-4">
        {section.highlights.map((item, index) => (
          <SectionReveal key={item} delay={0.08 * index}>
            <div className="liquid-glass flex h-full flex-col rounded-[1.5rem] p-5">
              <div className="text-[11px] font-body uppercase tracking-[0.18em] text-white/55">
                Phase {index + 1}
              </div>
              <div className="mt-10 font-heading text-3xl italic leading-none tracking-[-1px] text-white">
                {item}
              </div>
              <div className="mt-4 text-sm font-body font-light leading-relaxed text-white/82">
                {section.stats[index % section.stats.length].value} · {section.stats[index % section.stats.length].label}
              </div>
            </div>
          </SectionReveal>
        ))}
      </div>
    </div>
  )
}

function RadialBandSection({ section }: { section: CreativeSection }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionReveal>
        <div className="mb-6 text-sm font-body text-white/80">// {section.label}</div>
      </SectionReveal>
      <div className="grid items-center gap-6 lg:grid-cols-[0.92fr_1.08fr]">
        <SectionReveal>
          <div className="liquid-glass rounded-[2rem] p-8 md:p-10">
            <h2 className="font-heading text-5xl italic leading-[0.92] tracking-[-3px] text-white md:text-7xl">
              {section.title}
            </h2>
            <p className="mt-6 max-w-xl font-body text-sm font-light leading-relaxed text-white/90 md:text-base">
              {section.subtitle}
            </p>
            <div className="mt-8 space-y-3">
              {section.highlights.map((item) => (
                <div key={item} className="liquid-glass rounded-full px-4 py-2 text-sm text-white/90">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </SectionReveal>
        <SectionReveal delay={0.12}>
          <div className="liquid-glass relative overflow-hidden rounded-[2rem] p-6 md:p-8">
            <div className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.05] blur-3xl" />
            <div className="relative grid gap-4 md:grid-cols-3">
              {section.stats.map((stat) => (
                <div key={stat.label} className="rounded-[1.5rem] bg-white/[0.04] p-5 text-center">
                  <div className="font-heading text-4xl italic leading-none tracking-[-1px] text-white">
                    {stat.value}
                  </div>
                  <div className="mt-3 font-body text-sm font-light leading-relaxed text-white/82">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </SectionReveal>
      </div>
    </div>
  )
}

function CtaSection({ section, onEnter }: { section: CreativeSection; onEnter: () => void }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionReveal>
        <div className="mb-6 text-sm font-body text-white/80">// {section.label}</div>
      </SectionReveal>
      <SectionReveal>
        <div className="liquid-glass rounded-[2rem] p-8 text-center md:p-12">
          <h2 className="mx-auto max-w-4xl font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl">
            {section.title}
          </h2>
          <p className="mx-auto mt-6 max-w-3xl font-body text-sm font-light leading-relaxed text-white/90 md:text-base">
            {section.subtitle}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {section.highlights.map((item) => (
              <span key={item} className="liquid-glass rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/90">
                {item}
              </span>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap justify-center gap-4">
            {section.stats.map((stat) => (
              <div key={stat.label} className="liquid-glass rounded-[1.4rem] px-5 py-4 text-left">
                <div className="font-heading text-3xl italic leading-none tracking-[-1px] text-white">
                  {stat.value}
                </div>
                <div className="mt-2 max-w-[18ch] font-body text-xs font-light leading-relaxed text-white/82">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-6">
            <button
              onClick={onEnter}
              className="liquid-glass-strong inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white"
            >
              Enter the Dashboard
              <ArrowUpRight className="h-5 w-5" />
            </button>
            <a href={`#${SECTION_IDS.hero}`} className="inline-flex items-center gap-2 text-sm font-medium text-white">
              Return to Launch
              <PlayIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </SectionReveal>
    </div>
  )
}

function renderCreativeSection(section: CreativeSection, onEnter: () => void) {
  switch (section.layout) {
    case 'split-panels':
      return <SplitPanelSection section={section} />
    case 'signal-grid':
      return <SignalGridSection section={section} />
    case 'timeline':
      return <TimelineSection section={section} />
    case 'radial-band':
      return <RadialBandSection section={section} />
    case 'cta':
      return <CtaSection section={section} onEnter={onEnter} />
    default:
      return null
  }
}

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [heroReady, setHeroReady] = useState(false)
  const [loaderVisible, setLoaderVisible] = useState(true)
  const navLinks = [
    { label: 'Home', href: `#${SECTION_IDS.hero}` },
    { label: 'Voyages', href: `#${SECTION_IDS.voyages}` },
    { label: 'Worlds', href: `#${SECTION_IDS.worlds}` },
    { label: 'Innovation', href: `#${SECTION_IDS.innovation}` },
    { label: 'Plan Launch', href: `#${SECTION_IDS.planLaunch}` },
  ]

  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => setLoaderVisible(false), 2600)
    return () => window.clearTimeout(fallbackTimer)
  }, [])

  useEffect(() => {
    if (!heroReady) return
    const timer = window.setTimeout(() => setLoaderVisible(false), 500)
    return () => window.clearTimeout(timer)
  }, [heroReady])

  useEffect(() => {
    const preloaders = [HERO_VIDEO, CAP_VIDEO, ...EXTRA_VIDEOS].map((src) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.src = src
      return video
    })

    return () => {
      preloaders.forEach((video) => {
        video.removeAttribute('src')
        video.load()
      })
    }
  }, [])

  return (
    <div className="lp-root font-body relative w-full overflow-x-hidden bg-black">
      <OrbitalLoader visible={loaderVisible} />

      <SectionFrame
        id={SECTION_IDS.hero}
        video={HERO_VIDEO}
        heroScale
        onReady={() => setHeroReady(true)}
        trimEndSeconds={1.4}
      >
        <div className="relative flex h-screen flex-col">
          <nav className="fixed left-0 right-0 top-4 z-50 flex items-center justify-between px-8 lg:px-16">
            <a
              href={`#${SECTION_IDS.hero}`}
              className="liquid-glass flex h-12 w-12 items-center justify-center rounded-full"
              aria-label="Akashara Home"
            >
              <span className="font-heading text-2xl italic text-white">a</span>
            </a>
            <div className="liquid-glass hidden items-center gap-0 rounded-full px-1.5 py-1.5 md:flex">
              {navLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="px-3 py-2 text-sm font-medium text-white/90 font-body"
                >
                  {item.label}
                </a>
              ))}
              <button
                onClick={onEnter}
                className="ml-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-3 py-2 text-sm font-medium text-black"
              >
                Claim a Spot
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
            <div className="h-12 w-12" />
          </nav>

          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pt-24 text-center">
            <motion.div
              initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
              animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.4 }}
              className="liquid-glass mb-8 inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3"
            >
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                New
              </span>
              <span className="pr-3 text-sm text-white/90">
                Maiden Crewed Voyage to Mars Arrives 2026
              </span>
            </motion.div>

            <BlurText
              text="Venture Past Our Sky Across the Universe"
              className="text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic text-white leading-[0.8] max-w-2xl justify-center tracking-[-4px]"
              delayOffset={0.5}
            />

            <motion.p
              initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
              animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.8 }}
              className="mt-4 max-w-2xl font-body text-sm font-light leading-tight text-white md:text-base"
            >
              Discover the universe in ways once unimaginable. Our pioneering vessels and
              breakthrough engineering bring deep-space exploration within reach—secure and
              extraordinary.
            </motion.p>

            <motion.div
              initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
              animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 1.1 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-6"
            >
              <button
                onClick={onEnter}
                className="liquid-glass-strong inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white"
              >
                Start Your Voyage
                <ArrowUpRight className="h-5 w-5" />
              </button>
              <a href={`#${SECTION_IDS.capabilities}`} className="inline-flex items-center gap-2 text-sm font-medium text-white">
                View Liftoff
                <PlayIcon className="h-4 w-4" />
              </a>
            </motion.div>

            <motion.div
              initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
              animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 1.3 }}
              className="mt-8 flex flex-wrap items-stretch justify-center gap-4"
            >
              <div className="liquid-glass w-[220px] rounded-[1.25rem] p-5">
                <svg
                  className="h-7 w-7 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" strokeLinecap="round" />
                </svg>
                <div className="mt-3 font-heading text-4xl italic leading-none tracking-[-1px] text-white">
                  34.5 Min
                </div>
                <div className="mt-2 font-body text-xs font-light text-white">
                  Average Videos Watch Time
                </div>
              </div>
              <div className="liquid-glass w-[220px] rounded-[1.25rem] p-5">
                <svg
                  className="h-7 w-7 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" />
                  <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                </svg>
                <div className="mt-3 font-heading text-4xl italic leading-none tracking-[-1px] text-white">
                  2.8B+
                </div>
                <div className="mt-2 font-body text-xs font-light text-white">
                  Users Across the Globe
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
            animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 1.4 }}
            className="relative z-10 pb-8"
          >
            <div className="flex flex-col items-center gap-4 px-4 text-center">
              <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white">
                Collaborating with top aerospace pioneers globally
              </div>
              <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
                {['Aeon', 'Vela', 'Apex', 'Orbit', 'Zeno'].map((name) => (
                  <span key={name} className="font-heading text-2xl italic tracking-tight text-white md:text-3xl">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </SectionFrame>

      <SectionFrame id={SECTION_IDS.capabilities} video={CAP_VIDEO} className="landing-stack-section">
        <div className="relative flex min-h-screen flex-col px-8 pb-10 pt-24 md:px-16 lg:px-20">
          <header className="mb-auto">
            <SectionReveal>
              <div className="mb-6 text-sm font-body text-white/80">// Capabilities</div>
            </SectionReveal>
            <SectionReveal delay={0.08}>
              <h2 className="font-heading text-6xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl lg:text-[6rem]">
                Production
                <br />
                evolved
              </h2>
            </SectionReveal>
          </header>

          <div className="mt-16 grid grid-cols-1 gap-6 md:grid-cols-3">
            {capabilities.map((card, index) => (
              <SectionReveal key={card.title} delay={0.08 * index}>
                <div className="liquid-glass flex min-h-[360px] flex-col rounded-[1.25rem] p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="liquid-glass flex h-11 w-11 items-center justify-center rounded-[0.75rem]">
                      <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <path d={card.iconPath} />
                      </svg>
                    </div>
                    <div className="flex max-w-[70%] flex-wrap justify-end gap-1.5">
                      {card.tags.map((tag) => (
                        <span
                          key={tag}
                          className="liquid-glass whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-body text-white/90"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex-1" />
                  <div className="mt-6">
                    <h3 className="font-heading text-3xl italic leading-none tracking-[-1px] text-white md:text-4xl">
                      {card.title}
                    </h3>
                    <p className="mt-3 max-w-[32ch] font-body text-sm font-light leading-snug text-white/90">
                      {card.body}
                    </p>
                  </div>
                </div>
              </SectionReveal>
            ))}
          </div>
        </div>
      </SectionFrame>

      {creativeSections.map((section) => (
        <SectionFrame key={section.id} id={section.id} video={section.video} className="landing-stack-section">
          {renderCreativeSection(section, onEnter)}
        </SectionFrame>
      ))}
    </div>
  )
}
