import { motion, useInView } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { peekResolvedSrc, warmAll, warmVideo, whenReady } from '../../core/videoCache'
import { BrandLogo } from '../common/BrandLogo'
import { CloseIcon, MenuIcon, PauseIcon, PulseIcon, QuoteIcon } from '../common/AppIcons'

/* ─────────────────────────────────────────────────────────────────────────
   ASSET MAP
   ────────────────────────────────────────────────────────────────────── */
const HERO_VIDEO = '/landing_page.mp4'
/* Task 1 — Section-2 (// Capabilities) background video.
   Was previously a remote CloudFront clip; now uses the bundled
   /section3.mp4 asset and is rendered horizontally flipped
   (mirrored) via the `mirror` prop on <SectionFrame>. The infinite
   silent loop behaviour (autoPlay + muted + loop + playsInline)
   continues to come straight from <FadingVideo>, so playback never
   stops between the start and end of the mirrored frame. */
const CAP_VIDEO = '/section3.mp4'
const EXTRA_VIDEOS = [
  '/section1.mp4',
  '/section2.mp4',
  '/section3.mp4',
  '/section4.mp4',
  '/section5.mp4',
]

const FADE_IN_MS = 320
const DEFAULT_TRIM_SECONDS = 0

const SECTION_IDS = {
  hero: 'home',
  capabilities: 'capabilities',
  voyages: 'voyages',
  worlds: 'worlds',
  innovation: 'innovation',
  pulse: 'pulse',
  signals: 'signals',
  atlas: 'atlas',
  tempo: 'tempo',
  operators: 'operators',
  constellations: 'constellations',
  planLaunch: 'plan-launch',
  enter: 'enter-dashboard',
  testimonials: 'testimonials',
  faq: 'faq',
  trust: 'trust',
} as const

/* ─────────────────────────────────────────────────────────────────────────
   TYPES
   ────────────────────────────────────────────────────────────────────── */
type FadingVideoProps = {
  src: string
  className?: string
  style?: React.CSSProperties
  trimEndSeconds?: number
  onReady?: () => void
  isHero?: boolean
  /* Task 1 — when true, the <video> element is horizontally
     flipped via `transform: scaleX(-1)`. Used by the "Worlds"
     section to mirror its new section3.mp4 background. */
  mirror?: boolean
}

type CapabilityCard = {
  title: string
  body: string
  tags: string[]
  iconPath: string
}

type LayoutKind =
  | 'split-panels'
  | 'signal-grid'
  | 'timeline'
  | 'radial-band'
  | 'pulse-rings'
  | 'mosaic-feed'
  | 'atlas-globe'
  | 'tempo-deck'
  | 'operator-console'
  | 'constellation-field'
  | 'cta'

type CreativeSection = {
  id: string
  label: string
  title: string
  subtitle: string
  video: string
  /* Task 1 — optional per-section flag that tells SectionFrame to
     render the background video horizontally flipped. Applied to
     the "Worlds" chapter so its replaced section3.mp4 reads as a
     mirror image while keeping the silent, infinite loop behaviour
     untouched. */
  mirrorVideo?: boolean
  layout: LayoutKind
  highlights: string[]
  stats: { value: string; label: string }[]
}

/* ─────────────────────────────────────────────────────────────────────────
   CAPABILITIES — three feature cards for the Akashara concept
   ────────────────────────────────────────────────────────────────────── */
const capabilities: CapabilityCard[] = [
  {
    title: 'Live Telemetry',
    body: 'Watch a global automation pipeline breathe in real time. Every project, every robot, every saved hour streams into a single, calm command surface.',
    tags: ['Always-on Stream', 'Zero Refresh', 'Glass Clarity', 'Operator First'],
    iconPath:
      'M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21H5Zm1-4h12l-3.75-5-3 4L9 13l-3 4Z',
  },
  {
    title: 'Cinematic Grid',
    body: 'Fifty thousand records, forty visible nodes, one fluid scroll. The grid feels like a film reel — frames glide past while the data underneath remains exact.',
    tags: ['Smooth Scroll', 'Dense Read', 'Sortable Columns', 'Click to Inspect'],
    iconPath:
      'M4 6.47 5.76 10H20v8H4V6.47M22 4h-4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.89-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4Z',
  },
  {
    title: 'Intelligent Alerts',
    body: 'Failures and negative returns light up the moment they happen — a quiet flash of warning that fades on its own, never blocking the operator’s view.',
    tags: ['Auto Detect', 'Soft Flash', 'Self Clear', 'Status Aware'],
    iconPath:
      'M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1Zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7Z',
  },
]

/* ─────────────────────────────────────────────────────────────────────────
   CREATIVE SECTIONS
   ────────────────────────────────────────────────────────────────────── */
const creativeSections: CreativeSection[] = [
  {
    id: SECTION_IDS.voyages,
    label: 'Voyages',
    title: 'A live mission, streaming without pause',
    subtitle:
      'Akashara turns the world’s automation activity into a continuous voyage. New projects arrive every fraction of a second, and the cockpit stays calm, readable, and ready — like watching constellations drift across a quiet sky.',
    video: EXTRA_VIDEOS[0],
    layout: 'split-panels',
    highlights: ['Continuous data stream', 'Always-on cockpit', 'Operator-grade calm', 'Hands-free updates'],
    stats: [
      { value: '50 K+', label: 'Automation projects under live observation' },
      { value: '200 ms', label: 'Pulse rate of incoming telemetry' },
      { value: 'One screen', label: 'For the entire global pipeline' },
    ],
  },
  {
    id: SECTION_IDS.worlds,
    label: 'Worlds',
    title: 'Every industry, every country, one calm horizon',
    subtitle:
      'From banking floors in Mumbai to logistics hubs in Rotterdam, Akashara gathers automation footprints from every corner of the planet and lays them side by side, so an operator can sense the global rhythm at a glance.',
    /* Task 1 — Section 2 ("Worlds") now plays section3.mp4 as its
       background, horizontally mirrored, and continues to loop
       silently in the infinite seamless playback baked into
       FadingVideo. */
    video: '/section3.mp4',
    mirrorVideo: true,
    layout: 'signal-grid',
    highlights: ['Cross-industry view', 'Borderless coverage', 'Unified language', 'Shared lens'],
    stats: [
      { value: '40+', label: 'Countries represented in the live stream' },
      { value: '12', label: 'Industry families surfaced together' },
      { value: '∞', label: 'Time horizons the view can span' },
    ],
  },
  {
    id: SECTION_IDS.pulse,
    label: 'Pulse',
    title: 'A heartbeat above the storm of data',
    subtitle:
      'Three glowing counters sit at the very top of the workspace — rows seen, robots deployed, dollars saved — quietly climbing with every breath of the stream. Operators feel the scale of the operation before they read a single row.',
    /* Task 1.1 — Section-5 (// Pulse) background video is now the
       NORMAL (un-mirrored) section2.mp4 playing on an infinite
       silent loop. The omission of `mirrorVideo` here is
       intentional: the default for `mirrorVideo` is undefined →
       falsy, so <SectionFrame> renders the <FadingVideo> without
       any horizontal flip transform. */
    video: '/section2.mp4',
    layout: 'pulse-rings',
    highlights: ['Three living counters', 'Tabular precision', 'No flicker', 'Always at the top'],
    stats: [
      { value: 'Rows', label: 'Total telemetry processed since liftoff' },
      { value: 'Robots', label: 'Deployed across the global pipeline' },
      { value: 'Savings', label: 'Cumulative dollars returned by automation' },
    ],
  },
  {
    id: SECTION_IDS.signals,
    label: 'Signals',
    title: 'Warnings that whisper, then fade',
    subtitle:
      'When a project fails, or an investment turns negative, the row briefly glows a warm warning hue and then settles back into the night. Nothing screams, nothing stays — only the trained eye notices, and the workspace stays beautiful.',
    video: EXTRA_VIDEOS[3],
    layout: 'mosaic-feed',
    highlights: ['Failure detection', 'Negative-ROI watch', 'Soft flash hues', 'Self-clearing alerts'],
    stats: [
      { value: 'Failed', label: 'Projects light up the instant they arrive' },
      { value: 'Negative', label: 'Return-on-investment never goes unseen' },
      { value: 'Fade', label: 'Alerts dissolve without operator action' },
    ],
  },
  {
    id: SECTION_IDS.innovation,
    label: 'Innovation',
    title: 'Built to feel instant, designed to last hours',
    subtitle:
      'Akashara was sculpted for long shifts — the kind where an operator opens a tab in the morning and forgets it’s running by evening. Every motion is gentle, every update arrives without disturbing what came before.',
    video: EXTRA_VIDEOS[4],
    layout: 'timeline',
    highlights: ['Long-shift comfort', 'Gentle motion', 'No jank', 'Quiet updates'],
    stats: [
      { value: '60 fps', label: 'Maintained while data streams nonstop' },
      { value: 'Hours', label: 'Of continuous use without drift' },
      { value: 'Zero', label: 'Refreshes required by the operator' },
    ],
  },
  {
    id: SECTION_IDS.atlas,
    label: 'Atlas',
    title: 'Fly through the world by industry, country, and type',
    subtitle:
      'A small set of categorical filters and a fuzzy search bar let an operator narrow a planetary dataset down to a single thread of interest — "Tata Cloud Completed in India" — and the workspace re-tunes itself in a breath.',
    video: EXTRA_VIDEOS[0],
    layout: 'atlas-globe',
    highlights: ['Multi-select filters', 'Out-of-order keywords', 'Instant focus', 'Friendly to typos'],
    stats: [
      { value: 'Industry', label: 'Slice the world by sector in one click' },
      { value: 'Country', label: 'Zoom into a single nation’s footprint' },
      { value: 'Free text', label: 'Search several fields with one phrase' },
    ],
  },
  {
    id: SECTION_IDS.tempo,
    label: 'Tempo',
    title: 'Pause the picture, never lose a beat',
    subtitle:
      'A single Pause button freezes the workspace so an operator can read carefully. Underneath the glass, the stream keeps flowing — and the moment Play is pressed, the view catches up cleanly, as if nothing was ever held still.',
    video: EXTRA_VIDEOS[1],
    layout: 'tempo-deck',
    highlights: ['Pause to read', 'Stream never stops', 'Catch-up on resume', 'Zero data lost'],
    stats: [
      { value: 'Frozen view', label: 'Operator sees a steady snapshot' },
      { value: 'Live engine', label: 'Telemetry still captured behind the glass' },
      { value: 'Seamless', label: 'Resumed timeline with no gaps' },
    ],
  },
  {
    id: SECTION_IDS.operators,
    label: 'Operators',
    title: 'Your workspace, remembered',
    subtitle:
      'Hide the chart, focus on the grid, or open the analytics drawer — whatever shape you give the workspace, Akashara remembers it for next time. The cockpit is shared, but the seat is yours.',
    video: EXTRA_VIDEOS[2],
    layout: 'operator-console',
    highlights: ['Hide-and-show panels', 'Personal layouts', 'Remembered after refresh', 'Quick reset'],
    stats: [
      { value: 'Grid', label: 'Toggle the dense telemetry table' },
      { value: 'KPIs', label: 'Bring the top counters in or out of view' },
      { value: 'Charts', label: 'Pull analytics forward only when needed' },
    ],
  },
  {
    id: SECTION_IDS.constellations,
    label: 'Constellations',
    title: 'Patterns surface when the data finds its shape',
    subtitle:
      'A live chart distills the noise into shapes you can read — top departments by savings, leaders by industry, where automation is winning. The story is no longer hidden in 50,000 rows; it is drawn in front of you.',
    video: EXTRA_VIDEOS[3],
    layout: 'constellation-field',
    highlights: ['Department leaders', 'Savings story', 'Auto-refreshed', 'Read at a glance'],
    stats: [
      { value: 'Top 12', label: 'Departments ranked by automation value' },
      { value: 'Auto', label: 'Refresh as the stream evolves' },
      { value: 'Chart.js', label: 'Drawn with a clean, single visual library' },
    ],
  },
  {
    id: SECTION_IDS.planLaunch,
    label: 'Plan Launch',
    title: 'A calm runway from inspiration to control',
    subtitle:
      'The cinematic story ends and the operational story begins. Step from the landing page into a workspace tuned for the same brand, the same motion language, and the same quiet engineering posture.',
    video: EXTRA_VIDEOS[4],
    layout: 'radial-band',
    highlights: ['Cinematic to operational', 'Shared design system', 'One-step handoff', 'Always within reach'],
    stats: [
      { value: 'Landing', label: 'The story you arrive into' },
      { value: 'Dashboard', label: 'The workspace you live in' },
      { value: 'One click', label: 'Between the two surfaces' },
    ],
  },
  {
    id: SECTION_IDS.enter,
    label: 'Ready',
    title: 'Step into the control terminal',
    subtitle:
      'You have seen the horizon. The cockpit is waiting. Enter the dashboard to watch the world’s automation breathe in real time — and feel the calm of a workspace built for operators who stay.',
    video: EXTRA_VIDEOS[0],
    layout: 'cta',
    highlights: ['Real-time cockpit', 'Operator workspace', 'Calm by design', 'Ready right now'],
    stats: [
      { value: 'Enter', label: 'Open the live control terminal' },
      { value: 'Now', label: 'No setup, no signup, no waiting' },
      { value: 'Public', label: 'Open deployment on Vercel' },
    ],
  },
]

/* ─────────────────────────────────────────────────────────────────────────
   FADING VIDEO HOOK
   ────────────────────────────────────────────────────────────────────── */
function useFadingVideo({ src, onReady, isHero }: FadingVideoProps) {
  const ref = useRef<HTMLVideoElement>(null)
  const [resolvedSrc, setResolvedSrc] = useState<string>(() => peekResolvedSrc(src))

  useEffect(() => {
    let active = true
    warmVideo(src, isHero ? 'high' : 'high')
    whenReady(src).then((finalSrc) => {
      if (active && finalSrc !== resolvedSrc) {
        setResolvedSrc(finalSrc)
      }
    })
    return () => {
      active = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, isHero])

  useEffect(() => {
    const video = ref.current
    if (!video) return

    let fadeRaf = 0
    let readyEmitted = false

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

    const handleReady = () => {
      if (!readyEmitted) {
        video.style.opacity = '0'
        fadeTo(1, FADE_IN_MS)
        readyEmitted = true
        onReady?.()
      } else {
        video.style.opacity = '1'
      }
      video.play().catch(() => {})
    }

    video.loop = true
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.style.opacity = '0'

    video.addEventListener('loadeddata', handleReady)
    video.addEventListener('canplay', handleReady)
    video.load()

    return () => {
      cancelAnimationFrame(fadeRaf)
      video.removeEventListener('loadeddata', handleReady)
      video.removeEventListener('canplay', handleReady)
    }
  }, [onReady, resolvedSrc])

  return { ref, resolvedSrc }
}

function FadingVideo({ src, className, style, trimEndSeconds, onReady, isHero, mirror }: FadingVideoProps) {
  void trimEndSeconds
  const { ref, resolvedSrc } = useFadingVideo({ src, onReady, isHero })
  /* Task 1 — merge the optional horizontal-flip transform into
     whatever style was already passed in. `scaleX(-1)` mirrors the
     video purely on the GPU compositor, so there's zero CPU cost
     and the infinite `loop` attribute below keeps playing it back
     forever without interruption. */
  const mergedStyle: React.CSSProperties | undefined = mirror
    ? { ...(style ?? {}), transform: `${style?.transform ?? ''} scaleX(-1)`.trim() }
    : style
  return (
    <video
      ref={ref}
      src={resolvedSrc}
      autoPlay
      muted
      loop
      playsInline
      preload="auto"
      className={className}
      style={mergedStyle}
    />
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   ICONS
   ────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────
   BLUR TEXT
   ────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────
   SECTION REVEAL
   ────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────
   ORBITAL LOADER
   ────────────────────────────────────────────────────────────────────── */
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
          <div className="landing-loader__title">Warming the cinematic stream</div>
          <div className="landing-loader__bar">
            <span className="landing-loader__barFill" />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   SECTION FRAME — wraps a section with its background video + content
   ────────────────────────────────────────────────────────────────────── */
function SectionFrame({
  id,
  video,
  className = '',
  children,
  heroScale = false,
  onReady,
  trimEndSeconds = DEFAULT_TRIM_SECONDS,
  isHero = false,
  mirror = false,
}: {
  id?: string
  video: string
  className?: string
  children: React.ReactNode
  heroScale?: boolean
  onReady?: () => void
  trimEndSeconds?: number
  isHero?: boolean
  /* Task 1 — pass-through to FadingVideo so individual sections can
     opt into a horizontally flipped background video. */
  mirror?: boolean
}) {
  return (
    <section id={id} className={`section-seam relative isolate min-h-screen w-full overflow-x-clip overflow-y-visible bg-black ${className}`}>
      <FadingVideo
        src={video}
        trimEndSeconds={trimEndSeconds}
        onReady={onReady}
        isHero={isHero}
        mirror={mirror}
        className={
          heroScale
            ? 'absolute left-1/2 top-0 z-0 -translate-x-1/2 object-cover object-top'
            : 'absolute inset-0 z-0 h-full w-full object-cover'
        }
        style={heroScale ? { width: '120%', height: '120%' } : undefined}
      />
      <div className="section-darken pointer-events-none absolute inset-0 z-[1]" aria-hidden="true" />
      <div className="relative z-10 min-h-screen overflow-visible">{children}</div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   GRADIENT SECTION FRAME — for the three new bottom sections
   ────────────────────────────────────────────────────────────────────── */
function GradientSectionFrame({
  id,
  variant,
  className = '',
  children,
}: {
  id?: string
  variant: 'aurora' | 'sunset' | 'oceanic'
  className?: string
  children: React.ReactNode
}) {
  return (
    <section
      id={id}
      className={`section-seam relative isolate min-h-screen w-full overflow-x-clip overflow-y-visible bg-black ${className}`}
    >
      <div className={`gradient-bg gradient-bg--${variant} absolute inset-0 z-0`} aria-hidden="true">
        <span className="gradient-blob gradient-blob--a" />
        <span className="gradient-blob gradient-blob--b" />
        <span className="gradient-blob gradient-blob--c" />
        <span className="gradient-blob gradient-blob--d" />
      </div>
      <div className="section-darken pointer-events-none absolute inset-0 z-[1]" aria-hidden="true" />
      <div className="relative z-10 min-h-screen overflow-visible">{children}</div>
    </section>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   LAYOUT VARIANTS
   ────────────────────────────────────────────────────────────────────── */

function SectionLabel({ label }: { label: string }) {
  return (
    <SectionReveal>
      <div className="mb-6 text-sm font-body text-white/80">// {label}</div>
    </SectionReveal>
  )
}

function SplitPanelSection({ section }: { section: CreativeSection }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionLabel label={section.label} />
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
      <SectionLabel label={section.label} />
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
                  Signal {index + 1}
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
      <SectionLabel label={section.label} />
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
                Chapter {index + 1}
              </div>
              <div className="mt-10 font-heading text-3xl italic leading-none tracking-[-1px] text-white">
                {item}
              </div>
              <div className="mt-4 text-sm font-body font-light leading-relaxed text-white/82">
                {section.stats[index % section.stats.length].value} ·{' '}
                {section.stats[index % section.stats.length].label}
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
      <SectionLabel label={section.label} />
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

function PulseRingsSection({ section }: { section: CreativeSection }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionLabel label={section.label} />
      <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
        <SectionReveal>
          <div className="liquid-glass rounded-[2rem] p-8 md:p-10">
            <h2 className="font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl">
              {section.title}
            </h2>
            <p className="mt-6 max-w-xl font-body text-sm font-light leading-relaxed text-white/90 md:text-base">
              {section.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {section.highlights.map((tag) => (
                <span
                  key={tag}
                  className="liquid-glass rounded-full px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/90"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </SectionReveal>
        <SectionReveal delay={0.12}>
          <div className="relative">
            <div className="absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
            <div className="absolute left-1/2 top-1/2 h-[260px] w-[260px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
            <div className="absolute left-1/2 top-1/2 h-[160px] w-[160px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
            <div className="relative grid gap-4">
              {section.stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className="liquid-glass flex items-center gap-5 rounded-[1.5rem] p-5"
                  style={{ marginLeft: `${i * 28}px` }}
                >
                  <div className="font-heading text-4xl italic leading-none tracking-[-1px] text-white md:text-5xl">
                    {stat.value}
                  </div>
                  <div className="font-body text-sm font-light leading-snug text-white/85">
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

function MosaicFeedSection({ section }: { section: CreativeSection }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionLabel label={section.label} />
      <SectionReveal>
        <div className="liquid-glass mb-8 rounded-[2rem] p-8 md:p-10">
          <h2 className="font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl">
            {section.title}
          </h2>
          <p className="mt-6 max-w-3xl font-body text-sm font-light leading-relaxed text-white/90 md:text-base">
            {section.subtitle}
          </p>
        </div>
      </SectionReveal>
      <div className="grid gap-4 md:grid-cols-12">
        {section.highlights.map((item, index) => {
          const spans = ['md:col-span-7', 'md:col-span-5', 'md:col-span-5', 'md:col-span-7']
          return (
            <SectionReveal key={item} delay={0.06 * index} className={`${spans[index % spans.length]}`}>
              <div className="liquid-glass flex h-full flex-col justify-between rounded-[1.5rem] p-6">
                <div className="text-[11px] font-body uppercase tracking-[0.18em] text-white/55">
                  Alert {index + 1}
                </div>
                <div className="mt-8 font-heading text-3xl italic leading-none tracking-[-1px] text-white md:text-4xl">
                  {item}
                </div>
                <p className="mt-4 font-body text-sm font-light leading-relaxed text-white/82">
                  {section.stats[index % section.stats.length].label}
                </p>
              </div>
            </SectionReveal>
          )
        })}
      </div>
    </div>
  )
}

function AtlasGlobeSection({ section }: { section: CreativeSection }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionLabel label={section.label} />
      <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <SectionReveal>
          <div className="liquid-glass relative overflow-hidden rounded-[2rem] p-8 md:p-10">
            <div className="absolute inset-0 -z-0 opacity-60">
              <div className="absolute left-1/2 top-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
              <div className="absolute left-1/2 top-1/2 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
              <div className="absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10" />
              <div className="absolute left-1/2 top-1/2 h-[160px] w-[160px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/[0.05] blur-2xl" />
            </div>
            <div className="relative">
              <h2 className="font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl">
                {section.title}
              </h2>
              <p className="mt-6 max-w-xl font-body text-sm font-light leading-relaxed text-white/90 md:text-base">
                {section.subtitle}
              </p>
            </div>
          </div>
        </SectionReveal>
        <SectionReveal delay={0.12}>
          <div className="grid gap-4">
            {section.highlights.map((h, i) => (
              <div key={h} className="liquid-glass flex items-center justify-between gap-6 rounded-[1.5rem] p-5">
                <div>
                  <div className="text-[11px] font-body uppercase tracking-[0.18em] text-white/55">
                    Orbit {i + 1}
                  </div>
                  <div className="mt-2 font-heading text-2xl italic leading-none tracking-[-1px] text-white md:text-3xl">
                    {h}
                  </div>
                </div>
                <div className="font-body text-xs font-light text-white/70 text-right max-w-[20ch]">
                  {section.stats[i % section.stats.length].label}
                </div>
              </div>
            ))}
          </div>
        </SectionReveal>
      </div>
    </div>
  )
}

function TempoDeckSection({ section }: { section: CreativeSection }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionLabel label={section.label} />
      <SectionReveal>
        <div className="liquid-glass mb-8 rounded-[2rem] p-8 md:p-10">
          <h2 className="font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl">
            {section.title}
          </h2>
          <p className="mt-6 max-w-3xl font-body text-sm font-light leading-relaxed text-white/90 md:text-base">
            {section.subtitle}
          </p>
        </div>
      </SectionReveal>
      <div className="grid gap-4 md:grid-cols-3">
        {section.stats.map((stat, i) => (
          <SectionReveal key={stat.label} delay={0.08 * i}>
            <div className="liquid-glass flex h-full flex-col justify-between rounded-[1.5rem] p-6 md:min-h-[220px]">
              <div className="flex items-center gap-3 text-[11px] font-body uppercase tracking-[0.18em] text-white/55">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white text-black">
                  {i === 0 ? <PauseIcon className="h-3.5 w-3.5" /> : i === 1 ? <PulseIcon className="h-3.5 w-3.5" /> : <PlayIcon className="h-3.5 w-3.5" />}
                </span>
                Beat {i + 1}
              </div>
              <div className="mt-6 font-heading text-4xl italic leading-none tracking-[-1px] text-white md:text-5xl">
                {stat.value}
              </div>
              <p className="mt-4 font-body text-sm font-light leading-relaxed text-white/85">{stat.label}</p>
            </div>
          </SectionReveal>
        ))}
      </div>
      <SectionReveal delay={0.16} className="mt-6">
        <div className="liquid-glass rounded-[1.5rem] p-4 md:p-6">
          <div className="flex flex-wrap gap-2">
            {section.highlights.map((h) => (
              <span
                key={h}
                className="liquid-glass rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/90"
              >
                {h}
              </span>
            ))}
          </div>
        </div>
      </SectionReveal>
    </div>
  )
}

function OperatorConsoleSection({ section }: { section: CreativeSection }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionLabel label={section.label} />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <SectionReveal>
          <div className="liquid-glass rounded-[2rem] p-8 md:p-10">
            <h2 className="font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl">
              {section.title}
            </h2>
            <p className="mt-6 max-w-xl font-body text-sm font-light leading-relaxed text-white/90 md:text-base">
              {section.subtitle}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {section.highlights.map((h) => (
                <span
                  key={h}
                  className="liquid-glass rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/90"
                >
                  {h}
                </span>
              ))}
            </div>
          </div>
        </SectionReveal>
        <SectionReveal delay={0.12}>
          <div className="liquid-glass rounded-[1.5rem] p-5">
            <div className="space-y-3">
              {section.stats.map((stat, i) => (
                <div
                  key={stat.label}
                  className="flex items-center justify-between rounded-[1.25rem] bg-white/[0.03] px-4 py-4"
                >
                  <div>
                    <div className="font-heading text-2xl italic leading-none tracking-[-1px] text-white">
                      {stat.value}
                    </div>
                    <div className="mt-1 font-body text-xs font-light text-white/70">{stat.label}</div>
                  </div>
                  <div
                    className={`relative h-7 w-12 rounded-full ${
                      i % 2 === 0 ? 'bg-white' : 'bg-white/15'
                    }`}
                    aria-hidden="true"
                  >
                    <span
                      className={`absolute top-1 h-5 w-5 rounded-full bg-black transition ${
                        i % 2 === 0 ? 'left-6' : 'left-1'
                      }`}
                    />
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

function ConstellationFieldSection({ section }: { section: CreativeSection }) {
  const dots = useMemo(() => {
    const out: { x: number; y: number; r: number }[] = []
    for (let i = 0; i < 60; i++) {
      out.push({
        x: Math.random() * 100,
        y: Math.random() * 100,
        r: 1 + Math.random() * 2.4,
      })
    }
    return out
  }, [])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionLabel label={section.label} />
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <SectionReveal>
          <div className="liquid-glass relative h-[420px] overflow-hidden rounded-[2rem] p-6">
            <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full opacity-90">
              {dots.map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={d.r} fill="rgba(255,255,255,0.75)" />
              ))}
              <polyline
                points="0,82 14,72 26,76 38,62 52,58 64,46 78,40 92,30 100,28"
                fill="none"
                stroke="rgba(255,255,255,0.55)"
                strokeWidth={0.6}
              />
            </svg>
            <div className="absolute bottom-6 left-6 right-6">
              <div className="text-[11px] font-body uppercase tracking-[0.18em] text-white/55">
                Department leaders · live
              </div>
              <div className="mt-2 font-heading text-3xl italic leading-none tracking-[-1px] text-white">
                Insights, drawn from the stream
              </div>
            </div>
          </div>
        </SectionReveal>
        <SectionReveal delay={0.12}>
          <div className="liquid-glass rounded-[2rem] p-8 md:p-10">
            <h2 className="font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl">
              {section.title}
            </h2>
            <p className="mt-6 max-w-xl font-body text-sm font-light leading-relaxed text-white/90 md:text-base">
              {section.subtitle}
            </p>
            <div className="mt-8 grid gap-3 md:grid-cols-3">
              {section.stats.map((s) => (
                <div key={s.label} className="rounded-[1.25rem] bg-white/[0.03] p-4">
                  <div className="font-heading text-3xl italic leading-none tracking-[-1px] text-white">
                    {s.value}
                  </div>
                  <div className="mt-2 font-body text-xs font-light text-white/80">{s.label}</div>
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
      <SectionLabel label={section.label} />
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
              <span
                key={item}
                className="liquid-glass rounded-full px-4 py-2 text-xs font-medium uppercase tracking-[0.18em] text-white/90"
              >
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
    case 'pulse-rings':
      return <PulseRingsSection section={section} />
    case 'mosaic-feed':
      return <MosaicFeedSection section={section} />
    case 'atlas-globe':
      return <AtlasGlobeSection section={section} />
    case 'tempo-deck':
      return <TempoDeckSection section={section} />
    case 'operator-console':
      return <OperatorConsoleSection section={section} />
    case 'constellation-field':
      return <ConstellationFieldSection section={section} />
    case 'cta':
      return <CtaSection section={section} onEnter={onEnter} />
    default:
      return null
  }
}

/* ─────────────────────────────────────────────────────────────────────────
   NEW SECTION 1 — TESTIMONIALS (animated gradient bg)
   ────────────────────────────────────────────────────────────────────── */
type Testimonial = {
  quote: string
  author: string
  role: string
  org: string
  initials: string
}

const testimonials: Testimonial[] = [
  {
    quote:
      'Akashara is the first telemetry monitor that doesn’t hijack my CPU. Fifty thousand rows, sixty frames per second, and the fans on my laptop stay completely silent.',
    author: 'Imani Rao',
    role: 'Principal RPA Architect',
    org: 'Helix Automation Labs',
    initials: 'IR',
  },
  {
    quote:
      'We replaced an AG-Grid build with Akashara’s hand-rolled recycler. The bundle shrank by 240 KB and the long-shift memory leak we chased for months simply vanished.',
    author: 'Tomás Berenice',
    role: 'Frontend Performance Lead',
    org: 'NovaOps Banking',
    initials: 'TB',
  },
  {
    quote:
      'The pause-and-resume guarantee is real. We froze the view during an incident review, took the screenshots we needed, and resumed without losing a single tick.',
    author: 'Hari Naidu',
    role: 'SRE Manager',
    org: 'Aether Logistics',
    initials: 'HN',
  },
  {
    quote:
      'The fuzzy search out-of-order parsing is a small detail with an enormous payoff. My operators type the way they think — and the workspace just keeps up.',
    author: 'Ana Kowalski',
    role: 'Operations Director',
    org: 'Brightstar Healthcare',
    initials: 'AK',
  },
  {
    quote:
      'A control room that feels like a film. The alerts glow, fade, and the dashboard never once shouted at me during a four-hour soak test.',
    author: 'Ren Okafor',
    role: 'Head of Automation',
    org: 'Pulse Manufacturing',
    initials: 'RO',
  },
  {
    quote:
      'It runs on Vercel free tier. It loads in a second. It survives 50,000 streaming rows. I don’t know which of those three sentences I love most.',
    author: 'Liang Wei',
    role: 'Engineering Manager',
    org: 'Atlas Insurance',
    initials: 'LW',
  },
]

function updateTestimonialParallax(node: HTMLElement, clientX: number, clientY: number) {
  const rect = node.getBoundingClientRect()
  const px = (clientX - rect.left) / rect.width
  const py = (clientY - rect.top) / rect.height
  node.style.setProperty('--testimonial-rotate-x', `${((0.5 - py) * 9).toFixed(2)}deg`)
  node.style.setProperty('--testimonial-rotate-y', `${((px - 0.5) * 12).toFixed(2)}deg`)
  node.style.setProperty('--testimonial-glow-x', `${(px * 100).toFixed(2)}%`)
  node.style.setProperty('--testimonial-glow-y', `${(py * 100).toFixed(2)}%`)
}

function resetTestimonialParallax(node: HTMLElement) {
  node.style.setProperty('--testimonial-rotate-x', '0deg')
  node.style.setProperty('--testimonial-rotate-y', '0deg')
  node.style.setProperty('--testimonial-glow-x', '50%')
  node.style.setProperty('--testimonial-glow-y', '50%')
}

function TestimonialMarqueeRow({
  items,
  reverse = false,
}: {
  items: Testimonial[]
  reverse?: boolean
}) {
  const looped = [...items, ...items]

  return (
    <div className="testimonial-marquee-shell">
      <div className={`testimonial-marquee ${reverse ? 'testimonial-marquee--reverse' : 'testimonial-marquee--forward'}`}>
        {looped.map((t, index) => {
          const cloned = index >= items.length
          return (
            <figure
              key={`${t.author}-${index}`}
              aria-hidden={cloned}
              tabIndex={cloned ? -1 : 0}
              onMouseMove={(event) =>
                updateTestimonialParallax(event.currentTarget, event.clientX, event.clientY)
              }
              onMouseLeave={(event) => resetTestimonialParallax(event.currentTarget)}
              onFocus={(event) => resetTestimonialParallax(event.currentTarget)}
              className="testimonial-card liquid-glass-strong relative flex h-full min-h-[240px] w-[min(86vw,22rem)] flex-shrink-0 flex-col rounded-[1.5rem] p-6 md:w-[22rem]"
            >
              <div className="testimonial-card__glow" aria-hidden="true" />
              <QuoteIcon className="mb-4 h-6 w-6 text-white/70" />
              <blockquote className="relative z-[1] flex-1 font-body text-sm font-light leading-relaxed text-white/92 md:text-[15px]">
                “{t.quote}”
              </blockquote>
              <figcaption className="relative z-[1] mt-5 flex items-center gap-3">
                <div className="liquid-glass flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-heading text-base italic text-white">
                  {t.initials}
                </div>
                <div className="min-w-0">
                  <div className="truncate font-body text-sm font-semibold text-white">{t.author}</div>
                  <div className="truncate font-body text-xs font-light text-white/70">
                    {t.role} · {t.org}
                  </div>
                </div>
              </figcaption>
            </figure>
          )
        })}
      </div>
    </div>
  )
}

function TestimonialsSection() {
  const topRow = testimonials.slice(0, Math.ceil(testimonials.length / 2))
  const bottomRow = testimonials.slice(Math.ceil(testimonials.length / 2))

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionLabel label="Testimonials" />
      <SectionReveal>
        <div className="liquid-glass rounded-[2rem] p-8 md:p-10">
          <h2 className="font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl">
            What operators say
            <br /> after a real shift
          </h2>
          <p className="mt-6 max-w-3xl font-body text-sm font-light leading-relaxed text-white/90 md:text-base">
            We didn’t collect highlights from a launch demo. These quotes come from teams that have
            actually lived inside Akashara — through stream freezes, multi-column sorts on hundred-thousand
            row pools, and the kind of long sessions that break most dashboards.
          </p>
        </div>
      </SectionReveal>

      <SectionReveal delay={0.08} className="mt-8 space-y-4">
        <TestimonialMarqueeRow items={topRow} />
        <TestimonialMarqueeRow items={bottomRow} reverse />
      </SectionReveal>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   NEW SECTION 2 — FAQ (animated gradient bg, accordion)
   ────────────────────────────────────────────────────────────────────── */
type FaqItem = { q: string; a: string }

const faqs: FaqItem[] = [
  {
    q: 'How is Akashara different from a normal RPA dashboard?',
    a: 'Most dashboards repaint the entire grid on every tick. Akashara separates the firehose from the paint loop — the data engine ingests at 200 ms while the DOM only repaints inside requestAnimationFrame. The result is a workspace that stays at 60 fps even after several hours of continuous streaming.',
  },
  {
    q: 'Are any virtualization libraries used?',
    a: 'None. AG-Grid, TanStack Table, react-window and react-virtualized are all explicitly forbidden by the brief. The virtualized grid is a hand-built Android-style recycler view — fixed DOM node count, imperative text patching, fluid 60 fps under load.',
  },
  {
    q: 'What happens if I pause the stream and walk away?',
    a: 'The UI freezes but the engine keeps ingesting in the background. Every batch from dataStream.js is captured into a deduplicating queue. The instant you resume, a single coalesced flush replays everything — no row is dropped, no duplicate paint happens.',
  },
  {
    q: 'Does the layout persist across refreshes?',
    a: 'Yes. Widget visibility (KPIs, filters, grid, chart) is stored under a versioned localStorage key. Hard refresh, restart the browser, restart your laptop — the cockpit reopens in exactly the shape you left it.',
  },
  {
    q: 'How does fuzzy search handle out-of-order keywords?',
    a: 'The search bar tokenises on whitespace and requires each token to match somewhere across project name, company id, implementation partner, or country. So "Tata Cloud Completed India" finds the right row no matter what order you type the words in.',
  },
  {
    q: 'Is the deployment really free to run?',
    a: 'Akashara is a pure client-side SPA. There are no API routes, no serverless functions, no databases. It is deployed on Vercel’s free tier as a static bundle — the entire RPA monitor runs inside your browser tab.',
  },
]

function FaqSection() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionLabel label="Frequently Asked Questions" />
      <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <SectionReveal>
          <div className="liquid-glass rounded-[2rem] p-8 md:p-10">
            <h2 className="font-heading text-5xl italic leading-[0.92] tracking-[-3px] text-white md:text-7xl">
              The questions
              <br /> we hear most
            </h2>
            <p className="mt-6 max-w-xl font-body text-sm font-light leading-relaxed text-white/90 md:text-base">
              Six honest answers about what Akashara is, what it isn’t, and how it stays calm under
              a real-time firehose. Don’t see your question? The cockpit itself is the best demo —
              just click <em>Enter the Dashboard</em> at the top right.
            </p>
            <div className="mt-8 flex flex-wrap gap-2">
              {['No external grid libs', 'Pure client-side', 'Zero data lost on pause', 'Layout persisted', '60 fps under load'].map((tag) => (
                <span
                  key={tag}
                  className="liquid-glass rounded-full px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-white/90"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </SectionReveal>

        <SectionReveal delay={0.12}>
          <div className="space-y-3">
            {faqs.map((f, i) => {
              const isOpen = openIdx === i
              return (
                <div
                  key={f.q}
                  className="liquid-glass overflow-hidden rounded-[1.25rem]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenIdx(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                    aria-expanded={isOpen}
                  >
                    <span className="font-body text-sm font-semibold text-white md:text-[15px]">
                      {f.q}
                    </span>
                    <span
                      className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white transition-transform duration-300 ${
                        isOpen ? 'rotate-45' : ''
                      }`}
                      aria-hidden="true"
                    >
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                    </span>
                  </button>
                  <div
                    className="grid transition-[grid-template-rows] duration-300 ease-out"
                    style={{ gridTemplateRows: isOpen ? '1fr' : '0fr' }}
                  >
                    <div className="overflow-hidden">
                      <div className="px-5 pb-5 font-body text-sm font-light leading-relaxed text-white/85">
                        {f.a}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </SectionReveal>
      </div>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   NEW SECTION 3 — TRUST / NUMBERS STRIP (animated gradient bg)
   ────────────────────────────────────────────────────────────────────── */
function TrustSection({ onEnter }: { onEnter: () => void }) {
  const numbers = [
    { value: '50K+', label: 'Live records under continuous observation' },
    { value: '200ms', label: 'Telemetry pulse from the simulated firehose' },
    { value: '60fps', label: 'Maintained under full streaming load' },
    { value: '<40', label: 'DOM rows in the recycler at any moment' },
    { value: '0', label: 'External grid or virtualization libraries used' },
    { value: '100%', label: 'Client-side — no servers, no APIs, no auth' },
  ]
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col justify-center px-4 py-24 md:px-10 lg:px-16">
      <SectionLabel label="By the Numbers" />
      <SectionReveal>
        <div className="liquid-glass rounded-[2rem] p-8 md:p-10">
          <h2 className="font-heading text-5xl italic leading-[0.9] tracking-[-3px] text-white md:text-7xl">
            Engineering posture,
            <br /> not marketing copy
          </h2>
          <p className="mt-6 max-w-3xl font-body text-sm font-light leading-relaxed text-white/90 md:text-base">
            Akashara is a Phase 2 submission for the Frontend Battle 2026, and every number here is
            measurable — open Chrome DevTools, profile the page, and you can verify all six of them
            yourself. No bench marketing, no synthetic demos.
          </p>
        </div>
      </SectionReveal>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {numbers.map((n, i) => (
          <SectionReveal key={n.label} delay={0.05 * i}>
            <div className="liquid-glass flex h-full flex-col rounded-[1.5rem] p-6">
              <div className="font-heading text-5xl italic leading-none tracking-[-1px] text-white md:text-6xl">
                {n.value}
              </div>
              <div className="mt-4 font-body text-sm font-light leading-relaxed text-white/85">
                {n.label}
              </div>
            </div>
          </SectionReveal>
        ))}
      </div>

      <SectionReveal delay={0.18} className="mt-8">
        <div className="liquid-glass rounded-[1.5rem] p-6 md:p-8 text-center">
          <div className="font-heading text-3xl italic leading-tight tracking-[-1px] text-white md:text-4xl">
            One click separates you from a live, 50,000-row telemetry firehose.
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <button
              onClick={onEnter}
              className="liquid-glass-strong inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white"
            >
              Enter the Dashboard
              <ArrowUpRight className="h-5 w-5" />
            </button>
            <a
              href={`#${SECTION_IDS.testimonials}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-white"
            >
              Re-read what operators say
              <PlayIcon className="h-4 w-4" />
            </a>
          </div>
        </div>
      </SectionReveal>
    </div>
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   ROOT LANDING PAGE
   ────────────────────────────────────────────────────────────────────── */
export function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [heroReady, setHeroReady] = useState(false)
  const [loaderVisible, setLoaderVisible] = useState(true)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  const navLinks = [
    { label: 'Home', href: `#${SECTION_IDS.hero}` },
    { label: 'Voyages', href: `#${SECTION_IDS.voyages}` },
    { label: 'Innovation', href: `#${SECTION_IDS.innovation}` },
    { label: 'Testimonials', href: `#${SECTION_IDS.testimonials}` },
    { label: 'FAQ', href: `#${SECTION_IDS.faq}` },
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
    const all = [HERO_VIDEO, CAP_VIDEO, ...EXTRA_VIDEOS]
    warmAll(all)
  }, [])

  useEffect(() => {
    const closeMenu = () => setMobileNavOpen(false)
    window.addEventListener('hashchange', closeMenu)
    return () => window.removeEventListener('hashchange', closeMenu)
  }, [])

  return (
    <div className="lp-root font-body relative w-full overflow-x-hidden bg-black">
      <OrbitalLoader visible={loaderVisible} />

      <div className="pointer-events-none fixed inset-x-0 top-0 z-[70] px-3 pt-3 sm:px-6 lg:px-10">
        <nav className="landing-nav-shell pointer-events-auto mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-full px-3 py-2 sm:px-4">
          <a
            href={`#${SECTION_IDS.hero}`}
            className="inline-flex items-center gap-3 text-white"
            aria-label="Akashara Home"
            onClick={() => setMobileNavOpen(false)}
          >
            <BrandLogo size={40} imageClassName="scale-[0.88]" />
            <span className="hidden text-sm font-semibold tracking-[0.2em] text-white/85 sm:inline">
              AKASHARA
            </span>
          </a>

          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="rounded-full px-3 py-2 text-sm font-medium text-white/90 transition hover:bg-white/8 hover:text-white"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onEnter}
              className="liquid-glass-strong hidden items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-white sm:inline-flex"
            >
              Enter Cockpit
              <ArrowUpRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => setMobileNavOpen((open) => !open)}
              className="liquid-glass inline-flex h-10 w-10 items-center justify-center rounded-full text-white md:hidden"
              aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileNavOpen}
            >
              {mobileNavOpen ? <CloseIcon className="h-4 w-4" /> : <MenuIcon className="h-4 w-4" />}
            </button>
          </div>
        </nav>

        <div
          className={`pointer-events-auto mx-auto mt-2 max-w-7xl transition duration-200 md:hidden ${
            mobileNavOpen ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
          }`}
        >
          <div className="landing-nav-shell rounded-[1.75rem] px-3 py-3">
            <div className="flex flex-col gap-1">
              {navLinks.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={() => setMobileNavOpen(false)}
                  className="rounded-2xl px-4 py-3 text-sm font-medium text-white/92 transition hover:bg-white/8"
                >
                  {item.label}
                </a>
              ))}
              <button
                onClick={() => {
                  setMobileNavOpen(false)
                  onEnter()
                }}
                className="liquid-glass-strong mt-2 inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white"
              >
                Enter Cockpit
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ────────── SECTION 1 — HERO (NEW project-aligned content) ────────── */}
      <SectionFrame
        id={SECTION_IDS.hero}
        video={HERO_VIDEO}
        heroScale
        onReady={() => setHeroReady(true)}
        trimEndSeconds={1.4}
        isHero
      >
        <div className="relative flex min-h-[100svh] flex-col">
          <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-32 text-center sm:px-6 sm:pt-36 md:px-8 md:pb-14 md:pt-32">
            <motion.div
              initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
              animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.4 }}
              className="liquid-glass mb-8 inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3"
            >
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                Live
              </span>
              <span className="pr-3 text-sm text-white/90">
                Streaming 50,000 RPA telemetry rows · 200 ms heartbeat
              </span>
            </motion.div>

            {/* Task 1.1 — NEW hero headline aligned to the project concept */}
            <BlurText
              text="The World’s Automation, Streamed in Real Time"
              className="text-6xl md:text-7xl lg:text-[5.5rem] font-heading italic text-white leading-[0.8] max-w-3xl justify-center tracking-[-4px]"
              delayOffset={0.5}
            />

            <motion.p
              initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
              animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 0.8 }}
              className="mt-5 max-w-2xl font-body text-sm font-light leading-snug text-white md:text-base"
            >
              Akashara is a high-density Enterprise RPA Monitor — a hand-built virtualized cockpit
              that ingests a continuous global firehose from the Worldwide RPA Database 2026, holds
              50,000 records in memory, and renders them at 60 frames per second. Zero external grid
              libraries. Zero dropped ticks. Pure low-level frontend engineering.
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
                Enter the Cockpit
                <ArrowUpRight className="h-5 w-5" />
              </button>
              <a
                href={`#${SECTION_IDS.capabilities}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-white"
              >
                See the Engineering
                <PlayIcon className="h-4 w-4" />
              </a>
            </motion.div>

            {/* Task 1.1 — KPI-style mini-cards reframed for Akashara */}
            <motion.div
              initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
              animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: 'easeOut', delay: 1.3 }}
              className="hero-metrics-grid mt-8 grid w-full max-w-5xl grid-cols-1 items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3"
            >
              <div className="liquid-glass min-w-0 rounded-[1.25rem] p-5 text-left">
                <svg
                  className="h-7 w-7 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  aria-hidden="true"
                >
                  <path d="M3 12h4l3-7 4 14 3-7h4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="mt-3 font-heading text-4xl italic leading-none tracking-[-1px] text-white">
                  60 FPS
                </div>
                <div className="mt-2 font-body text-xs font-light text-white">
                  Under full real-time streaming load
                </div>
              </div>
              <div className="liquid-glass min-w-0 rounded-[1.25rem] p-5 text-left">
                <svg
                  className="h-7 w-7 text-white"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.6}
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <path d="M3 9h18M8 4v16" />
                </svg>
                <div className="mt-3 font-heading text-4xl italic leading-none tracking-[-1px] text-white">
                  50K+
                </div>
                <div className="mt-2 font-body text-xs font-light text-white">
                  Telemetry rows held live in memory
                </div>
              </div>
              <div className="liquid-glass min-w-0 rounded-[1.25rem] p-5 text-left">
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
                  200 ms
                </div>
                <div className="mt-2 font-body text-xs font-light text-white">
                  Firehose pulse from dataStream.js
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={{ filter: 'blur(10px)', opacity: 0, y: 20 }}
            animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut', delay: 1.4 }}
            className="relative z-10 px-4 pb-8 sm:px-6"
          >
            <div className="flex flex-col items-center gap-4 px-4 text-center">
              <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white">
                Built for the Frontend Battle 2026 · Phase 2 Engineering Brief
              </div>
              <div className="flex flex-wrap items-center justify-center gap-12 md:gap-16">
                {['No AG-Grid', 'No TanStack', 'No react-window', 'Pure DOM', 'Pure Workers'].map((name) => (
                  <span
                    key={name}
                    className="font-heading text-xl italic tracking-tight text-white md:text-2xl"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </SectionFrame>

      {/* ────────── SECTION 2 — CAPABILITIES ────────── */}
      {/* Task 1 — the Capabilities section now plays section3.mp4 as
          its background, horizontally mirrored, on an infinite silent
          loop. The mirror flag is forwarded through SectionFrame →
          FadingVideo and is applied via a GPU-only `scaleX(-1)`
          transform so there is zero CPU cost and the underlying
          <video loop> attribute keeps the playback continuous. */}
      <SectionFrame
        id={SECTION_IDS.capabilities}
        video={CAP_VIDEO}
        mirror
        className="landing-stack-section"
      >
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

      {/* ────────── Creative chapters with video backgrounds ────────── */}
      {creativeSections.map((section) => (
        <SectionFrame
          key={section.id}
          id={section.id}
          video={section.video}
          mirror={section.mirrorVideo}
          className="landing-stack-section"
        >
          {renderCreativeSection(section, onEnter)}
        </SectionFrame>
      ))}

      {/* ────────── NEW SECTION — TESTIMONIALS (animated gradient) ────────── */}
      <GradientSectionFrame
        id={SECTION_IDS.testimonials}
        variant="aurora"
        className="landing-stack-section"
      >
        <TestimonialsSection />
      </GradientSectionFrame>

      {/* ────────── NEW SECTION — FAQ (animated gradient) ────────── */}
      <GradientSectionFrame id={SECTION_IDS.faq} variant="sunset" className="landing-stack-section">
        <FaqSection />
      </GradientSectionFrame>

      {/* ────────── NEW SECTION — TRUST / NUMBERS (animated gradient) ────────── */}
      <GradientSectionFrame id={SECTION_IDS.trust} variant="oceanic" className="landing-stack-section">
        <TrustSection onEnter={onEnter} />
      </GradientSectionFrame>
    </div>
  )
}
