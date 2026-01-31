'use client'

import { useEffect, useState } from 'react'

// ============================================
// SCROLL PROGRESS BAR - Simple, solid color
// ============================================
export function ScrollProgress() {
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = (scrollTop / docHeight) * 100
      setProgress(scrollPercent)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: `${progress}%`,
        height: '2px',
        background: 'var(--accent)',
        zIndex: 9999,
        transition: 'width 0.1s linear'
      }}
    />
  )
}

// ============================================
// GRAIN TEXTURE OVERLAY - Very subtle
// ============================================
export function GrainOverlay() {
  return (
    <div
      className="pointer-events-none"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        opacity: 0.02,
        background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
      }}
    />
  )
}
