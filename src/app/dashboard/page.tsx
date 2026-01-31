'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Logo } from '@/components/ui/Logo'

interface Project {
  id: string
  name: string
  fileName: string
  fileSize: number | null
  processorType: string | null
  createdAt: string
  _count: {
    tags: number
    programs: number
  }
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getFileTypeColor(fileName: string): string {
  if (fileName.toLowerCase().endsWith('.l5x')) return '#3b82f6' // blue
  if (fileName.toLowerCase().endsWith('.acd')) return '#8b5cf6' // purple
  if (fileName.toLowerCase().endsWith('.rss')) return '#f59e0b' // amber
  return '#6b7280' // gray
}

function getFileTypeLabel(fileName: string): string {
  if (fileName.toLowerCase().endsWith('.l5x')) return 'L5X'
  if (fileName.toLowerCase().endsWith('.acd')) return 'ACD'
  if (fileName.toLowerCase().endsWith('.rss')) return 'RSS'
  return 'Unknown'
}

export default function Dashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/dashboard')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetchProjects()
    }
  }, [status])

  async function fetchProjects() {
    try {
      const res = await fetch('/api/projects')
      if (!res.ok) throw new Error('Failed to fetch projects')
      const data = await res.json()
      setProjects(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(projectId: string) {
    setDeleting(projectId)
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete project')
      setProjects(projects.filter(p => p.id !== projectId))
      setDeleteConfirm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete project')
    } finally {
      setDeleting(null)
    }
  }

  async function handleDownload(projectId: string, fileName: string) {
    setDownloading(projectId)
    try {
      const res = await fetch(`/api/projects/${projectId}/download`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to get download URL')
      }
      const { url } = await res.json()

      // Create temporary link and click it
      const a = document.createElement('a')
      a.href = url
      a.download = fileName
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to download file')
    } finally {
      setDownloading(null)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--surface-0)' }}>
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4" />
          <p style={{ color: 'var(--text-secondary)' }}>Loading...</p>
        </div>
      </div>
    )
  }

  if (status === 'unauthenticated') {
    return null // Will redirect
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-0)' }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-sm"
        style={{
          borderBlockEnd: '1px solid var(--border-subtle)',
          background: 'rgba(11, 13, 16, 0.9)'
        }}
      >
        <div className="container-default flex items-center justify-between" style={{ height: '64px' }}>
          <a href="/" style={{ color: 'white', textDecoration: 'none' }}>
            <Logo size="sm" />
          </a>
          <div className="flex items-center gap-4">
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {session?.user?.email}
            </span>
            <button
              onClick={() => router.push('/api/auth/signout')}
              className="text-sm px-3 py-1.5 rounded"
              style={{
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                background: 'transparent'
              }}
            >
              Sign Out
            </button>
          </div>
        </div>
      </header>

      <main className="container-default py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold" style={{ color: 'white' }}>My Projects</h1>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
              {projects.length} project{projects.length !== 1 ? 's' : ''} uploaded
            </p>
          </div>
          <a
            href="/"
            className="btn btn-primary"
            style={{
              paddingInline: 'var(--space-4)',
              paddingBlock: 'var(--space-2)',
              borderRadius: 'var(--radius-md)',
              textDecoration: 'none'
            }}
          >
            Upload New Project
          </a>
        </div>

        {error && (
          <div
            className="mb-6 p-4 rounded-lg"
            style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
          >
            <p style={{ color: '#ef4444' }}>{error}</p>
            <button
              onClick={() => setError(null)}
              className="text-sm mt-2"
              style={{ color: 'var(--text-secondary)' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {projects.length === 0 ? (
          <div
            className="text-center py-16 rounded-xl"
            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="text-4xl mb-4">📁</div>
            <h2 className="text-lg font-medium mb-2" style={{ color: 'white' }}>No projects yet</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Upload your first .L5X, .ACD, or .RSS file to get started
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {projects.map(project => (
              <div
                key={project.id}
                className="rounded-xl p-5 transition-all hover:scale-[1.01]"
                style={{
                  background: 'var(--surface-1)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className="text-xs font-medium px-2 py-0.5 rounded"
                        style={{
                          background: getFileTypeColor(project.fileName),
                          color: 'white'
                        }}
                      >
                        {getFileTypeLabel(project.fileName)}
                      </span>
                      <h3
                        className="font-semibold truncate"
                        style={{ color: 'white', fontSize: '1.1rem' }}
                      >
                        {project.name}
                      </h3>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                      <span title="Original filename">{project.fileName}</span>
                      <span>{formatFileSize(project.fileSize)}</span>
                      {project.processorType && <span>{project.processorType}</span>}
                      <span>{project._count.programs} programs</span>
                      <span>{project._count.tags} tags</span>
                    </div>
                    <p className="text-xs mt-2" style={{ color: 'var(--text-tertiary)' }}>
                      Uploaded {formatDate(project.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Open button */}
                    <a
                      href={`/project/${project.id}`}
                      className="px-4 py-2 rounded-lg font-medium text-sm transition-colors"
                      style={{
                        background: 'var(--accent)',
                        color: 'white',
                        textDecoration: 'none'
                      }}
                    >
                      Open
                    </a>

                    {/* Download button */}
                    <button
                      onClick={() => handleDownload(project.id, project.fileName)}
                      disabled={downloading === project.id}
                      className="px-3 py-2 rounded-lg text-sm transition-colors"
                      style={{
                        background: 'var(--surface-2)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                        opacity: downloading === project.id ? 0.5 : 1
                      }}
                      title="Download original file"
                    >
                      {downloading === project.id ? '...' : '↓'}
                    </button>

                    {/* Delete button */}
                    {deleteConfirm === project.id ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDelete(project.id)}
                          disabled={deleting === project.id}
                          className="px-3 py-2 rounded-lg text-sm font-medium"
                          style={{
                            background: '#ef4444',
                            color: 'white',
                            opacity: deleting === project.id ? 0.5 : 1
                          }}
                        >
                          {deleting === project.id ? '...' : 'Confirm'}
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="px-3 py-2 rounded-lg text-sm"
                          style={{
                            background: 'var(--surface-2)',
                            color: 'var(--text-secondary)'
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(project.id)}
                        className="px-3 py-2 rounded-lg text-sm transition-colors hover:bg-red-500/20"
                        style={{
                          background: 'var(--surface-2)',
                          color: 'var(--text-secondary)',
                          border: '1px solid var(--border-subtle)'
                        }}
                        title="Delete project"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
