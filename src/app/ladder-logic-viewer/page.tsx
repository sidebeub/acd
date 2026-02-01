'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { trackEvent } from '@/lib/analytics'

// FAQ data for schema markup
const faqs = [
  {
    question: "What is ladder logic?",
    answer: "Ladder logic is a graphical programming language used to program PLCs (Programmable Logic Controllers). It gets its name from its visual resemblance to a ladder, with two vertical rails (power rails) and horizontal rungs containing instructions. Each rung represents a logical operation, with inputs on the left (like switches and sensors) and outputs on the right (like motors and valves). Ladder logic was designed to mimic relay-based electrical schematics, making it intuitive for electricians and maintenance technicians to understand and troubleshoot."
  },
  {
    question: "How do I view ladder logic diagrams online?",
    answer: "With PLC Viewer, you can view ladder logic diagrams directly in your web browser without installing any software. Simply upload your L5X, ACD, or RSS file, and the viewer will parse and display all rungs with color-coded instructions. You'll see XIC contacts, OTE coils, timers, counters, and all other instructions rendered clearly. The viewer works on any device - desktop, tablet, or mobile - and processes files securely in your browser."
  },
  {
    question: "What instructions does the viewer support?",
    answer: "PLC Viewer supports over 215 ladder logic instructions including: Bit instructions (XIC, XIO, OTE, OTL, OTU, ONS, OSR, OSF), Timer/Counter instructions (TON, TOF, RTO, CTU, CTD, RES), Compare instructions (EQU, NEQ, LES, GRT, LEQ, GEQ, LIM, MEQ), Math instructions (ADD, SUB, MUL, DIV, MOD, SQR, NEG, ABS), Move instructions (MOV, MVM, BTD, SWPB, CLR), Array instructions (COP, CPS, FLL, AVE, SRT, STD), Program control (JSR, RET, JMP, LBL, MCR, AFI), and many more including motion control, message, and diagnostic instructions."
  },
  {
    question: "Can I get explanations of ladder logic rungs?",
    answer: "Yes! PLC Viewer includes AI-powered explanations that describe what each rung does in plain English. Click on any rung and choose from three explanation modes: Friendly (simplified explanations for beginners), Technical (detailed explanations for engineers), or Operator (focused on what the machine does). The AI considers tag names, comments, and instruction context to provide meaningful, accurate explanations of your ladder logic."
  }
]

// Instruction categories for the comprehensive list
const instructionCategories = [
  {
    name: 'Bit Instructions',
    color: 'var(--inst-input)',
    instructions: ['XIC', 'XIO', 'OTE', 'OTL', 'OTU', 'ONS', 'OSR', 'OSF', 'AFI', 'NOP']
  },
  {
    name: 'Timer/Counter',
    color: 'var(--inst-timer)',
    instructions: ['TON', 'TOF', 'RTO', 'TONR', 'TOFR', 'RTOR', 'CTU', 'CTD', 'CTUD', 'RES']
  },
  {
    name: 'Compare',
    color: 'var(--inst-compare)',
    instructions: ['CMP', 'EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM', 'MEQ']
  },
  {
    name: 'Math',
    color: 'var(--inst-math)',
    instructions: ['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SQR', 'SQRT', 'NEG', 'ABS', 'CPT', 'SIN', 'COS', 'TAN', 'ASN', 'ACS', 'ATN', 'LN', 'LOG', 'XPY']
  },
  {
    name: 'Move/Logical',
    color: 'var(--inst-move)',
    instructions: ['MOV', 'MVM', 'BTD', 'SWPB', 'CLR', 'AND', 'OR', 'XOR', 'NOT', 'BAND', 'BOR', 'BXOR', 'BNOT']
  },
  {
    name: 'Array/File',
    color: 'var(--inst-counter)',
    instructions: ['COP', 'CPS', 'FLL', 'AVE', 'SRT', 'STD', 'SIZE', 'FAL', 'FSC', 'FBC', 'DDT', 'DTR', 'RCP', 'TND']
  },
  {
    name: 'Program Control',
    color: 'var(--inst-jump)',
    instructions: ['JSR', 'RET', 'SBR', 'JMP', 'LBL', 'MCR', 'UID', 'UIE', 'FOR', 'BRK', 'TND', 'EOT', 'SFP', 'SFR', 'EVENT']
  },
  {
    name: 'I/O & Communication',
    color: 'var(--accent-blue)',
    instructions: ['MSG', 'GSV', 'SSV', 'IOT', 'ABL', 'ACB', 'ACL', 'AHL', 'ARD', 'ARL', 'AWA', 'AWT']
  },
  {
    name: 'Motion Control',
    color: 'var(--accent-emerald)',
    instructions: ['MSO', 'MSF', 'MASD', 'MASR', 'MAH', 'MAJ', 'MAM', 'MAG', 'MAS', 'MAFR', 'MDO', 'MDF', 'MCLM', 'MCCM', 'MCCD', 'MCS', 'MCSD']
  }
]

export default function LadderLogicViewerPage() {
  const router = useRouter()
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.l5x') && !fileName.endsWith('.acd') && !fileName.endsWith('.rss')) {
      setError('Please upload an L5X, ACD, or RSS file')
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
      trackEvent('file_upload')
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
              Upload File
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
                Online Viewer
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
              Online Ladder Logic Viewer
              <br />
              <span style={{ color: 'var(--accent-blue)' }}>View PLC Diagrams Online</span>
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
              View Allen-Bradley ladder logic diagrams in your browser. No software installation required.
              Upload your L5X, ACD, or RSS file and instantly see color-coded rungs with AI-powered explanations.
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
                View Ladder Logic Now
              </a>
              <a
                href="#what-is-ladder-logic"
                className="btn btn-secondary text-fluid-base inline-flex items-center justify-center"
                style={{
                  paddingInline: 'var(--space-8)',
                  paddingBlock: 'var(--space-3)',
                  minHeight: 'var(--touch-target-min)',
                  borderRadius: 'var(--radius-md)'
                }}
              >
                Learn About Ladder Logic
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>No installation needed</span>
              </div>
              <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
                <span className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>215+ instructions</span>
              </div>
              <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v6l4 2" />
                </svg>
                <span className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>View in seconds</span>
              </div>
            </div>
          </div>
        </section>

        {/* What is Ladder Logic Section */}
        <section id="what-is-ladder-logic" className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
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
                  style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
                >
                  Understanding Ladder Logic
                </span>
                <h2
                  className="text-fluid-4xl font-bold"
                  style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-6)' }}
                >
                  What is Ladder Logic Programming?
                </h2>
                <div className="stack" style={{ color: 'var(--text-secondary)', gap: 'var(--space-4)' }}>
                  <p className="text-fluid-base" style={{ lineHeight: '1.7' }}>
                    Ladder logic is the most widely-used programming language for PLCs (Programmable Logic Controllers).
                    It represents electrical circuits graphically, with two vertical power rails and horizontal rungs
                    containing instructions. This visual format makes it intuitive for:
                  </p>
                  <ul className="stack" style={{ gap: 'var(--space-2)', paddingInlineStart: 'var(--space-6)', listStyle: 'disc' }}>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Electricians familiar with relay schematics</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Maintenance technicians troubleshooting machines</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Controls engineers designing automation systems</li>
                    <li className="text-fluid-base" style={{ lineHeight: '1.7' }}>Operators understanding machine behavior</li>
                  </ul>
                  <p className="text-fluid-base" style={{ lineHeight: '1.7' }}>
                    Each rung in a ladder diagram executes from left to right, evaluating conditions (inputs)
                    before energizing outputs. This mimics how electrical current flows through relay logic circuits.
                  </p>
                </div>
              </div>

              {/* Visual Ladder Logic Example */}
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
                  style={{ color: 'var(--accent-emerald)', marginBlockEnd: 'var(--space-4)' }}
                >
                  Common Instructions
                </span>
                <div className="stack" style={{ gap: 'var(--space-3)' }}>
                  {[
                    { name: 'XIC', desc: 'Examine If Closed - Checks if a bit is ON (1)', color: 'var(--inst-input)' },
                    { name: 'XIO', desc: 'Examine If Open - Checks if a bit is OFF (0)', color: 'var(--inst-input)' },
                    { name: 'OTE', desc: 'Output Energize - Sets output ON when rung is true', color: 'var(--inst-output)' },
                    { name: 'OTL', desc: 'Output Latch - Latches output ON (stays on)', color: 'var(--inst-output)' },
                    { name: 'OTU', desc: 'Output Unlatch - Unlatches output OFF', color: 'var(--inst-output)' },
                    { name: 'TON', desc: 'Timer On Delay - Delays turning output ON', color: 'var(--inst-timer)' },
                    { name: 'CTU', desc: 'Count Up - Increments counter each true scan', color: 'var(--inst-counter)' }
                  ].map((inst, idx) => (
                    <div
                      key={idx}
                      className="flex items-center"
                      style={{
                        gap: 'var(--space-4)',
                        padding: 'var(--space-3)',
                        background: 'var(--surface-3)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <span
                        className="text-fluid-sm font-mono font-bold"
                        style={{
                          color: inst.color,
                          minWidth: '48px'
                        }}
                      >
                        {inst.name}
                      </span>
                      <span className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>
                        {inst.desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Visual Explanation Section */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
              >
                Color-Coded Visualization
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                Understand Ladder Logic at a Glance
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                Our viewer uses intuitive color-coding to help you quickly identify different instruction types
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
                  color: 'var(--inst-input)',
                  colorBg: 'rgba(34, 197, 94, 0.1)',
                  colorBorder: 'rgba(34, 197, 94, 0.2)',
                  title: 'Input Instructions',
                  desc: 'XIC, XIO contacts that examine bit states. Green indicates conditions being checked.',
                  examples: 'XIC, XIO, ONS, OSR, OSF'
                },
                {
                  color: 'var(--inst-output)',
                  colorBg: 'rgba(239, 68, 68, 0.1)',
                  colorBorder: 'rgba(239, 68, 68, 0.2)',
                  title: 'Output Instructions',
                  desc: 'OTE, OTL, OTU coils that control outputs. Red indicates actions being performed.',
                  examples: 'OTE, OTL, OTU'
                },
                {
                  color: 'var(--inst-timer)',
                  colorBg: 'rgba(59, 130, 246, 0.1)',
                  colorBorder: 'rgba(59, 130, 246, 0.2)',
                  title: 'Timer Instructions',
                  desc: 'TON, TOF, RTO instructions for time-based control. Blue indicates timing operations.',
                  examples: 'TON, TOF, RTO, TONR'
                },
                {
                  color: 'var(--inst-counter)',
                  colorBg: 'rgba(168, 85, 247, 0.1)',
                  colorBorder: 'rgba(168, 85, 247, 0.2)',
                  title: 'Counter Instructions',
                  desc: 'CTU, CTD, RES instructions for counting events. Purple indicates counting operations.',
                  examples: 'CTU, CTD, CTUD, RES'
                },
                {
                  color: 'var(--inst-math)',
                  colorBg: 'rgba(245, 158, 11, 0.1)',
                  colorBorder: 'rgba(245, 158, 11, 0.2)',
                  title: 'Math Instructions',
                  desc: 'ADD, SUB, MUL, DIV and other calculations. Amber indicates mathematical operations.',
                  examples: 'ADD, SUB, MUL, DIV, CPT'
                },
                {
                  color: 'var(--inst-compare)',
                  colorBg: 'rgba(14, 165, 233, 0.1)',
                  colorBorder: 'rgba(14, 165, 233, 0.2)',
                  title: 'Compare Instructions',
                  desc: 'EQU, NEQ, GRT, LES for value comparisons. Cyan indicates comparison operations.',
                  examples: 'EQU, NEQ, GRT, LES, LIM'
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
                      background: item.colorBg,
                      border: `1px solid ${item.colorBorder}`,
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div
                      style={{
                        width: '24px',
                        height: '24px',
                        background: item.color,
                        borderRadius: '4px'
                      }}
                    />
                  </div>
                  <h3
                    className="text-fluid-lg font-semibold"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-2)' }}
                  >
                    {item.title}
                  </h3>
                  <p className="text-fluid-sm" style={{ color: 'var(--text-tertiary)', lineHeight: '1.6', marginBlockEnd: 'var(--space-3)' }}>
                    {item.desc}
                  </p>
                  <p className="text-fluid-xs font-mono" style={{ color: item.color }}>
                    {item.examples}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 215+ Supported Instructions Section */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-16)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
              >
                Comprehensive Support
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                215+ Ladder Logic Instructions
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                From basic XIC/OTE to advanced motion control - every Allen-Bradley instruction rendered clearly
              </p>
            </div>

            <div
              className="grid container-inline"
              style={{
                gap: 'var(--space-6)',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))'
              }}
            >
              {instructionCategories.map((category, idx) => (
                <div
                  key={idx}
                  className="surface-card"
                  style={{ padding: 'var(--space-6)' }}
                >
                  <h3
                    className="text-fluid-base font-semibold"
                    style={{ color: category.color, marginBlockEnd: 'var(--space-4)' }}
                  >
                    {category.name}
                  </h3>
                  <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
                    {category.instructions.map((inst) => (
                      <span
                        key={inst}
                        className="text-fluid-xs font-mono"
                        style={{
                          padding: 'var(--space-1) var(--space-2)',
                          background: 'var(--surface-3)',
                          borderRadius: 'var(--radius-sm)',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        {inst}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* AI Explanations Feature */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
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
                  style={{ color: 'var(--accent-emerald)', marginBlockEnd: 'var(--space-4)' }}
                >
                  AI-Powered Understanding
                </span>
                <h2
                  className="text-fluid-4xl font-bold"
                  style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-6)' }}
                >
                  Get Plain English Explanations
                </h2>
                <div className="stack" style={{ color: 'var(--text-secondary)', gap: 'var(--space-4)' }}>
                  <p className="text-fluid-base" style={{ lineHeight: '1.7' }}>
                    Don't just view your ladder logic - understand it. Our AI analyzes each rung and explains
                    what it does in plain English. Perfect for:
                  </p>
                  <ul className="stack" style={{ gap: 'var(--space-3)' }}>
                    {[
                      'Understanding unfamiliar code during troubleshooting',
                      'Training new team members on existing programs',
                      'Documenting machine behavior for operators',
                      'Code reviews and knowledge transfer'
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-start" style={{ gap: 'var(--space-3)' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2" className="flex-shrink-0" style={{ marginBlockStart: '2px' }}>
                          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                          <path d="M22 4L12 14.01l-3-3" />
                        </svg>
                        <span className="text-fluid-base">{item}</span>
                      </li>
                    ))}
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
                  style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
                >
                  Three Explanation Modes
                </span>
                <div className="stack" style={{ gap: 'var(--space-4)' }}>
                  {[
                    {
                      title: 'Friendly Mode',
                      desc: 'Simplified explanations for beginners. Uses everyday language without technical jargon.',
                      icon: (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="1.5">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
                          <path d="M9 9h.01M15 9h.01" />
                        </svg>
                      )
                    },
                    {
                      title: 'Technical Mode',
                      desc: 'Detailed explanations for engineers. Includes timing, bit operations, and edge cases.',
                      icon: (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5">
                          <path d="M12 2L2 7l10 5 10-5-10-5z" />
                          <path d="M2 17l10 5 10-5" />
                          <path d="M2 12l10 5 10-5" />
                        </svg>
                      )
                    },
                    {
                      title: 'Operator Mode',
                      desc: 'Focused on machine behavior. Explains what the machine does, not how the code works.',
                      icon: (
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="1.5">
                          <rect x="2" y="6" width="20" height="12" rx="2" />
                          <path d="M6 12h4M14 12h4" />
                        </svg>
                      )
                    }
                  ].map((mode, idx) => (
                    <div
                      key={idx}
                      className="flex items-start"
                      style={{
                        gap: 'var(--space-4)',
                        padding: 'var(--space-4)',
                        background: 'var(--surface-3)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <div className="flex-shrink-0" style={{ marginBlockStart: '2px' }}>
                        {mode.icon}
                      </div>
                      <div>
                        <p className="text-fluid-base font-medium" style={{ color: 'var(--text-primary)' }}>{mode.title}</p>
                        <p className="text-fluid-sm" style={{ color: 'var(--text-tertiary)' }}>{mode.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Supported Formats Section */}
        <section className="py-fluid-20" style={{ background: 'var(--surface-0)', paddingBlock: 'var(--space-24)' }}>
          <div className="container-default">
            <div className="text-center" style={{ marginBlockEnd: 'var(--space-12)' }}>
              <span
                className="text-fluid-sm font-semibold uppercase tracking-wider block"
                style={{ color: 'var(--accent-blue)', marginBlockEnd: 'var(--space-4)' }}
              >
                File Format Support
              </span>
              <h2
                className="text-fluid-4xl font-bold"
                style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
              >
                View Any Allen-Bradley Format
              </h2>
              <p
                className="text-fluid-lg"
                style={{
                  color: 'var(--text-secondary)',
                  maxWidth: '42rem',
                  marginInline: 'auto'
                }}
              >
                Our ladder logic viewer supports all major Allen-Bradley file formats
              </p>
            </div>

            <div
              className="grid-auto-fit container-inline"
              style={{ gap: 'var(--space-6)' }}
            >
              {[
                {
                  ext: '.L5X',
                  title: 'L5X Files',
                  desc: 'Studio 5000 XML export format for ControlLogix and CompactLogix',
                  link: '/l5x-file',
                  color: 'var(--accent-emerald)'
                },
                {
                  ext: '.ACD',
                  title: 'ACD Files',
                  desc: 'Native Studio 5000 project files with full program data',
                  link: '/acd-file',
                  color: 'var(--accent-blue)'
                },
                {
                  ext: '.RSS',
                  title: 'RSS Files',
                  desc: 'RSLogix 500 files for SLC 500 and MicroLogix controllers',
                  link: '/rss-file',
                  color: 'var(--accent-amber)'
                }
              ].map((format, idx) => (
                <Link
                  key={idx}
                  href={format.link}
                  className="surface-card text-center transition-all hover:border-[var(--accent-blue)]"
                  style={{ padding: 'var(--space-6)', textDecoration: 'none' }}
                >
                  <span
                    className="text-fluid-3xl font-bold font-mono block"
                    style={{ color: format.color, marginBlockEnd: 'var(--space-3)' }}
                  >
                    {format.ext}
                  </span>
                  <h3
                    className="text-fluid-lg font-semibold"
                    style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-2)' }}
                  >
                    {format.title}
                  </h3>
                  <p className="text-fluid-sm" style={{ color: 'var(--text-tertiary)' }}>
                    {format.desc}
                  </p>
                </Link>
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
                View Your Ladder Logic Now
              </h2>
              <p className="text-fluid-lg" style={{ color: 'var(--text-secondary)' }}>
                Upload your PLC file and start viewing ladder diagrams instantly
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
                    Parsing ladder logic...
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
                    Extracting rungs and instructions...
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
                    {isDragging ? 'Drop to view ladder logic' : 'Drop your PLC file here'}
                  </p>
                  <p
                    className="text-fluid-sm"
                    style={{ color: 'var(--text-muted)', marginBlockEnd: 'var(--space-4)' }}
                  >
                    or <span style={{ color: 'var(--accent-blue)' }} className="cursor-pointer font-medium">browse</span> to select
                  </p>
                  <div className="flex items-center justify-center" style={{ gap: 'var(--space-3)' }}>
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

            {/* Security note */}
            <div className="text-center" style={{ marginBlockStart: 'var(--space-6)' }}>
              <div className="flex items-center justify-center" style={{ gap: 'var(--space-2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
                <span className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>
                  Your files are processed securely and never stored on our servers
                </span>
              </div>
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
            <div className="stack-to-row justify-between" style={{ gap: 'var(--space-6)', marginBlockEnd: 'var(--space-6)' }}>
              <Link href="/" style={{ color: 'white', textDecoration: 'none' }}>
                <Logo size="sm" />
              </Link>

              <div className="flex items-center" style={{ gap: 'var(--space-6)' }}>
                <Link href="/l5x-file" className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>L5X Viewer</Link>
                <Link href="/acd-file" className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>ACD Viewer</Link>
                <Link href="/rss-file" className="text-fluid-sm" style={{ color: 'var(--text-muted)' }}>RSS Viewer</Link>
              </div>
            </div>

            {/* Disclaimer */}
            <div style={{ borderBlockStart: '1px solid var(--border-subtle)', paddingBlockStart: 'var(--space-4)' }}>
              <p className="text-fluid-xs" style={{ color: 'var(--text-muted)', lineHeight: 1.6, maxWidth: '800px' }}>
                Read-only viewer for educational purposes. Not affiliated with, endorsed by, or sponsored by Rockwell Automation.
                Allen-Bradley, ControlLogix, CompactLogix, RSLogix, and Studio 5000 are trademarks of Rockwell Automation, Inc.
              </p>
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

      {/* JSON-LD Schema for WebApplication */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            "name": "Online Ladder Logic Viewer",
            "description": "Online ladder logic viewer for Allen-Bradley PLC programs. View L5X, ACD, and RSS files with color-coded visualization and AI-powered explanations.",
            "applicationCategory": "DeveloperApplication",
            "operatingSystem": "Any",
            "offers": {
              "@type": "Offer",
              "priceSpecification": {
                "@type": "PriceSpecification",
                "priceCurrency": "USD",
                "description": "Affordable subscription plans"
              },
              "availability": "https://schema.org/OnlineOnly"
            },
            "featureList": [
              "View ladder logic diagrams online",
              "Support for 215+ PLC instructions",
              "Color-coded visualization",
              "AI-powered explanations",
              "L5X, ACD, RSS file support",
              "No software installation required"
            ]
          })
        }}
      />
    </div>
  )
}
