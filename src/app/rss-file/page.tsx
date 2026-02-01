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
    question: "What is an RSS file?",
    answer: "An RSS file is the native project format for RSLogix 500, Rockwell Automation's programming software for SLC 500 and MicroLogix PLCs. It contains the complete PLC program including ladder logic, data tables, I/O configuration, and documentation."
  },
  {
    question: "Can I open RSS files without RSLogix 500?",
    answer: "Yes! PLC Viewer lets you open and view RSS files directly in your browser without needing RSLogix 500 installed. You can browse ladder logic, view data tables, and understand program structure."
  },
  {
    question: "Which PLCs use RSS files?",
    answer: "RSS files are used by SLC 500 processors (5/01, 5/02, 5/03, 5/04, 5/05) and MicroLogix controllers (1000, 1100, 1200, 1400). These legacy platforms are still widely used in manufacturing facilities worldwide."
  },
  {
    question: "Is RSLogix 500 still available?",
    answer: "RSLogix 500 has been discontinued by Rockwell Automation. While existing licenses continue to work, new licenses are no longer sold. This makes alternative viewers like PLC Viewer essential for maintaining legacy systems."
  },
  {
    question: "How do I export an RSS file from RSLogix 500?",
    answer: "In RSLogix 500, go to File > Save As and save your project. The default format is .RSS. You can then upload this file directly to PLC Viewer without any conversion needed."
  },
  {
    question: "Is my RSS file secure when I upload it?",
    answer: "Yes. Your RSS file is processed entirely in your browser. We don't store your PLC programs on any server. Your proprietary control logic never leaves your computer."
  }
]

export default function RssFilePage() {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.rss')) {
      setError('Please upload an .RSS file')
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
      trackEvent('file_upload', { file_type: 'rss' })
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
              Upload RSS File
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
                RSLogix 500 Discontinued - We Have You Covered
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
              Open RSS Files
              <br />
              <span style={{ color: 'var(--accent)' }}>
                <Typewriter text="SLC 500 & MicroLogix Viewer" speed={50} delay={300} />
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
              View RSLogix 500 programs without expensive software. Upload your RSS file and instantly browse
              ladder logic, data tables, and I/O configuration for SLC 500 and MicroLogix PLCs.
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
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--accent)',
                  color: '#000'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                Upload RSS File
              </a>
              <a
                href="#what-is-rss"
                className="btn btn-secondary text-fluid-base inline-flex items-center justify-center"
                style={{
                  paddingInline: 'var(--space-8)',
                  paddingBlock: 'var(--space-3)',
                  minHeight: 'var(--touch-target-min)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                Learn About RSS Files
              </a>
            </div>
          </div>
        </section>

        {/* Supported PLCs Banner */}
        <section
          className="py-fluid-8"
          style={{
            borderBlock: '1px solid var(--border-subtle)',
            background: 'var(--surface-1)'
          }}
        >
          <div className="container-default">
            <p className="text-fluid-sm text-center" style={{ color: 'var(--text-tertiary)', marginBlockEnd: 'var(--space-4)' }}>
              Supported Legacy Platforms
            </p>
            <div
              className="flex flex-wrap items-center justify-center"
              style={{ gap: 'var(--space-4)' }}
            >
              {['SLC 5/01', 'SLC 5/02', 'SLC 5/03', 'SLC 5/04', 'SLC 5/05', 'MicroLogix 1000', 'MicroLogix 1100', 'MicroLogix 1200', 'MicroLogix 1400'].map((plc) => (
                <span key={plc} className="tech-badge">{plc}</span>
              ))}
            </div>
          </div>
        </section>

        {/* The Problem Section */}
        <section id="what-is-rss" className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
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
                  What is an RSS File?
                </span>
                <h2
                  className="text-fluid-4xl font-bold"
                  style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-6)' }}
                >
                  The RSLogix 500 Project Format
                </h2>
                <div className="stack" style={{ color: 'var(--text-secondary)', gap: 'var(--space-4)' }}>
                  <p className="text-fluid-base" style={{ lineHeight: '1.7' }}>
                    RSS files are the native project format for RSLogix 500, Rockwell Automation's programming
                    software for SLC 500 and MicroLogix PLCs. These files contain everything about your PLC program:
                  </p>
                  <ul className="stack" style={{ gap: 'var(--space-2)', paddingInlineStart: 'var(--space-6)', listStyle: 'disc' }}>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Ladder logic programs (LAD files)</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Data tables (integers, timers, counters, floats)</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>I/O configuration and addressing</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Processor configuration</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Documentation and comments</li>
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
                  The Legacy Software Problem
                </span>
                <div className="stack" style={{ gap: 'var(--space-4)' }}>
                  {[
                    { title: 'RSLogix 500 Discontinued', desc: 'Rockwell no longer sells new licenses - existing users are stranded' },
                    { title: 'Expensive Legacy Licenses', desc: 'Used licenses sell for $1,000+ on secondary markets' },
                    { title: 'Compatibility Issues', desc: 'Old software struggles on modern Windows versions' },
                    { title: 'Millions of PLCs Still Running', desc: 'SLC 500 and MicroLogix remain in production worldwide' }
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
                Everything You Need for Legacy PLC Support
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                View and understand SLC 500 and MicroLogix programs without RSLogix 500
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
                  desc: 'View all ladder files with color-coded instructions. See XIC, XIO, OTE, timers, counters, and math instructions clearly.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--inst-counter)" strokeWidth="1.5">
                      <rect x="3" y="3" width="18" height="18" rx="2" />
                      <path d="M3 9h18M9 3v18" />
                    </svg>
                  ),
                  iconBg: 'rgba(168, 85, 247, 0.1)',
                  iconBorder: 'rgba(168, 85, 247, 0.2)',
                  title: 'Data Table Browser',
                  desc: 'Browse all SLC 500 data tables: O, I, S, B, T, C, R, N, F, A, and string tables. See addresses and values.'
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
                  desc: 'Get plain-English explanations of what each rung does. Perfect for understanding unfamiliar legacy code.'
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
                  title: 'No Software Required',
                  desc: 'Works entirely in your browser. No RSLogix 500 license, no installation, no compatibility issues.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.5">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  ),
                  iconBg: 'var(--accent-muted)',
                  iconBorder: 'rgba(245, 158, 11, 0.3)',
                  title: 'Secure & Private',
                  desc: 'Your RSS files are processed locally. Your proprietary PLC code never leaves your computer.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--inst-jump)" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  ),
                  iconBg: 'rgba(249, 115, 22, 0.1)',
                  iconBorder: 'rgba(249, 115, 22, 0.2)',
                  title: 'Instant Results',
                  desc: 'Upload and view your RSS file in seconds. No waiting for slow software to load.'
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

        {/* Upload Section */}
        <section id="upload" className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-narrow">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-12)' }}>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                Upload Your RSS File
              </h2>
              <p className="text-fluid-lg" style={{ color: 'var(--text-secondary)' }}>
                Drop your RSLogix 500 project file and start viewing immediately
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
                accept=".rss"
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
                    Processing RSS file...
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
                    Parsing ladder logic and data tables...
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
                    {isDragging ? 'Drop to upload' : 'Drop your RSS file here'}
                  </p>
                  <p
                    className="text-fluid-sm"
                    style={{ color: 'var(--text-muted)', marginBlockEnd: 'var(--space-4)' }}
                  >
                    or <span style={{ color: 'var(--accent)' }} className="cursor-pointer font-medium">browse</span> to select
                  </p>
                  <div className="flex items-center justify-center" style={{ gap: 'var(--space-4)' }}>
                    <span className="tech-badge" style={{ background: 'var(--accent-muted)', borderColor: 'var(--accent)', color: 'var(--accent)' }}>.RSS</span>
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
                Need to view other formats? We also support{' '}
                <Link href="/l5x-file" style={{ color: 'var(--accent)' }}>L5X files</Link> and{' '}
                <Link href="/acd-file" style={{ color: 'var(--accent)' }}>ACD files</Link>
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
            background: 'var(--surface-0)',
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
                <Link href="/acd-file" className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>ACD Viewer</Link>
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
