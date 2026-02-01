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
  | 'data_scaling'              // MUL/DIV used for scaling analog values
  | 'permissive_chain'          // Multiple XIC in series forming permissive logic
  | 'alarm_annunciation'        // Alarm/warning output patterns
  | 'mode_selection'            // AUTO/MANUAL mode switching logic
  | 'jog_control'               // Jog/inch control patterns
  | 'hmi_write'                 // Writing to HMI display tags

export interface BranchGroup {
  name: string
  branches: number[]  // branch indices
  tags: string[]
}

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
  keyPoints?: string[]          // Auto-generated key observations (safety, conditional logic, etc.)
  branchCount?: number          // Number of parallel branches in this rung
  hasOptionBits?: boolean       // Uses N15:x/y style option bits for conditional equipment
  branchGroups?: BranchGroup[]  // Grouped parallel branches by function (like API benchmark)
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

  // Data Scaling Pattern - MUL/DIV used for analog value scaling (not boolean misuse)
  {
    type: 'data_scaling',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()
      const tags = extractTagNames(text)

      // Check for MUL or DIV instructions
      const hasMul = /MUL\s*\(/i.test(text)
      const hasDiv = /DIV\s*\(/i.test(text)

      if (!hasMul && !hasDiv) return null

      // Look for scaling indicators: analog-type tags or scaling constants
      const hasAnalogTag = tags.some(t =>
        /ANALOG|AI|AO|SCALE|RAW|ENG|COUNTS|PERCENT|PCT|4_20|0_10|LEVEL|TEMP|PRESSURE|FLOW|SPEED|VELOCITY|POSITION|PV|CV|SP|SETPOINT/i.test(t)
      )

      // Check for scaling constants (decimals like 0.001, 0.01, or large divisors like 4096, 32767)
      const hasScalingConstant = /[\(,]\s*(0\.\d+|32767|4096|16383|65535|1000|100|10)\s*[,\)]/i.test(text)

      // Exclude boolean-looking operands (those would be code_concern)
      const mathMatch = text.match(/(?:MUL|DIV)\s*\(([^)]+)\)/gi)
      let hasBooleanOperands = false
      if (mathMatch) {
        for (const match of mathMatch) {
          const operands = match.match(/\(([^)]+)\)/)?.[1]?.split(',') || []
          const booleanOperands = operands.filter(op =>
            /STOPPED|RUNNING|OK|READY|ACTIVE|ENABLE|DISABLE|ON|OFF|TRUE|FALSE/i.test(op.trim())
          )
          if (booleanOperands.length >= 2) {
            hasBooleanOperands = true
            break
          }
        }
      }

      // Only detect as scaling if it looks like analog scaling, not boolean misuse
      if ((hasAnalogTag || hasScalingConstant) && !hasBooleanOperands) {
        // Try to determine scaling direction
        let description = 'Analog value scaling calculation'
        if (hasDiv && /RAW|COUNTS|4096|32767|16383/i.test(text)) {
          description = 'Converts raw analog counts to engineering units'
        } else if (hasMul && /PERCENT|PCT|100/i.test(text)) {
          description = 'Converts value to percentage scale'
        } else if (/4_20|0_10/i.test(text)) {
          description = 'Scales 4-20mA or 0-10V analog signal'
        }

        return {
          type: 'data_scaling',
          confidence: hasAnalogTag ? 0.9 : 0.75,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: hasMul ? 'MUL' : 'DIV', usage: 'read' }],
          tags: tags.filter(t => /ANALOG|AI|AO|SCALE|RAW|ENG|COUNTS|PERCENT|PCT|LEVEL|TEMP|PRESSURE|FLOW|SPEED|PV|CV|SP/i.test(t)),
          description
        }
      }
      return null
    }
  },

  // Permissive Chain Pattern - Multiple XIC in series forming permissive logic
  {
    type: 'permissive_chain',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()

      // Count consecutive XIC instructions (series logic)
      const xicMatches = text.match(/XIC\s*\(/gi) || []
      const xicCount = xicMatches.length

      // Permissive chains typically have 4+ conditions in series
      if (xicCount < 4) return null

      // Check for permissive-related tag names
      const tags = extractTagNames(text)
      const hasPermissiveTags = tags.some(t =>
        /PERMIT|PERMISSIVE|ENABLE|READY|INTERLOCK|ALLOW|OK|SAFE|CONDITION|PREREQ|PREREQUISITE/i.test(t)
      )

      // Check that there's an output (OTE/OTL) - typical of permissive chains
      const hasOutput = /OTE\s*\(|OTL\s*\(/i.test(text)

      // Higher confidence if tags look like permissives
      if (xicCount >= 4 && hasOutput) {
        const outputMatch = text.match(/OTE\s*\(\s*([^)]+)\)|OTL\s*\(\s*([^)]+)\)/i)
        const outputTag = outputMatch ? (outputMatch[1] || outputMatch[2]).trim() : ''

        let description = `Permissive chain with ${xicCount} conditions that must all be true`
        if (/ENABLE|PERMIT|ALLOW|READY/i.test(outputTag)) {
          description = `${xicCount} permissive conditions required to enable ${formatTagName(outputTag)}`
        }

        return {
          type: 'permissive_chain',
          confidence: hasPermissiveTags ? 0.9 : 0.8,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'XIC chain', usage: 'read' }],
          tags,
          description
        }
      }
      return null
    }
  },

  // Alarm Annunciation Pattern - Alarm/warning output patterns
  {
    type: 'alarm_annunciation',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()
      const tags = extractTagNames(text)

      // Look for alarm/warning output tags
      const alarmOutputTags = tags.filter(t =>
        /ALARM|ALM|WARNING|WARN|HORN|BEACON|LIGHT|LAMP|STROBE|ANNUNCIATOR|ANNUNC|ALERT|NOTIFY|SIREN|BUZZER/i.test(t)
      )

      // Check if there's an output instruction driving the alarm
      const hasAlarmOutput = alarmOutputTags.some(t => {
        const escapedTag = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const regex = new RegExp(`OTE\\s*\\(\\s*${escapedTag}|OTL\\s*\\(\\s*${escapedTag}`, 'i')
        return regex.test(text)
      })

      // Also check for alarm-related patterns in outputs
      const outputMatch = text.match(/OTE\s*\(\s*([^)]+)\)|OTL\s*\(\s*([^)]+)\)/gi)
      const outputTags = outputMatch ? outputMatch.map(m => {
        const match = m.match(/\(\s*([^)]+)\)/)
        return match ? match[1].trim() : ''
      }) : []

      const isAlarmOutput = outputTags.some(t =>
        /ALARM|ALM|WARNING|WARN|HORN|BEACON|LIGHT|LAMP|STROBE|ANNUNCIATOR|ANNUNC|ALERT|SIREN|BUZZER/i.test(t)
      )

      if (hasAlarmOutput || (isAlarmOutput && alarmOutputTags.length > 0)) {
        // Determine the type of alarm
        let description = 'Alarm annunciation output control'
        if (/HORN|SIREN|BUZZER/i.test(text)) {
          description = 'Audible alarm/horn control'
        } else if (/BEACON|STROBE|LIGHT|LAMP/i.test(text)) {
          description = 'Visual alarm indicator (beacon/light) control'
        } else if (/WARNING|WARN/i.test(text)) {
          description = 'Warning condition annunciation'
        }

        return {
          type: 'alarm_annunciation',
          confidence: 0.85,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'alarm output', usage: 'write' }],
          tags: alarmOutputTags.length > 0 ? alarmOutputTags : outputTags.filter(t => /ALARM|ALM|WARNING|WARN|HORN|BEACON|LIGHT/i.test(t)),
          description
        }
      }
      return null
    }
  },

  // Mode Selection Pattern - AUTO/MANUAL mode switching logic
  {
    type: 'mode_selection',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()
      const tags = extractTagNames(text)

      // Look for mode-related tags
      const hasAutoManual = /AUTO|MANUAL|MAN|SEMI|SEMIAUTO|SEMI_AUTO|LOCAL|REMOTE|HAND|OFF|HOA/i.test(text)
      const hasModeTag = tags.some(t =>
        /MODE|AUTO|MANUAL|MAN|SEMI|LOCAL|REMOTE|HAND|HOA|SELECTOR|SELECT/i.test(t)
      )

      // Look for mode selection patterns: typically EQU comparisons or XIC checks on mode bits
      const hasModeCompare = /EQU\s*\([^,]*MODE/i.test(text) || /EQU\s*\([^,]+,\s*[012]\s*\)/i.test(text)
      const hasModeXIC = /XIC\s*\([^)]*(?:AUTO|MANUAL|MAN|LOCAL|REMOTE|HAND)/i.test(text)

      // Check for mode output
      const hasModeOutput = /OTE\s*\([^)]*(?:AUTO|MANUAL|MAN|MODE|LOCAL|REMOTE)/i.test(text) ||
                           /OTL\s*\([^)]*(?:AUTO|MANUAL|MAN|MODE|LOCAL|REMOTE)/i.test(text)

      if ((hasAutoManual || hasModeTag) && (hasModeCompare || hasModeXIC || hasModeOutput)) {
        // Determine mode type
        let description = 'Mode selection logic'
        if (/AUTO.*MANUAL|MANUAL.*AUTO/i.test(text)) {
          description = 'AUTO/MANUAL mode selection and switching'
        } else if (/LOCAL.*REMOTE|REMOTE.*LOCAL/i.test(text)) {
          description = 'LOCAL/REMOTE mode selection'
        } else if (/HOA|HAND.*OFF.*AUTO/i.test(text)) {
          description = 'HAND-OFF-AUTO (HOA) selector logic'
        } else if (/SEMI/i.test(text)) {
          description = 'SEMI-AUTO mode selection'
        }

        return {
          type: 'mode_selection',
          confidence: hasModeCompare ? 0.9 : 0.8,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'mode select', usage: 'read' }],
          tags: tags.filter(t => /MODE|AUTO|MANUAL|MAN|SEMI|LOCAL|REMOTE|HAND|HOA|SELECT/i.test(t)),
          description
        }
      }
      return null
    }
  },

  // Jog Control Pattern - Jog/inch control patterns
  {
    type: 'jog_control',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()
      const tags = extractTagNames(text)

      // Look for jog/inch related tags
      const hasJogTag = tags.some(t =>
        /JOG|INCH|PULSE|STEP|NUDGE|CREEP|CRAWL|SLOW|IMPULSE/i.test(t)
      )

      // Check for jog button inputs (typically XIC)
      const hasJogInput = /XIC\s*\([^)]*(?:JOG|INCH|PULSE|STEP|PB)/i.test(text)

      // Check for jog output or motor output with jog condition
      const hasJogOutput = /OTE\s*\([^)]*(?:JOG|INCH|MOTOR|MTR|DRIVE|RUN|FWD|REV)/i.test(text)

      // Look for typical jog patterns: momentary (no seal-in), often with timer
      const hasTimer = /TON\s*\(|TOF\s*\(/i.test(text)
      const hasMotorTag = tags.some(t => /MOTOR|MTR|DRIVE|DRV|VFD|CONV/i.test(t))

      if (hasJogTag && (hasJogInput || hasJogOutput)) {
        let description = 'Jog/inch control for momentary operation'
        if (/FWD|FORWARD/i.test(text) && /REV|REVERSE/i.test(text)) {
          description = 'Jog control with forward/reverse selection'
        } else if (hasTimer) {
          description = 'Timed jog/pulse operation'
        } else if (/INCH/i.test(text)) {
          description = 'Inch mode control for precise positioning'
        }

        return {
          type: 'jog_control',
          confidence: hasJogInput && hasJogOutput ? 0.9 : 0.8,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'jog', usage: 'read' }],
          tags: tags.filter(t => /JOG|INCH|PULSE|STEP|MOTOR|MTR|DRIVE/i.test(t)),
          description
        }
      }

      // Also detect jog if motor control with jog mode
      if (hasMotorTag && /JOG.*MODE|MODE.*JOG/i.test(text)) {
        return {
          type: 'jog_control',
          confidence: 0.85,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'jog mode', usage: 'read' }],
          tags: tags.filter(t => /JOG|MOTOR|MTR|DRIVE|MODE/i.test(t)),
          description: 'Motor jog mode activation'
        }
      }
      return null
    }
  },

  // HMI Write Pattern - Writing to HMI display tags
  {
    type: 'hmi_write',
    detect: (rung, ctx) => {
      const text = rung.rawText.toUpperCase()
      const tags = extractTagNames(text)

      // Look for HMI-related destination tags
      const hmiTags = tags.filter(t =>
        /HMI|DISPLAY|SCREEN|PV|PANELVIEW|PANEL|OPERATOR|OP_|SCADA|DCS|MSG|MESSAGE|STATUS_MSG|STATUS_TEXT|TEXT|DISP/i.test(t)
      )

      // Check for MOV/COP instructions writing to HMI tags
      const movMatch = text.match(/MOV\s*\([^,]+,\s*([^)]+)\)|COP\s*\([^,]+,\s*([^)]+)/gi)
      const destinations = movMatch ? movMatch.map(m => {
        const match = m.match(/,\s*([^)]+)\)/)
        return match ? match[1].trim() : ''
      }) : []

      const isHmiDestination = destinations.some(d =>
        /HMI|DISPLAY|SCREEN|PV|PANELVIEW|PANEL|OPERATOR|OP_|SCADA|MSG|MESSAGE|STATUS_MSG|TEXT|DISP/i.test(d)
      )

      // Also check OTE/OTL to HMI status bits
      const hmiOutputMatch = text.match(/OTE\s*\([^)]*HMI|OTL\s*\([^)]*HMI|OTE\s*\([^)]*DISPLAY|OTE\s*\([^)]*SCREEN/gi)

      if ((isHmiDestination || hmiOutputMatch) && (hmiTags.length > 0 || destinations.length > 0)) {
        let description = 'Writing data to HMI display'
        if (/MSG|MESSAGE|TEXT/i.test(text)) {
          description = 'Updating HMI message/text display'
        } else if (/STATUS/i.test(text)) {
          description = 'Updating HMI status indicator'
        } else if (/SETPOINT|SP|TARGET/i.test(text)) {
          description = 'Transferring setpoint value to HMI'
        } else if (/PV|ACTUAL|FEEDBACK/i.test(text)) {
          description = 'Updating HMI with process value/feedback'
        }

        const relevantTags = hmiTags.length > 0 ? hmiTags : destinations.filter(d =>
          /HMI|DISPLAY|SCREEN|PV|PANEL|MSG|MESSAGE|TEXT/i.test(d)
        )

        return {
          type: 'hmi_write',
          confidence: isHmiDestination ? 0.9 : 0.8,
          rungRefs: [{ program: ctx.program, routine: ctx.routine, rungNumber: rung.number, instruction: 'MOV/HMI', usage: 'write' }],
          tags: relevantTags,
          description
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
// BRANCH GROUPING - Groups parallel branches by function (like API benchmark)
// ============================================================================

// Branch grouping configuration - groups parallel branches by function like API benchmark
interface BranchGroupConfig {
  name: string
  patterns: RegExp[]
}

const BRANCH_GROUP_CONFIGS: BranchGroupConfig[] = [
  // Core Motion Systems (ROTATION, MPS, CUTTER, CARRIAGE, CLAMP, STABILIZER, HOTWIRE)
  {
    name: 'Core Motion Systems',
    patterns: [
      /ROTATION|ROTATE/i,
      /MPS/i,
      /CUTTER|CUT/i,
      /CARRIAGE/i,
      /CLAMP/i,
      /STABILIZER/i,
      /HOTWIRE|HOT_WIRE/i
    ]
  },
  // Conveyor Systems (INFEED1-3, WRAPZONE, EXIT1-3)
  {
    name: 'Conveyor Systems',
    patterns: [
      /INFEED\d*/i,
      /WRAPZONE|WRAP_ZONE/i,
      /EXIT\d*/i,
      /OUTFEED\d*/i,
      /CONV|CONVEYOR/i
    ]
  },
  // Optional Equipment (LOADLIFT, TSD/DISPENSE)
  {
    name: 'Optional Equipment',
    patterns: [
      /LOADLIFT|LOAD_LIFT|LIFT/i,
      /TSD/i,
      /DISPENSE|DISPENSER/i
    ]
  }
]

/**
 * Detect branch groups from parallel branches in a rung
 * Groups branches by subsystem type (Core Motion, Conveyors, Optional Equipment)
 *
 * @param rung - The rung to analyze
 * @returns Array of branch groups with friendly names, branch indices, and tags
 */
function detectBranchGroups(rung: PlcRung): BranchGroup[] {
  // Parse branches from raw text - branches are separated by | in ladder logic
  const branchTexts = rung.rawText.split('|')

  if (branchTexts.length < 2) {
    // No parallel branches to group
    return []
  }

  // Map to track which group each branch belongs to
  const groupMap = new Map<string, { branches: number[], tags: string[] }>()

  // Analyze each branch
  for (let branchIndex = 0; branchIndex < branchTexts.length; branchIndex++) {
    const branchText = branchTexts[branchIndex]
    const branchTags = extractTagNames(branchText)

    if (branchTags.length === 0) continue

    // Find which group this branch belongs to
    let matchedGroup: string | null = null

    for (const config of BRANCH_GROUP_CONFIGS) {
      const hasMatch = branchTags.some(tag =>
        config.patterns.some(pattern => pattern.test(tag))
      )

      if (hasMatch) {
        matchedGroup = config.name
        break
      }
    }

    // If no specific group matched, check for generic subsystem detection
    if (!matchedGroup) {
      const subsystems = detectSubsystems(branchTags)
      if (subsystems.length > 0) {
        // Use the first detected subsystem as a fallback group
        matchedGroup = subsystems[0]
      }
    }

    // Only group if we found a matching subsystem
    if (matchedGroup) {
      const existing = groupMap.get(matchedGroup)
      if (existing) {
        existing.branches.push(branchIndex)
        // Add unique tags
        for (const tag of branchTags) {
          if (!existing.tags.includes(tag)) {
            existing.tags.push(tag)
          }
        }
      } else {
        groupMap.set(matchedGroup, {
          branches: [branchIndex],
          tags: [...branchTags]
        })
      }
    }
  }

  // Convert map to array of BranchGroup
  const branchGroups: BranchGroup[] = []

  // Sort groups by predefined order (Core Motion first, then Conveyors, then Optional)
  const groupOrder = BRANCH_GROUP_CONFIGS.map(c => c.name)

  const sortedGroupNames = Array.from(groupMap.keys()).sort((a, b) => {
    const aIndex = groupOrder.indexOf(a)
    const bIndex = groupOrder.indexOf(b)
    // Predefined groups come first, sorted by config order
    // Unknown groups come after
    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
    if (aIndex !== -1) return -1
    if (bIndex !== -1) return 1
    return a.localeCompare(b)
  })

  for (const groupName of sortedGroupNames) {
    const data = groupMap.get(groupName)!
    // Only include groups with at least one branch
    if (data.branches.length > 0) {
      branchGroups.push({
        name: groupName,
        branches: data.branches.sort((a, b) => a - b),
        tags: data.tags
      })
    }
  }

  // Only return groups if we found meaningful groupings (at least 2 branches grouped OR multiple groups)
  if (branchGroups.length === 0) {
    return []
  }

  const totalGroupedBranches = branchGroups.reduce((sum, g) => sum + g.branches.length, 0)
  if (totalGroupedBranches < 2 && branchGroups.length < 2) {
    return []
  }

  return branchGroups
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

// Generate key points based on rung analysis
function generateKeyPoints(
  rung: PlcRung,
  patterns: PatternType[],
  category: RungCategory,
  safetyRelevant: boolean,
  inputTags: string[],
  outputTags: string[],
  branchCount: number,
  hasOptionBits: boolean,
  subsystems: string[]
): string[] {
  const points: string[] = []
  const text = rung.rawText.toUpperCase()

  // Safety logic observation
  if (safetyRelevant) {
    if (patterns.includes('safety_interlock')) {
      points.push('Safety interlock - machine will stop if any safety condition fails')
    } else {
      points.push('Safety-related logic - affects machine safety functions')
    }
  }

  // AND-logic detection (multiple XIC in series means ALL must be true)
  const xicCount = (text.match(/XIC\s*\(/gi) || []).length
  if (xicCount >= 3 && outputTags.length <= 2) {
    points.push(`All ${xicCount} conditions must be TRUE for output to energize`)
  }

  // Conditional equipment / option bits
  if (hasOptionBits) {
    points.push('Uses option bits - disabled equipment sections are bypassed')
  }

  // Multi-branch complexity
  if (branchCount >= 5) {
    points.push(`Complex rung with ${branchCount} parallel branches - multiple subsystems controlled`)
  }

  // Status aggregation pattern
  if (category === 'status_monitoring' && subsystems.length >= 3) {
    points.push(`Aggregates status from ${subsystems.length} subsystems into single status bit`)
  }

  // Latch logic observation
  if (patterns.includes('latch_unlatch')) {
    const hasOTL = /OTL\s*\(/i.test(text)
    const hasOTU = /OTU\s*\(/i.test(text)
    if (hasOTL && hasOTU) {
      points.push('Latching logic - output stays ON until explicitly unlatched')
    } else if (hasOTL) {
      points.push('Latch ON - output remains ON until reset elsewhere')
    } else if (hasOTU) {
      points.push('Unlatch - clears a latched output')
    }
  }

  // Timer usage
  if (patterns.includes('timer_delay')) {
    const timerMatch = text.match(/TON|TOF|RTO/i)
    if (timerMatch) {
      const timerType = timerMatch[0].toUpperCase()
      if (timerType === 'TON') points.push('On-delay timer - output energizes after time expires')
      else if (timerType === 'TOF') points.push('Off-delay timer - output stays on for delay after input drops')
      else if (timerType === 'RTO') points.push('Retentive timer - accumulates time across power cycles')
    }
  }

  // Fault integration
  if (patterns.includes('fault_detection')) {
    points.push('Includes fault monitoring - abnormal conditions will affect output')
  }

  // Output tag name insights
  for (const tag of outputTags.slice(0, 1)) {
    const upperTag = tag.toUpperCase()
    if (upperTag.includes('STOPPED') || upperTag.includes('STOP')) {
      points.push('Sets STOPPED status when all conditions are met')
    } else if (upperTag.includes('RUNNING') || upperTag.includes('RUN')) {
      points.push('Enables RUN status when all conditions are met')
    } else if (upperTag.includes('READY') || upperTag.includes('RDY')) {
      points.push('Sets READY status indicating system is prepared')
    } else if (upperTag.includes('FAULT') || upperTag.includes('FLT') || upperTag.includes('ALARM')) {
      points.push('Sets fault/alarm condition when triggered')
    }
  }

  return points
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

// Analyze output tag to determine the action/intent of the rung
function analyzeOutputIntent(outputTag: string): { intent: string; statusType: string | null } {
  const upper = outputTag.toUpperCase()

  // Status type detection from tag name suffix/content
  if (/STOPPED|_STOP$|\.STOP$|ALLSTOPPED/i.test(upper)) {
    return { intent: 'stopped', statusType: 'STOPPED' }
  }
  if (/RUNNING|_RUN$|\.RUN$|ALLRUNNING/i.test(upper)) {
    return { intent: 'running', statusType: 'RUNNING' }
  }
  if (/READY|_RDY$|\.RDY$|ALLREADY/i.test(upper)) {
    return { intent: 'ready', statusType: 'READY' }
  }
  if (/FAULT|_FLT$|\.FLT$|ALLFAULT|ERROR|ALARM/i.test(upper)) {
    return { intent: 'fault', statusType: 'FAULT' }
  }
  if (/OK$|_OK$|\.OK$/i.test(upper)) {
    return { intent: 'ok', statusType: 'OK' }
  }
  if (/ENABLE|_ENB$|\.ENB$|ALLOWED|PERMIT/i.test(upper)) {
    return { intent: 'enable', statusType: 'ENABLED' }
  }
  if (/COMPLETE|DONE|FINISHED/i.test(upper)) {
    return { intent: 'complete', statusType: 'COMPLETE' }
  }
  if (/ACTIVE|INUSE|BUSY/i.test(upper)) {
    return { intent: 'active', statusType: 'ACTIVE' }
  }

  return { intent: 'unknown', statusType: null }
}

// Generate action-oriented purpose statement based on output intent and inputs
function generateActionPurpose(
  primaryOutput: string,
  cleanInputs: string[],
  subsystems: string[]
): string {
  const { intent, statusType } = analyzeOutputIntent(primaryOutput)

  // Detect what the inputs represent
  const hasSafetyInputs = cleanInputs.some(t => /ESTOP|GUARD|GATE|SAFETY|INTERLOCK/i.test(t))

  // Build descriptive input list
  let inputDescription = ''
  if (subsystems.length > 0) {
    inputDescription = subsystems.join(', ')
  } else if (cleanInputs.length > 0) {
    // Take up to 3 meaningful input tags
    const meaningfulInputs = cleanInputs
      .filter(t => !isNumericConstant(t))
      .slice(0, 3)
      .map(t => formatTagName(t))
    inputDescription = meaningfulInputs.join(', ')
  }

  // Generate action-oriented statement based on intent
  switch (intent) {
    case 'stopped':
      if (inputDescription) {
        return `Determines when ${inputDescription} have stopped - sets ${statusType} status`
      }
      return `Determines when all components have stopped - sets ${statusType} status`

    case 'running':
      if (inputDescription) {
        return `Confirms ${inputDescription} are running - sets ${statusType} status`
      }
      return `Confirms all components are running - sets ${statusType} status`

    case 'ready':
      if (inputDescription) {
        return `Verifies ${inputDescription} are ready for operation - sets ${statusType} status`
      }
      return `Verifies system is ready for operation - sets ${statusType} status`

    case 'fault':
      if (inputDescription) {
        return `Detects fault conditions in ${inputDescription} - sets ${statusType} status`
      }
      return `Detects fault conditions - sets ${statusType} status`

    case 'ok':
      if (inputDescription) {
        return `Confirms ${inputDescription} are in normal state - sets ${statusType} status`
      }
      return `Confirms normal operating state - sets ${statusType} status`

    case 'enable':
      if (hasSafetyInputs) {
        return `Enables operation when all safety conditions are met - sets ${statusType}`
      }
      if (inputDescription) {
        return `Enables operation when ${inputDescription} conditions are met - sets ${statusType}`
      }
      return `Enables operation when all conditions are met - sets ${statusType}`

    case 'complete':
      if (inputDescription) {
        return `Signals completion when ${inputDescription} finish - sets ${statusType} status`
      }
      return `Signals operation completion - sets ${statusType} status`

    case 'active':
      if (inputDescription) {
        return `Indicates ${inputDescription} are active - sets ${statusType} status`
      }
      return `Indicates active operation - sets ${statusType} status`

    default:
      // Fall back to formatted output tag name
      return `Controls ${formatTagName(primaryOutput)}`
  }
}

function inferRungPurpose(rung: PlcRung, patterns: DetectedPattern[], category: RungCategory, inputTags: string[], outputTags: string[]): string {
  const text = rung.rawText.toUpperCase()

  // Filter out numeric constants from tags
  const cleanInputs = inputTags.filter(t => !isNumericConstant(t))
  const cleanOutputs = outputTags.filter(t => !isNumericConstant(t))

  // Detect subsystems from all tags
  const allTags = [...cleanInputs, ...cleanOutputs]
  const subsystems = detectSubsystems(allTags)

  // Get primary output tag for intent analysis
  const primaryOutput = cleanOutputs[0] || ''
  const { intent, statusType } = analyzeOutputIntent(primaryOutput)

  // Pattern-based inference with enrichment
  // Prioritize certain patterns over others
  if (patterns.length > 0) {
    // Special case: if status_monitoring is present with many outputs, it takes priority
    // This is the hallmark of a "track all zone statuses" rung
    const statusMonitoringPattern = patterns.find(p => p.type === 'status_monitoring')
    if (statusMonitoringPattern && cleanOutputs.length >= 5) {
      return generateActionPurpose(primaryOutput, cleanInputs, subsystems)
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

    // Special handling for status_monitoring - generate action-oriented description
    if (mainPattern.type === 'status_monitoring') {
      return generateActionPurpose(primaryOutput, cleanInputs, subsystems)
    }

    // Special handling for zone_control - action-oriented
    if (mainPattern.type === 'zone_control') {
      if (intent !== 'unknown' && statusType) {
        const zoneList = subsystems.length > 0 ? subsystems.join(', ') : 'zones'
        return `Controls ${zoneList} - sets ${statusType} when conditions met`
      }
      if (subsystems.length > 0) {
        return `Controls ${subsystems.join(', ')} zone operations`
      }
      return 'Controls multiple zone operations'
    }

    // Special handling for safety_interlock - action-oriented
    if (mainPattern.type === 'safety_interlock') {
      if (primaryOutput) {
        const hasSafetyInputs = cleanInputs.some(t => /ESTOP|GUARD|GATE|SAFETY/i.test(t))
        if (hasSafetyInputs) {
          return `Enables ${formatTagName(primaryOutput)} when all safety conditions (guards, E-stops) are met`
        }
        return `Enables ${formatTagName(primaryOutput)} when all safety conditions are met`
      }
      return 'Enables output when all safety conditions are met'
    }

    // Special handling for start_stop_circuit - action-oriented
    if (mainPattern.type === 'start_stop_circuit') {
      const motorTag = [...cleanOutputs, ...cleanInputs].find(t => /MOTOR|MTR|DRIVE|VFD|CONV/i.test(t))
      const hasInterlocks = cleanInputs.some(t => /INTERLOCK|SAFETY|GUARD|ESTOP/i.test(t))
      if (motorTag) {
        const motorName = formatTagName(motorTag)
        if (hasInterlocks) {
          return `Controls ${motorName} start/stop with safety interlocks`
        }
        return `Controls ${motorName} start/stop sequence`
      }
      return 'Controls motor start/stop sequence'
    }

    let purpose = mainPattern.description

    // Enrich with specific tag info if available - use action-oriented language
    if (cleanOutputs.length > 0 && !purpose.includes(cleanOutputs[0])) {
      purpose += ` - sets ${formatTagName(cleanOutputs[0])}`
    }

    return purpose
  }

  // Smart purpose generation based on category - now action-oriented
  switch (category) {
    case 'safety': {
      const safetyOutput = cleanOutputs.find(t => inferSemanticType(t) === 'safety' || inferSemanticType(t) === 'status')
      if (safetyOutput) {
        const hasSafetyInputs = cleanInputs.some(t => /ESTOP|GUARD|GATE|SAFETY/i.test(t))
        if (hasSafetyInputs) {
          return `Enables ${formatTagName(safetyOutput)} when all safety conditions (guards, E-stops) are met`
        }
        return `Enables ${formatTagName(safetyOutput)} when all safety conditions are met`
      }
      return 'Enables operation when all safety conditions are met'
    }

    case 'motor_control': {
      const motorTag = [...cleanOutputs, ...cleanInputs].find(t => inferSemanticType(t) === 'motor')
      const hasInterlocks = cleanInputs.some(t => /INTERLOCK|SAFETY|GUARD|ESTOP/i.test(t))
      if (motorTag) {
        const motorName = formatTagName(motorTag)
        if (hasInterlocks) {
          return `Controls ${motorName} start/stop with safety interlocks`
        }
        return `Controls ${motorName} start/stop sequence`
      }
      return 'Controls motor start/stop sequence'
    }

    case 'valve_control': {
      const valveTag = [...cleanOutputs, ...cleanInputs].find(t => inferSemanticType(t) === 'valve')
      if (valveTag) {
        return `Actuates ${formatTagName(valveTag)} when conditions are met`
      }
      return 'Controls valve/actuator operation'
    }

    case 'timer_logic': {
      const timerMatch = text.match(/T(?:ON|OF|RTO)\s*\(\s*([^,)]+)/i)
      const timerTag = timerMatch ? timerMatch[1].trim() : null
      if (cleanOutputs.length > 0) {
        return `Delays activation of ${formatTagName(cleanOutputs[0])} using timer`
      }
      if (timerTag) {
        return `Implements timed delay using ${formatTagName(timerTag)}`
      }
      return 'Implements timed delay'
    }

    case 'counter_logic': {
      const counterMatch = text.match(/CT[UD]\s*\(\s*([^,)]+)/i)
      const counterTag = counterMatch ? counterMatch[1].trim() : null
      if (cleanOutputs.length > 0) {
        return `Triggers ${formatTagName(cleanOutputs[0])} based on count`
      }
      if (counterTag) {
        return `Accumulates count using ${formatTagName(counterTag)}`
      }
      return 'Accumulates count for triggering action'
    }

    case 'sequence_control': {
      const stateTag = cleanInputs.find(t => /STATE|STEP|PHASE|SEQ/i.test(t))
      const stateMatch = text.match(/EQU\s*\([^,]+,\s*(\d+)/i)
      const stepNum = stateMatch ? stateMatch[1] : null

      if (stepNum && cleanOutputs.length > 0) {
        return `Executes step ${stepNum} - activates ${formatTagName(cleanOutputs[0])}`
      } else if (stepNum) {
        return `Executes step ${stepNum} actions`
      } else if (stateTag) {
        return `Advances sequence based on ${formatTagName(stateTag)}`
      }
      return 'Advances sequence to next step'
    }

    case 'fault_handling': {
      const faultTag = cleanOutputs.find(t => inferSemanticType(t) === 'fault')
      if (faultTag) {
        return `Detects fault condition - sets ${formatTagName(faultTag)}`
      }
      return 'Detects fault condition and sets alarm'
    }

    case 'calculation': {
      // Describe what's being calculated
      if (/MUL.*0\.\d+|DIV.*\d{2,}/i.test(text)) {
        // Scaling pattern (multiply by small number or divide by large number)
        const destMatch = text.match(/(?:MUL|DIV|ADD|SUB)\s*\([^,]+,[^,]+,\s*([^)\s]+)/i)
        const dest = destMatch ? destMatch[1] : cleanOutputs[0]
        return dest
          ? `Scales value and stores result in ${formatTagName(dest)}`
          : 'Scales/converts value'
      }
      if (cleanOutputs.length > 0) {
        return `Calculates and updates ${formatTagName(cleanOutputs[0])}`
      }
      return 'Performs calculation'
    }

    case 'data_move': {
      if (cleanOutputs.length > 0) {
        const hmiDest = cleanOutputs.find(t => /HMI|DISPLAY|SCREEN/i.test(t))
        if (hmiDest) {
          return `Updates HMI display - writes to ${formatTagName(hmiDest)}`
        }
        return `Transfers data to ${formatTagName(cleanOutputs[0])}`
      }
      return 'Transfers data between locations'
    }

    case 'hmi_interface': {
      const hmiTag = cleanOutputs.find(t => inferSemanticType(t) === 'hmi') || cleanInputs.find(t => inferSemanticType(t) === 'hmi')
      if (hmiTag) {
        return `Handles HMI interaction - ${formatTagName(hmiTag)}`
      }
      return 'Handles operator interface interaction'
    }

    case 'status_monitoring': {
      return generateActionPurpose(primaryOutput, cleanInputs, subsystems)
    }

    case 'zone_control': {
      if (intent !== 'unknown' && statusType) {
        const zoneList = subsystems.length > 0 ? subsystems.join(', ') : 'zones'
        return `Controls ${zoneList} - sets ${statusType} when conditions met`
      }
      if (subsystems.length > 0) {
        return `Controls ${subsystems.join(', ')} zone operations`
      }
      return 'Controls zone operations'
    }

    default: {
      // General logic - try to make something useful with action orientation
      if (cleanOutputs.length > 0) {
        const { intent: outIntent, statusType: outStatus } = analyzeOutputIntent(cleanOutputs[0])
        if (outIntent !== 'unknown' && outStatus) {
          return `Sets ${outStatus} status for ${formatTagName(cleanOutputs[0])}`
        }
        return `Controls ${formatTagName(cleanOutputs[0])}`
      }
      if (cleanInputs.length > 0) {
        return `Responds to ${formatTagName(cleanInputs[0])} conditions`
      }
      return 'Executes control logic'
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

        // Count branches (commas indicate parallel branches in raw text)
        const branchCount = (rung.rawText.match(/\|/g) || []).length + 1

        // Detect option bits (N15:x/y style conditional equipment)
        const hasOptionBits = /N\d+:\d+\/\d+/i.test(rung.rawText)

        // Generate key points based on analysis
        const keyPoints = generateKeyPoints(
          rung, patternTypes, category, safetyRelevant,
          inputTags, outputTags, branchCount, hasOptionBits, subsystems
        )

        // Detect branch groups for parallel branches (like API benchmark)
        const branchGroups = detectBranchGroups(rung)

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
          subsystems: subsystems.length > 0 ? subsystems : undefined,
          keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
          branchCount: branchCount > 1 ? branchCount : undefined,
          hasOptionBits: hasOptionBits || undefined,
          branchGroups: branchGroups.length > 0 ? branchGroups : undefined
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

  // Generate narrative purpose (like AI chat: "This rung monitors... and sets...")
  const narrativePurpose = generateNarrativePurpose(rungContext)
  if (narrativePurpose) {
    lines.push(`**Purpose:** ${narrativePurpose}`)
  }

  // Key Functionality section (like AI chat's bullet points)
  const keyFunctionality = generateKeyFunctionality(rungContext, tagUsage)
  if (keyFunctionality.length > 0) {
    lines.push('')
    lines.push('**Key Functionality:**')
    for (const func of keyFunctionality) {
      lines.push(`- ${func}`)
    }
  }

  // Subsystems involved
  if (rungContext.subsystems && rungContext.subsystems.length > 0) {
    lines.push('')
    if (rungContext.subsystems.length <= 5) {
      lines.push('**Subsystems:** ' + rungContext.subsystems.join(', '))
    } else {
      lines.push(`**Subsystems:** ${rungContext.subsystems.length} systems monitored (${rungContext.subsystems.slice(0, 4).join(', ')}, and ${rungContext.subsystems.length - 4} more)`)
    }
  }

  // Safety Implications section (like AI chat)
  if (rungContext.safetyRelevant) {
    const safetyImplications = generateSafetyImplications(rungContext)
    if (safetyImplications.length > 0) {
      lines.push('')
      lines.push('**Safety Implications:**')
      for (const imp of safetyImplications) {
        lines.push(`- ${imp}`)
      }
    }
  }

  // Code concerns with contextual insight (like AI chat noting unusual patterns)
  if (rungContext.concerns && rungContext.concerns.length > 0) {
    lines.push('')
    lines.push('**Code Analysis:**')
    for (const concern of rungContext.concerns) {
      lines.push(`- ${concern}`)
    }
    // Add contextual insight like AI chat does
    if (rungContext.concerns.some(c => c.includes('MUL') || c.includes('DIV'))) {
      lines.push('- *Note: Using math operations for boolean logic is unusual - may indicate code converted from another platform or non-standard programming approach*')
    }
  }

  // Patterns - only show if we have few other sections (simpler rungs)
  const displayPatterns = rungContext.patterns.filter(p => p !== 'code_concern')
  const hasDetailedSections = (rungContext.subsystems?.length || 0) > 3 || rungContext.safetyRelevant
  if (displayPatterns.length > 0 && !hasDetailedSections) {
    lines.push('')
    lines.push('**Patterns:** ' + displayPatterns.map(formatPatternName).join(', '))
  }

  // Input conditions (condensed)
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

  // Output effects (condensed)
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

/**
 * Generate a narrative purpose statement like the AI chat does
 */
function generateNarrativePurpose(ctx: RungContext): string {
  if (!ctx.purpose) return ''

  const inputUpper = ctx.inputTags.map(t => t.toUpperCase())
  const outputUpper = ctx.outputTags.map(t => t.toUpperCase())

  // For power/safety validation rungs
  const hasPowerInputs = inputUpper.filter(t => t.includes('POWER')).length >= 2
  const hasGateOutput = outputUpper.some(t => t.includes('GATE') || t.includes('SHUTDOWN'))
  const hasCpuOutput = outputUpper.some(t => t.includes('CPUOK') || t.includes('CPU_OK'))

  if (hasPowerInputs && (hasGateOutput || hasCpuOutput)) {
    return 'This rung implements system power and safety status monitoring with component enable logic.'
  }

  // For complex status monitoring rungs
  if (ctx.category === 'status_monitoring' && ctx.subsystems && ctx.subsystems.length > 5) {
    const hasStoppedOutput = outputUpper.some(t => t.includes('STOPPED'))
    if (hasStoppedOutput) {
      return `This rung monitors the operational status of all major machine subsystems and sets the overall STOPPED condition when all systems are not running.`
    }
  }

  // Convert action-oriented purpose to narrative
  let purpose = ctx.purpose

  // If it already starts with a verb, convert to narrative
  if (/^(Determines|Monitors|Controls|Sets|Manages|Handles|Checks|Enables)/i.test(purpose)) {
    purpose = `This rung ${purpose.charAt(0).toLowerCase() + purpose.slice(1)}`
  } else if (/^(When|If|On)/i.test(purpose)) {
    purpose = `This rung activates ${purpose.charAt(0).toLowerCase() + purpose.slice(1)}`
  }

  return purpose
}

/**
 * Generate Key Functionality bullets like AI chat does
 */
function generateKeyFunctionality(ctx: RungContext, tagUsage: Map<string, TagUsageInfo>): string[] {
  const functionality: string[] = []
  const inputUpper = ctx.inputTags.map(t => t.toUpperCase())
  const outputUpper = ctx.outputTags.map(t => t.toUpperCase())

  // Power verification (check inputs for power-related tags)
  const hasPowerInputs = inputUpper.some(t => t.includes('POWER') || t.includes('INPUTPOWER') || t.includes('OUTPUTPOWER') || t.includes('SAFETYPOWER'))
  if (hasPowerInputs) {
    functionality.push('**Power Verification:** Checks that input, output, and safety power are all present')
  }

  // CPU/PLC health monitoring
  const hasCpuOutput = outputUpper.some(t => t.includes('CPUOK') || t.includes('PLCOK') || t.includes('CPU_OK'))
  if (hasCpuOutput) {
    functionality.push('**CPU Health:** Sets CPU/PLC OK status when all conditions are satisfied')
  }

  // Safety gate/shutdown control
  const hasGateOutput = outputUpper.some(t => t.includes('GATE') || t.includes('SHUTDOWN'))
  if (hasGateOutput) {
    functionality.push('**Safety Gate Control:** Manages gate shutdown and safety interlock states')
  }

  // System-wide monitoring
  if (ctx.subsystems && ctx.subsystems.length >= 5) {
    functionality.push(`**System-Wide Status:** Monitors ${ctx.subsystems.length} major subsystems to determine overall machine state`)
  }

  // Optional equipment handling
  if (ctx.hasOptionBits) {
    functionality.push('**Optional Equipment:** Only checks systems that are installed (via option bits)')
  }

  // Blocked state detection
  if (outputUpper.some(t => t.includes('BLOCKED'))) {
    functionality.push('**Blocked State:** Sets BLOCKED condition when load is detected but machine cannot process')
  }

  // Film handling (be specific - not UNLOCK tags)
  const hasFilmOutput = outputUpper.some(t => t.includes('FILMBREAK') && !t.includes('UNLOCK'))
  if (hasFilmOutput) {
    functionality.push('**Film Handling:** Monitors film system conditions and break detection')
  }

  // Fault detection
  if (ctx.patterns.includes('fault_detection') || outputUpper.some(t => t.includes('FAULT'))) {
    functionality.push('**Fault Detection:** Monitors for error conditions and sets fault flags')
  }

  // Hoist/lift operations
  const hasHoistInput = inputUpper.some(t => t.includes('HOIST') || t.includes('HOISTCLEAR'))
  if (hasHoistInput) {
    functionality.push('**Hoist Clearance:** Verifies hoist/lift is in safe position before proceeding')
  }

  // Sequence control
  if (ctx.patterns.includes('sequencer')) {
    functionality.push('**Sequence Control:** Manages step-by-step operation sequence')
  }

  // Timer-based logic
  if (ctx.patterns.includes('timer_delay')) {
    functionality.push('**Time-Based Logic:** Uses timers for delayed actions or monitoring')
  }

  // Latch/unlatch behavior
  if (ctx.patterns.includes('latch_unlatch')) {
    functionality.push('**Latched Output:** Output remains set until explicitly reset elsewhere')
  }

  // Zone coordination
  if (ctx.patterns.includes('zone_control') && ctx.branchCount && ctx.branchCount > 3) {
    functionality.push(`**Zone Coordination:** Manages ${ctx.branchCount} parallel zones/conveyors`)
  }

  return functionality.slice(0, 5) // Max 5 items
}

/**
 * Generate Safety Implications section like AI chat does
 */
function generateSafetyImplications(ctx: RungContext): string[] {
  const implications: string[] = []
  const inputUpper = ctx.inputTags.map(t => t.toUpperCase())
  const outputUpper = ctx.outputTags.map(t => t.toUpperCase())

  // Power redundancy check
  const powerInputs = inputUpper.filter(t => t.includes('POWER'))
  if (powerInputs.length >= 3) {
    implications.push('**Triple Power Redundancy:** Requires input, output, AND safety power circuits to be active')
  } else if (powerInputs.length >= 2) {
    implications.push('**Power Validation:** Multiple power circuits must be validated before operation')
  }

  // Gate safety
  if (outputUpper.some(t => t.includes('GATE'))) {
    implications.push('**Gate Safety:** Only allows gate operations when safety conditions are validated')
  }

  // Hoist safety
  if (inputUpper.some(t => t.includes('HOIST'))) {
    implications.push('**Hoist Safety:** Includes hoist clearance as an additional safety condition')
  }

  if (ctx.patterns.includes('safety_interlock')) {
    implications.push('Prevents machine startup until all safety conditions are satisfied')
  }

  if (ctx.patterns.includes('permissive_chain')) {
    implications.push('Part of permissive chain - all upstream conditions must be met')
  }

  if (ctx.category === 'status_monitoring' && ctx.subsystems && ctx.subsystems.length > 3) {
    implications.push('Coordinates system-wide shutdowns across multiple subsystems')
  }

  if (outputUpper.some(t => t.includes('BLOCKED'))) {
    implications.push('Manages blocked conditions that could cause material jams')
  }

  if (outputUpper.some(t => t.includes('FAULT') || t.includes('ALARM'))) {
    implications.push('Triggers fault/alarm conditions requiring operator intervention')
  }

  if (ctx.patterns.includes('latch_unlatch')) {
    implications.push('Latched output requires explicit reset - verify reset logic exists')
  }

  // Default if nothing specific found
  if (implications.length === 0) {
    implications.push('This rung affects safety-related functions - changes require careful review')
  }

  return implications.slice(0, 5) // Max 5 items
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
    'code_concern': 'Code Quality Concern',
    'data_scaling': 'Data Scaling',
    'permissive_chain': 'Permissive Chain',
    'alarm_annunciation': 'Alarm Annunciation',
    'mode_selection': 'Mode Selection',
    'jog_control': 'Jog Control',
    'hmi_write': 'HMI Write'
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
