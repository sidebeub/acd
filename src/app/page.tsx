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
    if (!fileName.endsWith('.l5x') && !fileName.endsWith('.acd')) {
      setError('Please upload an .L5X or .ACD file')
      return
    }

    setError(null)
    setIsUploading(true)
    setUploadProgress(0)

    // Simulate progress for better UX
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
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'var(--surface-0)' }}>
      {/* Subtle grid background */}
      <div
        className="absolute inset-0 grid-pattern opacity-30"
        style={{ maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 70%)' }}
      />

      {/* Header */}
      <header className="relative z-10 border-b" style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-1)' }}>
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Logo mark */}
            <div
              className="w-8 h-8 rounded flex items-center justify-center"
              style={{ background: 'var(--accent-blue-muted)', border: '1px solid var(--accent-blue)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="2.5">
                <path d="M4 6h16M4 12h16M4 18h16" />
                <circle cx="8" cy="6" r="1" fill="currentColor" />
                <circle cx="16" cy="12" r="1" fill="currentColor" />
                <circle cx="12" cy="18" r="1" fill="currentColor" />
              </svg>
            </div>
            <span className="font-semibold text-[15px]" style={{ color: 'var(--text-primary)' }}>
              PLC Viewer
            </span>
          </div>

          <div className="flex items-center gap-6">
            <span className="tech-badge">
              <span className="status-dot status-dot-active" />
              Rockwell Compatible
            </span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-16">
        {/* Hero section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full mb-6"
               style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: 'var(--accent-emerald)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
              Studio 5000 Logix Designer Files
            </span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4" style={{ color: 'var(--text-primary)' }}>
            Analyze PLC Programs
            <br />
            <span style={{ color: 'var(--text-tertiary)' }}>with precision</span>
          </h1>

          <p className="text-lg max-w-xl mx-auto mb-12" style={{ color: 'var(--text-secondary)' }}>
            Upload L5X or ACD files to visualize ladder logic, browse tags,
            and get AI-powered explanations of your control code.
          </p>
        </div>

        {/* Upload card */}
        <div className="max-w-2xl mx-auto mb-20 animate-slide-up">
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`relative p-8 rounded-lg transition-all duration-200 ${
              isUploading ? 'pointer-events-none' : ''
            }`}
            style={{
              background: isDragging ? 'var(--accent-blue-muted)' : 'var(--surface-2)',
              border: `2px dashed ${isDragging ? 'var(--accent-blue)' : 'var(--border-default)'}`,
            }}
          >
            <input
              type="file"
              accept=".l5x,.acd"
              onChange={handleInputChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />

            {isUploading ? (
              <div className="text-center py-4">
                <div className="mb-4">
                  <svg className="w-10 h-10 mx-auto animate-pulse-subtle" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5">
                    <path d="M12 3v12M12 3l4 4M12 3L8 7" />
                    <path d="M3 15v4a2 2 0 002 2h14a2 2 0 002-2v-4" />
                  </svg>
                </div>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-primary)' }}>
                  Processing file...
                </p>
                <div className="w-64 h-1 mx-auto rounded-full overflow-hidden" style={{ background: 'var(--surface-4)' }}>
                  <div
                    className="h-full rounded-full transition-all duration-200"
                    style={{
                      background: 'var(--accent-blue)',
                      width: `${uploadProgress}%`
                    }}
                  />
                </div>
                <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                  Parsing L5X structure...
                </p>
              </div>
            ) : (
              <div className="text-center py-4">
                <div className="mb-4">
                  <svg
                    className="w-10 h-10 mx-auto transition-colors"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isDragging ? 'var(--accent-blue)' : 'var(--text-muted)'}
                    strokeWidth="1.5"
                  >
                    <rect x="3" y="3" width="18" height="18" rx="2" />
                    <path d="M9 13l3-3 3 3" />
                    <path d="M12 10v7" />
                  </svg>
                </div>
                <p className="text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  {isDragging ? 'Drop to upload' : 'Drop your file here'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  or <span style={{ color: 'var(--accent-blue)' }} className="cursor-pointer">browse</span> to select
                </p>
              </div>
            )}
          </div>

          {/* Supported formats */}
          <div className="flex items-center justify-center gap-4 mt-4">
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6M12 18v-6M9 15h6" />
              </svg>
              .L5X
            </div>
            <span style={{ color: 'var(--text-muted)' }}>|</span>
            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                <path d="M14 2v6h6" />
              </svg>
              .ACD
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div
              className="mt-4 px-4 py-3 rounded-lg flex items-center gap-3"
              style={{ background: 'var(--accent-red-muted)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-red)" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M15 9l-6 6M9 9l6 6" />
              </svg>
              <span className="text-sm" style={{ color: 'var(--accent-red)' }}>{error}</span>
            </div>
          )}
        </div>

        {/* Feature bento grid */}
        <div className="grid md:grid-cols-3 gap-4 max-w-5xl mx-auto">
          {/* Main feature card */}
          <div
            className="md:col-span-2 p-6 rounded-lg"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.2)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--inst-input)" strokeWidth="1.5">
                  <rect x="3" y="6" width="4" height="12" rx="1" />
                  <rect x="10" y="6" width="4" height="12" rx="1" />
                  <rect x="17" y="6" width="4" height="12" rx="1" />
                  <path d="M5 9h2M5 12h2M5 15h2M12 9h2M12 12h2M19 9h2M19 12h2M19 15h2" strokeWidth="1" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Ladder Logic Visualization
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  View rungs with color-coded instructions. Input contacts, output coils, timers,
                  counters, and math operations are visually distinct for quick analysis.
                </p>
              </div>
            </div>

            {/* Mini preview */}
            <div
              className="mt-6 p-4 rounded"
              style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-2">
                <div className="power-rail h-8" />
                <div className="wire flex-1 max-w-8" />
                <div
                  className="px-2 py-1 rounded text-xs font-mono"
                  style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid rgba(34, 197, 94, 0.3)', color: 'var(--inst-input)' }}
                >
                  XIC
                </div>
                <div className="wire flex-1" />
                <div
                  className="px-2 py-1 rounded text-xs font-mono"
                  style={{ background: 'rgba(6, 182, 212, 0.15)', border: '1px solid rgba(6, 182, 212, 0.3)', color: 'var(--inst-timer)' }}
                >
                  TON
                </div>
                <div className="wire flex-1" />
                <div
                  className="px-2 py-1 rounded text-xs font-mono"
                  style={{ background: 'rgba(234, 179, 8, 0.15)', border: '1px solid rgba(234, 179, 8, 0.3)', color: 'var(--inst-output)' }}
                >
                  OTE
                </div>
                <div className="wire flex-1 max-w-8" />
                <div className="power-rail h-8" />
              </div>
            </div>
          </div>

          {/* AI card */}
          <div
            className="p-6 rounded-lg"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
          >
            <div
              className="w-10 h-10 rounded flex items-center justify-center mb-4"
              style={{ background: 'var(--accent-blue-muted)', border: '1px solid rgba(59, 130, 246, 0.3)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent-blue)" strokeWidth="1.5">
                <path d="M12 2a4 4 0 014 4v1a3 3 0 013 3v1h1a3 3 0 013 3v2a4 4 0 01-4 4h-1" />
                <path d="M12 2a4 4 0 00-4 4v1a3 3 0 00-3 3v1H4a3 3 0 00-3 3v2a4 4 0 004 4h1" />
                <circle cx="12" cy="14" r="4" />
                <path d="M12 12v4M10 14h4" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              AI Explanations
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Get plain-English explanations of complex rungs. Powered by Claude.
            </p>
          </div>

          {/* Tags card */}
          <div
            className="p-6 rounded-lg"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
          >
            <div
              className="w-10 h-10 rounded flex items-center justify-center mb-4"
              style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.2)' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--inst-counter)" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
            </div>
            <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
              Tag Browser
            </h3>
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
              Search and filter all controller and program-scoped tags with type info.
            </p>
          </div>

          {/* Cross-ref card */}
          <div
            className="md:col-span-2 p-6 rounded-lg"
            style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-start gap-4">
              <div
                className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(249, 115, 22, 0.1)', border: '1px solid rgba(249, 115, 22, 0.2)' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--inst-jump)" strokeWidth="1.5">
                  <circle cx="5" cy="12" r="3" />
                  <circle cx="19" cy="6" r="3" />
                  <circle cx="19" cy="18" r="3" />
                  <path d="M8 12h4l3-6M12 12l3 6" />
                </svg>
              </div>
              <div>
                <h3 className="font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Program Structure
                </h3>
                <p className="text-sm leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  Navigate tasks, programs, and routines in a hierarchical tree.
                  See the complete organization of your PLC project at a glance.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="text-center mt-20">
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Compatible with Allen-Bradley ControlLogix, CompactLogix, and GuardLogix controllers
          </p>
        </div>
      </main>
    </div>
  )
}
