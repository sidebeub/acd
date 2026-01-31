'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// FAQ data for schema markup - SEO optimized questions
const faqs = [
  {
    question: "Is there an affordable Allen-Bradley PLC viewer?",
    answer: "Yes! PLC Viewer lets you view Allen-Bradley PLC programs at a fraction of the cost of Studio 5000. You can open ACD, L5X, and RSS files without purchasing expensive Rockwell software licenses. Simply upload your file and instantly browse ladder logic, tags, and program structure."
  },
  {
    question: "Can I view ControlLogix programs without Studio 5000?",
    answer: "Absolutely. PLC Viewer supports all ControlLogix controllers including the 5580, 5570, 5560, and 5550 series. Upload your ACD or L5X file and view all programs, routines, and tags without needing a $5,000+ Studio 5000 license. You'll also get AI-powered explanations to help you understand complex logic."
  },
  {
    question: "What Allen-Bradley controllers are supported?",
    answer: "PLC Viewer supports the full range of Allen-Bradley controllers: ControlLogix (1756 series), CompactLogix (1769 series), GuardLogix safety controllers, as well as legacy systems including SLC 500, MicroLogix 1000/1100/1400, and PLC-5. Both modern Logix files (ACD, L5X) and legacy RSS files are supported."
  },
  {
    question: "Do I need a Rockwell license to view PLC files?",
    answer: "No, you do not need any Rockwell software license to use PLC Viewer. Our online viewer works entirely in your browser and doesn't require Studio 5000, RSLogix 5000, or RSLogix 500. It's an affordable solution for maintenance technicians, contractors, and engineers who need to view programs without expensive license access."
  }
]

export default function FreeAllenBradleyViewerPage() {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.acd') && !fileName.endsWith('.l5x') && !fileName.endsWith('.rss')) {
      setError('Please upload an .ACD, .L5X, or .RSS file')
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
          <Link href="/" className="flex items-center" style={{ gap: 'var(--space-3)' }}>
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
              Upload Now
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
                background: 'var(--accent-emerald-muted)',
                border: '1px solid var(--accent-emerald)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
              <span className="text-fluid-sm font-medium" style={{ color: 'var(--accent-emerald)' }}>
                No Studio 5000 License Required
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
              Allen-Bradley
              <br />
              <span style={{ color: 'var(--accent-blue)' }}>PLC Viewer</span>
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
              View Allen-Bradley PLC programs online without expensive Rockwell software licenses.
              Open ControlLogix, CompactLogix, SLC 500, and MicroLogix files instantly in your browser.
              No installation required. A fraction of the cost of Studio 5000.
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
                Upload Your PLC File
              </a>
              <a
                href="#pricing"
                className="btn btn-secondary text-fluid-base inline-flex items-center justify-center"
                style={{
                  paddingInline: 'var(--space-8)',
                  paddingBlock: 'var(--space-3)',
                  minHeight: 'var(--touch-target-min)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                See Pricing
              </a>
            </div>
          </div>
        </section>

        {/* Supported Controllers Banner */}
        <section
          className="py-fluid-8"
          style={{
            borderBlock: '1px solid var(--border-subtle)',
            background: 'var(--surface-1)'
          }}
        >
          <div className="container-default">
            <p className="text-fluid-sm text-center" style={{ color: 'var(--text-tertiary)', marginBlockEnd: 'var(--space-4)' }}>
              Supported Allen-Bradley Controllers
            </p>
            <div
              className="flex flex-wrap items-center justify-center"
              style={{ gap: 'var(--space-4)' }}
            >
              {['ControlLogix', 'CompactLogix', 'GuardLogix', 'SLC 500', 'MicroLogix', 'PLC-5'].map((plc) => (
                <span key={plc} className="tech-badge">{plc}</span>
              ))}
            </div>
          </div>
        </section>

        {/* Supported File Formats Section */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
              >
                File Formats
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                Supported Allen-Bradley File Types
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                Our PLC viewer supports all major Allen-Bradley program file formats
              </p>
            </div>

            <div
              className="grid-auto-fit container-inline"
              style={{ gap: 'var(--space-6)' }}
            >
              {[
                {
                  format: '.ACD',
                  title: 'Studio 5000 Projects',
                  desc: 'Native project files from Studio 5000 Logix Designer. Contains the complete program including online edit history.',
                  controllers: 'ControlLogix, CompactLogix, GuardLogix',
                  link: '/acd-file'
                },
                {
                  format: '.L5X',
                  title: 'Logix XML Export',
                  desc: 'XML-based export format from Studio 5000. Human-readable and perfect for version control systems.',
                  controllers: 'ControlLogix, CompactLogix, GuardLogix',
                  link: '/l5x-file'
                },
                {
                  format: '.RSS',
                  title: 'RSLogix 500 Projects',
                  desc: 'Project files from RSLogix 500 for legacy Allen-Bradley controllers. Full support for older systems.',
                  controllers: 'SLC 500, MicroLogix, PLC-5',
                  link: '/rss-file'
                }
              ].map((item, idx) => (
                <Link
                  key={idx}
                  href={item.link}
                  className="surface-card block transition-all hover:border-blue-500/50"
                  style={{ padding: 'var(--space-6)' }}
                >
                  <div className="flex items-center" style={{ gap: 'var(--space-3)', marginBlockEnd: 'var(--space-4)' }}>
                    <span
                      className="text-fluid-lg font-bold"
                      style={{
                        color: 'var(--accent-blue)',
                        padding: 'var(--space-2) var(--space-3)',
                        background: 'var(--accent-blue-muted)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      {item.format}
                    </span>
                  </div>
                  <h3
                    className="text-fluid-xl font-semibold"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-2)' }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-fluid-sm" style={{ color: 'var(--text-tertiary)', marginBlockEnd: 'var(--space-4)', lineHeight: '1.6' }}>
                    {item.desc}
                  </p>
                  <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>
                    <span style={{ color: 'var(--accent-emerald)' }}>Supports:</span> {item.controllers}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
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
                Professional PLC Viewing - Affordable
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                Everything you need to understand Allen-Bradley programs without buying software
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
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5">
                      <path d="M12 2a4 4 0 014 4v1a3 3 0 013 3v1h1a3 3 0 013 3v2a4 4 0 01-4 4h-1" />
                      <path d="M12 2a4 4 0 00-4 4v1a3 3 0 00-3 3v1H4a3 3 0 00-3 3v2a4 4 0 004 4h1" />
                      <circle cx="12" cy="14" r="4" />
                    </svg>
                  ),
                  iconBg: 'var(--accent-blue-muted)',
                  iconBorder: 'rgba(59, 130, 246, 0.3)',
                  title: 'AI-Powered Explanations',
                  desc: 'Get plain-English explanations of what each rung does. Choose friendly, technical, or operator-level descriptions.'
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
                  desc: 'Browse all controller and program tags. See data types, descriptions, UDT structures, and current values.'
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
                  title: 'Cross-Reference Search',
                  desc: 'Find everywhere a tag is used across your entire project. Track down issues and understand dependencies fast.'
                },
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
                  desc: 'Color-coded rungs show inputs, outputs, timers, counters, and math instructions clearly and accurately.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="1.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="M9 12l2 2 4-4" />
                    </svg>
                  ),
                  iconBg: 'var(--accent-emerald-muted)',
                  iconBorder: 'rgba(16, 185, 129, 0.3)',
                  title: 'Secure & Private',
                  desc: 'Your PLC files are processed in your browser. Your proprietary control logic never leaves your computer.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  ),
                  iconBg: 'var(--accent-amber-muted)',
                  iconBorder: 'rgba(245, 158, 11, 0.3)',
                  title: 'Instant Access',
                  desc: 'Upload and start viewing in seconds. No waiting for slow software to initialize or licenses to validate.'
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

        {/* Why Affordable Section */}
        <section id="pricing" className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
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
                  style={{ color: 'var(--accent-emerald)', marginBlockEnd: 'var(--space-4)' }}
                >
                  Our Mission
                </span>
                <h2
                  className="text-fluid-4xl font-bold"
                  style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-6)' }}
                >
                  Affordable PLC Viewing
                </h2>
                <div className="stack" style={{ color: 'var(--text-secondary)', gap: 'var(--space-4)' }}>
                  <p className="text-fluid-base" style={{ lineHeight: '1.7' }}>
                    We believe everyone should be able to understand their PLC programs - not just those with
                    access to expensive software licenses. PLC Viewer makes industrial automation knowledge accessible.
                  </p>
                  <p className="text-fluid-base" style={{ lineHeight: '1.7' }}>
                    Maintenance technicians troubleshooting at 2 AM shouldn't need to track down a license.
                    Contractors reviewing a system shouldn't need a $5,000 software purchase.
                    Engineers collaborating across companies shouldn't face artificial barriers.
                  </p>
                  <p className="text-fluid-base" style={{ lineHeight: '1.7' }}>
                    That's why PLC Viewer offers affordable subscription plans at a fraction of Studio 5000's cost.
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
                <span
                  className="text-fluid-sm font-semibold uppercase tracking-wider block"
                  style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
                >
                  Who Benefits
                </span>
                <div className="stack" style={{ gap: 'var(--space-4)' }}>
                  {[
                    { title: 'Maintenance Technicians', desc: 'View programs during troubleshooting without license delays' },
                    { title: 'System Integrators', desc: 'Review customer code without purchasing multiple licenses' },
                    { title: 'Plant Engineers', desc: 'Share programs with team members who lack Studio 5000 access' },
                    { title: 'Students & Educators', desc: 'Learn industrial automation without expensive software costs' }
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-start"
                      style={{
                        gap: 'var(--space-4)',
                        padding: 'var(--space-4)',
                        background: 'var(--accent-emerald-muted)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2" className="flex-shrink-0" style={{ marginBlockStart: '2px' }}>
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

        {/* How It Works Section */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
              >
                Getting Started
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                How It Works
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                Three simple steps to view your Allen-Bradley PLC programs
              </p>
            </div>

            <div
              className="grid-auto-fit container-inline"
              style={{ gap: 'var(--space-6)' }}
            >
              {[
                {
                  step: '1',
                  title: 'Upload Your File',
                  desc: 'Drag and drop your ACD, L5X, or RSS file. Your file is processed locally in your browser - nothing is uploaded to our servers.',
                  color: 'var(--accent-blue)'
                },
                {
                  step: '2',
                  title: 'Browse Your Program',
                  desc: 'Navigate through tasks, programs, and routines. Browse tags, view ladder logic, and explore your project structure.',
                  color: 'var(--accent-emerald)'
                },
                {
                  step: '3',
                  title: 'Understand the Logic',
                  desc: 'Use AI-powered explanations to understand what each rung does. Search for tags and find cross-references throughout your code.',
                  color: 'var(--accent-amber)'
                }
              ].map((item, idx) => (
                <div
                  key={idx}
                  className="surface-card text-center"
                  style={{ padding: 'var(--space-8)' }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: '64px',
                      height: '64px',
                      marginInline: 'auto',
                      marginBlockEnd: 'var(--space-5)',
                      background: `color-mix(in srgb, ${item.color} 15%, transparent)`,
                      border: `2px solid ${item.color}`,
                      borderRadius: '50%'
                    }}
                  >
                    <span
                      className="text-fluid-2xl font-bold"
                      style={{ color: item.color }}
                    >
                      {item.step}
                    </span>
                  </div>
                  <h3
                    className="text-fluid-xl font-semibold"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-3)' }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-fluid-sm" style={{ color: 'var(--text-tertiary)', lineHeight: '1.6' }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Upload Section */}
        <section id="upload" className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-narrow">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-12)' }}>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                Start Viewing Now
              </h2>
              <p className="text-fluid-lg" style={{ color: 'var(--text-secondary)' }}>
                Upload your Allen-Bradley PLC file and start exploring immediately
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
                accept=".acd,.l5x,.rss"
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
                    Processing your PLC file...
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
                    {isDragging ? 'Drop to upload' : 'Drop your PLC file here'}
                  </p>
                  <p
                    className="text-fluid-sm"
                    style={{ color: 'var(--text-muted)', marginBlockEnd: 'var(--space-4)' }}
                  >
                    or <span style={{ color: 'var(--accent-blue)' }} className="cursor-pointer font-medium">browse</span> to select
                  </p>
                  <div className="flex items-center justify-center" style={{ gap: 'var(--space-3)' }}>
                    <span className="tech-badge">.ACD</span>
                    <span className="tech-badge">.L5X</span>
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

            {/* Format links */}
            <div className="text-center" style={{ marginBlockStart: 'var(--space-8)' }}>
              <p className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>
                Learn more about specific formats:{' '}
                <Link href="/acd-file" style={{ color: 'var(--accent-blue)' }}>ACD files</Link> | {' '}
                <Link href="/l5x-file" style={{ color: 'var(--accent-blue)' }}>L5X files</Link> | {' '}
                <Link href="/rss-file" style={{ color: 'var(--accent-blue)' }}>RSS files</Link>
              </p>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
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
            background: 'var(--surface-0)',
            paddingBlock: 'var(--space-12)'
          }}
        >
          <div className="container-default">
            <div className="stack-to-row justify-between" style={{ gap: 'var(--space-6)' }}>
              <Link href="/" className="flex items-center" style={{ gap: 'var(--space-3)' }}>
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
              </Link>

              <div className="flex items-center" style={{ gap: 'var(--space-6)' }}>
                <Link href="/l5x-file" className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>L5X Viewer</Link>
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

      {/* JSON-LD Schema for SoftwareApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "PLC Viewer - Affordable Allen-Bradley PLC Viewer",
            "applicationCategory": "DeveloperApplication",
            "operatingSystem": "Web Browser",
            "offers": {
              "@type": "Offer",
              "priceSpecification": {
                "@type": "PriceSpecification",
                "priceCurrency": "USD",
                "description": "Affordable subscription plans"
              },
              "availability": "https://schema.org/OnlineOnly"
            },
            "description": "Affordable online viewer for Allen-Bradley PLC programs. View ControlLogix, CompactLogix, SLC 500, and MicroLogix files without Rockwell software licenses.",
            "featureList": [
              "View ACD, L5X, and RSS files",
              "AI-powered code explanations",
              "Complete tag browser",
              "Cross-reference search",
              "Ladder logic visualization",
              "No installation required"
            ]
          })
        }}
      />
    </div>
  )
}
