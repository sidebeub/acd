'use client'

import { useState } from 'react'

interface Instruction {
  type: string
  operands: string[]
}

interface LadderRungProps {
  rungId: string
  number: number
  comment?: string | null
  rawText: string
  instructions: Instruction[]
  explanation?: string | null
  explanationSource?: 'library' | 'ai' | 'hybrid' | 'learned' | null
  onExplain?: (rungId: string) => Promise<void>
  tagDescriptions?: Record<string, string>  // Map of tag name -> description
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

const SOURCE_LABELS: Record<string, { label: string; icon: string }> = {
  library: { label: 'Library', icon: '📚' },
  ai: { label: 'AI Analysis', icon: '✨' },
  hybrid: { label: 'Hybrid', icon: '🔄' },
  learned: { label: 'Learned', icon: '🧠' }
}

// Contact Symbol Component -| |- or -|/|-
function ContactSymbol({ type, color }: { type: 'XIC' | 'XIO'; color: string }) {
  const isNC = type === 'XIO'
  return (
    <svg width="40" height="24" viewBox="0 0 40 24" className="flex-shrink-0">
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
    <svg width="32" height="24" viewBox="0 0 32 24" className="flex-shrink-0">
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

// Instruction Box Component (for timers, counters, math, etc.)
function InstructionBox({
  inst,
  config,
  isHovered,
  onHover
}: {
  inst: Instruction
  config: typeof DEFAULT_CONFIG
  isHovered: boolean
  onHover: (hovered: boolean) => void
}) {
  const paramLabels = getParamLabels(inst.type)
  const hasParams = paramLabels.length > 0 && inst.operands.length > 0

  return (
    <div
      className="relative flex-shrink-0 rounded cursor-default transition-all overflow-hidden"
      style={{
        border: `2px solid ${config.border}`,
        transform: isHovered ? 'translateY(-2px)' : 'none',
        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
        minWidth: hasParams ? '140px' : 'auto'
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Header with instruction name */}
      <div
        className="px-3 py-1.5 font-mono text-xs font-bold text-white"
        style={{ background: config.color.replace('var(--inst-', '').replace(')', '') === 'input' ? 'rgb(34, 197, 94)' :
                            config.color.replace('var(--inst-', '').replace(')', '') === 'output' ? 'rgb(234, 179, 8)' :
                            config.color.replace('var(--inst-', '').replace(')', '') === 'timer' ? 'rgb(6, 182, 212)' :
                            config.color.replace('var(--inst-', '').replace(')', '') === 'counter' ? 'rgb(168, 85, 247)' :
                            config.color.replace('var(--inst-', '').replace(')', '') === 'math' ? 'rgb(236, 72, 153)' :
                            config.color.replace('var(--inst-', '').replace(')', '') === 'move' ? 'rgb(99, 102, 241)' :
                            config.color.replace('var(--inst-', '').replace(')', '') === 'jump' ? 'rgb(249, 115, 22)' :
                            'rgb(100, 100, 100)'
        }}
      >
        {inst.type}
      </div>

      {/* Parameters */}
      <div className="px-2 py-1.5" style={{ background: config.bg }}>
        {hasParams ? (
          // Show labeled parameters
          inst.operands.slice(0, 4).map((op, i) => (
            <div key={i} className="flex justify-between items-center gap-2 py-0.5">
              <span className="text-[9px] uppercase" style={{ color: 'var(--text-muted)' }}>
                {paramLabels[i] || `Param${i + 1}`}
              </span>
              <span
                className="font-mono text-[10px] truncate max-w-20 text-right"
                style={{ color: 'var(--text-secondary)' }}
                title={op}
              >
                {op}
              </span>
            </div>
          ))
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
      </div>

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

// Contact/Coil Element with tag name above
function ContactCoilElement({
  inst,
  config,
  isHovered,
  onHover,
  tagDescriptions
}: {
  inst: Instruction
  config: typeof DEFAULT_CONFIG & { isContact?: boolean; isCoil?: boolean }
  isHovered: boolean
  onHover: (hovered: boolean) => void
  tagDescriptions?: Record<string, string>
}) {
  const tagName = inst.operands[0] || ''
  const instType = inst.type.toUpperCase()
  const description = tagDescriptions ? getTagDescription(tagName, tagDescriptions) : undefined

  return (
    <div
      className="relative flex flex-col items-center cursor-default"
      style={{
        transform: isHovered ? 'translateY(-2px)' : 'none',
        transition: 'transform 0.15s ease'
      }}
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      {/* Tag description above (like Logix Designer) */}
      {description && (
        <div
          className="text-[9px] mb-0.5 truncate max-w-28 text-center leading-tight"
          style={{ color: 'var(--text-muted)' }}
          title={description}
        >
          {description}
        </div>
      )}

      {/* Tag name */}
      <div
        className="font-mono text-[10px] mb-1 truncate max-w-28 text-center"
        style={{ color: 'var(--text-secondary)' }}
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
        </div>
      )}
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
  onExplain,
  tagDescriptions
}: LadderRungProps) {
  const [isExplaining, setIsExplaining] = useState(false)
  const [showRaw, setShowRaw] = useState(false)
  const [hoveredInstruction, setHoveredInstruction] = useState<number | null>(null)

  const handleExplain = async () => {
    if (!onExplain || isExplaining) return
    setIsExplaining(true)
    try {
      await onExplain(rungId)
    } finally {
      setIsExplaining(false)
    }
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <span
            className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
            style={{
              background: 'var(--surface-4)',
              color: 'var(--text-secondary)'
            }}
          >
            {number}
          </span>
          {comment && (
            <span
              className="text-xs italic truncate max-w-md"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {comment}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors"
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
            Raw
          </button>
          <button
            onClick={handleExplain}
            disabled={isExplaining}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors"
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
            {isExplaining ? 'Analyzing...' : 'Explain'}
          </button>
        </div>
      </div>

      {/* Ladder visualization */}
      <div
        className="px-4 pt-4 pb-16 overflow-visible"
        style={{ background: 'var(--surface-1)' }}
      >
        <div className="flex items-center min-w-fit">
          {/* Left power rail */}
          <div
            className="power-rail flex-shrink-0"
            style={{ height: '60px' }}
          />

          {/* Instructions flow */}
          <div className="flex items-center flex-1">
            {instructions.length > 0 ? (
              instructions.map((inst, idx) => {
                const config = getInstructionConfig(inst.type)
                const isHovered = hoveredInstruction === idx
                const isContactOrCoil = config.isContact || config.isCoil

                return (
                  <div key={idx} className="flex items-center">
                    {/* Connecting wire */}
                    <div
                      className="w-6 h-0.5 flex-shrink-0"
                      style={{ background: 'var(--text-muted)' }}
                    />

                    {/* Render contact/coil symbol or instruction box */}
                    {isContactOrCoil ? (
                      <ContactCoilElement
                        inst={inst}
                        config={config}
                        isHovered={isHovered}
                        onHover={(h) => setHoveredInstruction(h ? idx : null)}
                        tagDescriptions={tagDescriptions}
                      />
                    ) : (
                      <InstructionBox
                        inst={inst}
                        config={config}
                        isHovered={isHovered}
                        onHover={(h) => setHoveredInstruction(h ? idx : null)}
                      />
                    )}
                  </div>
                )
              })
            ) : (
              <div className="flex-1 flex items-center px-4">
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

            {/* Final connecting wire */}
            {instructions.length > 0 && (
              <div
                className="flex-1 h-0.5 min-w-6"
                style={{ background: 'var(--text-muted)' }}
              />
            )}
          </div>

          {/* Right power rail */}
          <div
            className="power-rail flex-shrink-0"
            style={{ height: '60px' }}
          />
        </div>
      </div>

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
          className="px-4 py-3 border-t"
          style={{
            background: explanationSource === 'ai' ? 'var(--accent-blue-muted)' : 'var(--accent-emerald-muted)',
            borderColor: explanationSource === 'ai' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)'
          }}
        >
          <div className="flex items-start gap-2">
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 text-sm"
              style={{ background: explanationSource === 'ai' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)' }}
            >
              {SOURCE_LABELS[explanationSource || 'library']?.icon || '📚'}
            </div>
            <div>
              <div
                className="text-[10px] font-semibold uppercase tracking-wider mb-1"
                style={{ color: explanationSource === 'ai' ? 'var(--accent-blue)' : 'var(--accent-emerald)' }}
              >
                {SOURCE_LABELS[explanationSource || 'library']?.label || 'Explanation'}
              </div>
              <p
                className="text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                {explanation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
