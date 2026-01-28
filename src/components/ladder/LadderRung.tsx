'use client'

import React, { useState } from 'react'
import { SimulationToggleButton, useSimulation, calculatePowerFlowWithNumeric, getOutputUpdatesWithNumeric, getNumericValueFromOperand, TimerDisplay, CounterDisplay } from './SimulationContext'
import { EditableNumericOperand, TimerCounterEditor } from '../simulation/NumericEditor'
import { TrendChartButton } from '../simulation/TrendChart'

interface Instruction {
  type: string
  operands: string[]
  branch_level?: number  // 0 = main path, 1+ = in branch
  parallel_index?: number  // Which parallel path (0, 1, 2...)
  branchLeg?: number  // RSS parser: which branch leg (1, 2, 3...), undefined = main rung
  branchLevel?: number  // RSS parser: nesting depth (0=main, 1=first nest, etc.)
  branchStart?: boolean  // RSS parser: true if this instruction starts a new branch
  is_input?: boolean  // True for inputs, false for outputs
}

interface CrossRef {
  tag: string
  usedIn: Array<{ routine: string; rungNumber: number; usage: 'read' | 'write' }>
}

interface IoMapping {
  tag: string
  type: 'input' | 'output'
  modulePath: string
  slot: number
  point?: number
  fullAddress: string
  module?: {
    name: string
    catalogNumber: string | null
    productType: string | null
  }
}

interface AoiLogic {
  name: string
  description?: string
  revision?: string
  parameters?: Array<{ name: string; dataType: string; usage: string; description?: string }>
  localTags?: Array<{ name: string; dataType: string; description?: string }>
  logic?: { routines?: Array<{ name: string; rungs: Array<{ number: number; text: string; comment?: string }> }> }
}

interface Condition {
  tag: string
  instruction: string
  requirement: string
  type: 'input' | 'output' | 'compare'
}

interface LadderRungProps {
  rungId: string
  number: number
  comment?: string | null
  rawText: string
  instructions: Instruction[]
  explanation?: string | null
  explanationSource?: 'library' | 'ai' | 'hybrid' | 'learned' | null
  troubleshooting?: string[]
  deviceTypes?: string[]
  crossRefs?: CrossRef[]
  ioMappings?: IoMapping[]
  conditions?: Condition[]  // Condition breakdown for fault finding
  onExplain?: (rungId: string) => Promise<void>
  tagDescriptions?: Record<string, string>  // Map of tag name -> description
  projectId?: string  // Needed for AOI expansion
  aoiNames?: string[]  // List of AOI names in this project
  isBookmarked?: boolean  // Whether this rung is bookmarked
  onToggleBookmark?: (rungId: string) => void  // Toggle bookmark callback
  forcedTags?: Record<string, 'on' | 'off' | null>  // Tags that are forced (tag name -> force state)
  // Tag search highlighting props
  searchTerm?: string  // Search term for highlighting matching operands
  currentSearchMatchIndex?: number  // The currently focused match index (for scroll-to and highlight focus)
  searchMatchStartIndex?: number  // Starting index of matches in this rung within the global match list
  // Keyboard navigation props
  isSelected?: boolean  // Whether this rung is selected via keyboard navigation
  selectedInstructionIndex?: number | null  // Index of the selected instruction within this rung
  onInstructionSelect?: (instructionIndex: number) => void  // Callback when an instruction is clicked/selected
  // Cross-reference navigation props
  onTagXRef?: (tagName: string) => void  // Callback when a tag is clicked for cross-reference
  routineName?: string  // Current routine name for cross-reference display
}

// Helper to check if an operand matches the search term (partial, case-insensitive)
function operandMatchesSearch(operand: string, searchTerm: string): boolean {
  if (!searchTerm || !operand) return false
  const symbol = operand.includes('\u00A7') ? operand.split('\u00A7')[0] : operand
  return symbol.toUpperCase().includes(searchTerm.toUpperCase())
}

// Helper to check if any operand in an instruction matches the search term
function instructionMatchesSearch(inst: Instruction, searchTerm: string): boolean {
  if (!searchTerm) return false
  return inst.operands.some(op => operandMatchesSearch(op, searchTerm))
}

// Instruction categories with their visual styling
const INSTRUCTION_CONFIG: Record<string, { color: string; bg: string; border: string; label: string; isContact?: boolean; isCoil?: boolean }> = {
  // Input instructions - Contacts
  XIC: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'Examine If Closed', isContact: true },
  XIO: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'Examine If Open', isContact: true },
  ONS: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'One Shot' },
  OSR: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'One Shot Rising' },
  OSF: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'One Shot Falling' },

  // Comparison
  EQU: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'Equal' },
  NEQ: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'Not Equal' },
  LES: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'Less Than' },
  LEQ: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'Less or Equal' },
  GRT: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'Greater Than' },
  GEQ: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'Greater or Equal' },
  LIM: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'Limit Test' },
  CMP: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'Compare' },

  // Output instructions - Coils
  OTE: { color: 'var(--inst-output)', bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.25)', label: 'Output Energize', isCoil: true },
  OTL: { color: 'var(--inst-output)', bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.25)', label: 'Output Latch', isCoil: true },
  OTU: { color: 'var(--inst-output)', bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.25)', label: 'Output Unlatch', isCoil: true },

  // Timers
  TON: { color: 'var(--inst-timer)', bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.25)', label: 'Timer On Delay' },
  TOF: { color: 'var(--inst-timer)', bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.25)', label: 'Timer Off Delay' },
  RTO: { color: 'var(--inst-timer)', bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.25)', label: 'Retentive Timer' },
  TONR: { color: 'var(--inst-timer)', bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.25)', label: 'Timer On w/ Reset' },
  TOFR: { color: 'var(--inst-timer)', bg: 'rgba(6, 182, 212, 0.1)', border: 'rgba(6, 182, 212, 0.25)', label: 'Timer Off w/ Reset' },

  // Counters
  CTU: { color: 'var(--inst-counter)', bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.25)', label: 'Count Up' },
  CTD: { color: 'var(--inst-counter)', bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.25)', label: 'Count Down' },
  CTUD: { color: 'var(--inst-counter)', bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.25)', label: 'Count Up/Down' },
  RES: { color: 'var(--inst-counter)', bg: 'rgba(168, 85, 247, 0.1)', border: 'rgba(168, 85, 247, 0.25)', label: 'Reset' },

  // Math
  ADD: { color: 'var(--inst-math)', bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.25)', label: 'Add' },
  SUB: { color: 'var(--inst-math)', bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.25)', label: 'Subtract' },
  MUL: { color: 'var(--inst-math)', bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.25)', label: 'Multiply' },
  DIV: { color: 'var(--inst-math)', bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.25)', label: 'Divide' },
  MOD: { color: 'var(--inst-math)', bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.25)', label: 'Modulo' },
  SQR: { color: 'var(--inst-math)', bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.25)', label: 'Square' },
  SQRT: { color: 'var(--inst-math)', bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.25)', label: 'Square Root' },
  ABS: { color: 'var(--inst-math)', bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.25)', label: 'Absolute' },
  NEG: { color: 'var(--inst-math)', bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.25)', label: 'Negate' },
  CPT: { color: 'var(--inst-math)', bg: 'rgba(236, 72, 153, 0.1)', border: 'rgba(236, 72, 153, 0.25)', label: 'Compute' },

  // Move
  MOV: { color: 'var(--inst-move)', bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.25)', label: 'Move' },
  MVM: { color: 'var(--inst-move)', bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.25)', label: 'Masked Move' },
  MVMT: { color: 'var(--inst-move)', bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.25)', label: 'Masked Move w/ Target' },
  COP: { color: 'var(--inst-move)', bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.25)', label: 'Copy' },
  CPS: { color: 'var(--inst-move)', bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.25)', label: 'Sync Copy' },
  FLL: { color: 'var(--inst-move)', bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.25)', label: 'Fill' },
  CLR: { color: 'var(--inst-move)', bg: 'rgba(99, 102, 241, 0.1)', border: 'rgba(99, 102, 241, 0.25)', label: 'Clear' },

  // Program control
  JSR: { color: 'var(--inst-jump)', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.25)', label: 'Jump Subroutine' },
  RET: { color: 'var(--inst-jump)', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.25)', label: 'Return' },
  JMP: { color: 'var(--inst-jump)', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.25)', label: 'Jump' },
  LBL: { color: 'var(--inst-jump)', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.25)', label: 'Label' },
  SBR: { color: 'var(--inst-jump)', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.25)', label: 'Subroutine' },
  FOR: { color: 'var(--inst-jump)', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.25)', label: 'For Loop' },
  NXT: { color: 'var(--inst-jump)', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.25)', label: 'Next' },
  BRK: { color: 'var(--inst-jump)', bg: 'rgba(249, 115, 22, 0.1)', border: 'rgba(249, 115, 22, 0.25)', label: 'Break' },
}

// Parameter labels for instructions (like Logix Designer)
const PARAM_LABELS: Record<string, string[]> = {
  // Timers
  TON: ['Timer', 'Preset', 'Accum'],
  TOF: ['Timer', 'Preset', 'Accum'],
  RTO: ['Timer', 'Preset', 'Accum'],
  TONR: ['Timer', 'Preset', 'Accum'],
  TOFR: ['Timer', 'Preset', 'Accum'],
  // Counters
  CTU: ['Counter', 'Preset', 'Accum'],
  CTD: ['Counter', 'Preset', 'Accum'],
  CTUD: ['Counter', 'Preset', 'Accum'],
  RES: ['Structure'],
  // Compare
  EQU: ['Source A', 'Source B'],
  NEQ: ['Source A', 'Source B'],
  LES: ['Source A', 'Source B'],
  LEQ: ['Source A', 'Source B'],
  GRT: ['Source A', 'Source B'],
  GEQ: ['Source A', 'Source B'],
  LIM: ['Low Limit', 'Test', 'High Limit'],
  CMP: ['Expression'],
  // Math
  ADD: ['Source A', 'Source B', 'Dest'],
  SUB: ['Source A', 'Source B', 'Dest'],
  MUL: ['Source A', 'Source B', 'Dest'],
  DIV: ['Source A', 'Source B', 'Dest'],
  MOD: ['Source A', 'Source B', 'Dest'],
  NEG: ['Source', 'Dest'],
  ABS: ['Source', 'Dest'],
  CPT: ['Dest', 'Expression'],
  // Move
  MOV: ['Source', 'Dest'],
  MVM: ['Source', 'Mask', 'Dest'],
  COP: ['Source', 'Dest', 'Length'],
  FLL: ['Source', 'Dest', 'Length'],
  CLR: ['Dest'],
  // Program
  JSR: ['Routine', 'Input Par', 'Return Par'],
  JMP: ['Label'],
  LBL: ['Label'],
}

const DEFAULT_CONFIG = {
  color: 'var(--text-tertiary)',
  bg: 'var(--surface-3)',
  border: 'var(--border-default)',
  label: 'Unknown'
}

function getInstructionConfig(type: string) {
  return INSTRUCTION_CONFIG[type.toUpperCase()] || DEFAULT_CONFIG
}

function getParamLabels(type: string): string[] {
  return PARAM_LABELS[type.toUpperCase()] || []
}

// Icons
const IconCode = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="16,18 22,12 16,6" />
    <polyline points="8,6 2,12 8,18" />
  </svg>
)

const IconSparkles = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
    <circle cx="12" cy="12" r="4" />
  </svg>
)

const IconExpand = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
  </svg>
)

const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconCopy = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
)

const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconBookmark = ({ filled }: { filled?: boolean }) => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
    <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
  </svg>
)

const IconTrace = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
  </svg>
)

const IconArrowUp = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 19V5M5 12l7-7 7 7" />
  </svg>
)

const IconArrowDown = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12l7 7 7-7" />
  </svg>
)

const IconSimilar = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="7" rx="1" />
    <rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" />
    <rect x="14" y="14" width="7" height="7" rx="1" />
  </svg>
)

// Similar rung result interface
interface SimilarRung {
  rungId: string
  program: string
  routine: string
  rungNumber: number
  rungText: string
  rungComment?: string
  similarity: number
  matchType: 'exact' | 'structure' | 'pattern' | 'partial'
  matchDetails: string
}

interface SimilarResult {
  sourcePattern: string[]
  sourceTagBases: string[]
  summary: {
    exact: number
    structure: number
    pattern: number
    partial: number
    total: number
  }
  similarRungs: SimilarRung[]
}

// Trace result interface
interface TraceCondition {
  tag: string
  instruction: string
  type: 'input' | 'compare' | 'timer' | 'counter' | 'other'
  negated: boolean
}

interface TraceLocation {
  program: string
  routine: string
  rungNumber: number
  rungId: string
  rungText: string
  rungComment?: string
}

interface TraceSource {
  location: TraceLocation
  conditions: TraceCondition[]
  outputInstruction: string
}

interface TraceTarget {
  location: TraceLocation
  instruction: string
  effect: string
}

interface TraceResult {
  tag: string
  type: 'output' | 'input'
  directSources: TraceSource[]
  directTargets: TraceTarget[]
}

// Force indicator badge - RSLogix style with amber/yellow coloring
function ForceBadge({ type }: { type: 'on' | 'off' }) {
  return (
    <span
      className="force-badge"
      style={{
        position: 'absolute',
        top: '-8px',
        left: '50%',
        transform: 'translateX(-50%)',
        fontSize: '9px',
        fontWeight: 700,
        padding: '1px 4px',
        borderRadius: '3px',
        background: type === 'on'
          ? 'linear-gradient(180deg, #f59e0b 0%, #d97706 100%)'
          : 'linear-gradient(180deg, #eab308 0%, #ca8a04 100%)',
        color: '#000',
        boxShadow: type === 'on'
          ? '0 0 8px rgba(245, 158, 11, 0.8), 0 1px 3px rgba(0,0,0,0.4)'
          : '0 0 8px rgba(234, 179, 8, 0.8), 0 1px 3px rgba(0,0,0,0.4)',
        border: '1px solid rgba(0,0,0,0.2)',
        zIndex: 25,
        whiteSpace: 'nowrap',
        letterSpacing: '0.5px'
      }}
      title={type === 'on' ? 'FORCED ON - Right-click to change' : 'FORCED OFF - Right-click to change'}
    >
      F
    </span>
  )
}

// AOI Modal Component
function AoiModal({
  aoi,
  onClose
}: {
  aoi: AoiLogic
  onClose: () => void
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
        style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-3)' }}
        >
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {aoi.name}
            </h2>
            {aoi.description && (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {aoi.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <IconClose />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 60px)' }}>
          {/* Parameters */}
          {aoi.parameters && aoi.parameters.length > 0 && (
            <div className="mb-4">
              <h3
                className="text-sm font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--accent-blue)' }}
              >
                Parameters
              </h3>
              <div className="space-y-1">
                {aoi.parameters.map((param, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 text-sm px-2 py-1 rounded"
                    style={{ background: 'var(--surface-1)' }}
                  >
                    <span
                      className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                      style={{
                        background: param.usage === 'Input' ? 'var(--accent-emerald-muted)' : param.usage === 'Output' ? 'var(--accent-amber-muted)' : 'var(--surface-3)',
                        color: param.usage === 'Input' ? 'var(--accent-emerald)' : param.usage === 'Output' ? 'var(--accent-amber)' : 'var(--text-muted)'
                      }}
                    >
                      {param.usage}
                    </span>
                    <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                      {param.name}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}>: {param.dataType}</span>
                    {param.description && (
                      <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                        - {param.description}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Local Tags */}
          {aoi.localTags && aoi.localTags.length > 0 && (
            <div className="mb-4">
              <h3
                className="text-sm font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--accent-purple)' }}
              >
                Local Tags
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-1 text-xs">
                {aoi.localTags.map((tag, i) => (
                  <div
                    key={i}
                    className="px-2 py-1 rounded"
                    style={{ background: 'var(--surface-1)' }}
                  >
                    <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                      {tag.name}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}> : {tag.dataType}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Logic */}
          {aoi.logic?.routines && aoi.logic.routines.length > 0 && (
            <div>
              <h3
                className="text-sm font-semibold uppercase tracking-wider mb-2"
                style={{ color: 'var(--accent-cyan)' }}
              >
                Internal Logic
              </h3>
              {aoi.logic.routines.map((routine, ri) => (
                <div key={ri} className="mb-4">
                  <div
                    className="text-xs font-medium px-2 py-1 rounded-t"
                    style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}
                  >
                    Routine: {routine.name}
                  </div>
                  <div
                    className="rounded-b overflow-hidden"
                    style={{ border: '1px solid var(--border-subtle)' }}
                  >
                    {routine.rungs.map((rung, rungIdx) => (
                      <div
                        key={rungIdx}
                        className="px-3 py-2 border-b last:border-b-0"
                        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-1)' }}
                      >
                        <div className="flex items-start gap-2">
                          <span
                            className="font-mono text-[10px] px-1.5 py-0.5 rounded flex-shrink-0"
                            style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                          >
                            {rung.number}
                          </span>
                          <div className="flex-1 min-w-0">
                            {rung.comment && (
                              <div
                                className="text-xs italic mb-1"
                                style={{ color: 'var(--text-tertiary)' }}
                              >
                                {rung.comment}
                              </div>
                            )}
                            <pre
                              className="text-xs font-mono whitespace-pre-wrap break-all"
                              style={{ color: 'var(--text-secondary)' }}
                            >
                              {rung.text}
                            </pre>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!aoi.logic?.routines?.length && (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              No internal logic available for this Add-On Instruction
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Trace Modal Component
function TraceModal({
  traceResult,
  onClose,
  direction
}: {
  traceResult: TraceResult
  onClose: () => void
  direction: 'sources' | 'targets'
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative max-w-3xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
        style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-3)' }}
        >
          <div className="flex items-center gap-2">
            <IconTrace />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              {direction === 'sources' ? 'What turns ON' : 'What is affected by'}: <code className="text-base" style={{ color: 'var(--accent-blue)' }}>{traceResult.tag}</code>
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <IconClose />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 60px)' }}>
          {direction === 'sources' ? (
            // Show what turns this ON (sources)
            traceResult.directSources.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Found {traceResult.directSources.length} location{traceResult.directSources.length !== 1 ? 's' : ''} where this tag is SET:
                </p>
                {traceResult.directSources.map((source, i) => (
                  <div
                    key={i}
                    className="rounded-lg overflow-hidden"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
                  >
                    {/* Location header */}
                    <div
                      className="px-3 py-2 flex items-center justify-between"
                      style={{ background: 'var(--surface-3)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--surface-4)', color: 'var(--text-secondary)' }}>
                          {source.location.program}/{source.location.routine}
                        </span>
                        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--accent-amber)' }}>
                          Rung {source.location.rungNumber}
                        </span>
                      </div>
                      <code className="text-xs" style={{ color: 'var(--accent-emerald)' }}>
                        {source.outputInstruction}
                      </code>
                    </div>

                    {/* Comment if available */}
                    {source.location.rungComment && (
                      <div className="px-3 py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                        <span className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                          {source.location.rungComment}
                        </span>
                      </div>
                    )}

                    {/* Conditions that enable this */}
                    {source.conditions.length > 0 && (
                      <div className="px-3 py-2">
                        <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                          Required Conditions
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {source.conditions.map((cond, j) => (
                            <span
                              key={j}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-mono"
                              style={{
                                background: cond.negated ? 'var(--accent-red-muted)' : 'var(--accent-emerald-muted)',
                                color: cond.negated ? 'var(--accent-red)' : 'var(--accent-emerald)'
                              }}
                            >
                              {cond.negated ? '!' : ''}{cond.instruction}({cond.tag})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                <IconTrace />
                <p className="mt-2">No sources found for this tag.</p>
                <p className="text-xs mt-1">This tag may be set by external logic, AOIs, or hardware input.</p>
              </div>
            )
          ) : (
            // Show what this affects (targets)
            traceResult.directTargets.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  Found {traceResult.directTargets.length} location{traceResult.directTargets.length !== 1 ? 's' : ''} where this tag is READ:
                </p>
                {traceResult.directTargets.map((target, i) => (
                  <div
                    key={i}
                    className="rounded-lg overflow-hidden"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
                  >
                    <div
                      className="px-3 py-2 flex items-center justify-between"
                      style={{ background: 'var(--surface-3)' }}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--surface-4)', color: 'var(--text-secondary)' }}>
                          {target.location.program}/{target.location.routine}
                        </span>
                        <span className="font-mono text-xs font-semibold" style={{ color: 'var(--accent-amber)' }}>
                          Rung {target.location.rungNumber}
                        </span>
                      </div>
                    </div>

                    {target.location.rungComment && (
                      <div className="px-3 py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                        <span className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                          {target.location.rungComment}
                        </span>
                      </div>
                    )}

                    <div className="px-3 py-2">
                      <div className="text-xs" style={{ color: 'var(--accent-blue)' }}>
                        {target.effect}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                <IconTrace />
                <p className="mt-2">No targets found for this tag.</p>
                <p className="text-xs mt-1">This tag may only affect hardware outputs or external systems.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// Similar Logic Modal Component
function SimilarModal({
  similarResult,
  onClose
}: {
  similarResult: SimilarResult
  onClose: () => void
}) {
  const getMatchColor = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'var(--accent-emerald)'
      case 'structure': return 'var(--accent-blue)'
      case 'pattern': return 'var(--accent-purple)'
      default: return 'var(--accent-amber)'
    }
  }

  const getMatchBg = (matchType: string) => {
    switch (matchType) {
      case 'exact': return 'var(--accent-emerald-muted)'
      case 'structure': return 'var(--accent-blue-muted)'
      case 'pattern': return 'var(--accent-purple-muted)'
      default: return 'var(--accent-amber-muted)'
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative max-w-4xl w-full max-h-[80vh] overflow-hidden shadow-2xl"
        style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius-md)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-3)' }}
        >
          <div className="flex items-center gap-2">
            <IconSimilar />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Similar Logic Found
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-white/10 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <IconClose />
          </button>
        </div>

        {/* Summary */}
        <div className="px-4 py-3 border-b flex flex-wrap gap-4" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold" style={{ color: 'var(--text-muted)' }}>Found:</span>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{similarResult.summary.total} similar rungs</span>
          </div>
          {similarResult.summary.exact > 0 && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: getMatchBg('exact'), color: getMatchColor('exact') }}>
              {similarResult.summary.exact} exact
            </span>
          )}
          {similarResult.summary.structure > 0 && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: getMatchBg('structure'), color: getMatchColor('structure') }}>
              {similarResult.summary.structure} structural
            </span>
          )}
          {similarResult.summary.pattern > 0 && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: getMatchBg('pattern'), color: getMatchColor('pattern') }}>
              {similarResult.summary.pattern} pattern
            </span>
          )}
          {similarResult.summary.partial > 0 && (
            <span className="text-xs px-2 py-0.5 rounded" style={{ background: getMatchBg('partial'), color: getMatchColor('partial') }}>
              {similarResult.summary.partial} partial
            </span>
          )}
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4" style={{ maxHeight: 'calc(80vh - 120px)' }}>
          {similarResult.similarRungs.length > 0 ? (
            <div className="space-y-3">
              {similarResult.similarRungs.map((rung, i) => (
                <div
                  key={rung.rungId}
                  className="rounded-lg overflow-hidden animate-fade-in"
                  style={{
                    background: 'var(--surface-1)',
                    border: '1px solid var(--border-subtle)',
                    animationDelay: `${i * 30}ms`
                  }}
                >
                  {/* Rung header */}
                  <div
                    className="px-3 py-2 flex items-center justify-between"
                    style={{ background: 'var(--surface-3)' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'var(--surface-4)', color: 'var(--text-secondary)' }}>
                        {rung.program}/{rung.routine}
                      </span>
                      <span className="font-mono text-xs font-semibold" style={{ color: 'var(--accent-amber)' }}>
                        Rung {rung.rungNumber}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs px-2 py-0.5 rounded" style={{ background: getMatchBg(rung.matchType), color: getMatchColor(rung.matchType) }}>
                        {rung.matchType}
                      </span>
                      <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                        {Math.round(rung.similarity * 100)}%
                      </span>
                    </div>
                  </div>

                  {/* Comment if available */}
                  {rung.rungComment && (
                    <div className="px-3 py-1.5 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                      <span className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
                        {rung.rungComment}
                      </span>
                    </div>
                  )}

                  {/* Match details */}
                  <div className="px-3 py-2">
                    <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                      {rung.matchDetails}
                    </p>
                    <pre
                      className="text-[10px] font-mono whitespace-pre-wrap break-all p-2 rounded"
                      style={{ background: 'var(--surface-0)', color: 'var(--text-tertiary)' }}
                    >
                      {rung.rungText}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
              <IconSimilar />
              <p className="mt-2">No similar logic found.</p>
              <p className="text-xs mt-1">This rung appears to be unique in the project.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

const SOURCE_LABELS: Record<string, { label: string }> = {
  library: { label: 'Explanation' },
  ai: { label: 'AI Analysis' },
  hybrid: { label: 'Hybrid' },
  learned: { label: 'Learned' }
}

// Format explanation text for better readability - matches AI chat style
function formatExplanation(text: string): React.ReactNode {
  if (!text) return text

  const sections: React.ReactNode[] = []
  const lines = text.split('\n')
  let currentSection: { type: 'h2' | 'h3' | 'content'; title: string | null; content: string[] } = { type: 'content', title: null, content: [] }

  const flushSection = () => {
    if (currentSection.title || currentSection.content.length > 0) {
      sections.push(renderSection(currentSection, sections.length))
    }
    currentSection = { type: 'content', title: null, content: [] }
  }

  lines.forEach((line) => {
    // Check for ## Section Header (h2)
    const h2Match = line.match(/^##\s+(.+?):?\s*$/)
    if (h2Match) {
      flushSection()
      currentSection = { type: 'h2', title: h2Match[1], content: [] }
      return
    }

    // Check for **Subsection:** (h3)
    const h3Match = line.match(/^\*\*([^*]+):\*\*\s*$/)
    if (h3Match) {
      flushSection()
      currentSection = { type: 'h3', title: h3Match[1], content: [] }
      return
    }

    // Regular content
    if (line.trim()) {
      currentSection.content.push(line)
    }
  })

  flushSection()

  return <div className="space-y-4">{sections}</div>
}

function renderSection(section: { type: 'h2' | 'h3' | 'content'; title: string | null; content: string[] }, key: number): React.ReactNode {
  // H2 headers get special styling
  if (section.type === 'h2' && section.title) {
    const isMainFunction = section.title === 'Main Function'
    const isPurpose = section.title === 'Purpose'

    return (
      <div key={key} className="space-y-2">
        <div
          className="text-fluid-sm font-semibold pb-1"
          style={{
            color: isMainFunction ? 'var(--accent-blue)' : isPurpose ? 'var(--accent-emerald)' : 'var(--text-primary)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          {section.title}
        </div>
        <div className="space-y-1">
          {section.content.map((line, i) => (
            <div key={i} className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>
              {formatLine(line)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // H3 subsection headers (Branch titles, Conditions, Actions)
  if (section.type === 'h3' && section.title) {
    const isBranch = section.title.startsWith('Branch')

    return (
      <div key={key} className="space-y-1">
        <div
          className="text-fluid-xs font-semibold"
          style={{
            color: isBranch ? 'var(--accent-blue)' : 'var(--text-secondary)',
            paddingLeft: isBranch ? 'var(--space-2)' : '0',
            borderLeft: isBranch ? '2px solid var(--accent-blue)' : 'none'
          }}
        >
          {section.title}
        </div>
        <div className="space-y-0.5 pl-1">
          {section.content.map((line, i) => (
            <div key={i}>
              {formatLine(line)}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Plain content
  return (
    <div key={key} className="space-y-1">
      {section.content.map((line, i) => (
        <div key={i} className="text-fluid-sm" style={{ color: 'var(--text-secondary)' }}>
          {formatLine(line)}
        </div>
      ))}
    </div>
  )
}

function formatLine(line: string): React.ReactNode {
  // Handle bullet points with backtick code: - `XIC(tag)` - explanation
  const bulletCodeMatch = line.match(/^-\s+`([^`]+)`\s+-\s+(.+)/)
  if (bulletCodeMatch) {
    const [, instruction, explanation] = bulletCodeMatch
    const isOutput = /^(OTE|OTL|OTU|MOV|COP|ADD|SUB|MUL|DIV|TON|TOF|CTU|CTD|RES)\(/.test(instruction)
    // Check if explanation is bold (wrapped in **)
    const explBoldMatch = explanation.match(/^\*\*(.+)\*\*$/)

    return (
      <div className="flex items-start gap-2 text-fluid-sm py-0.5">
        <span style={{ color: 'var(--text-muted)' }}>-</span>
        <code
          className="text-fluid-xs font-mono px-1.5 py-0.5 flex-shrink-0"
          style={{
            background: isOutput ? 'var(--accent-amber-muted)' : 'var(--surface-3)',
            color: isOutput ? 'var(--accent-amber)' : 'var(--accent-blue)',
            borderRadius: 'var(--radius-sm)'
          }}
        >
          {instruction}
        </code>
        <span style={{ color: explBoldMatch ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {explBoldMatch ? <strong>{explBoldMatch[1]}</strong> : explanation}
        </span>
      </div>
    )
  }

  // Handle simple bullet points: - something
  const simpleBulletMatch = line.match(/^-\s+(.+)/)
  if (simpleBulletMatch) {
    return (
      <div className="flex items-start gap-2 text-fluid-sm py-0.5">
        <span style={{ color: 'var(--text-muted)' }}>-</span>
        <span style={{ color: 'var(--text-secondary)' }}>{formatInlineText(simpleBulletMatch[1])}</span>
      </div>
    )
  }

  // Handle inline formatting
  return formatInlineText(line)
}

function formatInlineText(text: string): React.ReactNode {
  // Handle bold text: **text** and backticks: `code`
  const parts: React.ReactNode[] = []
  let remaining = text
  let keyIdx = 0

  while (remaining.length > 0) {
    // Find the next special pattern
    const boldMatch = remaining.match(/^(.*?)\*\*([^*]+)\*\*(.*)$/)
    const codeMatch = remaining.match(/^(.*?)`([^`]+)`(.*)$/)

    // Check which comes first
    const boldIndex = boldMatch ? boldMatch[1].length : Infinity
    const codeIndex = codeMatch ? codeMatch[1].length : Infinity

    if (boldIndex === Infinity && codeIndex === Infinity) {
      // No more special patterns
      parts.push(<span key={keyIdx++}>{remaining}</span>)
      break
    }

    if (boldIndex < codeIndex && boldMatch) {
      // Bold comes first
      if (boldMatch[1]) parts.push(<span key={keyIdx++}>{boldMatch[1]}</span>)
      parts.push(<strong key={keyIdx++} style={{ color: 'var(--text-primary)' }}>{boldMatch[2]}</strong>)
      remaining = boldMatch[3]
    } else if (codeMatch) {
      // Code comes first
      if (codeMatch[1]) parts.push(<span key={keyIdx++}>{codeMatch[1]}</span>)
      parts.push(
        <code
          key={keyIdx++}
          className="text-fluid-xs font-mono px-1 py-0.5"
          style={{ background: 'var(--surface-3)', color: 'var(--accent-blue)', borderRadius: 'var(--radius-sm)' }}
        >
          {codeMatch[2]}
        </code>
      )
      remaining = codeMatch[3]
    }
  }

  return parts.length > 0 ? <>{parts}</> : text
}

// Contact Symbol Component -| |- or -|/|-
function ContactSymbol({ type, color }: { type: 'XIC' | 'XIO'; color: string }) {
  const isNC = type === 'XIO'
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" className="flex-shrink-0" style={{ pointerEvents: 'none' }}>
      {/* Left vertical line */}
      <line x1="8" y1="4" x2="8" y2="20" stroke={color} strokeWidth="2" />
      {/* Right vertical line */}
      <line x1="32" y1="4" x2="32" y2="20" stroke={color} strokeWidth="2" />
      {/* Diagonal slash for NC */}
      {isNC && (
        <line x1="12" y1="18" x2="28" y2="6" stroke={color} strokeWidth="2" />
      )}
    </svg>
  )
}

// Coil Symbol Component -( )- or -(L)- or -(U)-
function CoilSymbol({ type, color }: { type: 'OTE' | 'OTL' | 'OTU'; color: string }) {
  const letter = type === 'OTL' ? 'L' : type === 'OTU' ? 'U' : null
  return (
    <svg width="32" height="24" viewBox="0 0 32 24" className="flex-shrink-0" style={{ pointerEvents: 'none' }}>
      {/* Left arc */}
      <path d="M 8 12 A 8 8 0 0 1 8 12" stroke={color} strokeWidth="2" fill="none" />
      <path d="M 6 4 Q 2 12 6 20" stroke={color} strokeWidth="2" fill="none" />
      {/* Right arc */}
      <path d="M 26 4 Q 30 12 26 20" stroke={color} strokeWidth="2" fill="none" />
      {/* Letter for latch/unlatch */}
      {letter && (
        <text x="16" y="16" textAnchor="middle" fill={color} fontSize="12" fontWeight="bold" fontFamily="monospace">
          {letter}
        </text>
      )}
    </svg>
  )
}

// Helper to format timer preset value
function formatTimerPreset(value: string): string {
  const num = parseInt(value, 10)
  if (isNaN(num)) return value
  if (num >= 60000) return `${(num / 60000).toFixed(1)}m`
  if (num >= 1000) return `${(num / 1000).toFixed(1)}s`
  return `${num}ms`
}

// Check if instruction is a timer or counter
function isTimerInstruction(type: string): boolean {
  return ['TON', 'TOF', 'RTO', 'TONR', 'TOFR'].includes(type.toUpperCase())
}

function isCounterInstruction(type: string): boolean {
  return ['CTU', 'CTD', 'CTUD'].includes(type.toUpperCase())
}

// Get color for instruction type
function getInstructionColor(config: typeof DEFAULT_CONFIG): string {
  const colorVar = config.color.replace('var(--inst-', '').replace(')', '')
  switch (colorVar) {
    case 'input': return 'rgb(34, 197, 94)'
    case 'output': return 'rgb(234, 179, 8)'
    case 'timer': return 'rgb(6, 182, 212)'
    case 'counter': return 'rgb(168, 85, 247)'
    case 'math': return 'rgb(236, 72, 153)'
    case 'move': return 'rgb(99, 102, 241)'
    case 'jump': return 'rgb(249, 115, 22)'
    default: return 'rgb(100, 100, 100)'
  }
}

// Check if instruction type is a comparison instruction
function isComparisonInstruction(type: string): boolean {
  return ['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM', 'CMP'].includes(type.toUpperCase())
}

// Check if instruction type is a math instruction
function isMathInstruction(type: string): boolean {
  return ['MOV', 'ADD', 'SUB', 'MUL', 'DIV'].includes(type.toUpperCase())
}

// Instruction Box Component (for timers, counters, math, etc.)
function InstructionBox({
  inst,
  config,
  isHovered,
  onHover,
  isAoi,
  onExpandAoi,
  isSearchMatch,
  isCurrentSearchMatch
}: {
  inst: Instruction
  config: typeof DEFAULT_CONFIG
  isHovered: boolean
  onHover: (hovered: boolean) => void
  isAoi?: boolean
  onExpandAoi?: () => void
  isSearchMatch?: boolean
  isCurrentSearchMatch?: boolean
}) {
  const paramLabels = getParamLabels(inst.type)
  const hasParams = paramLabels.length > 0 && inst.operands.length > 0
  const isTimer = isTimerInstruction(inst.type)
  const isCounter = isCounterInstruction(inst.type)
  const isComparison = isComparisonInstruction(inst.type)
  const isMath = isMathInstruction(inst.type)
  const headerColor = getInstructionColor(config)

  // Get simulation state for timers/counters and numeric values
  const {
    enabled: simEnabled,
    timerStates,
    counterStates,
    numericValues,
    editedValues,
    setNumericValue,
    resetNumericValue,
    setTimerAcc,
    setTimerPre,
    setCounterAcc,
    setCounterPre
  } = useSimulation()

  // Extract preset value for timers/counters
  const presetValue = (isTimer || isCounter) && inst.operands.length > 1 ? inst.operands[1] : null
  const rawTagName = inst.operands[0] || ''
  const tagName = rawTagName.split('§')[0] || rawTagName

  // Get timer/counter state
  const timerState = isTimer ? timerStates[tagName] : null
  const counterState = isCounter ? counterStates[tagName] : null

  // Search highlight styling
  const searchHighlightStyle = isSearchMatch ? {
    boxShadow: isCurrentSearchMatch
      ? '0 0 0 3px rgba(251, 191, 36, 0.8), 0 0 20px rgba(251, 191, 36, 0.6)'
      : '0 0 0 2px rgba(251, 191, 36, 0.5), 0 0 12px rgba(251, 191, 36, 0.3)',
    border: isCurrentSearchMatch ? '2px solid rgb(251, 191, 36)' : `2px solid rgba(251, 191, 36, 0.7)`,
    animation: isCurrentSearchMatch ? 'search-pulse 1.5s ease-in-out infinite' : undefined
  } : {}

  return (
    <div
      className={`ladder-instruction relative flex-shrink-0 cursor-default transition-all overflow-hidden ${isSearchMatch ? 'search-highlight' : ''}`}
      style={{
        border: `2px solid ${config.border}`,
        borderRadius: 'var(--radius-sm)',
        transform: isHovered ? 'translateY(-2px)' : 'none',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
        minWidth: hasParams ? 'clamp(100px, 20vw, 120px)' : 'var(--touch-target-min)',
        minHeight: 'var(--touch-target-min)',
        maxWidth: 'clamp(140px, 25vw, 180px)',
        ...searchHighlightStyle
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* DEBUG: Show branch leg number */}
      {(inst.branchLeg !== undefined && inst.branchLeg > 0) && (
        <div
          className="absolute -top-2 -right-1 text-[8px] px-1 rounded z-10"
          style={{ background: 'rgba(139, 92, 246, 0.8)', color: 'white' }}
        >
          B{inst.branchLeg}
        </div>
      )}
      {/* Header with instruction name */}
      <div
        className="px-2 py-1.5 font-mono text-fluid-xs font-bold text-white flex justify-between items-center gap-1"
        style={{ background: isAoi ? 'rgb(236, 72, 153)' : headerColor }}
      >
        <span className="flex items-center gap-1">
          {inst.type}
          {isAoi && (
            <span className="text-[8px] font-normal opacity-75 px-1 py-0.5 rounded bg-white/20">
              AOI
            </span>
          )}
        </span>
        {/* Timer/Counter preset in header */}
        {presetValue && (
          <span className="text-[10px] font-normal opacity-90">
            {isTimer ? formatTimerPreset(presetValue) : presetValue}
          </span>
        )}
        {/* AOI expand button */}
        {isAoi && onExpandAoi && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onExpandAoi()
            }}
            className="p-0.5 rounded hover:bg-white/20 transition-colors"
            title="View AOI logic"
          >
            <IconExpand />
          </button>
        )}
      </div>

      {/* Timer/Counter special display */}
      {(isTimer || isCounter) ? (
        <div className="px-2 py-1.5" style={{ background: config.bg }}>
          {/* Tag name */}
          <div
            className="font-mono text-[10px] truncate mb-1"
            style={{ color: 'var(--text-secondary)' }}
            title={tagName}
          >
            {tagName}
          </div>

          {/* Visual progress bar - shows real value in simulation */}
          <div
            className="h-2 rounded-full mb-1.5 overflow-hidden"
            style={{ background: 'var(--surface-4)' }}
          >
            <div
              className={`h-full rounded-full transition-all ${
                isTimer && timerState?.TT ? 'animate-pulse' : ''
              }`}
              style={{
                background: isTimer
                  ? (timerState?.DN ? '#22c55e' : timerState?.TT ? '#f59e0b' : headerColor)
                  : (counterState?.DN ? '#22c55e' : headerColor),
                width: simEnabled
                  ? isTimer && timerState
                    ? `${(timerState.ACC / timerState.PRE) * 100}%`
                    : isCounter && counterState
                      ? `${Math.min((counterState.ACC / counterState.PRE) * 100, 100)}%`
                      : '0%'
                  : '0%',
                opacity: simEnabled ? 1 : 0.6
              }}
            />
          </div>

          {/* ACC / PRE values - Editable in simulation */}
          {simEnabled && (isTimer ? timerState : counterState) && (
            <TimerCounterEditor
              type={isTimer ? 'timer' : 'counter'}
              tagName={tagName}
              accValue={isTimer && timerState ? timerState.ACC : (counterState?.ACC ?? 0)}
              preValue={isTimer && timerState ? timerState.PRE : (counterState?.PRE ?? 10)}
              onAccChange={(val) => isTimer ? setTimerAcc(tagName, val) : setCounterAcc(tagName, val)}
              onPreChange={(val) => isTimer ? setTimerPre(tagName, val) : setCounterPre(tagName, val)}
              isAccEdited={editedValues.has(`${tagName}.ACC`)}
              isPreEdited={editedValues.has(`${tagName}.PRE`)}
              onAccReset={() => resetNumericValue(`${tagName}.ACC`)}
              onPreReset={() => resetNumericValue(`${tagName}.PRE`)}
              simEnabled={simEnabled}
            />
          )}

          {/* Timer/Counter bits - highlight active bits during simulation */}
          <div className="flex gap-1 flex-wrap justify-center">
            {isTimer ? (
              <>
                <span
                  className="text-[8px] px-1 rounded font-semibold"
                  style={{
                    background: simEnabled && timerState?.EN ? 'rgba(34, 197, 94, 0.3)' : 'var(--surface-4)',
                    color: simEnabled && timerState?.EN ? '#22c55e' : 'var(--text-muted)',
                    boxShadow: simEnabled && timerState?.EN ? '0 0 4px rgba(34, 197, 94, 0.5)' : 'none'
                  }}
                >.EN</span>
                <span
                  className="text-[8px] px-1 rounded font-semibold"
                  style={{
                    background: simEnabled && timerState?.TT ? 'rgba(245, 158, 11, 0.3)' : 'var(--surface-4)',
                    color: simEnabled && timerState?.TT ? '#f59e0b' : 'var(--text-muted)',
                    boxShadow: simEnabled && timerState?.TT ? '0 0 4px rgba(245, 158, 11, 0.5)' : 'none'
                  }}
                >.TT</span>
                <span
                  className="text-[8px] px-1 rounded font-semibold"
                  style={{
                    background: simEnabled && timerState?.DN ? 'rgba(34, 197, 94, 0.3)' : 'var(--surface-4)',
                    color: simEnabled && timerState?.DN ? '#22c55e' : 'var(--text-muted)',
                    boxShadow: simEnabled && timerState?.DN ? '0 0 4px rgba(34, 197, 94, 0.5)' : 'none'
                  }}
                >.DN</span>
              </>
            ) : (
              <>
                <span
                  className="text-[8px] px-1 rounded font-semibold"
                  style={{
                    background: simEnabled && counterState?.CU ? 'rgba(34, 197, 94, 0.3)' : 'var(--surface-4)',
                    color: simEnabled && counterState?.CU ? '#22c55e' : 'var(--text-muted)',
                    boxShadow: simEnabled && counterState?.CU ? '0 0 4px rgba(34, 197, 94, 0.5)' : 'none'
                  }}
                >.CU</span>
                <span
                  className="text-[8px] px-1 rounded font-semibold"
                  style={{
                    background: simEnabled && counterState?.DN ? 'rgba(34, 197, 94, 0.3)' : 'var(--surface-4)',
                    color: simEnabled && counterState?.DN ? '#22c55e' : 'var(--text-muted)',
                    boxShadow: simEnabled && counterState?.DN ? '0 0 4px rgba(34, 197, 94, 0.5)' : 'none'
                  }}
                >.DN</span>
                <span
                  className="text-[8px] px-1 rounded font-semibold"
                  style={{
                    background: simEnabled && counterState?.OV ? 'rgba(239, 68, 68, 0.3)' : 'var(--surface-4)',
                    color: simEnabled && counterState?.OV ? '#ef4444' : 'var(--text-muted)',
                    boxShadow: simEnabled && counterState?.OV ? '0 0 4px rgba(239, 68, 68, 0.5)' : 'none'
                  }}
                >.OV</span>
              </>
            )}
          </div>
        </div>
      ) : (
        /* Regular parameters display */
        <div className="px-2 py-1.5" style={{ background: config.bg }}>
          {hasParams ? (
            // Show labeled parameters - editable for comparison/math instructions in simulation
            inst.operands.slice(0, 4).map((op, i) => {
              const cleanOp = op.split('§')[0]
              // Make source operands editable for comparison and math instructions
              // For math instructions: MOV has source at [0], ADD/SUB/MUL/DIV have sources at [0] and [1]
              const isSourceOperand = isMath
                ? (inst.type.toUpperCase() === 'MOV' ? i === 0 : i < 2)
                : isComparison
              const isNumericEditable = simEnabled && isSourceOperand

              // Get the current value for this operand
              const currentValue = (simEnabled && (isComparison || isMath))
                ? getNumericValueFromOperand(op, numericValues)
                : parseFloat(cleanOp)

              const isEdited = editedValues.has(cleanOp)

              return (
                <div key={i} className="flex justify-between items-center gap-2 py-0.5">
                  <span className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>
                    {paramLabels[i] || `Param${i + 1}`}
                  </span>
                  {isNumericEditable ? (
                    <EditableNumericOperand
                      operand={cleanOp}
                      value={currentValue}
                      editable={true}
                      onValueChange={(val) => setNumericValue(cleanOp, val)}
                      isEdited={isEdited}
                      onReset={() => resetNumericValue(cleanOp)}
                      simEnabled={simEnabled}
                      allowFloat={true}
                    />
                  ) : (
                    <span
                      className="font-mono text-[10px] truncate max-w-[80px] text-right"
                      style={{ color: 'var(--text-secondary)' }}
                      title={op}
                    >
                      {simEnabled && !isNaN(currentValue) ? currentValue : op}
                    </span>
                  )}
                </div>
              )
            })
          ) : (
            // Show simple operands
            inst.operands.length > 0 && (
              <div
                className="font-mono text-[10px] truncate"
                style={{ color: 'var(--text-tertiary)' }}
                title={inst.operands[0]}
              >
                {inst.operands[0]}
              </div>
            )
          )}

          {/* Comparison result indicator */}
          {simEnabled && isComparison && (
            <div className="mt-1 flex justify-center">
              {(() => {
                const sourceA = getNumericValueFromOperand(inst.operands[0], numericValues)
                const sourceB = getNumericValueFromOperand(inst.operands[1], numericValues)
                let result = false
                const type = inst.type.toUpperCase()
                switch (type) {
                  case 'EQU': result = sourceA === sourceB; break
                  case 'NEQ': result = sourceA !== sourceB; break
                  case 'GRT': result = sourceA > sourceB; break
                  case 'GEQ': result = sourceA >= sourceB; break
                  case 'LES': result = sourceA < sourceB; break
                  case 'LEQ': result = sourceA <= sourceB; break
                  case 'LIM': {
                    const highLimit = getNumericValueFromOperand(inst.operands[2], numericValues)
                    result = sourceA <= sourceB && sourceB <= highLimit
                    break
                  }
                  default: result = true
                }
                return (
                  <span className={`comparison-result ${result ? 'true' : 'false'}`}>
                    {result ? 'TRUE' : 'FALSE'}
                  </span>
                )
              })()}
            </div>
          )}

          {/* Math instruction result indicator */}
          {simEnabled && isMath && (
            <div className="mt-1 pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
              {(() => {
                const type = inst.type.toUpperCase()
                let result = 0
                let destTag = ''

                if (type === 'MOV') {
                  result = getNumericValueFromOperand(inst.operands[0], numericValues)
                  destTag = inst.operands[1]?.split('§')[0] || ''
                } else {
                  const sourceA = getNumericValueFromOperand(inst.operands[0], numericValues)
                  const sourceB = getNumericValueFromOperand(inst.operands[1], numericValues)
                  destTag = inst.operands[2]?.split('§')[0] || ''

                  switch (type) {
                    case 'ADD': result = sourceA + sourceB; break
                    case 'SUB': result = sourceA - sourceB; break
                    case 'MUL': result = sourceA * sourceB; break
                    case 'DIV': result = sourceB !== 0 ? sourceA / sourceB : 0; break
                  }
                }

                // Format result: show as integer if whole number, otherwise 2 decimal places
                const displayResult = Number.isInteger(result) ? result : result.toFixed(2)

                return (
                  <div className="flex justify-between items-center">
                    <span className="text-[8px] uppercase" style={{ color: 'var(--text-muted)' }}>
                      Result
                    </span>
                    <span
                      className="font-mono text-[11px] font-semibold"
                      style={{ color: 'var(--accent)' }}
                      title={`${destTag} = ${displayResult}`}
                    >
                      {displayResult}
                    </span>
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {/* Hover tooltip */}
      {isHovered && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded text-xs whitespace-nowrap z-50 shadow-lg"
          style={{
            background: 'var(--surface-4)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)'
          }}
        >
          <div className="font-semibold">{config.label}</div>
          {inst.operands.length > 0 && (
            <div className="mt-1 font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
              {inst.operands.map((op, i) => (
                <div key={i}>
                  {paramLabels[i] ? `${paramLabels[i]}: ` : ''}{op}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Helper to get tag description, handling member access like Tag.Member
function getTagDescription(tagName: string, descriptions: Record<string, string>): string | undefined {
  if (!tagName || !descriptions) return undefined
  // Try exact match
  if (descriptions[tagName]) return descriptions[tagName]
  // Try base tag (before first dot)
  const baseName = tagName.split('.')[0].split('[')[0]
  if (descriptions[baseName]) return descriptions[baseName]
  // Try without array index
  const noIndex = tagName.replace(/\[\d+\]/g, '')
  if (descriptions[noIndex]) return descriptions[noIndex]
  return undefined
}

// Helper to check if tag is forced and get force state
function getForceState(tagName: string, forcedTags?: Record<string, 'on' | 'off' | null>): 'on' | 'off' | null {
  if (!tagName || !forcedTags) return null
  // Try exact match
  const exactMatch = forcedTags[tagName]
  if (exactMatch === 'on' || exactMatch === 'off') return exactMatch
  // Try base tag (before first dot)
  const baseName = tagName.split('.')[0].split('[')[0]
  const baseMatch = forcedTags[baseName]
  if (baseMatch === 'on' || baseMatch === 'off') return baseMatch
  return null
}

// Contact/Coil Element with tag name above
function ContactCoilElement({
  inst,
  config,
  isHovered,
  onHover,
  tagDescriptions,
  forcedTags,
  isSearchMatch,
  isCurrentSearchMatch,
  simEnabled,
  isEnergized,
  tagState,
  onToggleTag,
  onTagXRef,
  onForceOn,
  onForceOff,
  onRemoveForce
}: {
  inst: Instruction
  config: typeof DEFAULT_CONFIG & { isContact?: boolean; isCoil?: boolean }
  isHovered: boolean
  onHover: (hovered: boolean) => void
  tagDescriptions?: Record<string, string>
  forcedTags?: Record<string, 'on' | 'off' | null>
  isSearchMatch?: boolean
  isCurrentSearchMatch?: boolean
  simEnabled?: boolean
  isEnergized?: boolean
  tagState?: boolean
  onToggleTag?: () => void
  onTagXRef?: (tagName: string) => void
  onForceOn?: (tagName: string) => void
  onForceOff?: (tagName: string) => void
  onRemoveForce?: (tagName: string) => void
}) {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const rawOperand = inst.operands[0] || ''
  const [symbolName] = rawOperand.includes('§') ? rawOperand.split('§') : [rawOperand, null]
  const tagName = symbolName
  const instType = inst.type.toUpperCase()
  const description = tagDescriptions ? getTagDescription(tagName, tagDescriptions) : undefined
  const forceState = getForceState(tagName, forcedTags)
  const isContact = config.isContact
  const isCoil = config.isCoil

  // Handle right-click for force menu (works for contacts and coils)
  const handleContextMenu = (e: React.MouseEvent) => {
    if (simEnabled && (isContact || isCoil)) {
      e.preventDefault()
      e.stopPropagation()
      setContextMenu({ x: e.clientX, y: e.clientY })
    }
  }

  // Long press timer for mobile context menu
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    if (simEnabled && (isContact || isCoil)) {
      const touch = e.touches[0]
      longPressTimerRef.current = setTimeout(() => {
        setContextMenu({ x: touch.clientX, y: touch.clientY })
      }, 500)
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  const handleTouchMove = () => {
    // Cancel long press if user moves
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }

  // Close context menu when clicking outside
  React.useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    if (contextMenu) {
      document.addEventListener('click', handleClickOutside)
      document.addEventListener('touchstart', handleClickOutside)
      return () => {
        document.removeEventListener('click', handleClickOutside)
        document.removeEventListener('touchstart', handleClickOutside)
      }
    }
  }, [contextMenu])

  // Clean up timer on unmount
  React.useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  // Search highlight styling
  const searchHighlightStyle = isSearchMatch ? {
    boxShadow: isCurrentSearchMatch
      ? '0 0 0 3px rgba(251, 191, 36, 0.8), 0 0 20px rgba(251, 191, 36, 0.6)'
      : '0 0 0 2px rgba(251, 191, 36, 0.5), 0 0 12px rgba(251, 191, 36, 0.3)',
    backgroundColor: isCurrentSearchMatch ? 'rgba(251, 191, 36, 0.2)' : 'rgba(251, 191, 36, 0.1)',
    borderRadius: '4px',
    padding: '4px',
    animation: isCurrentSearchMatch ? 'search-pulse 1.5s ease-in-out infinite' : undefined
  } : {}

  // Simulation classes - add forced class for visual distinction
  const simClass = simEnabled ? (
    isContact ? (isEnergized ? 'contact-energized' : 'contact-de-energized') :
    isCoil ? (isEnergized ? 'coil-energized' : 'coil-de-energized') : ''
  ) : ''
  const clickableClass = simEnabled && (isContact || isCoil) ? 'contact-clickable' : ''
  const forcedClass = forceState ? 'contact-forced' : ''

  // Cross-reference clickable class (when not in simulation mode or for non-contacts)
  const xrefClickableClass = !simEnabled && onTagXRef ? 'tag-clickable' : ''

  // Handle click - simulation toggle vs cross-reference
  const handleClick = (e: React.MouseEvent) => {
    // Ctrl+click or Cmd+click always opens cross-reference
    if ((e.ctrlKey || e.metaKey) && onTagXRef) {
      e.preventDefault()
      e.stopPropagation()
      onTagXRef(tagName)
      return
    }

    // In simulation mode, contacts and coils toggle state
    if (simEnabled && (isContact || isCoil) && onToggleTag) {
      onToggleTag()
      return
    }

    // When not in simulation mode, regular click opens cross-reference
    if (!simEnabled && onTagXRef) {
      onTagXRef(tagName)
    }
  }

  return (
    <div
      className={`${isContact ? 'ladder-contact' : 'ladder-coil'} relative flex flex-col items-center touch-ripple ${simEnabled && isContact ? 'touch-ripple-green' : ''} ${simEnabled && isCoil ? 'touch-ripple-amber' : ''} ${simEnabled && (isContact || isCoil) ? 'cursor-pointer' : !simEnabled && onTagXRef ? 'cursor-pointer' : 'cursor-default'} ${isSearchMatch ? 'search-highlight' : ''} ${simClass} ${clickableClass} ${forcedClass} ${xrefClickableClass}`}
      style={{
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.15s ease',
        minWidth: 'var(--touch-target-min)',
        minHeight: 'var(--touch-target-min)',
        ...searchHighlightStyle
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
    >
      {/* Force context menu - touch-friendly */}
      {contextMenu && (
        <div
          className="force-context-menu touch-context-menu"
          style={{
            position: 'fixed',
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 200),
            zIndex: 1000
          }}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
        >
          <div className="force-menu-header" style={{ minHeight: '44px', display: 'flex', alignItems: 'center', padding: '8px 12px' }}>
            Force Tag: {tagName}
          </div>
          <button
            className={`force-menu-item touch-ripple ${forceState === 'on' ? 'force-menu-item-active' : ''}`}
            style={{ minHeight: '48px' }}
            onClick={() => {
              onForceOn?.(tagName)
              setContextMenu(null)
            }}
          >
            <span className="force-menu-icon force-on">F1</span>
            Force ON
          </button>
          <button
            className={`force-menu-item touch-ripple ${forceState === 'off' ? 'force-menu-item-active' : ''}`}
            style={{ minHeight: '48px' }}
            onClick={() => {
              onForceOff?.(tagName)
              setContextMenu(null)
            }}
          >
            <span className="force-menu-icon force-off">F0</span>
            Force OFF
          </button>
          {forceState && (
            <button
              className="force-menu-item force-menu-item-remove touch-ripple"
              style={{ minHeight: '48px' }}
              onClick={() => {
                onRemoveForce?.(tagName)
                setContextMenu(null)
              }}
            >
              <span className="force-menu-icon">X</span>
              Remove Force
            </button>
          )}
        </div>
      )}
      {/* Simulation state badge */}
      {simEnabled && isContact && (
        <div className={`contact-state-badge ${tagState ? 'contact-state-on' : 'contact-state-off'}`}>
          {tagState ? '1' : '0'}
        </div>
      )}
      {/* Force badge */}
      {forceState && <ForceBadge type={forceState} />}
      {/* DEBUG: Show branch leg number */}
      {(inst.branchLeg !== undefined && inst.branchLeg > 0) && (
        <div
          className="absolute -top-3 -right-1 text-[8px] px-1 rounded"
          style={{ background: 'rgba(139, 92, 246, 0.8)', color: 'white' }}
        >
          B{inst.branchLeg}
        </div>
      )}
      {/* Tag description above (like Logix Designer) */}
      {description && (
        <div
          className="text-fluid-xs mb-0.5 truncate max-w-28 text-center leading-tight ladder-instruction-operand"
          style={{ color: 'var(--text-muted)', fontSize: 'clamp(8px, 1.5vw, 10px)' }}
          title={description}
        >
          {description}
        </div>
      )}

      {/* Tag name */}
      <div
        className="font-mono text-fluid-xs mb-1 truncate max-w-28 text-center ladder-instruction-operand"
        style={{ color: 'var(--text-secondary)', fontSize: 'clamp(9px, 1.8vw, 11px)' }}
        title={tagName}
      >
        {tagName}
      </div>

      {/* Symbol */}
      {config.isContact ? (
        <ContactSymbol type={instType as 'XIC' | 'XIO'} color={config.color === 'var(--inst-input)' ? 'rgb(34, 197, 94)' : '#888'} />
      ) : config.isCoil ? (
        <CoilSymbol type={instType as 'OTE' | 'OTL' | 'OTU'} color={config.color === 'var(--inst-output)' ? 'rgb(234, 179, 8)' : '#888'} />
      ) : null}

      {/* Hover tooltip */}
      {isHovered && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-2 rounded text-xs whitespace-nowrap z-50 shadow-lg"
          style={{
            background: 'var(--surface-4)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-default)'
          }}
        >
          <div className="font-semibold">{config.label}</div>
          {description && (
            <div className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              {description}
            </div>
          )}
          <div className="mt-1 font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>
            {tagName}
          </div>
          {onTagXRef && (
            <div className="mt-1.5 pt-1.5 border-t text-[9px]" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
              {simEnabled ? 'Ctrl+click for X-Ref' : 'Click for X-Ref'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Organize instructions into rows based on branch structure
// Returns rows with metadata for rendering nested branches properly
interface BranchRow {
  instructions: Instruction[]
  branchLeg: number
  branchLevel: number  // Nesting depth for indentation
  startsNewBranch: boolean  // Whether this row starts a new branch group
}

function organizeBranches(instructions: Instruction[]): { rows: Instruction[][]; hasBranches: boolean; branchRows?: BranchRow[] } {
  if (instructions.length === 0) return { rows: [[]], hasBranches: false }

  // Check if we have any branches (support both L5X branch_level and RSS branchLeg)
  const hasBranchInstructions = instructions.some(i => (i.branch_level ?? 0) > 0 || (i.branchLeg ?? 0) > 0)

  if (!hasBranchInstructions) {
    // No branches - single row
    return { rows: [instructions], hasBranches: false }
  }

  // Group ALL instructions by their branch leg number
  // branchLeg 0 or undefined = main path
  // branchLeg 1, 2, 3... = parallel branches
  const branchGroups: Map<number, Instruction[]> = new Map()

  for (const inst of instructions) {
    const legNum = inst.branchLeg ?? inst.branch_level ?? 0
    if (!branchGroups.has(legNum)) {
      branchGroups.set(legNum, [])
    }
    branchGroups.get(legNum)!.push(inst)
  }

  // Sort branch groups by leg number (0 = main, then 1, 2, 3...)
  const sortedBranches = Array.from(branchGroups.entries()).sort((a, b) => a[0] - b[0])

  // Build rows - each branch leg becomes its own row
  const rows: Instruction[][] = []
  const branchRows: BranchRow[] = []

  for (const [legNum, branchInsts] of sortedBranches) {
    rows.push(branchInsts)

    // Get nesting level from the instructions
    const nestLevel = branchInsts.length > 0 ? (branchInsts[0].branchLevel ?? 0) : 0
    branchRows.push({
      instructions: branchInsts,
      branchLeg: legNum,
      branchLevel: nestLevel,
      startsNewBranch: branchInsts.some(i => i.branchStart)
    })
  }

  // hasBranches is true if we have more than just the main path
  return { rows, hasBranches: sortedBranches.length > 1, branchRows }
}

// Main ladder visualization component with branch support
function LadderVisualization({
  instructions,
  hoveredInstruction,
  setHoveredInstruction,
  tagDescriptions,
  aoiNames,
  onExpandAoi,
  forcedTags: _externalForcedTags,  // Unused - we get forcedTags from SimulationContext now
  searchTerm,
  currentSearchMatchIndex,
  searchMatchStartIndex,
  onTagXRef
}: {
  instructions: Instruction[]
  hoveredInstruction: number | null
  setHoveredInstruction: (idx: number | null) => void
  tagDescriptions?: Record<string, string>
  aoiNames?: string[]
  onExpandAoi?: (name: string) => void
  forcedTags?: Record<string, 'on' | 'off' | null>
  searchTerm?: string
  currentSearchMatchIndex?: number
  searchMatchStartIndex?: number
  onTagXRef?: (tagName: string) => void
}) {
  void _externalForcedTags // Suppress unused warning - kept for backward compatibility
  const { rows, hasBranches, branchRows } = organizeBranches(instructions)
  const rowHeight = 130 // Height per row - enough space for instruction boxes with 3+ params
  const indentPerLevel = 60 // Pixels to indent per nesting level

  // Simulation state
  const {
    enabled: simEnabled,
    tagStates,
    timerStates,
    counterStates,
    forcedTags: simForcedTags,
    numericValues,
    toggleTag,
    setTagStates,
    updateTimers,
    updateCounters,
    forceTagOn,
    forceTagOff,
    removeForce,
    setNumericValue,
    scanCycle
  } = useSimulation()

  // Calculate power flow when simulation is enabled (with numeric values for comparisons)
  const powerFlow = React.useMemo(() => {
    if (!simEnabled) return null
    return calculatePowerFlowWithNumeric(instructions, tagStates, rows, timerStates, counterStates, numericValues, simForcedTags)
  }, [simEnabled, instructions, tagStates, rows, timerStates, counterStates, numericValues, simForcedTags])

  // Apply output updates (OTE sets tags, timers accumulate, math instructions update values, etc.)
  React.useEffect(() => {
    if (!simEnabled || !powerFlow) return

    const { tagUpdates, timerUpdates, counterUpdates, numericUpdates } = getOutputUpdatesWithNumeric(
      instructions,
      powerFlow,
      timerStates,
      counterStates,
      numericValues
    )

    // Apply tag updates (OTE, OTL, OTU)
    if (Object.keys(tagUpdates).length > 0) {
      setTagStates(tagUpdates)
    }

    // Apply timer updates
    if (Object.keys(timerUpdates).length > 0) {
      updateTimers(timerUpdates)
    }

    // Apply counter updates
    if (Object.keys(counterUpdates).length > 0) {
      updateCounters(counterUpdates)
    }

    // Apply numeric value updates from math instructions (MOV, ADD, SUB, MUL, DIV)
    if (Object.keys(numericUpdates).length > 0) {
      for (const [tag, value] of Object.entries(numericUpdates)) {
        setNumericValue(tag, value)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simEnabled, powerFlow, instructions, scanCycle, setTagStates, updateTimers, updateCounters, setNumericValue])

  // Calculate total height
  const totalHeight = Math.max(rows.length * rowHeight, 60)

  // Build instruction index map for hover tracking
  let globalIdx = 0
  const idxMap: Map<Instruction, number> = new Map()
  for (const inst of instructions) {
    idxMap.set(inst, globalIdx++)
  }

  return (
    <div
      className={`ladder-scroll-container px-fluid-3 pt-4 pb-8 ${simEnabled ? 'sim-mode-active' : ''}`}
      style={{ background: 'var(--surface-1)' }}
    >
      <div className="inline-flex min-w-full" style={{ minHeight: `${totalHeight}px` }}>
        {/* Left power rail */}
        <div
          className={`ladder-power-rail flex-shrink-0 ${simEnabled ? 'power-rail-energized' : ''}`}
          style={{ height: `${totalHeight}px` }}
        />

        {/* Rows container - use inline-block to size to content */}
        <div className="flex-shrink-0" style={{ minWidth: '300px' }}>
          {rows.length > 0 && rows[0].length > 0 ? (
            <div className="flex flex-col">
              {rows.map((rowInsts, rowIdx) => {
                // Get nesting level for this row - use branchRows data if available
                const branchInfo = branchRows?.[rowIdx]
                const nestLevel = branchInfo?.branchLevel ?? 0
                const indentPx = nestLevel * indentPerLevel

                return (
                <div
                  key={rowIdx}
                  className="flex items-center relative"
                  style={{ height: `${rowHeight}px` }}
                >
                  {/* Indentation spacer based on nesting level */}
                  {indentPx > 0 && (
                    <div style={{ width: `${indentPx}px`, flexShrink: 0 }} />
                  )}

                  {/* Branch vertical connector and T-junction for nested branches */}
                  {hasBranches && rowIdx > 0 && (
                    <div
                      className="flex-shrink-0 relative"
                      style={{ width: '24px', height: '100%' }}
                    >
                      {/* Vertical line connecting to parent branch */}
                      <div
                        className={`absolute w-0.5 ${simEnabled && powerFlow?.wireEnergized[rowIdx]?.[0] ? 'wire-energized' : ''}`}
                        style={{
                          background: simEnabled && powerFlow?.wireEnergized[rowIdx]?.[0] ? '#22c55e' : 'var(--text-muted)',
                          left: indentPx > 0 ? '0px' : '0px',
                          top: '0px',
                          height: '50%'
                        }}
                      />
                      {/* T-junction: horizontal part */}
                      <div
                        className={`absolute h-0.5 ${simEnabled && powerFlow?.wireEnergized[rowIdx]?.[0] ? 'wire-energized' : ''}`}
                        style={{
                          background: simEnabled && powerFlow?.wireEnergized[rowIdx]?.[0] ? '#22c55e' : 'var(--text-muted)',
                          left: '0px',
                          top: '50%',
                          width: '24px'
                        }}
                      />
                      {/* Vertical line extending down if not last row at this level */}
                      {rowIdx < rows.length - 1 && (
                        <div
                          className={`absolute w-0.5 ${simEnabled && powerFlow?.wireEnergized[rowIdx]?.[0] ? 'wire-energized' : ''}`}
                          style={{
                            background: simEnabled && powerFlow?.wireEnergized[rowIdx]?.[0] ? '#22c55e' : 'var(--text-muted)',
                            left: '0px',
                            top: '50%',
                            height: '50%'
                          }}
                        />
                      )}
                    </div>
                  )}

                  {/* First row: just horizontal wire */}
                  {rowIdx === 0 && hasBranches && (
                    <div
                      className={`w-6 h-0.5 flex-shrink-0 ${simEnabled && powerFlow?.wireEnergized[0]?.[0] ? 'wire-energized' : ''}`}
                      style={{ background: simEnabled && powerFlow?.wireEnergized[0]?.[0] ? '#22c55e' : 'var(--text-muted)' }}
                    />
                  )}

                  {/* Instructions in this row */}
                  {rowInsts.map((inst, instIdx) => {
                    const config = getInstructionConfig(inst.type)
                    const globalIndex = idxMap.get(inst) ?? 0
                    const isHovered = hoveredInstruction === globalIndex
                    const isContactOrCoil = config.isContact || config.isCoil

                    // Check if this instruction matches the search term
                    const isSearchMatch = searchTerm ? instructionMatchesSearch(inst, searchTerm) : false
                    // Calculate if this is the current focused search match
                    let matchIndex = -1
                    if (isSearchMatch && searchMatchStartIndex !== undefined && searchMatchStartIndex >= 0) {
                      let matchesBefore = 0
                      for (const [testInst, testIdx] of idxMap.entries()) {
                        if (testIdx < globalIndex && instructionMatchesSearch(testInst, searchTerm || '')) {
                          matchesBefore++
                        }
                      }
                      matchIndex = searchMatchStartIndex + matchesBefore
                    }
                    const isCurrentSearchMatch = matchIndex >= 0 && matchIndex === currentSearchMatchIndex

                    return (
                      <div
                        key={instIdx}
                        className={`flex items-center ${isCurrentSearchMatch ? 'current-search-match' : ''}`}
                        data-search-match-index={isSearchMatch ? matchIndex : undefined}
                      >
                        {/* Connecting wire */}
                        {(instIdx > 0 || rowIdx === 0) && (
                          <div
                            className={`w-6 h-0.5 flex-shrink-0 ${simEnabled && powerFlow?.wireEnergized[rowIdx]?.[instIdx] ? 'wire-energized' : ''}`}
                            style={{ background: simEnabled && powerFlow?.wireEnergized[rowIdx]?.[instIdx] ? '#22c55e' : 'var(--text-muted)' }}
                          />
                        )}

                        {/* Render contact/coil symbol or instruction box */}
                        {isContactOrCoil ? (
                          <ContactCoilElement
                            inst={inst}
                            config={config}
                            isHovered={isHovered}
                            onHover={(h) => setHoveredInstruction(h ? globalIndex : null)}
                            tagDescriptions={tagDescriptions}
                            forcedTags={simForcedTags}
                            isSearchMatch={isSearchMatch}
                            isCurrentSearchMatch={isCurrentSearchMatch}
                            simEnabled={simEnabled}
                            isEnergized={powerFlow?.instructionEnergized[globalIndex]}
                            tagState={tagStates[(inst.operands[0]?.split('§')[0] || '')]}
                            onToggleTag={() => toggleTag(inst.operands[0]?.split('§')[0] || '')}
                            onTagXRef={onTagXRef}
                            onForceOn={forceTagOn}
                            onForceOff={forceTagOff}
                            onRemoveForce={removeForce}
                          />
                        ) : (
                          <InstructionBox
                            inst={inst}
                            config={config}
                            isHovered={isHovered}
                            onHover={(h) => setHoveredInstruction(h ? globalIndex : null)}
                            isAoi={aoiNames?.includes(inst.type.toUpperCase()) || aoiNames?.includes(inst.type)}
                            onExpandAoi={onExpandAoi ? () => onExpandAoi(inst.type) : undefined}
                            isSearchMatch={isSearchMatch}
                            isCurrentSearchMatch={isCurrentSearchMatch}
                          />
                        )}
                      </div>
                    )
                  })}

                  {/* Final connecting wire to right rail */}
                  {rowInsts.length > 0 && (
                    <div
                      className={`flex-1 h-0.5 min-w-6 ${simEnabled && powerFlow?.wireEnergized[rowIdx]?.[rowInsts.length] ? 'wire-energized' : ''}`}
                      style={{ background: simEnabled && powerFlow?.wireEnergized[rowIdx]?.[rowInsts.length] ? '#22c55e' : 'var(--text-muted)' }}
                    />
                  )}

                  {/* Branch vertical connection at end (for branch rows) */}
                  {hasBranches && rowIdx > 0 && (
                    <div
                      className="absolute w-0.5"
                      style={{
                        background: 'var(--text-muted)',
                        right: '20px',
                        top: `-${rowHeight / 2}px`,
                        height: `${rowHeight / 2 + rowHeight / 2}px`
                      }}
                    />
                  )}
                </div>
              )
              })}
            </div>
          ) : (
            <div className="flex items-center h-full px-4">
              <div
                className="h-0.5 flex-1"
                style={{ background: 'var(--text-muted)' }}
              />
              <span
                className="px-3 text-xs italic"
                style={{ color: 'var(--text-muted)' }}
              >
                No instructions parsed
              </span>
              <div
                className="h-0.5 flex-1"
                style={{ background: 'var(--text-muted)' }}
              />
            </div>
          )}
        </div>

        {/* Right power rail */}
        <div
          className={`power-rail flex-shrink-0 ${simEnabled && powerFlow?.rungEnergized ? 'power-rail-energized' : ''}`}
          style={{ height: `${totalHeight}px` }}
        />
      </div>
    </div>
  )
}

export function LadderRung({
  rungId,
  number,
  comment,
  rawText,
  instructions,
  explanation,
  explanationSource,
  troubleshooting,
  deviceTypes,
  crossRefs,
  ioMappings,
  conditions,
  onExplain,
  tagDescriptions,
  projectId,
  aoiNames,
  isBookmarked,
  onToggleBookmark,
  forcedTags,
  searchTerm,
  currentSearchMatchIndex,
  searchMatchStartIndex,
  onTagXRef,
  routineName
}: LadderRungProps) {
  const [isExplaining, setIsExplaining] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const [hoveredInstruction, setHoveredInstruction] = useState<number | null>(null)
  const [expandedAoi, setExpandedAoi] = useState<AoiLogic | null>(null)
  const [loadingAoi, setLoadingAoi] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [traceResult, setTraceResult] = useState<TraceResult | null>(null)
  const [traceDirection, setTraceDirection] = useState<'sources' | 'targets'>('sources')
  const [isTracing, setIsTracing] = useState(false)
  const [showTraceMenu, setShowTraceMenu] = useState(false)
  const [similarResult, setSimilarResult] = useState<SimilarResult | null>(null)
  const [isFindingSimilar, setIsFindingSimilar] = useState(false)

  // Extract output tags from rung for trace menu
  const outputTags = instructions
    .filter(inst => ['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'RTO', 'CTU', 'CTD', 'MOV', 'CLR'].includes(inst.type))
    .map(inst => inst.operands[0])
    .filter(Boolean)

  // Extract all unique tags from rung for trend chart
  const availableTags = React.useMemo(() => {
    const tags = new Set<string>()
    instructions.forEach(inst => {
      inst.operands.forEach(op => {
        if (op) {
          const tagName = op.split('\u00A7')[0] // Remove description suffix
          if (tagName && !tagName.match(/^[0-9.]+$/)) { // Skip numeric literals
            tags.add(tagName)
          }
        }
      })
    })
    return Array.from(tags).sort()
  }, [instructions])

  const handleTrace = async (tag: string, direction: 'sources' | 'targets') => {
    if (!projectId || isTracing) return
    setIsTracing(true)
    setShowTraceMenu(false)
    try {
      const response = await fetch(`/api/projects/${projectId}/trace?tag=${encodeURIComponent(tag)}&direction=${direction}`)
      if (!response.ok) throw new Error('Failed to trace tag')
      const data = await response.json()
      setTraceResult(data)
      setTraceDirection(direction)
    } catch (error) {
      console.error('Error tracing tag:', error)
    } finally {
      setIsTracing(false)
    }
  }

  const handleFindSimilar = async () => {
    if (!projectId || isFindingSimilar) return
    setIsFindingSimilar(true)
    try {
      const response = await fetch(`/api/projects/${projectId}/similar?rungText=${encodeURIComponent(rawText)}&excludeRungId=${rungId}`)
      if (!response.ok) throw new Error('Failed to find similar rungs')
      const data = await response.json()
      setSimilarResult(data)
    } catch (error) {
      console.error('Error finding similar rungs:', error)
    } finally {
      setIsFindingSimilar(false)
    }
  }

  const handleExplain = async () => {
    if (!onExplain || isExplaining) return
    setIsExplaining(true)
    try {
      await onExplain(rungId)
    } finally {
      setIsExplaining(false)
    }
  }

  const handleExpandAoi = async (aoiName: string) => {
    if (!projectId || loadingAoi) return
    setLoadingAoi(aoiName)
    try {
      const response = await fetch(`/api/projects/${projectId}/aoi/${encodeURIComponent(aoiName)}`)
      if (!response.ok) throw new Error('Failed to fetch AOI')
      const data = await response.json()
      setExpandedAoi(data)
    } catch (error) {
      console.error('Error fetching AOI:', error)
    } finally {
      setLoadingAoi(null)
    }
  }

  const handleCopy = async () => {
    // Build formatted text for clipboard
    let text = `Rung ${number}\n`
    if (comment) text += `Comment: ${comment}\n`
    text += `\nLogic: ${rawText}\n`
    if (explanation) {
      text += `\nExplanation:\n${explanation}\n`
    }
    if (troubleshooting && troubleshooting.length > 0) {
      text += `\nTroubleshooting:\n${troubleshooting.map(t => `- ${t}`).join('\n')}\n`
    }

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  return (
    <div
      className="ladder-rung overflow-hidden"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)'
      }}
    >
      {/* Header */}
      <div
        className="ladder-rung-header flex items-center justify-between px-fluid-3 py-2 border-b gap-fluid-2"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-fluid-2 min-w-0 flex-1">
          {/* Bookmark button */}
          {onToggleBookmark && (
            <button
              onClick={() => onToggleBookmark(rungId)}
              className="flex-shrink-0 p-1 rounded transition-colors"
              style={{
                color: isBookmarked ? 'var(--accent-amber)' : 'var(--text-muted)'
              }}
              onMouseEnter={e => {
                if (!isBookmarked) {
                  e.currentTarget.style.color = 'var(--accent-amber)'
                }
              }}
              onMouseLeave={e => {
                if (!isBookmarked) {
                  e.currentTarget.style.color = 'var(--text-muted)'
                }
              }}
              title={isBookmarked ? 'Remove bookmark' : 'Add bookmark'}
            >
              <IconBookmark filled={isBookmarked} />
            </button>
          )}
          <span
            className="font-mono text-xs font-semibold px-2 py-0.5 rounded flex-shrink-0"
            style={{
              background: isBookmarked ? 'var(--accent-amber-muted)' : 'var(--surface-4)',
              color: isBookmarked ? 'var(--accent-amber)' : 'var(--text-secondary)'
            }}
          >
            {number}
          </span>
          {comment && (
            <span
              className="text-xs italic truncate"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {comment}
            </span>
          )}
        </div>

        <div className="ladder-rung-actions flex items-center gap-1 flex-shrink-0 flex-wrap">
          {/* Trace button with dropdown */}
          {projectId && outputTags.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowTraceMenu(!showTraceMenu)}
                disabled={isTracing}
                className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded text-xs transition-colors"
                style={{
                  background: showTraceMenu ? 'var(--accent-purple-muted)' : 'transparent',
                  color: showTraceMenu ? 'var(--accent-purple)' : 'var(--text-muted)',
                  opacity: isTracing ? 0.5 : 1
                }}
                onMouseEnter={e => {
                  if (!showTraceMenu && !isTracing) {
                    e.currentTarget.style.background = 'var(--surface-3)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
                onMouseLeave={e => {
                  if (!showTraceMenu) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-muted)'
                  }
                }}
                title="Trace tag dependencies"
              >
                <IconTrace />
                <span className="action-label hidden sm:inline">{isTracing ? 'Tracing...' : 'Trace'}</span>
              </button>

              {/* Dropdown menu */}
              {showTraceMenu && (
                <div
                  className="absolute top-full right-0 mt-1 z-50 min-w-[200px] rounded-lg shadow-xl overflow-hidden"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
                >
                  <div className="p-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                    <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)' }}>
                      Trace Output Tags
                    </span>
                  </div>
                  {outputTags.map((tag, i) => (
                    <div key={i} className="border-b last:border-b-0" style={{ borderColor: 'var(--border-subtle)' }}>
                      <div className="px-3 py-2" style={{ background: 'var(--surface-1)' }}>
                        <code className="text-xs font-mono" style={{ color: 'var(--accent-blue)' }}>{tag}</code>
                      </div>
                      <div className="flex">
                        <button
                          onClick={() => handleTrace(tag, 'sources')}
                          className="flex-1 flex items-center gap-1 px-3 py-2 text-xs transition-colors hover:bg-white/5"
                          style={{ color: 'var(--accent-emerald)' }}
                        >
                          <IconArrowUp />
                          What turns ON
                        </button>
                        <button
                          onClick={() => handleTrace(tag, 'targets')}
                          className="flex-1 flex items-center gap-1 px-3 py-2 text-xs transition-colors hover:bg-white/5 border-l"
                          style={{ color: 'var(--accent-amber)', borderColor: 'var(--border-subtle)' }}
                        >
                          <IconArrowDown />
                          What it affects
                        </button>
                      </div>
                    </div>
                  ))}
                  <button
                    onClick={() => setShowTraceMenu(false)}
                    className="w-full px-3 py-2 text-xs text-center transition-colors hover:bg-white/5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Similar Logic button */}
          {projectId && (
            <button
              onClick={handleFindSimilar}
              disabled={isFindingSimilar}
              className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded text-xs transition-colors"
              style={{
                background: 'transparent',
                color: 'var(--text-muted)',
                opacity: isFindingSimilar ? 0.5 : 1
              }}
              onMouseEnter={e => {
                if (!isFindingSimilar) {
                  e.currentTarget.style.background = 'var(--surface-3)'
                  e.currentTarget.style.color = 'var(--text-secondary)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
              title="Find similar logic in project"
            >
              <IconSimilar />
              <span className="action-label hidden sm:inline">{isFindingSimilar ? 'Finding...' : 'Similar'}</span>
            </button>
          )}

          <button
            onClick={handleCopy}
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded text-xs transition-colors"
            style={{
              background: copied ? 'var(--accent-emerald-muted)' : 'transparent',
              color: copied ? 'var(--accent-emerald)' : 'var(--text-muted)'
            }}
            onMouseEnter={e => {
              if (!copied) {
                e.currentTarget.style.background = 'var(--surface-3)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }
            }}
            onMouseLeave={e => {
              if (!copied) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }
            }}
            title="Copy rung to clipboard"
          >
            {copied ? <IconCheck /> : <IconCopy />}
            <span className="action-label hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded text-xs transition-colors"
            style={{
              background: showRaw ? 'var(--surface-4)' : 'transparent',
              color: showRaw ? 'var(--text-primary)' : 'var(--text-muted)'
            }}
            onMouseEnter={e => {
              if (!showRaw) {
                e.currentTarget.style.background = 'var(--surface-3)'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }
            }}
            onMouseLeave={e => {
              if (!showRaw) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }
            }}
          >
            <IconCode />
            <span className="action-label hidden sm:inline">Raw</span>
          </button>
          <button
            onClick={handleExplain}
            disabled={isExplaining}
            className="flex items-center gap-1 sm:gap-1.5 px-1.5 sm:px-2 py-1 rounded text-xs transition-colors"
            style={{
              background: 'var(--accent-blue-muted)',
              color: 'var(--accent-blue)',
              opacity: isExplaining ? 0.5 : 1
            }}
            onMouseEnter={e => {
              if (!isExplaining) {
                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.25)'
              }
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--accent-blue-muted)'
            }}
          >
            <IconSparkles />
            <span className="action-label hidden sm:inline">{isExplaining ? 'Analyzing...' : 'Explain'}</span>
          </button>
          <SimulationToggleButton />
          <TrendChartButton availableTags={availableTags} />
        </div>
      </div>

      {/* Ladder visualization */}
      <LadderVisualization
        instructions={instructions}
        hoveredInstruction={hoveredInstruction}
        setHoveredInstruction={setHoveredInstruction}
        tagDescriptions={tagDescriptions}
        aoiNames={aoiNames}
        onExpandAoi={projectId ? handleExpandAoi : undefined}
        forcedTags={forcedTags}
        searchTerm={searchTerm}
        currentSearchMatchIndex={currentSearchMatchIndex}
        searchMatchStartIndex={searchMatchStartIndex}
        onTagXRef={onTagXRef}
      />

      {/* AOI Modal */}
      {expandedAoi && (
        <AoiModal
          aoi={expandedAoi}
          onClose={() => setExpandedAoi(null)}
        />
      )}

      {/* Trace Modal */}
      {traceResult && (
        <TraceModal
          traceResult={traceResult}
          onClose={() => setTraceResult(null)}
          direction={traceDirection}
        />
      )}

      {/* Similar Modal */}
      {similarResult && (
        <SimilarModal
          similarResult={similarResult}
          onClose={() => setSimilarResult(null)}
        />
      )}

      {/* Raw text (collapsible) */}
      {showRaw && (
        <div
          className="px-4 py-3 border-t"
          style={{
            background: 'var(--surface-0)',
            borderColor: 'var(--border-subtle)'
          }}
        >
          <pre
            className="text-[11px] font-mono whitespace-pre-wrap break-all leading-relaxed"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {rawText}
          </pre>
        </div>
      )}

      {/* Explanation */}
      {explanation && (
        <div
          className="px-fluid-4 py-3 border-t"
          style={{
            background: explanationSource === 'ai' ? 'var(--accent-blue-muted)' : 'var(--accent-emerald-muted)',
            borderColor: explanationSource === 'ai' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'
          }}
        >
          <div>
            <div
              className="text-fluid-xs font-semibold uppercase tracking-wider mb-2"
              style={{ color: explanationSource === 'ai' ? 'var(--accent-blue)' : 'var(--accent-emerald)' }}
            >
              {SOURCE_LABELS[explanationSource || 'library']?.label || 'Explanation'}
            </div>
            <div
              className="text-fluid-sm leading-relaxed break-words"
              style={{ color: 'var(--text-secondary)', wordBreak: 'break-word' }}
            >
              {formatExplanation(explanation || '')}
            </div>
          </div>
        </div>
      )}

      {/* Device Types */}
      {deviceTypes && deviceTypes.length > 0 && (
        <div
          className="px-3 sm:px-4 py-2 border-t flex flex-wrap gap-1.5"
          style={{ background: 'var(--surface-2)', borderColor: 'var(--border-subtle)' }}
        >
          <span className="text-[10px] uppercase font-semibold mr-2" style={{ color: 'var(--text-muted)' }}>
            Devices:
          </span>
          {deviceTypes.map((device, i) => (
            <span
              key={i}
              className="text-[11px] px-2 py-0.5 rounded"
              style={{ background: 'var(--accent-amber-muted)', color: 'var(--accent-amber)' }}
            >
              {device}
            </span>
          ))}
        </div>
      )}

      {/* I/O Mappings */}
      {ioMappings && ioMappings.length > 0 && (
        <div
          className="px-3 sm:px-4 py-3 border-t"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
        >
          <div
            className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5"
            style={{ color: 'var(--accent-cyan)' }}
          >
            <span>📍</span> I/O Addresses
          </div>
          <div className="space-y-1.5">
            {ioMappings.map((io, i) => (
              <div
                key={i}
                className="flex items-center gap-2 text-[11px] sm:text-[12px]"
              >
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-medium"
                  style={{
                    background: io.type === 'input' ? 'var(--accent-emerald-muted)' : 'var(--accent-amber-muted)',
                    color: io.type === 'input' ? 'var(--accent-emerald)' : 'var(--accent-amber)'
                  }}
                >
                  {io.type === 'input' ? 'IN' : 'OUT'}
                </span>
                <span className="font-mono" style={{ color: 'var(--text-primary)' }}>
                  {io.fullAddress}
                </span>
                {io.module && (
                  <>
                    <span style={{ color: 'var(--text-muted)' }}>→</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      {io.module.catalogNumber && (
                        <span className="font-medium">{io.module.catalogNumber}</span>
                      )}
                      {io.module.catalogNumber && io.module.name && ' '}
                      {io.module.name && (
                        <span style={{ color: 'var(--text-muted)' }}>({io.module.name})</span>
                      )}
                    </span>
                    {io.point !== undefined && (
                      <span
                        className="px-1 py-0.5 rounded text-[10px]"
                        style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                      >
                        Point {io.point}
                      </span>
                    )}
                  </>
                )}
                {!io.module && io.modulePath !== 'Local' && (
                  <span style={{ color: 'var(--text-muted)' }}>
                    ({io.modulePath})
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Troubleshooting */}
      {troubleshooting && troubleshooting.length > 0 && (
        <div
          className="px-3 sm:px-4 py-3 border-t"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
        >
          <div
            className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5"
            style={{ color: 'var(--accent-amber)' }}
          >
            <span>🔧</span> Troubleshooting
          </div>
          <ul className="space-y-1">
            {troubleshooting.map((tip, i) => (
              <li
                key={i}
                className="text-[12px] sm:text-[13px] flex items-start gap-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                <span style={{ color: 'var(--accent-amber)' }}>•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Conditions Checklist (Fault Finder) */}
      {conditions && conditions.length > 0 && (
        <div
          className="px-3 sm:px-4 py-3 border-t"
          style={{ background: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
        >
          <div
            className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5"
            style={{ color: 'var(--accent-red)' }}
          >
            <span>🔍</span> Condition Checklist
          </div>
          <div className="space-y-1.5">
            {conditions.map((cond, i) => (
              <div
                key={i}
                className="flex items-start gap-2 text-[11px] sm:text-[12px] p-1.5 rounded"
                style={{ background: 'var(--surface-0)' }}
              >
                <span
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded text-[10px] font-bold"
                  style={{
                    background: cond.type === 'input' ? 'var(--accent-emerald-muted)' : cond.type === 'compare' ? 'var(--accent-blue-muted)' : 'var(--accent-amber-muted)',
                    color: cond.type === 'input' ? 'var(--accent-emerald)' : cond.type === 'compare' ? 'var(--accent-blue)' : 'var(--accent-amber)'
                  }}
                >
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className="px-1 py-0.5 rounded text-[9px] font-medium"
                      style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                    >
                      {cond.instruction}
                    </span>
                    <span className="font-mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                      {cond.tag}
                    </span>
                  </div>
                  <div className="mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {cond.requirement}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cross References */}
      {crossRefs && crossRefs.length > 0 && (
        <div
          className="px-3 sm:px-4 py-3 border-t"
          style={{ background: 'var(--surface-0)', borderColor: 'var(--border-subtle)' }}
        >
          <div
            className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5"
            style={{ color: 'var(--accent-purple)' }}
          >
            <span>🔗</span> Tag Connections
          </div>
          <div className="space-y-2">
            {crossRefs.map((ref, i) => (
              <div key={i} className="text-[11px] sm:text-[12px]">
                <span className="font-mono font-medium" style={{ color: 'var(--text-primary)' }}>
                  {ref.tag}
                </span>
                <div className="ml-3 mt-0.5 flex flex-wrap gap-1">
                  {ref.usedIn.map((use, j) => (
                    <span
                      key={j}
                      className="px-1.5 py-0.5 rounded text-[10px]"
                      style={{
                        background: use.usage === 'write' ? 'var(--accent-amber-muted)' : 'var(--accent-blue-muted)',
                        color: use.usage === 'write' ? 'var(--accent-amber)' : 'var(--accent-blue)'
                      }}
                    >
                      {use.usage === 'write' ? '→' : '←'} {use.routine}:{use.rungNumber}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
