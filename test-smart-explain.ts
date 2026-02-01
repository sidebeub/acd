/**
 * Test script to compare deterministic analysis output
 * Run with: npx ts-node test-smart-explain.ts
 */

import { analyzeProgram, generateSmartExplanation, type RungContext } from './src/lib/program-analyzer'
import { generateFullRungExplanation, explainRungInstructions } from './src/lib/instruction-library'

// Sample rungs - including complex ones with multiple things happening
const sampleRungs = [
  // REAL RUNG from user's PLC program - Zone Stopped Status
  {
    name: "REAL: Zone Stopped Status (User's Rung #2)",
    rawText: "[XIC(ROTATIONSTOPPED) MUL(MPSSTOPPED,CUTTERSTOPPED,CARRIAGESTOPPED) DIV(CUTTERSTOPPED,CLAMPSTOPPED,MPSSTOPPED) OTL(CUTTERSTOPPED) OTE(CLAMPSTOPPED) EQU(STABILIZERSTOPPED,HOTWIRESTOPPED) ,OTE(STABILIZERSTOPPED) ,XIC(OPTIONSTABILIZER) OTE(INFEED3STOPPED) ,XIC(N15:1/2) OTE(INFEED2STOPPED) ,XIC(N15:1/1) OTE(INFEED1STOPPED) ,XIC(N15:1/0) OTE(WRAPZONESTOPPED) ,OTE(EXIT1STOPPED) ,XIC(N15:2/0) OTE(EXIT2STOPPED) ,XIC(N15:2/1) OTE(EXIT3STOPPED) ,XIC(N15:2/2) OTE(LOADLIFTSTOPPED) ,XIC(OPTIONLOADLIFT) XIC(WRAPLOAD) OTE(BLOCKED) ,XIC(TSDDISPENSEVFDCOMMOK) XIC(N15:0/10) OTE(FILMBREAK) MOV(STOPPED)]",
    comment: "Track stopped status for all machine zones"
  },

  // REAL RUNG from user's PLC program - Gate Interlock
  {
    name: "REAL: Gate Interlock (User's Rung)",
    rawText: "[XIC(GATE2OPEN) XIC(GATE1OPEN) OTE(GATESOK) ,XIC(GATEREQUEST) XIC(POWERON) OTE(GATESTOPREQUEST) OTL(GATESTOPREQUEST) ,XIC(GATESTOPREQUEST) XIC(GATESHUTDOWN) OTL(AUTO) ,MOV(T4:14.PRE,T4:14.PRE) ,XIC(GATEREQUEST) XIC(POWEROFF) OTE(GATEUNLOCK) ,OTE(GATEUNLOCK) ,TON(T4:14,300,0)]",
    comment: "Gate interlock and shutdown sequence"
  },

  // Simple cases
  {
    name: "Gate Interlock Rung",
    rawText: "XIC(GATE2OPEN) XIC(GATE1OPEN) XIO(ESTOP) OTE(SYSTEM_READY)",
    comment: "System ready when gates closed and no e-stop"
  },

  // COMPLEX: Timer + Comparison + Output
  {
    name: "Complex: Timer with comparison",
    rawText: "XIC(CYCLE_ACTIVE) TON(CYCLE_TMR,30000,0) GEQ(CYCLE_TMR.ACC,25000) OTE(CYCLE_WARNING)",
    comment: "Start cycle timer, warn if taking too long"
  },

  // COMPLEX: Math + Move + Multiple outputs
  {
    name: "Complex: Math and data move",
    rawText: "XIC(CALCULATE_CMD) ADD(VALUE_A,VALUE_B,TOTAL) MUL(TOTAL,SCALE_FACTOR,SCALED_RESULT) MOV(SCALED_RESULT,HMI_DISPLAY)",
    comment: "Calculate and display result"
  },

  // COMPLEX: Branching with parallel outputs
  {
    name: "Complex: Branch with multiple outputs",
    rawText: "XIC(AUTO_MODE) [XIC(SENSOR_1) OTE(OUTPUT_1) ,XIC(SENSOR_2) OTE(OUTPUT_2) ,XIC(SENSOR_3) OTE(OUTPUT_3)]",
    comment: "Parallel outputs based on sensors"
  },

  // COMPLEX: JSR call with parameters
  {
    name: "Complex: Subroutine call",
    rawText: "XIC(CYCLE_START) JSR(Motor_Control_Routine,2,MOTOR_CMD,MOTOR_FB)",
    comment: "Call motor control subroutine"
  },

  // COMPLEX: Counter + Comparison + Reset
  {
    name: "Complex: Counter with limit check",
    rawText: "XIC(PART_SENSOR) CTU(PART_COUNTER,100,0) EQU(PART_COUNTER.ACC,100) OTE(BATCH_COMPLETE) RES(PART_COUNTER)",
    comment: "Count parts, signal when batch complete, reset"
  },

  // COMPLEX: Safety with multiple conditions and timer
  {
    name: "Complex: Safety with delay",
    rawText: "XIC(GUARD_CLOSED) XIC(ESTOP_OK) XIO(FAULT_ACTIVE) TON(SAFETY_DELAY,2000,0) XIC(SAFETY_DELAY.DN) OTE(SAFE_TO_RUN)",
    comment: "Safety check with 2-second delay"
  },

  // COMPLEX: PID or analog control
  {
    name: "Complex: Analog scaling",
    rawText: "XIC(ANALOG_ENABLE) MUL(ANALOG_INPUT,0.00024414,SCALED_VALUE) ADD(SCALED_VALUE,OFFSET,FINAL_VALUE) LIM(0,FINAL_VALUE,100) MOV(FINAL_VALUE,SETPOINT)",
    comment: "Scale analog input 0-4095 to 0-100%"
  },

  // COMPLEX: State machine step
  {
    name: "Complex: State machine",
    rawText: "EQU(MACHINE_STATE,5) XIC(STEP_5_COMPLETE) XIO(FAULT) ADD(MACHINE_STATE,1,MACHINE_STATE) MOV(0,STEP_TIMER.ACC)",
    comment: "State 5: advance to state 6 when complete"
  },

  // COMPLEX: Message/communication
  {
    name: "Complex: Data exchange",
    rawText: "XIC(SEND_REQUEST) ONS(SEND_ONESHOT) COP(LOCAL_DATA,SEND_BUFFER,10) OTE(MSG_TRIGGER)",
    comment: "Copy data to buffer and trigger message"
  }
]

// Build a mock PlcProject structure for analysis
function buildMockProject() {
  const rungs = sampleRungs.map((sample, index) => ({
    number: index,
    comment: sample.comment,
    rawText: sample.rawText,
    instructions: parseInstructions(sample.rawText)
  }))

  return {
    name: "Test Project",
    processorType: "1756-L83E",
    tags: [],
    programs: [{
      name: "MainProgram",
      routines: [{
        name: "MainRoutine",
        type: "Ladder",
        rungs
      }],
      localTags: []
    }],
    tasks: [],
    modules: [],
    dataTypes: []
  }
}

// Simple instruction parser
function parseInstructions(rawText: string) {
  const instructions: Array<{ type: string; operands: string[] }> = []
  const pattern = /(\w+)\s*\(([^)]*)\)/g
  let match

  while ((match = pattern.exec(rawText)) !== null) {
    const type = match[1]
    const operands = match[2].split(',').map(s => s.trim()).filter(Boolean)
    instructions.push({ type, operands })
  }

  return instructions
}

// Run the test
async function runTest() {
  console.log("=" .repeat(80))
  console.log("SMART EXPLAIN TEST - Comparing Deterministic Analysis Output")
  console.log("=" .repeat(80))
  console.log()

  // Build mock project and analyze
  const project = buildMockProject()
  const analysis = analyzeProgram(project as any)

  console.log(`Analysis Summary:`)
  console.log(`  - Tags tracked: ${analysis.tagUsage.size}`)
  console.log(`  - Patterns detected: ${analysis.patterns.length}`)
  console.log(`  - Rungs analyzed: ${analysis.rungContexts.size}`)
  console.log()

  // Show detected patterns
  if (analysis.patterns.length > 0) {
    console.log("Detected Patterns:")
    for (const pattern of analysis.patterns) {
      console.log(`  - ${pattern.type}: ${pattern.description} (confidence: ${pattern.confidence})`)
    }
    console.log()
  }

  // Test each sample rung
  for (const sample of sampleRungs) {
    console.log("-".repeat(80))
    console.log(`RUNG: ${sample.name}`)
    console.log(`Code: ${sample.rawText}`)
    console.log()

    // Get rung context from analysis
    const key = `MainProgram/MainRoutine:${sampleRungs.indexOf(sample)}`
    const context = analysis.rungContexts.get(key)

    // Current library-based explanation
    const libraryExplanation = generateFullRungExplanation(sample.rawText, 'friendly', false)
    console.log("CURRENT (Library-based):")
    console.log(libraryExplanation)
    console.log()

    // Smart explanation with context
    if (context) {
      console.log("NEW (Smart Context):")
      console.log(`  Category: ${context.category}`)
      console.log(`  Safety Relevant: ${context.safetyRelevant}`)
      console.log(`  Patterns: ${context.patterns.join(', ') || 'none'}`)
      console.log(`  Purpose: ${context.purpose}`)
      console.log(`  Input Tags: ${context.inputTags.join(', ')}`)
      console.log(`  Output Tags: ${context.outputTags.join(', ')}`)
      console.log(`  Related Rungs: ${context.relatedRungs.join(', ') || 'none'}`)
      console.log()

      // Generate smart explanation
      const smartExpl = generateSmartExplanation(context, analysis.tagUsage)
      console.log("SMART EXPLANATION:")
      console.log(smartExpl)
    } else {
      console.log("  [No context generated - check analysis]")
    }
    console.log()
  }

  // Show what the ideal API explanation might look like (for comparison)
  console.log("=".repeat(80))
  console.log("BENCHMARK: What a good AI explanation looks like")
  console.log("=".repeat(80))
  console.log(`
For rung: XIC(GATE2OPEN) XIC(GATE1OPEN) XIO(ESTOP) OTE(SYSTEM_READY)

A good explanation should include:
1. PURPOSE: "This is a safety interlock that enables the system only when all guards are closed and no emergency stop is active"
2. SAFETY WARNING: "⚠️ Safety-critical logic - changes require careful review"
3. CONDITIONS:
   - GATE2OPEN must be ON (gate 2 closed/secure)
   - GATE1OPEN must be ON (gate 1 closed/secure)
   - ESTOP must be OFF (no emergency stop)
4. RESULT: SYSTEM_READY energizes when all conditions met
5. CONTEXT: "SYSTEM_READY is used by 5 other rungs to enable operations"
`)
}

runTest().catch(console.error)
