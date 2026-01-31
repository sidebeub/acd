'use client'

import { JsonLd } from '@/components/seo/JsonLd'
import { CTASection } from '@/components/home/CTASection'
import { Logo } from '@/components/ui/Logo'
import {
  ScrollProgress,
  GrainOverlay
} from '@/components/home/Effects'

export default function Home() {
  return (
    <div className="min-h-screen-safe relative safe-area-inset" style={{ background: 'var(--surface-0)' }}>
      {/* Scroll progress bar at top */}
      <ScrollProgress />

      {/* Grain texture overlay */}
      <GrainOverlay />
      <JsonLd />
      {/* Subtle grid background - very faint for premium feel */}
      <div
        className="fixed inset-0 grid-pattern opacity-5 pointer-events-none"
        style={{ maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 60%)' }}
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
          <a href="/" className="flex items-center" style={{ color: 'white', textDecoration: 'none' }}>
            <Logo size="sm" />
          </a>

          <nav className="hide-mobile flex items-center" style={{ gap: 'var(--space-8)' }}>
            <a
              href="/l5x-file"
              className="text-fluid-sm font-medium transition-colors hover:text-white"
              style={{ color: 'var(--text-tertiary)' }}
            >
              L5X Files
            </a>
            <a
              href="/acd-file"
              className="text-fluid-sm font-medium transition-colors hover:text-white"
              style={{ color: 'var(--text-tertiary)' }}
            >
              ACD Files
            </a>
            <a
              href="/rss-file"
              className="text-fluid-sm font-medium transition-colors hover:text-white"
              style={{ color: 'var(--text-tertiary)' }}
            >
              RSS Files
            </a>
            <a
              href="/dashboard"
              className="text-fluid-sm font-medium transition-colors hover:text-white"
              style={{ color: 'var(--text-tertiary)' }}
            >
              My Projects
            </a>
            <a
              href="#waitlist"
              className="btn btn-primary text-fluid-sm"
              style={{
                paddingInline: 'var(--space-4)',
                paddingBlock: 'var(--space-2)',
                minHeight: 'var(--touch-target-min)',
                borderRadius: 'var(--radius-md)'
              }}
            >
              Join Waitlist
            </a>
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* ==================== HERO SECTION ==================== */}
        <section className="relative overflow-hidden" style={{ minHeight: '100vh' }}>
          {/* Video Background */}
          <div className="absolute inset-0 z-0">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="w-full h-full object-cover"
            >
              <source src="/hero-video.webm" type="video/webm" />
            </video>
            {/* Dark overlay for text readability */}
            <div
              className="absolute inset-0"
              style={{
                background: 'linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.8) 100%)'
              }}
            />
          </div>

          {/* Hero Content - Overlaid on video */}
          <div
            className="relative z-10 flex flex-col items-center justify-center text-center"
            style={{ minHeight: '100vh', padding: 'var(--space-8)' }}
          >
            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(3rem, 10vw, 6rem)',
                fontWeight: 600,
                color: '#ffffff',
                marginBlockEnd: 'var(--space-4)',
                lineHeight: '1.1',
                letterSpacing: '-0.02em',
                textShadow: '0 4px 30px rgba(0,0,0,0.5)'
              }}
            >
              STOP PAYING $5,000<br />
              <span style={{ color: 'var(--accent)' }}>FOR SOFTWARE YOU BARELY USE</span>
            </h1>

            <p
              style={{
                fontSize: 'clamp(1.125rem, 2.5vw, 1.5rem)',
                fontWeight: 400,
                color: 'rgba(255,255,255,0.8)',
                marginBlockEnd: 'var(--space-8)',
                textShadow: '0 2px 10px rgba(0,0,0,0.5)',
                maxWidth: '40rem',
                lineHeight: 1.6
              }}
            >
              View Allen-Bradley PLC programs without Studio 5000.
              Upload your L5X, ACD, or RSS files. Get AI-powered explanations in seconds.
            </p>

            <div className="flex flex-wrap justify-center" style={{ gap: 'var(--space-4)' }}>
              <a
                href="#waitlist"
                className="inline-flex items-center justify-center transition-all"
                style={{
                  paddingInline: 'var(--space-6)',
                  paddingBlock: 'var(--space-3)',
                  gap: 'var(--space-2)',
                  background: '#ffffff',
                  color: '#0a0a0a',
                  border: '1px solid #ffffff',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}
              >
                Join Waitlist
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center transition-all"
                style={{
                  paddingInline: 'var(--space-6)',
                  paddingBlock: 'var(--space-3)',
                  background: 'transparent',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.4)',
                  fontSize: '13px',
                  fontWeight: 600,
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}
              >
                How It Works
              </a>
            </div>

            {/* Scroll indicator */}
            <div
              className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce"
              style={{ opacity: 0.6 }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                <path d="M12 5v14M5 12l7 7 7-7" />
              </svg>
            </div>
          </div>
        </section>

        {/* ==================== FILE FORMATS ==================== */}
        <section style={{
          background: 'var(--surface-1)',
          borderBlock: '1px solid var(--border-subtle)',
          paddingBlock: 'clamp(60px, 10vh, 100px)'
        }}>
          <div style={{ maxWidth: '1400px', marginInline: 'auto', paddingInline: 'var(--space-6)' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-end',
              marginBlockEnd: 'var(--space-10)',
              flexWrap: 'wrap',
              gap: 'var(--space-4)'
            }}>
              <div>
                <p style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBlockEnd: 'var(--space-2)'
                }}>
                  Supported Formats
                </p>
                <h3 style={{
                  fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em'
                }}>
                  Every Allen-Bradley file type
                </h3>
              </div>
              <p style={{ color: 'var(--text-tertiary)', maxWidth: '400px' }}>
                From modern ControlLogix to legacy SLC 500. One viewer for everything.
              </p>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              background: 'var(--border-subtle)'
            }}>
              {[
                {
                  ext: '.L5X',
                  name: 'Studio 5000 Export',
                  desc: 'ControlLogix, CompactLogix, GuardLogix',
                  controllers: '1756-L8x, 1769-L3x'
                },
                {
                  ext: '.ACD',
                  name: 'Native Project',
                  desc: 'Full Studio 5000 project files',
                  controllers: 'All Logix controllers'
                },
                {
                  ext: '.RSS',
                  name: 'RSLogix 500',
                  desc: 'SLC 500, MicroLogix, PLC-5',
                  controllers: 'SLC 5/01-5/05, ML1000-1400'
                }
              ].map((format) => (
                <div
                  key={format.ext}
                  className="format-card"
                  style={{
                    background: 'var(--surface-0)',
                    padding: 'clamp(24px, 4vw, 48px)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--space-4)',
                    position: 'relative'
                  }}
                >
                  <span style={{
                    fontSize: 'clamp(2rem, 5vw, 3rem)',
                    fontWeight: 700,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--accent)',
                    letterSpacing: '-0.02em'
                  }}>
                    {format.ext}
                  </span>
                  <div>
                    <p style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBlockEnd: '4px'
                    }}>
                      {format.name}
                    </p>
                    <p style={{ color: 'var(--text-tertiary)', fontSize: '0.875rem' }}>
                      {format.desc}
                    </p>
                  </div>
                  <p style={{
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-muted)',
                    marginBlockStart: 'auto'
                  }}>
                    {format.controllers}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== FEATURES - Editorial Grid ==================== */}
        <section style={{ background: 'var(--surface-0)', paddingBlock: 'clamp(80px, 15vh, 150px)' }}>
          <div style={{ maxWidth: '1400px', marginInline: 'auto', paddingInline: 'var(--space-6)' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(12, 1fr)',
              gap: 'var(--space-6)'
            }}>
              {/* Left column - Big number + title */}
              <div style={{ gridColumn: 'span 5' }}>
                <span style={{
                  fontSize: 'clamp(6rem, 15vw, 12rem)',
                  fontWeight: 800,
                  color: 'var(--surface-3)',
                  lineHeight: 0.8,
                  display: 'block'
                }}>
                  215+
                </span>
                <h3 style={{
                  fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBlockStart: 'var(--space-4)'
                }}>
                  Instructions supported
                </h3>
                <p style={{
                  color: 'var(--text-secondary)',
                  marginBlockStart: 'var(--space-3)',
                  maxWidth: '300px',
                  lineHeight: 1.6
                }}>
                  From basic XIC/OTE to motion control. Every instruction explained in plain English.
                </p>
              </div>

              {/* Right column - Feature list */}
              <div style={{ gridColumn: 'span 7', display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border-subtle)' }}>
                {[
                  { title: 'AI Explanations', desc: 'Click any rung. Get instant understanding. Choose friendly, technical, or operator mode.' },
                  { title: 'Tag Browser', desc: 'Search thousands of tags instantly. Filter by type, scope, or usage.' },
                  { title: 'Cross Reference', desc: 'Find every place a tag is used. Trace signal flow through your program.' },
                  { title: 'No Installation', desc: 'Runs in your browser. Works on any device. Start viewing in seconds.' },
                ].map((feature, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--surface-0)',
                      padding: 'var(--space-6)',
                      display: 'grid',
                      gridTemplateColumns: '1fr 2fr',
                      gap: 'var(--space-6)',
                      alignItems: 'baseline'
                    }}
                  >
                    <h4 style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)'
                    }}>
                      {feature.title}
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {feature.desc}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================== HOW IT WORKS - Minimal ==================== */}
        <section id="how-it-works" style={{
          background: 'var(--surface-1)',
          borderBlock: '1px solid var(--border-subtle)',
          paddingBlock: 'clamp(60px, 10vh, 100px)'
        }}>
          <div style={{ maxWidth: '1400px', marginInline: 'auto', paddingInline: 'var(--space-6)' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '1px',
              background: 'var(--border-subtle)'
            }}>
              {[
                { num: '01', title: 'Upload', desc: 'Drop your L5X, ACD, or RSS file' },
                { num: '02', title: 'Browse', desc: 'Navigate programs, routines, tags' },
                { num: '03', title: 'Understand', desc: 'Get AI explanations in plain English' },
              ].map((step) => (
                <div
                  key={step.num}
                  style={{
                    background: 'var(--surface-0)',
                    padding: 'clamp(32px, 5vw, 64px)'
                  }}
                >
                  <span style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    letterSpacing: '0.1em',
                    color: 'var(--accent)'
                  }}>
                    {step.num}
                  </span>
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(1.5rem, 3vw, 2rem)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBlock: 'var(--space-3)'
                  }}>
                    {step.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== WHO IT'S FOR ==================== */}
        <section style={{ background: 'var(--surface-0)', paddingBlock: 'clamp(80px, 15vh, 150px)' }}>
          <div style={{ maxWidth: '1400px', marginInline: 'auto', paddingInline: 'var(--space-6)' }}>
            <p style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBlockEnd: 'var(--space-6)'
            }}>
              Built for
            </p>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
              gap: 'var(--space-8)'
            }}>
              {[
                { title: 'Maintenance Technicians', desc: 'Understand unfamiliar machine code during troubleshooting without needing Studio 5000.' },
                { title: 'Controls Engineers', desc: 'Review programs from integrators or legacy systems. Document code with AI-generated explanations.' },
                { title: 'Training Teams', desc: 'Help new team members understand existing code. Plain English explanations break down complex logic.' },
              ].map((item) => (
                <div key={item.title}>
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBlockEnd: 'var(--space-3)'
                  }}>
                    {item.title}
                  </h3>
                  <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== COMPARISON SECTION ==================== */}
        <section style={{
          background: 'var(--surface-1)',
          borderBlock: '1px solid var(--border-subtle)',
          paddingBlock: 'clamp(80px, 15vh, 150px)'
        }}>
          <div style={{ maxWidth: '1400px', marginInline: 'auto', paddingInline: 'var(--space-6)' }}>
            <div style={{ textAlign: 'center', marginBlockEnd: 'var(--space-12)' }}>
              <p style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBlockEnd: 'var(--space-3)'
              }}>
                Why PLC Viewer
              </p>
              <h2 style={{
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em'
              }}>
                The smarter way to view PLC code
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: '1px',
              background: 'var(--border-subtle)'
            }}>
              {/* Studio 5000 Column */}
              <div style={{ background: 'var(--surface-0)', padding: 'clamp(32px, 5vw, 48px)' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  marginBlockEnd: 'var(--space-6)'
                }}>
                  <span style={{
                    width: '12px',
                    height: '12px',
                    background: 'var(--text-muted)',
                    opacity: 0.5
                  }} />
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: 'var(--text-tertiary)'
                  }}>
                    Studio 5000
                  </h3>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {[
                    '$5,000+ license cost',
                    'Windows only',
                    'Heavy installation required',
                    'Version compatibility issues',
                    'No AI explanations',
                    'Complex interface'
                  ].map((item, idx) => (
                    <li
                      key={idx}
                      style={{
                        padding: 'var(--space-3) 0',
                        borderBlockEnd: idx < 5 ? '1px solid var(--border-subtle)' : 'none',
                        color: 'var(--text-tertiary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* PLC Viewer Column */}
              <div style={{ background: 'var(--surface-0)', padding: 'clamp(32px, 5vw, 48px)' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-3)',
                  marginBlockEnd: 'var(--space-6)'
                }}>
                  <span style={{
                    width: '12px',
                    height: '12px',
                    background: 'var(--accent)'
                  }} />
                  <h3 style={{
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)'
                  }}>
                    PLC Viewer
                  </h3>
                </div>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {[
                    'Affordable subscription',
                    'Works on any device',
                    'No installation needed',
                    'Opens any version instantly',
                    'AI-powered explanations',
                    'Clean, modern interface'
                  ].map((item, idx) => (
                    <li
                      key={idx}
                      style={{
                        padding: 'var(--space-3) 0',
                        borderBlockEnd: idx < 5 ? '1px solid var(--border-subtle)' : 'none',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-3)'
                      }}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* ==================== STATS SECTION ==================== */}
        <section style={{ background: 'var(--surface-0)', paddingBlock: 'clamp(60px, 10vh, 100px)' }}>
          <div style={{ maxWidth: '1400px', marginInline: 'auto', paddingInline: 'var(--space-6)' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1px',
              background: 'var(--border-subtle)'
            }}>
              {[
                { value: 215, suffix: '+', label: 'Instructions Supported' },
                { value: 25, suffix: '+', label: 'Motion Instructions' },
                { value: 3, suffix: '', label: 'File Formats (L5X/ACD/RSS)' },
                { value: 14, suffix: '', label: 'Analysis Tools' }
              ].map((stat, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--surface-0)',
                    padding: 'clamp(24px, 4vw, 48px)',
                    textAlign: 'center'
                  }}
                >
                  <span style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(2.5rem, 6vw, 4rem)',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    display: 'block',
                    lineHeight: 1
                  }}>
                    {stat.value}{stat.suffix}
                  </span>
                  <span style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-tertiary)',
                    marginBlockStart: 'var(--space-2)',
                    display: 'block'
                  }}>
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== DEEP DIVE FEATURES ==================== */}
        <section style={{
          background: 'var(--surface-1)',
          borderBlock: '1px solid var(--border-subtle)',
          paddingBlock: 'clamp(80px, 15vh, 150px)'
        }}>
          <div style={{ maxWidth: '1400px', marginInline: 'auto', paddingInline: 'var(--space-6)' }}>
            <div style={{ marginBlockEnd: 'var(--space-12)' }}>
              <p style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBlockEnd: 'var(--space-3)'
              }}>
                Features
              </p>
              <h2 style={{
                fontSize: 'clamp(2rem, 5vw, 3rem)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                maxWidth: '600px'
              }}>
                Everything you need to understand PLC code
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 'var(--space-6)'
            }}>
              {[
                {
                  title: 'AI-Powered Explanations',
                  desc: 'Click any rung and get an instant explanation in plain English. Choose from three modes: Friendly (for beginners), Technical (for engineers), or Operator (for floor personnel). Chat with AI about your entire program.',
                  accent: 'var(--accent)'
                },
                {
                  title: 'Interactive Simulation',
                  desc: 'Toggle tags and watch power flow through your ladder logic in real-time. Simulate timers and counters. Inject faults to test logic. See exactly what would happen on the real PLC.',
                  accent: 'var(--accent-blue)'
                },
                {
                  title: 'Cross Reference & Tracing',
                  desc: 'Find every rung where a tag is read or written. Trace signal flow upstream and downstream. See call trees for JSR relationships. Find similar or duplicate rungs across your program.',
                  accent: 'var(--accent-amber)'
                },
                {
                  title: 'Trend Charts & Watch Window',
                  desc: 'Monitor multiple tags in real-time with a floating watch window. Graph tag values over time with trend charts. Perfect for understanding timing and sequence behavior.',
                  accent: 'var(--accent)'
                },
                {
                  title: 'Safety & Alarm Analysis',
                  desc: 'Automatically detect E-stops, guard interlocks, light curtains, and safety relays. Find all ALMD and ALMA alarm instructions. Understand your safety system at a glance.',
                  accent: 'var(--accent-blue)'
                },
                {
                  title: 'Program Diff & Compare',
                  desc: 'Compare two versions of your program to see what changed. Color-coded diff view shows added, removed, and modified rungs. Essential for version control and code review.',
                  accent: 'var(--accent-amber)'
                },
                {
                  title: '215+ Instructions Supported',
                  desc: 'Full support for ladder logic, timers, counters, math, compare, motion control (25+ servo instructions), sequencers, string operations, and more. Plus structured text viewing.',
                  accent: 'var(--accent)'
                },
                {
                  title: 'Export & Documentation',
                  desc: 'Export to PDF with AI explanations, color-coded rungs, and simulation state. Generate CSV tag lists. Create markdown documentation. Print-ready reports for maintenance.',
                  accent: 'var(--accent-blue)'
                }
              ].map((feature, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'var(--surface-0)',
                    padding: 'clamp(24px, 4vw, 40px)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '4px'
                  }}
                >
                  <h3 style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.25rem',
                    fontWeight: 600,
                    color: 'var(--text-primary)',
                    marginBlockEnd: 'var(--space-3)'
                  }}>
                    {feature.title}
                  </h3>
                  <p style={{
                    color: 'var(--text-secondary)',
                    lineHeight: 1.7,
                    fontSize: '0.9375rem'
                  }}>
                    {feature.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== QUOTE / TESTIMONIAL ==================== */}
        <section style={{ background: 'var(--surface-0)', paddingBlock: 'clamp(80px, 15vh, 150px)' }}>
          <div style={{ maxWidth: '900px', marginInline: 'auto', paddingInline: 'var(--space-6)', textAlign: 'center' }}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth="1"
              style={{ marginBlockEnd: 'var(--space-6)' }}
            >
              <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V21c0 1 0 1 1 1z" />
              <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z" />
            </svg>
            <blockquote style={{
              fontSize: 'clamp(1.5rem, 4vw, 2.25rem)',
              fontWeight: 300,
              color: 'var(--text-primary)',
              lineHeight: 1.4,
              fontStyle: 'italic',
              marginBlockEnd: 'var(--space-6)'
            }}>
              Finally, a way to review PLC code without buying another $5,000 license just to look at a file someone sent me.
            </blockquote>
            <p style={{
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
              letterSpacing: '0.05em'
            }}>
              — Every controls engineer, probably
            </p>
          </div>
        </section>

        {/* ==================== FAQ SECTION ==================== */}
        <section style={{
          background: 'var(--surface-1)',
          borderBlock: '1px solid var(--border-subtle)',
          paddingBlock: 'clamp(80px, 15vh, 150px)'
        }}>
          <div style={{ maxWidth: '1400px', marginInline: 'auto', paddingInline: 'var(--space-6)' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 2fr',
              gap: 'var(--space-12)'
            }}>
              <div>
                <p style={{
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBlockEnd: 'var(--space-3)'
                }}>
                  FAQ
                </p>
                <h2 style={{
                  fontSize: 'clamp(1.5rem, 4vw, 2.5rem)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  letterSpacing: '-0.02em'
                }}>
                  Common questions
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', background: 'var(--border-subtle)' }}>
                {[
                  {
                    q: 'Can I edit PLC code with this tool?',
                    a: 'No. PLC Viewer is a read-only tool designed for viewing and understanding code. For editing, you\'ll still need Studio 5000 or RSLogix. We focus on doing one thing exceptionally well: helping you understand PLC code.'
                  },
                  {
                    q: 'What file versions are supported?',
                    a: 'We support L5X exports from any Studio 5000 version, ACD project files from v20+, and RSS files from RSLogix 500. Legacy formats are parsed and displayed correctly regardless of the original software version.'
                  },
                  {
                    q: 'How accurate are the AI explanations?',
                    a: 'Our AI is trained on PLC programming patterns and understands Allen-Bradley instruction sets deeply. It considers tag names, comments, and context to provide meaningful explanations. You can choose Technical mode for precise details or Friendly mode for simplified overviews.'
                  },
                  {
                    q: 'Is my code secure?',
                    a: 'Yes. Files are processed in secure, isolated environments. We don\'t store your PLC code permanently or share it with third parties. Your intellectual property remains yours.'
                  },
                  {
                    q: 'Does it work offline?',
                    a: 'Currently, PLC Viewer requires an internet connection for AI features. The core viewing functionality processes files locally in your browser for speed and privacy.'
                  },
                  {
                    q: 'What about safety-rated programs?',
                    a: 'PLC Viewer displays safety program structure, safety tags, and GuardLogix-specific content. Safety instructions are clearly marked and explained appropriately.'
                  }
                ].map((faq, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: 'var(--surface-0)',
                      padding: 'var(--space-6)'
                    }}
                  >
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBlockEnd: 'var(--space-3)'
                    }}>
                      {faq.q}
                    </h3>
                    <p style={{
                      color: 'var(--text-secondary)',
                      lineHeight: 1.7
                    }}>
                      {faq.a}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ==================== COMING SOON / ROADMAP ==================== */}
        <section style={{ background: 'var(--surface-0)', paddingBlock: 'clamp(60px, 10vh, 100px)' }}>
          <div style={{ maxWidth: '1400px', marginInline: 'auto', paddingInline: 'var(--space-6)' }}>
            <div style={{ textAlign: 'center', marginBlockEnd: 'var(--space-10)' }}>
              <p style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--accent-amber)',
                marginBlockEnd: 'var(--space-3)'
              }}>
                Coming Soon
              </p>
              <h2 style={{
                fontSize: 'clamp(1.5rem, 4vw, 2rem)',
                fontWeight: 600,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em'
              }}>
                Features on the roadmap
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-4)'
            }}>
              {[
                'Siemens TIA Portal Support',
                'Omron CX-Programmer Support',
                'Team Sharing & Collaboration',
                'API Access',
                'Offline Mode',
                'Code Annotations',
                'Custom Report Templates',
                'Integration with CMMS'
              ].map((feature, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: 'var(--space-4)',
                    border: '1px dashed var(--border-subtle)',
                    textAlign: 'center'
                  }}
                >
                  <span style={{
                    fontSize: '0.875rem',
                    color: 'var(--text-tertiary)'
                  }}>
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ==================== REVERSE SCROLLING MARQUEE ==================== */}
        <div style={{
          borderBlock: '1px solid var(--border-subtle)',
          background: 'var(--surface-1)',
          paddingBlock: 'var(--space-4)',
          overflow: 'hidden'
        }}>
          <div className="marquee">
            {[0, 1].map((i) => (
              <div key={i} className="marquee-content-reverse" style={{ gap: 'var(--space-12)' }}>
                {['ControlLogix', 'CompactLogix', 'GuardLogix', 'SLC 500', 'MicroLogix 1000', 'MicroLogix 1100', 'MicroLogix 1400', 'PLC-5', 'Studio 5000', 'RSLogix 500', 'RSLogix 5000'].map((name) => (
                  <span
                    key={`${i}-${name}`}
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 500,
                      color: 'var(--text-tertiary)',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {name}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* ==================== CTA SECTION (Upload for admin, Waitlist for others) ==================== */}
        <CTASection />

        {/* ==================== FOOTER ==================== */}
        <footer style={{
          borderBlockStart: '1px solid var(--border-subtle)',
          background: 'var(--surface-0)',
          paddingBlock: 'var(--space-10)'
        }}>
          <div style={{
            maxWidth: '1400px',
            marginInline: 'auto',
            paddingInline: 'var(--space-6)'
          }}>
            {/* Footer grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
              gap: 'var(--space-8)',
              marginBlockEnd: 'var(--space-8)'
            }}>
              {/* Logo column */}
              <div>
                <a href="/" style={{ color: 'white', textDecoration: 'none', display: 'inline-block', marginBlockEnd: 'var(--space-3)' }}>
                  <Logo size="sm" style={{ opacity: 0.8 }} />
                </a>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  View PLC programs without expensive licenses.
                </p>
              </div>

              {/* File Formats */}
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBlockEnd: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>File Formats</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <a href="/l5x-file" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>L5X Viewer</a>
                  <a href="/acd-file" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>ACD Viewer</a>
                  <a href="/rss-file" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>RSS Viewer</a>
                </div>
              </div>

              {/* Resources */}
              <div>
                <p style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--text-tertiary)', marginBlockEnd: 'var(--space-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resources</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  <a href="/ladder-logic-viewer" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>Ladder Logic Viewer</a>
                  <a href="/view-l5x-without-studio-5000" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>View L5X Without Studio 5000</a>
                  <a href="/studio-5000-alternative" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>Studio 5000 Alternative</a>
                  <a href="/free-allen-bradley-plc-viewer" style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textDecoration: 'none' }}>Allen-Bradley Viewer</a>
                </div>
              </div>
            </div>

            {/* Copyright */}
            <div style={{ borderBlockStart: '1px solid var(--border-subtle)', paddingBlockStart: 'var(--space-6)' }}>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                © {new Date().getFullYear()} PLC Viewer. Allen-Bradley, ControlLogix, CompactLogix, RSLogix, and Studio 5000 are trademarks of Rockwell Automation.
              </p>
            </div>
          </div>
        </footer>
      </main>
    </div>
  )
}
