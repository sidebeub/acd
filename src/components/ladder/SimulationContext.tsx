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

export interface OneShotState {
  prevRungIn: boolean  // Previous rung-in state for edge detection
  output: boolean      // Current output state (true for one scan on edge)
}

// ================================================
// Fault Injection Types
// ================================================

export type FaultType = 'stuck_on' | 'stuck_off' | 'intermittent' | 'delayed' | 'inverted'

export interface FaultConfig {
  type: FaultType
  params?: {
    delay?: number        // For 'delayed' type - delay in ms
    probability?: number  // For 'intermittent' type - probability of toggle (0-1)
  }
}

// Internal state for delayed faults
interface DelayedFaultState {
  pendingValue: boolean
  changeTime: number
}

// Internal state for intermittent faults
interface IntermittentFaultState {
  currentValue: boolean
  lastToggle: number
}

export interface SimulationState {
  enabled: boolean
  tagStates: Record<string, boolean>  // Tag name -> ON/OFF state
  timerStates: Record<string, TimerState>  // Timer tag -> timer state
  counterStates: Record<string, CounterState>  // Counter tag -> counter state
  numericValues: Record<string, number>  // Tag name -> numeric value for math operations
  latchedTags: Set<string>  // Tags that are latched ON via OTL
  forcedTags: Record<string, 'on' | 'off' | null>  // Tags that are forced (overrides tagStates)
  faults: Record<string, FaultConfig>  // Tag name -> fault configuration
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
// Fault Application Logic
// ================================================

// Store for delayed fault states (module-level to persist across renders)
const delayedFaultStates: Record<string, DelayedFaultState> = {}

// Store for intermittent fault states
const intermittentFaultStates: Record<string, IntermittentFaultState> = {}

/**
 * Apply fault transformation to a tag value
 * Returns the transformed value based on the fault configuration
 */
export function applyFault(
  tagName: string,
  actualValue: boolean,
  fault: FaultConfig | undefined,
  currentTime: number = Date.now()
): boolean {
  if (!fault) return actualValue

  switch (fault.type) {
    case 'stuck_on':
      return true

    case 'stuck_off':
      return false

    case 'inverted':
      return !actualValue

    case 'intermittent': {
      // Random toggle based on probability
      const prob = fault.params?.probability ?? 0.1 // Default 10% chance
      const state = intermittentFaultStates[tagName]

      if (!state) {
        // Initialize state
        intermittentFaultStates[tagName] = {
          currentValue: actualValue,
          lastToggle: currentTime
        }
        return actualValue
      }

      // Check if we should toggle (based on probability and time since last toggle)
      const timeSinceToggle = currentTime - state.lastToggle
      if (timeSinceToggle > 100 && Math.random() < prob) {
        intermittentFaultStates[tagName] = {
          currentValue: !state.currentValue,
          lastToggle: currentTime
        }
        return !state.currentValue
      }

      return state.currentValue
    }

    case 'delayed': {
      const delay = fault.params?.delay ?? 500 // Default 500ms delay
      const state = delayedFaultStates[tagName]

      if (!state) {
        // Initialize with current value
        delayedFaultStates[tagName] = {
          pendingValue: actualValue,
          changeTime: currentTime
        }
        return actualValue
      }

      // If actual value changed, update pending with delay
      if (state.pendingValue !== actualValue) {
        delayedFaultStates[tagName] = {
          pendingValue: actualValue,
          changeTime: currentTime + delay
        }
      }

      // Return value based on whether delay has passed
      if (currentTime >= state.changeTime) {
        return state.pendingValue
      }

      // Return opposite of pending (old value) while waiting
      return !state.pendingValue
    }

    default:
      return actualValue
  }
}

/**
 * Clear fault states for a tag when fault is removed
 */
export function clearFaultState(tagName: string): void {
  delete delayedFaultStates[tagName]
  delete intermittentFaultStates[tagName]
}

/**
 * Clear all fault states
 */
export function clearAllFaultStates(): void {
  Object.keys(delayedFaultStates).forEach(key => delete delayedFaultStates[key])
  Object.keys(intermittentFaultStates).forEach(key => delete intermittentFaultStates[key])
}

// ================================================
// Power Flow Calculation Logic
// ================================================

/**
 * Calculate if an instruction passes power based on its type and tag state
 * For one-shot instructions, use the overload with oneShotStates parameter
 * forcedTags takes priority over tagStates when present
 * faults are applied after forced tags
 */
export function doesInstructionPassPower(
  inst: Instruction,
  tagStates: Record<string, boolean>,
  timerStates: Record<string, TimerState>,
  counterStates: Record<string, CounterState>,
  oneShotStates?: Record<string, OneShotState>,
  currentRungIn?: boolean,
  forcedTags?: Record<string, 'on' | 'off' | null>,
  faults?: Record<string, FaultConfig>
): boolean {
  const type = inst.type.toUpperCase()
  const tagName = inst.operands[0]?.split('§')[0] || ''

  // Helper to get effective tag state (forced state takes priority, then faults)
  const getEffectiveTagState = (tag: string): boolean => {
    let value: boolean

    // Check forcedTags first
    if (forcedTags) {
      // Check exact tag name
      if (forcedTags[tag] === 'on') {
        value = true
      } else if (forcedTags[tag] === 'off') {
        value = false
      } else {
        // Also check base tag name (without array indices or member access)
        const baseName = tag.split('.')[0].split('[')[0]
        if (forcedTags[baseName] === 'on') {
          value = true
        } else if (forcedTags[baseName] === 'off') {
          value = false
        } else {
          // Fall back to normal tag state
          value = tagStates[tag] === true
        }
      }
    } else {
      // Fall back to normal tag state
      value = tagStates[tag] === true
    }

    // Apply fault transformation if present
    if (faults) {
      const fault = faults[tag] || faults[tag.split('.')[0].split('[')[0]]
      if (fault) {
        value = applyFault(tag, value, fault)
      }
    }

    return value
  }

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
    return getEffectiveTagState(tagName)
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
    return !getEffectiveTagState(tagName)
  }

  // Comparison instructions - fallback to true when no numeric values available
  // Use doesComparisonPassPower for proper evaluation with numericValues
  if (['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM', 'CMP'].includes(type)) {
    return true
  }

  // One-shot instructions - edge detection
  // ONS/OSR: output is true for ONE scan when rung transitions from false to true (rising edge)
  // OSF: output is true for ONE scan when rung transitions from true to false (falling edge)
  if (['ONS', 'OSR', 'OSF'].includes(type)) {
    // If we have one-shot state tracking, use edge detection
    if (oneShotStates !== undefined && currentRungIn !== undefined) {
      const storageBit = tagName // First operand is the storage bit
      const oneShotState = oneShotStates[storageBit]

      if (oneShotState) {
        // Return the pre-calculated output from the one-shot state
        return oneShotState.output
      }

      // No previous state - for ONS/OSR, first scan with power is a rising edge
      // For OSF, we need a falling edge which can't happen on first scan with power
      if (type === 'OSF') {
        return false
      }
      // ONS/OSR: if this is first scan with currentRungIn=true, it's a rising edge
      return currentRungIn
    }

    // Fallback: pass through if no edge detection available
    return true
  }

  // Output instructions always pass power (they don't block it)
  if (['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'RTO', 'CTU', 'CTD', 'RES', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'JSR'].includes(type)) {
    return true
  }

  return true
}

/**
 * Get numeric value from an operand - either a literal number or a tag reference
 */
export function getNumericValueFromOperand(
  operand: string | undefined,
  numericValues: Record<string, number>
): number {
  if (!operand) return 0
  const cleanOperand = operand.split('§')[0]

  // Try to parse as a literal number
  const num = parseFloat(cleanOperand)
  if (!isNaN(num)) return num

  // Otherwise, look up in numericValues
  return numericValues[cleanOperand] ?? 0
}

/**
 * Enhanced version that also handles comparison instructions with numeric values
 */
export function doesInstructionPassPowerWithNumeric(
  inst: Instruction,
  tagStates: Record<string, boolean>,
  timerStates: Record<string, TimerState>,
  counterStates: Record<string, CounterState>,
  numericValues: Record<string, number>,
  oneShotStates?: Record<string, OneShotState>,
  currentRungIn?: boolean,
  forcedTags?: Record<string, 'on' | 'off' | null>
): boolean {
  const type = inst.type.toUpperCase()

  // Handle comparison instructions with numeric values
  if (['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ'].includes(type)) {
    const sourceA = getNumericValueFromOperand(inst.operands[0], numericValues)
    const sourceB = getNumericValueFromOperand(inst.operands[1], numericValues)

    switch (type) {
      case 'EQU': return sourceA === sourceB
      case 'NEQ': return sourceA !== sourceB
      case 'GRT': return sourceA > sourceB
      case 'GEQ': return sourceA >= sourceB
      case 'LES': return sourceA < sourceB
      case 'LEQ': return sourceA <= sourceB
      default: return true
    }
  }

  // LIM - Limit test: passes if Low <= Test <= High
  if (type === 'LIM') {
    const lowLimit = getNumericValueFromOperand(inst.operands[0], numericValues)
    const testValue = getNumericValueFromOperand(inst.operands[1], numericValues)
    const highLimit = getNumericValueFromOperand(inst.operands[2], numericValues)
    return lowLimit <= testValue && testValue <= highLimit
  }

  // Fall back to the basic power flow check for other instructions
  return doesInstructionPassPower(inst, tagStates, timerStates, counterStates, oneShotStates, currentRungIn, forcedTags)
}

/**
 * Calculate power flow through the rung with numeric value support
 */
export function calculatePowerFlowWithNumeric(
  instructions: Instruction[],
  tagStates: Record<string, boolean>,
  rows: Instruction[][],
  timerStates: Record<string, TimerState> = {},
  counterStates: Record<string, CounterState> = {},
  numericValues: Record<string, number> = {},
  forcedTags?: Record<string, 'on' | 'off' | null>
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
      const passes = doesInstructionPassPowerWithNumeric(
        inst, tagStates, timerStates, counterStates, numericValues, undefined, undefined, forcedTags
      )

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
    if (['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'RTO', 'CTU', 'CTD', 'RES', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV'].includes(type)) {
      // Output instructions energized based on power reaching them, not entire rung
      outputEnergized.push(instructionEnergized[idx])
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
 * Calculate power flow through the rung and return output states
 */
export function calculatePowerFlow(
  instructions: Instruction[],
  tagStates: Record<string, boolean>,
  rows: Instruction[][],
  timerStates: Record<string, TimerState> = {},
  counterStates: Record<string, CounterState> = {},
  oneShotStates: Record<string, OneShotState> = {},
  forcedTags: Record<string, 'on' | 'off' | null> = {}
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
      // Pass current power-in state and one-shot states for edge detection
      const passes = doesInstructionPassPower(inst, tagStates, timerStates, counterStates, oneShotStates, powerIn, forcedTags)

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
      // Output instructions energized based on power reaching them, not entire rung
      outputEnergized.push(instructionEnergized[idx])
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
 * Get outputs that should be updated based on power flow, including math instruction results
 */
export function getOutputUpdatesWithNumeric(
  instructions: Instruction[],
  powerFlow: PowerFlowResult,
  timerStates: Record<string, TimerState>,
  counterStates: Record<string, CounterState>,
  numericValues: Record<string, number>
): {
  tagUpdates: Record<string, boolean>
  timerUpdates: Record<string, Partial<TimerState>>
  counterUpdates: Record<string, Partial<CounterState>>
  numericUpdates: Record<string, number>
} {
  // Get base updates
  const baseUpdates = getOutputUpdates(instructions, powerFlow, timerStates, counterStates)
  const numericUpdates: Record<string, number> = {}

  instructions.forEach((inst, idx) => {
    const type = inst.type.toUpperCase()
    // Math/output instructions execute based on power reaching THEM, not entire rung result
    // This is consistent with real PLC behavior where instructions execute when power flows to them
    const isEnergized = powerFlow.instructionEnergized[idx]

    // Only execute math instructions when energized
    if (!isEnergized) return

    // MOV(source, dest): dest = source value
    if (type === 'MOV') {
      const source = getNumericValueFromOperand(inst.operands[0], numericValues)
      const destTag = inst.operands[1]?.split('§')[0] || ''
      if (destTag) {
        numericUpdates[destTag] = source
      }
    }

    // ADD(sourceA, sourceB, dest): dest = sourceA + sourceB
    if (type === 'ADD') {
      const sourceA = getNumericValueFromOperand(inst.operands[0], numericValues)
      const sourceB = getNumericValueFromOperand(inst.operands[1], numericValues)
      const destTag = inst.operands[2]?.split('§')[0] || ''
      if (destTag) {
        numericUpdates[destTag] = sourceA + sourceB
      }
    }

    // SUB(sourceA, sourceB, dest): dest = sourceA - sourceB
    if (type === 'SUB') {
      const sourceA = getNumericValueFromOperand(inst.operands[0], numericValues)
      const sourceB = getNumericValueFromOperand(inst.operands[1], numericValues)
      const destTag = inst.operands[2]?.split('§')[0] || ''
      if (destTag) {
        numericUpdates[destTag] = sourceA - sourceB
      }
    }

    // MUL(sourceA, sourceB, dest): dest = sourceA * sourceB
    if (type === 'MUL') {
      const sourceA = getNumericValueFromOperand(inst.operands[0], numericValues)
      const sourceB = getNumericValueFromOperand(inst.operands[1], numericValues)
      const destTag = inst.operands[2]?.split('§')[0] || ''
      if (destTag) {
        numericUpdates[destTag] = sourceA * sourceB
      }
    }

    // DIV(sourceA, sourceB, dest): dest = sourceA / sourceB (handle div by zero)
    if (type === 'DIV') {
      const sourceA = getNumericValueFromOperand(inst.operands[0], numericValues)
      const sourceB = getNumericValueFromOperand(inst.operands[1], numericValues)
      const destTag = inst.operands[2]?.split('§')[0] || ''
      if (destTag) {
        // Handle division by zero - result is 0 (like PLC behavior)
        numericUpdates[destTag] = sourceB !== 0 ? sourceA / sourceB : 0
      }
    }
  })

  return {
    ...baseUpdates,
    numericUpdates
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
    // Output instructions execute based on power reaching THEM, not entire rung result
    // This matches real PLC behavior - power flows left to right, instructions execute when power reaches them
    const isEnergized = powerFlow.instructionEnergized[idx]

    // OTE - Output Energize - follows power flow to this instruction
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
    // Timer operands: [tag, timeBase, preset, accum]
    // timeBase is in seconds (e.g., "1.0" = 1 second per count)
    // preset is the count value
    // preset_ms = preset * timeBase * 1000
    if (type === 'TON') {
      const preset = parseTimerPreset(inst.operands[1], inst.operands[2])
      if (isEnergized) {
        timerUpdates[tagName] = { EN: true, PRE: preset }
      } else {
        // When de-energized, reset TON
        timerUpdates[tagName] = { EN: false, ACC: 0, TT: false, DN: false, PRE: preset }
      }
    }

    // TOF - Timer Off-Delay
    if (type === 'TOF') {
      const preset = parseTimerPreset(inst.operands[1], inst.operands[2])
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
      const preset = parseTimerPreset(inst.operands[1], inst.operands[2])
      if (isEnergized) {
        timerUpdates[tagName] = { EN: true, PRE: preset }
      } else {
        // RTO doesn't reset ACC when de-energized
        timerUpdates[tagName] = { EN: false, TT: false, PRE: preset }
      }
    }

    // CTU - Count Up
    // NOTE: CTU counts based on power reaching IT, not whether entire rung is energized
    // This allows CTU to count even when downstream instructions (like XIC(Counter.DN)) block the rung
    if (type === 'CTU') {
      const preset = parsePreset(inst.operands[1]) || 10
      const cuEnergized = powerFlow.instructionEnergized[idx]  // Power INTO the CTU, not rung result
      counterUpdates[tagName] = { CU: cuEnergized, PRE: preset }
    }

    // CTD - Count Down
    // Same as CTU - counts based on power reaching it
    if (type === 'CTD') {
      const preset = parsePreset(inst.operands[1]) || 10
      const cdEnergized = powerFlow.instructionEnergized[idx]  // Power INTO the CTD, not rung result
      counterUpdates[tagName] = { CD: cdEnergized, PRE: preset }
    }
  })

  return { tagUpdates, timerUpdates, counterUpdates }
}

/**
 * Calculate one-shot state updates based on power flow
 * One-shots detect edges in power flow and output true for exactly one scan
 */
export function getOneShotUpdates(
  instructions: Instruction[],
  powerFlow: PowerFlowResult,
  oneShotStates: Record<string, OneShotState> = {}
): Record<string, OneShotState> {
  const oneShotUpdates: Record<string, OneShotState> = {}

  instructions.forEach((inst, idx) => {
    const type = inst.type.toUpperCase()
    const tagName = inst.operands[0]?.split('§')[0] || ''

    // One-shot instructions - update state for next scan
    // The rung-in state for one-shots is the power flowing INTO the instruction
    if (['ONS', 'OSR', 'OSF'].includes(type)) {
      const storageBit = tagName
      const currentRungIn = powerFlow.instructionEnergized[idx]
      const prevState = oneShotStates[storageBit]
      const prevRungIn = prevState?.prevRungIn ?? false

      // Calculate output for current scan
      let output: boolean
      if (type === 'OSF') {
        // Falling edge: output true when transitioning from true to false
        output = !currentRungIn && prevRungIn
      } else {
        // Rising edge (ONS/OSR): output true when transitioning from false to true
        output = currentRungIn && !prevRungIn
      }

      // Store state for next scan - prevRungIn becomes current rungIn
      oneShotUpdates[storageBit] = {
        prevRungIn: currentRungIn,
        output: output
      }
    }
  })

  return oneShotUpdates
}

/**
 * Parse timer preset from timeBase and preset operands
 * Timer operands: [tag, timeBase, preset, accum]
 * timeBase: seconds per count (e.g., "1.0" = 1 second, "0.01" = 10ms)
 * preset: number of counts
 * Returns preset in milliseconds
 */
function parseTimerPreset(timeBaseOp: string | undefined, presetOp: string | undefined): number {
  // Default: 5 seconds
  const DEFAULT_PRESET_MS = 5000

  // Parse time base (seconds per count)
  let timeBase = 1.0 // Default 1 second
  if (timeBaseOp) {
    const tbVal = parseFloat(timeBaseOp.split('§')[0])
    if (!isNaN(tbVal) && tbVal > 0) {
      timeBase = tbVal
    }
  }

  // Parse preset (count value)
  let preset = 5 // Default 5 counts
  if (presetOp) {
    const pVal = parseInt(presetOp.split('§')[0], 10)
    if (!isNaN(pVal) && pVal > 0) {
      preset = pVal
    }
  }

  // Calculate preset in milliseconds
  const presetMs = preset * timeBase * 1000
  return presetMs > 0 ? presetMs : DEFAULT_PRESET_MS
}

/**
 * Parse preset value from operand string (for counters)
 */
function parsePreset(operand: string | undefined): number | null {
  if (!operand) return null
  // Try to parse as number
  const num = parseInt(operand.split('§')[0], 10)
  if (!isNaN(num)) return num
  return null
}

// ================================================
// Comparison Instruction Evaluation
// ================================================

/**
 * Parse an operand to get its numeric value
 * Operands can be: direct numbers (123), tag names (MyTag), or expressions
 * Returns the numeric value or undefined if not parseable
 */
export function parseOperandValue(
  operand: string | undefined,
  numericValues: Record<string, number>,
  timerStates: Record<string, TimerState>,
  counterStates: Record<string, CounterState>
): number | undefined {
  if (!operand) return undefined

  // Strip any descriptive suffix (separated by section symbol)
  const cleanOperand = operand.split('§')[0].trim()

  // Try to parse as a direct number
  const directNum = parseFloat(cleanOperand)
  if (!isNaN(directNum)) {
    return directNum
  }

  // Check if it's a timer/counter member access (e.g., MyTimer.ACC, MyCounter.PRE)
  const dotIndex = cleanOperand.lastIndexOf('.')
  if (dotIndex > 0) {
    const baseTag = cleanOperand.substring(0, dotIndex)
    const member = cleanOperand.substring(dotIndex + 1).toUpperCase()

    // Check timer members
    if (timerStates[baseTag]) {
      if (member === 'ACC') return timerStates[baseTag].ACC
      if (member === 'PRE') return timerStates[baseTag].PRE
    }

    // Check counter members
    if (counterStates[baseTag]) {
      if (member === 'ACC') return counterStates[baseTag].ACC
      if (member === 'PRE') return counterStates[baseTag].PRE
    }
  }

  // Look up in numericValues
  if (numericValues[cleanOperand] !== undefined) {
    return numericValues[cleanOperand]
  }

  // Default to 0 for unknown tags in simulation
  return 0
}

/**
 * Evaluate comparison instructions (EQU, NEQ, LES, LEQ, GRT, GEQ, LIM)
 * Returns true if the comparison passes (power flows through)
 */
export function doesComparisonPassPower(
  inst: Instruction,
  numericValues: Record<string, number>,
  timerStates: Record<string, TimerState>,
  counterStates: Record<string, CounterState>
): boolean {
  const type = inst.type.toUpperCase()

  // Get Source A and Source B values
  const sourceA = parseOperandValue(inst.operands[0], numericValues, timerStates, counterStates)
  const sourceB = parseOperandValue(inst.operands[1], numericValues, timerStates, counterStates)

  // If we can't parse both values, default to true (pass power)
  if (sourceA === undefined || sourceB === undefined) {
    return true
  }

  switch (type) {
    case 'EQU':
      return sourceA === sourceB
    case 'NEQ':
      return sourceA !== sourceB
    case 'LES':
      return sourceA < sourceB
    case 'LEQ':
      return sourceA <= sourceB
    case 'GRT':
      return sourceA > sourceB
    case 'GEQ':
      return sourceA >= sourceB
    case 'LIM': {
      // LIM has 3 operands: Low Limit, Test Value, High Limit
      const lowLimit = sourceA
      const testValue = sourceB
      const highLimit = parseOperandValue(inst.operands[2], numericValues, timerStates, counterStates)
      if (highLimit === undefined) return true
      return testValue >= lowLimit && testValue <= highLimit
    }
    case 'CMP':
      // CMP uses an expression - for now, just pass power
      return true
    default:
      return true
  }
}

// ================================================
// Trend Data Types
// ================================================

export interface TrendPoint {
  time: number  // Time in seconds since simulation start
  value: number // Value at that time
}

// Maximum number of trend data samples to keep per tag
const MAX_TREND_SAMPLES = 1000

// ================================================
// Simulation Context
// ================================================

interface SimulationContextType {
  enabled: boolean
  tagStates: Record<string, boolean>
  timerStates: Record<string, TimerState>
  counterStates: Record<string, CounterState>
  oneShotStates: Record<string, OneShotState>  // One-shot storage bit -> state for edge detection
  forcedTags: Record<string, 'on' | 'off' | null>
  faults: Record<string, FaultConfig>  // Fault injection configurations
  numericValues: Record<string, number>  // Tag name -> numeric value for math/compare operations
  editedValues: Set<string>  // Track which values have been manually edited
  toggleSimulation: () => void
  toggleTag: (tagName: string) => void
  setTagState: (tagName: string, state: boolean) => void
  setTagStates: (updates: Record<string, boolean>) => void
  updateTimers: (updates: Record<string, Partial<TimerState>>) => void
  updateCounters: (updates: Record<string, Partial<CounterState>>) => void
  updateOneShots: (updates: Record<string, OneShotState>) => void  // Update one-shot states after each scan
  forceTagOn: (tagName: string) => void
  forceTagOff: (tagName: string) => void
  removeForce: (tagName: string) => void
  injectFault: (tagName: string, config: FaultConfig) => void  // Inject a fault
  clearFault: (tagName: string) => void  // Clear a specific fault
  clearAllFaults: () => void  // Clear all faults
  setNumericValue: (tag: string, value: number) => void  // Set numeric value for tag
  getNumericValue: (tag: string, defaultVal?: number) => number  // Get numeric value with optional default
  resetNumericValue: (tag: string) => void  // Reset single numeric value to original
  resetAllEditedValues: () => void  // Reset all edited values
  initializeNumericValues: (values: Record<string, number>) => void  // Initialize multiple numeric values (e.g., from project tags)
  setTimerAcc: (tagName: string, acc: number) => void  // Direct timer ACC edit
  setTimerPre: (tagName: string, pre: number) => void  // Direct timer PRE edit
  setCounterAcc: (tagName: string, acc: number) => void  // Direct counter ACC edit
  setCounterPre: (tagName: string, pre: number) => void  // Direct counter PRE edit
  resetTags: () => void
  scanCycle: number  // Current scan cycle count for triggering updates
  // Speed control
  scanRate: number
  setScanRate: (ms: number) => void
  // Step mode
  stepMode: boolean
  setStepMode: (enabled: boolean) => void
  step: () => void
  // Trend data functionality
  trendData: Record<string, TrendPoint[]>  // Tag name -> array of trend points
  trendTags: string[]  // List of tags being trended
  trendRecording: boolean  // Whether trend recording is active
  addTrendTag: (tagName: string) => void  // Add a tag to trend
  removeTrendTag: (tagName: string) => void  // Remove a tag from trend
  clearTrendData: () => void  // Clear all trend data
  setTrendRecording: (recording: boolean) => void  // Pause/resume trend recording
}

const SimulationContext = createContext<SimulationContextType | null>(null)

// Speed presets for simulation
export const SPEED_PRESETS = {
  Slow: 500,
  Normal: 100,
  Fast: 50,
  Turbo: 20
} as const

export type SpeedPresetName = keyof typeof SPEED_PRESETS

// Default timer update interval in ms (simulates PLC scan time)
const DEFAULT_SCAN_INTERVAL = 100

export function SimulationProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false)
  const [tagStates, setTagStates] = useState<Record<string, boolean>>({})
  const [timerStates, setTimerStates] = useState<Record<string, TimerState>>({})
  const [counterStates, setCounterStates] = useState<Record<string, CounterState>>({})
  const [oneShotStates, setOneShotStates] = useState<Record<string, OneShotState>>({})
  const [forcedTags, setForcedTags] = useState<Record<string, 'on' | 'off' | null>>({})
  const [faults, setFaults] = useState<Record<string, FaultConfig>>({})
  const [numericValues, setNumericValues] = useState<Record<string, number>>({})
  const [editedValues, setEditedValues] = useState<Set<string>>(new Set())
  const [scanCycle, setScanCycle] = useState(0)
  const [scanRate, setScanRateState] = useState(DEFAULT_SCAN_INTERVAL)
  const [stepMode, setStepModeState] = useState(false)

  // Trend data state
  const [trendData, setTrendData] = useState<Record<string, TrendPoint[]>>({})
  const [trendTags, setTrendTags] = useState<string[]>([])
  const [trendRecording, setTrendRecording] = useState(true)
  const trendStartTime = useRef<number>(Date.now())

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

  // Update one-shot states after each scan cycle
  const updateOneShots = useCallback((updates: Record<string, OneShotState>) => {
    setOneShotStates(prev => ({
      ...prev,
      ...updates
    }))
  }, [])

  // Force tag functions - like RSLogix force table
  const forceTagOn = useCallback((tagName: string) => {
    setForcedTags(prev => ({
      ...prev,
      [tagName]: 'on'
    }))
  }, [])

  const forceTagOff = useCallback((tagName: string) => {
    setForcedTags(prev => ({
      ...prev,
      [tagName]: 'off'
    }))
  }, [])

  const removeForce = useCallback((tagName: string) => {
    setForcedTags(prev => {
      const next = { ...prev }
      delete next[tagName]
      return next
    })
  }, [])

  // Fault injection functions
  const injectFault = useCallback((tagName: string, config: FaultConfig) => {
    setFaults(prev => ({
      ...prev,
      [tagName]: config
    }))
  }, [])

  const clearFaultFn = useCallback((tagName: string) => {
    clearFaultState(tagName)
    setFaults(prev => {
      const next = { ...prev }
      delete next[tagName]
      return next
    })
  }, [])

  const clearAllFaultsFn = useCallback(() => {
    clearAllFaultStates()
    setFaults({})
  }, [])

  // Numeric value functions for comparison instructions
  const setNumericValue = useCallback((tag: string, value: number) => {
    setNumericValues(prev => ({
      ...prev,
      [tag]: value
    }))
    setEditedValues(prev => new Set(prev).add(tag))
  }, [])

  const getNumericValue = useCallback((tag: string, defaultVal: number = 0): number => {
    return numericValues[tag] ?? defaultVal
  }, [numericValues])

  const resetNumericValue = useCallback((tag: string) => {
    setNumericValues(prev => {
      const next = { ...prev }
      delete next[tag]
      return next
    })
    setEditedValues(prev => {
      const next = new Set(prev)
      next.delete(tag)
      return next
    })
  }, [])

  const resetAllEditedValues = useCallback(() => {
    setNumericValues({})
    setEditedValues(new Set())
  }, [])

  // Initialize multiple numeric values at once (e.g., from project tags)
  const initializeNumericValues = useCallback((values: Record<string, number>) => {
    setNumericValues(prev => ({
      ...prev,
      ...values
    }))
  }, [])

  // Direct timer ACC/PRE editing
  const setTimerAcc = useCallback((tagName: string, acc: number) => {
    setTimerStates(prev => {
      const timer = prev[tagName]
      if (!timer) {
        return {
          ...prev,
          [tagName]: { ACC: acc, PRE: 5000, EN: false, TT: false, DN: acc >= 5000 }
        }
      }
      const newDN = acc >= timer.PRE
      return {
        ...prev,
        [tagName]: { ...timer, ACC: acc, DN: newDN, TT: timer.EN && !newDN }
      }
    })
    setEditedValues(prev => new Set(prev).add(`${tagName}.ACC`))
  }, [])

  const setTimerPre = useCallback((tagName: string, pre: number) => {
    setTimerStates(prev => {
      const timer = prev[tagName]
      if (!timer) {
        return {
          ...prev,
          [tagName]: { ACC: 0, PRE: pre, EN: false, TT: false, DN: false }
        }
      }
      const newDN = timer.ACC >= pre
      return {
        ...prev,
        [tagName]: { ...timer, PRE: pre, DN: newDN, TT: timer.EN && !newDN }
      }
    })
    setEditedValues(prev => new Set(prev).add(`${tagName}.PRE`))
  }, [])

  // Direct counter ACC/PRE editing
  const setCounterAcc = useCallback((tagName: string, acc: number) => {
    setCounterStates(prev => {
      const counter = prev[tagName]
      if (!counter) {
        return {
          ...prev,
          [tagName]: { ACC: acc, PRE: 10, CU: false, CD: false, DN: acc >= 10, UN: acc < 0, OV: acc > 32767 }
        }
      }
      return {
        ...prev,
        [tagName]: { ...counter, ACC: acc, DN: acc >= counter.PRE, UN: acc < 0, OV: acc > 32767 }
      }
    })
    setEditedValues(prev => new Set(prev).add(`${tagName}.ACC`))
  }, [])

  const setCounterPre = useCallback((tagName: string, pre: number) => {
    setCounterStates(prev => {
      const counter = prev[tagName]
      if (!counter) {
        return {
          ...prev,
          [tagName]: { ACC: 0, PRE: pre, CU: false, CD: false, DN: false, UN: false, OV: false }
        }
      }
      return {
        ...prev,
        [tagName]: { ...counter, PRE: pre, DN: counter.ACC >= pre }
      }
    })
    setEditedValues(prev => new Set(prev).add(`${tagName}.PRE`))
  }, [])

  const resetTags = useCallback(() => {
    setTagStates({})
    setTimerStates({})
    setCounterStates({})
    setOneShotStates({})
    setForcedTags({})
    clearAllFaultStates()
    setFaults({})
    setNumericValues({})
    setEditedValues(new Set())
    prevCounterStates.current = {}
    setScanCycle(0)
  }, [])

  const setScanRate = useCallback((ms: number) => {
    setScanRateState(Math.max(10, Math.min(1000, ms))) // Clamp between 10ms and 1000ms
  }, [])

  const setStepMode = useCallback((enabled: boolean) => {
    setStepModeState(enabled)
  }, [])

  // Perform one scan cycle (used for step mode and continuous mode)
  const performScanCycle = useCallback(() => {
    // Update timer accumulators
    setTimerStates(prev => {
      const next = { ...prev }
      let changed = false

      for (const [tag, timer] of Object.entries(prev)) {
        // TON logic: accumulate while EN is true and not done
        if (timer.EN && !timer.DN) {
          const newACC = timer.ACC + scanRate
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
          const newACC = timer.ACC + scanRate
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
  }, [scanRate])

  // Manual step function for step mode
  const step = useCallback(() => {
    if (enabled && stepMode) {
      performScanCycle()
    }
  }, [enabled, stepMode, performScanCycle])

  // Trend data functions
  const addTrendTag = useCallback((tagName: string) => {
    setTrendTags(prev => {
      if (prev.includes(tagName)) return prev
      return [...prev, tagName]
    })
    // Initialize empty trend data for this tag
    setTrendData(prev => ({
      ...prev,
      [tagName]: prev[tagName] || []
    }))
  }, [])

  const removeTrendTag = useCallback((tagName: string) => {
    setTrendTags(prev => prev.filter(t => t !== tagName))
    setTrendData(prev => {
      const next = { ...prev }
      delete next[tagName]
      return next
    })
  }, [])

  const clearTrendData = useCallback(() => {
    setTrendData({})
    trendStartTime.current = Date.now()
  }, [])

  const setTrendRecordingFn = useCallback((recording: boolean) => {
    setTrendRecording(recording)
    if (recording) {
      trendStartTime.current = Date.now()
    }
  }, [])

  // Timer update loop - runs when simulation is enabled and NOT in step mode
  useEffect(() => {
    if (!enabled || stepMode) return

    const interval = setInterval(performScanCycle, scanRate)

    return () => clearInterval(interval)
  }, [enabled, stepMode, scanRate, performScanCycle])

  // Helper to get tag value for trending
  const getTagTrendValue = useCallback((tagName: string): number => {
    const dotIdx = tagName.lastIndexOf('.')
    if (dotIdx > 0) {
      const base = tagName.substring(0, dotIdx)
      const mem = tagName.substring(dotIdx + 1).toUpperCase()
      if (timerStates[base]) {
        if (mem === 'ACC') return timerStates[base].ACC / 1000
        if (mem === 'PRE') return timerStates[base].PRE / 1000
        if (mem === 'DN') return timerStates[base].DN ? 1 : 0
        if (mem === 'EN') return timerStates[base].EN ? 1 : 0
        if (mem === 'TT') return timerStates[base].TT ? 1 : 0
      }
      if (counterStates[base]) {
        if (mem === 'ACC') return counterStates[base].ACC
        if (mem === 'PRE') return counterStates[base].PRE
        if (mem === 'DN') return counterStates[base].DN ? 1 : 0
        if (mem === 'CU') return counterStates[base].CU ? 1 : 0
        if (mem === 'CD') return counterStates[base].CD ? 1 : 0
      }
    }
    if (numericValues[tagName] !== undefined) return numericValues[tagName]
    if (tagStates[tagName] !== undefined) return tagStates[tagName] ? 1 : 0
    return 0
  }, [tagStates, timerStates, counterStates, numericValues])

  // Trend data collection loop
  useEffect(() => {
    if (!enabled || !trendRecording || trendTags.length === 0) return
    const interval = setInterval(() => {
      const t = (Date.now() - trendStartTime.current) / 1000
      setTrendData(prev => {
        const next = { ...prev }
        for (const tag of trendTags) {
          const v = getTagTrendValue(tag)
          const pts = prev[tag] || []
          const newPts = [...pts, { time: t, value: v }]
          if (newPts.length > MAX_TREND_SAMPLES) newPts.shift()
          next[tag] = newPts
        }
        return next
      })
    }, scanRate)
    return () => clearInterval(interval)
  }, [enabled, trendRecording, trendTags, scanRate, getTagTrendValue])

  return (
    <SimulationContext.Provider
      value={{
        enabled,
        tagStates,
        timerStates,
        counterStates,
        oneShotStates,
        forcedTags,
        faults,
        numericValues,
        editedValues,
        toggleSimulation,
        toggleTag,
        setTagState,
        setTagStates: setTagStatesBatch,
        updateTimers,
        updateCounters,
        updateOneShots,
        forceTagOn,
        forceTagOff,
        removeForce,
        injectFault,
        clearFault: clearFaultFn,
        clearAllFaults: clearAllFaultsFn,
        setNumericValue,
        getNumericValue,
        resetNumericValue,
        resetAllEditedValues,
        initializeNumericValues,
        setTimerAcc,
        setTimerPre,
        setCounterAcc,
        setCounterPre,
        resetTags,
        scanRate,
        setScanRate,
        stepMode,
        setStepMode,
        step,
        scanCycle,
        trendData,
        trendTags,
        trendRecording,
        addTrendTag,
        removeTrendTag,
        clearTrendData,
        setTrendRecording: setTrendRecordingFn
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
      forcedTags: {} as Record<string, 'on' | 'off' | null>,
      faults: {} as Record<string, FaultConfig>,
      oneShotStates: {} as Record<string, OneShotState>,
      numericValues: {} as Record<string, number>,
      editedValues: new Set<string>(),
      toggleSimulation: () => {},
      toggleTag: () => {},
      setTagState: () => {},
      setTagStates: () => {},
      updateTimers: () => {},
      updateCounters: () => {},
      updateOneShots: () => {},
      forceTagOn: () => {},
      forceTagOff: () => {},
      removeForce: () => {},
      injectFault: () => {},
      clearFault: () => {},
      clearAllFaults: () => {},
      setNumericValue: () => {},
      getNumericValue: (_tag: string, defaultVal: number = 0) => defaultVal,
      resetNumericValue: () => {},
      resetAllEditedValues: () => {},
      initializeNumericValues: () => {},
      setTimerAcc: () => {},
      setTimerPre: () => {},
      setCounterAcc: () => {},
      setCounterPre: () => {},
      resetTags: () => {},
      scanCycle: 0,
      scanRate: DEFAULT_SCAN_INTERVAL,
      setScanRate: () => {},
      stepMode: false,
      setStepMode: () => {},
      step: () => {},
      trendData: {} as Record<string, TrendPoint[]>,
      trendTags: [] as string[],
      trendRecording: false,
      addTrendTag: () => {},
      removeTrendTag: () => {},
      clearTrendData: () => {},
      setTrendRecording: () => {}
    }
  }
  return context
}

// ================================================
// Simulation Toggle Button Component
// ================================================

export function SimulationToggleButton() {
  const {
    enabled,
    toggleSimulation,
    resetTags,
    scanCycle,
    scanRate,
    setScanRate,
    stepMode,
    setStepMode,
    step
  } = useSimulation()

  const [showSpeedMenu, setShowSpeedMenu] = useState(false)

  // Calculate scans per second
  const scansPerSecond = stepMode ? 0 : (1000 / scanRate).toFixed(1)

  // Get current speed preset name
  const getCurrentPresetName = (): SpeedPresetName | 'Custom' => {
    for (const [name, value] of Object.entries(SPEED_PRESETS)) {
      if (value === scanRate) return name as SpeedPresetName
    }
    return 'Custom'
  }

  const currentPreset = getCurrentPresetName()

  return (
    <div className="sim-controls-container">
      {/* Main simulation toggle */}
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
          {/* Speed control dropdown */}
          <div className="sim-speed-control">
            <button
              onClick={() => setShowSpeedMenu(!showSpeedMenu)}
              className="sim-speed-btn"
              title="Adjust simulation speed"
            >
              {/* Speedometer icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 6v2" />
                <path d="M16.24 7.76l-1.42 1.42" />
                <path d="M18 12h-2" />
                <path d="M12 12l-3-3" />
              </svg>
              <span>{currentPreset}</span>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 10l5 5 5-5z" />
              </svg>
            </button>

            {showSpeedMenu && (
              <div className="sim-speed-menu">
                {(Object.keys(SPEED_PRESETS) as SpeedPresetName[]).map((name) => (
                  <button
                    key={name}
                    onClick={() => {
                      setScanRate(SPEED_PRESETS[name])
                      setShowSpeedMenu(false)
                    }}
                    className={`sim-speed-option ${scanRate === SPEED_PRESETS[name] ? 'active' : ''}`}
                  >
                    <span className="speed-name">{name}</span>
                    <span className="speed-value">{SPEED_PRESETS[name]}ms</span>
                  </button>
                ))}
                <div className="sim-speed-divider" />
                <div className="sim-speed-custom">
                  <span>Custom:</span>
                  <input
                    type="range"
                    min="20"
                    max="500"
                    value={scanRate}
                    onChange={(e) => setScanRate(parseInt(e.target.value))}
                    className="sim-speed-slider"
                  />
                  <span className="speed-value">{scanRate}ms</span>
                </div>
              </div>
            )}
          </div>

          {/* Step mode toggle */}
          <button
            onClick={() => setStepMode(!stepMode)}
            className={`sim-step-mode-btn ${stepMode ? 'active' : ''}`}
            title={stepMode ? 'Switch to continuous mode' : 'Switch to step mode'}
          >
            {/* Step icon */}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 4h4v16H5z" />
              <path d="M15 4l6 8-6 8" />
            </svg>
            <span>Step</span>
          </button>

          {/* Step button (only visible in step mode) */}
          {stepMode && (
            <button
              onClick={step}
              className="sim-step-btn"
              title="Advance one scan cycle"
            >
              {/* Step forward icon */}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8-6-8-6v12z" />
                <path d="M16 6v12h2V6h-2z" />
              </svg>
              <span>Step</span>
            </button>
          )}

          {/* Reset button */}
          <button
            onClick={resetTags}
            className="sim-reset-btn"
            title="Reset all tags, timers, and counters"
          >
            Reset
          </button>

          {/* Scan info display */}
          <div className="sim-scan-info">
            <span className="sim-scan-cycle" title="Scan cycle counter">
              Scan: {scanCycle}
            </span>
            <span className="sim-scan-rate" title="Current scan rate">
              {scanRate}ms
            </span>
            {!stepMode && (
              <span className="sim-scan-rate" title="Scans per second">
                ({scansPerSecond}/s)
              </span>
            )}
          </div>
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
