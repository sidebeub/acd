'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { trackEvent } from '@/lib/analytics'

// FAQ data for schema markup
const faqs = [
  {
    question: "Can I view L5X files without Studio 5000?",
    answer: "Yes! PLC Viewer lets you open and view L5X files without needing Studio 5000 installed. Browse programs, routines, tags, ladder logic, and get AI-powered explanations - all without expensive Rockwell software licenses."
  },
  {
    question: "Is there an affordable L5X viewer?",
    answer: "PLC Viewer offers L5X viewing at a fraction of Studio 5000's cost. There's no software to install and it works entirely in your browser. Simply upload your L5X file and instantly view your ControlLogix or CompactLogix program."
  },
  {
    question: "How do I open L5X files without Rockwell software?",
    answer: "Upload your L5X file to PLC Viewer at plc.company. The file is processed securely. You'll be able to browse the complete program structure, view ladder logic rungs, examine tags and data types, and understand the code with AI explanations."
  },
  {
    question: "What can I see in an L5X file without Studio 5000?",
    answer: "With PLC Viewer, you can see everything in the export: controller configuration, all programs and routines, ladder logic with color-coded instructions, function block diagrams, structured text, controller and program tags, User-Defined Types (UDTs), and Add-On Instructions (AOIs)."
  },
  {
    question: "Is my L5X file secure when viewing online?",
    answer: "Absolutely. Your L5X file is processed securely and your proprietary PLC programs and control logic stay protected."
  },
  {
    question: "Does the viewer work with all ControlLogix versions?",
    answer: "Yes, PLC Viewer supports L5X exports from all Studio 5000 versions and all Logix controller families including ControlLogix 5570/5580, CompactLogix 5370/5380/5480, and GuardLogix safety controllers."
  }
]

// How-to steps for structured data
const howToSteps = [
  {
    name: "Export your project from Studio 5000",
    text: "In Studio 5000 Logix Designer, go to File > Export and select 'Export Program' or 'Export Controller'. Choose L5X as the format and save the file."
  },
  {
    name: "Navigate to PLC Viewer",
    text: "Open your web browser and go to plcviewer.com. No account or software installation required."
  },
  {
    name: "Upload your L5X file",
    text: "Drag and drop your L5X file onto the upload area, or click to browse and select the file from your computer."
  },
  {
    name: "Browse your program",
    text: "Instantly view your complete PLC program including ladder logic, tags, routines, and program structure - all without Studio 5000."
  }
]

export default function ViewL5xWithoutStudio5000Page() {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.l5x')) {
      setError('Please upload an .L5X file')
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
      trackEvent('file_upload', { file_type: 'l5x' })
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
          <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>
            <Logo size="sm" />
          </Link>

          <nav className="hide-mobile flex items-center" style={{ gap: 'var(--space-8)' }}>
            <Link
              href="/l5x-file"
              className="text-fluid-sm font-medium transition-colors hover:text-white"
              style={{ color: 'var(--text-tertiary)' }}
            >
              L5X Files
            </Link>
            <Link
              href="/acd-file"
              className="text-fluid-sm font-medium transition-colors hover:text-white"
              style={{ color: 'var(--text-tertiary)' }}
            >
              ACD Files
            </Link>
            <Link
              href="/rss-file"
              className="text-fluid-sm font-medium transition-colors hover:text-white"
              style={{ color: 'var(--text-tertiary)' }}
            >
              RSS Files
            </Link>
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
              View L5X Now
            </a>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section - The Problem */}
        <section className="py-fluid-20" style={{ paddingBlock: 'var(--space-24)' }}>
          <div className="container-default text-center">
            <div
              className="inline-flex items-center"
              style={{
                gap: 'var(--space-2)',
                paddingInline: 'var(--space-4)',
                paddingBlock: 'var(--space-2)',
                marginBlockEnd: 'var(--space-8)',
                background: 'var(--accent-amber-muted)',
                border: '1px solid var(--accent-amber)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2">
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              </svg>
              <span className="text-fluid-sm font-medium" style={{ color: 'var(--accent-amber)' }}>
                Studio 5000 costs $5,000+ per license
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
              View L5X Files
              <br />
              <span style={{ color: 'var(--accent-blue)' }}>Without Studio 5000</span>
            </h1>

            <p
              className="text-fluid-xl"
              style={{
                color: 'var(--text-secondary)',
                lineHeight: '1.7',
                maxWidth: '48rem',
                marginInline: 'auto',
                marginBlockEnd: 'var(--space-10)'
              }}
            >
              Need to view L5X files but don't have a Studio 5000 license? You're not alone.
              PLC Viewer is a <strong style={{ color: 'var(--text-primary)' }}>online L5X viewer</strong> that
              lets you open L5X files online, right in your browser - no Rockwell software required.
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
                View L5X File
              </a>
              <a
                href="#how-to"
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

        {/* The Problem Section */}
        <article
          className="py-fluid-8"
          style={{
            borderBlock: '1px solid var(--border-subtle)',
            background: 'var(--surface-1)'
          }}
        >
          <div className="container-default">
            <div
              className="grid items-center"
              style={{
                gap: 'var(--space-8)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))'
              }}
            >
              <div
                className="flex items-center"
                style={{
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  background: 'var(--accent-red-muted)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2" className="flex-shrink-0">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M15 9l-6 6M9 9l6 6" />
                </svg>
                <div>
                  <p className="text-fluid-base font-medium" style={{ color: 'var(--text-primary)' }}>Studio 5000: $5,000+</p>
                  <p className="text-fluid-sm" style={{ color: 'var(--text-tertiary)' }}>Per seat, annual license</p>
                </div>
              </div>

              <div
                className="flex items-center"
                style={{
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  background: 'var(--accent-emerald-muted)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2" className="flex-shrink-0">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
                <div>
                  <p className="text-fluid-base font-medium" style={{ color: 'var(--text-primary)' }}>PLC Viewer: Affordable</p>
                  <p className="text-fluid-sm" style={{ color: 'var(--text-tertiary)' }}>No license, no install</p>
                </div>
              </div>

              <div
                className="flex items-center"
                style={{
                  gap: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  background: 'var(--accent-blue-muted)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: 'var(--radius-sm)'
                }}
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2" className="flex-shrink-0">
                  <rect x="2" y="3" width="20" height="14" rx="2" />
                  <path d="M8 21h8M12 17v4" />
                </svg>
                <div>
                  <p className="text-fluid-base font-medium" style={{ color: 'var(--text-primary)' }}>Browser-Based</p>
                  <p className="text-fluid-sm" style={{ color: 'var(--text-tertiary)' }}>Works on any device</p>
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Solution Section */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div
              className="grid items-start"
              style={{
                gap: 'var(--space-12)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))'
              }}
            >
              <article>
                <span
                  className="text-fluid-sm font-semibold uppercase tracking-wider block"
                  style={{ color: 'var(--accent-emerald)', marginBlockEnd: 'var(--space-4)' }}
                >
                  The Solution
                </span>
                <h2
                  className="text-fluid-4xl font-bold"
                  style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-6)' }}
                >
                  Online ControlLogix Viewer
                </h2>
                <div className="stack" style={{ color: 'var(--text-secondary)', gap: 'var(--space-4)' }}>
                  <p className="text-fluid-base" style={{ lineHeight: '1.7' }}>
                    PLC Viewer lets you <strong style={{ color: 'var(--text-primary)' }}>view L5X files without Studio 5000</strong> or
                    any other Rockwell Automation software. It's perfect for:
                  </p>
                  <ul className="stack" style={{ gap: 'var(--space-2)', paddingInlineStart: 'var(--space-6)', listStyle: 'disc' }}>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Contractors who need to review client programs</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Engineers sharing code with team members</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Maintenance techs troubleshooting without a license</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Students learning PLC programming</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Anyone who needs to open L5X files online</li>
                  </ul>
                  <p className="text-fluid-base" style={{ lineHeight: '1.7' }}>
                    Our online L5X viewer supports all ControlLogix, CompactLogix, and GuardLogix exports.
                    View ladder logic, function blocks, structured text, tags, UDTs, and AOIs instantly.
                  </p>
                </div>
              </article>

              <div
                className="container-inline"
                style={{
                  padding: 'var(--space-6)',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <span
                  className="text-fluid-sm font-semibold uppercase tracking-wider block"
                  style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
                >
                  What You Can View
                </span>
                <div className="stack" style={{ gap: 'var(--space-4)' }}>
                  {[
                    { title: 'Ladder Logic', desc: 'Color-coded rungs with all 215+ instructions' },
                    { title: 'Tags & Data Types', desc: 'Controller tags, program tags, UDTs, and AOIs' },
                    { title: 'Program Structure', desc: 'Tasks, programs, routines, and subroutines' },
                    { title: 'Function Blocks', desc: 'FBD diagrams rendered visually' },
                    { title: 'Structured Text', desc: 'ST code with syntax highlighting' },
                    { title: 'AI Explanations', desc: 'Plain-English descriptions of what code does' }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start"
                      style={{
                        gap: 'var(--space-4)',
                        padding: 'var(--space-3)',
                        background: 'var(--surface-3)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2" className="flex-shrink-0" style={{ marginBlockStart: '2px' }}>
                        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                        <path d="M22 4L12 14.01l-3-3" />
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

        {/* How To Section */}
        <section id="how-to" className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
              >
                Step-by-Step Guide
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                How to View L5X Files Without Studio 5000
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                Open L5X files online in just a few simple steps
              </p>
            </div>

            <div
              className="grid container-inline"
              style={{
                gap: 'var(--space-6)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
                maxWidth: '1000px',
                marginInline: 'auto'
              }}
            >
              {howToSteps.map((step, idx) => (
                <article
                  key={idx}
                  className="surface-card container-inline"
                  style={{ padding: 'var(--space-6)', position: 'relative' }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: 'clamp(40px, 6vw, 48px)',
                      height: 'clamp(40px, 6vw, 48px)',
                      marginBlockEnd: 'var(--space-4)',
                      background: 'var(--accent-blue-muted)',
                      border: '1px solid var(--accent-blue)',
                      borderRadius: '50%',
                      fontSize: 'var(--text-fluid-lg)',
                      fontWeight: '700',
                      color: 'var(--accent-blue)'
                    }}
                  >
                    {idx + 1}
                  </div>
                  <h3
                    className="text-fluid-lg font-semibold"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-2)' }}
                  >
                    {step.name}
                  </h3>
                  <p className="text-fluid-sm" style={{ color: 'var(--text-tertiary)', lineHeight: '1.6' }}>
                    {step.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Supported Controllers Section */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-12)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
              >
                Compatibility
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                Supported Controllers
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                Our online L5X viewer works with all Allen-Bradley Logix controllers
              </p>
            </div>

            <div
              className="grid"
              style={{
                gap: 'var(--space-6)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
                maxWidth: '900px',
                marginInline: 'auto'
              }}
            >
              {[
                {
                  family: 'ControlLogix',
                  color: 'var(--accent-blue)',
                  bg: 'var(--accent-blue-muted)',
                  models: ['1756-L81E (ControlLogix 5580)', '1756-L73 (ControlLogix 5570)', '1756-L63 (ControlLogix 5560)', '1756-L55 (ControlLogix 5550)']
                },
                {
                  family: 'CompactLogix',
                  color: 'var(--accent-emerald)',
                  bg: 'var(--accent-emerald-muted)',
                  models: ['5069-L306ER (CompactLogix 5380)', '1769-L33ER (CompactLogix 5370)', '5069-L340ERP (CompactLogix 5480)']
                },
                {
                  family: 'GuardLogix',
                  color: 'var(--accent-amber)',
                  bg: 'var(--accent-amber-muted)',
                  models: ['1756-L81ES (GuardLogix 5580)', '1756-L73S (GuardLogix 5570)', '5069-L306ERS (Compact GuardLogix)']
                }
              ].map((controller, idx) => (
                <div
                  key={idx}
                  className="surface-card"
                  style={{ padding: 'var(--space-6)' }}
                >
                  <div
                    className="inline-flex items-center"
                    style={{
                      gap: 'var(--space-2)',
                      paddingInline: 'var(--space-3)',
                      paddingBlock: 'var(--space-1)',
                      marginBlockEnd: 'var(--space-4)',
                      background: controller.bg,
                      border: `1px solid ${controller.color}`,
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <span className="text-fluid-sm font-semibold" style={{ color: controller.color }}>
                      {controller.family}
                    </span>
                  </div>
                  <ul className="stack" style={{ gap: 'var(--space-2)' }}>
                    {controller.models.map((model, modelIdx) => (
                      <li
                        key={modelIdx}
                        className="flex items-center text-fluid-sm"
                        style={{ gap: 'var(--space-2)', color: 'var(--text-secondary)' }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={controller.color} strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        {model}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Upload Section */}
        <section id="upload" className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-narrow">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-12)' }}>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                View Your L5X File Now
              </h2>
              <p className="text-fluid-lg" style={{ color: 'var(--text-secondary)' }}>
                Online L5X viewer - no Studio 5000 required
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
                accept=".l5x"
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
                    Processing L5X file...
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
                    {isDragging ? 'Drop to view L5X' : 'Drop your L5X file here'}
                  </p>
                  <p
                    className="text-fluid-sm"
                    style={{ color: 'var(--text-muted)', marginBlockEnd: 'var(--space-4)' }}
                  >
                    or <span style={{ color: 'var(--accent-blue)' }} className="cursor-pointer font-medium">browse</span> to select
                  </p>
                  <div className="flex items-center justify-center" style={{ gap: 'var(--space-4)' }}>
                    <span className="tech-badge">.L5X</span>
                    <span className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>No Studio 5000 Required</span>
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

            {/* Alternative formats */}
            <div className="text-center" style={{ marginBlockStart: 'var(--space-8)' }}>
              <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>
                Have a different format? We also support{' '}
                <Link href="/acd-file" style={{ color: 'var(--accent-blue)' }}>ACD files</Link> and{' '}
                <Link href="/rss-file" style={{ color: 'var(--accent-blue)' }}>RSS files</Link>.
                Learn more about <Link href="/l5x-file" style={{ color: 'var(--accent-blue)' }}>L5X files</Link>.
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
              >
                FAQ
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Frequently Asked Questions
              </h2>
            </div>

            <div
              className="stack container-inline"
              style={{ maxWidth: '800px', marginInline: 'auto', gap: 'var(--space-4)' }}
            >
              {faqs.map((faq, idx) => (
                <article
                  key={idx}
                  className="surface-card"
                  style={{ padding: 'var(--space-6)' }}
                >
                  <h3
                    className="text-fluid-lg font-semibold"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-3)' }}
                  >
                    {faq.question}
                  </h3>
                  <p className="text-fluid-base" style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                    {faq.answer}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer
          className="safe-area-bottom"
          style={{
            borderBlockStart: '1px solid var(--border-subtle)',
            background: 'var(--surface-1)',
            paddingBlock: 'var(--space-12)'
          }}
        >
          <div className="container-default">
            <div className="stack-to-row justify-between" style={{ gap: 'var(--space-6)' }}>
              <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>
                <Logo size="sm" />
              </Link>

              <div className="flex items-center" style={{ gap: 'var(--space-6)' }}>
                <Link href="/l5x-file" className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>L5X Files</Link>
                <Link href="/acd-file" className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>ACD Viewer</Link>
                <Link href="/rss-file" className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>RSS Viewer</Link>
              </div>
            </div>
          </div>
        </footer>
      </main>

      {/* JSON-LD Schema for FAQ */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            "mainEntity": faqs.map(faq => ({
              "@type": "Question",
              "name": faq.question,
              "acceptedAnswer": {
                "@type": "Answer",
                "text": faq.answer
              }
            }))
          })
        }}
      />

      {/* JSON-LD Schema for HowTo */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": "How to View L5X Files Without Studio 5000",
            "description": "Learn how to open and view L5X files without expensive Studio 5000 software using our online L5X viewer.",
            "step": howToSteps.map((step, idx) => ({
              "@type": "HowToStep",
              "position": idx + 1,
              "name": step.name,
              "text": step.text
            }))
          })
        }}
      />
    </div>
  )
}
