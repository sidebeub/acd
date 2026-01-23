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
}

// Instruction categories with their visual styling
const INSTRUCTION_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  // Input instructions
  XIC: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'NO Contact' },
  XIO: { color: 'var(--inst-input)', bg: 'rgba(34, 197, 94, 0.1)', border: 'rgba(34, 197, 94, 0.25)', label: 'NC Contact' },
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

  // Output instructions
  OTE: { color: 'var(--inst-output)', bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.25)', label: 'Output Energize' },
  OTL: { color: 'var(--inst-output)', bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.25)', label: 'Output Latch' },
  OTU: { color: 'var(--inst-output)', bg: 'rgba(234, 179, 8, 0.1)', border: 'rgba(234, 179, 8, 0.25)', label: 'Output Unlatch' },

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

const DEFAULT_CONFIG = {
  color: 'var(--text-tertiary)',
  bg: 'var(--surface-3)',
  border: 'var(--border-default)',
  label: 'Unknown'
}

function getInstructionConfig(type: string) {
  return INSTRUCTION_CONFIG[type.toUpperCase()] || DEFAULT_CONFIG
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

export function LadderRung({
  rungId,
  number,
  comment,
  rawText,
  instructions,
  explanation,
  explanationSource,
  onExplain
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
            style={{ height: '48px' }}
          />

          {/* Instructions flow */}
          <div className="flex items-center flex-1">
            {instructions.length > 0 ? (
              instructions.map((inst, idx) => {
                const config = getInstructionConfig(inst.type)
                const isHovered = hoveredInstruction === idx

                return (
                  <div key={idx} className="flex items-center">
                    {/* Connecting wire */}
                    <div
                      className="w-6 h-0.5 flex-shrink-0"
                      style={{ background: 'var(--text-muted)' }}
                    />

                    {/* Instruction block */}
                    <div
                      className="relative flex-shrink-0 px-3 py-2 rounded cursor-default transition-all"
                      style={{
                        background: config.bg,
                        border: `1px solid ${config.border}`,
                        transform: isHovered ? 'translateY(-2px)' : 'none',
                        boxShadow: isHovered ? '0 4px 12px rgba(0,0,0,0.3)' : 'none'
                      }}
                      onMouseEnter={() => setHoveredInstruction(idx)}
                      onMouseLeave={() => setHoveredInstruction(null)}
                    >
                      {/* Instruction type */}
                      <div
                        className="font-mono text-sm font-bold"
                        style={{ color: config.color }}
                      >
                        {inst.type}
                      </div>

                      {/* Primary operand */}
                      {inst.operands.length > 0 && (
                        <div
                          className="font-mono text-[10px] mt-0.5 truncate max-w-28"
                          style={{ color: 'var(--text-tertiary)' }}
                        >
                          {inst.operands[0]}
                        </div>
                      )}

                      {/* Hover tooltip - positioned below */}
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
                                <div key={i}>{op}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
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
            style={{ height: '48px' }}
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
