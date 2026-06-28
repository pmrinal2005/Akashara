import { useEffect, useRef } from 'react'

const HERO_VIDEO = '/landing_page.mp4'
const CAP_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260418_094631_d30ab262-45ee-4b7d-99f3-5d5848c8ef13.mp4'

const FADE_MS = 500
const FADE_OUT_LEAD = 0.55

function useFadingVideo(src: string) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const v = ref.current
    if (!v) return
    v.style.opacity = '0'
    let raf = 0
    let fadingOut = false

    const fadeTo = (target: number, duration: number) => {
      cancelAnimationFrame(raf)
      const start = parseFloat(v.style.opacity || '0')
      const t0 = performance.now()
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / duration)
        v.style.opacity = String(start + (target - start) * k)
        if (k < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }

    const onLoaded = () => {
      v.style.opacity = '0'
      v.play().catch(() => {})
      fadeTo(1, FADE_MS)
    }
    const onTime = () => {
      if (fadingOut) return
      const remain = v.duration - v.currentTime
      if (remain > 0 && remain <= FADE_OUT_LEAD) {
        fadingOut = true
        fadeTo(0, FADE_MS)
      }
    }
    const onEnded = () => {
      v.style.opacity = '0'
      setTimeout(() => {
        v.currentTime = 0
        v.play().catch(() => {})
        fadingOut = false
        fadeTo(1, FADE_MS)
      }, 100)
    }

    v.addEventListener('loadeddata', onLoaded)
    v.addEventListener('timeupdate', onTime)
    v.addEventListener('ended', onEnded)
    return () => {
      cancelAnimationFrame(raf)
      v.removeEventListener('loadeddata', onLoaded)
      v.removeEventListener('timeupdate', onTime)
      v.removeEventListener('ended', onEnded)
    }
  }, [src])
  return ref
}

function FadingVideo({
  src,
  className,
  style,
}: {
  src: string
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useFadingVideo(src)
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
    >
      <path d="M7 17L17 7" />
      <path d="M7 7h10v10" />
    </svg>
  )
}

function PlayIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
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
  const words = text.split(' ')
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const spans = Array.from(el.querySelectorAll<HTMLSpanElement>('[data-blur]'))
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return
          spans.forEach((s, i) => {
            const d = delayOffset + i * 100
            setTimeout(() => {
              s.animate(
                [
                  { filter: 'blur(10px)', opacity: 0, transform: 'translateY(50px)' },
                  { filter: 'blur(5px)', opacity: 0.5, transform: 'translateY(-5px)', offset: 0.5 },
                  { filter: 'blur(0px)', opacity: 1, transform: 'translateY(0)' },
                ],
                { duration: 700, easing: 'ease-out', fill: 'forwards' },
              )
            }, d)
          })
          io.disconnect()
        })
      },
      { threshold: 0.1 },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [delayOffset])
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
      {words.map((w, i) => (
        <span
          key={i}
          data-blur
          style={{
            display: 'inline-block',
            marginRight: '0.28em',
            opacity: 0,
            filter: 'blur(10px)',
            transform: 'translateY(50px)',
          }}
        >
          {w}
        </span>
      ))}
    </p>
  )
}

function FadeIn({
  delay = 0,
  children,
  className,
}: {
  delay?: number
  children: React.ReactNode
  className?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setTimeout(() => {
      el.animate(
        [
          { filter: 'blur(10px)', opacity: 0, transform: 'translateY(20px)' },
          { filter: 'blur(0px)', opacity: 1, transform: 'translateY(0)' },
        ],
        { duration: 700, easing: 'ease-out', fill: 'forwards' },
      )
    }, delay)
  }, [delay])
  return (
    <div
      ref={ref}
      className={className}
      style={{ opacity: 0, filter: 'blur(10px)', transform: 'translateY(20px)' }}
    >
      {children}
    </div>
  )
}

export function LandingPage({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="lp-root font-body relative w-full overflow-x-hidden">
      {/* ============ HERO SECTION ============ */}
      <section className="relative h-screen w-full overflow-hidden bg-black">
        <FadingVideo
          src={HERO_VIDEO}
          className="absolute left-1/2 top-0 -translate-x-1/2 object-cover object-top z-0"
          style={{ width: '120%', height: '120%' }}
        />

        <div className="relative z-10 flex h-full flex-col">
          {/* Navbar */}
          <nav className="fixed left-0 right-0 top-4 z-50 flex items-center justify-between px-4 md:px-8 lg:px-16">
            <div className="liquid-glass flex h-12 w-12 items-center justify-center rounded-full">
              <span className="font-heading text-2xl text-white">a</span>
            </div>
            <div className="liquid-glass hidden items-center gap-0 rounded-full px-1.5 py-1.5 md:flex">
              <a className="px-3 py-2 font-body text-sm font-medium text-white/90">Home</a>
              <a className="px-3 py-2 font-body text-sm font-medium text-white/90">Telemetry</a>
              <a className="px-3 py-2 font-body text-sm font-medium text-white/90">Engine</a>
              <a className="px-3 py-2 font-body text-sm font-medium text-white/90">Performance</a>
              <a className="px-3 py-2 font-body text-sm font-medium text-white/90">Docs</a>
              <button
                onClick={onEnter}
                className="ml-1 inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-white px-3 py-2 text-sm font-medium text-black"
              >
                Launch Terminal
                <ArrowUpRight className="h-4 w-4" />
              </button>
            </div>
            <div className="h-12 w-12" />
          </nav>

          {/* Hero content */}
          <div className="flex flex-1 flex-col items-center justify-center px-4 pt-24 text-center">
            <FadeIn delay={400}>
              <div className="liquid-glass mb-8 inline-flex items-center gap-2 rounded-full py-1 pl-1 pr-3">
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-black">
                  New
                </span>
                <span className="text-sm text-white/90">
                  Akashara · Streaming 50,000 RPA records in real-time
                </span>
              </div>
            </FadeIn>

            <BlurText
              text="Venture Past Dashboards Across the Data Universe"
              className="font-heading text-white text-6xl md:text-7xl lg:text-[5.5rem] leading-[0.8] max-w-3xl"
              delayOffset={500}
            />

            <FadeIn delay={1100}>
              <p className="mt-6 max-w-2xl font-body text-sm font-light leading-tight text-white md:text-base">
                A high-density Enterprise Control Terminal engineered to ingest a 200ms
                telemetry firehose without dropping frames. 50,000 rows. Custom recycler-view
                virtualization. Zero data-grid libraries. Pure low-level frontend craft.
              </p>
            </FadeIn>

            <FadeIn delay={1300}>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-6">
                <button
                  onClick={onEnter}
                  className="liquid-glass-strong inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium text-white"
                >
                  Launch Control Terminal
                  <ArrowUpRight className="h-5 w-5" />
                </button>
                <a
                  href="#capabilities"
                  className="inline-flex items-center gap-2 text-sm font-medium text-white"
                >
                  View Capabilities
                  <PlayIcon className="h-4 w-4" />
                </a>
              </div>
            </FadeIn>

            <FadeIn delay={1500}>
              <div className="mt-10 flex flex-wrap items-stretch justify-center gap-4">
                <div className="liquid-glass w-[220px] rounded-[1.25rem] p-5">
                  <svg
                    className="h-7 w-7 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M12 7v5l3 2" strokeLinecap="round" />
                  </svg>
                  <div className="font-heading mt-3 text-4xl leading-none text-white tracking-[-1px]">
                    200ms
                  </div>
                  <div className="mt-2 font-body text-xs font-light text-white">
                    Telemetry Tick Interval
                  </div>
                </div>
                <div className="liquid-glass w-[220px] rounded-[1.25rem] p-5">
                  <svg
                    className="h-7 w-7 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.6}
                  >
                    <circle cx="12" cy="12" r="9" />
                    <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
                  </svg>
                  <div className="font-heading mt-3 text-4xl leading-none text-white tracking-[-1px]">
                    50K+
                  </div>
                  <div className="mt-2 font-body text-xs font-light text-white">
                    Concurrent Streamed Rows
                  </div>
                </div>
              </div>
            </FadeIn>
          </div>

          {/* Partners */}
          <FadeIn delay={1700} className="pb-8">
            <div className="flex flex-col items-center gap-4">
              <div className="liquid-glass rounded-full px-3.5 py-1 text-xs font-medium text-white">
                Architected with 10 production-grade engineering doctrines
              </div>
              <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
                {['Recycler', 'rAF', 'Workers', 'Zustand', 'Chart.js'].map((n) => (
                  <span
                    key={n}
                    className="font-heading text-2xl tracking-tight text-white md:text-3xl"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ============ CAPABILITIES SECTION ============ */}
      <section
        id="capabilities"
        className="relative min-h-screen w-full overflow-hidden bg-black"
      >
        <FadingVideo
          src={CAP_VIDEO}
          className="absolute inset-0 h-full w-full object-cover z-0"
        />

        <div className="relative z-10 flex min-h-screen flex-col px-4 pb-10 pt-24 md:px-16 lg:px-20">
          <header className="mb-auto">
            <div className="mb-6 font-body text-sm text-white/80">// Capabilities</div>
            <h2 className="font-heading text-white leading-[0.9] tracking-[-3px] text-6xl md:text-7xl lg:text-[6rem]">
              Telemetry
              <br />
              engineered
            </h2>
          </header>

          <div className="mt-16 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            {[
              {
                title: 'Recycler-View Grid',
                body:
                  'Fixed-count DOM nodes recycled imperatively. 25-40 row elements render 50K rows at locked 60 FPS — zero virtualization libraries.',
                tags: ['60 FPS', 'No AG-Grid', 'Bounded DOM', 'rAF-driven'],
                icon: (
                  <path d="M5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21H5Zm1-4h12l-3.75-5-3 4L9 13l-3 4Z" />
                ),
              },
              {
                title: 'Stream State Engine',
                body:
                  'In-place Map mutations, delta-based KPI aggregation, rAF-coalesced flush. Decouples the 200ms firehose from the paint loop.',
                tags: ['Map Store', 'Delta KPIs', 'Pause Queue', 'Coalesced'],
                icon: (
                  <path d="M4 6.47 5.76 10H20v8H4V6.47M22 4h-4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.89-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4Z" />
                ),
              },
              {
                title: 'Worker-Offloaded Logic',
                body:
                  'Fuzzy search and multi-column sort live in dedicated Web Workers. Main thread stays painted while heavy compute runs in parallel.',
                tags: ['Web Workers', 'Stale-token', 'Multi-sort', 'Token search'],
                icon: (
                  <path d="M9 21c0 .55.45 1 1 1h4c.55 0 1-.45 1-1v-1H9v1Zm3-19C8.14 2 5 5.14 5 9c0 2.38 1.19 4.47 3 5.74V17c0 .55.45 1 1 1h6c.55 0 1-.45 1-1v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.86-3.14-7-7-7Z" />
                ),
              },
            ].map((card) => (
              <div
                key={card.title}
                className="liquid-glass flex min-h-[360px] flex-col rounded-[1.25rem] p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="liquid-glass flex h-11 w-11 items-center justify-center rounded-[0.75rem]">
                    <svg className="h-6 w-6 text-white" viewBox="0 0 24 24" fill="currentColor">
                      {card.icon}
                    </svg>
                  </div>
                  <div className="flex max-w-[70%] flex-wrap justify-end gap-1.5">
                    {card.tags.map((t) => (
                      <span
                        key={t}
                        className="liquid-glass whitespace-nowrap rounded-full px-3 py-1 text-[11px] font-body text-white/90"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex-1" />

                <div className="mt-6">
                  <h3 className="font-heading text-white text-3xl md:text-4xl leading-none tracking-[-1px]">
                    {card.title}
                  </h3>
                  <p className="mt-3 max-w-[32ch] font-body text-sm font-light leading-snug text-white/90">
                    {card.body}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <button
              onClick={onEnter}
              className="liquid-glass-strong inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium text-white"
            >
              Enter the Control Terminal
              <ArrowUpRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
