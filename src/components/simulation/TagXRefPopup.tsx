'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'

// ================================================
// Types
// ================================================

export interface CrossRefUsage {
  routine: string
  rungNumber: number
  rungId: string
  usage: 'read' | 'write'
  instruction: string
  programName?: string
}

export interface TagXRefData {
  tag: string
  usages: CrossRefUsage[]
  isAoi?: boolean
  aoiName?: string
}

interface TagXRefPopupProps {
  data: TagXRefData
  onClose: () => void
  onJumpToRung: (rungId: string, rungNumber: number, routine: string) => void
  onGoToAoiDefinition?: (aoiName: string) => void
}

// ================================================
// Icons
// ================================================

const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconRead = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

const IconWrite = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19l7-7 3 3-7 7-3-3z" />
    <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z" />
    <path d="M2 2l7.586 7.586" />
    <circle cx="11" cy="11" r="2" />
  </svg>
)

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
)

const IconExternalLink = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
)

const IconAoi = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 9h6v6H9z" />
  </svg>
)

// ================================================
// Main Component
// ================================================

export function TagXRefPopup({
  data,
  onClose,
  onJumpToRung,
  onGoToAoiDefinition
}: TagXRefPopupProps) {
  const [searchFilter, setSearchFilter] = useState('')
  const [usageFilter, setUsageFilter] = useState<'all' | 'read' | 'write'>('all')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)

  // Focus search input on mount
  useEffect(() => {
    searchInputRef.current?.focus()
  }, [])

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Filter usages based on search and filter type
  const filteredUsages = data.usages.filter(usage => {
    // Filter by usage type
    if (usageFilter !== 'all' && usage.usage !== usageFilter) {
      return false
    }
    // Filter by search term
    if (searchFilter) {
      const term = searchFilter.toLowerCase()
      return (
        usage.routine.toLowerCase().includes(term) ||
        usage.instruction.toLowerCase().includes(term) ||
        (usage.programName && usage.programName.toLowerCase().includes(term)) ||
        usage.rungNumber.toString().includes(term)
      )
    }
    return true
  })

  // Group usages by routine
  const groupedUsages = filteredUsages.reduce((acc, usage) => {
    const key = usage.programName ? `${usage.programName}/${usage.routine}` : usage.routine
    if (!acc[key]) {
      acc[key] = []
    }
    acc[key].push(usage)
    return acc
  }, {} as Record<string, CrossRefUsage[]>)

  // Handle jump to rung with brief highlight animation
  const handleJump = useCallback((usage: CrossRefUsage) => {
    onJumpToRung(usage.rungId, usage.rungNumber, usage.routine)
    onClose()
  }, [onJumpToRung, onClose])

  // Count reads and writes
  const readCount = data.usages.filter(u => u.usage === 'read').length
  const writeCount = data.usages.filter(u => u.usage === 'write').length

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(4px)',
        padding: 'env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0) env(safe-area-inset-left, 0)'
      }}
      onClick={onClose}
    >
      {/* Modal - Full screen on mobile, centered on desktop */}
      <div
        ref={popupRef}
        className="tag-xref-popup relative w-full h-full sm:h-auto overflow-hidden animate-fade-in flex flex-col"
        style={{
          background: 'var(--surface-2)',
          boxShadow: 'var(--shadow-xl)',
          maxWidth: '640px',
          maxHeight: '100dvh',
          borderRadius: 'var(--radius-none)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <style jsx>{`
          @media (min-width: 640px) {
            .tag-xref-popup {
              max-height: 80vh !important;
              border-radius: var(--radius-md) !important;
              margin: var(--space-4) !important;
            }
          }
        `}</style>
        {/* Header - Touch optimized */}
        <div
          className="flex items-center justify-between border-b flex-shrink-0 safe-area-top"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--surface-3)',
            padding: 'var(--space-3) var(--space-4)',
            minHeight: 'var(--touch-target-min)'
          }}
        >
          <div className="flex items-center flex-wrap" style={{ gap: 'var(--space-2)' }}>
            <h2 className="font-bold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-lg)' }}>
              Cross Reference
            </h2>
            <code
              className="font-mono"
              style={{
                background: 'var(--accent-blue-muted)',
                color: 'var(--accent-blue)',
                padding: 'var(--space-1) var(--space-2)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-sm)'
              }}
            >
              {data.tag}
            </code>
            {data.isAoi && (
              <span
                className="font-medium"
                style={{
                  background: 'var(--accent-purple-muted)',
                  color: 'var(--accent-purple)',
                  padding: 'var(--space-1) var(--space-2)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--text-xs)'
                }}
              >
                AOI
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="flex items-center justify-center transition-colors"
            style={{
              color: 'var(--text-muted)',
              minWidth: 'var(--touch-target-min)',
              minHeight: 'var(--touch-target-min)',
              borderRadius: 'var(--radius-md)'
            }}
            title="Close (Esc)"
          >
            <IconClose />
          </button>
        </div>

        {/* Search and Filter Bar - Touch optimized */}
        <div
          className="flex flex-col sm:flex-row items-stretch sm:items-center border-b flex-shrink-0"
          style={{
            borderColor: 'var(--border-subtle)',
            padding: 'var(--space-3) var(--space-4)',
            gap: 'var(--space-3)'
          }}
        >
          {/* Search Input */}
          <div className="relative flex-1" style={{ minWidth: '180px' }}>
            <span
              className="absolute top-1/2 -translate-y-1/2"
              style={{ color: 'var(--text-muted)', left: 'var(--space-3)' }}
            >
              <IconSearch />
            </span>
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Filter by routine, program..."
              value={searchFilter}
              onChange={e => setSearchFilter(e.target.value)}
              className="w-full outline-none transition-colors"
              style={{
                background: 'var(--surface-1)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                paddingLeft: 'calc(var(--space-3) + 20px)',
                paddingRight: 'var(--space-3)',
                minHeight: 'var(--touch-target-min)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-sm)'
              }}
            />
          </div>

          {/* Filter Buttons - Scrollable on mobile */}
          <div className="flex items-center overflow-x-auto" style={{ gap: 'var(--space-2)' }}>
            <button
              onClick={() => setUsageFilter('all')}
              className="font-medium transition-colors whitespace-nowrap"
              style={{
                background: usageFilter === 'all' ? 'var(--accent-blue-muted)' : 'var(--surface-3)',
                color: usageFilter === 'all' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                border: `1px solid ${usageFilter === 'all' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`,
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                minHeight: '36px'
              }}
            >
              All ({data.usages.length})
            </button>
            <button
              onClick={() => setUsageFilter('read')}
              className="flex items-center font-medium transition-colors whitespace-nowrap"
              style={{
                background: usageFilter === 'read' ? 'var(--accent-emerald-muted)' : 'var(--surface-3)',
                color: usageFilter === 'read' ? 'var(--accent-emerald)' : 'var(--text-secondary)',
                border: `1px solid ${usageFilter === 'read' ? 'var(--accent-emerald)' : 'var(--border-subtle)'}`,
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                minHeight: '36px',
                gap: 'var(--space-1)'
              }}
            >
              <IconRead />
              Read ({readCount})
            </button>
            <button
              onClick={() => setUsageFilter('write')}
              className="flex items-center font-medium transition-colors whitespace-nowrap"
              style={{
                background: usageFilter === 'write' ? 'var(--accent-amber-muted)' : 'var(--surface-3)',
                color: usageFilter === 'write' ? 'var(--accent-amber)' : 'var(--text-secondary)',
                border: `1px solid ${usageFilter === 'write' ? 'var(--accent-amber)' : 'var(--border-subtle)'}`,
                padding: 'var(--space-2) var(--space-3)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--text-xs)',
                minHeight: '36px',
                gap: 'var(--space-1)'
              }}
            >
              <IconWrite />
              Write ({writeCount})
            </button>
          </div>
        </div>

        {/* AOI Definition Link */}
        {data.isAoi && data.aoiName && onGoToAoiDefinition && (
          <div
            className="px-4 py-2 border-b"
            style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-1)' }}
          >
            <button
              onClick={() => {
                onGoToAoiDefinition(data.aoiName!)
                onClose()
              }}
              className="flex items-center gap-2 px-3 py-2 rounded text-sm font-medium transition-colors hover:bg-white/5"
              style={{ color: 'var(--accent-purple)' }}
            >
              <IconAoi />
              Go to AOI Definition: {data.aoiName}
              <IconExternalLink />
            </button>
          </div>
        )}

        {/* Results List - Scrollable with proper mobile handling */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
          {Object.keys(groupedUsages).length > 0 ? (
            <div style={{ padding: 'var(--space-2)' }}>
              {Object.entries(groupedUsages).map(([routinePath, usages]) => (
                <div key={routinePath} style={{ marginBottom: 'var(--space-3)' }}>
                  {/* Routine Header */}
                  <div
                    className="font-semibold uppercase tracking-wider"
                    style={{
                      background: 'var(--surface-3)',
                      color: 'var(--text-muted)',
                      padding: 'var(--space-2) var(--space-3)',
                      borderRadius: 'var(--radius-sm) var(--radius-sm) 0 0',
                      fontSize: 'var(--text-xs)'
                    }}
                  >
                    {routinePath}
                  </div>

                  {/* Usages in this routine */}
                  <div
                    className="overflow-hidden"
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '0 0 var(--radius-sm) var(--radius-sm)'
                    }}
                  >
                    {usages.map((usage, idx) => (
                      <button
                        key={`${usage.rungId}-${idx}`}
                        onClick={() => handleJump(usage)}
                        className="tag-xref-item w-full flex items-center justify-between text-left transition-colors hover:bg-white/5"
                        style={{
                          borderBottom: idx < usages.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                          padding: 'var(--space-3)',
                          minHeight: 'var(--touch-target-min)'
                        }}
                      >
                        <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                          {/* Usage Type Icon */}
                          <span
                            className="flex items-center justify-center flex-shrink-0"
                            style={{
                              width: '28px',
                              height: '28px',
                              background: usage.usage === 'read' ? 'var(--accent-emerald-muted)' : 'var(--accent-amber-muted)',
                              color: usage.usage === 'read' ? 'var(--accent-emerald)' : 'var(--accent-amber)',
                              borderRadius: 'var(--radius-sm)'
                            }}
                            title={usage.usage === 'read' ? 'Read' : 'Write'}
                          >
                            {usage.usage === 'read' ? <IconRead /> : <IconWrite />}
                          </span>

                          {/* Rung Number */}
                          <span
                            className="font-mono font-semibold"
                            style={{
                              background: 'var(--surface-4)',
                              color: 'var(--text-secondary)',
                              padding: 'var(--space-1) var(--space-2)',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 'var(--text-sm)'
                            }}
                          >
                            Rung {usage.rungNumber}
                          </span>

                          {/* Instruction - Hidden on small screens */}
                          <code
                            className="font-mono hidden sm:inline"
                            style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}
                          >
                            {usage.instruction}
                          </code>
                        </div>

                        {/* Jump Indicator */}
                        <span
                          className="flex items-center flex-shrink-0"
                          style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', gap: 'var(--space-1)' }}
                        >
                          <IconExternalLink />
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) var(--space-4)' }}>
              {searchFilter || usageFilter !== 'all' ? (
                <>
                  <IconSearch />
                  <p style={{ marginTop: 'var(--space-2)' }}>No matching references found</p>
                  <p style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)' }}>Try adjusting your filter</p>
                </>
              ) : (
                <>
                  <p>No cross references found for this tag</p>
                  <p style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)' }}>This tag may only be used in this location</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer - With safe area */}
        <div
          className="flex items-center justify-between border-t flex-shrink-0 safe-area-bottom"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--surface-1)',
            color: 'var(--text-muted)',
            padding: 'var(--space-3) var(--space-4)',
            fontSize: 'var(--text-xs)'
          }}
        >
          <span>
            Showing {filteredUsages.length} of {data.usages.length} references
          </span>
          <span className="hidden sm:inline">
            Click a rung to jump to it
          </span>
        </div>
      </div>
    </div>
  )
}

// ================================================
// Helper Functions
// ================================================

/**
 * Build cross-reference data for a tag by scanning all instructions
 */
export function buildTagCrossRefs(
  tagName: string,
  allRungs: Array<{
    id: string
    number: number
    instructions: Array<{ type: string; operands: string[] }>
    routineName: string
    programName?: string
  }>
): TagXRefData {
  const usages: CrossRefUsage[] = []

  // Instructions that write to their first operand
  const writeInstructions = new Set([
    'OTE', 'OTL', 'OTU', 'TON', 'TOF', 'RTO', 'TONR', 'TOFR',
    'CTU', 'CTD', 'CTUD', 'RES', 'MOV', 'MVM', 'ADD', 'SUB',
    'MUL', 'DIV', 'CLR', 'CPT', 'COP', 'FLL', 'NEG', 'ABS'
  ])

  // Instructions that write to their last operand (destination)
  const writeDestInstructions = new Set(['MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'NEG', 'ABS', 'CPT'])

  for (const rung of allRungs) {
    for (const inst of rung.instructions) {
      const instType = inst.type.toUpperCase()

      for (let opIdx = 0; opIdx < inst.operands.length; opIdx++) {
        const operand = inst.operands[opIdx]
        // Extract the tag name (before the section symbol if present)
        const opTagName = operand?.split('\u00A7')[0] || operand

        // Check if this operand matches the tag we're looking for
        // Support partial matching for structured tags
        if (opTagName && (
          opTagName === tagName ||
          opTagName.startsWith(tagName + '.') ||
          opTagName.startsWith(tagName + '[')
        )) {
          // Determine if this is a read or write
          let usage: 'read' | 'write' = 'read'

          if (writeInstructions.has(instType)) {
            // For most write instructions, first operand is the destination
            if (opIdx === 0) {
              usage = 'write'
            }
            // For math instructions, last operand is destination
            if (writeDestInstructions.has(instType) && opIdx === inst.operands.length - 1) {
              usage = 'write'
            }
          }

          usages.push({
            routine: rung.routineName,
            rungNumber: rung.number,
            rungId: rung.id,
            usage,
            instruction: `${instType}(${inst.operands.join(', ')})`,
            programName: rung.programName
          })

          // Only add once per rung per instruction type
          break
        }
      }
    }
  }

  return {
    tag: tagName,
    usages
  }
}

/**
 * Check if a tag is an AOI instance
 */
export function isAoiInstance(tagName: string, aoiNames: string[]): boolean {
  // AOI instances are typically named like: AOIName or AOIName_Instance
  // We check if any AOI name is a prefix of the tag name
  const baseTag = tagName.split('.')[0].split('[')[0]
  return aoiNames.some(aoi =>
    baseTag.toUpperCase() === aoi.toUpperCase() ||
    baseTag.toUpperCase().startsWith(aoi.toUpperCase() + '_')
  )
}
