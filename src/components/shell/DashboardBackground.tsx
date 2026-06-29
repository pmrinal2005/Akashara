/**
 * DashboardBackground (Task 4)
 * ─────────────────────────────────────────────────────────────────────────
 * An animated grid + moving colorful-particle backdrop rendered behind the
 * dashboard shell.  Two layers stack here:
 *
 *   1. A pure-CSS grid layer (.dashboard-bg__grid in globals.css) — drifts
 *      slowly via a GPU transform, costs zero JS frames.
 *   2. A canvas-based particle field — ~60 dots in calm primary hues that
 *      slowly orbit across the screen.  All animation runs inside a single
 *      requestAnimationFrame loop with optional pausing while the tab is
 *      hidden (Page Visibility API) to avoid wasting cycles in background.
 *
 * Engineering notes:
 *   • The canvas uses devicePixelRatio sharp rendering up to a cap of 2x
 *     to keep paint cost predictable on retina displays.
 *   • Particles are stored in a flat typed array layout (Float32Array)
 *     to avoid object-allocation pressure inside the hot RAF loop.
 *   • Resize handling is debounced via ResizeObserver; the particle field
 *     is re-binned but the underlying buffer is reused.
 *   • The component is mounted ONCE behind the entire dashboard and is
 *     completely declarative — no other component needs to know it exists.
 */

import { useEffect, useRef } from 'react'

// Particle palette — soft, dashboard-friendly hues that match the existing
// accent colours.
const PARTICLE_PALETTE: [number, number, number][] = [
  [56, 189, 248],   // sky
  [167, 139, 250], // violet
  [244, 114, 182], // pink
  [74, 222, 128],  // green
  [251, 191, 36],  // amber
  [34, 211, 238],  // cyan
]

const PARTICLE_COUNT = 64
// Flat-array layout: [x, y, vx, vy, r, colorIdx, opacity] per particle.
const STRIDE = 7

export function DashboardBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    let width = 0
    let height = 0
    let rafId = 0
    let isVisible = !document.hidden

    const buffer = new Float32Array(PARTICLE_COUNT * STRIDE)

    function rand(min: number, max: number) {
      return Math.random() * (max - min) + min
    }

    function seed() {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const o = i * STRIDE
        buffer[o + 0] = rand(0, width)
        buffer[o + 1] = rand(0, height)
        buffer[o + 2] = rand(-0.15, 0.15)
        buffer[o + 3] = rand(-0.15, 0.15)
        buffer[o + 4] = rand(1.2, 3.2)
        buffer[o + 5] = Math.floor(rand(0, PARTICLE_PALETTE.length))
        buffer[o + 6] = rand(0.4, 0.85)
      }
    }

    function applySize() {
      const c = canvasRef.current
      if (!c) return
      const cssW = c.clientWidth
      const cssH = c.clientHeight
      width = cssW
      height = cssH
      c.width = Math.floor(cssW * dpr)
      c.height = Math.floor(cssH * dpr)
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0)
      // Re-seed only if the buffer was never filled, otherwise just bound
      // the existing particles back into the new viewport so resize stays
      // smooth and doesn't visibly reset everything.
      if (buffer[0] === 0 && buffer[1] === 0) {
        seed()
      } else {
        for (let i = 0; i < PARTICLE_COUNT; i++) {
          const o = i * STRIDE
          if (buffer[o + 0] > width) buffer[o + 0] = rand(0, width)
          if (buffer[o + 1] > height) buffer[o + 1] = rand(0, height)
        }
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, width, height)

      // Soft connecting lines — kept short and rare so the dashboard
      // chrome stays the visual hero.
      const linkDist = 110
      const linkDistSq = linkDist * linkDist

      // First pass: draw lines between nearby particles.
      ctx!.lineWidth = 1
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const oi = i * STRIDE
        const xi = buffer[oi]
        const yi = buffer[oi + 1]
        for (let j = i + 1; j < PARTICLE_COUNT; j++) {
          const oj = j * STRIDE
          const dx = xi - buffer[oj]
          const dy = yi - buffer[oj + 1]
          const dsq = dx * dx + dy * dy
          if (dsq < linkDistSq) {
            const t = 1 - dsq / linkDistSq
            // Pick the line colour from the first particle for variety.
            const c = PARTICLE_PALETTE[buffer[oi + 5] | 0]
            ctx!.strokeStyle = `rgba(${c[0]},${c[1]},${c[2]},${(t * 0.18).toFixed(3)})`
            ctx!.beginPath()
            ctx!.moveTo(xi, yi)
            ctx!.lineTo(buffer[oj], buffer[oj + 1])
            ctx!.stroke()
          }
        }
      }

      // Second pass: draw + advance particles.
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const o = i * STRIDE
        let x = buffer[o + 0] + buffer[o + 2]
        let y = buffer[o + 1] + buffer[o + 3]

        // Soft wrap-around so particles re-enter from the opposite edge.
        if (x < -10) x = width + 10
        else if (x > width + 10) x = -10
        if (y < -10) y = height + 10
        else if (y > height + 10) y = -10

        buffer[o + 0] = x
        buffer[o + 1] = y

        const r = buffer[o + 4]
        const c = PARTICLE_PALETTE[buffer[o + 5] | 0]
        const a = buffer[o + 6]

        // Outer glow
        const grad = ctx!.createRadialGradient(x, y, 0, x, y, r * 4.2)
        grad.addColorStop(0, `rgba(${c[0]},${c[1]},${c[2]},${(a * 0.55).toFixed(3)})`)
        grad.addColorStop(1, `rgba(${c[0]},${c[1]},${c[2]},0)`)
        ctx!.fillStyle = grad
        ctx!.beginPath()
        ctx!.arc(x, y, r * 4.2, 0, Math.PI * 2)
        ctx!.fill()

        // Core
        ctx!.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`
        ctx!.beginPath()
        ctx!.arc(x, y, r, 0, Math.PI * 2)
        ctx!.fill()
      }
    }

    function loop() {
      if (isVisible) draw()
      rafId = requestAnimationFrame(loop)
    }

    const ro = new ResizeObserver(() => applySize())
    ro.observe(canvas)

    const onVis = () => {
      isVisible = !document.hidden
    }
    document.addEventListener('visibilitychange', onVis)

    applySize()
    seed()
    rafId = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return (
    <div className="dashboard-bg" aria-hidden="true">
      <div className="dashboard-bg__glow" />
      <div className="dashboard-bg__grid" />
      <canvas ref={canvasRef} className="dashboard-bg__canvas" />
    </div>
  )
}
