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
    <div className="min-h-screen relative" style={{ background: 'var(--surface-0)' }}>
      {/* Subtle grid background */}
      <div
        className="fixed inset-0 grid-pattern opacity-20 pointer-events-none"
        style={{ maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)' }}
      />

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b backdrop-blur-sm" style={{ borderColor: 'var(--border-subtle)', background: 'rgba(11, 13, 16, 0.8)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 flex items-center justify-center"
              style={{ background: 'var(--accent-blue-muted)', border: '1px solid var(--accent-blue)' }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2.5">
                <path d="M4 6h16M4 12h16M4 18h16" />
                <circle cx="8" cy="6" r="1" fill="currentColor" />
                <circle cx="16" cy="12" r="1" fill="currentColor" />
                <circle cx="12" cy="18" r="1" fill="currentColor" />
              </svg>
            </div>
            <span className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>
              PLC Viewer
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium transition-colors hover:text-white" style={{ color: 'var(--text-tertiary)' }}>Features</a>
            <a href="#how-it-works" className="text-sm font-medium transition-colors hover:text-white" style={{ color: 'var(--text-tertiary)' }}>How It Works</a>
            <a href="#upload" className="btn btn-primary text-sm px-4 py-2">
              Upload File
            </a>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* ==================== HERO SECTION ==================== */}
        <section className="py-24 md:py-32">
          <div className="max-w-6xl mx-auto px-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 mb-8"
                 style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
              <span className="w-2 h-2 animate-pulse-subtle" style={{ background: 'var(--accent-emerald)' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Rockwell Automation Compatible
              </span>
            </div>

            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6" style={{ color: 'var(--text-primary)' }}>
              Understand Your
              <br />
              <span style={{ color: 'var(--accent-blue)' }}>PLC Programs</span>
            </h1>

            <p className="text-xl max-w-2xl mx-auto mb-10" style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
              Upload your Studio 5000 files and instantly visualize ladder logic,
              browse tags, and get AI-powered explanations that make complex control code easy to understand.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a href="#upload" className="btn btn-primary text-base px-8 py-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                Upload PLC File
              </a>
              <a href="#how-it-works" className="btn btn-secondary text-base px-8 py-3">
                See How It Works
              </a>
            </div>
          </div>
        </section>

        {/* ==================== TRUST INDICATORS ==================== */}
        <section className="py-8 border-y" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-1)' }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Files processed locally</span>
              </div>
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>No cloud storage required</span>
              </div>
              <div className="flex items-center gap-3">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Parse in seconds</span>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== PROBLEM / SOLUTION ==================== */}
        <section className="py-24" style={{ background: 'var(--surface-0)' }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <span className="text-sm font-semibold uppercase tracking-wider mb-4 block" style={{ color: 'var(--accent-blue)' }}>
                  The Problem
                </span>
                <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: 'var(--text-primary)' }}>
                  PLC code is hard to understand quickly
                </h2>
                <div className="space-y-4" style={{ color: 'var(--text-secondary)' }}>
                  <p>
                    Maintenance technicians often face unfamiliar machines with thousands of rungs of ladder logic.
                    Understanding what a rung does requires experience with the specific controller, instruction set, and the machine itself.
                  </p>
                  <p>
                    Without Studio 5000 on every workstation, reviewing PLC programs becomes a bottleneck.
                    Teams waste time searching for tag references and trying to trace signal flow through complex programs.
                  </p>
                </div>
              </div>
              <div className="p-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4" style={{ background: 'var(--accent-red-muted)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M15 9l-6 6M9 9l6 6" />
                    </svg>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Studio 5000 license required</p>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Expensive software limits who can view code</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4" style={{ background: 'var(--accent-red-muted)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M15 9l-6 6M9 9l6 6" />
                    </svg>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>Cryptic instruction mnemonics</p>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>XIC, OTE, TON - what do they mean?</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4 p-4" style={{ background: 'var(--accent-red-muted)' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M15 9l-6 6M9 9l6 6" />
                    </svg>
                    <div>
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>No context for troubleshooting</p>
                      <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Hard to know where to look when things break</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== HOW IT WORKS ==================== */}
        <section id="how-it-works" className="py-24" style={{ background: 'var(--surface-1)' }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-sm font-semibold uppercase tracking-wider mb-4 block" style={{ color: 'var(--accent-blue)' }}>
                How It Works
              </span>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Three steps to clarity
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {/* Step 1 */}
              <div className="relative">
                <div className="text-6xl font-bold mb-6" style={{ color: 'var(--surface-4)' }}>01</div>
                <div
                  className="w-14 h-14 flex items-center justify-center mb-5"
                  style={{ background: 'var(--accent-blue-muted)', border: '1px solid var(--accent-blue)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Upload Your File</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Drop an L5X, ACD, or RSS file. Supports Studio 5000 (ControlLogix/CompactLogix) and RSLogix 500 (SLC 500/MicroLogix).
                </p>
              </div>

              {/* Step 2 */}
              <div className="relative">
                <div className="text-6xl font-bold mb-6" style={{ color: 'var(--surface-4)' }}>02</div>
                <div
                  className="w-14 h-14 flex items-center justify-center mb-5"
                  style={{ background: 'var(--accent-emerald-muted)', border: '1px solid var(--accent-emerald)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 9h6M9 13h6M9 17h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Browse Structure</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Navigate programs, routines, and tags in an intuitive tree view. Find what you need fast.
                </p>
              </div>

              {/* Step 3 */}
              <div className="relative">
                <div className="text-6xl font-bold mb-6" style={{ color: 'var(--surface-4)' }}>03</div>
                <div
                  className="w-14 h-14 flex items-center justify-center mb-5"
                  style={{ background: 'var(--accent-amber-muted)', border: '1px solid var(--accent-amber)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3M12 17h.01" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Get Explanations</h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Click any rung to get AI-powered explanations in plain English. See troubleshooting tips instantly.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== FEATURES ==================== */}
        <section id="features" className="py-24" style={{ background: 'var(--surface-0)' }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-sm font-semibold uppercase tracking-wider mb-4 block" style={{ color: 'var(--accent-blue)' }}>
                Features
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                Everything you need to understand PLC code
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                Purpose-built for controls engineers, maintenance technicians, and anyone who works with Allen-Bradley PLCs.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Feature 1 - Ladder Logic Visualization */}
              <div className="p-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                <div
                  className="w-12 h-12 flex items-center justify-center mb-5"
                  style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--inst-input)" strokeWidth="1.5">
                    <rect x="3" y="6" width="4" height="12" rx="1" />
                    <rect x="10" y="6" width="4" height="12" rx="1" />
                    <rect x="17" y="6" width="4" height="12" rx="1" />
                    <path d="M5 9h2M5 12h2M5 15h2M12 9h2M12 12h2M19 9h2M19 12h2M19 15h2" strokeWidth="1" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Ladder Logic Visualization
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  Color-coded instructions make it easy to identify inputs, outputs, timers, counters, and math at a glance.
                </p>
              </div>

              {/* Feature 2 - AI Explanations */}
              <div className="p-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                <div
                  className="w-12 h-12 flex items-center justify-center mb-5"
                  style={{ background: 'var(--accent-blue-muted)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5">
                    <path d="M12 2a4 4 0 014 4v1a3 3 0 013 3v1h1a3 3 0 013 3v2a4 4 0 01-4 4h-1" />
                    <path d="M12 2a4 4 0 00-4 4v1a3 3 0 00-3 3v1H4a3 3 0 00-3 3v2a4 4 0 004 4h1" />
                    <circle cx="12" cy="14" r="4" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  AI-Powered Explanations
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  Get plain-English summaries of what each rung does. Choose between friendly, technical, or operator modes.
                </p>
              </div>

              {/* Feature 3 - Tag Browser */}
              <div className="p-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                <div
                  className="w-12 h-12 flex items-center justify-center mb-5"
                  style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--inst-counter)" strokeWidth="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Complete Tag Browser
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  Search and filter all controller and program-scoped tags. See data types, descriptions, and usage.
                </p>
              </div>

              {/* Feature 4 - Troubleshooting Tips */}
              <div className="p-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                <div
                  className="w-12 h-12 flex items-center justify-center mb-5"
                  style={{ background: 'var(--accent-amber-muted)', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="1.5">
                    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Troubleshooting Tips
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  Each instruction includes context-aware troubleshooting suggestions to help diagnose issues faster.
                </p>
              </div>

              {/* Feature 5 - Program Structure */}
              <div className="p-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                <div
                  className="w-12 h-12 flex items-center justify-center mb-5"
                  style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--inst-jump)" strokeWidth="1.5">
                    <circle cx="5" cy="12" r="3" />
                    <circle cx="19" cy="6" r="3" />
                    <circle cx="19" cy="18" r="3" />
                    <path d="M8 12h4l3-6M12 12l3 6" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  Program Structure View
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  Navigate tasks, programs, and routines in a hierarchical tree. See how your code is organized.
                </p>
              </div>

              {/* Feature 6 - No License Required */}
              <div className="p-6" style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
                <div
                  className="w-12 h-12 flex items-center justify-center mb-5"
                  style={{ background: 'var(--accent-emerald-muted)', border: '1px solid rgba(16, 185, 129, 0.3)' }}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="1.5">
                    <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                    <path d="M22 4L12 14.01l-3-3" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
                  No PLC Software Required
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  View and analyze PLC programs without expensive software licenses. Works with L5X, ACD, and RSS files.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== SUPPORTED INSTRUCTIONS ==================== */}
        <section className="py-24" style={{ background: 'var(--surface-1)' }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-12">
              <span className="text-sm font-semibold uppercase tracking-wider mb-4 block" style={{ color: 'var(--accent-blue)' }}>
                Comprehensive Coverage
              </span>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                215+ Instructions Supported
              </h2>
              <p className="text-lg max-w-2xl mx-auto" style={{ color: 'var(--text-secondary)' }}>
                From basic bit logic to advanced motion control, we've got you covered.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-3">
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
                  className="px-4 py-3 "
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="text-sm font-semibold mb-1" style={{ color: category.color }}>
                    {category.name}
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                    {category.examples}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== WHO IT'S FOR ==================== */}
        <section className="py-24" style={{ background: 'var(--surface-0)' }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="text-center mb-16">
              <span className="text-sm font-semibold uppercase tracking-wider mb-4 block" style={{ color: 'var(--accent-blue)' }}>
                Use Cases
              </span>
              <h2 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--text-primary)' }}>
                Built for people who work with PLCs
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div
                  className="w-16 h-16 flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="1.5">
                    <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Maintenance Technicians
                </h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Quickly understand unfamiliar machine code during troubleshooting. Get context without needing Studio 5000.
                </p>
              </div>

              <div className="text-center">
                <div
                  className="w-16 h-16 flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5">
                    <rect x="2" y="3" width="20" height="14" rx="2" />
                    <path d="M8 21h8M12 17v4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Controls Engineers
                </h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Review programs from integrators or legacy systems. Document code with AI-generated explanations.
                </p>
              </div>

              <div className="text-center">
                <div
                  className="w-16 h-16 flex items-center justify-center mx-auto mb-5"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="1.5">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>
                  Training & Onboarding
                </h3>
                <p style={{ color: 'var(--text-secondary)' }}>
                  Help new team members understand existing code. The friendly explanation mode breaks down complex logic.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== UPLOAD CTA ==================== */}
        <section id="upload" className="py-24" style={{ background: 'var(--surface-1)' }}>
          <div className="max-w-3xl mx-auto px-6">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                Ready to get started?
              </h2>
              <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
                Upload your L5X, ACD, or RSS file and start exploring your PLC program.
              </p>
            </div>

            {/* Upload card */}
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`relative p-10  transition-all duration-200 ${
                isUploading ? 'pointer-events-none' : ''
              }`}
              style={{
                background: isDragging ? 'var(--accent-blue-muted)' : 'var(--surface-2)',
                border: `2px dashed ${isDragging ? 'var(--accent-blue)' : 'var(--border-default)'}`,
              }}
            >
              <input
                type="file"
                accept=".l5x,.acd,.rss"
                onChange={handleInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />

              {isUploading ? (
                <div className="text-center py-4">
                  <div className="mb-4">
                    <svg className="w-12 h-12 mx-auto animate-pulse-subtle" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5">
                      <path d="M12 3v12M12 3l4 4M12 3L8 7" />
                      <path d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4" />
                    </svg>
                  </div>
                  <p className="text-base font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                    Processing file...
                  </p>
                  <div className="w-72 h-1.5 mx-auto overflow-hidden" style={{ background: 'var(--surface-4)' }}>
                    <div
                      className="h-full transition-all duration-200"
                      style={{
                        background: 'var(--accent-blue)',
                        width: `${uploadProgress}%`
                      }}
                    />
                  </div>
                  <p className="text-sm mt-3" style={{ color: 'var(--text-muted)' }}>
                    Parsing program structure...
                  </p>
                </div>
              ) : (
                <div className="text-center py-4">
                  <div className="mb-5">
                    <svg
                      className="w-14 h-14 mx-auto transition-colors"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={isDragging ? 'var(--accent-blue)' : 'var(--text-muted)'}
                      strokeWidth="1.5"
                    >
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                    {isDragging ? 'Drop to upload' : 'Drop your file here'}
                  </p>
                  <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                    or <span style={{ color: 'var(--accent-blue)' }} className="cursor-pointer font-medium">browse</span> to select a file
                  </p>
                  <div className="flex items-center justify-center gap-4">
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
                className="mt-4 px-4 py-3 flex items-center gap-3"
                style={{ background: 'var(--accent-red-muted)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
                <span className="text-sm" style={{ color: 'var(--accent-red)' }}>{error}</span>
              </div>
            )}
          </div>
        </section>

        {/* ==================== FOOTER ==================== */}
        <footer className="py-12 border-t" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-0)' }}>
          <div className="max-w-6xl mx-auto px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div
                  className="w-8 h-8 flex items-center justify-center"
                  style={{ background: 'var(--accent-blue-muted)', border: '1px solid var(--accent-blue)' }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2.5">
                    <path d="M4 6h16M4 12h16M4 18h16" />
                    <circle cx="8" cy="6" r="1" fill="currentColor" />
                    <circle cx="16" cy="12" r="1" fill="currentColor" />
                    <circle cx="12" cy="18" r="1" fill="currentColor" />
                  </svg>
                </div>
                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  PLC Viewer
                </span>
              </div>

              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                Compatible with Allen-Bradley ControlLogix, CompactLogix, GuardLogix, SLC 500, and MicroLogix
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
