'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface SearchResult {
  type: 'tag' | 'routine' | 'rung' | 'aoi' | 'udt' | 'module'
  name: string
  description?: string
  location?: string
  match: string
  context?: string
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Search modal */}
      <div
        className="relative w-full max-w-2xl rounded-lg shadow-2xl overflow-hidden"
        style={{ background: 'var(--surface-1)', border: '1px solid var(--border-default)' }}
      >
        {/* Search input */}
        <div className="flex items-center px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            placeholder="Search tags, routines, rungs, AOIs, UDTs, modules..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 ml-3 bg-transparent outline-none text-sm"
            style={{ color: 'var(--text-primary)' }}
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
          )}
          <kbd className="hidden sm:inline ml-2 px-2 py-0.5 rounded text-[10px]" style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length > 0 ? (
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.name}-${index}`}
                  onClick={() => {
                    onNavigate?.(result)
                    onClose()
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-left transition-colors"
                  style={{
                    background: index === selectedIndex ? 'var(--surface-3)' : 'transparent'
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  {/* Type badge */}
                  <span
                    className="flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-medium uppercase"
                    style={{
                      background: TYPE_COLORS[result.type]?.bg || 'var(--surface-3)',
                      color: TYPE_COLORS[result.type]?.text || 'var(--text-secondary)'
                    }}
                  >
                    {TYPE_LABELS[result.type] || result.type}
                  </span>

                  {/* Name and info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm truncate" style={{ color: 'var(--text-primary)' }}>
                        {result.name}
                      </span>
                      {result.location && (
                        <span className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                          in {result.location}
                        </span>
                      )}
                    </div>
                    {(result.description || result.context) && (
                      <div className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>
                        {result.description || result.context}
                      </div>
                    )}
                  </div>

                  {/* Arrow indicator */}
                  {index === selectedIndex && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  )}
                </button>
              ))}
            </div>
          ) : query.length >= 2 && !loading ? (
            <div className="py-12 text-center" style={{ color: 'var(--text-muted)' }}>
              <p>No results found for "{query}"</p>
            </div>
          ) : query.length < 2 ? (
            <div className="py-8 text-center" style={{ color: 'var(--text-muted)' }}>
              <p className="text-sm">Type at least 2 characters to search</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs">
                <span className="px-2 py-1 rounded" style={{ background: 'var(--surface-3)' }}>Tags</span>
                <span className="px-2 py-1 rounded" style={{ background: 'var(--surface-3)' }}>Routines</span>
                <span className="px-2 py-1 rounded" style={{ background: 'var(--surface-3)' }}>Rungs</span>
                <span className="px-2 py-1 rounded" style={{ background: 'var(--surface-3)' }}>AOIs</span>
                <span className="px-2 py-1 rounded" style={{ background: 'var(--surface-3)' }}>UDTs</span>
                <span className="px-2 py-1 rounded" style={{ background: 'var(--surface-3)' }}>Modules</span>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-4 py-2 border-t text-xs"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
        >
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-3)' }}>↑</kbd>
              <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-3)' }}>↓</kbd>
              to navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-3)' }}>Enter</kbd>
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
