'use client'

import { useEffect, useRef, useState } from 'react'

// ============================================
// SCROLL PROGRESS BAR
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
        background: 'linear-gradient(90deg, var(--accent-emerald), var(--accent-blue))',
        zIndex: 9999,
        transition: 'width 0.1s linear'
      }}
    />
  )
}

// ============================================
// COUNTER ANIMATION
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

            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4)
            setCount(Math.floor(easeOutQuart * end))

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
// TEXT SCRAMBLE EFFECT
// ============================================
export function ScrambleText({
  text,
  className,
  style
}: {
  text: string
  className?: string
  style?: React.CSSProperties
}) {
  const [displayText, setDisplayText] = useState(text)
  const [hasAnimated, setHasAnimated] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimated) {
          setHasAnimated(true)
          let iteration = 0
          const interval = setInterval(() => {
            setDisplayText(
              text
                .split('')
                .map((char, index) => {
                  if (char === ' ') return ' '
                  if (index < iteration) return text[index]
                  return chars[Math.floor(Math.random() * chars.length)]
                })
                .join('')
            )

            if (iteration >= text.length) {
              clearInterval(interval)
            }
            iteration += 1 / 3
          }, 30)
        }
      },
      { threshold: 0.5 }
    )

    if (ref.current) {
      observer.observe(ref.current)
    }

    return () => observer.disconnect()
  }, [text, hasAnimated])

  return (
    <span ref={ref} className={className} style={style}>
      {displayText}
    </span>
  )
}

// ============================================
// TYPEWRITER EFFECT
// ============================================
export function Typewriter({
  texts,
  speed = 100,
  deleteSpeed = 50,
  pauseTime = 2000
}: {
  texts: string[]
  speed?: number
  deleteSpeed?: number
  pauseTime?: number
}) {
  const [displayText, setDisplayText] = useState('')
  const [textIndex, setTextIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const currentText = texts[textIndex]

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        if (displayText.length < currentText.length) {
          setDisplayText(currentText.slice(0, displayText.length + 1))
        } else {
          setTimeout(() => setIsDeleting(true), pauseTime)
        }
      } else {
        if (displayText.length > 0) {
          setDisplayText(displayText.slice(0, -1))
        } else {
          setIsDeleting(false)
          setTextIndex((prev) => (prev + 1) % texts.length)
        }
      }
    }, isDeleting ? deleteSpeed : speed)

    return () => clearTimeout(timeout)
  }, [displayText, isDeleting, textIndex, texts, speed, deleteSpeed, pauseTime])

  return (
    <span>
      {displayText}
      <span
        className="animate-pulse"
        style={{
          borderRight: '2px solid var(--accent-emerald)',
          marginLeft: '2px'
        }}
      />
    </span>
  )
}

// ============================================
// TILT CARD EFFECT
// ============================================
export function TiltCard({
  children,
  className,
  style
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [transform, setTransform] = useState('')

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return
    const rect = ref.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = (y - centerY) / 10
    const rotateY = (centerX - x) / 10

    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`)
  }

  const handleMouseLeave = () => {
    setTransform('')
  }

  return (
    <div
      ref={ref}
      className={className}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        ...style,
        transform,
        transition: transform ? 'none' : 'transform 0.5s ease'
      }}
    >
      {children}
    </div>
  )
}

// ============================================
// FLOATING ELEMENTS
// ============================================
export function FloatingElements() {
  return (
    <div
      className="pointer-events-none"
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        zIndex: 1
      }}
    >
      {/* Floating squares */}
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="floating-element"
          style={{
            position: 'absolute',
            width: `${20 + i * 10}px`,
            height: `${20 + i * 10}px`,
            border: '1px solid var(--border-subtle)',
            opacity: 0.3,
            left: `${10 + i * 20}%`,
            top: `${20 + i * 15}%`,
            animation: `float-${i % 3} ${8 + i * 2}s ease-in-out infinite`,
            animationDelay: `${i * 0.5}s`
          }}
        />
      ))}
    </div>
  )
}

// ============================================
// GRAIN TEXTURE OVERLAY
// ============================================
export function GrainOverlay() {
  return (
    <div
      className="pointer-events-none"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9998,
        opacity: 0.03,
        background: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
      }}
    />
  )
}

// ============================================
// PARALLAX CONTAINER
// ============================================
export function ParallaxVideo({
  src,
  children
}: {
  src: string
  children?: React.ReactNode
}) {
  const [offset, setOffset] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const scrollProgress = -rect.top / window.innerHeight
      setOffset(scrollProgress * 50) // 50px max parallax
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div ref={ref} className="absolute inset-0 z-0 overflow-hidden">
      <video
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-full object-cover"
        style={{
          transform: `translateY(${offset}px) scale(1.1)`
        }}
      >
        <source src={src} type="video/webm" />
      </video>
      {children}
    </div>
  )
}
