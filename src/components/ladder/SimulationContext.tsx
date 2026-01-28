'use client'

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react'

// ================================================
// Simulation Types
// ================================================

export interface TimerState {
  ACC: number      // Accumulator in milliseconds
  PRE: number      // Preset in milliseconds
  EN: boolean      // Enable bit
  TT: boolean      // Timer Timing bit
  DN: boolean      // Done bit
}

export interface CounterState {
  ACC: number      // Accumulator (count value)
  PRE: number      // Preset value
  CU: boolean      // Count Up enable
  CD: boolean      // Count Down enable
  DN: boolean      // Done bit (ACC >= PRE)
  UN: boolean      // Underflow bit (ACC < 0)
  OV: boolean      // Overflow bit
}

export interface SimulationState {
  enabled: boolean
  tagStates: Record<string, boolean>  // Tag name -> ON/OFF state
  timerStates: Record<string, TimerState>  // Timer tag -> timer state
  counterStates: Record<string, CounterState>  // Counter tag -> counter state
  latchedTags: Set<string>  // Tags that are latched ON via OTL
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
  tagStates: Record<string, boolean>,
  timerStates: Record<string, TimerState>,
  counterStates: Record<string, CounterState>
): boolean {
  const type = inst.type.toUpperCase()
  const tagName = inst.operands[0]?.split('§')[0] || ''

  // XIC - Examine If Closed - passes when tag is ON
  if (type === 'XIC') {
    // Check if it's a timer bit (e.g., Timer1.DN)
    const dotIndex = tagName.lastIndexOf('.')
    if (dotIndex > 0) {
      const baseTag = tagName.substring(0, dotIndex)
      const bit = tagName.substring(dotIndex + 1).toUpperCase()

      // Check timer bits
      if (timerStates[baseTag]) {
        if (bit === 'DN') return timerStates[baseTag].DN
        if (bit === 'EN') return timerStates[baseTag].EN
        if (bit === 'TT') return timerStates[baseTag].TT
      }

      // Check counter bits
      if (counterStates[baseTag]) {
        if (bit === 'DN') return counterStates[baseTag].DN
        if (bit === 'CU') return counterStates[baseTag].CU
        if (bit === 'CD') return counterStates[baseTag].CD
        if (bit === 'UN') return counterStates[baseTag].UN
        if (bit === 'OV') return counterStates[baseTag].OV
      }
    }
    return tagStates[tagName] === true
  }

  // XIO - Examine If Open - passes when tag is OFF
  if (type === 'XIO') {
    // Check if it's a timer bit
    const dotIndex = tagName.lastIndexOf('.')
    if (dotIndex > 0) {
      const baseTag = tagName.substring(0, dotIndex)
      const bit = tagName.substring(dotIndex + 1).toUpperCase()

      if (timerStates[baseTag]) {
        if (bit === 'DN') return !timerStates[baseTag].DN
        if (bit === 'EN') return !timerStates[baseTag].EN
        if (bit === 'TT') return !timerStates[baseTag].TT
      }

      if (counterStates[baseTag]) {
        if (bit === 'DN') return !counterStates[baseTag].DN
        if (bit === 'CU') return !counterStates[baseTag].CU
        if (bit === 'CD') return !counterStates[baseTag].CD
        if (bit === 'UN') return !counterStates[baseTag].UN
        if (bit === 'OV') return !counterStates[baseTag].OV
      }
    }
    return tagStates[tagName] !== true
  }

  // Comparison instructions - treat as true for simulation (would need actual values)
  if (['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM', 'CMP'].includes(type)) {
    return true
  }

  // One-shot instructions - pass through
  if (['ONS', 'OSR', 'OSF'].includes(type)) {
    return true
  }

  // Output instructions always pass power (they don't block it)
  if (['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'RTO', 'CTU', 'CTD', 'RES', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'JSR'].includes(type)) {
    return true
  }

  return true
}

/**
 * Calculate power flow through the rung and return output states
 */
export function calculatePowerFlow(
  instructions: Instruction[],
  tagStates: Record<string, boolean>,
  rows: Instruction[][],
  timerStates: Record<string, TimerState> = {},
  counterStates: Record<string, CounterState> = {}
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
      const passes = doesInstructionPassPower(inst, tagStates, timerStates, counterStates)

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
    if (['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'RTO', 'CTU', 'CTD', 'RES'].includes(type)) {
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

/**
 * Get outputs that should be updated based on power flow
 */
export function getOutputUpdates(
  instructions: Instruction[],
  powerFlow: PowerFlowResult,
  timerStates: Record<string, TimerState>,
  counterStates: Record<string, CounterState>
): {
  tagUpdates: Record<string, boolean>
  timerUpdates: Record<string, Partial<TimerState>>
  counterUpdates: Record<string, Partial<CounterState>>
} {
  const tagUpdates: Record<string, boolean> = {}
  const timerUpdates: Record<string, Partial<TimerState>> = {}
  const counterUpdates: Record<string, Partial<CounterState>> = {}

  instructions.forEach((inst, idx) => {
    const type = inst.type.toUpperCase()
    const tagName = inst.operands[0]?.split('§')[0] || ''
    const isEnergized = powerFlow.instructionEnergized[idx] && powerFlow.rungEnergized

    // OTE - Output Energize - follows rung state
    if (type === 'OTE') {
      tagUpdates[tagName] = isEnergized
    }

    // OTL - Output Latch - sets ON when energized, stays ON
    if (type === 'OTL') {
      if (isEnergized) {
        tagUpdates[tagName] = true
      }
      // Don't set to false - that's what makes it a latch
    }

    // OTU - Output Unlatch - sets OFF when energized
    if (type === 'OTU') {
      if (isEnergized) {
        tagUpdates[tagName] = false
      }
    }

    // RES - Reset - resets timers and counters
    if (type === 'RES') {
      if (isEnergized) {
        if (timerStates[tagName]) {
          timerUpdates[tagName] = { ACC: 0, DN: false, TT: false, EN: false }
        }
        if (counterStates[tagName]) {
          counterUpdates[tagName] = { ACC: 0, DN: false, UN: false, OV: false }
        }
      }
    }

    // TON - Timer On-Delay
    if (type === 'TON') {
      const preset = parsePreset(inst.operands[1]) || 5000 // Default 5 seconds
      if (isEnergized) {
        timerUpdates[tagName] = { EN: true, PRE: preset }
      } else {
        // When de-energized, reset TON
        timerUpdates[tagName] = { EN: false, ACC: 0, TT: false, DN: false, PRE: preset }
      }
    }

    // TOF - Timer Off-Delay
    if (type === 'TOF') {
      const preset = parsePreset(inst.operands[1]) || 5000
      if (isEnergized) {
        // When energized, DN is true immediately, ACC resets
        timerUpdates[tagName] = { EN: true, DN: true, ACC: 0, TT: false, PRE: preset }
      } else {
        // When de-energized, start timing
        timerUpdates[tagName] = { EN: false, PRE: preset }
      }
    }

    // RTO - Retentive Timer On
    if (type === 'RTO') {
      const preset = parsePreset(inst.operands[1]) || 5000
      if (isEnergized) {
        timerUpdates[tagName] = { EN: true, PRE: preset }
      } else {
        // RTO doesn't reset ACC when de-energized
        timerUpdates[tagName] = { EN: false, TT: false, PRE: preset }
      }
    }

    // CTU - Count Up
    if (type === 'CTU') {
      const preset = parsePreset(inst.operands[1]) || 10
      counterUpdates[tagName] = { CU: isEnergized, PRE: preset }
    }

    // CTD - Count Down
    if (type === 'CTD') {
      const preset = parsePreset(inst.operands[1]) || 10
      counterUpdates[tagName] = { CD: isEnergized, PRE: preset }
    }
  })

  return { tagUpdates, timerUpdates, counterUpdates }
}

/**
 * Parse preset value from operand string
 */
function parsePreset(operand: string | undefined): number | null {
  if (!operand) return null
  // Try to parse as number (in ms for timers, count for counters)
  const num = parseInt(operand.split('§')[0], 10)
  if (!isNaN(num)) return num
  return null
}

// ================================================
// Simulation Context
// ================================================

interface SimulationContextType {
  enabled: boolean
  tagStates: Record<string, boolean>
  timerStates: Record<string, TimerState>
  counterStates: Record<string, CounterState>
  toggleSimulation: () => void
  toggleTag: (tagName: string) => void
  setTagState: (tagName: string, state: boolean) => void
  setTagStates: (updates: Record<string, boolean>) => void
  updateTimers: (updates: Record<string, Partial<TimerState>>) => void
  updateCounters: (updates: Record<string, Partial<CounterState>>) => void
  resetTags: () => void
  scanCycle: number  // Current scan cycle count for triggering updates
}

const SimulationContext = createContext<SimulationContextType | null>(null)

// Timer update interval in ms (simulates PLC scan time)
const SCAN_INTERVAL = 100

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const [tagStates, setTagStates] = useState<Record<string, boolean>>({})
  const [timerStates, setTimerStates] = useState<Record<string, TimerState>>({})
  const [counterStates, setCounterStates] = useState<Record<string, CounterState>>({})
  const [scanCycle, setScanCycle] = useState(0)

  // Track previous counter enable states for edge detection
  const prevCounterStates = useRef<Record<string, { CU: boolean; CD: boolean }>>({})

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

  const setTagStatesBatch = useCallback((updates: Record<string, boolean>) => {
    setTagStates(prev => ({
      ...prev,
      ...updates
    }))
  }, [])

  const updateTimers = useCallback((updates: Record<string, Partial<TimerState>>) => {
    setTimerStates(prev => {
      const next = { ...prev }
      for (const [tag, update] of Object.entries(updates)) {
        next[tag] = {
          ACC: update.ACC ?? prev[tag]?.ACC ?? 0,
          PRE: update.PRE ?? prev[tag]?.PRE ?? 5000,
          EN: update.EN ?? prev[tag]?.EN ?? false,
          TT: update.TT ?? prev[tag]?.TT ?? false,
          DN: update.DN ?? prev[tag]?.DN ?? false,
        }
      }
      return next
    })
  }, [])

  const updateCounters = useCallback((updates: Record<string, Partial<CounterState>>) => {
    setCounterStates(prev => {
      const next = { ...prev }
      for (const [tag, update] of Object.entries(updates)) {
        const prevState = prev[tag] || { ACC: 0, PRE: 10, CU: false, CD: false, DN: false, UN: false, OV: false }
        const prevCU = prevCounterStates.current[tag]?.CU ?? false
        const prevCD = prevCounterStates.current[tag]?.CD ?? false

        let newACC = prevState.ACC

        // Count on rising edge of CU
        if (update.CU && !prevCU) {
          newACC = prevState.ACC + 1
        }
        // Count down on rising edge of CD
        if (update.CD && !prevCD) {
          newACC = prevState.ACC - 1
        }

        // Update previous states for edge detection
        prevCounterStates.current[tag] = {
          CU: update.CU ?? prevState.CU,
          CD: update.CD ?? prevState.CD
        }

        const PRE = update.PRE ?? prevState.PRE

        next[tag] = {
          ACC: update.ACC ?? newACC,
          PRE: PRE,
          CU: update.CU ?? prevState.CU,
          CD: update.CD ?? prevState.CD,
          DN: newACC >= PRE,
          UN: newACC < 0,
          OV: newACC > 32767,
        }
      }
      return next
    })
  }, [])

  const resetTags = useCallback(() => {
    setTagStates({})
    setTimerStates({})
    setCounterStates({})
    prevCounterStates.current = {}
  }, [])

  // Timer update loop - runs when simulation is enabled
  useEffect(() => {
    if (!enabled) return

    const interval = setInterval(() => {
      // Update timer accumulators
      setTimerStates(prev => {
        const next = { ...prev }
        let changed = false

        for (const [tag, timer] of Object.entries(prev)) {
          // TON logic: accumulate while EN is true and not done
          if (timer.EN && !timer.DN) {
            const newACC = timer.ACC + SCAN_INTERVAL
            const newDN = newACC >= timer.PRE
            next[tag] = {
              ...timer,
              ACC: Math.min(newACC, timer.PRE),
              TT: !newDN,
              DN: newDN
            }
            changed = true
          }
          // TOF logic: accumulate while EN is false and DN is true
          else if (!timer.EN && timer.DN) {
            const newACC = timer.ACC + SCAN_INTERVAL
            if (newACC >= timer.PRE) {
              next[tag] = {
                ...timer,
                ACC: timer.PRE,
                TT: false,
                DN: false
              }
              changed = true
            } else {
              next[tag] = {
                ...timer,
                ACC: newACC,
                TT: true
              }
              changed = true
            }
          }
        }

        return changed ? next : prev
      })

      // Increment scan cycle to trigger re-renders
      setScanCycle(c => c + 1)
    }, SCAN_INTERVAL)

    return () => clearInterval(interval)
  }, [enabled])

  return (
    <SimulationContext.Provider
      value={{
        enabled,
        tagStates,
        timerStates,
        counterStates,
        toggleSimulation,
        toggleTag,
        setTagState,
        setTagStates: setTagStatesBatch,
        updateTimers,
        updateCounters,
        resetTags,
        scanCycle
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
      timerStates: {},
      counterStates: {},
      toggleSimulation: () => {},
      toggleTag: () => {},
      setTagState: () => {},
      setTagStates: () => {},
      updateTimers: () => {},
      updateCounters: () => {},
      resetTags: () => {},
      scanCycle: 0
    }
  }
  return context
}

// ================================================
// Simulation Toggle Button Component
// ================================================

export function SimulationToggleButton() {
  const { enabled, toggleSimulation, resetTags, scanCycle } = useSimulation()

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
        <>
          <button
            onClick={resetTags}
            className="px-2 py-1 text-xs rounded transition-colors"
            style={{
              background: 'var(--surface-3)',
              color: 'var(--text-secondary)'
            }}
            title="Reset all tags, timers, and counters"
          >
            Reset
          </button>
          <span
            className="text-[10px] font-mono"
            style={{ color: 'var(--text-muted)' }}
            title="Scan cycle counter"
          >
            Scan: {scanCycle}
          </span>
        </>
      )}
    </div>
  )
}

// ================================================
// Timer Display Component
// ================================================

export function TimerDisplay({ tagName, preset }: { tagName: string; preset?: number }) {
  const { timerStates, enabled } = useSimulation()
  const timer = timerStates[tagName]

  if (!enabled || !timer) return null

  const progress = timer.PRE > 0 ? (timer.ACC / timer.PRE) * 100 : 0

  return (
    <div className="timer-display">
      <div className="timer-bar">
        <div
          className={`timer-fill ${timer.DN ? 'timer-done' : timer.TT ? 'timer-timing' : ''}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="timer-values">
        <span>{(timer.ACC / 1000).toFixed(1)}s</span>
        <span>/</span>
        <span>{(timer.PRE / 1000).toFixed(1)}s</span>
      </div>
      <div className="timer-bits">
        <span className={timer.EN ? 'bit-on' : 'bit-off'}>EN</span>
        <span className={timer.TT ? 'bit-on' : 'bit-off'}>TT</span>
        <span className={timer.DN ? 'bit-on' : 'bit-off'}>DN</span>
      </div>
    </div>
  )
}

// ================================================
// Counter Display Component
// ================================================

export function CounterDisplay({ tagName, preset }: { tagName: string; preset?: number }) {
  const { counterStates, enabled } = useSimulation()
  const counter = counterStates[tagName]

  if (!enabled || !counter) return null

  return (
    <div className="counter-display">
      <div className="counter-values">
        <span className="counter-acc">{counter.ACC}</span>
        <span>/</span>
        <span className="counter-pre">{counter.PRE}</span>
      </div>
      <div className="counter-bits">
        <span className={counter.CU ? 'bit-on' : 'bit-off'}>CU</span>
        <span className={counter.CD ? 'bit-on' : 'bit-off'}>CD</span>
        <span className={counter.DN ? 'bit-on' : 'bit-off'}>DN</span>
        {counter.UN && <span className="bit-on">UN</span>}
        {counter.OV && <span className="bit-on">OV</span>}
      </div>
    </div>
  )
}
