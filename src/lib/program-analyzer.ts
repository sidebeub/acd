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
  // Safety Interlock Pattern
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
]

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function extractTagNames(text: string): string[] {
  const tags: string[] = []
  const regex = /([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*(?:\[[^\]]+\])?)/g
  const instructionPattern = /^(XIC|XIO|OTE|OTL|OTU|TON|TOF|RTO|CTU|CTD|MOV|COP|JSR|RET|ADD|SUB|MUL|DIV|EQU|NEQ|GRT|LES|GEQ|LEQ|ONS|OSR|OSF|RES|JMP|LBL|NOP|AFI|MCR|END|Branch)$/i

  let match
  while ((match = regex.exec(text)) !== null) {
    const tag = match[1]
    if (!instructionPattern.test(tag) && !tags.includes(tag) && tag.length > 1) {
      tags.push(tag)
    }
  }
  return tags
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

  // Check patterns first
  if (patterns.includes('safety_interlock')) return 'safety'
  if (patterns.includes('start_stop_circuit')) return 'motor_control'
  if (patterns.includes('timer_delay')) return 'timer_logic'
  if (patterns.includes('counter_accumulator')) return 'counter_logic'
  if (patterns.includes('fault_detection')) return 'fault_handling'

  // Check tag semantics
  const allTags = [...inputTags, ...outputTags]
  for (const tag of allTags) {
    const type = inferSemanticType(tag)
    if (type === 'safety') return 'safety'
    if (type === 'motor') return 'motor_control'
    if (type === 'valve') return 'valve_control'
    if (type === 'sequence') return 'sequence_control'
    if (type === 'fault') return 'fault_handling'
    if (type === 'hmi') return 'hmi_interface'
  }

  // Check instruction types
  if (/MOV|COP|FLL/i.test(text)) return 'data_move'
  if (/ADD|SUB|MUL|DIV|CPT/i.test(text)) return 'calculation'

  return 'general_logic'
}

function inferRungPurpose(rung: PlcRung, patterns: DetectedPattern[], category: RungCategory, inputTags: string[], outputTags: string[]): string {
  // Start with pattern-based inference
  if (patterns.length > 0) {
    const mainPattern = patterns[0]
    return mainPattern.description
  }

  // Build purpose from category and tags
  const purposeParts: string[] = []

  switch (category) {
    case 'safety':
      purposeParts.push('Safety logic:')
      break
    case 'motor_control':
      purposeParts.push('Motor control:')
      break
    case 'valve_control':
      purposeParts.push('Valve/actuator control:')
      break
    case 'timer_logic':
      purposeParts.push('Timer logic:')
      break
    case 'counter_logic':
      purposeParts.push('Counter logic:')
      break
    case 'sequence_control':
      purposeParts.push('Sequence control:')
      break
    case 'fault_handling':
      purposeParts.push('Fault handling:')
      break
    default:
      purposeParts.push('Logic:')
  }

  // Add what conditions enable outputs
  if (inputTags.length > 0 && outputTags.length > 0) {
    const inputs = inputTags.slice(0, 3).join(', ')
    const outputs = outputTags.slice(0, 2).join(', ')
    purposeParts.push(`When ${inputs} conditions are met, ${outputs} is controlled`)
  } else if (outputTags.length > 0) {
    purposeParts.push(`Controls ${outputTags.slice(0, 2).join(', ')}`)
  }

  return purposeParts.join(' ')
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
          const isWrite = isWriteInstruction(instruction.type)
          for (const operand of instruction.operands) {
            if (operand) {
              if (isWrite) {
                if (!outputTags.includes(operand)) outputTags.push(operand)
              } else {
                if (!inputTags.includes(operand)) inputTags.push(operand)
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
          outputTags
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
  // Skip numeric literals and empty
  if (!tagName || /^\d+$/.test(tagName)) return

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

  // Safety warning if relevant
  if (rungContext.safetyRelevant) {
    lines.push('')
    lines.push('⚠️ **Safety-Related Logic** - This rung affects safety functions. Changes require careful review.')
  }

  // Patterns detected
  if (rungContext.patterns.length > 0) {
    lines.push('')
    lines.push('**Patterns:** ' + rungContext.patterns.map(formatPatternName).join(', '))
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
        detail += ` ← set by ${setBy.routine}:${setBy.rungNumber}`
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
        detail += ` → used by ${usedBy}`
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
    'fault_detection': 'Fault Detection'
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
