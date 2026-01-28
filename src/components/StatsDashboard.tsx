'use client'

import { useState, useMemo } from 'react'

// Types matching the project data structure
interface Tag {
  id: string
  name: string
  dataType: string
  scope: string
  description: string | null
}

interface Rung {
  id: string
  number: number
  comment: string | null
  rawText: string
  instructions: string | null
  explanation: string | null
}

interface Routine {
  id: string
  name: string
  type: string
  description: string | null
  rungs: Rung[]
}

interface Program {
  id: string
  name: string
  description: string | null
  disabled: boolean
  routines: Routine[]
}

interface Project {
  id: string
  name: string
  processorType: string | null
  tags: Tag[]
  programs: Program[]
}

interface StatsDashboardProps {
  project: Project
  position?: 'sidebar' | 'floating'
  defaultCollapsed?: boolean
}

// Icons
const IconChevron = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{
      transition: 'transform 0.2s ease',
      transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)'
    }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const IconStats = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 20V10M12 20V4M6 20v-6" />
  </svg>
)

const IconInput = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 12h14M12 5l7 7-7 7" />
  </svg>
)

const IconOutput = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <circle cx="12" cy="12" r="8" />
  </svg>
)

const IconTimer = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)

const IconCounter = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M9 12h6M12 9v6" />
  </svg>
)

const IconRung = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="6" width="4" height="12" rx="1" />
    <rect x="17" y="6" width="4" height="12" rx="1" />
    <path d="M7 12h10" />
  </svg>
)

const IconProgram = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 9h6M9 13h6M9 17h4" />
  </svg>
)

const IconRoutine = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const IconMath = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 12h16M12 4v16M7 7l10 10M7 17L17 7" />
  </svg>
)

const IconMove = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 9l4-4 4 4M9 5v14M19 15l-4 4-4-4M15 19V5" />
  </svg>
)

const IconJump = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M7 17l9.2-9.2M17 17V7H7" />
  </svg>
)

const IconCompare = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M8 7h12M8 12h8M8 17h12M4 7h.01M4 12h.01M4 17h.01" />
  </svg>
)

// Instruction category definitions
const INPUT_INSTRUCTIONS = ['XIC', 'XIO', 'ONS', 'OSR', 'OSF']
const OUTPUT_INSTRUCTIONS = ['OTE', 'OTL', 'OTU']
const TIMER_INSTRUCTIONS = ['TON', 'TOF', 'RTO', 'TONR', 'TOFR']
const COUNTER_INSTRUCTIONS = ['CTU', 'CTD', 'CTUD', 'RES']
const COMPARE_INSTRUCTIONS = ['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM', 'CMP']
const MATH_INSTRUCTIONS = ['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SQR', 'SQRT', 'ABS', 'NEG', 'CPT']
const MOVE_INSTRUCTIONS = ['MOV', 'MVM', 'MVMT', 'COP', 'CPS', 'FLL', 'CLR']
const JUMP_INSTRUCTIONS = ['JSR', 'RET', 'JMP', 'LBL', 'SBR', 'FOR', 'NXT', 'BRK']

// Parse instructions from rawText
function parseInstructionsFromText(rawText: string): string[] {
  // Match instruction patterns like XIC(tag), TON(timer,preset,accum), etc.
  const instructionPattern = /\b([A-Z]{2,5})\s*\(/g
  const instructions: string[] = []
  let match

  while ((match = instructionPattern.exec(rawText)) !== null) {
    instructions.push(match[1].toUpperCase())
  }

  return instructions
}

// Stat card component
function StatCard({
  label,
  value,
  icon,
  color,
  subItems
}: {
  label: string
  value: number
  icon: React.ReactNode
  color: string
  subItems?: Array<{ label: string; value: number }>
}) {
  const [expanded, setExpanded] = useState(false)
  const hasSubItems = subItems && subItems.length > 0 && subItems.some(item => item.value > 0)

  return (
    <div
      className="rounded-lg p-3 transition-all duration-200"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      <div
        className={`flex items-center justify-between ${hasSubItems ? 'cursor-pointer' : ''}`}
        onClick={() => hasSubItems && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-md flex items-center justify-center"
            style={{ background: `${color}20`, color }}
          >
            {icon}
          </div>
          <div>
            <div className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
              {label}
            </div>
            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {value.toLocaleString()}
            </div>
          </div>
        </div>
        {hasSubItems && (
          <IconChevron expanded={expanded} />
        )}
      </div>

      {/* Sub-items */}
      {expanded && hasSubItems && (
        <div
          className="mt-3 pt-3 space-y-1"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          {subItems.filter(item => item.value > 0).map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs px-2 py-1 rounded"
              style={{ background: 'var(--surface-3)' }}
            >
              <span style={{ color: 'var(--text-tertiary)' }}>{item.label}</span>
              <span style={{ color: 'var(--text-secondary)' }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Main dashboard component
export function StatsDashboard({
  project,
  position = 'floating',
  defaultCollapsed = false
}: StatsDashboardProps) {
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

  // Calculate all statistics
  const stats = useMemo(() => {
    const instructionCounts: Record<string, number> = {}
    let totalRungs = 0
    let totalRoutines = 0

    // Iterate through all programs, routines, and rungs
    project.programs.forEach(program => {
      program.routines.forEach(routine => {
        totalRoutines++
        routine.rungs.forEach(rung => {
          totalRungs++
          const instructions = parseInstructionsFromText(rung.rawText)
          instructions.forEach(inst => {
            instructionCounts[inst] = (instructionCounts[inst] || 0) + 1
          })
        })
      })
    })

    // Calculate category totals
    const inputCount = INPUT_INSTRUCTIONS.reduce((sum, inst) => sum + (instructionCounts[inst] || 0), 0)
    const outputCount = OUTPUT_INSTRUCTIONS.reduce((sum, inst) => sum + (instructionCounts[inst] || 0), 0)
    const timerCount = TIMER_INSTRUCTIONS.reduce((sum, inst) => sum + (instructionCounts[inst] || 0), 0)
    const counterCount = COUNTER_INSTRUCTIONS.reduce((sum, inst) => sum + (instructionCounts[inst] || 0), 0)
    const compareCount = COMPARE_INSTRUCTIONS.reduce((sum, inst) => sum + (instructionCounts[inst] || 0), 0)
    const mathCount = MATH_INSTRUCTIONS.reduce((sum, inst) => sum + (instructionCounts[inst] || 0), 0)
    const moveCount = MOVE_INSTRUCTIONS.reduce((sum, inst) => sum + (instructionCounts[inst] || 0), 0)
    const jumpCount = JUMP_INSTRUCTIONS.reduce((sum, inst) => sum + (instructionCounts[inst] || 0), 0)

    // Get sub-item breakdowns
    const inputBreakdown = INPUT_INSTRUCTIONS.map(inst => ({
      label: inst,
      value: instructionCounts[inst] || 0
    }))
    const outputBreakdown = OUTPUT_INSTRUCTIONS.map(inst => ({
      label: inst,
      value: instructionCounts[inst] || 0
    }))
    const timerBreakdown = TIMER_INSTRUCTIONS.map(inst => ({
      label: inst,
      value: instructionCounts[inst] || 0
    }))
    const counterBreakdown = COUNTER_INSTRUCTIONS.map(inst => ({
      label: inst,
      value: instructionCounts[inst] || 0
    }))
    const compareBreakdown = COMPARE_INSTRUCTIONS.map(inst => ({
      label: inst,
      value: instructionCounts[inst] || 0
    }))
    const mathBreakdown = MATH_INSTRUCTIONS.map(inst => ({
      label: inst,
      value: instructionCounts[inst] || 0
    }))
    const moveBreakdown = MOVE_INSTRUCTIONS.map(inst => ({
      label: inst,
      value: instructionCounts[inst] || 0
    }))
    const jumpBreakdown = JUMP_INSTRUCTIONS.map(inst => ({
      label: inst,
      value: instructionCounts[inst] || 0
    }))

    return {
      programs: project.programs.length,
      routines: totalRoutines,
      rungs: totalRungs,
      tags: project.tags.length,
      inputs: inputCount,
      outputs: outputCount,
      timers: timerCount,
      counters: counterCount,
      compares: compareCount,
      math: mathCount,
      moves: moveCount,
      jumps: jumpCount,
      instructionCounts,
      inputBreakdown,
      outputBreakdown,
      timerBreakdown,
      counterBreakdown,
      compareBreakdown,
      mathBreakdown,
      moveBreakdown,
      jumpBreakdown
    }
  }, [project])

  const containerStyle = position === 'floating'
    ? {
        position: 'fixed' as const,
        bottom: '20px',
        right: '20px',
        width: isCollapsed ? 'auto' : '320px',
        maxHeight: isCollapsed ? 'auto' : '80vh',
        zIndex: 40,
        boxShadow: 'var(--shadow-lg)'
      }
    : {
        width: '100%'
      }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        ...containerStyle,
        background: 'var(--surface-1)',
        border: '1px solid var(--border-default)'
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{
          background: 'var(--surface-2)',
          borderBottom: isCollapsed ? 'none' : '1px solid var(--border-subtle)'
        }}
      >
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: 'var(--accent-blue-muted)', color: 'var(--accent-blue)' }}
          >
            <IconStats />
          </div>
          <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
            Project Statistics
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isCollapsed && (
            <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {stats.rungs} rungs
            </span>
          )}
          <IconChevron expanded={!isCollapsed} />
        </div>
      </button>

      {/* Content */}
      {!isCollapsed && (
        <div
          className="p-4 space-y-4 overflow-y-auto"
          style={{ maxHeight: position === 'floating' ? 'calc(80vh - 60px)' : 'none' }}
        >
          {/* Overview Section */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
              Overview
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="Programs"
                value={stats.programs}
                icon={<IconProgram />}
                color="var(--accent-blue)"
              />
              <StatCard
                label="Routines"
                value={stats.routines}
                icon={<IconRoutine />}
                color="var(--accent-blue)"
              />
              <StatCard
                label="Rungs"
                value={stats.rungs}
                icon={<IconRung />}
                color="var(--accent-blue)"
              />
              <StatCard
                label="Tags"
                value={stats.tags}
                icon={<IconProgram />}
                color="var(--accent-blue)"
              />
            </div>
          </div>

          {/* Instructions Section */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
              Instructions by Type
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="Inputs"
                value={stats.inputs}
                icon={<IconInput />}
                color="var(--inst-input)"
                subItems={stats.inputBreakdown}
              />
              <StatCard
                label="Outputs"
                value={stats.outputs}
                icon={<IconOutput />}
                color="var(--inst-output)"
                subItems={stats.outputBreakdown}
              />
              <StatCard
                label="Timers"
                value={stats.timers}
                icon={<IconTimer />}
                color="var(--inst-timer)"
                subItems={stats.timerBreakdown}
              />
              <StatCard
                label="Counters"
                value={stats.counters}
                icon={<IconCounter />}
                color="var(--inst-counter)"
                subItems={stats.counterBreakdown}
              />
              <StatCard
                label="Compares"
                value={stats.compares}
                icon={<IconCompare />}
                color="var(--inst-input)"
                subItems={stats.compareBreakdown}
              />
              <StatCard
                label="Math"
                value={stats.math}
                icon={<IconMath />}
                color="var(--inst-math)"
                subItems={stats.mathBreakdown}
              />
              <StatCard
                label="Move/Copy"
                value={stats.moves}
                icon={<IconMove />}
                color="var(--inst-move)"
                subItems={stats.moveBreakdown}
              />
              <StatCard
                label="Jump/Call"
                value={stats.jumps}
                icon={<IconJump />}
                color="var(--inst-jump)"
                subItems={stats.jumpBreakdown}
              />
            </div>
          </div>

          {/* I/O Ratio Bar */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
              Input/Output Ratio
            </h4>
            <div
              className="rounded-lg p-3"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div className="flex items-center justify-between mb-2 text-xs">
                <span style={{ color: 'var(--inst-input)' }}>
                  Inputs: {stats.inputs}
                </span>
                <span style={{ color: 'var(--inst-output)' }}>
                  Outputs: {stats.outputs}
                </span>
              </div>
              <div
                className="h-3 rounded-full overflow-hidden flex"
                style={{ background: 'var(--surface-3)' }}
              >
                {stats.inputs + stats.outputs > 0 && (
                  <>
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(stats.inputs / (stats.inputs + stats.outputs)) * 100}%`,
                        background: 'var(--inst-input)'
                      }}
                    />
                    <div
                      className="h-full transition-all duration-500"
                      style={{
                        width: `${(stats.outputs / (stats.inputs + stats.outputs)) * 100}%`,
                        background: 'var(--inst-output)'
                      }}
                    />
                  </>
                )}
              </div>
              <div className="text-center mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                {stats.inputs + stats.outputs > 0
                  ? `${((stats.inputs / (stats.inputs + stats.outputs)) * 100).toFixed(1)}% inputs`
                  : 'No I/O instructions found'}
              </div>
            </div>
          </div>

          {/* Timer/Counter Summary */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: 'var(--text-muted)' }}>
              Timing & Counting
            </h4>
            <div
              className="rounded-lg p-3"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div className="flex items-center gap-4">
                <div className="flex-1 text-center">
                  <div
                    className="w-10 h-10 rounded-full mx-auto mb-1 flex items-center justify-center"
                    style={{ background: 'rgba(6, 182, 212, 0.15)', color: 'var(--inst-timer)' }}
                  >
                    <IconTimer />
                  </div>
                  <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {stats.timers}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Timers
                  </div>
                </div>
                <div
                  className="w-px h-12"
                  style={{ background: 'var(--border-subtle)' }}
                />
                <div className="flex-1 text-center">
                  <div
                    className="w-10 h-10 rounded-full mx-auto mb-1 flex items-center justify-center"
                    style={{ background: 'rgba(168, 85, 247, 0.15)', color: 'var(--inst-counter)' }}
                  >
                    <IconCounter />
                  </div>
                  <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    {stats.counters}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Counters
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default StatsDashboard
