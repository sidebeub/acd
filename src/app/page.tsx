'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function Home() {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.l5x') && !fileName.endsWith('.acd') && !fileName.endsWith('.rss')) {
      setError('Please upload an .L5X, .ACD, or .RSS file')
      return
    }

    setError(null)
    setIsUploading(true)
    setUploadProgress(0)

    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90))
    }, 200)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/projects', {
        method: 'POST',
        body: formData
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Upload failed')
      }

      const project = await response.json()
      router.push(`/project/${project.id}`)
    } catch (err) {
      clearInterval(progressInterval)
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
  }

  return (
    <div className="min-h-screen-safe relative safe-area-inset" style={{ background: 'var(--surface-0)' }}>
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 grid-pattern opacity-20 pointer-events-none"
        style={{ maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)' }}
      />

      {/* Navigation */}
      <header
        className="sticky top-0 z-50 backdrop-blur-sm safe-area-top"
        style={{
          borderBlockEnd: '1px solid var(--border-subtle)',
          background: 'rgba(11, 13, 16, 0.8)',
          minHeight: 'var(--touch-target-min)'
        }}
      >
        <div className="container-default flex items-center justify-between" style={{ height: 'clamp(56px, 8vw, 64px)' }}>
          <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: 'clamp(36px, 5vw, 40px)',
                height: 'clamp(36px, 5vw, 40px)',
                background: 'var(--accent-blue-muted)',
                border: '1px solid var(--accent-blue)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2.5">
                <path d="M4 6h16M4 12h16M4 18h16" />
                <circle cx="8" cy="6" r="1" fill="currentColor" />
                <circle cx="16" cy="12" r="1" fill="currentColor" />
                <circle cx="12" cy="18" r="1" fill="currentColor" />
              </svg>
            </div>
            <span className="text-fluid-base font-semibold" style={{ color: 'var(--text-primary)' }}>
              PLC Viewer
            </span>
          </div>

          <nav className="hide-mobile flex items-center" style={{ gap: 'var(--space-8)' }}>
            <a
              href="#features"
              className="text-fluid-sm font-medium transition-colors hover:text-white"
              style={{ color: 'var(--text-tertiary)' }}
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="text-fluid-sm font-medium transition-colors hover:text-white"
              style={{ color: 'var(--text-tertiary)' }}
            >
              How It Works
            </a>
            <a
              href="#upload"
              className="btn btn-primary text-fluid-sm"
              style={{
                paddingInline: 'var(--space-4)',
                paddingBlock: 'var(--space-2)',
                minHeight: 'var(--touch-target-min)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              Upload File
            </a>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* ==================== HERO SECTION ==================== */}
        <section className="py-fluid-20" style={{ paddingBlock: 'var(--space-24)' }}>
          <div className="container-default text-center">
            <div
              className="inline-flex items-center"
              style={{
                gap: 'var(--space-2)',
                paddingInline: 'var(--space-4)',
                paddingBlock: 'var(--space-2)',
                marginBlockEnd: 'var(--space-8)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <span
                className="animate-pulse-subtle"
                style={{
                  width: '8px',
                  height: '8px',
                  background: 'var(--accent-emerald)',
                  borderRadius: 'var(--radius-sm)'
                }}
              />
              <span className="text-fluid-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Rockwell Automation Compatible
              </span>
            </div>

            <h1
              className="text-fluid-6xl font-bold tracking-tight"
              style={{
                color: 'var(--text-primary)',
                marginBlockEnd: 'var(--space-6)',
                lineHeight: '1.1'
              }}
            >
              Understand Your
              <br />
              <span style={{ color: 'var(--accent-blue)' }}>PLC Programs</span>
            </h1>

            <p
              className="text-fluid-xl"
              style={{
                color: 'var(--text-secondary)',
                lineHeight: '1.7',
                maxWidth: '42rem',
                marginInline: 'auto',
                marginBlockEnd: 'var(--space-10)'
              }}
            >
              Upload your Studio 5000 files and instantly visualize ladder logic,
              browse tags, and get AI-powered explanations that make complex control code easy to understand.
            </p>

            <div className="stack-to-row justify-center" style={{ gap: 'var(--space-4)' }}>
              <a
                href="#upload"
                className="btn btn-primary text-fluid-base inline-flex items-center justify-center"
                style={{
                  paddingInline: 'var(--space-8)',
                  paddingBlock: 'var(--space-3)',
                  gap: 'var(--space-2)',
                  minHeight: 'var(--touch-target-min)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                Upload PLC File
              </a>
              <a
                href="#how-it-works"
                className="btn btn-secondary text-fluid-base inline-flex items-center justify-center"
                style={{
                  paddingInline: 'var(--space-8)',
                  paddingBlock: 'var(--space-3)',
                  minHeight: 'var(--touch-target-min)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                See How It Works
              </a>
            </div>
          </div>
        </section>

        {/* ==================== TRUST INDICATORS ==================== */}
        <section
          className="py-fluid-8"
          style={{
            borderBlock: '1px solid var(--border-subtle)',
            background: 'var(--surface-1)'
          }}
        >
          <div className="container-default">
            <div
              className="flex flex-wrap items-center justify-center"
              style={{ gap: 'var(--space-8)' }}
            >
              <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>Files processed locally</span>
              </div>
              <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>No cloud storage required</span>
              </div>
              <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>Parse in seconds</span>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== PROBLEM / SOLUTION ==================== */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div
              className="grid items-center"
              style={{
                gap: 'var(--space-12)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))'
              }}
            >
              <div>
                <span
                  className="text-fluid-sm font-semibold uppercase tracking-wider block"
                  style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
                >
                  The Problem
                </span>
                <h2
                  className="text-fluid-4xl font-bold"
                  style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-6)' }}
                >
                  PLC code is hard to understand quickly
                </h2>
                <div className="stack" style={{ color: 'var(--text-secondary)', gap: 'var(--space-4)' }}>
                  <p className="text-fluid-base" style={{ lineHeight: '1.7' }}>
                    Maintenance technicians often face unfamiliar machines with thousands of rungs of ladder logic.
                    Understanding what a rung does requires experience with the specific controller, instruction set, and the machine itself.
                  </p>
                  <p className="text-fluid-base" style={{ lineHeight: '1.7' }}>
                    Without Studio 5000 on every workstation, reviewing PLC programs becomes a bottleneck.
                    Teams waste time searching for tag references and trying to trace signal flow through complex programs.
                  </p>
                </div>
              </div>
              <div
                className="container-inline"
                style={{
                  padding: 'var(--space-6)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <div className="stack" style={{ gap: 'var(--space-4)' }}>
                  {[
                    { title: 'Studio 5000 license required', desc: 'Expensive software limits who can view code' },
                    { title: 'Cryptic instruction mnemonics', desc: 'XIC, OTE, TON - what do they mean?' },
                    { title: 'No context for troubleshooting', desc: 'Hard to know where to look when things break' }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start"
                      style={{
                        gap: 'var(--space-4)',
                        padding: 'var(--space-4)',
                        background: 'var(--accent-red-muted)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" className="flex-shrink-0" style={{ marginBlockStart: '2px' }}>
                        <circle cx="12" cy="12" r="10" />
                        <path d="M15 9l-6 6M9 9l6 6" />
                      </svg>
                      <div>
                        <p className="text-fluid-base font-medium" style={{ color: 'var(--text-primary)' }}>{item.title}</p>
                        <p className="text-fluid-sm" style={{ color: 'var(--text-tertiary)' }}>{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== HOW IT WORKS ==================== */}
        <section id="how-it-works" className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
              >
                How It Works
              </span>
              <h2 className="text-fluid-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Three steps to clarity
              </h2>
            </div>

            <div
              className="grid-auto-fit container-inline"
              style={{ gap: 'var(--space-8)' }}
            >
              {/* Step 1 */}
              <div className="relative">
                <div
                  className="text-fluid-6xl font-bold"
                  style={{ color: 'var(--surface-4)', marginBlockEnd: 'var(--space-6)' }}
                >
                  01
                </div>
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 'clamp(48px, 8vw, 56px)',
                    height: 'clamp(48px, 8vw, 56px)',
                    marginBlockEnd: 'var(--space-5)',
                    background: 'var(--accent-blue-muted)',
                    border: '1px solid var(--accent-blue)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                </div>
                <h3 className="text-fluid-xl font-semibold" style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-3)' }}>
                  Upload Your File
                </h3>
                <p className="text-fluid-base" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Drop an L5X, ACD, or RSS file. Supports Studio 5000 (ControlLogix/CompactLogix) and RSLogix 500 (SLC 500/MicroLogix).
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div
                  className="text-fluid-6xl font-bold"
                  style={{ color: 'var(--surface-4)', marginBlockEnd: 'var(--space-6)' }}
                >
                  02
                </div>
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 'clamp(48px, 8vw, 56px)',
                    height: 'clamp(48px, 8vw, 56px)',
                    marginBlockEnd: 'var(--space-5)',
                    background: 'var(--accent-emerald-muted)',
                    border: '1px solid var(--accent-emerald)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 9h6M9 13h6M9 17h4" />
                  </svg>
                </div>
                <h3 className="text-fluid-xl font-semibold" style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-3)' }}>
                  Browse Structure
                </h3>
                <p className="text-fluid-base" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Navigate programs, routines, and tags in an intuitive tree view. Find what you need fast.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div
                  className="text-fluid-6xl font-bold"
                  style={{ color: 'var(--surface-4)', marginBlockEnd: 'var(--space-6)' }}
                >
                  03
                </div>
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: 'clamp(48px, 8vw, 56px)',
                    height: 'clamp(48px, 8vw, 56px)',
                    marginBlockEnd: 'var(--space-5)',
                    background: 'var(--accent-amber-muted)',
                    border: '1px solid var(--accent-amber)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
                  </svg>
                </div>
                <h3 className="text-fluid-xl font-semibold" style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-3)' }}>
                  Get Explanations
                </h3>
                <p className="text-fluid-base" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                  Click any rung to get AI-powered explanations in plain English. See troubleshooting tips instantly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== FEATURES ==================== */}
        <section id="features" className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
              >
                Features
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                Everything you need to understand PLC code
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                Purpose-built for controls engineers, maintenance technicians, and anyone who works with Allen-Bradley PLCs.
              </p>
            </div>

            <div
              className="grid container-inline"
              style={{
                gap: 'var(--space-6)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))'
              }}
            >
              {[
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--inst-input)" strokeWidth="1.5">
                      <rect x="3" y="6" width="4" height="12" rx="1" />
                      <rect x="10" y="6" width="4" height="12" rx="1" />
                      <rect x="17" y="6" width="4" height="12" rx="1" />
                      <path d="M5 9h2M5 12h2M5 15h2M12 9h2M12 12h2M19 9h2M19 12h2M19 15h2" strokeWidth="1" />
                    </svg>
                  ),
                  iconBg: 'rgba(34, 197, 94, 0.1)',
                  iconBorder: 'rgba(34, 197, 94, 0.2)',
                  title: 'Ladder Logic Visualization',
                  desc: 'Color-coded instructions make it easy to identify inputs, outputs, timers, counters, and math at a glance.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5">
                      <path d="M12 2a4 4 0 014 4v1a3 3 0 013 3v1h1a3 3 0 013 3v2a4 4 0 01-4 4h-1" />
                      <path d="M12 2a4 4 0 00-4 4v1a3 3 0 00-3 3v1H4a3 3 0 00-3 3v2a4 4 0 004 4h1" />
                      <circle cx="12" cy="14" r="4" />
                    </svg>
                  ),
                  iconBg: 'var(--accent-blue-muted)',
                  iconBorder: 'rgba(59, 130, 246, 0.3)',
                  title: 'AI-Powered Explanations',
                  desc: 'Get plain-English summaries of what each rung does. Choose between friendly, technical, or operator modes.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--inst-counter)" strokeWidth="1.5">
                      <path d="M12 2L2 7l10 5 10-5-10-5z" />
                      <path d="M2 17l10 5 10-5" />
                      <path d="M2 12l10 5 10-5" />
                    </svg>
                  ),
                  iconBg: 'rgba(168, 85, 247, 0.1)',
                  iconBorder: 'rgba(168, 85, 247, 0.2)',
                  title: 'Complete Tag Browser',
                  desc: 'Search and filter all controller and program-scoped tags. See data types, descriptions, and usage.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="1.5">
                      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                    </svg>
                  ),
                  iconBg: 'var(--accent-amber-muted)',
                  iconBorder: 'rgba(245, 158, 11, 0.3)',
                  title: 'Troubleshooting Tips',
                  desc: 'Each instruction includes context-aware troubleshooting suggestions to help diagnose issues faster.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--inst-jump)" strokeWidth="1.5">
                      <circle cx="5" cy="12" r="3" />
                      <circle cx="19" cy="6" r="3" />
                      <circle cx="19" cy="18" r="3" />
                      <path d="M8 12h4l3-6M12 12l3 6" />
                    </svg>
                  ),
                  iconBg: 'rgba(249, 115, 22, 0.1)',
                  iconBorder: 'rgba(249, 115, 22, 0.2)',
                  title: 'Program Structure View',
                  desc: 'Navigate tasks, programs, and routines in a hierarchical tree. See how your code is organized.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="1.5">
                      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                      <path d="M22 4L12 14.01l-3-3" />
                    </svg>
                  ),
                  iconBg: 'var(--accent-emerald-muted)',
                  iconBorder: 'rgba(16, 185, 129, 0.3)',
                  title: 'No PLC Software Required',
                  desc: 'View and analyze PLC programs without expensive software licenses. Works with L5X, ACD, and RSS files.'
                }
              ].map((feature, idx) => (
                <div
                  key={idx}
                  className="surface-card container-inline"
                  style={{ padding: 'var(--space-6)' }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 'clamp(40px, 6vw, 48px)',
                      height: 'clamp(40px, 6vw, 48px)',
                      marginBlockEnd: 'var(--space-5)',
                      background: feature.iconBg,
                      border: `1px solid ${feature.iconBorder}`,
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    {feature.icon}
                  </div>
                  <h3
                    className="text-fluid-lg font-semibold"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-2)' }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-fluid-sm" style={{ color: 'var(--text-tertiary)', lineHeight: '1.6' }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== SUPPORTED INSTRUCTIONS ==================== */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-12)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
              >
                Comprehensive Coverage
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                215+ Instructions Supported
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                From basic bit logic to advanced motion control, we have got you covered.
              </p>
            </div>

            <div className="flex flex-wrap justify-center" style={{ gap: 'var(--space-3)' }}>
              {[
                { name: 'Bit Logic', examples: 'XIC, XIO, OTE, OTL, OTU, ONS', color: 'var(--inst-input)' },
                { name: 'Timers', examples: 'TON, TOF, RTO, TONR', color: 'var(--inst-timer)' },
                { name: 'Counters', examples: 'CTU, CTD, CTUD, RES', color: 'var(--inst-counter)' },
                { name: 'Compare', examples: 'EQU, NEQ, GRT, LES, GEQ, LEQ', color: 'var(--inst-math)' },
                { name: 'Math', examples: 'ADD, SUB, MUL, DIV, CPT', color: 'var(--inst-math)' },
                { name: 'Move', examples: 'MOV, MVM, COP, FLL', color: 'var(--inst-move)' },
                { name: 'Program', examples: 'JSR, JMP, RET, FOR, NXT', color: 'var(--inst-jump)' },
                { name: 'Motion', examples: 'MSO, MSF, MAJ, MAM, MAS', color: 'var(--accent-blue)' },
              ].map((category) => (
                <div
                  key={category.name}
                  className="surface-card"
                  style={{
                    paddingInline: 'var(--space-4)',
                    paddingBlock: 'var(--space-3)'
                  }}
                >
                  <div className="text-fluid-sm font-semibold" style={{ color: category.color, marginBlockEnd: 'var(--space-1)' }}>
                    {category.name}
                  </div>
                  <div className="text-fluid-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                    {category.examples}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== WHO IT'S FOR ==================== */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
              >
                Use Cases
              </span>
              <h2 className="text-fluid-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Built for people who work with PLCs
              </h2>
            </div>

            <div
              className="grid-auto-fit container-inline"
              style={{ gap: 'var(--space-8)' }}
            >
              {[
                {
                  icon: (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="1.5">
                      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                    </svg>
                  ),
                  title: 'Maintenance Technicians',
                  desc: 'Quickly understand unfamiliar machine code during troubleshooting. Get context without needing Studio 5000.'
                },
                {
                  icon: (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                  ),
                  title: 'Controls Engineers',
                  desc: 'Review programs from integrators or legacy systems. Document code with AI-generated explanations.'
                },
                {
                  icon: (
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="1.5">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  ),
                  title: 'Training and Onboarding',
                  desc: 'Help new team members understand existing code. The friendly explanation mode breaks down complex logic.'
                }
              ].map((item, idx) => (
                <div key={idx} className="text-center">
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 'clamp(56px, 8vw, 64px)',
                      height: 'clamp(56px, 8vw, 64px)',
                      marginInline: 'auto',
                      marginBlockEnd: 'var(--space-5)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    {item.icon}
                  </div>
                  <h3
                    className="text-fluid-xl font-semibold"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-3)' }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-fluid-base" style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== UPLOAD CTA ==================== */}
        <section id="upload" className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-narrow">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-12)' }}>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                Ready to get started?
              </h2>
              <p className="text-fluid-lg" style={{ color: 'var(--text-secondary)' }}>
                Upload your L5X, ACD, or RSS file and start exploring your PLC program.
              </p>
            </div>

            {/* Upload card */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative transition-all duration-200 ${isUploading ? 'pointer-events-none' : ''}`}
              style={{
                padding: 'var(--space-10)',
                background: isDragging ? 'var(--accent-blue-muted)' : 'var(--surface-2)',
                border: `2px dashed ${isDragging ? 'var(--accent-blue)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)'
              }}
            >
              <input
                type="file"
                accept=".l5x,.acd,.rss"
                onChange={handleInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
                style={{ minHeight: 'var(--touch-target-min)' }}
              />

              {isUploading ? (
                <div className="text-center" style={{ paddingBlock: 'var(--space-4)' }}>
                  <div style={{ marginBlockEnd: 'var(--space-4)' }}>
                    <svg className="animate-pulse-subtle" style={{ width: '48px', height: '48px', marginInline: 'auto' }} viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5">
                      <path d="M12 3v12M12 3l4 4M12 3L8 7" />
                      <path d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4" />
                    </svg>
                  </div>
                  <p
                    className="text-fluid-base font-medium"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
                  >
                    Processing file...
                  </p>
                  <div
                    className="overflow-hidden"
                    style={{
                      width: 'clamp(200px, 50vw, 288px)',
                      height: '6px',
                      marginInline: 'auto',
                      background: 'var(--surface-4)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div
                      className="transition-all duration-200"
                      style={{
                        height: '100%',
                        background: 'var(--accent-blue)',
                        width: `${uploadProgress}%`,
                        borderRadius: 'var(--radius-sm)'
                      }}
                    />
                  </div>
                  <p
                    className="text-fluid-sm"
                    style={{ color: 'var(--text-muted)', marginBlockStart: 'var(--space-3)' }}
                  >
                    Parsing program structure...
                  </p>
                </div>
              ) : (
                <div className="text-center" style={{ paddingBlock: 'var(--space-4)' }}>
                  <div style={{ marginBlockEnd: 'var(--space-5)' }}>
                    <svg
                      className="transition-colors"
                      style={{ width: 'clamp(48px, 8vw, 56px)', height: 'clamp(48px, 8vw, 56px)', marginInline: 'auto' }}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isDragging ? 'var(--accent-blue)' : 'var(--text-muted)'}
                      strokeWidth="1.5"
                    >
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                  </div>
                  <p
                    className="text-fluid-lg font-medium"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-2)' }}
                  >
                    {isDragging ? 'Drop to upload' : 'Drop your file here'}
                  </p>
                  <p
                    className="text-fluid-sm"
                    style={{ color: 'var(--text-muted)', marginBlockEnd: 'var(--space-4)' }}
                  >
                    or <span style={{ color: 'var(--accent-blue)' }} className="cursor-pointer font-medium">browse</span> to select a file
                  </p>
                  <div className="flex items-center justify-center" style={{ gap: 'var(--space-4)' }}>
                    <span className="tech-badge">.L5X</span>
                    <span className="tech-badge">.ACD</span>
                    <span className="tech-badge">.RSS</span>
                  </div>
                </div>
              )}
            </div>

            {/* Error message */}
            {error && (
              <div
                className="flex items-center"
                style={{
                  marginBlockStart: 'var(--space-4)',
                  paddingInline: 'var(--space-4)',
                  paddingBlock: 'var(--space-3)',
                  gap: 'var(--space-3)',
                  background: 'var(--accent-red-muted)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
                <span className="text-fluid-sm" style={{ color: 'var(--accent-red)' }}>{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* ==================== FOOTER ==================== */}
        <footer
          className="safe-area-bottom"
          style={{
            borderBlockStart: '1px solid var(--border-subtle)',
            background: 'var(--surface-0)',
            paddingBlock: 'var(--space-12)'
          }}
        >
          <div className="container-default">
            <div className="stack-to-row justify-between" style={{ gap: 'var(--space-6)' }}>
              <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                <div
                  className="flex items-center justify-center"
                  style={{
                    width: '32px',
                    height: '32px',
                    background: 'var(--accent-blue-muted)',
                    border: '1px solid var(--accent-blue)',
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2.5">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                    <circle cx="8" cy="6" r="1" fill="currentColor" />
                    <circle cx="16" cy="12" r="1" fill="currentColor" />
                    <circle cx="12" cy="18" r="1" fill="currentColor" />
                  </svg>
                </div>
                <span className="text-fluid-base font-semibold" style={{ color: 'var(--text-primary)' }}>
                  PLC Viewer
                </span>
              </div>

              <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>
                Compatible with Allen-Bradley ControlLogix, CompactLogix, GuardLogix, SLC 500, and MicroLogix
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
