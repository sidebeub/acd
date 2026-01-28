'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface SearchResult {
  type: 'tag' | 'routine' | 'rung' | 'aoi' | 'udt' | 'module'
  name: string
  description?: string
  location?: string
  match: string
  context?: string
  rungId?: string
  rungNumber?: number
}

interface GlobalSearchProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
  onNavigate?: (result: SearchResult) => void
}

const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  tag: { bg: 'var(--accent-emerald-muted)', text: 'var(--accent-emerald)' },
  routine: { bg: 'var(--accent-blue-muted)', text: 'var(--accent-blue)' },
  rung: { bg: 'var(--surface-3)', text: 'var(--text-secondary)' },
  aoi: { bg: 'var(--accent-blue-muted)', text: 'var(--accent-blue)' },
  udt: { bg: 'var(--accent-amber-muted)', text: 'var(--accent-amber)' },
  module: { bg: 'var(--accent-rose-muted)', text: 'var(--accent-rose)' }
}

const TYPE_LABELS: Record<string, string> = {
  tag: 'Tag',
  routine: 'Routine',
  rung: 'Rung',
  aoi: 'AOI',
  udt: 'UDT',
  module: 'Module'
}

export function GlobalSearch({ projectId, isOpen, onClose, onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100)
      setQuery('')
      setResults([])
      setSelectedIndex(0)
    }
  }, [isOpen])

  // Keyboard shortcut to open (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (!isOpen) {
          // Need to trigger open from parent
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Search with debounce
  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([])
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/projects/${projectId}/search?q=${encodeURIComponent(searchQuery)}&limit=50`)
      const data = await res.json()
      setResults(data.results || [])
      setSelectedIndex(0)
    } catch (e) {
      console.error('Search error:', e)
      setResults([])
    }
    setLoading(false)
  }, [projectId])

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }
    debounceRef.current = setTimeout(() => {
      search(query)
    }, 200)
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, search])

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(i => Math.min(i + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(i => Math.max(i - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      e.preventDefault()
      onNavigate?.(results[selectedIndex])
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center"
      style={{
        paddingTop: 'max(env(safe-area-inset-top, 0px), 5vh)',
        paddingLeft: 'env(safe-area-inset-left, 0)',
        paddingRight: 'env(safe-area-inset-right, 0)',
        paddingBottom: 'env(safe-area-inset-bottom, 0)'
      }}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0"
        style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
        onClick={onClose}
      />

      {/* Search modal - Full width on mobile, constrained on desktop */}
      <div
        className="relative w-full overflow-hidden container-inline"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-md)',
          boxShadow: 'var(--shadow-xl)',
          margin: '0 var(--space-4)',
          maxWidth: 'min(640px, calc(100vw - var(--space-8)))',
          maxHeight: 'calc(100dvh - max(env(safe-area-inset-top, 0px), 5vh) - env(safe-area-inset-bottom, 0px) - var(--space-8))'
        }}
      >
        <style jsx>{`
          @media (max-width: 640px) {
            div {
              margin: 0 !important;
              border-radius: var(--radius-none) !important;
              max-width: 100vw !important;
              max-height: 100dvh !important;
            }
          }
        `}</style>
        {/* Search input - Touch optimized */}
        <div
          className="flex items-center border-b"
          style={{
            borderColor: 'var(--border-subtle)',
            padding: 'var(--space-3) var(--space-4)',
            minHeight: 'var(--touch-target-min)',
            gap: 'var(--space-3)'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tags, routines, rungs..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none"
            style={{
              color: 'var(--text-primary)',
              fontSize: 'var(--text-sm)',
              minHeight: 'var(--touch-target-min)'
            }}
          />
          {loading && (
            <div
              className="animate-spin"
              style={{
                width: '16px',
                height: '16px',
                border: '2px solid var(--accent-blue)',
                borderTopColor: 'transparent',
                borderRadius: '50%',
                flexShrink: 0
              }}
            />
          )}
          <button
            onClick={onClose}
            className="flex items-center justify-center sm:hidden"
            style={{
              minWidth: 'var(--touch-target-min)',
              minHeight: 'var(--touch-target-min)',
              color: 'var(--text-muted)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
          <kbd
            className="hidden sm:inline"
            style={{
              background: 'var(--surface-3)',
              color: 'var(--text-muted)',
              padding: 'var(--space-1) var(--space-2)',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-xs)',
              flexShrink: 0
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results - Scrollable with proper mobile handling */}
        <div
          className="overflow-y-auto overscroll-contain"
          style={{
            maxHeight: 'min(60vh, calc(100dvh - 180px))',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {results.length > 0 ? (
            <div style={{ padding: 'var(--space-2) 0' }}>
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.name}-${index}`}
                  onClick={() => {
                    onNavigate?.(result)
                    onClose()
                  }}
                  className="w-full flex items-center text-left transition-colors"
                  style={{
                    background: index === selectedIndex ? 'var(--surface-3)' : 'transparent',
                    padding: 'var(--space-3) var(--space-4)',
                    gap: 'var(--space-3)',
                    minHeight: 'var(--touch-target-min)'
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {/* Type badge */}
                  <span
                    className="flex-shrink-0 font-medium uppercase"
                    style={{
                      background: TYPE_COLORS[result.type]?.bg || 'var(--surface-3)',
                      color: TYPE_COLORS[result.type]?.text || 'var(--text-secondary)',
                      padding: 'var(--space-1) var(--space-2)',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 'var(--text-xs)'
                    }}
                  >
                    {TYPE_LABELS[result.type] || result.type}
                  </span>

                  {/* Name and info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
                      <span className="font-mono truncate" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>
                        {result.name}
                      </span>
                      {result.location && (
                        <span className="truncate hidden sm:inline" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                          in {result.location}
                        </span>
                      )}
                    </div>
                    {(result.description || result.context) && (
                      <div className="truncate" style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
                        {result.description || result.context}
                      </div>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  {index === selectedIndex && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ) : query.length >= 2 && !loading ? (
            <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) var(--space-4)' }}>
              <p>No results found for &quot;{query}&quot;</p>
            </div>
          ) : query.length < 2 ? (
            <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-8) var(--space-4)' }}>
              <p style={{ fontSize: 'var(--text-sm)' }}>Type at least 2 characters to search</p>
              <div className="flex flex-wrap justify-center" style={{ marginTop: 'var(--space-4)', gap: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                {['Tags', 'Routines', 'Rungs', 'AOIs', 'UDTs', 'Modules'].map(type => (
                  <span
                    key={type}
                    style={{
                      background: 'var(--surface-3)',
                      padding: 'var(--space-1) var(--space-2)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer - Hidden on mobile for more space */}
        <div
          className="hidden sm:flex items-center justify-between border-t"
          style={{
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-muted)',
            padding: 'var(--space-2) var(--space-4)',
            fontSize: 'var(--text-xs)'
          }}
        >
          <div className="flex items-center" style={{ gap: 'var(--space-4)' }}>
            <span className="flex items-center" style={{ gap: 'var(--space-1)' }}>
              <kbd style={{ background: 'var(--surface-3)', padding: 'var(--space-1)', borderRadius: 'var(--radius-sm)' }}>Up/Down</kbd>
              to navigate
            </span>
            <span className="flex items-center" style={{ gap: 'var(--space-1)' }}>
              <kbd style={{ background: 'var(--surface-3)', padding: 'var(--space-1)', borderRadius: 'var(--radius-sm)' }}>Enter</kbd>
              to select
            </span>
          </div>
          {results.length > 0 && (
            <span>{results.length} results</span>
          )}
        </div>
      </div>
    </div>
  )
}
