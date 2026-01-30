'use client'

import Link from 'next/link'

// FAQ data for schema markup
const faqs = [
  {
    question: "What is the best alternative to Studio 5000?",
    answer: "For viewing and understanding PLC programs, PLC Viewer is an excellent alternative to Studio 5000. It lets you open L5X, ACD, and RSS files directly in your browser without expensive licenses or software installation. While PLC Viewer is designed for viewing and code review (not editing), it's perfect for maintenance technicians, training, documentation, and anyone who needs to understand Allen-Bradley programs without the $5,000+ cost of Studio 5000."
  },
  {
    question: "Can I view PLC programs without Studio 5000?",
    answer: "Yes! PLC Viewer allows you to view ControlLogix, CompactLogix, and legacy SLC 500 programs without Studio 5000 or RSLogix installed. Simply upload your L5X export, ACD project file, or RSS file, and you can browse all programs, routines, tags, and ladder logic. The viewer also provides AI-powered explanations to help you understand complex logic."
  },
  {
    question: "Is there a free version of RSLogix?",
    answer: "Rockwell Automation does not offer a free version of RSLogix 500 or RSLogix 5000 (now Studio 5000). However, PLC Viewer provides a cost-effective way to view and understand your PLC programs without needing the full development environment. It's ideal for code review, maintenance troubleshooting, and training purposes where you need to read code but not edit it."
  },
  {
    question: "How much does Studio 5000 cost?",
    answer: "Studio 5000 Logix Designer Professional edition typically costs between $5,000 and $7,000 for a perpetual license, plus annual maintenance fees of around $1,000-$1,500. Additional modules like Logix Emulate and Application Code Manager cost extra. For organizations that only need to view programs, PLC Viewer offers a much more affordable alternative."
  }
]

export default function Studio5000AlternativePage() {
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
              href="#get-started"
              className="btn btn-primary text-fluid-sm"
              style={{
                paddingInline: 'var(--space-4)',
                paddingBlock: 'var(--space-2)',
                minHeight: 'var(--touch-target-min)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              Try Free
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
                background: 'var(--accent-emerald-muted)',
                border: '1px solid var(--accent-emerald)',
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
              <span className="text-fluid-sm font-medium" style={{ color: 'var(--accent-emerald)' }}>
                Free PLC Program Viewer
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
              Studio 5000 Alternative:
              <br />
              <span style={{ color: 'var(--accent-blue)' }}>View PLC Programs Free</span>
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
              Tired of paying $5,000+ just to look at PLC code? PLC Viewer lets you open and understand
              Allen-Bradley programs without expensive Rockwell software. Perfect for code review,
              maintenance, and training.
            </p>

            <div className="stack-to-row justify-center" style={{ gap: 'var(--space-4)' }}>
              <a
                href="#get-started"
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
                Upload Your File
              </a>
              <a
                href="#comparison"
                className="btn btn-secondary text-fluid-base inline-flex items-center justify-center"
                style={{
                  paddingInline: 'var(--space-8)',
                  paddingBlock: 'var(--space-3)',
                  minHeight: 'var(--touch-target-min)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                See Comparison
              </a>
            </div>
          </div>
        </section>

        {/* The Problem with Studio 5000 */}
        <section
          className="py-fluid-20"
          style={{
            background: 'var(--surface-1)',
            borderBlock: '1px solid var(--border-subtle)',
            paddingBlock: 'var(--space-24)'
          }}
        >
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-red)', marginBlockEnd: 'var(--space-4)' }}
              >
                The Problem
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                Why People Search for Studio 5000 Alternatives
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                Rockwell Automation software comes with significant barriers
              </p>
            </div>

            <div
              className="grid container-inline"
              style={{
                gap: 'var(--space-6)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))'
              }}
            >
              {[
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="1.5">
                      <path d="M12 2v20M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
                    </svg>
                  ),
                  title: 'Expensive Licensing',
                  desc: 'Studio 5000 costs $5,000-$7,000 per seat, plus annual maintenance fees. That adds up fast for teams.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="1.5">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <path d="M8 21h8M12 17v4" />
                    </svg>
                  ),
                  title: 'Windows Only',
                  desc: 'Studio 5000 only runs on Windows. Mac users, Linux users, and tablet users are out of luck.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="1.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                      <path d="M12 8v4M12 16h.01" />
                    </svg>
                  ),
                  title: 'Version Conflicts',
                  desc: 'Project created in v34? You need v34 to open it. Constant upgrades, constant compatibility headaches.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  ),
                  title: 'Slow Startup',
                  desc: 'Need to quickly check a rung? Wait minutes for Studio 5000 to load. Every. Single. Time.'
                }
              ].map((item, idx) => (
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
                      background: 'var(--accent-red-muted)',
                      border: '1px solid rgba(239, 68, 68, 0.3)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    {item.icon}
                  </div>
                  <h3
                    className="text-fluid-lg font-semibold"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-2)' }}
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

        {/* Comparison Table */}
        <section id="comparison" className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
              >
                Comparison
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                Studio 5000 vs PLC Viewer
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                Different tools for different needs. PLC Viewer is purpose-built for viewing.
              </p>
            </div>

            {/* Comparison Table */}
            <div
              className="container-inline"
              style={{
                maxWidth: '900px',
                marginInline: 'auto',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div
                className="grid"
                style={{
                  gridTemplateColumns: '2fr 1fr 1fr',
                  background: 'var(--surface-2)',
                  borderBlockEnd: '1px solid var(--border-subtle)'
                }}
              >
                <div style={{ padding: 'var(--space-4)' }}>
                  <span className="text-fluid-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Feature</span>
                </div>
                <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                  <span className="text-fluid-sm font-semibold" style={{ color: 'var(--text-tertiary)' }}>Studio 5000</span>
                </div>
                <div style={{ padding: 'var(--space-4)', textAlign: 'center' }}>
                  <span className="text-fluid-sm font-semibold" style={{ color: 'var(--accent-emerald)' }}>PLC Viewer</span>
                </div>
              </div>

              {/* Rows */}
              {[
                { feature: 'View ladder logic', studio: true, viewer: true },
                { feature: 'Browse tags & UDTs', studio: true, viewer: true },
                { feature: 'AI-powered explanations', studio: false, viewer: true },
                { feature: 'Edit PLC programs', studio: true, viewer: false, note: 'View only' },
                { feature: 'Download/upload to PLC', studio: true, viewer: false },
                { feature: 'Works in browser', studio: false, viewer: true },
                { feature: 'Mac/Linux/tablet support', studio: false, viewer: true },
                { feature: 'No installation required', studio: false, viewer: true },
                { feature: 'Opens any version instantly', studio: false, viewer: true },
                { feature: 'Cost', studio: '$5,000+', viewer: 'Free tier available', isText: true }
              ].map((row, idx) => (
                <div
                  key={idx}
                  className="grid"
                  style={{
                    gridTemplateColumns: '2fr 1fr 1fr',
                    borderBlockEnd: idx < 9 ? '1px solid var(--border-subtle)' : 'none',
                    background: idx % 2 === 0 ? 'var(--surface-0)' : 'var(--surface-1)'
                  }}
                >
                  <div style={{ padding: 'var(--space-4)' }}>
                    <span className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>{row.feature}</span>
                  </div>
                  <div className="flex items-center justify-center" style={{ padding: 'var(--space-4)' }}>
                    {row.isText ? (
                      <span className="text-fluid-sm" style={{ color: 'var(--text-tertiary)' }}>{row.studio}</span>
                    ) : row.studio ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex items-center justify-center" style={{ padding: 'var(--space-4)', gap: 'var(--space-2)' }}>
                    {row.isText ? (
                      <span className="text-fluid-sm font-medium" style={{ color: 'var(--accent-emerald)' }}>{row.viewer}</span>
                    ) : row.viewer ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                          <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                        {row.note && (
                          <span className="text-fluid-xs" style={{ color: 'var(--text-muted)' }}>({row.note})</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Honest disclaimer */}
            <div
              className="text-center container-inline"
              style={{
                marginBlockStart: 'var(--space-8)',
                padding: 'var(--space-6)',
                background: 'var(--accent-amber-muted)',
                border: '1px solid var(--accent-amber)',
                borderRadius: 'var(--radius-md)',
                maxWidth: '700px',
                marginInline: 'auto'
              }}
            >
              <p className="text-fluid-base" style={{ color: 'var(--text-primary)' }}>
                <strong>Important:</strong> PLC Viewer is a viewing and code review tool, not a replacement for Studio 5000.
                You still need Studio 5000 (or RSLogix) to edit programs and download to PLCs.
                We focus on doing one thing exceptionally well: helping you understand PLC code.
              </p>
            </div>
          </div>
        </section>

        {/* What PLC Viewer Offers */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-emerald)', marginBlockEnd: 'var(--space-4)' }}
              >
                What You Get
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                PLC Viewing Done Right
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                Everything you need to understand Allen-Bradley PLC programs
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
                  desc: 'Color-coded rungs make it easy to identify inputs, outputs, timers, counters, and math operations at a glance.'
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
                  desc: 'Click any rung and get a plain-English explanation. Choose friendly, technical, or operator modes.'
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
                  desc: 'Search and filter all tags. View data types, descriptions, UDT structures, and cross-references.'
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
                  title: 'Program Navigation',
                  desc: 'Browse tasks, programs, and routines in a clear tree view. Understand code organization instantly.'
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
                  desc: 'Files are processed in your browser. Your proprietary PLC code never leaves your computer.'
                },
                {
                  icon: (
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="1.5">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M2 12h20" />
                      <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
                    </svg>
                  ),
                  iconBg: 'var(--accent-amber-muted)',
                  iconBorder: 'rgba(245, 158, 11, 0.3)',
                  title: 'Works Everywhere',
                  desc: 'Browser-based means any device: Windows, Mac, Linux, iPad. No installation, no compatibility issues.'
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

        {/* Use Cases */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
              >
                Use Cases
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                Who Uses a Studio 5000 Alternative?
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                PLC Viewer is built for people who need to understand code, not edit it
              </p>
            </div>

            <div
              className="grid container-inline"
              style={{
                gap: 'var(--space-8)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 400px), 1fr))'
              }}
            >
              {[
                {
                  title: 'Code Review',
                  desc: 'Integrators sent you a program? Review it before deployment without needing a Studio 5000 license. Check logic, verify tag usage, and understand the control strategy.',
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                    </svg>
                  )
                },
                {
                  title: 'Maintenance & Troubleshooting',
                  desc: 'Machine down at 2 AM? Quickly pull up the program on any device to understand the logic. No waiting for Studio 5000 to load on a specific workstation.',
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="1.5">
                      <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
                    </svg>
                  )
                },
                {
                  title: 'Training & Onboarding',
                  desc: 'Help new engineers understand existing programs with AI-powered explanations. No need to buy extra Studio 5000 seats just for training.',
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="1.5">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  )
                },
                {
                  title: 'Documentation',
                  desc: 'Generate understanding of program logic for documentation purposes. AI explanations help create clear descriptions of what each section does.',
                  icon: (
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--inst-counter)" strokeWidth="1.5">
                      <path d="M4 19.5A2.5 2.5 0 016.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 014 19.5v-15A2.5 2.5 0 016.5 2z" />
                    </svg>
                  )
                }
              ].map((useCase, idx) => (
                <div
                  key={idx}
                  className="surface-card"
                  style={{ padding: 'var(--space-8)' }}
                >
                  <div
                    className="flex items-center justify-center"
                    style={{
                      width: '56px',
                      height: '56px',
                      marginBlockEnd: 'var(--space-6)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)'
                    }}
                  >
                    {useCase.icon}
                  </div>
                  <h3
                    className="text-fluid-xl font-semibold"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-3)' }}
                  >
                    {useCase.title}
                  </h3>
                  <p className="text-fluid-base" style={{ color: 'var(--text-secondary)', lineHeight: '1.7' }}>
                    {useCase.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Supported File Formats */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
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
                Supported File Formats
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                One viewer for all your Allen-Bradley programs
              </p>
            </div>

            <div
              className="grid container-inline"
              style={{
                gap: 'var(--space-6)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))'
              }}
            >
              {[
                {
                  ext: '.L5X',
                  name: 'Studio 5000 Export',
                  desc: 'XML-based export format from Studio 5000 Logix Designer',
                  controllers: 'ControlLogix, CompactLogix, GuardLogix',
                  color: 'var(--accent-emerald)',
                  link: '/l5x-file'
                },
                {
                  ext: '.ACD',
                  name: 'Studio 5000 Project',
                  desc: 'Native project files from Studio 5000 Logix Designer',
                  controllers: 'ControlLogix, CompactLogix, GuardLogix',
                  color: 'var(--accent-blue)',
                  link: '/acd-file'
                },
                {
                  ext: '.RSS',
                  name: 'RSLogix 500 Project',
                  desc: 'Legacy project files from RSLogix 500',
                  controllers: 'SLC 500, MicroLogix 1000/1100/1400',
                  color: 'var(--accent-amber)',
                  link: '/rss-file'
                }
              ].map((format, idx) => (
                <Link
                  key={idx}
                  href={format.link}
                  className="surface-card block transition-all hover:border-current"
                  style={{
                    padding: 'var(--space-8)',
                    textDecoration: 'none',
                    borderColor: 'var(--border-subtle)'
                  }}
                >
                  <div className="flex items-center justify-between" style={{ marginBlockEnd: 'var(--space-4)' }}>
                    <span
                      className="text-fluid-3xl font-bold font-mono"
                      style={{ color: format.color }}
                    >
                      {format.ext}
                    </span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                      <path d="M5 12h14M12 5l7 7-7 7" />
                    </svg>
                  </div>
                  <h3
                    className="text-fluid-lg font-semibold"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-2)' }}
                  >
                    {format.name}
                  </h3>
                  <p className="text-fluid-sm" style={{ color: 'var(--text-tertiary)', marginBlockEnd: 'var(--space-4)' }}>
                    {format.desc}
                  </p>
                  <p className="text-fluid-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {format.controllers}
                  </p>
                </Link>
              ))}
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

        {/* CTA Section */}
        <section
          id="get-started"
          className="py-fluid-20"
          style={{
            background: 'var(--surface-1)',
            borderBlock: '1px solid var(--border-subtle)',
            paddingBlock: 'var(--space-24)'
          }}
        >
          <div className="container-default text-center">
            <h2
              className="text-fluid-4xl font-bold"
              style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-6)' }}
            >
              Ready to View Your PLC Programs?
            </h2>
            <p
              className="text-fluid-lg"
              style={{
                color: 'var(--text-secondary)',
                maxWidth: '36rem',
                marginInline: 'auto',
                marginBlockEnd: 'var(--space-10)'
              }}
            >
              Upload your L5X, ACD, or RSS file and start viewing immediately.
              No credit card required. No installation needed.
            </p>

            <div className="stack-to-row justify-center" style={{ gap: 'var(--space-4)', marginBlockEnd: 'var(--space-8)' }}>
              <Link
                href="/l5x-file"
                className="btn btn-primary text-fluid-base inline-flex items-center justify-center"
                style={{
                  paddingInline: 'var(--space-8)',
                  paddingBlock: 'var(--space-4)',
                  gap: 'var(--space-2)',
                  minHeight: 'var(--touch-target-min)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                Upload L5X File
              </Link>
              <Link
                href="/acd-file"
                className="btn btn-secondary text-fluid-base inline-flex items-center justify-center"
                style={{
                  paddingInline: 'var(--space-8)',
                  paddingBlock: 'var(--space-4)',
                  minHeight: 'var(--touch-target-min)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                Upload ACD File
              </Link>
              <Link
                href="/rss-file"
                className="btn btn-secondary text-fluid-base inline-flex items-center justify-center"
                style={{
                  paddingInline: 'var(--space-8)',
                  paddingBlock: 'var(--space-4)',
                  minHeight: 'var(--touch-target-min)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                Upload RSS File
              </Link>
            </div>

            <div className="flex flex-wrap items-center justify-center" style={{ gap: 'var(--space-6)' }}>
              <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-fluid-sm" style={{ color: 'var(--text-tertiary)' }}>No installation</span>
              </div>
              <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-fluid-sm" style={{ color: 'var(--text-tertiary)' }}>Works on any device</span>
              </div>
              <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                <span className="text-fluid-sm" style={{ color: 'var(--text-tertiary)' }}>Secure & private</span>
              </div>
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
    </div>
  )
}
