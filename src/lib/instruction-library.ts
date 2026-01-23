/**
 * Comprehensive Ladder Logic Instruction Library
 *
 * Rockwell/Allen-Bradley Logix5000 Instructions
 * Provides instant explanations for PLC instructions without AI.
 * Three explanation modes:
 * - friendly: Real-world analogies for operators/beginners
 * - technical: Engineering terminology
 * - operator: Operational language for technicians
 */

export type ExplanationMode = 'friendly' | 'technical' | 'operator'

export interface InstructionExplanation {
  friendly: string
  technical: string
  operator: string
  category: string
  icon?: string
}

export interface DevicePattern {
  pattern: RegExp
  deviceType: string
  friendlyName: string
  troubleshooting?: string[]
}

// ============================================================================
// INSTRUCTION DEFINITIONS - Comprehensive Rockwell/Allen-Bradley Library
// ============================================================================

export const INSTRUCTIONS: Record<string, InstructionExplanation> = {
  // ===========================================================================
  // BIT INSTRUCTIONS
  // ===========================================================================
  XIC: {
    category: 'Bit Logic',
    icon: '⎯] [⎯',
    friendly: '{0} is ON',
    technical: 'XIC: Test if {0} = TRUE',
    operator: '{0} is energized'
  },
  XIO: {
    category: 'Bit Logic',
    icon: '⎯]/[⎯',
    friendly: '{0} is OFF',
    technical: 'XIO: Test if {0} = FALSE',
    operator: '{0} is de-energized'
  },
  OTE: {
    category: 'Bit Logic',
    icon: '⎯( )⎯',
    friendly: 'turn ON {0}',
    technical: 'OTE: Set {0} = rung state',
    operator: 'energize {0}'
  },
  OTL: {
    category: 'Bit Logic',
    icon: '⎯(L)⎯',
    friendly: 'latch {0} ON (stays ON until unlatched)',
    technical: 'OTL: Latch {0} TRUE, retains until OTU',
    operator: 'latch {0} ON'
  },
  OTU: {
    category: 'Bit Logic',
    icon: '⎯(U)⎯',
    friendly: 'unlatch {0} OFF (stays OFF until latched)',
    technical: 'OTU: Unlatch {0} FALSE, retains until OTL',
    operator: 'unlatch {0} OFF'
  },
  ONS: {
    category: 'Bit Logic',
    icon: '⎯[ONS]⎯',
    friendly: 'one-shot pulse using {0}',
    technical: 'ONS: One scan pulse on rising edge, storage {0}',
    operator: 'one-shot {0}'
  },
  OSR: {
    category: 'Bit Logic',
    icon: '⎯[OSR]⎯',
    friendly: 'pulse {1} once on rising edge',
    technical: 'OSR: Set {1} true for one scan on rising edge, storage {0}',
    operator: 'rising edge pulse to {1}'
  },
  OSF: {
    category: 'Bit Logic',
    icon: '⎯[OSF]⎯',
    friendly: 'pulse {1} once on falling edge',
    technical: 'OSF: Set {1} true for one scan on falling edge, storage {0}',
    operator: 'falling edge pulse to {1}'
  },
  OSRI: {
    category: 'Bit Logic',
    icon: '⎯[OSRI]⎯',
    friendly: 'Pulse output ON briefly when input becomes true',
    technical: 'One Shot Rising with Input - Sets output true for one scan on rising edge of input bit',
    operator: 'Rising edge detector with separate input bit'
  },
  OSFI: {
    category: 'Bit Logic',
    icon: '⎯[OSFI]⎯',
    friendly: 'Pulse output ON briefly when input becomes false',
    technical: 'One Shot Falling with Input - Sets output true for one scan on falling edge of input bit',
    operator: 'Falling edge detector with separate input bit'
  },

  // ===========================================================================
  // TIMER INSTRUCTIONS
  // ===========================================================================
  TON: {
    category: 'Timer',
    icon: '⧖',
    friendly: 'start on-delay timer {0}',
    technical: 'TON: Timer {0}, delays .DN by preset when true, resets when false',
    operator: 'on-delay timer {0}'
  },
  TOF: {
    category: 'Timer',
    icon: '⧗',
    friendly: 'start off-delay timer {0}',
    technical: 'TOF: Timer {0}, .DN stays true for preset after rung goes false',
    operator: 'off-delay timer {0}'
  },
  RTO: {
    category: 'Timer',
    icon: '⧖R',
    friendly: 'accumulate time in retentive timer {0}',
    technical: 'RTO: Retentive timer {0}, accumulates while true, retains when false',
    operator: 'retentive timer {0}'
  },
  TONR: {
    category: 'Timer',
    icon: '⧖R',
    friendly: 'start retentive on-delay timer {0}',
    technical: 'TONR: Retentive on-delay timer {0} with built-in reset',
    operator: 'retentive on-delay timer {0}'
  },
  TOFR: {
    category: 'Timer',
    icon: '⧗R',
    friendly: 'start retentive off-delay timer {0}',
    technical: 'TOFR: Retentive off-delay timer {0}',
    operator: 'retentive off-delay timer {0}'
  },

  // ===========================================================================
  // COUNTER INSTRUCTIONS
  // ===========================================================================
  CTU: {
    category: 'Counter',
    icon: '↑#',
    friendly: 'Count up by 1 each time conditions become true (like a tally counter)',
    technical: 'Count Up - Increments {0}.ACC on each false-to-true transition until {1} is reached',
    operator: 'Count up {0} - adds 1 each scan, done when count reaches {1}'
  },
  CTD: {
    category: 'Counter',
    icon: '↓#',
    friendly: 'Count down by 1 each time conditions become true',
    technical: 'Count Down - Decrements {0}.ACC on each false-to-true transition',
    operator: 'Count down {0} - subtracts 1 each scan'
  },
  CTUD: {
    category: 'Counter',
    icon: '↕#',
    friendly: 'Counter that can count both up and down',
    technical: 'Count Up/Down - Bidirectional counter with CU and CD inputs',
    operator: 'Up/down counter {0} - counts in either direction'
  },
  RES: {
    category: 'Counter/Timer',
    icon: '⟲',
    friendly: 'Reset {0} back to zero/starting position',
    technical: 'Reset - Clears accumulated value and status bits of timer/counter {0}',
    operator: 'Reset {0} - clears accumulated value and done bit'
  },

  // ===========================================================================
  // COMPARE INSTRUCTIONS
  // ===========================================================================
  CMP: {
    category: 'Compare',
    icon: '?=',
    friendly: 'Evaluate expression: {0}',
    technical: 'Compare - Evaluates expression {0}, true if result is non-zero',
    operator: 'Expression compare: {0}'
  },
  EQU: {
    category: 'Compare',
    icon: '=',
    friendly: 'Check if {0} equals {1} (like comparing two numbers)',
    technical: 'Equal - Tests if {0} = {1}, rung true if equal',
    operator: 'Compare: is {0} equal to {1}?'
  },
  NEQ: {
    category: 'Compare',
    icon: '≠',
    friendly: 'Check if {0} is different from {1}',
    technical: 'Not Equal - Tests if {0} ≠ {1}, rung true if not equal',
    operator: 'Compare: is {0} not equal to {1}?'
  },
  GRT: {
    category: 'Compare',
    icon: '>',
    friendly: 'Check if {0} is greater than {1}',
    technical: 'Greater Than - Tests if {0} > {1}',
    operator: 'Compare: is {0} greater than {1}?'
  },
  GEQ: {
    category: 'Compare',
    icon: '≥',
    friendly: 'Check if {0} is greater than or equal to {1}',
    technical: 'Greater Than or Equal - Tests if {0} ≥ {1}',
    operator: 'Compare: is {0} greater than or equal to {1}?'
  },
  LES: {
    category: 'Compare',
    icon: '<',
    friendly: 'Check if {0} is less than {1}',
    technical: 'Less Than - Tests if {0} < {1}',
    operator: 'Compare: is {0} less than {1}?'
  },
  LEQ: {
    category: 'Compare',
    icon: '≤',
    friendly: 'Check if {0} is less than or equal to {1}',
    technical: 'Less Than or Equal - Tests if {0} ≤ {1}',
    operator: 'Compare: is {0} less than or equal to {1}?'
  },
  LIM: {
    category: 'Compare',
    icon: '⟨ ⟩',
    friendly: 'Check if {1} is between {0} and {2} (within range)',
    technical: 'Limit Test - True if {0} ≤ {1} ≤ {2}',
    operator: 'Range check: is {1} between {0} and {2}?'
  },
  MEQ: {
    category: 'Compare',
    icon: '=&',
    friendly: 'Check if {0} equals {2} after applying mask {1}',
    technical: 'Masked Equal - Compares {0} to {2} through mask {1}',
    operator: 'Masked compare: ({0} AND {1}) = {2}?'
  },

  // ===========================================================================
  // MATH INSTRUCTIONS - Basic
  // ===========================================================================
  ADD: {
    category: 'Math',
    icon: '+',
    friendly: 'Add {0} + {1} and store result in {2}',
    technical: 'Add - Computes {0} + {1}, stores in {2}',
    operator: 'Calculate: {2} = {0} + {1}'
  },
  SUB: {
    category: 'Math',
    icon: '−',
    friendly: 'Subtract {1} from {0} and store result in {2}',
    technical: 'Subtract - Computes {0} - {1}, stores in {2}',
    operator: 'Calculate: {2} = {0} - {1}'
  },
  MUL: {
    category: 'Math',
    icon: '×',
    friendly: 'Multiply {0} × {1} and store result in {2}',
    technical: 'Multiply - Computes {0} × {1}, stores in {2}',
    operator: 'Calculate: {2} = {0} × {1}'
  },
  DIV: {
    category: 'Math',
    icon: '÷',
    friendly: 'Divide {0} by {1} and store result in {2}',
    technical: 'Divide - Computes {0} ÷ {1}, stores quotient in {2}',
    operator: 'Calculate: {2} = {0} ÷ {1}'
  },
  MOD: {
    category: 'Math',
    icon: '%',
    friendly: 'Get remainder of {0} divided by {1}, store in {2}',
    technical: 'Modulo - Computes {0} MOD {1}, stores remainder in {2}',
    operator: 'Calculate remainder: {2} = {0} MOD {1}'
  },
  NEG: {
    category: 'Math',
    icon: '±',
    friendly: 'Change sign of {0} and store in {1}',
    technical: 'Negate - Computes -{0}, stores in {1}',
    operator: 'Negate: {1} = -{0}'
  },
  ABS: {
    category: 'Math',
    icon: '|x|',
    friendly: 'Get absolute value of {0} (always positive)',
    technical: 'Absolute Value - Computes |{0}|, stores in {1}',
    operator: 'Absolute value: {1} = |{0}|'
  },
  SQR: {
    category: 'Math',
    icon: '√',
    friendly: 'Calculate square root of {0}',
    technical: 'Square Root - Computes √{0}, stores in {1}',
    operator: 'Square root: {1} = √{0}'
  },
  CPT: {
    category: 'Math',
    icon: 'f(x)',
    friendly: 'Calculate complex formula and store in {0}',
    technical: 'Compute - Evaluates expression {1}, stores result in {0}',
    operator: 'Compute expression into {0}'
  },
  SRT: {
    category: 'Math',
    icon: '↕',
    friendly: 'Sort array {0} in ascending order',
    technical: 'Sort - Sorts {1} elements of array {0} in ascending order',
    operator: 'Sort array {0}'
  },
  AVE: {
    category: 'Math',
    icon: 'x̄',
    friendly: 'Calculate average of array {0}',
    technical: 'Average - Computes average of {2} elements from {0}, stores in {1}',
    operator: 'Calculate average of array {0}'
  },
  STD: {
    category: 'Math',
    icon: 'σ',
    friendly: 'Calculate standard deviation of array {0}',
    technical: 'Standard Deviation - Computes std dev of array {0}, stores in {1}',
    operator: 'Calculate standard deviation of {0}'
  },

  // ===========================================================================
  // MATH INSTRUCTIONS - Advanced/Trigonometry
  // ===========================================================================
  LN: {
    category: 'Math',
    icon: 'ln',
    friendly: 'Calculate natural logarithm of {0}',
    technical: 'Natural Log - Computes ln({0}), stores in {1}',
    operator: 'Natural log: {1} = ln({0})'
  },
  LOG: {
    category: 'Math',
    icon: 'log',
    friendly: 'Calculate base-10 logarithm of {0}',
    technical: 'Logarithm - Computes log₁₀({0}), stores in {1}',
    operator: 'Log base 10: {1} = log({0})'
  },
  XPY: {
    category: 'Math',
    icon: 'xʸ',
    friendly: 'Calculate {0} raised to power {1}',
    technical: 'X to Power Y - Computes {0}^{1}, stores in {2}',
    operator: 'Power: {2} = {0}^{1}'
  },
  SIN: {
    category: 'Trigonometry',
    icon: '∿',
    friendly: 'Calculate sine of angle {0}',
    technical: 'Sine - Computes sin({0}) in radians, stores in {1}',
    operator: 'Sine: {1} = sin({0})'
  },
  COS: {
    category: 'Trigonometry',
    icon: '∿',
    friendly: 'Calculate cosine of angle {0}',
    technical: 'Cosine - Computes cos({0}) in radians, stores in {1}',
    operator: 'Cosine: {1} = cos({0})'
  },
  TAN: {
    category: 'Trigonometry',
    icon: '∿',
    friendly: 'Calculate tangent of angle {0}',
    technical: 'Tangent - Computes tan({0}) in radians, stores in {1}',
    operator: 'Tangent: {1} = tan({0})'
  },
  ASN: {
    category: 'Trigonometry',
    icon: '∿⁻¹',
    friendly: 'Calculate arc sine (inverse sine) of {0}',
    technical: 'Arc Sine - Computes arcsin({0}), stores result in radians in {1}',
    operator: 'Arc sine: {1} = arcsin({0})'
  },
  ACS: {
    category: 'Trigonometry',
    icon: '∿⁻¹',
    friendly: 'Calculate arc cosine (inverse cosine) of {0}',
    technical: 'Arc Cosine - Computes arccos({0}), stores result in radians in {1}',
    operator: 'Arc cosine: {1} = arccos({0})'
  },
  ATN: {
    category: 'Trigonometry',
    icon: '∿⁻¹',
    friendly: 'Calculate arc tangent (inverse tangent) of {0}',
    technical: 'Arc Tangent - Computes arctan({0}), stores result in radians in {1}',
    operator: 'Arc tangent: {1} = arctan({0})'
  },

  // ===========================================================================
  // MOVE/COPY INSTRUCTIONS
  // ===========================================================================
  MOV: {
    category: 'Move',
    icon: '→',
    friendly: 'Copy value from {0} to {1}',
    technical: 'Move - Copies {0} to {1}',
    operator: 'Move: {1} = {0}'
  },
  MVM: {
    category: 'Move',
    icon: '→&',
    friendly: 'Copy value from {0} to {2} using mask {1}',
    technical: 'Masked Move - Copies {0} to {2} through mask {1}',
    operator: 'Masked move: copy {0} to {2} with mask {1}'
  },
  BTD: {
    category: 'Move',
    icon: '→bit',
    friendly: 'Copy bits from {0} to {2}',
    technical: 'Bit Field Distribute - Copies {3} bits from {0} starting at {1} to {2} at {4}',
    operator: 'Copy bit field from {0} to {2}'
  },
  BTDT: {
    category: 'Move',
    icon: '→bit+',
    friendly: 'Copy bits with target control',
    technical: 'Bit Field Distribute with Target - Controlled bit field copy operation',
    operator: 'Bit field distribute with target control'
  },
  CLR: {
    category: 'Move',
    icon: '∅',
    friendly: 'Clear {0} to zero',
    technical: 'Clear - Sets {0} to 0',
    operator: 'Clear {0} to zero'
  },
  SWPB: {
    category: 'Move',
    icon: '⇄',
    friendly: 'Swap bytes in {0}',
    technical: 'Swap Byte - Rearranges bytes in {0} according to order mode {1}',
    operator: 'Swap bytes in {0}'
  },

  // ===========================================================================
  // ARRAY/FILE INSTRUCTIONS
  // ===========================================================================
  COP: {
    category: 'Array',
    icon: '⇒',
    friendly: 'Copy {2} elements from {0} to {1}',
    technical: 'Copy File - Copies {2} elements from array {0} to {1}',
    operator: 'Copy array: {2} elements from {0} to {1}'
  },
  CPS: {
    category: 'Array',
    icon: '⇒S',
    friendly: 'Copy {2} elements from {0} to {1} (synchronous/atomic)',
    technical: 'Synchronous Copy - Atomic copy of {2} elements from {0} to {1}',
    operator: 'Synchronous copy: {2} elements from {0} to {1}'
  },
  FLL: {
    category: 'Array',
    icon: '▮',
    friendly: 'Fill {1} with {2} copies of value {0}',
    technical: 'Fill File - Fills {2} elements of {1} with value {0}',
    operator: 'Fill array {1} with value {0}'
  },
  FAL: {
    category: 'Array',
    icon: '∑',
    friendly: 'Perform arithmetic on array {1}',
    technical: 'File Arithmetic and Logic - Array operation on {1} with expression {3}',
    operator: 'Array math operation on {1}'
  },
  FSC: {
    category: 'Array',
    icon: '🔍',
    friendly: 'Search/compare in array {1}',
    technical: 'File Search and Compare - Searches array {1} using expression {3}',
    operator: 'Array search/compare in {1}'
  },
  SIZE: {
    category: 'Array',
    icon: '#',
    friendly: 'Get size of array {0}, store in {2}',
    technical: 'Size - Gets dimension {1} size of {0}, stores in {2}',
    operator: 'Get array size: {2} = size of {0}'
  },

  // ===========================================================================
  // FIFO/LIFO INSTRUCTIONS
  // ===========================================================================
  FFL: {
    category: 'FIFO/LIFO',
    icon: '→▮',
    friendly: 'Add {0} to the end of queue {1} (first in, first out)',
    technical: 'FIFO Load - Loads {0} into FIFO {1}, control {2}, length {3}',
    operator: 'Load value into FIFO queue'
  },
  FFU: {
    category: 'FIFO/LIFO',
    icon: '▮→',
    friendly: 'Remove oldest item from queue {1} into {0}',
    technical: 'FIFO Unload - Unloads oldest element from FIFO {1} to {0}',
    operator: 'Unload value from FIFO queue'
  },
  LFL: {
    category: 'FIFO/LIFO',
    icon: '→▮L',
    friendly: 'Add {0} to stack {1} (last in, first out)',
    technical: 'LIFO Load - Loads {0} onto LIFO stack {1}',
    operator: 'Push value onto LIFO stack'
  },
  LFU: {
    category: 'FIFO/LIFO',
    icon: '▮L→',
    friendly: 'Remove newest item from stack {1} into {0}',
    technical: 'LIFO Unload - Pops newest element from LIFO {1} to {0}',
    operator: 'Pop value from LIFO stack'
  },

  // ===========================================================================
  // BIT SHIFT INSTRUCTIONS
  // ===========================================================================
  BSL: {
    category: 'Bit Shift',
    icon: '←',
    friendly: 'Shift bits left in {0}, new bit from {2}',
    technical: 'Bit Shift Left - Shifts {3} bits in {0} left by 1, {2} enters at bit 0',
    operator: 'Shift bits left in array {0}'
  },
  BSR: {
    category: 'Bit Shift',
    icon: '→',
    friendly: 'Shift bits right in {0}, new bit from {2}',
    technical: 'Bit Shift Right - Shifts {3} bits in {0} right by 1, {2} enters at MSB',
    operator: 'Shift bits right in array {0}'
  },

  // ===========================================================================
  // SEQUENCER INSTRUCTIONS
  // ===========================================================================
  SQI: {
    category: 'Sequencer',
    icon: '▶?',
    friendly: 'Check if input {1} matches current sequence step',
    technical: 'Sequencer Input - Compares {1} through mask {2} to sequencer array {0}',
    operator: 'Sequencer input compare at step {3}'
  },
  SQO: {
    category: 'Sequencer',
    icon: '▶!',
    friendly: 'Output current sequence step to {1}',
    technical: 'Sequencer Output - Outputs sequencer {0} step through mask {2} to {1}',
    operator: 'Sequencer output at step {3}'
  },
  SQL: {
    category: 'Sequencer',
    icon: '▶↓',
    friendly: 'Load {1} into sequencer {0}',
    technical: 'Sequencer Load - Loads {1} into sequencer array {0} at current position',
    operator: 'Load value into sequencer'
  },

  // ===========================================================================
  // PROGRAM CONTROL INSTRUCTIONS
  // ===========================================================================
  JMP: {
    category: 'Program Control',
    icon: '⤳',
    friendly: 'Jump to label {0} (skip to another part of the program)',
    technical: 'Jump - Unconditional jump to label {0}',
    operator: 'Jump to label {0}'
  },
  LBL: {
    category: 'Program Control',
    icon: '🏷',
    friendly: 'Label {0} - a bookmark that JMP can jump to',
    technical: 'Label - Defines jump target {0}',
    operator: 'Label marker: {0}'
  },
  JSR: {
    category: 'Program Control',
    icon: '↪',
    friendly: 'call routine {0}',
    technical: 'JSR: Call subroutine {0}',
    operator: 'call {0}'
  },
  RET: {
    category: 'Program Control',
    icon: '↩',
    friendly: 'return from subroutine',
    technical: 'RET: Return to calling routine',
    operator: 'return'
  },
  SBR: {
    category: 'Program Control',
    icon: '⎔',
    friendly: 'subroutine entry point',
    technical: 'SBR: Subroutine entry with input parameters',
    operator: 'subroutine start'
  },
  TND: {
    category: 'Program Control',
    icon: '⏹',
    friendly: 'End scan of this routine temporarily (continue next scan)',
    technical: 'Temporary End - Ends current scan of routine, resumes next scan',
    operator: 'Temporary end - stop here this scan'
  },
  MCR: {
    category: 'Program Control',
    icon: '⎘',
    friendly: 'Master Control Reset - disable outputs in zone if false',
    technical: 'Master Control Reset - When false, forces outputs false within MCR zone',
    operator: 'Master control zone boundary'
  },
  UID: {
    category: 'Program Control',
    icon: '🔒',
    friendly: 'Disable user interrupts (prevent task switching)',
    technical: 'User Interrupt Disable - Prevents task preemption until UIE',
    operator: 'Disable interrupts - critical section start'
  },
  UIE: {
    category: 'Program Control',
    icon: '🔓',
    friendly: 'Enable user interrupts (allow task switching)',
    technical: 'User Interrupt Enable - Allows task preemption',
    operator: 'Enable interrupts - critical section end'
  },
  AFI: {
    category: 'Program Control',
    icon: '⊘',
    friendly: 'Always false - this rung never executes (disabled)',
    technical: 'Always False Instruction - Forces rung logic false',
    operator: 'Disabled rung (always false)'
  },
  NOP: {
    category: 'Program Control',
    icon: '○',
    friendly: 'No operation - placeholder that does nothing',
    technical: 'No Operation - Placeholder instruction, no effect',
    operator: 'No operation - placeholder'
  },
  EOT: {
    category: 'Program Control',
    icon: '⏏',
    friendly: 'End of transition (SFC step complete)',
    technical: 'End of Transition - Marks end of SFC transition logic',
    operator: 'End of SFC transition'
  },
  SFP: {
    category: 'Program Control',
    icon: '⏯',
    friendly: 'Pause or resume SFC routine {0}',
    technical: 'SFC Pause - Pauses/resumes SFC {0} at step {1}',
    operator: 'Pause/resume SFC execution'
  },
  SFR: {
    category: 'Program Control',
    icon: '⏮',
    friendly: 'Reset SFC routine {0} to step {1}',
    technical: 'SFC Reset - Resets SFC {0} to specified step {1}',
    operator: 'Reset SFC to step'
  },
  EVENT: {
    category: 'Program Control',
    icon: '⚡',
    friendly: 'Trigger event task {0}',
    technical: 'Event Trigger - Triggers execution of event task {0}',
    operator: 'Trigger event task {0}'
  },

  // ===========================================================================
  // LOOP INSTRUCTIONS
  // ===========================================================================
  FOR: {
    category: 'Loop',
    icon: '↻',
    friendly: 'Start loop from {1} to {2}',
    technical: 'For Loop - Loops with index {0} from {1} to {2} by {3}',
    operator: 'For loop: index {0} from {1} to {2}'
  },
  BRK: {
    category: 'Loop',
    icon: '⊗',
    friendly: 'Break out of current loop early',
    technical: 'Break - Exits current FOR/NEXT loop immediately',
    operator: 'Break from loop'
  },
  NXT: {
    category: 'Loop',
    icon: '↻→',
    friendly: 'Skip to next loop iteration',
    technical: 'Next - Continues to next FOR loop iteration',
    operator: 'Next loop iteration'
  },

  // ===========================================================================
  // LOGICAL/BITWISE INSTRUCTIONS
  // ===========================================================================
  AND: {
    category: 'Logical',
    icon: '∧',
    friendly: 'Bitwise AND of {0} and {1}, store in {2}',
    technical: 'Bitwise AND - Computes {0} AND {1}, stores in {2}',
    operator: 'AND operation: {2} = {0} AND {1}'
  },
  OR: {
    category: 'Logical',
    icon: '∨',
    friendly: 'Bitwise OR of {0} and {1}, store in {2}',
    technical: 'Bitwise OR - Computes {0} OR {1}, stores in {2}',
    operator: 'OR operation: {2} = {0} OR {1}'
  },
  XOR: {
    category: 'Logical',
    icon: '⊕',
    friendly: 'Bitwise XOR of {0} and {1}, store in {2}',
    technical: 'Bitwise XOR - Computes {0} XOR {1}, stores in {2}',
    operator: 'XOR operation: {2} = {0} XOR {1}'
  },
  NOT: {
    category: 'Logical',
    icon: '¬',
    friendly: 'Invert all bits of {0}, store in {1}',
    technical: 'Bitwise NOT - Computes complement of {0}, stores in {1}',
    operator: 'NOT operation: {1} = NOT {0}'
  },
  BAND: {
    category: 'Logical',
    icon: '&&',
    friendly: 'Boolean AND of inputs',
    technical: 'Boolean AND - Logical AND of boolean operands',
    operator: 'Boolean AND operation'
  },
  BOR: {
    category: 'Logical',
    icon: '||',
    friendly: 'Boolean OR of inputs',
    technical: 'Boolean OR - Logical OR of boolean operands',
    operator: 'Boolean OR operation'
  },
  BXOR: {
    category: 'Logical',
    icon: '⊻',
    friendly: 'Boolean XOR of inputs',
    technical: 'Boolean XOR - Logical XOR of boolean operands',
    operator: 'Boolean XOR operation'
  },
  BNOT: {
    category: 'Logical',
    icon: '!',
    friendly: 'Invert boolean value',
    technical: 'Boolean NOT - Logical complement of boolean operand',
    operator: 'Boolean NOT operation'
  },

  // ===========================================================================
  // CONVERSION INSTRUCTIONS
  // ===========================================================================
  TOD: {
    category: 'Conversion',
    icon: 'BCD',
    friendly: 'Convert integer {0} to BCD format in {1}',
    technical: 'To BCD - Converts integer {0} to BCD in {1}',
    operator: 'Convert to BCD'
  },
  FRD: {
    category: 'Conversion',
    icon: 'INT',
    friendly: 'Convert BCD {0} to integer in {1}',
    technical: 'From BCD - Converts BCD {0} to integer {1}',
    operator: 'Convert from BCD'
  },
  TRN: {
    category: 'Conversion',
    icon: '⌊⌋',
    friendly: 'Truncate decimal from {0} (remove fractional part)',
    technical: 'Truncate - Removes fractional part of {0}, stores in {1}',
    operator: 'Truncate: {1} = trunc({0})'
  },
  DEG: {
    category: 'Conversion',
    icon: '°',
    friendly: 'Convert radians {0} to degrees in {1}',
    technical: 'Degrees - Converts {0} radians to degrees in {1}',
    operator: 'Convert to degrees: {1} = {0} × 180/π'
  },
  RAD: {
    category: 'Conversion',
    icon: 'rad',
    friendly: 'Convert degrees {0} to radians in {1}',
    technical: 'Radians - Converts {0} degrees to radians in {1}',
    operator: 'Convert to radians: {1} = {0} × π/180'
  },

  // ===========================================================================
  // STRING INSTRUCTIONS
  // ===========================================================================
  CONCAT: {
    category: 'String',
    icon: 'A+B',
    friendly: 'Join strings {0} and {1} together into {2}',
    technical: 'Concatenate - Joins string {0} and {1}, stores in {2}',
    operator: 'Concatenate: {2} = {0} + {1}'
  },
  MID: {
    category: 'String',
    icon: 'A…B',
    friendly: 'Extract {2} characters from string {0} starting at position {1}',
    technical: 'Middle String - Extracts {2} characters from {0} at position {1} to {3}',
    operator: 'Extract substring from {0}'
  },
  DELETE: {
    category: 'String',
    icon: 'A✕',
    friendly: 'Delete {2} characters from string {0} starting at position {1}',
    technical: 'Delete - Removes {2} characters from {0} at position {1}, stores in {3}',
    operator: 'Delete from string {0}'
  },
  INSERT: {
    category: 'String',
    icon: 'A+B',
    friendly: 'Insert {1} into string {0} at position {2}',
    technical: 'Insert - Inserts string {1} into {0} at position {2}, stores in {3}',
    operator: 'Insert into string'
  },
  FIND: {
    category: 'String',
    icon: '🔎',
    friendly: 'Find {1} in string {0}, store position in {3}',
    technical: 'Find String - Searches for {1} in {0} starting at {2}, position in {3}',
    operator: 'Find in string: position of {1} in {0}'
  },
  DTOS: {
    category: 'String',
    icon: '#→A',
    friendly: 'Convert number {0} to string {1}',
    technical: 'DINT to String - Converts integer {0} to string {1}',
    operator: 'Convert integer to string'
  },
  STOD: {
    category: 'String',
    icon: 'A→#',
    friendly: 'Convert string {0} to number {1}',
    technical: 'String to DINT - Converts string {0} to integer {1}',
    operator: 'Convert string to integer'
  },
  RTOS: {
    category: 'String',
    icon: '.#→A',
    friendly: 'Convert decimal number {0} to string {1}',
    technical: 'REAL to String - Converts float {0} to string {1}',
    operator: 'Convert float to string'
  },
  STOR: {
    category: 'String',
    icon: 'A→.#',
    friendly: 'Convert string {0} to decimal number {1}',
    technical: 'String to REAL - Converts string {0} to float {1}',
    operator: 'Convert string to float'
  },
  UPPER: {
    category: 'String',
    icon: 'ABC',
    friendly: 'Convert string {0} to UPPERCASE in {1}',
    technical: 'Upper Case - Converts {0} to uppercase, stores in {1}',
    operator: 'Convert to uppercase'
  },
  LOWER: {
    category: 'String',
    icon: 'abc',
    friendly: 'Convert string {0} to lowercase in {1}',
    technical: 'Lower Case - Converts {0} to lowercase, stores in {1}',
    operator: 'Convert to lowercase'
  },

  // ===========================================================================
  // SELECT INSTRUCTIONS
  // ===========================================================================
  SEL: {
    category: 'Select',
    icon: '?:',
    friendly: 'If {0} is true select {1}, otherwise select {2}, store in {3}',
    technical: 'Select - Selects {1} if {0} is true, else {2}; stores in {3}',
    operator: 'Conditional select: {3} = {0} ? {1} : {2}'
  },
  MUX: {
    category: 'Select',
    icon: '⊕→',
    friendly: 'Select one of multiple inputs based on selector {0}',
    technical: 'Multiplexer - Selects input {0} from array, outputs to destination',
    operator: 'Multiplex: select input based on {0}'
  },
  ESEL: {
    category: 'Select',
    icon: 'E?:',
    friendly: 'Enhanced select with multiple inputs',
    technical: 'Enhanced Select - Multi-input selection with bumpless transfer',
    operator: 'Enhanced conditional select'
  },
  HLL: {
    category: 'Select',
    icon: 'H/L',
    friendly: 'Select high or low limit',
    technical: 'High/Low Limit - Outputs high or low selected value',
    operator: 'High/Low limit select'
  },
  RLIM: {
    category: 'Select',
    icon: '↕lim',
    friendly: 'Limit rate of change of {0}',
    technical: 'Rate Limiter - Limits rate of change of input to max rate',
    operator: 'Rate limit value changes'
  },
  SNEG: {
    category: 'Select',
    icon: '±sel',
    friendly: 'Select negative based on condition',
    technical: 'Selectable Negate - Conditionally negates input value',
    operator: 'Conditional negate'
  },
  SQRT: {
    category: 'Math',
    icon: '√',
    friendly: 'Calculate square root of {0}',
    technical: 'Square Root - Computes √{0}, stores in {1}',
    operator: 'Square root: {1} = √{0}'
  },

  // ===========================================================================
  // DIAGNOSTIC INSTRUCTIONS
  // ===========================================================================
  FBC: {
    category: 'Diagnostic',
    icon: '⊜',
    friendly: 'Bit-by-bit compare of {0} and {1} for differences',
    technical: 'File Bit Compare - Compares {0} with {1} bit by bit, results in {2}',
    operator: 'Bit compare arrays {0} and {1}'
  },
  DDT: {
    category: 'Diagnostic',
    icon: '⊝',
    friendly: 'Diagnose differences between {0} and {1}',
    technical: 'Diagnostic Detect - Finds bit differences between {0} and {1}',
    operator: 'Diagnostic compare {0} vs {1}'
  },
  DTR: {
    category: 'Diagnostic',
    icon: '⊕D',
    friendly: 'Data transition detection on {0}',
    technical: 'Data Transition - Detects changes in {0} through mask {1}',
    operator: 'Detect data transitions'
  },

  // ===========================================================================
  // COMMUNICATION INSTRUCTIONS
  // ===========================================================================
  MSG: {
    category: 'Communication',
    icon: '✉',
    friendly: 'Send/receive message {0} to another device',
    technical: 'Message - Sends or receives data per configuration in {0}',
    operator: 'Communication message {0}'
  },
  GSV: {
    category: 'Communication',
    icon: '↓○',
    friendly: 'Get system value {1} from {0} into {2}',
    technical: 'Get System Value - Reads attribute {1} from class {0} into {2}',
    operator: 'Get system value: {2} = {0}.{1}'
  },
  SSV: {
    category: 'Communication',
    icon: '↑○',
    friendly: 'Set system value {1} of {0} to {2}',
    technical: 'Set System Value - Writes {2} to attribute {1} of class {0}',
    operator: 'Set system value: {0}.{1} = {2}'
  },

  // ===========================================================================
  // I/O INSTRUCTIONS
  // ===========================================================================
  IOT: {
    category: 'I/O',
    icon: '⇄IO',
    friendly: 'Immediately update I/O for {0}',
    technical: 'Immediate Output - Forces immediate I/O update for module {0}',
    operator: 'Immediate I/O transfer'
  },

  // ===========================================================================
  // ALARM INSTRUCTIONS
  // ===========================================================================
  ALMD: {
    category: 'Alarm',
    icon: '⚠D',
    friendly: 'Digital alarm {0} - triggers when condition is true',
    technical: 'Digital Alarm - Monitors digital condition, triggers alarm in {0}',
    operator: 'Digital alarm monitoring'
  },
  ALMA: {
    category: 'Alarm',
    icon: '⚠A',
    friendly: 'Analog alarm {0} - monitors value against high/low limits',
    technical: 'Analog Alarm - Monitors analog value in {0} against configured limits',
    operator: 'Analog alarm monitoring'
  },

  // ===========================================================================
  // PID/PROCESS CONTROL INSTRUCTIONS
  // ===========================================================================
  PID: {
    category: 'Process Control',
    icon: '⟳',
    friendly: 'PID control loop {0} - automatically adjusts output to maintain setpoint',
    technical: 'PID - Proportional-Integral-Derivative control using {0}',
    operator: 'PID loop control using {0}'
  },
  PIDE: {
    category: 'Process Control',
    icon: '⟳E',
    friendly: 'Enhanced PID control with advanced features',
    technical: 'Enhanced PID - Advanced PID with cascade, ratio, feedforward capabilities',
    operator: 'Enhanced PID control'
  },
  RMPS: {
    category: 'Process Control',
    icon: '⟋',
    friendly: 'Ramp/soak profile control',
    technical: 'Ramp/Soak - Executes temperature ramp/soak profile',
    operator: 'Ramp/soak profile'
  },
  POSP: {
    category: 'Process Control',
    icon: '⇌',
    friendly: 'Position proportional control',
    technical: 'Position Proportional - Controls position with raise/lower outputs',
    operator: 'Position proportional control'
  },
  SRTP: {
    category: 'Process Control',
    icon: '↗↘',
    friendly: 'Split range time proportional control',
    technical: 'Split Range Time Proportional - Controls heating/cooling outputs',
    operator: 'Split range control'
  },
  LDLG: {
    category: 'Process Control',
    icon: 'τ',
    friendly: 'Lead-lag compensator',
    technical: 'Lead-Lag - Applies lead-lag compensation to input signal',
    operator: 'Lead-lag compensation'
  },
  FGEN: {
    category: 'Process Control',
    icon: 'f()',
    friendly: 'Function generator - custom transfer function',
    technical: 'Function Generator - Applies piecewise linear function to input',
    operator: 'Function generator'
  },
  TOT: {
    category: 'Process Control',
    icon: '∫',
    friendly: 'Totalizer - accumulate flow/quantity over time',
    technical: 'Totalizer - Integrates input value over time',
    operator: 'Totalizer accumulation'
  },
  DEDT: {
    category: 'Process Control',
    icon: 'd/dt',
    friendly: 'Derivative - calculate rate of change',
    technical: 'Derivative - Computes rate of change of input',
    operator: 'Rate of change calculation'
  },
  HPF: {
    category: 'Process Control',
    icon: 'HPF',
    friendly: 'High-pass filter on input signal',
    technical: 'High Pass Filter - Filters low frequency components',
    operator: 'High-pass filter'
  },
  LPF: {
    category: 'Process Control',
    icon: 'LPF',
    friendly: 'Low-pass filter on input signal (smooth out noise)',
    technical: 'Low Pass Filter - Filters high frequency noise',
    operator: 'Low-pass filter'
  },
  NTCH: {
    category: 'Process Control',
    icon: '⌒',
    friendly: 'Notch filter - remove specific frequency',
    technical: 'Notch Filter - Removes specific frequency band',
    operator: 'Notch filter'
  },
  INTG: {
    category: 'Process Control',
    icon: '∫',
    friendly: 'Integrator - accumulate input over time',
    technical: 'Integrator - Integrates input value',
    operator: 'Integration'
  },
  DERV: {
    category: 'Process Control',
    icon: 'd/dt',
    friendly: 'Derivative - rate of change',
    technical: 'Derivative - Computes time derivative of input',
    operator: 'Derivative calculation'
  },
  SCL: {
    category: 'Process Control',
    icon: '×+',
    friendly: 'Scale {0} from one range to another',
    technical: 'Scale - Linear scaling of {0} with rate and offset',
    operator: 'Scale value'
  },
  SCLE: {
    category: 'Process Control',
    icon: '×+E',
    friendly: 'Enhanced scale with input/output ranges',
    technical: 'Scale Enhanced - Scales from input range to output range',
    operator: 'Enhanced scaling'
  },
  PI: {
    category: 'Process Control',
    icon: 'PI',
    friendly: 'Proportional-Integral control',
    technical: 'PI - Proportional-Integral control algorithm',
    operator: 'PI control'
  },
  PMUL: {
    category: 'Process Control',
    icon: '×P',
    friendly: 'Pulse multiplier',
    technical: 'Pulse Multiplier - Converts pulse input to scaled output',
    operator: 'Pulse multiplication'
  },
  SCRV: {
    category: 'Process Control',
    icon: 'S',
    friendly: 'S-curve acceleration/deceleration',
    technical: 'S-Curve - Generates S-curve motion profile',
    operator: 'S-curve profile'
  },
  UPDN: {
    category: 'Process Control',
    icon: '↑↓',
    friendly: 'Up/down accumulator',
    technical: 'Up/Down Accumulator - Bidirectional totalizer',
    operator: 'Up/down counter'
  },
  HHS: {
    category: 'Process Control',
    icon: 'H/H',
    friendly: 'High-high select (maximum of inputs)',
    technical: 'High/High Select - Selects maximum of multiple inputs',
    operator: 'Select highest value'
  },
  LLS: {
    category: 'Process Control',
    icon: 'L/L',
    friendly: 'Low-low select (minimum of inputs)',
    technical: 'Low/Low Select - Selects minimum of multiple inputs',
    operator: 'Select lowest value'
  },
  MAVE: {
    category: 'Process Control',
    icon: 'x̄',
    friendly: 'Moving average filter',
    technical: 'Moving Average - Computes rolling average of input',
    operator: 'Moving average'
  },
  MAXC: {
    category: 'Process Control',
    icon: 'MAX',
    friendly: 'Maximum capture - track highest value',
    technical: 'Maximum Capture - Tracks and holds maximum input value',
    operator: 'Maximum value capture'
  },
  MINC: {
    category: 'Process Control',
    icon: 'MIN',
    friendly: 'Minimum capture - track lowest value',
    technical: 'Minimum Capture - Tracks and holds minimum input value',
    operator: 'Minimum value capture'
  },

  // ===========================================================================
  // MOTION INSTRUCTIONS - Single Axis
  // ===========================================================================
  MSO: {
    category: 'Motion',
    icon: '▶',
    friendly: 'Turn ON servo for axis {0}',
    technical: 'Motion Servo On - Enables servo loop for axis {0}',
    operator: 'Enable servo axis {0}'
  },
  MSF: {
    category: 'Motion',
    icon: '⏹',
    friendly: 'Turn OFF servo for axis {0}',
    technical: 'Motion Servo Off - Disables servo loop for axis {0}',
    operator: 'Disable servo axis {0}'
  },
  MASD: {
    category: 'Motion',
    icon: '🔒',
    friendly: 'Shutdown axis {0} (emergency stop)',
    technical: 'Motion Axis Shutdown - Emergency shutdown of axis {0}',
    operator: 'Shutdown axis {0}'
  },
  MASR: {
    category: 'Motion',
    icon: '🔓',
    friendly: 'Reset axis {0} from shutdown',
    technical: 'Motion Axis Shutdown Reset - Clears shutdown state of axis {0}',
    operator: 'Reset axis {0} from shutdown'
  },
  MAFR: {
    category: 'Motion',
    icon: '⟲',
    friendly: 'Clear faults on axis {0}',
    technical: 'Motion Axis Fault Reset - Clears faults on axis {0}',
    operator: 'Reset faults on axis {0}'
  },
  MAJ: {
    category: 'Motion',
    icon: '⇢',
    friendly: 'Jog axis {0} at specified speed',
    technical: 'Motion Axis Jog - Jogs axis {0} at velocity in direction specified',
    operator: 'Jog axis {0}'
  },
  MAM: {
    category: 'Motion',
    icon: '→•',
    friendly: 'Move axis {0} to position {1}',
    technical: 'Motion Axis Move - Moves axis {0} to absolute/relative position',
    operator: 'Move axis {0} to position'
  },
  MAS: {
    category: 'Motion',
    icon: '⏸',
    friendly: 'Stop axis {0}',
    technical: 'Motion Axis Stop - Decelerates and stops axis {0}',
    operator: 'Stop axis {0}'
  },
  MAH: {
    category: 'Motion',
    icon: '🏠',
    friendly: 'Home axis {0} (find reference position)',
    technical: 'Motion Axis Home - Executes homing sequence for axis {0}',
    operator: 'Home axis {0}'
  },
  MAG: {
    category: 'Motion',
    icon: '⚙',
    friendly: 'Gear axis {0} to master',
    technical: 'Motion Axis Gear - Electronically gears {0} to master axis',
    operator: 'Gear axis {0} to master'
  },
  MCD: {
    category: 'Motion',
    icon: '⊟',
    friendly: 'Change dynamics (accel/decel) for axis {0}',
    technical: 'Motion Change Dynamics - Modifies motion profile of axis {0}',
    operator: 'Change motion dynamics'
  },
  MRP: {
    category: 'Motion',
    icon: '→0',
    friendly: 'Redefine position of axis {0}',
    technical: 'Motion Redefine Position - Sets new position reference for {0}',
    operator: 'Redefine axis position'
  },
  MAPC: {
    category: 'Motion',
    icon: '⟷',
    friendly: 'Configure position cam for axis {0}',
    technical: 'Motion Axis Position Cam - Configures cam profile for axis {0}',
    operator: 'Position cam axis {0}'
  },
  MATC: {
    category: 'Motion',
    icon: '⟷t',
    friendly: 'Configure time cam for axis {0}',
    technical: 'Motion Axis Time Cam - Configures time-based cam for axis {0}',
    operator: 'Time cam axis {0}'
  },
  MDAC: {
    category: 'Motion',
    icon: '⊖cam',
    friendly: 'Disarm position cam',
    technical: 'Motion Disarm Position Cam - Disarms cam on axis',
    operator: 'Disarm position cam'
  },
  MDCC: {
    category: 'Motion',
    icon: '↻cam',
    friendly: 'Calculate cam profile',
    technical: 'Motion Calculate Cam Profile - Computes cam profile',
    operator: 'Calculate cam profile'
  },
  MAOC: {
    category: 'Motion',
    icon: 'out',
    friendly: 'Configure output cam',
    technical: 'Motion Arm Output Cam - Arms output cam event',
    operator: 'Arm output cam'
  },
  MDOC: {
    category: 'Motion',
    icon: '⊖out',
    friendly: 'Disarm output cam',
    technical: 'Motion Disarm Output Cam - Disarms output cam event',
    operator: 'Disarm output cam'
  },
  MAW: {
    category: 'Motion',
    icon: '⌚',
    friendly: 'Arm watch on axis {0}',
    technical: 'Motion Arm Watch - Arms position/time watch event',
    operator: 'Arm axis watch'
  },
  MDW: {
    category: 'Motion',
    icon: '⌚⊖',
    friendly: 'Disarm watch on axis {0}',
    technical: 'Motion Disarm Watch - Disarms watch event',
    operator: 'Disarm axis watch'
  },
  MRAT: {
    category: 'Motion',
    icon: '↻reg',
    friendly: 'Arm registration for axis {0}',
    technical: 'Motion Arm Registration - Arms registration event capture',
    operator: 'Arm registration input'
  },
  MDRT: {
    category: 'Motion',
    icon: '⊖reg',
    friendly: 'Disarm registration for axis {0}',
    technical: 'Motion Disarm Registration - Disarms registration event',
    operator: 'Disarm registration input'
  },
  MAHD: {
    category: 'Motion',
    icon: '⚡',
    friendly: 'Apply hookup diagnostics',
    technical: 'Motion Apply Hookup Diagnostics - Runs axis hookup test',
    operator: 'Axis hookup diagnostics'
  },
  MRHD: {
    category: 'Motion',
    icon: '📋',
    friendly: 'Get hookup diagnostic results',
    technical: 'Motion Run Hookup Diagnostics - Returns diagnostic data',
    operator: 'Get hookup results'
  },

  // ===========================================================================
  // MOTION INSTRUCTIONS - Multi-Axis/Group
  // ===========================================================================
  MGS: {
    category: 'Motion Group',
    icon: '⏹⏹',
    friendly: 'Stop all axes in group {0}',
    technical: 'Motion Group Stop - Stops all axes in motion group {0}',
    operator: 'Stop motion group {0}'
  },
  MGSD: {
    category: 'Motion Group',
    icon: '🔒🔒',
    friendly: 'Shutdown all axes in group {0}',
    technical: 'Motion Group Shutdown - Emergency shutdown of group {0}',
    operator: 'Shutdown motion group'
  },
  MGSR: {
    category: 'Motion Group',
    icon: '🔓🔓',
    friendly: 'Reset group {0} from shutdown',
    technical: 'Motion Group Shutdown Reset - Clears shutdown of group {0}',
    operator: 'Reset motion group'
  },
  MGSP: {
    category: 'Motion Group',
    icon: '⏸⏸',
    friendly: 'Strobe position of all axes in group {0}',
    technical: 'Motion Group Strobe Position - Captures positions of group {0}',
    operator: 'Strobe group positions'
  },
  MCCP: {
    category: 'Motion Coordinated',
    icon: '⊕',
    friendly: 'Calculate coordinated path',
    technical: 'Motion Coordinated Change Path - Computes coordinated motion path',
    operator: 'Calculate coordinated path'
  },
  MCCM: {
    category: 'Motion Coordinated',
    icon: '⌓',
    friendly: 'Coordinated circular move',
    technical: 'Motion Coordinated Circular Move - Executes circular interpolation',
    operator: 'Coordinated circular move'
  },
  MCLM: {
    category: 'Motion Coordinated',
    icon: '⌐',
    friendly: 'Coordinated linear move',
    technical: 'Motion Coordinated Linear Move - Executes linear interpolation',
    operator: 'Coordinated linear move'
  },
  MCPM: {
    category: 'Motion Coordinated',
    icon: '∿',
    friendly: 'Coordinated path move',
    technical: 'Motion Coordinated Path Move - Executes path-defined motion',
    operator: 'Coordinated path move'
  },
  MCS: {
    category: 'Motion Coordinated',
    icon: '⏹C',
    friendly: 'Stop coordinated motion',
    technical: 'Motion Coordinated Stop - Stops coordinated motion',
    operator: 'Stop coordinated motion'
  },
  MCSD: {
    category: 'Motion Coordinated',
    icon: '🔒C',
    friendly: 'Shutdown coordinated motion',
    technical: 'Motion Coordinated Shutdown - Emergency stop coordinated system',
    operator: 'Shutdown coordinated motion'
  },
  MCSR: {
    category: 'Motion Coordinated',
    icon: '🔓C',
    friendly: 'Reset coordinated shutdown',
    technical: 'Motion Coordinated Shutdown Reset - Clears coordinated shutdown',
    operator: 'Reset coordinated shutdown'
  },
  MCT: {
    category: 'Motion Coordinated',
    icon: '⊿',
    friendly: 'Coordinate transform',
    technical: 'Motion Coordinated Transform - Applies coordinate transformation',
    operator: 'Coordinate transform'
  },
  MCTP: {
    category: 'Motion Coordinated',
    icon: '⊿→',
    friendly: 'Transform position',
    technical: 'Motion Calculate Transform Position - Converts position coordinates',
    operator: 'Transform position'
  },

  // ===========================================================================
  // ASCII/SERIAL INSTRUCTIONS
  // ===========================================================================
  ABL: {
    category: 'ASCII',
    icon: 'A#',
    friendly: 'Get number of characters in ASCII buffer {0}',
    technical: 'ASCII Buffer Length - Returns character count in buffer {0}',
    operator: 'Get ASCII buffer length'
  },
  ACB: {
    category: 'ASCII',
    icon: 'Ac',
    friendly: 'Get number of characters in buffer',
    technical: 'ASCII Characters in Buffer - Returns count of received characters',
    operator: 'ASCII characters in buffer'
  },
  ACL: {
    category: 'ASCII',
    icon: 'Ax',
    friendly: 'Clear ASCII buffer',
    technical: 'ASCII Clear Buffer - Clears serial port buffer',
    operator: 'Clear ASCII buffer'
  },
  AHL: {
    category: 'ASCII',
    icon: 'A⇌',
    friendly: 'ASCII handshake control',
    technical: 'ASCII Handshake Lines - Controls DTR/RTS handshake lines',
    operator: 'Control handshake lines'
  },
  ARD: {
    category: 'ASCII',
    icon: 'A←',
    friendly: 'Read ASCII characters from serial port',
    technical: 'ASCII Read - Reads characters from serial buffer to {0}',
    operator: 'Read ASCII data'
  },
  ARL: {
    category: 'ASCII',
    icon: 'A←L',
    friendly: 'Read ASCII line (until terminator)',
    technical: 'ASCII Read Line - Reads until line terminator',
    operator: 'Read ASCII line'
  },
  AWA: {
    category: 'ASCII',
    icon: 'A→+',
    friendly: 'Write ASCII with append',
    technical: 'ASCII Write Append - Writes with appended characters',
    operator: 'Write ASCII with append'
  },
  AWT: {
    category: 'ASCII',
    icon: 'A→',
    friendly: 'Write ASCII characters to serial port',
    technical: 'ASCII Write - Writes characters from {0} to serial port',
    operator: 'Write ASCII data'
  },

  // ===========================================================================
  // SPECIAL INSTRUCTIONS
  // ===========================================================================
  PFL: {
    category: 'Special',
    icon: '⚠P',
    friendly: 'Create program fault',
    technical: 'Programmable Fault - Creates user-defined major/minor fault',
    operator: 'Generate program fault'
  },

  // ===========================================================================
  // EQUIPMENT PHASE INSTRUCTIONS
  // ===========================================================================
  PSC: {
    category: 'Equipment Phase',
    icon: '⏱',
    friendly: 'Phase state complete - signal phase is done',
    technical: 'Phase State Complete - Signals completion of current phase state',
    operator: 'Signal phase state complete'
  },
  PCMD: {
    category: 'Equipment Phase',
    icon: '▶ph',
    friendly: 'Send command to phase',
    technical: 'Phase Command - Sends command to equipment phase',
    operator: 'Send phase command'
  },
  PCLF: {
    category: 'Equipment Phase',
    icon: '⚠ph',
    friendly: 'Clear phase failure',
    technical: 'Phase Clear Failure - Clears failure condition on phase',
    operator: 'Clear phase failure'
  },
  PATT: {
    category: 'Equipment Phase',
    icon: '⊕ph',
    friendly: 'Attach to equipment phase',
    technical: 'Phase Attach - Attaches to an equipment phase',
    operator: 'Attach to phase'
  },
  PDET: {
    category: 'Equipment Phase',
    icon: '⊖ph',
    friendly: 'Detach from equipment phase',
    technical: 'Phase Detach - Detaches from an equipment phase',
    operator: 'Detach from phase'
  },
  POVR: {
    category: 'Equipment Phase',
    icon: '↑ph',
    friendly: 'Override phase state',
    technical: 'Phase Override - Overrides phase to specified state',
    operator: 'Override phase state'
  },
  PRNP: {
    category: 'Equipment Phase',
    icon: '→ph',
    friendly: 'Reset to next phase',
    technical: 'Phase Reset to Next Phase - Advances phase sequence',
    operator: 'Reset to next phase'
  },
  PPD: {
    category: 'Equipment Phase',
    icon: '⊿ph',
    friendly: 'Get phase data',
    technical: 'Phase Parameter Data - Reads phase parameter values',
    operator: 'Get phase parameters'
  },
  PXRQ: {
    category: 'Equipment Phase',
    icon: '?ph',
    friendly: 'External request to phase',
    technical: 'Phase External Request - Sends external request to phase',
    operator: 'External phase request'
  },

  // ===========================================================================
  // EQUIPMENT SEQUENCE INSTRUCTIONS
  // ===========================================================================
  SASI: {
    category: 'Equipment Sequence',
    icon: '⊕seq',
    friendly: 'Attach to sequence',
    technical: 'Sequence Attach - Attaches to equipment sequence',
    operator: 'Attach to sequence'
  },
  SCMD: {
    category: 'Equipment Sequence',
    icon: '▶seq',
    friendly: 'Send command to sequence',
    technical: 'Sequence Command - Sends command to equipment sequence',
    operator: 'Send sequence command'
  },
  SOVR: {
    category: 'Equipment Sequence',
    icon: '↑seq',
    friendly: 'Override sequence',
    technical: 'Sequence Override - Overrides sequence state',
    operator: 'Override sequence'
  },
  SDET: {
    category: 'Equipment Sequence',
    icon: '⊖seq',
    friendly: 'Detach from sequence',
    technical: 'Sequence Detach - Detaches from equipment sequence',
    operator: 'Detach from sequence'
  },
  SCLF: {
    category: 'Equipment Sequence',
    icon: '⚠seq',
    friendly: 'Clear sequence failure',
    technical: 'Sequence Clear Failure - Clears failure on sequence',
    operator: 'Clear sequence failure'
  },

  // ===========================================================================
  // AOI INSTRUCTIONS (Add-On Instructions - common ones)
  // ===========================================================================
  AOI: {
    category: 'AOI',
    icon: '⎔',
    friendly: 'Execute Add-On Instruction {0}',
    technical: 'Add-On Instruction - Executes user-defined instruction {0}',
    operator: 'Run AOI {0}'
  },

  // ===========================================================================
  // SAFETY INSTRUCTIONS
  // ===========================================================================
  SAFETYTASK: {
    category: 'Safety',
    icon: '🛡',
    friendly: 'Safety task instruction',
    technical: 'Safety Task - Safety-rated task processing',
    operator: 'Safety task'
  },
};

// ============================================================================
// DEVICE PATTERNS - for context-aware explanations
// ============================================================================

export const DEVICE_PATTERNS: DevicePattern[] = [
  // Motors & Drives
  { pattern: /motor|mtr|_m\d|vfd|drive|inverter/i, deviceType: 'motor', friendlyName: 'motor',
    troubleshooting: ['Check motor overload status', 'Verify VFD fault codes', 'Check for mechanical binding', 'Verify power supply'] },

  // Conveyors
  { pattern: /conv|cnv|belt|transfer/i, deviceType: 'conveyor', friendlyName: 'conveyor',
    troubleshooting: ['Check belt tension and tracking', 'Verify product jam sensors', 'Check motor/gearbox', 'Inspect belt for damage'] },

  // Cylinders/Actuators
  { pattern: /cyl|cylinder|actuator|act_|pneumatic/i, deviceType: 'cylinder', friendlyName: 'cylinder',
    troubleshooting: ['Check air pressure (typically 80-100 PSI)', 'Verify position sensors', 'Check for mechanical obstruction', 'Inspect seals for leaks'] },

  // Valves
  { pattern: /valve|vlv|sol|solenoid/i, deviceType: 'valve', friendlyName: 'valve',
    troubleshooting: ['Check air/fluid supply pressure', 'Verify solenoid coil is energized', 'Check valve position feedback', 'Inspect for leaks'] },

  // Sensors - Proximity
  { pattern: /prox|proximity|px_|_px|inductive/i, deviceType: 'proximity', friendlyName: 'proximity sensor',
    troubleshooting: ['Use metal target to manually trigger', 'Check sensing distance (typically 2-8mm)', 'Verify target material compatibility', 'Check for interference'] },

  // Sensors - Photo eye
  { pattern: /photo|pe_|_pe|beam|optical/i, deviceType: 'photoeye', friendlyName: 'photo eye',
    troubleshooting: ['Wave hand through beam to test', 'Check alignment with reflector', 'Clean lens surface', 'Verify reflector condition'] },

  // Sensors - Limit switch
  { pattern: /limit|ls_|_ls|switch/i, deviceType: 'limit_switch', friendlyName: 'limit switch',
    troubleshooting: ['Manually actuate lever/roller', 'Check mechanical alignment', 'Verify actuator travel distance', 'Check wiring connections'] },

  // Sensors - Encoder
  { pattern: /encoder|enc_|_enc|pulse/i, deviceType: 'encoder', friendlyName: 'encoder',
    troubleshooting: ['Check encoder coupling', 'Verify pulse count', 'Check for noise on signal wires', 'Inspect encoder disc/wheel'] },

  // Position indicators
  { pattern: /home|hm_|_hm|origin/i, deviceType: 'home_position', friendlyName: 'home position sensor',
    troubleshooting: ['Verify sensor detects home flag', 'Check flag alignment', 'Ensure mechanism reaches home'] },
  { pattern: /extend|ext_|_ext|forward|fwd/i, deviceType: 'extend_position', friendlyName: 'extended position sensor',
    troubleshooting: ['Check full extension travel', 'Verify sensor mounting position'] },
  { pattern: /retract|ret_|_ret|reverse|rev/i, deviceType: 'retract_position', friendlyName: 'retracted position sensor',
    troubleshooting: ['Check full retraction travel', 'Verify sensor mounting position'] },
  { pattern: /up_|_up|raised|lift/i, deviceType: 'up_position', friendlyName: 'up position sensor' },
  { pattern: /down_|_dn|lowered|lower/i, deviceType: 'down_position', friendlyName: 'down position sensor' },

  // Safety devices
  { pattern: /estop|e_stop|e-stop|emergency|emg/i, deviceType: 'estop', friendlyName: 'emergency stop',
    troubleshooting: ['Check all E-stop buttons are released', 'Verify reset procedure followed', 'Check safety relay status', 'Inspect button mechanism'] },
  { pattern: /guard|gate|door|interlock/i, deviceType: 'guard', friendlyName: 'safety guard/gate',
    troubleshooting: ['Verify guard is fully closed', 'Check interlock switch alignment', 'Test magnetic safety switch', 'Check hinges and latches'] },
  { pattern: /light.?curtain|lc_|_lc|safety.?beam/i, deviceType: 'light_curtain', friendlyName: 'light curtain',
    troubleshooting: ['Check for beam obstruction', 'Verify transmitter/receiver alignment', 'Check muting sensor status', 'Clean lenses'] },
  { pattern: /safety.?mat|pressure.?mat/i, deviceType: 'safety_mat', friendlyName: 'safety mat',
    troubleshooting: ['Check mat surface for damage', 'Verify mat is properly seated', 'Check controller status'] },
  { pattern: /scanner|laser.?scanner|area.?scanner/i, deviceType: 'safety_scanner', friendlyName: 'safety scanner',
    troubleshooting: ['Check for objects in protective field', 'Verify scanner is level', 'Clean scanner window'] },

  // Grippers/Clamps
  { pattern: /grip|gripper|clamp|jaw/i, deviceType: 'gripper', friendlyName: 'gripper',
    troubleshooting: ['Check air pressure', 'Verify grip/open sensors', 'Check for part presence', 'Inspect gripper pads'] },

  // Robots
  { pattern: /robot|rbt_|_rbt|arm/i, deviceType: 'robot', friendlyName: 'robot',
    troubleshooting: ['Check robot controller status', 'Verify program selected', 'Check for faults on teach pendant', 'Verify robot is in AUTO mode'] },

  // Pumps
  { pattern: /pump|pmp/i, deviceType: 'pump', friendlyName: 'pump',
    troubleshooting: ['Check fluid level', 'Verify pump is primed', 'Check for cavitation noise', 'Inspect seals'] },

  // Heaters/Temperature
  { pattern: /heat|htr|temp|thermo/i, deviceType: 'heater', friendlyName: 'heater',
    troubleshooting: ['Check temperature setpoint', 'Verify thermocouple reading', 'Check for overtemperature fault', 'Inspect heating element'] },

  // Fans/Blowers
  { pattern: /fan|blower|exhaust/i, deviceType: 'fan', friendlyName: 'fan/blower',
    troubleshooting: ['Check for obstructions', 'Verify motor operation', 'Check belt/coupling', 'Clean filters'] },

  // HMI/Operator
  { pattern: /hmi|operator|panel/i, deviceType: 'hmi', friendlyName: 'operator interface' },
  { pattern: /start.?pb|start.?button|start.?sw/i, deviceType: 'start_button', friendlyName: 'start button' },
  { pattern: /stop.?pb|stop.?button|stop.?sw/i, deviceType: 'stop_button', friendlyName: 'stop button' },
  { pattern: /jog/i, deviceType: 'jog_button', friendlyName: 'jog button' },
  { pattern: /selector|sel.?sw|mode/i, deviceType: 'selector', friendlyName: 'selector switch' },

  // Faults/Alarms
  { pattern: /fault|flt_|_flt|alarm|alm_|error/i, deviceType: 'fault', friendlyName: 'fault/alarm' },
  { pattern: /timeout|tmo|_to\d|watchdog/i, deviceType: 'timeout', friendlyName: 'timeout' },
  { pattern: /overload|ol_|_ol|overcurrent/i, deviceType: 'overload', friendlyName: 'overload' },

  // Sequence/Step/State
  { pattern: /step|seq|sequence|state|phase/i, deviceType: 'sequence', friendlyName: 'sequence step' },

  // Counters/Production
  { pattern: /count|cnt_|_cnt|pcs|pieces|qty/i, deviceType: 'counter', friendlyName: 'counter' },
  { pattern: /batch|lot|recipe/i, deviceType: 'batch', friendlyName: 'batch/recipe' },
  { pattern: /reject|bad|scrap/i, deviceType: 'reject', friendlyName: 'reject counter' },

  // Servos/Axes
  { pattern: /servo|axis|position/i, deviceType: 'servo', friendlyName: 'servo axis',
    troubleshooting: ['Check servo drive fault codes', 'Verify feedback device', 'Check for mechanical binding', 'Verify tuning parameters'] },

  // Analog I/O
  { pattern: /analog|ai_|ao_|4-20|0-10/i, deviceType: 'analog', friendlyName: 'analog signal' },
  { pattern: /level|lvl_|tank/i, deviceType: 'level', friendlyName: 'level sensor' },
  { pattern: /pressure|psi|press/i, deviceType: 'pressure', friendlyName: 'pressure sensor' },
  { pattern: /flow|gpm|meter/i, deviceType: 'flow', friendlyName: 'flow meter' },

  // Vision/Camera
  { pattern: /vision|camera|cam_|inspect/i, deviceType: 'vision', friendlyName: 'vision system',
    troubleshooting: ['Check camera trigger', 'Verify lighting conditions', 'Check for lens obstruction', 'Verify inspection program'] },

  // Barcode/RFID
  { pattern: /barcode|scanner|rfid|reader/i, deviceType: 'scanner', friendlyName: 'barcode/RFID scanner' },

  // Welder
  { pattern: /weld|welder/i, deviceType: 'welder', friendlyName: 'welder' },

  // Dispense/Glue
  { pattern: /dispense|glue|adhesive|bead/i, deviceType: 'dispenser', friendlyName: 'dispenser' },
];

// ============================================================================
// EXPLANATION FUNCTIONS
// ============================================================================

/**
 * Get the explanation for an instruction
 */
export function getInstructionExplanation(
  instruction: string,
  operands: string[],
  mode: ExplanationMode
): string | null {
  const inst = INSTRUCTIONS[instruction.toUpperCase()]
  if (!inst) return null

  let explanation = inst[mode]

  // Replace placeholders with operands
  operands.forEach((op, i) => {
    explanation = explanation.replace(new RegExp(`\\{${i}\\}`, 'g'), op)
  })

  // Remove any unreplaced placeholders
  explanation = explanation.replace(/\{[0-9]\}/g, '?')

  return explanation
}

/**
 * Detect device type from tag name
 */
export function detectDeviceType(tagName: string): DevicePattern | null {
  for (const pattern of DEVICE_PATTERNS) {
    if (pattern.pattern.test(tagName)) {
      return pattern
    }
  }
  return null
}

/**
 * Get context-aware explanation with device recognition
 */
export function getContextualExplanation(
  instruction: string,
  operands: string[],
  mode: ExplanationMode
): { explanation: string; device?: DevicePattern; troubleshooting?: string[] } | null {
  const baseExplanation = getInstructionExplanation(instruction, operands, mode)
  if (!baseExplanation) return null

  // Try to detect device from first operand (usually the tag)
  const device = operands[0] ? detectDeviceType(operands[0]) : null

  return {
    explanation: baseExplanation,
    device: device || undefined,
    troubleshooting: device?.troubleshooting
  }
}

/**
 * Parse a rung and explain all instructions
 */
export function explainRungInstructions(
  rungText: string,
  mode: ExplanationMode
): Array<{
  instruction: string
  operands: string[]
  explanation: string
  device?: DevicePattern
  troubleshooting?: string[]
}> {
  const results: Array<{
    instruction: string
    operands: string[]
    explanation: string
    device?: DevicePattern
    troubleshooting?: string[]
  }> = []

  // Parse instructions from rung text
  const regex = /([A-Z_][A-Z0-9_]*)\(([^)]*)\)/gi
  let match

  while ((match = regex.exec(rungText)) !== null) {
    const instruction = match[1].toUpperCase()
    const operandsStr = match[2]
    const operands = parseOperands(operandsStr)

    const result = getContextualExplanation(instruction, operands, mode)
    if (result) {
      results.push({
        instruction,
        operands,
        ...result
      })
    } else {
      // Unknown instruction - return raw info
      results.push({
        instruction,
        operands,
        explanation: `${instruction}(${operands.join(', ')}) - Unknown instruction`
      })
    }
  }

  return results
}

/**
 * Parse operands handling nested brackets
 */
function parseOperands(operandsStr: string): string[] {
  const operands: string[] = []
  let current = ''
  let depth = 0

  for (const char of operandsStr) {
    if (char === '(' || char === '[') {
      depth++
      current += char
    } else if (char === ')' || char === ']') {
      depth--
      current += char
    } else if (char === ',' && depth === 0) {
      if (current.trim()) {
        operands.push(current.trim())
      }
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) {
    operands.push(current.trim())
  }

  return operands
}

/**
 * Detect branch structure from rung text
 * Rockwell uses brackets [] and commas , to denote parallel branches
 */
function detectBranches(rungText: string): string[][] {
  const branches: string[][] = []

  // Try to parse branch structure from brackets and commas
  // Format examples:
  // [XIC(a) ,XIC(b)] OTE(c) - two parallel inputs to one output
  // XIC(a) [OTE(b) ,OTE(c)] - one input to two parallel outputs
  // [XIC(a) OTE(b) ,XIC(c) OTE(d)] - two complete parallel branches

  // Simplified approach: split by top-level commas that indicate branches
  let depth = 0
  let currentBranch = ''
  const topLevelParts: string[] = []

  for (let i = 0; i < rungText.length; i++) {
    const char = rungText[i]
    if (char === '[') {
      depth++
      currentBranch += char
    } else if (char === ']') {
      depth--
      currentBranch += char
    } else if (char === ',' && depth === 1) {
      // Top-level comma inside brackets = branch separator
      topLevelParts.push(currentBranch.trim())
      currentBranch = ''
    } else {
      currentBranch += char
    }
  }
  if (currentBranch.trim()) {
    topLevelParts.push(currentBranch.trim())
  }

  // If we found multiple parts, we have branches
  if (topLevelParts.length > 1) {
    return topLevelParts.map(part => {
      const regex = /([A-Z_][A-Z0-9_]*)\(([^)]*)\)/gi
      const instrs: string[] = []
      let match
      while ((match = regex.exec(part)) !== null) {
        instrs.push(`${match[1].toUpperCase()}(${match[2]})`)
      }
      return instrs
    })
  }

  // No branch structure detected - return all instructions as single branch
  const regex = /([A-Z_][A-Z0-9_]*)\(([^)]*)\)/gi
  const allInstrs: string[] = []
  let match
  while ((match = regex.exec(rungText)) !== null) {
    allInstrs.push(`${match[1].toUpperCase()}(${match[2]})`)
  }
  return [allInstrs]
}

/**
 * Check if instruction is a condition (input) type
 */
function isConditionInstruction(instruction: string): boolean {
  return ['XIC', 'XIO', 'EQU', 'NEQ', 'GRT', 'GEQ', 'LES', 'LEQ', 'LIM', 'CMP', 'MEQ'].includes(instruction)
}

export function generateFullRungExplanation(
  rungText: string,
  mode: ExplanationMode,
  includeRaw: boolean = false
): string {
  const branches = detectBranches(rungText)
  const allInstructions = explainRungInstructions(rungText, mode)

  if (allInstructions.length === 0) {
    return 'No instructions found in this rung.'
  }

  let explanation = ''

  if (mode === 'friendly') {
    if (branches.length > 1) {
      // Multiple branches - explain each separately
      explanation = 'This rung has parallel branches:\n'
      branches.forEach((branch, idx) => {
        const branchInstrs = branch.map(instrText => {
          const match = instrText.match(/([A-Z_][A-Z0-9_]*)\(([^)]*)\)/i)
          if (match) {
            const found = allInstructions.find(i =>
              i.instruction === match[1].toUpperCase() &&
              i.operands.join(',') === match[2]
            )
            return found || { instruction: match[1], explanation: instrText }
          }
          return null
        }).filter(Boolean)

        const conditions = branchInstrs.filter(i => i && isConditionInstruction(i.instruction))
        const outputs = branchInstrs.filter(i => i && !isConditionInstruction(i.instruction))

        explanation += `  ${idx + 1}. `
        if (conditions.length > 0) {
          explanation += `If ${conditions.map(c => c!.explanation).join(' AND ')}`
        }
        if (outputs.length > 0) {
          if (conditions.length > 0) explanation += ' → '
          explanation += outputs.map(o => o!.explanation).join(', ')
        }
        explanation += '\n'
      })
    } else {
      // Single branch - use simple format
      const conditions = allInstructions.filter(i => isConditionInstruction(i.instruction))
      const outputs = allInstructions.filter(i => !isConditionInstruction(i.instruction))

      if (conditions.length > 0 && outputs.length > 0) {
        explanation = `If ${conditions.map(c => c.explanation).join(' AND ')} → ${outputs.map(o => o.explanation).join(', ')}`
      } else if (conditions.length > 0) {
        explanation = `Check: ${conditions.map(c => c.explanation).join(' AND ')}`
      } else if (outputs.length > 0) {
        explanation = `Execute: ${outputs.map(o => o.explanation).join(', ')}`
      }
    }
  } else {
    // Technical/Operator mode - use structured list
    const conditions = allInstructions.filter(i => isConditionInstruction(i.instruction))
    const outputs = allInstructions.filter(i => !isConditionInstruction(i.instruction))

    if (conditions.length > 0) {
      explanation = 'CONDITIONS:\n'
      conditions.forEach(c => {
        explanation += `  • ${c.explanation}\n`
      })
    }
    if (outputs.length > 0) {
      if (conditions.length > 0) explanation += '\n'
      explanation += 'ACTIONS:\n'
      outputs.forEach(o => {
        explanation += `  • ${o.explanation}\n`
      })
    }
  }

  // Add troubleshooting tips (limit to 3 unique tips)
  const troubleshootingTips = allInstructions
    .filter(i => i.troubleshooting && i.troubleshooting.length > 0)
    .flatMap(i => i.troubleshooting!)

  if (troubleshootingTips.length > 0) {
    const uniqueTips = Array.from(new Set(troubleshootingTips)).slice(0, 3)
    explanation += '\n\n💡 Tips: ' + uniqueTips.join(' • ')
  }

  if (includeRaw) {
    explanation += `\n\nRAW: ${rungText}`
  }

  return explanation.trim()
}

/**
 * Check if AI fallback is needed (instruction not in library)
 */
export function needsAIFallback(rungText: string): boolean {
  const regex = /([A-Z_][A-Z0-9_]*)\(/gi
  let match

  while ((match = regex.exec(rungText)) !== null) {
    const instruction = match[1].toUpperCase()
    if (!INSTRUCTIONS[instruction]) {
      return true
    }
  }

  return false
}

/**
 * Get list of unknown instructions in a rung
 */
export function getUnknownInstructions(rungText: string): string[] {
  const unknown: string[] = []
  const regex = /([A-Z_][A-Z0-9_]*)\(/gi
  let match

  while ((match = regex.exec(rungText)) !== null) {
    const instruction = match[1].toUpperCase()
    if (!INSTRUCTIONS[instruction] && !unknown.includes(instruction)) {
      unknown.push(instruction)
    }
  }

  return unknown
}

/**
 * Get all instruction categories
 */
export function getInstructionCategories(): string[] {
  const categories = new Set<string>()
  Object.values(INSTRUCTIONS).forEach(inst => categories.add(inst.category))
  return Array.from(categories).sort()
}

/**
 * Get instructions by category
 */
export function getInstructionsByCategory(category: string): string[] {
  return Object.entries(INSTRUCTIONS)
    .filter(([_, inst]) => inst.category === category)
    .map(([name]) => name)
    .sort()
}

/**
 * Get total instruction count
 */
export function getInstructionCount(): number {
  return Object.keys(INSTRUCTIONS).length
}

/**
 * Get total device pattern count
 */
export function getDevicePatternCount(): number {
  return DEVICE_PATTERNS.length
}
