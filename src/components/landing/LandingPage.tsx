import { motion, useInView } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import { peekResolvedSrc, warmAll, warmVideo, whenReady } from '../../core/videoCache'

/* ─────────────────────────────────────────────────────────────────────────
   ASSET MAP
   ─────────────────────────────────────────────────────────────────────────
   All background clips live in /public so Vercel serves them from the
   deployment root. To replace the hero background, drop YOUR file at
   `public/landing_page.mp4` — the HERO_VIDEO constant below resolves to
   that exact path.
   ──────────────────────────────────────────────────────────────────────── */
const HERO_VIDEO = '/landing_page.mp4'
const CAP_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_094631_d30ab262-45ee-4b7d-99f3-5d5848c8ef13.mp4'
const EXTRA_VIDEOS = [
  '/section1.mp4',
  '/section2.mp4',
  '/section3.mp4',
  '/section4.mp4',
  '/section5.mp4',
]

const FADE_MS = 500
const FADE_OUT_LEAD = 0.55
const DEFAULT_TRIM_SECONDS = 1.2

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
} as const

/* ─────────────────────────────────────────────────────────────────────────
   TYPES
   ──────────────────────────────────────────────────────────────────────── */
type FadingVideoProps = {
  src: string
  className?: string
  style?: React.CSSProperties
  trimEndSeconds?: number
  onReady?: () => void
  isHero?: boolean
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
  layout: LayoutKind
  highlights: string[]
  stats: { value: string; label: string }[]
}

/* ─────────────────────────────────────────────────────────────────────────
   CAPABILITIES (Section 2) — Three feature cards, reframed for Akashara
   ──────────────────────────────────────────────────────────────────────── */
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
   CREATIVE SECTIONS — 11 chapters describing Akashara as a cinematic story.
   Existing 5 (Voyages, Worlds, Innovation, Plan Launch, Enter) are kept and
   rewritten for the project; 6 NEW chapters (Pulse, Signals, Atlas, Tempo,
   Operators, Constellations) are added below to broaden the narrative.
   All copy is high-level by design — no engineering jargon, just the story
   of what the operator sees and feels.
   ──────────────────────────────────────────────────────────────────────── */
const creativeSections: CreativeSection[] = [
  // ─── Existing chapter, rewritten ────────────────────────────────────────
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

  // ─── Existing chapter, rewritten ────────────────────────────────────────
  {
    id: SECTION_IDS.worlds,
    label: 'Worlds',
    title: 'Every industry, every country, one calm horizon',
    subtitle:
      'From banking floors in Mumbai to logistics hubs in Rotterdam, Akashara gathers automation footprints from every corner of the planet and lays them side by side, so an operator can sense the global rhythm at a glance.',
    video: EXTRA_VIDEOS[1],
    layout: 'signal-grid',
    highlights: ['Cross-industry view', 'Borderless coverage', 'Unified language', 'Shared lens'],
    stats: [
      { value: '40+', label: 'Countries represented in the live stream' },
      { value: '12', label: 'Industry families surfaced together' },
      { value: '∞', label: 'Time horizons the view can span' },
    ],
  },

  // ─── NEW chapter #1 ─────────────────────────────────────────────────────
  {
    id: SECTION_IDS.pulse,
    label: 'Pulse',
    title: 'A heartbeat above the storm of data',
    subtitle:
      'Three glowing counters sit at the very top of the workspace — rows seen, robots deployed, dollars saved — quietly climbing with every breath of the stream. Operators feel the scale of the operation before they read a single row.',
    video: EXTRA_VIDEOS[2],
    layout: 'pulse-rings',
    highlights: ['Three living counters', 'Tabular precision', 'No flicker', 'Always at the top'],
    stats: [
      { value: 'Rows', label: 'Total telemetry processed since liftoff' },
      { value: 'Robots', label: 'Deployed across the global pipeline' },
      { value: 'Savings', label: 'Cumulative dollars returned by automation' },
    ],
  },

  // ─── NEW chapter #2 ─────────────────────────────────────────────────────
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

  // ─── Existing chapter, rewritten ────────────────────────────────────────
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

  // ─── NEW chapter #3 ─────────────────────────────────────────────────────
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

  // ─── NEW chapter #4 ─────────────────────────────────────────────────────
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

  // ─── NEW chapter #5 ─────────────────────────────────────────────────────
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

  // ─── NEW chapter #6 ─────────────────────────────────────────────────────
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

  // ─── Existing chapter, rewritten ────────────────────────────────────────
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

  // ─── Existing chapter, rewritten ────────────────────────────────────────
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
   FADING VIDEO HOOK (custom JS crossfade — no CSS transitions)
   With the new cache, we resolve `src` to a blob URL the moment the cache
   reports it ready, then call video.load() once. This is the difference
   between black frames on first scroll and a buttery, pre-warmed playback.
   ──────────────────────────────────────────────────────────────────────── */
function useFadingVideo({ src, trimEndSeconds = DEFAULT_TRIM_SECONDS, onReady, isHero }: FadingVideoProps) {
  const ref = useRef<HTMLVideoElement>(null)
  // The actual URL fed to <video src>. Starts at whatever the cache already
  // has (blob if warmed, original otherwise) and is upgraded once the warm
  // promise resolves.
  const [resolvedSrc, setResolvedSrc] = useState<string>(() => peekResolvedSrc(src))

  // Ensure a warm has been scheduled for this src (idempotent inside cache).
  useEffect(() => {
    let active = true
    // Hero gets the highest priority; everything else rides at "auto".
    warmVideo(src, isHero ? 'high' : 'auto')
    whenReady(src).then((finalSrc) => {
      if (active && finalSrc !== resolvedSrc) {
        setResolvedSrc(finalSrc)
      }
    })
    return () => {
      active = false
    }
    // We only care about the underlying logical src, not the resolved one.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, isHero])

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
  }, [onReady, resolvedSrc, trimEndSeconds])

  return { ref, resolvedSrc }
}

function FadingVideo({ src, className, style, trimEndSeconds, onReady, isHero }: FadingVideoProps) {
  const { ref, resolvedSrc } = useFadingVideo({ src, trimEndSeconds, onReady, isHero })
  return (
    <video
      ref={ref}
      src={resolvedSrc}
      autoPlay
      muted
      playsInline
      preload="auto"
      className={className}
      style={style}
    />
  )
}

/* ─────────────────────────────────────────────────────────────────────────
   ICONS
   ──────────────────────────────────────────────────────────────────────── */
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
   BLUR TEXT (word-by-word entrance)
   ──────────────────────────────────────────────────────────────────────── */
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
   SECTION REVEAL (re-usable framer-motion in-view fade-up)
   ──────────────────────────────────────────────────────────────────────── */
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
   ──────────────────────────────────────────────────────────────────────── */
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
   SECTION FRAME — wraps every section with its background video + content
   ──────────────────────────────────────────────────────────────────────── */
function SectionFrame({
  id,
  video,
  className = '',
  children,
  heroScale = false,
  onReady,
  trimEndSeconds = DEFAULT_TRIM_SECONDS,
  isHero = false,
}: {
  id?: string
  video: string
  className?: string
  children: React.ReactNode
  heroScale?: boolean
  onReady?: () => void
  trimEndSeconds?: number
  isHero?: boolean
}) {
  return (
    <section id={id} className={`section-seam relative min-h-screen w-full overflow-hidden bg-black ${className}`}>
      <FadingVideo
        src={video}
        trimEndSeconds={trimEndSeconds}
        onReady={onReady}
        isHero={isHero}
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

/* ─────────────────────────────────────────────────────────────────────────
   LAYOUT VARIANTS — one component per `LayoutKind`
   ──────────────────────────────────────────────────────────────────────── */

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

/* ─── NEW LAYOUT #1 — Pulse Rings (concentric counter cards) ───────────── */
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

/* ─── NEW LAYOUT #2 — Mosaic Feed (alert tiles) ────────────────────────── */
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
          // Each tile gets a different glass span, creating a mosaic rhythm.
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

/* ─── NEW LAYOUT #3 — Atlas Globe (filters as orbits) ──────────────────── */
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

/* ─── NEW LAYOUT #4 — Tempo Deck (play / pause storyboard) ─────────────── */
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
                  {i === 0 ? '⏸' : i === 1 ? '◉' : '▶'}
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

/* ─── NEW LAYOUT #5 — Operator Console (toggle preview) ────────────────── */
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
            {/* Mock console toggle row — pure visual */}
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

/* ─── NEW LAYOUT #6 — Constellation Field (dot-grid stats) ─────────────── */
function ConstellationFieldSection({ section }: { section: CreativeSection }) {
  // We build a small synthetic dot field to evoke a chart-like silhouette
  // without actually rendering a chart on the landing page.
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
              {/* a subtle trend line through the field */}
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

/* ─── CTA — final section ──────────────────────────────────────────────── */
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

/* ─── DISPATCH ─────────────────────────────────────────────────────────── */
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
   ROOT LANDING PAGE
   ──────────────────────────────────────────────────────────────────────── */
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

  /* Loader fallback so it never hangs forever even on truly slow networks. */
  useEffect(() => {
    const fallbackTimer = window.setTimeout(() => setLoaderVisible(false), 2600)
    return () => window.clearTimeout(fallbackTimer)
  }, [])

  useEffect(() => {
    if (!heroReady) return
    const timer = window.setTimeout(() => setLoaderVisible(false), 500)
    return () => window.clearTimeout(timer)
  }, [heroReady])

  /* Aggressively warm EVERY background video in parallel on mount. The hero
     goes first with fetchpriority:high — the rest race in behind it. By the
     time the user scrolls past the fold, every clip is already in memory as
     a blob URL and plays without a network round-trip.                       */
  useEffect(() => {
    const all = [HERO_VIDEO, CAP_VIDEO, ...EXTRA_VIDEOS]
    warmAll(all)
    // Note: we deliberately do NOT call dropAll() on unmount — keeping the
    // cache alive lets users round-trip between landing and dashboard
    // without re-downloading the clips. The OS will reclaim the memory when
    // the tab closes.
  }, [])

  return (
    <div className="lp-root font-body relative w-full overflow-x-hidden bg-black">
      <OrbitalLoader visible={loaderVisible} />

      {/* ────────── SECTION 1 — HERO (EXACT prompt, unchanged) ────────── */}
      <SectionFrame
        id={SECTION_IDS.hero}
        video={HERO_VIDEO}
        heroScale
        onReady={() => setHeroReady(true)}
        trimEndSeconds={1.4}
        isHero
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
              <a
                href={`#${SECTION_IDS.capabilities}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-white"
              >
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
                  <span
                    key={name}
                    className="font-heading text-2xl italic tracking-tight text-white md:text-3xl"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </SectionFrame>

      {/* ────────── SECTION 2 — CAPABILITIES (reframed for Akashara) ────────── */}
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

      {/* ────────── SECTIONS 3 – 13 — Creative chapters ────────── */}
      {creativeSections.map((section) => (
        <SectionFrame key={section.id} id={section.id} video={section.video} className="landing-stack-section">
          {renderCreativeSection(section, onEnter)}
        </SectionFrame>
      ))}
    </div>
  )
}
