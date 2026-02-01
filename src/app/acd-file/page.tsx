'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { Typewriter } from '@/components/home/Effects'
import { trackEvent } from '@/lib/analytics'

// FAQ data for schema markup
const faqs = [
  {
    question: "What is an ACD file?",
    answer: "An ACD file is the native project format for Studio 5000 Logix Designer, Rockwell Automation's programming software for ControlLogix and CompactLogix PLCs. It contains the complete project including programs, tags, I/O configuration, and online edit history."
  },
  {
    question: "Can I open ACD files without Studio 5000?",
    answer: "Yes! PLC Viewer lets you open and view ACD files directly in your browser without needing Studio 5000 installed. You can browse all programs, routines, tags, and get AI-powered explanations of your ladder logic."
  },
  {
    question: "What's the difference between ACD and L5X files?",
    answer: "ACD is the native binary project format that Studio 5000 uses to save projects. L5X is an XML-based export format. ACD files contain additional information like online edit history and pending changes. Both contain your complete PLC program and are supported by our viewer."
  },
  {
    question: "Which controllers use ACD files?",
    answer: "ACD files are the project format for all Logix family controllers: ControlLogix (1756), CompactLogix (1769), and GuardLogix safety controllers. The format is used by Studio 5000 Logix Designer across all versions."
  },
  {
    question: "How much does Studio 5000 cost?",
    answer: "Studio 5000 Logix Designer Professional edition costs approximately $5,000-$7,000 for a perpetual license, plus annual maintenance fees. PLC Viewer provides an alternative for viewing and understanding your programs without needing Studio 5000."
  },
  {
    question: "Is my ACD file secure when I upload it?",
    answer: "Yes. Your ACD file is processed entirely in your browser. We don't store your PLC programs on any server. Your proprietary control logic never leaves your computer."
  }
]

export default function AcdFilePage() {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.acd')) {
      setError('Please upload an .ACD file')
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
      trackEvent('file_upload', { file_type: 'acd' })
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
              Upload ACD File
            </a>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="py-fluid-20" style={{ paddingBlock: 'var(--space-24)' }}>
          <div className="container-default text-center">
            <div
              className="inline-flex items-center"
              style={{
                gap: 'var(--space-2)',
                paddingInline: 'var(--space-4)',
                paddingBlock: 'var(--space-2)',
                marginBlockEnd: 'var(--space-8)',
                background: 'var(--accent-muted)',
                border: '1px solid var(--accent)',
                borderRadius: '20px'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  background: 'var(--accent)',
                  borderRadius: '50%'
                }}
              />
              <span className="text-fluid-sm font-medium" style={{ color: 'var(--accent)' }}>
                Studio 5000 Alternative
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-body)',
                fontSize: 'clamp(2.5rem, 8vw, 4.5rem)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                marginBlockEnd: 'var(--space-6)',
                lineHeight: '1.1',
                letterSpacing: '-0.02em'
              }}
            >
              Open ACD Files
              <br />
              <span style={{ color: 'var(--accent)' }}>
                <Typewriter text="Allen-Bradley Program Viewer" speed={50} delay={300} />
              </span>
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
              View ControlLogix and CompactLogix programs without a Studio 5000 license.
              Upload your ACD file and instantly browse ladder logic, tags, and get AI explanations.
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
                Upload ACD File
              </a>
              <a
                href="#what-is-acd"
                className="btn btn-secondary text-fluid-base inline-flex items-center justify-center"
                style={{
                  paddingInline: 'var(--space-8)',
                  paddingBlock: 'var(--space-3)',
                  minHeight: 'var(--touch-target-min)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                Learn About ACD Files
              </a>
            </div>
          </div>
        </section>

        {/* Trust Indicators */}
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>Files processed locally</span>
              </div>
              <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>No cloud storage</span>
              </div>
              <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>Parse in seconds</span>
              </div>
            </div>
          </div>
        </section>

        {/* What is ACD Section */}
        <section id="what-is-acd" className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div
              className="grid items-start"
              style={{
                gap: 'var(--space-12)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))'
              }}
            >
              <div>
                <span
                  className="text-fluid-sm font-semibold uppercase tracking-wider block"
                  style={{ color: 'var(--accent)', marginBlockEnd: 'var(--space-4)' }}
                >
                  What is an ACD File?
                </span>
                <h2
                  className="text-fluid-4xl font-bold"
                  style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-6)' }}
                >
                  The Studio 5000 Project Format
                </h2>
                <div className="stack" style={{ color: 'var(--text-secondary)', gap: 'var(--space-4)' }}>
                  <p className="text-fluid-base" style={{ lineHeight: '1.7' }}>
                    ACD files are the native project format for Studio 5000 Logix Designer, Rockwell Automation's
                    software for programming ControlLogix and CompactLogix PLCs. Every ACD file contains:
                  </p>
                  <ul className="stack" style={{ gap: 'var(--space-2)', paddingInlineStart: 'var(--space-6)', listStyle: 'disc' }}>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Controller configuration and firmware settings</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>All programs and routines (ladder, function block, ST)</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Controller-scoped and program-scoped tags</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>User-Defined Data Types (UDTs) and AOIs</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>I/O module configuration and mapping</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Online edit history and pending changes</li>
                  </ul>
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
                <span
                  className="text-fluid-sm font-semibold uppercase tracking-wider block"
                  style={{ color: 'var(--accent-red)', marginBlockEnd: 'var(--space-4)' }}
                >
                  Why You Need an Alternative
                </span>
                <div className="stack" style={{ gap: 'var(--space-4)' }}>
                  {[
                    { title: 'Studio 5000 is Expensive', desc: '$5,000-$7,000 for a professional license plus annual fees' },
                    { title: 'Limited License Seats', desc: 'Not everyone who needs to view code has access' },
                    { title: 'Slow to Load', desc: 'Full IDE is overkill when you just need to review code' },
                    { title: 'Requires Installation', desc: 'Can\'t quickly view files on any computer' }
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

        {/* Features Section */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent)', marginBlockEnd: 'var(--space-4)' }}
              >
                Features
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                Everything You Need to Understand ACD Files
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                Professional ACD file viewing without the professional price tag
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
                  title: 'Ladder Logic Viewer',
                  desc: 'See all your rungs with color-coded instructions. Identify inputs, outputs, timers, and counters at a glance.'
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
                  desc: 'Browse all tags with data types, descriptions, and UDT structures. Search and filter to find what you need.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                      <path d="M12 2a4 4 0 014 4v1a3 3 0 013 3v1h1a3 3 0 013 3v2a4 4 0 01-4 4h-1" />
                      <path d="M12 2a4 4 0 00-4 4v1a3 3 0 00-3 3v1H4a3 3 0 00-3 3v2a4 4 0 004 4h1" />
                      <circle cx="12" cy="14" r="4" />
                    </svg>
                  ),
                  iconBg: 'var(--accent-muted)',
                  iconBorder: 'rgba(59, 130, 246, 0.3)',
                  title: 'AI-Powered Explanations',
                  desc: 'Get plain-English explanations of what each rung does. Perfect for understanding unfamiliar code.'
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
                  title: 'Program Structure',
                  desc: 'Navigate tasks, programs, and routines in a tree view. Understand how your project is organized.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  ),
                  iconBg: 'var(--accent-muted)',
                  iconBorder: 'rgba(16, 185, 129, 0.3)',
                  title: 'Secure & Private',
                  desc: 'Your ACD file is processed in your browser. Your proprietary code never leaves your computer.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  ),
                  iconBg: 'var(--accent-muted)',
                  iconBorder: 'rgba(245, 158, 11, 0.3)',
                  title: 'Instant Results',
                  desc: 'Upload and view your ACD file in seconds. No waiting for slow software to initialize.'
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

        {/* Supported Controllers */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-12)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent)', marginBlockEnd: 'var(--space-4)' }}
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
                Works with all Logix family controllers from Allen-Bradley
              </p>
            </div>

            <div
              className="grid-auto-fit container-inline"
              style={{ gap: 'var(--space-6)' }}
            >
              {[
                {
                  title: 'ControlLogix',
                  desc: '1756 series high-performance controllers for complex applications',
                  models: ['5580', '5570', '5560', '5550']
                },
                {
                  title: 'CompactLogix',
                  desc: '1769 series mid-range controllers for machine control',
                  models: ['5480', '5380', '5370', '5340']
                },
                {
                  title: 'GuardLogix',
                  desc: 'Safety-rated controllers for safety-critical applications',
                  models: ['5580S', '5570S', '5380S']
                }
              ].map((controller, idx) => (
                <div
                  key={idx}
                  className="surface-card text-center"
                  style={{ padding: 'var(--space-6)' }}
                >
                  <h3
                    className="text-fluid-xl font-semibold"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-2)' }}
                  >
                    {controller.title}
                  </h3>
                  <p className="text-fluid-sm" style={{ color: 'var(--text-tertiary)', marginBlockEnd: 'var(--space-4)' }}>
                    {controller.desc}
                  </p>
                  <div className="flex flex-wrap justify-center" style={{ gap: 'var(--space-2)' }}>
                    {controller.models.map((model) => (
                      <span key={model} className="tech-badge">{model}</span>
                    ))}
                  </div>
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
                Upload Your ACD File
              </h2>
              <p className="text-fluid-lg" style={{ color: 'var(--text-secondary)' }}>
                Drop your Studio 5000 project file and start viewing immediately
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
                background: isDragging ? 'var(--accent-muted)' : 'var(--surface-2)',
                border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-md)'
              }}
            >
              <input
                type="file"
                accept=".acd"
                onChange={handleInputChange}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
                style={{ minHeight: 'var(--touch-target-min)' }}
              />

              {isUploading ? (
                <div className="text-center" style={{ paddingBlock: 'var(--space-4)' }}>
                  <div style={{ marginBlockEnd: 'var(--space-4)' }}>
                    <svg className="animate-pulse-subtle" style={{ width: '48px', height: '48px', marginInline: 'auto' }} viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                      <path d="M12 3v12M12 3l4 4M12 3L8 7" />
                      <path d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4" />
                    </svg>
                  </div>
                  <p
                    className="text-fluid-base font-medium"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
                  >
                    Processing ACD file...
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
                        background: 'var(--accent)',
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
                      stroke={isDragging ? 'var(--accent)' : 'var(--text-muted)'}
                      strokeWidth="1.5"
                    >
                      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                    </svg>
                  </div>
                  <p
                    className="text-fluid-lg font-medium"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-2)' }}
                  >
                    {isDragging ? 'Drop to upload' : 'Drop your ACD file here'}
                  </p>
                  <p
                    className="text-fluid-sm"
                    style={{ color: 'var(--text-muted)', marginBlockEnd: 'var(--space-4)' }}
                  >
                    or <span style={{ color: 'var(--accent)' }} className="cursor-pointer font-medium">browse</span> to select
                  </p>
                  <div className="flex items-center justify-center" style={{ gap: 'var(--space-4)' }}>
                    <span className="tech-badge">.ACD</span>
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
                Have an export instead? We also support{' '}
                <Link href="/l5x-file" style={{ color: 'var(--accent)' }}>L5X files</Link>. For legacy PLCs, try{' '}
                <Link href="/rss-file" style={{ color: 'var(--accent)' }}>RSS files</Link>
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
                style={{ color: 'var(--accent)', marginBlockEnd: 'var(--space-4)' }}
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
                <div
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
                </div>
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
                <Link href="/l5x-file" className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>L5X Viewer</Link>
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
    </div>
  )
}
