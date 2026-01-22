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
  onExplain?: (rungId: string) => Promise<void>
}

// Instruction categories for visual styling
const INPUT_INSTRUCTIONS = ['XIC', 'XIO', 'ONS', 'OSR', 'OSF', 'EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM', 'CMP']
const OUTPUT_INSTRUCTIONS = ['OTE', 'OTL', 'OTU']
const TIMER_INSTRUCTIONS = ['TON', 'TOF', 'RTO', 'TONR', 'TOFR']
const COUNTER_INSTRUCTIONS = ['CTU', 'CTD', 'CTUD', 'RES']
const MATH_INSTRUCTIONS = ['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'SQR', 'SQRT', 'ABS', 'NEG', 'CPT']
const MOVE_INSTRUCTIONS = ['MOV', 'MVM', 'MVMT', 'COP', 'CPS', 'FLL', 'CLR']
const JUMP_INSTRUCTIONS = ['JSR', 'RET', 'JMP', 'LBL', 'SBR', 'FOR', 'NXT', 'BRK']

function getInstructionCategory(type: string): string {
  const upperType = type.toUpperCase()
  if (INPUT_INSTRUCTIONS.includes(upperType)) return 'input'
  if (OUTPUT_INSTRUCTIONS.includes(upperType)) return 'output'
  if (TIMER_INSTRUCTIONS.includes(upperType)) return 'timer'
  if (COUNTER_INSTRUCTIONS.includes(upperType)) return 'counter'
  if (MATH_INSTRUCTIONS.includes(upperType)) return 'math'
  if (MOVE_INSTRUCTIONS.includes(upperType)) return 'move'
  if (JUMP_INSTRUCTIONS.includes(upperType)) return 'jump'
  return 'other'
}

function getInstructionStyles(category: string): string {
  const styles: Record<string, string> = {
    input: 'bg-emerald-900/30 border-emerald-500/50 text-emerald-400',
    output: 'bg-amber-900/30 border-amber-500/50 text-amber-400',
    timer: 'bg-blue-900/30 border-blue-500/50 text-blue-400',
    counter: 'bg-purple-900/30 border-purple-500/50 text-purple-400',
    math: 'bg-cyan-900/30 border-cyan-500/50 text-cyan-400',
    move: 'bg-indigo-900/30 border-indigo-500/50 text-indigo-400',
    jump: 'bg-orange-900/30 border-orange-500/50 text-orange-400',
    other: 'bg-gray-900/30 border-gray-500/50 text-gray-400'
  }
  return styles[category] || styles.other
}

export function LadderRung({
  rungId,
  number,
  comment,
  rawText,
  instructions,
  explanation,
  onExplain
}: LadderRungProps) {
  const [isExplaining, setIsExplaining] = useState(false)
  const [localExplanation, setLocalExplanation] = useState(explanation)
  const [showRaw, setShowRaw] = useState(false)

  const handleExplain = async () => {
    if (!onExplain || isExplaining) return
    setIsExplaining(true)
    try {
      await onExplain(rungId)
      // Explanation will be updated via props
    } finally {
      setIsExplaining(false)
    }
  }

  return (
    <div className="border border-gray-700 rounded-lg bg-gray-900/50 p-4 mb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="text-gray-500 font-mono text-sm">Rung {number}</span>
          {comment && (
            <span className="text-gray-400 text-sm italic">// {comment}</span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-400 hover:bg-gray-700"
          >
            {showRaw ? 'Hide Raw' : 'Show Raw'}
          </button>
          <button
            onClick={handleExplain}
            disabled={isExplaining}
            className="text-xs px-2 py-1 rounded bg-blue-900/50 text-blue-400 hover:bg-blue-800/50 disabled:opacity-50"
          >
            {isExplaining ? 'Explaining...' : 'Explain'}
          </button>
        </div>
      </div>

      {/* Ladder visualization */}
      <div className="flex items-center gap-1 p-3 bg-gray-950 rounded border border-gray-800 overflow-x-auto">
        {/* Left power rail */}
        <div className="w-1 h-12 bg-gray-600 rounded flex-shrink-0" />

        {/* Instructions */}
        <div className="flex items-center gap-2 flex-1">
          {instructions.length > 0 ? (
            instructions.map((inst, idx) => {
              const category = getInstructionCategory(inst.type)
              const styles = getInstructionStyles(category)

              return (
                <div key={idx} className="flex items-center gap-1">
                  {/* Connecting wire */}
                  <div className="w-4 h-0.5 bg-gray-600" />

                  {/* Instruction block */}
                  <div className={`px-3 py-2 rounded border ${styles} font-mono text-sm`}>
                    <div className="font-bold">{inst.type}</div>
                    {inst.operands.length > 0 && (
                      <div className="text-xs opacity-75 mt-1 max-w-32 truncate">
                        {inst.operands[0]}
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="text-gray-500 text-sm italic px-4">No instructions parsed</div>
          )}

          {/* Connecting wire to end */}
          <div className="flex-1 h-0.5 bg-gray-600 min-w-4" />
        </div>

        {/* Right power rail */}
        <div className="w-1 h-12 bg-gray-600 rounded flex-shrink-0" />
      </div>

      {/* Raw text (collapsible) */}
      {showRaw && (
        <div className="mt-3 p-2 bg-gray-950 rounded border border-gray-800">
          <pre className="text-xs text-gray-400 font-mono whitespace-pre-wrap break-all">
            {rawText}
          </pre>
        </div>
      )}

      {/* Explanation */}
      {(localExplanation || explanation) && (
        <div className="mt-3 p-3 bg-blue-950/30 border border-blue-900/50 rounded">
          <div className="text-xs text-blue-400 mb-1 font-semibold">Explanation:</div>
          <p className="text-sm text-gray-300">{localExplanation || explanation}</p>
        </div>
      )}
    </div>
  )
}
