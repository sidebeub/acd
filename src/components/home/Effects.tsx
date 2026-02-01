'use client'

import { useEffect, useRef, useState } from 'react'

// ============================================
// ANIMATED COUNTER - Counts up when visible
// ============================================
export function AnimatedCounter({
  end,
  duration = 2000,
  suffix = ''
}: {
  end: number
  duration?: number
  suffix?: string
}) {
  const [count, setCount] = useState(0)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          let startTime: number
          const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime
            const elapsed = currentTime - startTime
            const progress = Math.min(elapsed / duration, 1)
            // Smooth easing
            const eased = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(eased * end))
            if (progress < 1) {
              requestAnimationFrame(animate)
            }
          }
          requestAnimationFrame(animate)
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [end, duration, hasAnimated])

  return <span ref={ref}>{count}{suffix}</span>
}

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

// ============================================
// TYPEWRITER EFFECT - Types out text character by character
// ============================================
export function Typewriter({
  text,
  speed = 80,
  delay = 0,
  className = ''
}: {
  text: string
  speed?: number
  delay?: number
  className?: string
}) {
  const [displayText, setDisplayText] = useState('')
  const [showCursor, setShowCursor] = useState(true)
  const [isComplete, setIsComplete] = useState(false)

  useEffect(() => {
    let timeout: NodeJS.Timeout
    let charIndex = 0

    const startTyping = () => {
      const type = () => {
        if (charIndex < text.length) {
          setDisplayText(text.slice(0, charIndex + 1))
          charIndex++
          timeout = setTimeout(type, speed)
        } else {
          setIsComplete(true)
        }
      }
      type()
    }

    timeout = setTimeout(startTyping, delay)

    return () => clearTimeout(timeout)
  }, [text, speed, delay])

  // Blink cursor after typing completes
  useEffect(() => {
    if (!isComplete) return
    const interval = setInterval(() => {
      setShowCursor(prev => !prev)
    }, 530)
    return () => clearInterval(interval)
  }, [isComplete])

  return (
    <span className={className}>
      {displayText}
      <span
        style={{
          opacity: showCursor ? 1 : 0,
          color: 'var(--accent)',
          fontWeight: 400,
          marginLeft: '2px',
          transition: 'opacity 0.1s ease'
        }}
      >
        |
      </span>
    </span>
  )
}

// ============================================
// FADE IN ON SCROLL - Reveals content when visible
// ============================================
export function FadeInOnScroll({
  children,
  delay = 0,
  direction = 'up'
}: {
  children: React.ReactNode
  delay?: number
  direction?: 'up' | 'down' | 'left' | 'right'
}) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.1 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [])

  const transforms = {
    up: 'translateY(30px)',
    down: 'translateY(-30px)',
    left: 'translateX(30px)',
    right: 'translateX(-30px)'
  }

  return (
    <div
      ref={ref}
      style={{
        opacity: isVisible ? 1 : 0,
        transform: isVisible ? 'translate(0)' : transforms[direction],
        transition: `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`
      }}
    >
      {children}
    </div>
  )
}
