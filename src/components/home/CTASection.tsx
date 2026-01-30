'use client'

import { useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

const ALLOWED_EMAIL = 'zack.4290@gmail.com'

export function CTASection() {
  const { data: session } = useSession()
  const router = useRouter()
  const isAllowedUser = session?.user?.email === ALLOWED_EMAIL

  // Upload state
  const [isDragging, setIsDragging] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadError, setUploadError] = useState<string | null>(null)

  // Waitlist state
  const [email, setEmail] = useState('')
  const [waitlistStatus, setWaitlistStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [waitlistMessage, setWaitlistMessage] = useState('')

  // File upload handlers
  const handleFile = async (file: File) => {
    const fileName = file.name.toLowerCase()
    if (!fileName.endsWith('.l5x') && !fileName.endsWith('.acd') && !fileName.endsWith('.rss')) {
      setUploadError('Please upload an .L5X, .ACD, or .RSS file')
      return
    }

    setUploadError(null)
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
      setUploadError(err instanceof Error ? err.message : 'Upload failed')
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

  // Waitlist handler
  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setWaitlistStatus('loading')

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'homepage' })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join waitlist')
      }

      setWaitlistStatus('success')
      setWaitlistMessage(data.message)
      setEmail('')
    } catch (err) {
      setWaitlistStatus('error')
      setWaitlistMessage(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  // Render upload section for allowed user
  if (isAllowedUser) {
    return (
      <section id="waitlist" className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
        <div className="container-narrow">
          <div className="text-center" style={{ marginBlockEnd: 'var(--space-12)' }}>
            <div
              className="inline-flex items-center"
              style={{
                gap: 'var(--space-2)',
                paddingInline: 'var(--space-4)',
                paddingBlock: 'var(--space-2)',
                marginBlockEnd: 'var(--space-6)',
                background: 'var(--accent-emerald-muted)',
                border: '1px solid var(--accent-emerald)',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <path d="M22 4L12 14.01l-3-3" />
              </svg>
              <span className="text-fluid-sm font-medium" style={{ color: 'var(--accent-emerald)' }}>
                Admin Access
              </span>
            </div>
            <h2
              className="text-fluid-4xl font-bold"
              style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
            >
              Upload Your PLC File
            </h2>
            <p className="text-fluid-lg" style={{ color: 'var(--text-secondary)' }}>
              Drop your L5X, ACD, or RSS file to start viewing.
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
          {uploadError && (
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
              <span className="text-fluid-sm" style={{ color: 'var(--accent-red)' }}>{uploadError}</span>
            </div>
          )}
        </div>
      </section>
    )
  }

  // Render waitlist section for everyone else
  return (
    <section id="waitlist" className="py-fluid-20" style={{ background: 'var(--surface-1)', paddingBlock: 'var(--space-24)' }}>
      <div className="container-narrow">
        <div className="text-center" style={{ marginBlockEnd: 'var(--space-12)' }}>
          <div
            className="inline-flex items-center"
            style={{
              gap: 'var(--space-2)',
              paddingInline: 'var(--space-4)',
              paddingBlock: 'var(--space-2)',
              marginBlockEnd: 'var(--space-6)',
              background: 'var(--accent-amber-muted)',
              border: '1px solid var(--accent-amber)',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 6v6l4 2" />
            </svg>
            <span className="text-fluid-sm font-medium" style={{ color: 'var(--accent-amber)' }}>
              Coming Soon
            </span>
          </div>
          <h2
            className="text-fluid-4xl font-bold"
            style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-4)' }}
          >
            Be the first to know
          </h2>
          <p className="text-fluid-lg" style={{ color: 'var(--text-secondary)' }}>
            PLC Viewer is launching soon. Sign up to get notified when we go live.
          </p>
        </div>

        {/* Waitlist signup card */}
        <div
          style={{
            padding: 'var(--space-8)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            maxWidth: '500px',
            marginInline: 'auto'
          }}
        >
          {waitlistStatus === 'success' ? (
            <div className="text-center" style={{ padding: 'var(--space-4)' }}>
              <div
                className="flex items-center justify-center"
                style={{
                  width: '56px',
                  height: '56px',
                  marginInline: 'auto',
                  marginBlockEnd: 'var(--space-4)',
                  background: 'var(--accent-emerald-muted)',
                  borderRadius: '50%'
                }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--accent-emerald)" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <path d="M22 4L12 14.01l-3-3" />
                </svg>
              </div>
              <p className="text-fluid-lg font-semibold" style={{ color: 'var(--text-primary)', marginBlockEnd: 'var(--space-2)' }}>
                You're on the list!
              </p>
              <p className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>
                {waitlistMessage}
              </p>
            </div>
          ) : (
            <form onSubmit={handleWaitlistSubmit} className="stack" style={{ gap: 'var(--space-4)' }}>
              <div>
                <label
                  htmlFor="email"
                  className="text-fluid-sm font-medium block"
                  style={{ color: 'var(--text-secondary)', marginBlockEnd: 'var(--space-2)' }}
                >
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@company.com"
                  className="w-full text-fluid-base"
                  style={{
                    padding: 'var(--space-3) var(--space-4)',
                    background: 'var(--surface-0)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius-sm)',
                    color: 'var(--text-primary)',
                    minHeight: 'var(--touch-target-min)'
                  }}
                  disabled={waitlistStatus === 'loading'}
                />
              </div>
              <button
                type="submit"
                disabled={waitlistStatus === 'loading'}
                className="btn btn-primary text-fluid-base w-full inline-flex items-center justify-center"
                style={{
                  paddingBlock: 'var(--space-3)',
                  gap: 'var(--space-2)',
                  minHeight: 'var(--touch-target-min)',
                  borderRadius: 'var(--radius-sm)',
                  opacity: waitlistStatus === 'loading' ? 0.7 : 1
                }}
              >
                {waitlistStatus === 'loading' ? (
                  <>
                    <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    Joining...
                  </>
                ) : (
                  <>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                    </svg>
                    Notify Me When It Launches
                  </>
                )}
              </button>
              {waitlistStatus === 'error' && (
                <p className="text-fluid-sm text-center" style={{ color: 'var(--accent-red)' }}>
                  {waitlistMessage}
                </p>
              )}
            </form>
          )}
          {waitlistStatus !== 'success' && (
            <p
              className="text-fluid-xs text-center"
              style={{ color: 'var(--text-muted)', marginBlockStart: 'var(--space-4)' }}
            >
              No spam. We'll only email you when PLC Viewer is ready.
            </p>
          )}
        </div>

        {/* Supported formats reminder */}
        <div className="text-center" style={{ marginBlockStart: 'var(--space-8)' }}>
          <p className="text-fluid-sm" style={{ color: 'var(--text-muted)', marginBlockEnd: 'var(--space-3)' }}>
            Will support all major Allen-Bradley formats
          </p>
          <div className="flex items-center justify-center" style={{ gap: 'var(--space-3)' }}>
            <span className="tech-badge">.L5X</span>
            <span className="tech-badge">.ACD</span>
            <span className="tech-badge">.RSS</span>
          </div>
        </div>
      </div>
    </section>
  )
}
