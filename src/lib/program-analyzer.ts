/**
 * Program Analyzer - Deterministic Pre-Analysis for Smart Explanations
 *
 * This module analyzes the entire PLC program structure WITHOUT using AI.
 * It builds:
 * 1. Tag usage maps (who reads/writes each tag)
 * 2. Pattern detection (safety interlocks, sequences, motor control, etc.)
 * 3. Semantic tag name parsing
 * 4. Rung context inference
 *
 * This runs once during upload and stores results for instant smart explanations.
 */

import type { PlcProject, PlcProgram, PlcRoutine, PlcRung, PlcInstruction } from './l5x-parser'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface TagUsageInfo {
  name: string
  readers: RungReference[]      // Rungs that read this tag (XIC, XIO, comparisons, etc.)
  writers: RungReference[]      // Rungs that write this tag (OTE, OTL, OTU, MOV dest, etc.)
  semanticType: SemanticTagType
  inferredPurpose?: string      // What we think this tag is for
}

export interface RungReference {
  program: string
  routine: string
  rungNumber: number
  instruction: string           // The instruction type using this tag
  usage: 'read' | 'write'
}

export type SemanticTagType =
  | 'safety'      // E-stop, guard, interlock
  | 'motor'       // Motor, drive, VFD
  | 'valve'       // Valve, solenoid
  | 'sensor'      // Sensor, switch, proximity
  | 'timer'       // Timer
  | 'counter'     // Counter
  | 'status'      // Status, state, mode
  | 'command'     // Command, request, enable
  | 'feedback'    // Feedback, confirm, actual
  | 'fault'       // Fault, alarm, error
  | 'hmi'         // HMI, operator, display
  | 'sequence'    // Step, sequence, phase
  | 'io'          // Physical I/O
  | 'internal'    // Internal logic
  | 'unknown'

export interface DetectedPattern {
  type: PatternType
  confidence: number            // 0-1, how confident we are
  rungRefs: RungReference[]     // Rungs involved in this pattern
  tags: string[]                // Tags involved
  description: string           // Human-readable description
}

export type PatternType =
  | 'safety_interlock'          // Gate/guard/E-stop logic
  | 'start_stop_circuit'        // Motor start/stop with seal-in
  | 'latch_unlatch'             // OTL/OTU pair
  | 'timer_delay'               // Timer controlling something
  | 'counter_accumulator'       // Counter controlling something
  | 'sequencer'                 // Step sequence logic
  | 'one_shot'                  // ONS pattern
  | 'comparison_branch'         // Multiple comparisons for ranges
  | 'handshake'                 // Command/feedback pair
  | 'fault_detection'           // Fault monitoring logic
  | 'status_monitoring'         // Monitors multiple subsystem statuses
  | 'zone_control'              // Controls multiple zones/areas
  | 'code_concern'              // Potential code quality issue

export interface RungContext {
  rungNumber: number
  program: string
  routine: string
  purpose?: string              // Inferred purpose
  patterns: PatternType[]       // Patterns this rung is part of
  relatedRungs: number[]        // Other rungs that share tags
  safetyRelevant: boolean       // Is this safety-related?
  category: RungCategory
  inputTags: string[]           // Tags read by this rung
  outputTags: string[]          // Tags written by this rung
  concerns?: string[]           // Code quality concerns
  subsystems?: string[]         // Detected subsystem groups (e.g., "Infeed Conveyors", "Exit Zones")
}

export type RungCategory =
  | 'safety'
  | 'motor_control'
  | 'valve_control'
  | 'timer_logic'
  | 'counter_logic'
  | 'sequence_control'
  | 'fault_handling'
  | 'hmi_interface'
  | 'data_move'
  | 'calculation'
  | 'status_monitoring'         // Monitors multiple subsystem statuses
  | 'zone_control'              // Controls multiple zones/conveyors
  | 'general_logic'

export interface ProgramAnalysis {
  tagUsage: Map<string, TagUsageInfo>
  patterns: DetectedPattern[]
  rungContexts: Map<string, RungContext>  // Key: "program/routine:rungNum"
  summary: ProgramSummary
}

export interface ProgramSummary {
  totalRungs: number
  safetyRungs: number
  motorControlRungs: number
  timerCount: number
  counterCount: number
  detectedPatterns: { type: PatternType; count: number }[]
  keyTags: string[]             // Most important tags
}

// ============================================================================
// SEMANTIC TAG NAME PATTERNS
// ============================================================================

const SEMANTIC_PATTERNS: { pattern: RegExp; type: SemanticTagType; priority: number }[] = [
  // Safety (highest priority)
  { pattern: /ESTOP|E_STOP|EMERG|EMERGENCY/i, type: 'safety', priority: 100 },
  { pattern: /GUARD|GATE|DOOR|INTERLOCK|SAFETY|SAFE/i, type: 'safety', priority: 95 },
  { pattern: /LIGHT_CURTAIN|SCANNER|PRESENCE/i, type: 'safety', priority: 90 },

  // Faults
  { pattern: /FAULT|FLT|ALARM|ALM|ERROR|ERR|FAIL/i, type: 'fault', priority: 85 },

  // Motor/Drive
  { pattern: /MOTOR|MTR|DRIVE|DRV|VFD|CONVEYOR|CONV|PUMP|FAN|BLOWER/i, type: 'motor', priority: 80 },
  { pattern: /RUN|RUNNING|START|STOP|JOG/i, type: 'motor', priority: 75 },

  // Valve/Actuator
  { pattern: /VALVE|VLV|SOL|SOLENOID|CYLINDER|CYL|CLAMP|GRIPPER|ACTUATOR/i, type: 'valve', priority: 80 },
  { pattern: /OPEN|CLOSE|EXTEND|RETRACT|ADVANCE|RETURN/i, type: 'valve', priority: 70 },

  // Sensors
  { pattern: /SENSOR|SENS|PROX|PROXIMITY|PHOTO|LIMIT|SWITCH|SW|DETECT/i, type: 'sensor', priority: 75 },
  { pattern: /HOME|POSITION|POS|LEVEL|TEMP|PRESSURE|FLOW/i, type: 'sensor', priority: 70 },

  // Timer/Counter (often in tag name)
  { pattern: /^T\d+:|TIMER|TMR|DELAY|DLY/i, type: 'timer', priority: 80 },
  { pattern: /^C\d+:|COUNTER|CTR|COUNT|CNT/i, type: 'counter', priority: 80 },

  // Command/Feedback
  { pattern: /CMD|COMMAND|REQ|REQUEST|ENABLE|ENB|PERMIT/i, type: 'command', priority: 65 },
  { pattern: /FB|FEEDBACK|CONFIRM|CFM|ACTUAL|ACT|RESPONSE/i, type: 'feedback', priority: 65 },

  // Status
  { pattern: /STATUS|STS|STATE|MODE|AUTO|MANUAL|MAN|READY|RDY|BUSY|DONE|OK/i, type: 'status', priority: 60 },

  // Sequence
  { pattern: /STEP|SEQ|SEQUENCE|PHASE|STAGE/i, type: 'sequence', priority: 70 },

  // HMI
  { pattern: /HMI|PB|PUSH|BUTTON|DISPLAY|SCREEN|OPERATOR|OP_/i, type: 'hmi', priority: 55 },

  // I/O (physical addressing)
  { pattern: /^(LOCAL|REMOTE):\d+:[IO]/i, type: 'io', priority: 90 },
  { pattern: /^[IOB]\d+[:.]/i, type: 'io', priority: 85 },  // SLC style: I:0/0, O:1/0
]

// ============================================================================
// PATTERN DETECTION RULES
// ============================================================================

interface PatternRule {
  type: PatternType
  detect: (rung: PlcRung, context: AnalysisContext) => DetectedPattern | null
}

interface AnalysisContext {
  program: string
  routine: string
  tagUsage: Map<string, TagUsageInfo>
  allRungs: PlcRung[]
}

const PATTERN_RULES: PatternRule[] = [
  // Gate/Guard Interlock Pattern (specific, high confidence)
  {
    type: 'safety_interlock',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()

      // Specific gate interlock patterns
      const hasGateTags = /GATE\d*OPEN|GATE\d*CLOSE|GATESOK|GATEREQUEST|GATEUNLOCK|GATESHUTDOWN/i.test(text)
      const hasGuardTags = /GUARD.*CLOSE|GUARD.*OPEN|GUARDOK/i.test(text)

      if (hasGateTags || hasGuardTags) {
        const tags = extractTagNames(text)
        // Find the main output
        const outputMatch = text.match(/OTE\s*\(\s*([^)]+)\)|OTL\s*\(\s*([^)]+)\)/i)
        const mainOutput = outputMatch ? (outputMatch[1] || outputMatch[2]).trim() : ''

        let description = 'Gate/guard interlock logic'
        if (/GATESOK|GUARDOK/i.test(text)) {
          description = 'Gate/guard status - confirms guards are in safe position'
        } else if (/UNLOCK|OPEN/i.test(mainOutput)) {
          description = 'Gate unlock control - allows gate to be opened'
        } else if (/SHUTDOWN|STOP/i.test(text)) {
          description = 'Gate shutdown sequence - safe machine stop when gate opens'
        }

        return {
          type: 'safety_interlock',
          confidence: 0.95,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'pattern', usage: 'read' }],
          tags,
          description
        }
      }
      return null
    }
  },

  // General Safety Interlock Pattern
  {
    type: 'safety_interlock',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()
      const hasSafetyTag = SEMANTIC_PATTERNS
        .filter(p => p.type === 'safety')
        .some(p => p.pattern.test(text))

      const hasInterlock = /XIC.*XIC.*OTE|XIO.*OTE/i.test(text)

      if (hasSafetyTag && hasInterlock) {
        return {
          type: 'safety_interlock',
          confidence: 0.9,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'pattern', usage: 'read' }],
          tags: extractTagNames(text),
          description: 'Safety interlock - multiple conditions must be true for output'
        }
      }
      return null
    }
  },

  // Start/Stop with Seal-in Pattern
  {
    type: 'start_stop_circuit',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()

      // Classic seal-in: XIC(start) [XIC(running)] XIO(stop) OTE(running)
      // Or OTL used for motor start
      const hasStartStop = /START.*STOP|STOP.*START/i.test(text)
      const hasOTL = /OTL\s*\(/i.test(text)
      const hasMotorTag = SEMANTIC_PATTERNS
        .filter(p => p.type === 'motor')
        .some(p => p.pattern.test(text))

      if ((hasStartStop || hasOTL) && hasMotorTag) {
        return {
          type: 'start_stop_circuit',
          confidence: 0.85,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'pattern', usage: 'read' }],
          tags: extractTagNames(text),
          description: 'Motor start/stop circuit with seal-in'
        }
      }
      return null
    }
  },

  // Latch/Unlatch Pattern
  {
    type: 'latch_unlatch',
    detect: (rung, ctx) => {
      const hasOTL = /OTL\s*\(/i.test(rung.rawText)
      const hasOTU = /OTU\s*\(/i.test(rung.rawText)

      if (hasOTL || hasOTU) {
        const tags = extractTagNames(rung.rawText)
        return {
          type: 'latch_unlatch',
          confidence: 0.95,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: hasOTL ? 'OTL' : 'OTU', usage: 'write' }],
          tags,
          description: hasOTL ? 'Latches output ON until explicitly unlatched' : 'Unlatches output OFF'
        }
      }
      return null
    }
  },

  // Timer Delay Pattern
  {
    type: 'timer_delay',
    detect: (rung, ctx) => {
      const hasTimer = /TON\s*\(|TOF\s*\(|RTO\s*\(/i.test(rung.rawText)

      if (hasTimer) {
        const tags = extractTagNames(rung.rawText)
        const timerMatch = rung.rawText.match(/T(?:ON|OF|RTO)\s*\(\s*([^,)]+)/i)
        const timerTag = timerMatch ? timerMatch[1].trim() : 'timer'

        return {
          type: 'timer_delay',
          confidence: 0.95,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'TON/TOF/RTO', usage: 'write' }],
          tags,
          description: `Timer delay using ${timerTag}`
        }
      }
      return null
    }
  },

  // Counter Pattern
  {
    type: 'counter_accumulator',
    detect: (rung, ctx) => {
      const hasCounter = /CTU\s*\(|CTD\s*\(/i.test(rung.rawText)

      if (hasCounter) {
        const tags = extractTagNames(rung.rawText)
        return {
          type: 'counter_accumulator',
          confidence: 0.95,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'CTU/CTD', usage: 'write' }],
          tags,
          description: 'Counter accumulating events'
        }
      }
      return null
    }
  },

  // One-Shot Pattern
  {
    type: 'one_shot',
    detect: (rung, ctx) => {
      const hasONS = /ONS\s*\(/i.test(rung.rawText)
      const hasOSR = /OSR\s*\(/i.test(rung.rawText)
      const hasOSF = /OSF\s*\(/i.test(rung.rawText)

      if (hasONS || hasOSR || hasOSF) {
        const tags = extractTagNames(rung.rawText)
        return {
          type: 'one_shot',
          confidence: 0.95,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'ONS/OSR/OSF', usage: 'read' }],
          tags,
          description: 'One-shot - triggers once on rising/falling edge'
        }
      }
      return null
    }
  },

  // Fault Detection Pattern
  {
    type: 'fault_detection',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()
      const hasFaultTag = SEMANTIC_PATTERNS
        .filter(p => p.type === 'fault')
        .some(p => p.pattern.test(text))

      if (hasFaultTag) {
        const tags = extractTagNames(text)
        return {
          type: 'fault_detection',
          confidence: 0.85,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'pattern', usage: 'read' }],
          tags,
          description: 'Fault detection or alarm monitoring'
        }
      }
      return null
    }
  },

  // Handshake Pattern (command + feedback pair)
  {
    type: 'handshake',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()
      const hasCommand = /CMD|COMMAND|REQ|REQUEST/i.test(text)
      const hasFeedback = /FB|FEEDBACK|CONFIRM|RESPONSE/i.test(text)

      if (hasCommand && hasFeedback) {
        const tags = extractTagNames(text)
        return {
          type: 'handshake',
          confidence: 0.8,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'pattern', usage: 'read' }],
          tags,
          description: 'Command/feedback handshake for confirmed operation'
        }
      }
      return null
    }
  },

  // Sequencer / State Machine Pattern
  {
    type: 'sequencer',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()
      // Look for state/step comparisons or step tags with transitions
      const hasStateCompare = /EQU\s*\([^,]*(STATE|STEP|PHASE|STAGE|SEQ)/i.test(text)
      const hasStepLogic = /(STEP|PHASE|STAGE|STATE).*\d+.*(DONE|COMPLETE|ACTIVE)/i.test(text)
      const hasStateIncrement = /(STATE|STEP).*ADD.*1/i.test(text) || /ADD.*1.*(STATE|STEP)/i.test(text)

      if (hasStateCompare || hasStepLogic || hasStateIncrement) {
        const tags = extractTagNames(text)
        // Try to extract the state/step number
        const stateMatch = text.match(/(?:STATE|STEP|PHASE)[,\s]*(\d+)/i) || text.match(/EQU\s*\([^,]+,\s*(\d+)/i)
        const stateNum = stateMatch ? stateMatch[1] : '?'

        return {
          type: 'sequencer',
          confidence: 0.85,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'pattern', usage: 'read' }],
          tags,
          description: `State machine step ${stateNum} transition logic`
        }
      }
      return null
    }
  },

  // Comparison/Range Check Pattern
  {
    type: 'comparison_branch',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()
      // Multiple comparisons or LIM instruction
      const compCount = (text.match(/EQU|NEQ|GRT|LES|GEQ|LEQ/gi) || []).length
      const hasLim = /LIM\s*\(/i.test(text)

      if (compCount >= 2 || hasLim) {
        const tags = extractTagNames(text)
        let description = 'Range/threshold checking logic'

        if (hasLim) {
          description = 'Limit check - value within allowed range'
        } else if (compCount >= 2) {
          description = 'Multiple comparison conditions'
        }

        return {
          type: 'comparison_branch',
          confidence: 0.75,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'pattern', usage: 'read' }],
          tags,
          description
        }
      }
      return null
    }
  },

  // Status Monitoring Pattern - multiple subsystems reporting status
  {
    type: 'status_monitoring',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()
      const tags = extractTagNames(text)

      // Count tags ending in STOPPED, RUNNING, OK, READY, ACTIVE, STATUS
      const statusTags = tags.filter(t =>
        /STOPPED|RUNNING|OK|READY|ACTIVE|STATUS|COMPLETE|DONE$/i.test(t)
      )

      // Multiple status outputs suggest status monitoring
      if (statusTags.length >= 3) {
        // Detect subsystems being monitored
        const subsystems = detectSubsystems(tags)

        return {
          type: 'status_monitoring',
          confidence: 0.9,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'pattern', usage: 'read' }],
          tags: statusTags,
          description: `Monitors operational status of ${subsystems.length > 0 ? subsystems.join(', ') : 'multiple subsystems'} for system readiness`
        }
      }
      return null
    }
  },

  // Zone Control Pattern - controls multiple zones/conveyors
  {
    type: 'zone_control',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()
      const tags = extractTagNames(text)

      // Detect zone/conveyor patterns
      const zonePatterns = [
        /ZONE\d+|ZONE_\d+/i,
        /INFEED\d*|OUTFEED\d*|EXIT\d*/i,
        /CONV\d+|CONVEYOR\d+/i,
        /STATION\d+/i
      ]

      const zoneTags = tags.filter(t =>
        zonePatterns.some(p => p.test(t))
      )

      if (zoneTags.length >= 2) {
        const subsystems = detectSubsystems(zoneTags)
        return {
          type: 'zone_control',
          confidence: 0.85,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'pattern', usage: 'read' }],
          tags: zoneTags,
          description: `Controls ${subsystems.length > 0 ? subsystems.join(', ') : 'multiple zones/conveyors'}`
        }
      }
      return null
    }
  },

  // Code Concern Pattern - detects potentially problematic code
  {
    type: 'code_concern',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()
      const concerns: string[] = []

      // Check for math instructions (MUL, DIV) used with boolean-looking tags
      const mathMatch = text.match(/MUL\s*\(([^)]+)\)|DIV\s*\(([^)]+)\)/gi)
      if (mathMatch) {
        for (const match of mathMatch) {
          const operands = match.match(/\(([^)]+)\)/)?.[1]?.split(',') || []
          const booleanOperands = operands.filter(op =>
            /STOPPED|RUNNING|OK|READY|ACTIVE|ENABLE|DISABLE|ON|OFF|TRUE|FALSE/i.test(op.trim())
          )
          if (booleanOperands.length >= 2) {
            concerns.push('Math instructions (MUL/DIV) used with boolean-type tags - may cause unpredictable behavior')
          }
        }
      }

      // Check for EQU used as a contact (comparing booleans)
      const equMatch = text.match(/EQU\s*\(([^)]+)\)/gi)
      if (equMatch) {
        for (const match of equMatch) {
          const operands = match.match(/\(([^)]+)\)/)?.[1]?.split(',') || []
          const booleanOperands = operands.filter(op =>
            /STOPPED|RUNNING|OK|READY|ACTIVE/i.test(op.trim())
          )
          if (booleanOperands.length >= 1) {
            concerns.push('EQU instruction used with boolean-type tags - consider using XIC/XIO contacts instead')
          }
        }
      }

      if (concerns.length > 0) {
        return {
          type: 'code_concern',
          confidence: 0.8,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'pattern', usage: 'read' }],
          tags: [],
          description: concerns[0] // Primary concern
        }
      }
      return null
    }
  },
]

// Detect subsystem groups from tag names
function detectSubsystems(tags: string[]): string[] {
  const subsystems: string[] = []
  const found = new Set<string>()

  // Subsystem patterns with friendly names
  const patterns: [RegExp, string][] = [
    [/INFEED\d*/i, 'Infeed Conveyors'],
    [/OUTFEED\d*|EXIT\d*/i, 'Exit Conveyors'],
    [/CARRIAGE/i, 'Carriage System'],
    [/ROTATION|ROTATE/i, 'Rotation System'],
    [/CUTTER|CUT/i, 'Cutter System'],
    [/CLAMP/i, 'Clamp System'],
    [/MPS/i, 'MPS System'],
    [/STABILIZER/i, 'Stabilizer'],
    [/HOTWIRE|HOT_WIRE/i, 'Hot Wire'],
    [/WRAP/i, 'Wrap System'],
    [/FILM/i, 'Film System'],
    [/LIFT|LOAD/i, 'Load Lift'],
    [/CONVEYOR|CONV/i, 'Conveyors'],
    [/DISPENSE/i, 'Dispenser'],
    [/VFD|DRIVE/i, 'VFD/Drives'],
  ]

  for (const tag of tags) {
    for (const [pattern, name] of patterns) {
      if (pattern.test(tag) && !found.has(name)) {
        found.add(name)
        subsystems.push(name)
      }
    }
  }

  return subsystems
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractTagNames(text: string): string[] {
  const tags: string[] = []
  const regex = /([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*(?:\[[^\]]+\])?)/g
  const instructionPattern = /^(XIC|XIO|OTE|OTL|OTU|TON|TOF|RTO|CTU|CTD|MOV|COP|JSR|RET|ADD|SUB|MUL|DIV|EQU|NEQ|GRT|LES|GEQ|LEQ|ONS|OSR|OSF|RES|JMP|LBL|NOP|AFI|MCR|END|Branch|LIM|SQR|ABS|NEG|CLR|FLL|AVE|SRT|STD|CMP|CPT|SIN|COS|TAN|ASN|ACS|ATN|LN|LOG)$/i

  let match
  while ((match = regex.exec(text)) !== null) {
    const tag = match[1]
    if (!instructionPattern.test(tag) && !tags.includes(tag) && tag.length > 1) {
      tags.push(tag)
    }
  }
  return tags
}

// Check if a string is a numeric constant (not a tag)
function isNumericConstant(value: string): boolean {
  // Match integers, decimals, negative numbers, scientific notation
  return /^-?\d+\.?\d*(?:[eE][+-]?\d+)?$/.test(value)
}

function inferSemanticType(tagName: string): SemanticTagType {
  let bestMatch: { type: SemanticTagType; priority: number } = { type: 'unknown', priority: 0 }

  for (const pattern of SEMANTIC_PATTERNS) {
    if (pattern.pattern.test(tagName) && pattern.priority > bestMatch.priority) {
      bestMatch = { type: pattern.type, priority: pattern.priority }
    }
  }

  return bestMatch.type
}

function isWriteInstruction(instruction: string): boolean {
  const writeInstructions = ['OTE', 'OTL', 'OTU', 'RES', 'TON', 'TOF', 'RTO', 'CTU', 'CTD']
  return writeInstructions.includes(instruction.toUpperCase())
}

function isReadInstruction(instruction: string): boolean {
  const readInstructions = ['XIC', 'XIO', 'EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM', 'ONS', 'OSR', 'OSF']
  return readInstructions.includes(instruction.toUpperCase())
}

function categorizeRung(rung: PlcRung, patterns: PatternType[], inputTags: string[], outputTags: string[]): RungCategory {
  const text = rung.rawText.toUpperCase()

  // Filter out numeric constants
  const cleanOutputs = outputTags.filter(t => !isNumericConstant(t))

  // Special case: status_monitoring with many outputs takes priority
  // This is the hallmark of a "track all zone statuses" rung
  if (patterns.includes('status_monitoring') && cleanOutputs.length >= 5) {
    return 'status_monitoring'
  }

  // Check patterns first (in priority order)
  if (patterns.includes('safety_interlock')) return 'safety'
  if (patterns.includes('sequencer')) return 'sequence_control'
  if (patterns.includes('start_stop_circuit')) return 'motor_control'
  if (patterns.includes('status_monitoring')) return 'status_monitoring'
  if (patterns.includes('zone_control')) return 'zone_control'
  if (patterns.includes('timer_delay')) return 'timer_logic'
  if (patterns.includes('counter_accumulator')) return 'counter_logic'
  // fault_detection is lower priority - check tag semantics first

  // Check tag semantics (filter out numeric constants)
  const allTags = [...inputTags, ...outputTags].filter(t => !isNumericConstant(t))

  // First pass: check for high-priority categories
  for (const tag of allTags) {
    const type = inferSemanticType(tag)
    if (type === 'safety') return 'safety'
    if (type === 'sequence') return 'sequence_control'
  }

  // Second pass: other categories
  for (const tag of allTags) {
    const type = inferSemanticType(tag)
    if (type === 'motor') return 'motor_control'
    if (type === 'valve') return 'valve_control'
    if (type === 'hmi') return 'hmi_interface'
  }

  // Check instruction types before fault (fault is often a secondary concern)
  if (/ADD|SUB|MUL|DIV|CPT|SQR|ABS/i.test(text)) return 'calculation'
  if (/MOV|COP|FLL/i.test(text)) return 'data_move'

  // Fault handling is last resort from patterns
  if (patterns.includes('fault_detection')) return 'fault_handling'

  // Check for fault tags only if nothing else matches
  for (const tag of allTags) {
    const type = inferSemanticType(tag)
    if (type === 'fault') return 'fault_handling'
  }

  return 'general_logic'
}

function inferRungPurpose(rung: PlcRung, patterns: DetectedPattern[], category: RungCategory, inputTags: string[], outputTags: string[]): string {
  const text = rung.rawText.toUpperCase()

  // Filter out numeric constants from tags
  const cleanInputs = inputTags.filter(t => !isNumericConstant(t))
  const cleanOutputs = outputTags.filter(t => !isNumericConstant(t))

  // Pattern-based inference with enrichment
  // Prioritize certain patterns over others
  if (patterns.length > 0) {
    // Special case: if status_monitoring is present with many outputs, it takes priority
    // This is the hallmark of a "track all zone statuses" rung
    const statusMonitoringPattern = patterns.find(p => p.type === 'status_monitoring')
    if (statusMonitoringPattern && cleanOutputs.length >= 5) {
      const allTags = [...cleanInputs, ...cleanOutputs]
      const subsystems = detectSubsystems(allTags)
      if (subsystems.length > 0) {
        return `Monitors operational status of ${subsystems.join(', ')} for system readiness`
      }
      return 'Monitors operational status of multiple subsystems for system readiness'
    }

    // Priority order for patterns (when status_monitoring doesn't dominate)
    const patternPriority: PatternType[] = [
      'safety_interlock',
      'sequencer',
      'status_monitoring',
      'zone_control',
      'start_stop_circuit',
      'timer_delay',
      'counter_accumulator',
      'one_shot',
      'handshake',
      'comparison_branch',
      'latch_unlatch',
      'fault_detection',  // lowest priority - often a secondary concern
      'code_concern'      // don't use for purpose, just flagging
    ]

    // Find highest priority pattern
    let mainPattern = patterns[0]
    for (const priorityType of patternPriority) {
      const found = patterns.find(p => p.type === priorityType)
      if (found) {
        mainPattern = found
        break
      }
    }

    // Special handling for status_monitoring - generate API-quality description
    if (mainPattern.type === 'status_monitoring') {
      const allTags = [...cleanInputs, ...cleanOutputs]
      const subsystems = detectSubsystems(allTags)
      if (subsystems.length > 0) {
        return `Monitors operational status of ${subsystems.join(', ')} for system readiness`
      }
      return 'Monitors operational status of multiple subsystems for system readiness'
    }

    // Special handling for zone_control
    if (mainPattern.type === 'zone_control') {
      const allTags = [...cleanInputs, ...cleanOutputs]
      const subsystems = detectSubsystems(allTags)
      if (subsystems.length > 0) {
        return `Controls ${subsystems.join(', ')} zone operations`
      }
      return 'Controls multiple zone operations'
    }

    let purpose = mainPattern.description

    // Enrich with specific tag info if available
    if (cleanOutputs.length > 0 && !purpose.includes(cleanOutputs[0])) {
      purpose += ` → ${formatTagName(cleanOutputs[0])}`
    }

    return purpose
  }

  // Smart purpose generation based on category
  switch (category) {
    case 'safety': {
      const safetyOutput = cleanOutputs.find(t => inferSemanticType(t) === 'safety' || inferSemanticType(t) === 'status')
      return safetyOutput
        ? `Safety interlock controlling ${formatTagName(safetyOutput)}`
        : 'Safety interlock logic'
    }

    case 'motor_control': {
      const motorTag = [...cleanOutputs, ...cleanInputs].find(t => inferSemanticType(t) === 'motor')
      return motorTag
        ? `Motor control for ${formatTagName(motorTag)}`
        : 'Motor control logic'
    }

    case 'valve_control': {
      const valveTag = [...cleanOutputs, ...cleanInputs].find(t => inferSemanticType(t) === 'valve')
      return valveTag
        ? `Valve/actuator control for ${formatTagName(valveTag)}`
        : 'Valve/actuator control logic'
    }

    case 'timer_logic': {
      const timerMatch = text.match(/T(?:ON|OF|RTO)\s*\(\s*([^,)]+)/i)
      const timerTag = timerMatch ? timerMatch[1].trim() : null
      return timerTag
        ? `Timer logic using ${formatTagName(timerTag)}`
        : 'Timer-based logic'
    }

    case 'counter_logic': {
      const counterMatch = text.match(/CT[UD]\s*\(\s*([^,)]+)/i)
      const counterTag = counterMatch ? counterMatch[1].trim() : null
      return counterTag
        ? `Counter logic using ${formatTagName(counterTag)}`
        : 'Counter-based logic'
    }

    case 'sequence_control': {
      const stateTag = cleanInputs.find(t => /STATE|STEP|PHASE|SEQ/i.test(t))
      const stateMatch = text.match(/EQU\s*\([^,]+,\s*(\d+)/i)
      const stepNum = stateMatch ? stateMatch[1] : null

      if (stepNum && stateTag) {
        return `Sequence step ${stepNum}: ${formatTagName(stateTag)} transition`
      } else if (stateTag) {
        return `Sequence control for ${formatTagName(stateTag)}`
      }
      return 'Sequence/state machine logic'
    }

    case 'fault_handling': {
      const faultTag = cleanOutputs.find(t => inferSemanticType(t) === 'fault')
      return faultTag
        ? `Fault handling for ${formatTagName(faultTag)}`
        : 'Fault detection/handling logic'
    }

    case 'calculation': {
      // Describe what's being calculated
      if (/MUL.*0\.\d+|DIV.*\d{2,}/i.test(text)) {
        // Scaling pattern (multiply by small number or divide by large number)
        const destMatch = text.match(/(?:MUL|DIV|ADD|SUB)\s*\([^,]+,[^,]+,\s*([^)\s]+)/i)
        const dest = destMatch ? destMatch[1] : cleanOutputs[0]
        return dest
          ? `Scaling/conversion calculation → ${formatTagName(dest)}`
          : 'Scaling/conversion calculation'
      }
      if (cleanOutputs.length > 0) {
        return `Calculate ${formatTagName(cleanOutputs[0])}`
      }
      return 'Mathematical calculation'
    }

    case 'data_move': {
      if (cleanOutputs.length > 0) {
        const hmiDest = cleanOutputs.find(t => /HMI|DISPLAY|SCREEN/i.test(t))
        if (hmiDest) {
          return `Update HMI display: ${formatTagName(hmiDest)}`
        }
        return `Data transfer to ${formatTagName(cleanOutputs[0])}`
      }
      return 'Data move/copy operation'
    }

    case 'hmi_interface': {
      const hmiTag = cleanOutputs.find(t => inferSemanticType(t) === 'hmi') || cleanInputs.find(t => inferSemanticType(t) === 'hmi')
      return hmiTag
        ? `HMI interface: ${formatTagName(hmiTag)}`
        : 'HMI/operator interface logic'
    }

    case 'status_monitoring': {
      const allTags = [...cleanInputs, ...cleanOutputs]
      const subsystems = detectSubsystems(allTags)
      if (subsystems.length > 0) {
        return `Monitors operational status of ${subsystems.join(', ')} for system readiness`
      }
      return 'Monitors operational status of multiple subsystems for system readiness'
    }

    case 'zone_control': {
      const allTags = [...cleanInputs, ...cleanOutputs]
      const subsystems = detectSubsystems(allTags)
      if (subsystems.length > 0) {
        return `Controls ${subsystems.join(', ')} zone operations`
      }
      return 'Controls multiple zone operations'
    }

    default: {
      // General logic - try to make something useful
      if (cleanOutputs.length > 0) {
        return `Control logic for ${formatTagName(cleanOutputs[0])}`
      }
      if (cleanInputs.length > 0) {
        return `Logic based on ${formatTagName(cleanInputs[0])}`
      }
      return 'General control logic'
    }
  }
}

// Format tag name for display (convert underscores to spaces, title case)
function formatTagName(tag: string): string {
  // Remove array indices and member access for cleaner display
  const baseName = tag.split(/[\.\[]/)[0]
  // Convert underscores to spaces and title case
  return baseName.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
}

// ============================================================================
// MAIN ANALYSIS FUNCTION
// ============================================================================

export function analyzeProgram(project: PlcProject): ProgramAnalysis {
  const tagUsage = new Map<string, TagUsageInfo>()
  const patterns: DetectedPattern[] = []
  const rungContexts = new Map<string, RungContext>()

  // First pass: Build tag usage map
  for (const program of project.programs) {
    for (const routine of program.routines) {
      for (const rung of routine.rungs) {
        for (const instruction of rung.instructions) {
          const isWrite = isWriteInstruction(instruction.type)
          const isRead = isReadInstruction(instruction.type)

          // Special handling for MOV/COP - first operand is read, second is write
          if (instruction.type.toUpperCase() === 'MOV' || instruction.type.toUpperCase() === 'COP') {
            if (instruction.operands[0]) {
              addTagUsage(tagUsage, instruction.operands[0], program.name, routine.name, rung.number, instruction.type, 'read')
            }
            if (instruction.operands[1]) {
              addTagUsage(tagUsage, instruction.operands[1], program.name, routine.name, rung.number, instruction.type, 'write')
            }
          } else if (instruction.type.toUpperCase().match(/^(ADD|SUB|MUL|DIV)$/)) {
            // Math: first two are read, third is write
            if (instruction.operands[0]) {
              addTagUsage(tagUsage, instruction.operands[0], program.name, routine.name, rung.number, instruction.type, 'read')
            }
            if (instruction.operands[1]) {
              addTagUsage(tagUsage, instruction.operands[1], program.name, routine.name, rung.number, instruction.type, 'read')
            }
            if (instruction.operands[2]) {
              addTagUsage(tagUsage, instruction.operands[2], program.name, routine.name, rung.number, instruction.type, 'write')
            }
          } else {
            // Standard instructions
            for (const operand of instruction.operands) {
              if (operand && operand.length > 0) {
                const usage = isWrite ? 'write' : (isRead ? 'read' : 'read')
                addTagUsage(tagUsage, operand, program.name, routine.name, rung.number, instruction.type, usage)
              }
            }
          }
        }
      }
    }
  }

  // Second pass: Detect patterns and build rung contexts
  for (const program of project.programs) {
    for (const routine of program.routines) {
      const ctx: AnalysisContext = {
        program: program.name,
        routine: routine.name,
        tagUsage,
        allRungs: routine.rungs
      }

      for (const rung of routine.rungs) {
        const rungPatterns: DetectedPattern[] = []

        // Run pattern detection rules
        for (const rule of PATTERN_RULES) {
          const detected = rule.detect(rung, ctx)
          if (detected) {
            rungPatterns.push(detected)
            patterns.push(detected)
          }
        }

        // Extract input/output tags for this rung
        const inputTags: string[] = []
        const outputTags: string[] = []

        for (const instruction of rung.instructions) {
          const instType = instruction.type.toUpperCase()

          // Special handling for MOV/COP - first operand is read, second is write
          if (instType === 'MOV' || instType === 'COP' || instType === 'FLL') {
            if (instruction.operands[0] && !isNumericConstant(instruction.operands[0])) {
              if (!inputTags.includes(instruction.operands[0])) inputTags.push(instruction.operands[0])
            }
            if (instruction.operands[1] && !isNumericConstant(instruction.operands[1])) {
              if (!outputTags.includes(instruction.operands[1])) outputTags.push(instruction.operands[1])
            }
          }
          // Math instructions: first two operands are read, third is write
          else if (['ADD', 'SUB', 'MUL', 'DIV', 'AND', 'OR', 'XOR'].includes(instType)) {
            if (instruction.operands[0] && !isNumericConstant(instruction.operands[0])) {
              if (!inputTags.includes(instruction.operands[0])) inputTags.push(instruction.operands[0])
            }
            if (instruction.operands[1] && !isNumericConstant(instruction.operands[1])) {
              if (!inputTags.includes(instruction.operands[1])) inputTags.push(instruction.operands[1])
            }
            if (instruction.operands[2] && !isNumericConstant(instruction.operands[2])) {
              if (!outputTags.includes(instruction.operands[2])) outputTags.push(instruction.operands[2])
            }
          }
          // JSR - skip routine name (first param), treat rest as inputs
          else if (instType === 'JSR') {
            // Skip operands[0] (routine name) and operands[1] (parameter count)
            for (let i = 2; i < instruction.operands.length; i++) {
              const op = instruction.operands[i]
              if (op && !isNumericConstant(op) && !inputTags.includes(op)) {
                inputTags.push(op)
              }
            }
          }
          // Comparison instructions - all operands are read
          else if (['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM'].includes(instType)) {
            for (const operand of instruction.operands) {
              if (operand && !isNumericConstant(operand) && !inputTags.includes(operand)) {
                inputTags.push(operand)
              }
            }
          }
          // Standard read/write instructions
          else {
            const isWrite = isWriteInstruction(instruction.type)
            for (const operand of instruction.operands) {
              if (operand && !isNumericConstant(operand)) {
                if (isWrite) {
                  if (!outputTags.includes(operand)) outputTags.push(operand)
                } else {
                  if (!inputTags.includes(operand)) inputTags.push(operand)
                }
              }
            }
          }
        }

        // Find related rungs (share tags)
        const relatedRungs: number[] = []
        const allRungTags = [...inputTags, ...outputTags]
        for (const tag of allRungTags) {
          const usage = tagUsage.get(tag)
          if (usage) {
            for (const ref of [...usage.readers, ...usage.writers]) {
              if (ref.routine === routine.name && ref.rungNumber !== rung.number) {
                if (!relatedRungs.includes(ref.rungNumber)) {
                  relatedRungs.push(ref.rungNumber)
                }
              }
            }
          }
        }

        // Determine category and safety relevance
        const patternTypes = rungPatterns.map(p => p.type)
        const category = categorizeRung(rung, patternTypes, inputTags, outputTags)
        const safetyRelevant = category === 'safety' ||
          patternTypes.includes('safety_interlock') ||
          allRungTags.some(t => inferSemanticType(t) === 'safety')

        // Infer purpose
        const purpose = inferRungPurpose(rung, rungPatterns, category, inputTags, outputTags)

        // Extract concerns from code_concern patterns
        const concerns: string[] = []
        for (const pattern of rungPatterns) {
          if (pattern.type === 'code_concern' && pattern.description) {
            concerns.push(pattern.description)
          }
        }

        // Detect subsystems from all tags in this rung
        const allRungTagsForSubsystems = [...inputTags, ...outputTags].filter(t => !isNumericConstant(t))
        const subsystems = detectSubsystems(allRungTagsForSubsystems)

        // Store rung context
        const key = `${program.name}/${routine.name}:${rung.number}`
        rungContexts.set(key, {
          rungNumber: rung.number,
          program: program.name,
          routine: routine.name,
          purpose,
          patterns: patternTypes,
          relatedRungs: relatedRungs.sort((a, b) => a - b),
          safetyRelevant,
          category,
          inputTags,
          outputTags,
          concerns: concerns.length > 0 ? concerns : undefined,
          subsystems: subsystems.length > 0 ? subsystems : undefined
        })
      }
    }
  }

  // Build summary
  const summary = buildSummary(project, tagUsage, patterns, rungContexts)

  return {
    tagUsage,
    patterns,
    rungContexts,
    summary
  }
}

function addTagUsage(
  map: Map<string, TagUsageInfo>,
  tagName: string,
  program: string,
  routine: string,
  rungNumber: number,
  instruction: string,
  usage: 'read' | 'write'
): void {
  // Skip numeric literals, empty strings, and numeric constants
  if (!tagName || isNumericConstant(tagName)) return

  let info = map.get(tagName)
  if (!info) {
    info = {
      name: tagName,
      readers: [],
      writers: [],
      semanticType: inferSemanticType(tagName)
    }
    map.set(tagName, info)
  }

  const ref: RungReference = { program, routine, rungNumber, instruction, usage }

  if (usage === 'write') {
    // Avoid duplicates
    if (!info.writers.some(w => w.program === program && w.routine === routine && w.rungNumber === rungNumber)) {
      info.writers.push(ref)
    }
  } else {
    if (!info.readers.some(r => r.program === program && r.routine === routine && r.rungNumber === rungNumber)) {
      info.readers.push(ref)
    }
  }
}

function buildSummary(
  project: PlcProject,
  tagUsage: Map<string, TagUsageInfo>,
  patterns: DetectedPattern[],
  rungContexts: Map<string, RungContext>
): ProgramSummary {
  let totalRungs = 0
  let safetyRungs = 0
  let motorControlRungs = 0
  let timerCount = 0
  let counterCount = 0

  for (const ctx of rungContexts.values()) {
    totalRungs++
    if (ctx.safetyRelevant) safetyRungs++
    if (ctx.category === 'motor_control') motorControlRungs++
    if (ctx.category === 'timer_logic') timerCount++
    if (ctx.category === 'counter_logic') counterCount++
  }

  // Count pattern types
  const patternCounts = new Map<PatternType, number>()
  for (const p of patterns) {
    patternCounts.set(p.type, (patternCounts.get(p.type) || 0) + 1)
  }

  const detectedPatterns = Array.from(patternCounts.entries())
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  // Find key tags (most referenced)
  const tagRefs = Array.from(tagUsage.entries())
    .map(([name, info]) => ({
      name,
      refs: info.readers.length + info.writers.length,
      type: info.semanticType
    }))
    .sort((a, b) => b.refs - a.refs)

  // Prioritize safety and motor tags
  const keyTags = tagRefs
    .filter(t => t.type === 'safety' || t.type === 'motor' || t.type === 'fault' || t.refs >= 3)
    .slice(0, 20)
    .map(t => t.name)

  return {
    totalRungs,
    safetyRungs,
    motorControlRungs,
    timerCount,
    counterCount,
    detectedPatterns,
    keyTags
  }
}

// ============================================================================
// EXPORT FOR USE IN EXPLANATIONS
// ============================================================================

/**
 * Generate a smart explanation for a rung using pre-computed analysis
 */
export function generateSmartExplanation(
  rungContext: RungContext,
  tagUsage: Map<string, TagUsageInfo>
): string {
  const lines: string[] = []

  // Main purpose
  if (rungContext.purpose) {
    lines.push(`**Purpose:** ${rungContext.purpose}`)
  }

  // Subsystems involved (grouped by functional area like the API benchmark)
  if (rungContext.subsystems && rungContext.subsystems.length > 0) {
    lines.push('')
    lines.push('**Subsystems:** ' + rungContext.subsystems.join(', '))
  }

  // Safety warning if relevant
  if (rungContext.safetyRelevant) {
    lines.push('')
    lines.push('**Safety-Related Logic** - This rung affects safety functions. Changes require careful review.')
  }

  // Code concerns/anomalies (like API benchmark detecting improper MUL/DIV use)
  if (rungContext.concerns && rungContext.concerns.length > 0) {
    lines.push('')
    lines.push('**Code Concerns:**')
    for (const concern of rungContext.concerns) {
      lines.push(`- ${concern}`)
    }
  }

  // Patterns detected (filter out code_concern as it's shown separately)
  const displayPatterns = rungContext.patterns.filter(p => p !== 'code_concern')
  if (displayPatterns.length > 0) {
    lines.push('')
    lines.push('**Patterns:** ' + displayPatterns.map(formatPatternName).join(', '))
  }

  // Input conditions
  if (rungContext.inputTags.length > 0) {
    lines.push('')
    lines.push('**Depends on:**')
    for (const tag of rungContext.inputTags.slice(0, 5)) {
      const usage = tagUsage.get(tag)
      const type = usage?.semanticType || 'unknown'
      const writers = usage?.writers || []

      let detail = `- ${tag}`
      if (type !== 'unknown') {
        detail += ` (${formatSemanticType(type)})`
      }
      if (writers.length > 0) {
        const setBy = writers[0]
        detail += ` <- set by ${setBy.routine}:${setBy.rungNumber}`
      }
      lines.push(detail)
    }
  }

  // Output effects
  if (rungContext.outputTags.length > 0) {
    lines.push('')
    lines.push('**Controls:**')
    for (const tag of rungContext.outputTags.slice(0, 5)) {
      const usage = tagUsage.get(tag)
      const type = usage?.semanticType || 'unknown'
      const readers = usage?.readers || []

      let detail = `- ${tag}`
      if (type !== 'unknown') {
        detail += ` (${formatSemanticType(type)})`
      }
      if (readers.length > 0) {
        const usedBy = readers.slice(0, 3).map(r => `${r.routine}:${r.rungNumber}`).join(', ')
        detail += ` -> used by ${usedBy}`
      }
      lines.push(detail)
    }
  }

  // Related rungs
  if (rungContext.relatedRungs.length > 0) {
    lines.push('')
    lines.push(`**Related rungs:** ${rungContext.relatedRungs.slice(0, 5).join(', ')}`)
  }

  return lines.join('\n')
}

function formatPatternName(pattern: PatternType): string {
  const names: Record<PatternType, string> = {
    'safety_interlock': 'Safety Interlock',
    'start_stop_circuit': 'Start/Stop Circuit',
    'latch_unlatch': 'Latch/Unlatch',
    'timer_delay': 'Timer Delay',
    'counter_accumulator': 'Counter',
    'sequencer': 'Sequence Control',
    'one_shot': 'One-Shot',
    'comparison_branch': 'Comparison Logic',
    'handshake': 'Handshake',
    'fault_detection': 'Fault Detection',
    'status_monitoring': 'Status Monitoring',
    'zone_control': 'Zone Control',
    'code_concern': 'Code Quality Concern'
  }
  return names[pattern] || pattern
}

function formatSemanticType(type: SemanticTagType): string {
  const names: Record<SemanticTagType, string> = {
    'safety': 'safety',
    'motor': 'motor',
    'valve': 'valve/actuator',
    'sensor': 'sensor',
    'timer': 'timer',
    'counter': 'counter',
    'status': 'status',
    'command': 'command',
    'feedback': 'feedback',
    'fault': 'fault',
    'hmi': 'HMI',
    'sequence': 'sequence',
    'io': 'I/O',
    'internal': 'internal',
    'unknown': ''
  }
  return names[type] || type
}
