'use client'

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react'

// ================================================
// Simulation Types
// ================================================

export interface SimulationState {
  enabled: boolean
  tagStates: Record<string, boolean>  // Tag name -> ON/OFF state
}

export interface PowerFlowResult {
  wireEnergized: boolean[][]  // [rowIndex][wireSegmentIndex]
  instructionEnergized: boolean[]  // [instructionGlobalIndex]
  outputEnergized: boolean[]  // Output instructions energized
  rungEnergized: boolean  // Overall rung output
  branchEnergized: boolean[]  // [branchIndex]
}

interface Instruction {
  type: string
  operands: string[]
  branch_level?: number
  parallel_index?: number
  branchLeg?: number
  branchLevel?: number
  branchStart?: boolean
  is_input?: boolean
}

// ================================================
// Power Flow Calculation Logic
// ================================================

/**
 * Calculate if an instruction passes power based on its type and tag state
 */
export function doesInstructionPassPower(
  inst: Instruction,
  tagStates: Record<string, boolean>
): boolean {
  const type = inst.type.toUpperCase()
  const tagName = inst.operands[0]?.split('§')[0] || ''

  // XIC - Examine If Closed - passes when tag is ON
  if (type === 'XIC') {
    return tagStates[tagName] === true
  }

  // XIO - Examine If Open - passes when tag is OFF
  if (type === 'XIO') {
    return tagStates[tagName] !== true
  }

  // Comparison instructions - treat as true for simulation
  if (['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM', 'CMP'].includes(type)) {
    return true
  }

  // One-shot instructions - pass through
  if (['ONS', 'OSR', 'OSF'].includes(type)) {
    return true
  }

  // Output instructions always receive power
  if (['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'RTO', 'CTU', 'CTD', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'JSR'].includes(type)) {
    return true
  }

  return true
}

/**
 * Calculate power flow through the rung
 */
export function calculatePowerFlow(
  instructions: Instruction[],
  tagStates: Record<string, boolean>,
  rows: Instruction[][]
): PowerFlowResult {
  if (instructions.length === 0) {
    return {
      wireEnergized: [[]],
      instructionEnergized: [],
      outputEnergized: [],
      rungEnergized: false,
      branchEnergized: []
    }
  }

  // Build instruction index map
  let globalIdx = 0
  const idxMap: Map<Instruction, number> = new Map()
  for (const inst of instructions) {
    idxMap.set(inst, globalIdx++)
  }

  const instructionEnergized: boolean[] = new Array(instructions.length).fill(false)
  const wireEnergized: boolean[][] = rows.map(row => new Array(row.length + 1).fill(false))
  const branchEnergized: boolean[] = new Array(rows.length).fill(false)

  rows.forEach((rowInsts, rowIdx) => {
    let powerIn = true
    wireEnergized[rowIdx][0] = true

    rowInsts.forEach((inst, instIdx) => {
      const globalIndex = idxMap.get(inst) ?? 0
      const passes = doesInstructionPassPower(inst, tagStates)

      instructionEnergized[globalIndex] = powerIn
      powerIn = powerIn && passes
      wireEnergized[rowIdx][instIdx + 1] = powerIn
    })

    branchEnergized[rowIdx] = powerIn
  })

  const rungEnergized = branchEnergized.some(b => b)

  const outputEnergized: boolean[] = []
  instructions.forEach((inst, idx) => {
    const type = inst.type.toUpperCase()
    if (['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'RTO', 'CTU', 'CTD'].includes(type)) {
      outputEnergized.push(rungEnergized && instructionEnergized[idx])
    }
  })

  return {
    wireEnergized,
    instructionEnergized,
    outputEnergized,
    rungEnergized,
    branchEnergized
  }
}

// ================================================
// Simulation Context
// ================================================

interface SimulationContextType {
  enabled: boolean
  tagStates: Record<string, boolean>
  toggleSimulation: () => void
  toggleTag: (tagName: string) => void
  setTagState: (tagName: string, state: boolean) => void
  resetTags: () => void
}

const SimulationContext = createContext<SimulationContextType | null>(null)

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const [tagStates, setTagStates] = useState<Record<string, boolean>>({})

  const toggleSimulation = useCallback(() => {
    setEnabled(prev => !prev)
  }, [])

  const toggleTag = useCallback((tagName: string) => {
    setTagStates(prev => ({
      ...prev,
      [tagName]: !prev[tagName]
    }))
  }, [])

  const setTagState = useCallback((tagName: string, state: boolean) => {
    setTagStates(prev => ({
      ...prev,
      [tagName]: state
    }))
  }, [])

  const resetTags = useCallback(() => {
    setTagStates({})
  }, [])

  return (
    <SimulationContext.Provider
      value={{
        enabled,
        tagStates,
        toggleSimulation,
        toggleTag,
        setTagState,
        resetTags
      }}
    >
      {children}
    </SimulationContext.Provider>
  )
}

export function useSimulation() {
  const context = useContext(SimulationContext)
  if (!context) {
    // Return a default non-simulation state if not in provider
    return {
      enabled: false,
      tagStates: {},
      toggleSimulation: () => {},
      toggleTag: () => {},
      setTagState: () => {},
      resetTags: () => {}
    }
  }
  return context
}

// ================================================
// Simulation Toggle Button Component
// ================================================

export function SimulationToggleButton() {
  const { enabled, toggleSimulation, resetTags } = useSimulation()

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggleSimulation}
        className={`sim-toggle-btn ${enabled ? 'sim-toggle-btn-on' : 'sim-toggle-btn-off'}`}
        title={enabled ? 'Stop Simulation' : 'Start Simulation'}
      >
        <div className={`sim-status-dot ${enabled ? 'sim-status-dot-active' : ''}`} />
        {enabled ? (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            <span>Simulating</span>
          </>
        ) : (
          <>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" stroke="none">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            <span>Simulate</span>
          </>
        )}
      </button>
      {enabled && (
        <button
          onClick={resetTags}
          className="px-2 py-1 text-xs rounded transition-colors"
          style={{
            background: 'var(--surface-3)',
            color: 'var(--text-secondary)'
          }}
          title="Reset all tags to OFF"
        >
          Reset
        </button>
      )}
    </div>
  )
}
