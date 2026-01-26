'use client'

import { useState, useEffect } from 'react'

interface InstructionInfo {
  instruction: string
  category?: string
  icon?: string
  friendly?: string
  technical?: string
  operator?: string
  syntax?: string
  parameters?: Array<{ name: string; type: string; description: string }>
  examples?: string[]
  notes?: string[]
}

interface InstructionHelpProps {
  instruction: string | null
  isOpen: boolean
  onClose: () => void
}

export function InstructionHelp({ instruction, isOpen, onClose }: InstructionHelpProps) {
  const [info, setInfo] = useState<InstructionInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState<'friendly' | 'technical' | 'operator'>('friendly')

  useEffect(() => {
    if (instruction && isOpen) {
      setLoading(true)
      fetch(`/api/instructions?instruction=${encodeURIComponent(instruction)}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) {
            setInfo(data)
          } else {
            setInfo(null)
          }
        })
        .catch(() => setInfo(null))
        .finally(() => setLoading(false))
    }
  }, [instruction, isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg max-h-[80vh] rounded-lg shadow-2xl overflow-hidden flex flex-col"
        style={{ background: 'var(--surface-1)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {instruction || 'Instruction Help'}
            </h2>
            {info?.category && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-medium"
                style={{ background: 'var(--accent-blue-muted)', color: 'var(--accent-blue)' }}
              >
                {info.category}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: 'var(--accent-blue)', borderTopColor: 'transparent' }} />
            </div>
          ) : info ? (
            <div className="space-y-4">
              {/* Mode toggle */}
              <div className="flex gap-2">
                {(['friendly', 'technical', 'operator'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className="px-3 py-1.5 rounded text-xs capitalize transition-colors"
                    style={{
                      background: mode === m ? 'var(--accent-blue)' : 'var(--surface-3)',
                      color: mode === m ? 'white' : 'var(--text-secondary)'
                    }}
                  >
                    {m}
                  </button>
                ))}
              </div>

              {/* Description */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                  Description
                </h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {info[mode] || info.friendly || `${instruction} instruction`}
                </p>
              </div>

              {/* Syntax */}
              {info.syntax && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                    Syntax
                  </h3>
                  <code
                    className="block px-3 py-2 rounded text-sm font-mono"
                    style={{ background: 'var(--surface-3)', color: 'var(--accent-emerald)' }}
                  >
                    {info.syntax}
                  </code>
                </div>
              )}

              {/* Parameters */}
              {info.parameters && info.parameters.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                    Parameters
                  </h3>
                  <div className="space-y-2">
                    {info.parameters.map((param, i) => (
                      <div
                        key={i}
                        className="px-3 py-2 rounded"
                        style={{ background: 'var(--surface-2)' }}
                      >
                        <div className="flex items-center gap-2">
                          <code className="text-sm font-mono" style={{ color: 'var(--accent-amber)' }}>{param.name}</code>
                          <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-4)', color: 'var(--text-muted)' }}>
                            {param.type}
                          </span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                          {param.description}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Examples */}
              {info.examples && info.examples.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                    Examples
                  </h3>
                  <div className="space-y-1">
                    {info.examples.map((ex, i) => (
                      <code
                        key={i}
                        className="block px-3 py-1.5 rounded text-xs font-mono"
                        style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}
                      >
                        {ex}
                      </code>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes */}
              {info.notes && info.notes.length > 0 && (
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                    Notes
                  </h3>
                  <ul className="space-y-1">
                    {info.notes.map((note, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-tertiary)' }}>
                        <span style={{ color: 'var(--accent-blue)' }}>•</span>
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <p>Instruction not found in library</p>
              <p className="text-xs mt-2">Try searching for a common instruction like XIC, OTE, TON</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Quick instruction search component
export function InstructionSearch() {
  const [query, setQuery] = useState('')
  const [categories, setCategories] = useState<Array<{ name: string; count: number }>>([])
  const [instructions, setInstructions] = useState<Array<{ name: string; category: string; friendly?: string }>>([])
  const [selectedInstruction, setSelectedInstruction] = useState<string | null>(null)

  useEffect(() => {
    // Fetch categories on mount
    fetch('/api/instructions')
      .then(res => res.json())
      .then(data => {
        setCategories(data.categories || [])
      })
      .catch(() => {})
  }, [])

  const searchInstructions = async (q: string) => {
    if (q.length < 1) {
      setInstructions([])
      return
    }

    try {
      const res = await fetch('/api/instructions')
      const data = await res.json()
      // Filter locally since we fetch all
      const filtered = data.categories?.flatMap((cat: { name: string }) =>
        // This would need more data from API - simplified for now
        []
      ) || []
      setInstructions(filtered)
    } catch {
      setInstructions([])
    }
  }

  return (
    <div className="p-4">
      <div className="relative mb-4">
        <input
          type="text"
          placeholder="Search instructions..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            searchInstructions(e.target.value)
          }}
          className="w-full px-3 py-2 rounded border text-sm"
          style={{
            background: 'var(--surface-2)',
            borderColor: 'var(--border-default)',
            color: 'var(--text-primary)'
          }}
        />
      </div>

      {/* Categories */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          Categories
        </h3>
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat.name}
              className="px-3 py-1.5 rounded text-xs transition-colors"
              style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      </div>

      <InstructionHelp
        instruction={selectedInstruction}
        isOpen={!!selectedInstruction}
        onClose={() => setSelectedInstruction(null)}
      />
    </div>
  )
}
