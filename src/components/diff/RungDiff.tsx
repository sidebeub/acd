'use client'

import React, { useState, useMemo } from 'react'

// ============================================================================
// Types
// ============================================================================

export interface Instruction {
  type: string
  operands: string[]
  branch_level?: number
  parallel_index?: number
  branchLeg?: number
  branchLevel?: number
  branchStart?: boolean
  is_input?: boolean
}

export interface Rung {
  id: string
  number: number
  comment: string | null
  rawText: string
  instructions: Instruction[]
}

export type DiffStatus = 'added' | 'removed' | 'modified' | 'unchanged'

export interface InstructionDiff {
  status: DiffStatus
  before?: Instruction
  after?: Instruction
  changes?: string[] // List of what changed (e.g., "operand 0: X -> Y")
}

export interface RungDiffResult {
  status: DiffStatus
  beforeRung?: Rung
  afterRung?: Rung
  instructionDiffs: InstructionDiff[]
  matchConfidence?: number // 0-1, how confident we are this is the same rung
}

// ============================================================================
// Diff Algorithm
// ============================================================================

/**
 * Create a unique key for an instruction based on type and operands
 */
function instructionKey(inst: Instruction): string {
  return `${inst.type}:${inst.operands.join(',')}`
}

/**
 * Compare two instructions and detect modifications
 */
export function compareInstructions(before: Instruction, after: Instruction): InstructionDiff {
  if (before.type !== after.type) {
    return { status: 'modified', before, after, changes: [`type: ${before.type} -> ${after.type}`] }
  }

  const changes: string[] = []

  // Compare operands
  const maxOperands = Math.max(before.operands.length, after.operands.length)
  for (let i = 0; i < maxOperands; i++) {
    const beforeOp = before.operands[i] || '(none)'
    const afterOp = after.operands[i] || '(none)'
    if (beforeOp !== afterOp) {
      changes.push(`operand ${i}: ${beforeOp} -> ${afterOp}`)
    }
  }

  // Compare branch properties
  if (before.branch_level !== after.branch_level) {
    changes.push(`branch_level: ${before.branch_level ?? 'none'} -> ${after.branch_level ?? 'none'}`)
  }
  if (before.branchLeg !== after.branchLeg) {
    changes.push(`branchLeg: ${before.branchLeg ?? 'none'} -> ${after.branchLeg ?? 'none'}`)
  }

  if (changes.length > 0) {
    return { status: 'modified', before, after, changes }
  }

  return { status: 'unchanged', before, after }
}

/**
 * Longest Common Subsequence for instruction matching
 */
function lcsInstructions(before: Instruction[], after: Instruction[]): number[][] {
  const m = before.length
  const n = after.length
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0))

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (instructionKey(before[i - 1]) === instructionKey(after[j - 1])) {
        dp[i][j] = dp[i - 1][j - 1] + 1
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1])
      }
    }
  }

  return dp
}

/**
 * Diff two arrays of instructions using LCS algorithm
 */
export function diffInstructions(before: Instruction[], after: Instruction[]): InstructionDiff[] {
  const dp = lcsInstructions(before, after)

  let i = before.length
  let j = after.length

  const result: InstructionDiff[] = []

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && instructionKey(before[i - 1]) === instructionKey(after[j - 1])) {
      // Instructions match - check for modifications
      const instDiff = compareInstructions(before[i - 1], after[j - 1])
      result.unshift(instDiff)
      i--
      j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      // Instruction added
      result.unshift({ status: 'added', after: after[j - 1] })
      j--
    } else if (i > 0) {
      // Instruction removed
      result.unshift({ status: 'removed', before: before[i - 1] })
      i--
    }
  }

  return result
}

/**
 * Calculate similarity between two rungs (0-1)
 */
export function rungSimilarity(before: Rung, after: Rung): number {
  if (before.number === after.number) {
    // Same rung number - high base confidence
    let score = 0.5

    // Compare comments
    if (before.comment === after.comment) {
      score += 0.2
    } else if (before.comment && after.comment &&
               before.comment.toLowerCase().includes(after.comment.toLowerCase().slice(0, 10))) {
      score += 0.1
    }

    // Compare instruction count
    const countDiff = Math.abs(before.instructions.length - after.instructions.length)
    const maxCount = Math.max(before.instructions.length, after.instructions.length)
    if (maxCount > 0) {
      score += 0.3 * (1 - countDiff / maxCount)
    }

    return Math.min(score, 1)
  }

  // Different rung numbers - use instruction similarity
  const beforeKeys = new Set(before.instructions.map(instructionKey))
  const afterKeys = new Set(after.instructions.map(instructionKey))

  let common = 0
  for (const key of beforeKeys) {
    if (afterKeys.has(key)) common++
  }

  const total = beforeKeys.size + afterKeys.size
  if (total === 0) return 0

  return (2 * common) / total // Jaccard similarity variant
}

/**
 * Diff a single rung
 */
export function diffRung(before: Rung | undefined, after: Rung | undefined): RungDiffResult {
  if (!before && !after) {
    return { status: 'unchanged', instructionDiffs: [] }
  }

  if (!before && after) {
    return {
      status: 'added',
      afterRung: after,
      instructionDiffs: after.instructions.map(inst => ({ status: 'added' as DiffStatus, after: inst }))
    }
  }

  if (before && !after) {
    return {
      status: 'removed',
      beforeRung: before,
      instructionDiffs: before.instructions.map(inst => ({ status: 'removed' as DiffStatus, before: inst }))
    }
  }

  // Both exist - compare them
  const beforeRung = before!
  const afterRung = after!
  const instructionDiffs = diffInstructions(beforeRung.instructions, afterRung.instructions)

  // Determine overall status
  const hasChanges = instructionDiffs.some(d => d.status !== 'unchanged')
  const commentChanged = beforeRung.comment !== afterRung.comment

  return {
    status: hasChanges || commentChanged ? 'modified' : 'unchanged',
    beforeRung,
    afterRung,
    instructionDiffs,
    matchConfidence: rungSimilarity(beforeRung, afterRung)
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

interface InstructionBlockProps {
  instruction: Instruction
  status: DiffStatus
  showAsRemoved?: boolean
}

function InstructionBlock({ instruction, status, showAsRemoved }: InstructionBlockProps) {
  const typeColors: Record<string, { color: string; bg: string }> = {
    // Inputs
    XIC: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)' },
    XIO: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)' },
    // Outputs
    OTE: { color: 'var(--inst-output)', bg: 'rgba(234, 179, 8, 0.1)' },
    OTL: { color: 'var(--inst-output)', bg: 'rgba(234, 179, 8, 0.1)' },
    OTU: { color: 'var(--inst-output)', bg: 'rgba(234, 179, 8, 0.1)' },
    // Timers
    TON: { color: 'var(--inst-timer)', bg: 'rgba(6, 182, 212, 0.1)' },
    TOF: { color: 'var(--inst-timer)', bg: 'rgba(6, 182, 212, 0.1)' },
    RTO: { color: 'var(--inst-timer)', bg: 'rgba(6, 182, 212, 0.1)' },
    // Counters
    CTU: { color: 'var(--inst-counter)', bg: 'rgba(168, 85, 247, 0.1)' },
    CTD: { color: 'var(--inst-counter)', bg: 'rgba(168, 85, 247, 0.1)' },
    RES: { color: 'var(--inst-counter)', bg: 'rgba(168, 85, 247, 0.1)' },
    // Math
    ADD: { color: 'var(--inst-math)', bg: 'rgba(236, 72, 153, 0.1)' },
    SUB: { color: 'var(--inst-math)', bg: 'rgba(236, 72, 153, 0.1)' },
    MUL: { color: 'var(--inst-math)', bg: 'rgba(236, 72, 153, 0.1)' },
    DIV: { color: 'var(--inst-math)', bg: 'rgba(236, 72, 153, 0.1)' },
    MOV: { color: 'var(--inst-move)', bg: 'rgba(99, 102, 241, 0.1)' },
    COP: { color: 'var(--inst-move)', bg: 'rgba(99, 102, 241, 0.1)' },
    // Compare
    EQU: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)' },
    NEQ: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)' },
    GRT: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)' },
    LES: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)' },
    GEQ: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)' },
    LEQ: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)' },
    // Jump
    JSR: { color: 'var(--inst-jump)', bg: 'rgba(249, 115, 22, 0.1)' },
    JMP: { color: 'var(--inst-jump)', bg: 'rgba(249, 115, 22, 0.1)' },
    LBL: { color: 'var(--inst-jump)', bg: 'rgba(249, 115, 22, 0.1)' },
  }

  const { color, bg } = typeColors[instruction.type.toUpperCase()] || { color: 'var(--text-tertiary)', bg: 'var(--surface-3)' }

  // Diff status overlay
  let diffBg = ''
  let diffBorder = ''
  let opacity = 1

  switch (status) {
    case 'added':
      diffBg = 'var(--diff-added-bg)'
      diffBorder = 'var(--diff-added-border)'
      break
    case 'removed':
      diffBg = 'var(--diff-removed-bg)'
      diffBorder = 'var(--diff-removed-border)'
      opacity = showAsRemoved ? 0.6 : 1
      break
    case 'modified':
      diffBg = 'var(--diff-modified-bg)'
      diffBorder = 'var(--diff-modified-border)'
      break
  }

  return (
    <div
      className="inline-flex flex-col items-center px-3 py-2 rounded text-xs font-mono"
      style={{
        background: diffBg || bg,
        border: `1px solid ${diffBorder || 'var(--border-subtle)'}`,
        opacity,
        textDecoration: showAsRemoved ? 'line-through' : 'none'
      }}
    >
      <span className="font-bold" style={{ color }}>{instruction.type}</span>
      {instruction.operands.length > 0 && (
        <span className="text-[10px] mt-1" style={{ color: 'var(--text-secondary)' }}>
          {instruction.operands.slice(0, 2).join(', ')}
          {instruction.operands.length > 2 && '...'}
        </span>
      )}
    </div>
  )
}

interface RungDiffViewProps {
  diff: RungDiffResult
  viewMode: 'side-by-side' | 'unified'
  showDetails?: boolean
}

export function RungDiffView({ diff, viewMode, showDetails = true }: RungDiffViewProps) {
  const [expanded, setExpanded] = useState(diff.status !== 'unchanged')

  if (diff.status === 'unchanged' && !showDetails) {
    return null
  }

  const rungNumber = diff.afterRung?.number ?? diff.beforeRung?.number ?? 0
  const beforeComment = diff.beforeRung?.comment
  const afterComment = diff.afterRung?.comment
  const commentChanged = beforeComment !== afterComment

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
        className="flex items-center justify-between px-4 py-2 cursor-pointer"
        style={{ background: 'var(--surface-3)' }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <IconChevronDown open={expanded} />
          <span className="font-mono text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Rung {rungNumber}
          </span>
          <DiffBadge status={diff.status} small />
          {diff.matchConfidence !== undefined && diff.matchConfidence < 0.9 && diff.status === 'modified' && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-4)', color: 'var(--text-muted)' }}>
              {Math.round(diff.matchConfidence * 100)}% match
            </span>
          )}
        </div>
        <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {diff.instructionDiffs.filter(d => d.status !== 'unchanged').length} changes
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="p-4">
          {/* Comment diff */}
          {commentChanged && (
            <div className="mb-4 text-sm">
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Comment</div>
              {beforeComment && (
                <div className="px-3 py-2 rounded mb-1" style={{ background: 'var(--diff-removed-bg)', color: 'var(--diff-removed-text)' }}>
                  <span className="opacity-60">- </span>{beforeComment}
                </div>
              )}
              {afterComment && (
                <div className="px-3 py-2 rounded" style={{ background: 'var(--diff-added-bg)', color: 'var(--diff-added-text)' }}>
                  <span className="opacity-60">+ </span>{afterComment}
                </div>
              )}
            </div>
          )}

          {/* Instruction diffs */}
          {viewMode === 'side-by-side' ? (
            <div className="grid grid-cols-2 gap-4">
              {/* Before column */}
              <div>
                <div className="text-xs font-medium mb-2 px-2 py-1 rounded" style={{ background: 'var(--diff-removed-bg)', color: 'var(--diff-removed-text)' }}>
                  Before
                </div>
                <div className="flex flex-wrap gap-2">
                  {diff.instructionDiffs
                    .filter(d => d.before)
                    .map((d, i) => (
                      <InstructionBlock
                        key={`before-${i}`}
                        instruction={d.before!}
                        status={d.status === 'unchanged' ? 'unchanged' : d.status === 'added' ? 'unchanged' : d.status}
                        showAsRemoved={d.status === 'removed'}
                      />
                    ))}
                  {diff.instructionDiffs.filter(d => d.before).length === 0 && (
                    <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>(empty)</span>
                  )}
                </div>
              </div>
              {/* After column */}
              <div>
                <div className="text-xs font-medium mb-2 px-2 py-1 rounded" style={{ background: 'var(--diff-added-bg)', color: 'var(--diff-added-text)' }}>
                  After
                </div>
                <div className="flex flex-wrap gap-2">
                  {diff.instructionDiffs
                    .filter(d => d.after)
                    .map((d, i) => (
                      <InstructionBlock
                        key={`after-${i}`}
                        instruction={d.after!}
                        status={d.status === 'unchanged' ? 'unchanged' : d.status === 'removed' ? 'unchanged' : d.status}
                      />
                    ))}
                  {diff.instructionDiffs.filter(d => d.after).length === 0 && (
                    <span className="text-xs italic" style={{ color: 'var(--text-muted)' }}>(empty)</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Unified view */
            <div className="flex flex-wrap gap-2">
              {diff.instructionDiffs.map((d, i) => {
                if (d.status === 'removed') {
                  return (
                    <InstructionBlock
                      key={`unified-${i}`}
                      instruction={d.before!}
                      status="removed"
                      showAsRemoved
                    />
                  )
                }
                if (d.status === 'added') {
                  return (
                    <InstructionBlock
                      key={`unified-${i}`}
                      instruction={d.after!}
                      status="added"
                    />
                  )
                }
                if (d.status === 'modified') {
                  return (
                    <div key={`unified-${i}`} className="flex items-center gap-1">
                      <InstructionBlock instruction={d.before!} status="removed" showAsRemoved />
                      <span style={{ color: 'var(--text-muted)' }}>-&gt;</span>
                      <InstructionBlock instruction={d.after!} status="added" />
                    </div>
                  )
                }
                return (
                  <InstructionBlock
                    key={`unified-${i}`}
                    instruction={d.after || d.before!}
                    status="unchanged"
                  />
                )
              })}
            </div>
          )}

          {/* Change details */}
          {diff.instructionDiffs.some(d => d.changes && d.changes.length > 0) && (
            <div className="mt-4 pt-4 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="text-xs font-medium mb-2" style={{ color: 'var(--text-muted)' }}>Change Details</div>
              <ul className="text-xs space-y-1" style={{ color: 'var(--text-secondary)' }}>
                {diff.instructionDiffs
                  .filter(d => d.changes && d.changes.length > 0)
                  .flatMap((d, i) =>
                    d.changes!.map((change, j) => (
                      <li key={`change-${i}-${j}`} className="font-mono">
                        <span style={{ color: 'var(--inst-timer)' }}>{d.before?.type || d.after?.type}</span>: {change}
                      </li>
                    ))
                  )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

interface RungDiffProps {
  beforeRung?: Rung
  afterRung?: Rung
  viewMode?: 'side-by-side' | 'unified'
}

export function RungDiff({ beforeRung, afterRung, viewMode = 'side-by-side' }: RungDiffProps) {
  const diff = useMemo(() => diffRung(beforeRung, afterRung), [beforeRung, afterRung])

  return <RungDiffView diff={diff} viewMode={viewMode} />
}

export default RungDiff
