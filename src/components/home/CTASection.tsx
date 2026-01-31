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
      <section id="waitlist" style={{
        background: 'var(--surface-0)',
        paddingBlock: 'clamp(80px, 15vh, 150px)'
      }}>
        <div style={{ maxWidth: '800px', marginInline: 'auto', paddingInline: 'var(--space-6)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBlockEnd: 'var(--space-10)' }}>
            <h2 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem, 5vw, 3rem)',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBlockEnd: 'var(--space-4)',
              letterSpacing: '-0.02em'
            }}>
              Ready to view your code?
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.125rem' }}>
              Drop your file and start exploring in seconds.
            </p>
          </div>

          {/* Upload area */}
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            style={{
              position: 'relative',
              padding: 'clamp(48px, 8vw, 80px) clamp(24px, 4vw, 48px)',
              background: isDragging ? 'var(--accent-muted)' : 'var(--surface-1)',
              border: `2px dashed ${isDragging ? 'var(--accent)' : 'var(--border-default)'}`,
              borderRadius: '8px',
              textAlign: 'center',
              transition: 'all 0.2s ease',
              cursor: 'pointer'
            }}
          >
            <input
              type="file"
              accept=".l5x,.acd,.rss"
              onChange={handleInputChange}
              disabled={isUploading}
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />

            {isUploading ? (
              <div>
                <div style={{
                  width: '64px',
                  height: '64px',
                  margin: '0 auto var(--space-6)',
                  border: '3px solid var(--border-subtle)',
                  borderTopColor: 'var(--accent)',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite'
                }} />
                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBlockEnd: 'var(--space-4)'
                }}>
                  Parsing your program...
                </p>
                <div style={{
                  width: '200px',
                  height: '4px',
                  margin: '0 auto',
                  background: 'var(--surface-3)',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${uploadProgress}%`,
                    background: 'var(--accent)',
                    transition: 'width 0.2s ease'
                  }} />
                </div>
              </div>
            ) : (
              <div>
                {/* File icon */}
                <div style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto var(--space-6)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--surface-2)',
                  borderRadius: '16px',
                  transition: 'transform 0.2s ease'
                }}>
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={isDragging ? 'var(--accent)' : 'var(--text-muted)'}
                    strokeWidth="1.5"
                    style={{ transition: 'stroke 0.2s ease' }}
                  >
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                    <path d="M14 2v6h6" />
                    <path d="M12 18v-6M9 15l3-3 3 3" />
                  </svg>
                </div>

                <p style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(1.25rem, 3vw, 1.5rem)',
                  fontWeight: 600,
                  color: 'var(--text-primary)',
                  marginBlockEnd: 'var(--space-2)'
                }}>
                  {isDragging ? 'Drop it!' : 'Drag & drop your PLC file'}
                </p>
                <p style={{ color: 'var(--text-tertiary)', marginBlockEnd: 'var(--space-6)' }}>
                  or click to browse
                </p>

                {/* File types */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-3)' }}>
                  {['.L5X', '.ACD', '.RSS'].map(ext => (
                    <span
                      key={ext}
                      style={{
                        padding: '6px 16px',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '20px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {ext}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Error */}
          {uploadError && (
            <div style={{
              marginTop: 'var(--space-4)',
              padding: 'var(--space-4)',
              background: 'var(--accent-red-muted)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: '8px',
              textAlign: 'center',
              color: 'var(--accent-red)'
            }}>
              {uploadError}
            </div>
          )}
        </div>
      </section>
    )
  }

  // Render waitlist section for everyone else
  return (
    <section id="waitlist" style={{
      background: 'linear-gradient(to bottom, var(--surface-0), var(--surface-1))',
      paddingBlock: 'clamp(100px, 20vh, 180px)'
    }}>
      <div style={{ maxWidth: '600px', marginInline: 'auto', paddingInline: 'var(--space-6)', textAlign: 'center' }}>
        {/* Big headline */}
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(2.5rem, 6vw, 4rem)',
          fontWeight: 600,
          color: 'var(--text-primary)',
          marginBlockEnd: 'var(--space-4)',
          letterSpacing: '-0.02em',
          lineHeight: 1.1
        }}>
          Get early access
        </h2>
        <p style={{
          fontSize: 'clamp(1rem, 2vw, 1.25rem)',
          color: 'var(--text-secondary)',
          marginBlockEnd: 'var(--space-8)',
          lineHeight: 1.6
        }}>
          Be the first to know when PLC Viewer launches.
          No spam, just one email when we're ready.
        </p>

        {waitlistStatus === 'success' ? (
          <div style={{
            padding: 'var(--space-8)',
            background: 'var(--surface-1)',
            border: '1px solid var(--accent)',
            borderRadius: '12px'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              margin: '0 auto var(--space-4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--accent-muted)',
              borderRadius: '50%'
            }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <p style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              marginBlockEnd: 'var(--space-2)'
            }}>
              You're in!
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>
              {waitlistMessage}
            </p>
          </div>
        ) : (
          <form onSubmit={handleWaitlistSubmit} style={{
            display: 'flex',
            gap: 'var(--space-3)',
            maxWidth: '480px',
            marginInline: 'auto'
          }}>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
              disabled={waitlistStatus === 'loading'}
              style={{
                flex: 1,
                padding: 'var(--space-4)',
                background: 'var(--surface-1)',
                border: '1px solid var(--border-default)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                fontSize: '1rem'
              }}
            />
            <button
              type="submit"
              disabled={waitlistStatus === 'loading'}
              style={{
                padding: 'var(--space-4) var(--space-6)',
                background: 'var(--accent)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '1rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                opacity: waitlistStatus === 'loading' ? 0.7 : 1,
                transition: 'opacity 0.2s ease'
              }}
            >
              {waitlistStatus === 'loading' ? 'Joining...' : 'Notify Me'}
            </button>
          </form>
        )}

        {waitlistStatus === 'error' && (
          <p style={{ color: 'var(--accent-red)', marginTop: 'var(--space-4)' }}>
            {waitlistMessage}
          </p>
        )}

        {/* Trust signal */}
        {waitlistStatus !== 'success' && (
          <p style={{
            color: 'var(--text-muted)',
            fontSize: '0.875rem',
            marginTop: 'var(--space-6)'
          }}>
            Join 200+ engineers already on the waitlist
          </p>
        )}
      </div>
    </section>
  )
}
