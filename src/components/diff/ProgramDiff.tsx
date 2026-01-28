'use client'

import React, { useState, useMemo, useCallback } from 'react'
import {
  Rung,
  RungDiffResult,
  DiffStatus,
  diffRung,
  rungSimilarity,
  RungDiffView
} from './RungDiff'

// ============================================================================
// Types
// ============================================================================

export interface Routine {
  id: string
  name: string
  type: string
  description: string | null
  rungs: Rung[]
}

export interface Program {
  id: string
  name: string
  description: string | null
  disabled: boolean
  routines: Routine[]
}

export interface RoutineDiffResult {
  status: DiffStatus
  beforeRoutine?: Routine
  afterRoutine?: Routine
  rungDiffs: RungDiffResult[]
  stats: {
    added: number
    removed: number
    modified: number
    unchanged: number
  }
}

export interface ProgramDiffResult {
  status: DiffStatus
  beforeProgram?: Program
  afterProgram?: Program
  routineDiffs: RoutineDiffResult[]
  stats: {
    routinesAdded: number
    routinesRemoved: number
    routinesModified: number
    rungsAdded: number
    rungsRemoved: number
    rungsModified: number
    totalRungs: number
  }
}

// ============================================================================
// Diff Algorithm
// ============================================================================

/**
 * Match rungs between two routines using multiple strategies:
 * 1. Exact rung number match
 * 2. Similarity-based matching for reordered/renumbered rungs
 */
function matchRungs(beforeRungs: Rung[], afterRungs: Rung[]): Map<number, number> {
  const matches = new Map<number, number>() // beforeIndex -> afterIndex
  const usedAfter = new Set<number>()

  // First pass: exact number matches
  for (let i = 0; i < beforeRungs.length; i++) {
    const beforeNum = beforeRungs[i].number
    const afterIdx = afterRungs.findIndex((r, idx) => r.number === beforeNum && !usedAfter.has(idx))
    if (afterIdx !== -1) {
      matches.set(i, afterIdx)
      usedAfter.add(afterIdx)
    }
  }

  // Second pass: similarity-based matching for unmatched rungs
  const unmatchedBefore = Array.from({ length: beforeRungs.length }, (_, i) => i)
    .filter(i => !matches.has(i))
  const unmatchedAfter = Array.from({ length: afterRungs.length }, (_, i) => i)
    .filter(i => !usedAfter.has(i))

  // Calculate similarity matrix
  const similarities: Array<{ beforeIdx: number; afterIdx: number; similarity: number }> = []
  for (const bi of unmatchedBefore) {
    for (const ai of unmatchedAfter) {
      const sim = rungSimilarity(beforeRungs[bi], afterRungs[ai])
      if (sim > 0.4) { // Threshold for considering a match
        similarities.push({ beforeIdx: bi, afterIdx: ai, similarity: sim })
      }
    }
  }

  // Greedy matching by highest similarity
  similarities.sort((a, b) => b.similarity - a.similarity)
  for (const { beforeIdx, afterIdx } of similarities) {
    if (!matches.has(beforeIdx) && !usedAfter.has(afterIdx)) {
      matches.set(beforeIdx, afterIdx)
      usedAfter.add(afterIdx)
    }
  }

  return matches
}

/**
 * Diff two routines
 */
export function diffRoutine(before: Routine | undefined, after: Routine | undefined): RoutineDiffResult {
  const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 }

  if (!before && !after) {
    return { status: 'unchanged', rungDiffs: [], stats }
  }

  if (!before && after) {
    const rungDiffs = after.rungs.map(r => diffRung(undefined, r))
    stats.added = rungDiffs.length
    return { status: 'added', afterRoutine: after, rungDiffs, stats }
  }

  if (before && !after) {
    const rungDiffs = before.rungs.map(r => diffRung(r, undefined))
    stats.removed = rungDiffs.length
    return { status: 'removed', beforeRoutine: before, rungDiffs, stats }
  }

  // Both exist
  const beforeRoutine = before!
  const afterRoutine = after!
  const matches = matchRungs(beforeRoutine.rungs, afterRoutine.rungs)
  const rungDiffs: RungDiffResult[] = []
  const processedAfter = new Set<number>()

  // Process matched and removed rungs
  for (let i = 0; i < beforeRoutine.rungs.length; i++) {
    const beforeRung = beforeRoutine.rungs[i]
    const afterIdx = matches.get(i)

    if (afterIdx !== undefined) {
      const afterRung = afterRoutine.rungs[afterIdx]
      const diff = diffRung(beforeRung, afterRung)
      rungDiffs.push(diff)
      processedAfter.add(afterIdx)

      if (diff.status === 'modified') stats.modified++
      else stats.unchanged++
    } else {
      rungDiffs.push(diffRung(beforeRung, undefined))
      stats.removed++
    }
  }

  // Process added rungs
  for (let i = 0; i < afterRoutine.rungs.length; i++) {
    if (!processedAfter.has(i)) {
      rungDiffs.push(diffRung(undefined, afterRoutine.rungs[i]))
      stats.added++
    }
  }

  // Sort by rung number
  rungDiffs.sort((a, b) => {
    const numA = a.afterRung?.number ?? a.beforeRung?.number ?? 0
    const numB = b.afterRung?.number ?? b.beforeRung?.number ?? 0
    return numA - numB
  })

  const hasChanges = stats.added > 0 || stats.removed > 0 || stats.modified > 0
  return {
    status: hasChanges ? 'modified' : 'unchanged',
    beforeRoutine,
    afterRoutine,
    rungDiffs,
    stats
  }
}

/**
 * Diff two programs
 */
export function diffProgram(before: Program | undefined, after: Program | undefined): ProgramDiffResult {
  const stats = {
    routinesAdded: 0,
    routinesRemoved: 0,
    routinesModified: 0,
    rungsAdded: 0,
    rungsRemoved: 0,
    rungsModified: 0,
    totalRungs: 0
  }

  if (!before && !after) {
    return { status: 'unchanged', routineDiffs: [], stats }
  }

  if (!before && after) {
    const routineDiffs = after.routines.map(r => diffRoutine(undefined, r))
    stats.routinesAdded = routineDiffs.length
    routineDiffs.forEach(rd => {
      stats.rungsAdded += rd.stats.added
      stats.totalRungs += rd.rungDiffs.length
    })
    return { status: 'added', afterProgram: after, routineDiffs, stats }
  }

  if (before && !after) {
    const routineDiffs = before.routines.map(r => diffRoutine(r, undefined))
    stats.routinesRemoved = routineDiffs.length
    routineDiffs.forEach(rd => {
      stats.rungsRemoved += rd.stats.removed
      stats.totalRungs += rd.rungDiffs.length
    })
    return { status: 'removed', beforeProgram: before, routineDiffs, stats }
  }

  // Both exist - match routines by name
  const beforeProgram = before!
  const afterProgram = after!
  const routineDiffs: RoutineDiffResult[] = []
  const processedAfter = new Set<string>()

  // Match by name
  for (const beforeRoutine of beforeProgram.routines) {
    const afterRoutine = afterProgram.routines.find(r => r.name === beforeRoutine.name)
    if (afterRoutine) {
      const diff = diffRoutine(beforeRoutine, afterRoutine)
      routineDiffs.push(diff)
      processedAfter.add(afterRoutine.name)

      if (diff.status === 'modified') {
        stats.routinesModified++
      }
      stats.rungsAdded += diff.stats.added
      stats.rungsRemoved += diff.stats.removed
      stats.rungsModified += diff.stats.modified
      stats.totalRungs += diff.rungDiffs.length
    } else {
      const diff = diffRoutine(beforeRoutine, undefined)
      routineDiffs.push(diff)
      stats.routinesRemoved++
      stats.rungsRemoved += diff.stats.removed
      stats.totalRungs += diff.rungDiffs.length
    }
  }

  // Added routines
  for (const afterRoutine of afterProgram.routines) {
    if (!processedAfter.has(afterRoutine.name)) {
      const diff = diffRoutine(undefined, afterRoutine)
      routineDiffs.push(diff)
      stats.routinesAdded++
      stats.rungsAdded += diff.stats.added
      stats.totalRungs += diff.rungDiffs.length
    }
  }

  const hasChanges = stats.routinesAdded > 0 || stats.routinesRemoved > 0 || stats.routinesModified > 0
  return {
    status: hasChanges ? 'modified' : 'unchanged',
    beforeProgram,
    afterProgram,
    routineDiffs,
    stats
  }
}

// ============================================================================
// UI Components
// ============================================================================

// Icons
const IconChevronDown = ({ open }: { open?: boolean }) => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const IconUpload = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" />
  </svg>
)

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
)

const IconFilter = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)

const IconSideBySide = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="18" rx="1" />
    <rect x="14" y="3" width="7" height="18" rx="1" />
  </svg>
)

const IconUnified = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="1" />
    <line x1="3" y1="12" x2="21" y2="12" />
  </svg>
)

interface StatsCardProps {
  label: string
  value: number
  color: string
}

function StatsCard({ label, value, color }: StatsCardProps) {
  return (
    <div
      className="flex items-center flex-shrink-0"
      style={{
        background: 'var(--surface-3)',
        borderRadius: 'var(--radius-md)',
        padding: 'var(--space-2) var(--space-3)',
        gap: 'var(--space-2)'
      }}
    >
      <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: color, flexShrink: 0 }} />
      <span className="whitespace-nowrap" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}>{label}:</span>
      <span className="font-bold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{value}</span>
    </div>
  )
}

interface DiffBadgeProps {
  status: DiffStatus
  small?: boolean
}

function DiffBadge({ status, small }: DiffBadgeProps) {
  const config = {
    added: { label: 'Added', bg: 'var(--diff-added-bg)', color: 'var(--diff-added-text)', border: 'var(--diff-added-border)' },
    removed: { label: 'Removed', bg: 'var(--diff-removed-bg)', color: 'var(--diff-removed-text)', border: 'var(--diff-removed-border)' },
    modified: { label: 'Modified', bg: 'var(--diff-modified-bg)', color: 'var(--diff-modified-text)', border: 'var(--diff-modified-border)' },
    unchanged: { label: 'Unchanged', bg: 'var(--surface-3)', color: 'var(--text-muted)', border: 'var(--border-subtle)' }
  }

  const { label, bg, color, border } = config[status]

  return (
    <span
      className={`inline-flex items-center font-medium ${small ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-1 text-xs'}`}
      style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: '4px' }}
    >
      {label}
    </span>
  )
}

interface RoutineDiffViewProps {
  diff: RoutineDiffResult
  viewMode: 'side-by-side' | 'unified'
  filterMode: 'all' | 'changed'
  defaultExpanded?: boolean
}

function RoutineDiffView({ diff, viewMode, filterMode, defaultExpanded = false }: RoutineDiffViewProps) {
  const [expanded, setExpanded] = useState(defaultExpanded || diff.status !== 'unchanged')

  const filteredDiffs = filterMode === 'changed'
    ? diff.rungDiffs.filter(rd => rd.status !== 'unchanged')
    : diff.rungDiffs

  if (filterMode === 'changed' && filteredDiffs.length === 0) {
    return null
  }

  const routineName = diff.afterRoutine?.name ?? diff.beforeRoutine?.name ?? 'Unknown'

  return (
    <div
      className="border rounded-lg overflow-hidden"
      style={{
        borderColor: diff.status === 'unchanged' ? 'var(--border-subtle)' :
                     diff.status === 'added' ? 'var(--diff-added-border)' :
                     diff.status === 'removed' ? 'var(--diff-removed-border)' :
                     'var(--diff-modified-border)',
        background: 'var(--surface-2)'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer"
        style={{ background: 'var(--surface-3)' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <IconChevronDown open={expanded} />
          <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            {routineName}
          </span>
          <DiffBadge status={diff.status} />
        </div>
        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          {diff.stats.added > 0 && <span style={{ color: 'var(--diff-added-text)' }}>+{diff.stats.added}</span>}
          {diff.stats.removed > 0 && <span style={{ color: 'var(--diff-removed-text)' }}>-{diff.stats.removed}</span>}
          {diff.stats.modified > 0 && <span style={{ color: 'var(--diff-modified-text)' }}>~{diff.stats.modified}</span>}
        </div>
      </div>

      {/* Rung diffs */}
      {expanded && (
        <div className="p-4 space-y-3">
          {filteredDiffs.length === 0 ? (
            <div className="text-center py-6 text-sm" style={{ color: 'var(--text-muted)' }}>
              No changes in this routine
            </div>
          ) : (
            filteredDiffs.map((rungDiff, i) => (
              <RungDiffView
                key={`rung-${rungDiff.afterRung?.id ?? rungDiff.beforeRung?.id ?? i}`}
                diff={rungDiff}
                viewMode={viewMode}
                showDetails={true}
              />
            ))
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

interface ParsedProject {
  name: string
  processorType: string | null
  programs: Program[]
}

interface ProgramDiffProps {
  currentProject?: ParsedProject
  onClose?: () => void
}

export function ProgramDiff({ currentProject, onClose }: ProgramDiffProps) {
  const [beforeProject, setBeforeProject] = useState<ParsedProject | null>(null)
  const [afterProject, setAfterProject] = useState<ParsedProject | null>(currentProject || null)
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side')
  const [filterMode, setFilterMode] = useState<'all' | 'changed'>('changed')
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Parse uploaded JSON/L5X file
  const handleFileUpload = useCallback(async (file: File, target: 'before' | 'after') => {
    setIsLoading(true)
    setError(null)

    try {
      const text = await file.text()
      let parsed: ParsedProject

      if (file.name.endsWith('.json')) {
        // Direct JSON export
        parsed = JSON.parse(text)
      } else if (file.name.endsWith('.l5x')) {
        // Parse L5X - this would need server-side processing
        // For now, show an error indicating they need to use exported JSON
        setError('L5X files need to be processed first. Please upload a project and use the "Export for Diff" option, or upload a previously exported JSON file.')
        setIsLoading(false)
        return
      } else {
        setError('Unsupported file type. Please upload a .json file exported from this tool.')
        setIsLoading(false)
        return
      }

      // Validate structure
      if (!parsed.programs || !Array.isArray(parsed.programs)) {
        setError('Invalid file structure. Missing programs array.')
        setIsLoading(false)
        return
      }

      // Normalize rung instructions (ensure they're arrays, not strings)
      for (const program of parsed.programs) {
        for (const routine of program.routines || []) {
          for (const rung of routine.rungs || []) {
            if (typeof rung.instructions === 'string') {
              try {
                rung.instructions = JSON.parse(rung.instructions)
              } catch {
                rung.instructions = []
              }
            }
            if (!Array.isArray(rung.instructions)) {
              rung.instructions = []
            }
          }
        }
      }

      if (target === 'before') {
        setBeforeProject(parsed)
      } else {
        setAfterProject(parsed)
      }

      // Auto-select first program if we have both
      if ((target === 'before' && afterProject) || (target === 'after' && beforeProject)) {
        const programs = target === 'before' ? parsed.programs : (beforeProject?.programs || [])
        if (programs.length > 0 && !selectedProgram) {
          setSelectedProgram(programs[0].name)
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse file')
    } finally {
      setIsLoading(false)
    }
  }, [afterProject, beforeProject, selectedProgram])

  // Compute diff
  const programDiff = useMemo(() => {
    if (!beforeProject || !afterProject || !selectedProgram) {
      return null
    }

    const beforeProgram = beforeProject.programs.find(p => p.name === selectedProgram)
    const afterProgram = afterProject.programs.find(p => p.name === selectedProgram)

    return diffProgram(beforeProgram, afterProgram)
  }, [beforeProject, afterProject, selectedProgram])

  // Export diff report
  const handleExportReport = useCallback(() => {
    if (!programDiff) return

    const report = {
      generatedAt: new Date().toISOString(),
      beforeProject: beforeProject?.name,
      afterProject: afterProject?.name,
      program: selectedProgram,
      stats: programDiff.stats,
      changes: programDiff.routineDiffs.map(rd => ({
        routine: rd.afterRoutine?.name ?? rd.beforeRoutine?.name,
        status: rd.status,
        stats: rd.stats,
        rungs: rd.rungDiffs.filter(r => r.status !== 'unchanged').map(r => ({
          number: r.afterRung?.number ?? r.beforeRung?.number,
          status: r.status,
          beforeComment: r.beforeRung?.comment,
          afterComment: r.afterRung?.comment,
          instructionChanges: r.instructionDiffs.filter(i => i.status !== 'unchanged').length
        }))
      }))
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `diff-report-${selectedProgram}-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [programDiff, beforeProject, afterProject, selectedProgram])

  // Get all program names from both projects
  const allPrograms = useMemo(() => {
    const names = new Set<string>()
    beforeProject?.programs.forEach(p => names.add(p.name))
    afterProject?.programs.forEach(p => names.add(p.name))
    return Array.from(names).sort()
  }, [beforeProject, afterProject])

  return (
    <div
      className="h-screen-safe flex flex-col container-main"
      style={{ background: 'var(--surface-1)' }}
    >
      {/* Header - Touch optimized */}
      <div
        className="flex items-center justify-between border-b flex-shrink-0 safe-area-top"
        style={{
          borderColor: 'var(--border-subtle)',
          background: 'var(--surface-2)',
          padding: 'var(--space-4) var(--space-5)',
          minHeight: 'var(--touch-target-min)'
        }}
      >
        <div>
          <h2 className="font-bold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-xl)' }}>Program Diff</h2>
          <p className="hidden sm:block" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Compare two versions of your PLC program</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="flex items-center justify-center transition-colors"
            style={{
              color: 'var(--text-muted)',
              minWidth: 'var(--touch-target-min)',
              minHeight: 'var(--touch-target-min)',
              borderRadius: 'var(--radius-md)'
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* File upload area - Responsive grid */}
      <div className="border-b flex-shrink-0" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-5)' }}>
        <div className="grid grid-cols-1 md:grid-cols-2" style={{ gap: 'var(--space-5)' }}>
          {/* Before file */}
          <div>
            <label className="block font-medium" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
              Before (Original Version)
            </label>
            <div
              className="text-center cursor-pointer transition-colors"
              style={{
                borderWidth: '2px',
                borderStyle: 'dashed',
                borderColor: beforeProject ? 'var(--diff-removed-border)' : 'var(--border-default)',
                background: beforeProject ? 'var(--diff-removed-bg)' : 'var(--surface-2)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-5)',
                minHeight: '100px'
              }}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.json,.l5x'
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) handleFileUpload(file, 'before')
                }
                input.click()
              }}
            >
              {beforeProject ? (
                <div>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{beforeProject.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                    {beforeProject.programs.length} programs, {beforeProject.processorType || 'Unknown processor'}
                  </div>
                  <button
                    className="underline"
                    style={{ color: 'var(--accent-blue)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)', minHeight: '32px' }}
                    onClick={(e) => { e.stopPropagation(); setBeforeProject(null) }}
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <IconUpload />
                  <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
                    Click to upload or drag and drop
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                    JSON export file
                  </div>
                </>
              )}
            </div>
          </div>

          {/* After file */}
          <div>
            <label className="block font-medium" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
              After (New Version)
            </label>
            <div
              className="text-center cursor-pointer transition-colors"
              style={{
                borderWidth: '2px',
                borderStyle: 'dashed',
                borderColor: afterProject ? 'var(--diff-added-border)' : 'var(--border-default)',
                background: afterProject ? 'var(--diff-added-bg)' : 'var(--surface-2)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-5)',
                minHeight: '100px'
              }}
              onClick={() => {
                const input = document.createElement('input')
                input.type = 'file'
                input.accept = '.json,.l5x'
                input.onchange = (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0]
                  if (file) handleFileUpload(file, 'after')
                }
                input.click()
              }}
            >
              {afterProject ? (
                <div>
                  <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{afterProject.name}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                    {afterProject.programs.length} programs, {afterProject.processorType || 'Unknown processor'}
                  </div>
                  {currentProject && afterProject === currentProject ? (
                    <div style={{ color: 'var(--accent-emerald)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
                      (Current project)
                    </div>
                  ) : (
                    <button
                      className="underline"
                      style={{ color: 'var(--accent-blue)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)', minHeight: '32px' }}
                      onClick={(e) => { e.stopPropagation(); setAfterProject(currentProject || null) }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ) : (
                <>
                  <IconUpload />
                  <div style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginTop: 'var(--space-2)' }}>
                    Click to upload or drag and drop
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                    JSON export file
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: 'var(--accent-red-muted)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              borderRadius: 'var(--radius-md)',
              marginTop: 'var(--space-4)',
              padding: 'var(--space-3) var(--space-4)'
            }}
          >
            <span style={{ color: 'var(--accent-red)', fontSize: 'var(--text-sm)' }}>{error}</span>
          </div>
        )}
      </div>

      {/* Controls - Responsive with scrollable options */}
      {beforeProject && afterProject && (
        <div
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-b flex-shrink-0"
          style={{
            borderColor: 'var(--border-subtle)',
            padding: 'var(--space-4) var(--space-5)',
            gap: 'var(--space-3)'
          }}
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center" style={{ gap: 'var(--space-3)' }}>
            {/* Program selector */}
            <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
              <label className="hidden sm:inline" style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>Program:</label>
              <select
                value={selectedProgram || ''}
                onChange={(e) => setSelectedProgram(e.target.value)}
                style={{
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border-default)',
                  color: 'var(--text-primary)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  fontSize: 'var(--text-sm)',
                  minHeight: 'var(--touch-target-min)',
                  flex: 1
                }}
              >
                <option value="">Select a program</option>
                {allPrograms.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            {/* View mode and filter - Horizontal scroll on mobile */}
            <div className="flex items-center overflow-x-auto" style={{ gap: 'var(--space-2)' }}>
              {/* View mode toggle */}
              <div className="flex items-center overflow-hidden" style={{ border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)' }}>
                <button
                  onClick={() => setViewMode('side-by-side')}
                  className="flex items-center font-medium whitespace-nowrap"
                  style={{
                    background: viewMode === 'side-by-side' ? 'var(--accent-blue)' : 'var(--surface-3)',
                    color: viewMode === 'side-by-side' ? 'white' : 'var(--text-secondary)',
                    padding: 'var(--space-2) var(--space-3)',
                    fontSize: 'var(--text-xs)',
                    gap: 'var(--space-1)',
                    minHeight: '36px'
                  }}
                >
                  <IconSideBySide /> <span className="hidden sm:inline">Side by Side</span>
                </button>
                <button
                  onClick={() => setViewMode('unified')}
                  className="flex items-center font-medium whitespace-nowrap"
                  style={{
                    background: viewMode === 'unified' ? 'var(--accent-blue)' : 'var(--surface-3)',
                    color: viewMode === 'unified' ? 'white' : 'var(--text-secondary)',
                    padding: 'var(--space-2) var(--space-3)',
                    fontSize: 'var(--text-xs)',
                    gap: 'var(--space-1)',
                    minHeight: '36px'
                  }}
                >
                  <IconUnified /> <span className="hidden sm:inline">Unified</span>
                </button>
              </div>

              {/* Filter toggle */}
              <button
                onClick={() => setFilterMode(filterMode === 'all' ? 'changed' : 'all')}
                className="flex items-center font-medium whitespace-nowrap"
                style={{
                  background: filterMode === 'changed' ? 'var(--accent-amber-muted)' : 'var(--surface-3)',
                  border: `1px solid ${filterMode === 'changed' ? 'var(--accent-amber)' : 'var(--border-default)'}`,
                  color: filterMode === 'changed' ? 'var(--accent-amber)' : 'var(--text-secondary)',
                  borderRadius: 'var(--radius-md)',
                  padding: 'var(--space-2) var(--space-3)',
                  fontSize: 'var(--text-xs)',
                  gap: 'var(--space-1)',
                  minHeight: '36px'
                }}
              >
                <IconFilter /> {filterMode === 'changed' ? 'Changed' : 'All'}
              </button>
            </div>
          </div>

          {/* Export button */}
          {programDiff && (
            <button
              onClick={handleExportReport}
              className="flex items-center justify-center font-medium"
              style={{
                background: 'var(--surface-3)',
                border: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-2) var(--space-3)',
                fontSize: 'var(--text-xs)',
                gap: 'var(--space-1)',
                minHeight: 'var(--touch-target-min)'
              }}
            >
              <IconDownload /> Export Report
            </button>
          )}
        </div>
      )}

      {/* Stats summary - Scrollable on mobile */}
      {programDiff && (
        <div
          className="flex overflow-x-auto border-b flex-shrink-0"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--surface-2)',
            padding: 'var(--space-4) var(--space-5)',
            gap: 'var(--space-3)'
          }}
        >
          <StatsCard label="Rungs Added" value={programDiff.stats.rungsAdded} color="var(--diff-added-text)" />
          <StatsCard label="Rungs Removed" value={programDiff.stats.rungsRemoved} color="var(--diff-removed-text)" />
          <StatsCard label="Rungs Modified" value={programDiff.stats.rungsModified} color="var(--diff-modified-text)" />
          <StatsCard label="Total Changes" value={programDiff.stats.rungsAdded + programDiff.stats.rungsRemoved + programDiff.stats.rungsModified} color="var(--accent-blue)" />
        </div>
      )}

      {/* Diff content - Scrollable area */}
      <div
        className="flex-1 overflow-y-auto overscroll-contain safe-area-bottom"
        style={{ padding: 'var(--space-5)', WebkitOverflowScrolling: 'touch' }}
      >
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto" style={{ borderColor: 'var(--accent-blue)' }} />
              <div className="mt-4 text-sm" style={{ color: 'var(--text-muted)' }}>Processing file...</div>
            </div>
          </div>
        ) : !beforeProject || !afterProject ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="text-4xl mb-4">+/-</div>
              <div className="text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
                Upload two project files to compare
              </div>
              <div className="text-sm mt-2" style={{ color: 'var(--text-muted)' }}>
                Use &quot;Export for Diff&quot; from the project menu to create comparison files
              </div>
            </div>
          </div>
        ) : !selectedProgram ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center" style={{ color: 'var(--text-muted)' }}>
              Select a program to view differences
            </div>
          </div>
        ) : programDiff ? (
          <div className="space-y-4">
            {programDiff.routineDiffs
              .filter(rd => filterMode === 'all' || rd.status !== 'unchanged')
              .map((routineDiff, i) => (
                <RoutineDiffView
                  key={routineDiff.afterRoutine?.id ?? routineDiff.beforeRoutine?.id ?? i}
                  diff={routineDiff}
                  viewMode={viewMode}
                  filterMode={filterMode}
                />
              ))}
            {filterMode === 'changed' && programDiff.routineDiffs.every(rd => rd.status === 'unchanged') && (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                No changes detected in this program
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default ProgramDiff
