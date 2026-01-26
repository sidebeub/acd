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
// FRIENDLY ANALOGIES - Multiple real-world scenarios for variety
// ============================================================================

// Each instruction has multiple analogies to keep explanations fresh
// The analogy is selected based on a hash of the tag name for consistency
const FRIENDLY_ANALOGIES: Record<string, string[]> = {
  // XIC - Examine if Closed (checking if something is ON/true)
  XIC: [
    'Like checking if a light switch is flipped ON - {0} must be ON',
    'Think of it as verifying a safety gate is closed - {0} needs to be active',
    'Like seeing if an engine is running - {0} must be true',
    'Similar to checking if a conveyor belt is moving - {0} is ON',
    'Like verifying a green "GO" light is showing - {0} is active',
    'Think of checking if air pressure is up - {0} is ON',
    'Like confirming a pump is running - {0} is true',
    'Similar to seeing if a limit switch is triggered - {0} is signaling YES',
  ],

  // XIO - Examine if Open (checking if something is OFF/false)
  XIO: [
    'Like checking if a motor is stopped - {0} must be OFF',
    'Think of verifying an E-stop is NOT pressed - {0} needs to be inactive',
    'Like confirming a cylinder is retracted - {0} must be false',
    'Similar to checking a fault light is clear - {0} is OFF',
    'Like seeing a guard door is closed - {0} is not active',
    'Think of confirming a valve is shut - {0} is OFF',
    'Like verifying no alarm is active - {0} is false',
    'Similar to checking a sensor is not blocked - {0} is clear',
  ],

  // OTE - Output Energize (turning something ON)
  OTE: [
    'Energize {0} - like starting a motor',
    'Turn ON {0} - like opening a solenoid valve',
    'Activate {0} - extend that cylinder',
    'Light up {0} - turn on the indicator',
    'Engage {0} - start the conveyor',
    'Fire up {0} - run the pump',
    'Switch {0} ON - enable the drive',
    'Send the GO signal to {0} - start the sequence',
  ],

  // OTL - Output Latch (turn ON and keep ON)
  OTL: [
    'Latch {0} ON - stays ON until explicitly reset, like sealing in a motor starter',
    'Lock {0} in the ON position - like a maintained push button',
    'Seal in {0} - keeps running even after the start button is released',
    'Set and hold {0} ON - like a latching relay',
    'Engage and lock {0} - stays energized until unlatch',
    'Capture the ON state for {0} - like setting a fault latch',
    'Pin {0} ON - similar to a mechanical detent holding position',
    'Hold {0} energized - won\'t drop out until OTU resets it',
  ],

  // OTU - Output Unlatch (turn OFF and keep OFF)
  OTU: [
    'Unlatch {0} - release the seal-in circuit',
    'Reset {0} to OFF - like hitting the stop button on a latched motor',
    'Release {0} - drop out the latching relay',
    'Clear the latch on {0} - reset after a fault',
    'Drop {0} to OFF - break the seal-in',
    'Reset {0} - like acknowledging and clearing an alarm',
    'Unlatch and de-energize {0}',
    'Break the hold on {0} - allow it to turn OFF',
  ],

  // TON - Timer On Delay
  TON: [
    'Start delay timer {0} - output comes ON after the preset time',
    'Begin timing {0} - like waiting for a motor to reach speed before proceeding',
    'Delay with {0} - give the system time to stabilize',
    'Run timer {0} - wait for pressure to build up',
    'Start {0} countdown - like a dwell time before the next step',
    'Time delay {0} - allow the part to settle before clamping',
    'Count up on {0} - waiting for the cycle to complete',
    'Hold for {0} preset - like a cure time or cooling period',
  ],

  // TOF - Timer Off Delay
  TOF: [
    'Off-delay timer {0} - keeps output ON for a bit after input drops',
    'Delay the OFF with {0} - like a cooling fan that runs after shutdown',
    'Hold {0} ON briefly after release - coast-down time',
    'Extend {0} after signal drops - like a lubrication pump run-on',
    'Coast-down timer {0} - allow spindle to stop spinning',
    'Maintain {0} temporarily - like keeping hydraulics pressurized briefly',
    'Buffer the stop with {0} - prevent rapid cycling',
    'Delay shutdown of {0} - purge time or post-process delay',
  ],

  // CTU - Count Up
  CTU: [
    'Count up on {0} - track each part produced',
    'Increment {0} - add one to the batch count',
    'Tick up {0} - count each cycle completed',
    'Bump up {0} - like counting boxes on a conveyor',
    'Increase {0} - track cases per layer',
    'Add one to {0} - count pallets built',
    'Register +1 on {0} - track rejects or good parts',
    'Score one more on {0} - count sensor triggers',
  ],

  // CTD - Count Down
  CTD: [
    'Count down on {0} - track remaining parts in batch',
    'Decrement {0} - one less until batch complete',
    'Tick down {0} - like tracking boxes left to fill',
    'Reduce {0} - count down layers remaining',
    'Decrease {0} - parts left to dispense',
    'Subtract from {0} - remaining cycles in sequence',
    'Deduct from {0} - count down to maintenance',
    'Mark one less on {0} - remaining pieces in magazine',
  ],

  // MOV - Move/Copy value
  MOV: [
    'Copy {0} to {1} - transfer the setpoint value',
    'Move {0} into {1} - load the recipe parameter',
    'Send {0} to {1} - pass the position value',
    'Write {0} to {1} - store the current count',
    'Transfer {0} → {1} - copy speed setting to drive',
    'Load {1} with {0} - set the target position',
    'Set {1} = {0} - update the register',
    'Pass {0} to {1} - hand off the analog value',
  ],

  // ADD - Addition
  ADD: [
    'Add {0} + {1} → {2} - accumulate the total count',
    'Sum {0} and {1} into {2} - combine batch quantities',
    'Calculate {0} + {1}, store in {2} - total the production',
    'Combine {0} with {1} → {2} - add to running total',
    'Total {0} + {1} in {2} - sum the cycle times',
    '{0} plus {1} equals {2} - calculate offset',
    'Accumulate: {0} + {1} → {2} - build up the value',
    'Add together {0} and {1}, result in {2}',
  ],

  // EQU - Equal comparison
  EQU: [
    'Check if {0} equals {1} - is step number at target?',
    'Compare {0} to {1} - does position match setpoint?',
    'Test if {0} = {1} - has counter reached preset?',
    'Verify {0} matches {1} - is recipe ID correct?',
    'Is {0} exactly {1}? - check sequence step',
    '{0} equal to {1}? - compare sensor value to target',
    'Match {0} against {1} - verify part count',
    'Check equality: {0} vs {1}',
  ],

  // GRT - Greater Than
  GRT: [
    'Check if {0} > {1} - is temperature above limit?',
    'Test if {0} exceeds {1} - has pressure gone too high?',
    'Is {0} greater than {1}? - tank level over setpoint?',
    'Verify {0} > {1} - is speed above threshold?',
    '{0} bigger than {1}? - check if count exceeded',
    'Compare {0} > {1} - is position past target?',
    'Check {0} surpasses {1} - over max limit?',
    'Test if {0} is above {1} - high-level alarm check',
  ],

  // LES - Less Than
  LES: [
    'Check if {0} < {1} - is level below minimum?',
    'Test if {0} is under {1} - pressure too low?',
    'Is {0} less than {1}? - has stock dropped below reorder?',
    'Verify {0} < {1} - temperature below setpoint?',
    '{0} smaller than {1}? - check for low-level alarm',
    'Compare {0} < {1} - is speed below target?',
    'Check {0} beneath {1} - under minimum threshold?',
    'Test if {0} is below {1} - low limit check',
  ],

  // RES - Reset
  RES: [
    'Reset {0} to zero - clear the counter for next batch',
    'Zero out {0} - restart the cycle count',
    'Clear {0} - reset timer for next cycle',
    'Reset {0} - clear accumulator after batch complete',
    'Zero {0} - initialize for new product run',
    'Clear counter {0} - start fresh count',
    'Reset {0} to initial - prepare for next sequence',
    'Restart {0} - begin new timing cycle',
  ],

  // JSR - Jump to Subroutine
  JSR: [
    'Jump to {0} routine - run the motor control logic',
    'Call subroutine {0} - execute the homing sequence',
    'Run {0} - perform the safety check routine',
    'Execute {0} routine - do the fault handling',
    'Branch to {0} - run the recipe step logic',
    'Go to {0} - execute valve sequencing',
    'Call {0} - run the communication handler',
    'Jump to {0} - perform the alarm check routine',
  ],

  // ONS - One Shot (pulse on rising edge)
  ONS: [
    'One-shot pulse using {0} - fires once per button press, like a single cycle start',
    'Trigger once with {0} - captures the rising edge, perfect for counting parts',
    'Single pulse via {0} - prevents double-triggering on slow inputs',
    'Edge detect using {0} - like a momentary start button that only fires once',
    'One-shot {0} - triggers one scan only, good for incrementing counters',
    'Pulse generator {0} - catches the instant the signal goes true',
    'Rising edge latch {0} - fires once even if operator holds the button',
    'Single-fire trigger {0} - like a part-present sensor counting pieces',
  ],

  // OSR - One Shot Rising (retentive one-shot)
  OSR: [
    'One-shot rising {0} → {1} - pulses once when input goes true',
    'Rising edge detect {0} → {1} - like catching a proximity sensor trigger',
    'Pulse on rising {0} → {1} - fires one scan when condition turns ON',
    'OSR {0} → {1} - captures the ON transition for counting',
    'Edge trigger {0} → {1} - like detecting a photo-eye beam break',
    'Rising pulse {0} → {1} - triggers once per cycle start',
    'Catch the ON with {0} → {1} - single pulse for batch counting',
    'Detect transition {0} → {1} - like sensing a part entering a station',
  ],

  // OSF - One Shot Falling (falling edge detect)
  OSF: [
    'One-shot falling {0} → {1} - pulses once when input goes false',
    'Falling edge detect {0} → {1} - like catching when a sensor clears',
    'Pulse on falling {0} → {1} - fires when condition turns OFF',
    'OSF {0} → {1} - captures the OFF transition',
    'Detect release with {0} → {1} - like when operator releases a button',
    'Falling pulse {0} → {1} - triggers when part leaves sensor',
    'Catch the OFF with {0} → {1} - pulse when signal drops',
    'Detect exit {0} → {1} - like sensing a part leaving a station',
  ],

  // NEQ - Not Equal
  NEQ: [
    'Check if {0} ≠ {1} - is step number different from target?',
    'Test if {0} is not {1} - recipe mismatch detection',
    'Is {0} different from {1}? - verify not at fault state',
    'Compare {0} against {1} for difference - position error check',
    '{0} not equal to {1}? - detect when value has changed',
    'Check mismatch: {0} vs {1} - alarm if not at setpoint',
    'Verify {0} differs from {1} - state change detection',
    'Test inequality: {0} ≠ {1} - fault code check',
  ],

  // GEQ - Greater Than or Equal
  GEQ: [
    'Check if {0} ≥ {1} - is level at or above minimum?',
    'Test if {0} is at least {1} - pressure sufficient for operation?',
    'Is {0} greater or equal to {1}? - temperature reached setpoint?',
    'Verify {0} ≥ {1} - counter hit or passed target?',
    '{0} at or above {1}? - enough parts in buffer?',
    'Compare {0} ≥ {1} - is speed up to requirements?',
    'Check {0} meets or exceeds {1} - ready threshold reached?',
    'Test if {0} is {1} or more - minimum condition met?',
  ],

  // LEQ - Less Than or Equal
  LEQ: [
    'Check if {0} ≤ {1} - is level at or below maximum?',
    'Test if {0} is at most {1} - temperature not exceeded?',
    'Is {0} less or equal to {1}? - pressure within safe limits?',
    'Verify {0} ≤ {1} - count at or under limit?',
    '{0} at or below {1}? - torque within range?',
    'Compare {0} ≤ {1} - speed not too high?',
    'Check {0} does not exceed {1} - max limit check',
    'Test if {0} is {1} or less - upper boundary check',
  ],

  // SUB - Subtraction
  SUB: [
    'Subtract {1} from {0} → {2} - calculate remaining parts',
    '{0} minus {1} = {2} - find the difference in position',
    'Calculate {0} - {1} → {2} - determine error from setpoint',
    'Deduct {1} from {0}, store in {2} - track consumed material',
    '{0} - {1} → {2} - calculate shortage or overage',
    'Subtract to get {2} from {0} and {1} - find delta between values',
    'Difference: {0} - {1} = {2} - position error calculation',
    'Remove {1} from {0} → {2} - calculate net quantity',
  ],

  // MUL - Multiplication
  MUL: [
    'Multiply {0} × {1} → {2} - calculate total pieces in batch',
    '{0} times {1} = {2} - scale the analog value',
    'Calculate {0} * {1} → {2} - convert units',
    'Product of {0} and {1} in {2} - calculate area or volume',
    '{0} × {1} → {2} - scale recipe quantity',
    'Multiply to get {2} - engineering unit conversion',
    'Scale {0} by {1} → {2} - apply calibration factor',
    '{0} * {1} = {2} - calculate pallets needed from case count',
  ],

  // DIV - Division
  DIV: [
    'Divide {0} by {1} → {2} - calculate rate or average',
    '{0} ÷ {1} = {2} - convert raw counts to engineering units',
    'Calculate {0} / {1} → {2} - find pieces per layer',
    '{0} divided by {1} in {2} - calculate cycle time',
    '{0} / {1} → {2} - descale analog value',
    'Divide to get {2} - parts per minute calculation',
    'Split {0} by {1} → {2} - calculate batches from total',
    'Quotient: {0} ÷ {1} = {2} - efficiency calculation',
  ],

  // MOD - Modulo (Remainder)
  MOD: [
    'Remainder of {0} ÷ {1} → {2} - find position in cycle',
    '{0} mod {1} = {2} - which station in the pattern?',
    'Calculate remainder {0} / {1} → {2} - layer position',
    'Modulo: {0} % {1} = {2} - column in the pick pattern',
    '{0} modulo {1} → {2} - which nozzle in sequence?',
    'Find remainder to get {2} - position within case pattern',
    '{0} % {1} = {2} - index within recipe step',
    'Cyclical position: {0} mod {1} → {2}',
  ],

  // COP - Copy Array
  COP: [
    'Copy array {0} to {1} ({2} elements) - back up recipe data',
    'Duplicate {0} into {1}, {2} elements - save fault snapshot',
    'Array copy {0} → {1} ({2} items) - transfer production data',
    'Copy {2} elements from {0} to {1} - load recipe parameters',
    'Block copy {0} to {1} - move configuration data',
    'Transfer array {0} → {1} ({2}) - swap active recipe',
    'Duplicate {2} items: {0} → {1} - archive position data',
    'Copy block: {0} to {1}, length {2} - batch data transfer',
  ],

  // FLL - File Fill
  FLL: [
    'Fill {1} with value {0} ({2} elements) - clear the data array',
    'Set all {2} elements of {1} to {0} - initialize recipe to defaults',
    'Fill array {1} with {0}, {2} items - zero out fault buffer',
    'Initialize {1} to {0} ({2} elements) - reset production counts',
    'Flood {1} with value {0} - clear status flags',
    'Set {2} elements in {1} = {0} - preset all stations',
    'Fill {1}: {2} copies of {0} - initialize pattern data',
    'Bulk set {1} to {0} - clear alarm history array',
  ],

  // JMP - Jump to Label
  JMP: [
    'Jump to {0} - skip ahead in the logic',
    'Branch to label {0} - bypass fault-check logic when clear',
    'Skip to {0} - jump past optional steps',
    'Goto {0} - branch around manual mode logic',
    'Jump ahead to {0} - skip diagnostics when not needed',
    'Branch to {0} - bypass calibration when valid',
    'Hop to label {0} - skip over disabled features',
    'Jump over to {0} - conditional logic bypass',
  ],

  // RET - Return from Subroutine
  RET: [
    'Return from subroutine - go back to the calling routine',
    'Exit routine - done with this section, return to caller',
    'Return to caller - subroutine complete',
    'End subroutine and return - motor control done, go back',
    'Return from {0} - exit the fault handler',
    'Go back to calling routine - homing sequence finished',
    'Exit and return - valve sequence complete',
    'Return from this logic - rejoin main routine',
  ],

  // MSG - Message Instruction
  MSG: [
    'Send message {0} - communicate with remote device',
    'Execute message {0} - read/write to drive parameters',
    'Message {0} - transfer data to HMI',
    'Communication {0} - exchange data with barcode scanner',
    'Send/receive {0} - talk to remote I/O rack',
    'Message instruction {0} - update VFD speed reference',
    'Network message {0} - read robot position',
    'Data exchange {0} - communicate with vision system',
  ],

  // RTO - Retentive Timer On
  RTO: [
    'Retentive timer {0} - accumulates time, keeps value on power loss',
    'Retentive on-delay {0} - like tracking total run hours',
    'RTO {0} - counts up and remembers accumulated time',
    'Accumulating timer {0} - track time-in-state across cycles',
    'Retentive timing {0} - sum up total cycle time',
    'Keep-counting timer {0} - maintenance hour tracking',
    'Persistent timer {0} - accumulate dwell time across batches',
    'Running total timer {0} - track machine utilization',
  ],

  // CTUD - Count Up/Down
  CTUD: [
    'Bidirectional counter {0} - can count up or down',
    'Up/down counter {0} - track inventory in buffer',
    'CTUD {0} - increment or decrement based on direction',
    'Two-way counter {0} - parts in minus parts out',
    'Reversible counter {0} - track position with encoder pulses',
    'Count both ways {0} - material balance tracking',
    'Up-down counter {0} - queue length management',
    'Bidirectional count {0} - track plus and minus adjustments',
  ],

  // CLR - Clear
  CLR: [
    'Clear {0} to zero - reset the value',
    'Zero out {0} - initialize the register',
    'Clear {0} - wipe the accumulator',
    'Reset {0} to 0 - clear the counter value',
    'Initialize {0} to zero - start fresh',
    'Blank out {0} - clear the fault code',
    'Zero {0} - reset the position reference',
    'Clear value {0} - initialize for new cycle',
  ],

  // SBR - Subroutine (entry point)
  SBR: [
    'Subroutine entry {0} - start of called routine',
    'Begin subroutine with parameters {0}',
    'SBR entry point - receive values from JSR call',
    'Subroutine start {0} - motor control logic begins here',
    'Enter routine with {0} - passed parameters received',
    'Subroutine header {0} - fault handling starts here',
    'Begin with inputs {0} - valve sequence parameters',
    'Routine entry {0} - recipe step logic begins',
  ],

  // LBL - Label
  LBL: [
    'Label {0} - jump target location',
    'Mark position {0} - JMP destination',
    'Label target {0} - branch destination',
    'Location marker {0} - skip-to point',
    'Label {0} - logic resumes here after jump',
    'Branch target {0} - conditional logic landing',
    'Jump destination {0} - logic continues here',
    'Marker {0} - labeled position in routine',
  ],

  // GSV - Get System Value
  GSV: [
    'Get system value {0}.{1} → {2} - read controller data',
    'Read system attribute {0}.{1} into {2} - check task status',
    'GSV {0}.{1} → {2} - get module fault info',
    'Fetch system data {0}.{1} to {2} - read axis status',
    'Get {0}.{1} → {2} - retrieve program name',
    'System read {0}.{1} into {2} - check safety status',
    'Read controller info {0}.{1} → {2} - get time/date',
    'Retrieve {0}.{1} to {2} - read fault code details',
  ],

  // SSV - Set System Value
  SSV: [
    'Set system value {0}.{1} ← {2} - write controller data',
    'Write system attribute {0}.{1} from {2} - update task config',
    'SSV {0}.{1} ← {2} - configure module parameter',
    'Store to system {0}.{1} from {2} - set axis parameter',
    'Set {0}.{1} = {2} - update program attribute',
    'System write {0}.{1} from {2} - configure safety zone',
    'Write controller data {0}.{1} ← {2} - set date/time',
    'Update {0}.{1} to {2} - change controller mode',
  ],

  // ============================================================================
  // ADDITIONAL BIT INSTRUCTIONS
  // ============================================================================

  // OSRI - One Shot Rising with Input
  OSRI: [
    'One-shot rising {0} → {1} - pulse output on input transition to ON',
    'Rising edge trigger {0} → {1} - catch the moment sensor activates',
    'OSRI {0} → {1} - single pulse when input goes true',
    'Edge-triggered pulse {0} → {1} - count parts entering station',
    'Detect ON transition {0} → {1} - trigger on button press',
    'Rising one-shot {0} → {1} - pulse for each cycle start',
    'Input edge detect {0} → {1} - catch proximity sensor trigger',
    'Pulse on true {0} → {1} - single scan output on input rise',
  ],

  // OSFI - One Shot Falling with Input
  OSFI: [
    'One-shot falling {0} → {1} - pulse output on input transition to OFF',
    'Falling edge trigger {0} → {1} - catch the moment sensor clears',
    'OSFI {0} → {1} - single pulse when input goes false',
    'Edge-triggered pulse {0} → {1} - count parts leaving station',
    'Detect OFF transition {0} → {1} - trigger on button release',
    'Falling one-shot {0} → {1} - pulse for each cycle end',
    'Input edge detect {0} → {1} - catch sensor going clear',
    'Pulse on false {0} → {1} - single scan output on input fall',
  ],

  // ============================================================================
  // ADDITIONAL TIMER INSTRUCTIONS
  // ============================================================================

  // TONR - Timer On with Reset
  TONR: [
    'Timer on with reset {0} - times when enabled, resets when disabled',
    'TONR {0} - on-delay timer with automatic reset',
    'Auto-reset timer {0} - restarts timing each enable cycle',
    'Resetting on-delay {0} - timer clears when input drops',
    'Timer {0} with built-in reset - no separate RES needed',
    'Self-clearing timer {0} - times up, then resets on disable',
    'On-delay {0} - accumulator clears automatically',
    'Timer with auto-zero {0} - convenient for cycle timing',
  ],

  // TOFR - Timer Off with Reset
  TOFR: [
    'Timer off with reset {0} - off-delay with automatic reset',
    'TOFR {0} - keeps output on briefly after input drops, then resets',
    'Auto-reset off-delay {0} - coast-down timer that self-clears',
    'Resetting off-delay {0} - extends output, then zeroes',
    'Timer {0} off-delay with reset - like a cooling fan run-on',
    'Self-clearing off-delay {0} - no manual reset needed',
    'Off-delay {0} with auto-zero - convenient for shutdown sequences',
    'Post-delay timer {0} - holds output, then clears',
  ],

  // ============================================================================
  // COMPARISON INSTRUCTIONS
  // ============================================================================

  // CMP - Compare Expression
  CMP: [
    'Compare expression {0} - evaluate complex comparison',
    'CMP {0} - test mathematical expression result',
    'Expression compare {0} - check formula result',
    'Evaluate {0} - complex condition check',
    'Test expression {0} - like checking (A+B) > (C*D)',
    'Compare formula {0} - evaluate multi-operand condition',
    'Expression test {0} - check calculated comparison',
    'Complex compare {0} - evaluate expression as boolean',
  ],

  // LIM - Limit Test
  LIM: [
    'Limit test: {0} ≤ {1} ≤ {2} - check if value is within range',
    'Range check: is {1} between {0} and {2}?',
    'LIM {0}/{1}/{2} - verify value is within acceptable limits',
    'Band check: {1} within {0} to {2} - like temperature in range',
    'Within limits? {0} ≤ {1} ≤ {2} - pressure band check',
    'Range test: {1} inside {0}-{2} window - position tolerance',
    'Limit check: {1} between {0} and {2} - speed within bounds',
    'In-band test: is {1} in the {0} to {2} range?',
  ],

  // MEQ - Masked Equal
  MEQ: [
    'Masked compare: ({0} AND {1}) = {2} - check specific bits',
    'MEQ {0} masked by {1} equals {2} - bit pattern match',
    'Test bits: {0} with mask {1} = {2} - check status word',
    'Masked equal: filter {0} through {1}, compare to {2}',
    'Bit compare: {0} & {1} == {2} - input card status check',
    'Pattern match: {0} masked = {2} - check fault bits',
    'Selective compare: only check bits in {1} of {0} vs {2}',
    'Masked test: {0} filtered by {1} equals {2}',
  ],

  // ============================================================================
  // MATH INSTRUCTIONS
  // ============================================================================

  // NEG - Negate
  NEG: [
    'Negate {0} → {1} - flip the sign, positive becomes negative',
    'Reverse sign {0} → {1} - invert the value',
    'NEG {0} → {1} - multiply by -1',
    'Sign flip {0} → {1} - like reversing motor direction',
    'Invert {0} → {1} - change polarity of value',
    'Make negative {0} → {1} - flip from + to - or - to +',
    'Polarity swap {0} → {1} - reverse the sign',
    'Negate value {0} → {1} - useful for bidirectional moves',
  ],

  // ABS - Absolute Value
  ABS: [
    'Absolute value {0} → {1} - always positive result',
    'ABS {0} → {1} - remove the sign, get magnitude only',
    'Magnitude of {0} → {1} - strip negative sign',
    'Make positive {0} → {1} - like measuring distance regardless of direction',
    'Absolute {0} → {1} - convert -5 to 5, 5 stays 5',
    'Distance value {0} → {1} - useful for error magnitude',
    'Unsigned value {0} → {1} - always positive',
    'Get magnitude {0} → {1} - ignore direction, get size',
  ],

  // SQR - Square Root
  SQR: [
    'Square root of {0} → {1} - find the root',
    'SQR {0} → {1} - calculate √{0}',
    'Root of {0} → {1} - square root calculation',
    'Calculate √{0} → {1} - like flow from differential pressure',
    'Square root {0} → {1} - common in flow calculations',
    'Sqrt {0} → {1} - root extraction',
    'Find root {0} → {1} - math function',
    'Root value {0} → {1} - square root result',
  ],

  // SQRT - Square Root (alternate)
  SQRT: [
    'Square root of {0} → {1} - calculate √{0}',
    'SQRT {0} → {1} - find the root value',
    'Root calculation {0} → {1} - common for flow measurement',
    'Calculate square root {0} → {1} - like DP flow conversion',
    'Square root {0} → {1} - √{0} result in {1}',
    'Sqrt {0} → {1} - root extraction function',
    'Find √{0} → {1} - mathematical root',
    'Root of {0} → {1} - square root output',
  ],

  // CPT - Compute
  CPT: [
    'Compute {0} = {1} - calculate expression and store result',
    'CPT {0} = {1} - evaluate formula',
    'Calculate {1} → {0} - complex math expression',
    'Expression {1} result in {0} - like (A*B)+(C/D)',
    'Math compute {0} = {1} - evaluate and store',
    'Formula {1} → {0} - multi-operator calculation',
    'Compute expression {1} into {0} - complex calculation',
    'Evaluate {1}, store in {0} - computed result',
  ],

  // ============================================================================
  // MOVE/LOGICAL INSTRUCTIONS
  // ============================================================================

  // MVM - Masked Move
  MVM: [
    'Masked move {0} through {1} → {2} - copy only certain bits',
    'MVM {0} & {1} → {2} - selective bit copy',
    'Copy bits: {0} masked by {1} to {2} - update specific bits only',
    'Selective copy {0} → {2} using mask {1} - preserve other bits',
    'Masked transfer {0} → {2} - only bits set in {1}',
    'Bit-selective move {0} to {2} with mask {1}',
    'Partial copy: {0} through mask {1} into {2}',
    'Move masked bits {0} & {1} → {2} - update selected bits',
  ],

  // BTD - Bit Field Distribute
  BTD: [
    'Bit distribute {0}.{1} → {2}.{3}, {4} bits - copy bit field',
    'BTD: copy {4} bits from {0} position {1} to {2} position {3}',
    'Extract and place bits - move bit pattern',
    'Bit field copy {0} to {2} - reposition bits',
    'Distribute bits from {0} to {2} - field transfer',
    'Copy bit field - extract from source, insert to dest',
    'Bit transfer {0} → {2} - copy specific bit range',
    'Field move: {4} bits from {0}.{1} to {2}.{3}',
  ],

  // SWPB - Swap Byte
  SWPB: [
    'Swap bytes in {0} → {1} - reverse byte order',
    'SWPB {0} → {1} - change endianness',
    'Byte swap {0} → {1} - like converting from big to little endian',
    'Reverse bytes {0} → {1} - flip byte order for comms',
    'Endian swap {0} → {1} - network byte order conversion',
    'Byte order flip {0} → {1} - communication data conversion',
    'Swap {0} bytes → {1} - reorder for protocol',
    'Flip byte order {0} → {1} - endian conversion',
  ],

  // ============================================================================
  // ARRAY/FILE INSTRUCTIONS
  // ============================================================================

  // CPS - Synchronous Copy
  CPS: [
    'Synchronous copy {0} → {1} ({2} elements) - uninterruptible array copy',
    'CPS {0} to {1} - copy array without task interruption',
    'Safe array copy {0} → {1} - prevents data corruption',
    'Atomic copy {0} → {1}, {2} items - can\'t be interrupted',
    'Protected transfer {0} → {1} - synchronous for data integrity',
    'Sync copy {0} to {1} ({2}) - completes in one scan',
    'Uninterruptible copy {0} → {1} - safe for shared data',
    'Synchronous transfer {0} → {1}, {2} elements',
  ],

  // FAL - File Arithmetic/Logic
  FAL: [
    'File arithmetic {0} - process array with expression',
    'FAL {0} - apply math across array elements',
    'Array operation {0} - arithmetic on file data',
    'Bulk calculate {0} - expression applied to array',
    'File math {0} - process multiple elements',
    'Array expression {0} - like scaling all recipe values',
    'FAL operation {0} - arithmetic on data table',
    'Process array {0} - apply formula to file',
  ],

  // FSC - File Search/Compare
  FSC: [
    'File search {0} - find value in array',
    'FSC {0} - search array with expression',
    'Array search {0} - locate matching element',
    'Scan file {0} - find value in data table',
    'Search array {0} - like finding fault code in history',
    'File compare {0} - search for match',
    'Find in array {0} - locate specific value',
    'Data search {0} - scan table for match',
  ],

  // SIZE - Size in Elements
  SIZE: [
    'Get size of {0} → {1} - how many elements in array',
    'SIZE {0} → {1} - array length',
    'Array size {0} → {1} - count of elements',
    'Element count {0} → {1} - find array dimension',
    'Get length {0} → {1} - size of data structure',
    'Dimension of {0} → {1} - array element count',
    'Count elements {0} → {1} - array size',
    'Size check {0} → {1} - how big is the array',
  ],

  // ============================================================================
  // FIFO/LIFO INSTRUCTIONS
  // ============================================================================

  // FFL - FIFO Load
  FFL: [
    'FIFO load {0} into {1} - add to queue (first in, first out)',
    'FFL {0} → {1} - push value onto queue',
    'Queue add {0} to {1} - like parts entering a buffer',
    'Load FIFO {0} → {1} - add to end of queue',
    'Push to queue {0} → {1} - insert at tail',
    'FIFO push {0} into {1} - enqueue the value',
    'Add to buffer {0} → {1} - queue the data',
    'Queue insert {0} → {1} - FIFO load operation',
  ],

  // FFU - FIFO Unload
  FFU: [
    'FIFO unload {0} from {1} - remove from queue (oldest first)',
    'FFU {0} ← {1} - pop value from queue',
    'Queue remove {0} from {1} - like parts leaving a buffer',
    'Unload FIFO {0} ← {1} - remove from front of queue',
    'Pop from queue {0} ← {1} - retrieve oldest entry',
    'FIFO pop {0} from {1} - dequeue the value',
    'Remove from buffer {0} ← {1} - unqueue the data',
    'Queue extract {0} ← {1} - FIFO unload operation',
  ],

  // LFL - LIFO Load
  LFL: [
    'LIFO load {0} into {1} - add to stack (last in, first out)',
    'LFL {0} → {1} - push value onto stack',
    'Stack push {0} → {1} - like plates stacking up',
    'Load LIFO {0} → {1} - add to top of stack',
    'Push to stack {0} → {1} - insert at top',
    'LIFO push {0} into {1} - stack the value',
    'Add to stack {0} → {1} - push the data',
    'Stack insert {0} → {1} - LIFO load operation',
  ],

  // LFU - LIFO Unload
  LFU: [
    'LIFO unload {0} from {1} - remove from stack (newest first)',
    'LFU {0} ← {1} - pop value from stack',
    'Stack pop {0} from {1} - like taking top plate off',
    'Unload LIFO {0} ← {1} - remove from top of stack',
    'Pop from stack {0} ← {1} - retrieve newest entry',
    'LIFO pop {0} from {1} - unstack the value',
    'Remove from stack {0} ← {1} - pop the data',
    'Stack extract {0} ← {1} - LIFO unload operation',
  ],

  // ============================================================================
  // SHIFT REGISTER INSTRUCTIONS
  // ============================================================================

  // BSL - Bit Shift Left
  BSL: [
    'Bit shift left {0} - shift bits toward high end',
    'BSL {0} - shift array left, new bit enters at position 0',
    'Shift left {0} - move bits up, like a conveyor tracking',
    'Left shift {0} - track product through zones',
    'Bit shift {0} left - tracking register shift',
    'Shift register {0} - move data left one position',
    'BSL shift {0} - product tracking through stations',
    'Left-moving shift {0} - zone tracking register',
  ],

  // BSR - Bit Shift Right
  BSR: [
    'Bit shift right {0} - shift bits toward low end',
    'BSR {0} - shift array right, new bit enters at high end',
    'Shift right {0} - move bits down, like reverse tracking',
    'Right shift {0} - track product in reverse direction',
    'Bit shift {0} right - tracking register shift',
    'Shift register {0} - move data right one position',
    'BSR shift {0} - product tracking reverse',
    'Right-moving shift {0} - reverse zone tracking',
  ],

  // ============================================================================
  // SEQUENCER INSTRUCTIONS
  // ============================================================================

  // SQI - Sequencer Input
  SQI: [
    'Sequencer input {0} - compare inputs to step data',
    'SQI {0} - check if inputs match current step',
    'Step input check {0} - verify conditions for step',
    'Sequencer compare {0} - inputs vs step requirements',
    'Input sequencer {0} - like checking step completion',
    'SQI {0} - do inputs match this sequence step?',
    'Sequencer test {0} - input conditions met?',
    'Step verify {0} - inputs match step pattern?',
  ],

  // SQO - Sequencer Output
  SQO: [
    'Sequencer output {0} - set outputs for current step',
    'SQO {0} - drive outputs from step data',
    'Step output {0} - apply step pattern to outputs',
    'Sequencer drive {0} - outputs per step',
    'Output sequencer {0} - like drum controller output',
    'SQO {0} - set outputs for this sequence step',
    'Sequencer apply {0} - output pattern for step',
    'Step apply {0} - drive outputs from sequence',
  ],

  // SQL - Sequencer Load
  SQL: [
    'Sequencer load {0} - capture inputs into step',
    'SQL {0} - record current inputs to step data',
    'Load sequencer {0} - store input pattern',
    'Capture inputs {0} - save to sequencer array',
    'Record step {0} - capture current state',
    'SQL {0} - load inputs into sequence table',
    'Sequencer record {0} - store input snapshot',
    'Step capture {0} - save inputs to step',
  ],

  // ============================================================================
  // PROGRAM CONTROL INSTRUCTIONS
  // ============================================================================

  // TND - Temporary End
  TND: [
    'Temporary end - stop scanning here this scan',
    'TND - end routine early, continue next scan',
    'Skip rest - don\'t scan remaining rungs this pass',
    'Early exit - stop here, resume from top next scan',
    'Temporary stop - like pausing execution',
    'End scan here - remaining rungs skipped this scan',
    'TND - conditional early termination',
    'Stop scanning - rest of routine skipped',
  ],

  // MCR - Master Control Reset
  MCR: [
    'Master control {0} - enable/disable zone of rungs',
    'MCR {0} - master control region boundary',
    'Control zone {0} - outputs in zone go false when disabled',
    'Master reset {0} - zone enable/disable',
    'MCR boundary {0} - start or end control zone',
    'Zone control {0} - like safety zone enable',
    'Master control region {0} - conditional zone',
    'MCR zone {0} - control region marker',
  ],

  // UID - User Interrupt Disable
  UID: [
    'Disable interrupts - prevent task interruption',
    'UID - user interrupt disable, critical section start',
    'Lock task - no interruptions allowed',
    'Critical section start - protect this code',
    'Interrupt off - ensure uninterrupted execution',
    'UID - begin protected code region',
    'Disable preemption - task runs uninterrupted',
    'Start critical - block task switches',
  ],

  // UIE - User Interrupt Enable
  UIE: [
    'Enable interrupts - allow task interruption again',
    'UIE - user interrupt enable, critical section end',
    'Unlock task - interruptions allowed again',
    'Critical section end - code protection off',
    'Interrupt on - normal task switching resumes',
    'UIE - end protected code region',
    'Enable preemption - task can be interrupted',
    'End critical - allow task switches',
  ],

  // AFI - Always False
  AFI: [
    'Always false - this rung never executes outputs',
    'AFI - disable rung, like commenting out code',
    'Rung disable - outputs never energize',
    'Always off - this rung is inactive',
    'AFI - placeholder, logic disabled',
    'False rung - outputs always off',
    'Disabled rung - like a code comment',
    'Skip outputs - always false condition',
  ],

  // NOP - No Operation
  NOP: [
    'No operation - placeholder, does nothing',
    'NOP - empty instruction, just continues',
    'Do nothing - pass-through instruction',
    'Placeholder - no action taken',
    'NOP - used for spacing or future expansion',
    'Empty instruction - no effect',
    'Skip - no operation performed',
    'Null instruction - placeholder only',
  ],

  // EOT - End of Transition
  EOT: [
    'End of transition - SFC transition complete',
    'EOT - transition done, proceed to next step',
    'Transition end - SFC flow continues',
    'Complete transition - move to next state',
    'EOT - Sequential Function Chart transition marker',
    'Transition complete - advance sequence',
    'End transition - SFC state machine continue',
    'SFC advance - transition finished',
  ],

  // SFP - SFC Pause
  SFP: [
    'SFC pause {0} - halt sequential function chart',
    'Pause SFC {0} - stop sequence execution',
    'SFP {0} - freeze the sequence',
    'Hold SFC {0} - pause at current step',
    'Sequence pause {0} - temporary stop',
    'SFC hold {0} - freeze state machine',
    'Pause sequence {0} - halt progression',
    'Stop SFC {0} - pause sequential execution',
  ],

  // SFR - SFC Reset
  SFR: [
    'SFC reset {0} - restart sequential function chart',
    'Reset SFC {0} - return to initial step',
    'SFR {0} - reinitialize the sequence',
    'Restart SFC {0} - go back to step 1',
    'Sequence reset {0} - start over',
    'SFC restart {0} - reset state machine',
    'Reset sequence {0} - initialize to beginning',
    'Reinit SFC {0} - restart sequential chart',
  ],

  // EVENT - Event Task Trigger
  EVENT: [
    'Trigger event task {0} - execute event routine',
    'EVENT {0} - fire the event task',
    'Event trigger {0} - run event routine now',
    'Fire event {0} - execute event handler',
    'Trigger {0} - activate event task',
    'EVENT instruction {0} - event execution',
    'Event fire {0} - run associated task',
    'Activate event {0} - trigger handler',
  ],

  // FOR/BRK/NXT - Loop Control
  FOR: [
    'For loop start {0} - begin loop iteration',
    'FOR {0} - loop from index to limit',
    'Loop start {0} - iterate through range',
    'Begin loop {0} - repeat until limit reached',
    'FOR loop {0} - iterate count times',
    'Start iteration {0} - loop control',
    'Loop begin {0} - process array elements',
    'Iterate {0} - for loop control',
  ],

  BRK: [
    'Break loop - exit FOR loop early',
    'BRK - stop looping, continue after NXT',
    'Exit loop - leave iteration early',
    'Loop exit - break out of FOR',
    'Break out - stop iterating',
    'BRK - early loop termination',
    'Stop loop - exit before limit',
    'Loop break - jump to after NXT',
  ],

  NXT: [
    'Next iteration - end of FOR loop body',
    'NXT - continue to next loop iteration',
    'Loop end - go back to FOR',
    'Continue loop - next iteration',
    'NXT marker - loop body boundary',
    'Iteration end - return to FOR',
    'Loop bottom - back to top',
    'Next pass - FOR loop continue',
  ],

  // ============================================================================
  // LOGICAL OPERATIONS
  // ============================================================================

  AND: [
    'Bitwise AND {0} & {1} → {2} - both bits must be 1',
    'AND {0} with {1} → {2} - logical AND of bits',
    'Bit AND {0} & {1} = {2} - mask operation',
    'Logical AND {0}, {1} → {2} - extract specific bits',
    'AND operation {0} & {1} → {2} - bit masking',
    'Bitwise {0} AND {1} = {2} - filter bits',
    'AND bits {0} & {1} → {2} - combine masks',
    'Mask {0} with {1} → {2} - AND operation',
  ],

  OR: [
    'Bitwise OR {0} | {1} → {2} - either bit can be 1',
    'OR {0} with {1} → {2} - logical OR of bits',
    'Bit OR {0} | {1} = {2} - combine operation',
    'Logical OR {0}, {1} → {2} - merge bits',
    'OR operation {0} | {1} → {2} - bit combining',
    'Bitwise {0} OR {1} = {2} - combine flags',
    'OR bits {0} | {1} → {2} - union of bits',
    'Combine {0} with {1} → {2} - OR operation',
  ],

  XOR: [
    'Bitwise XOR {0} ^ {1} → {2} - bits differ = 1',
    'XOR {0} with {1} → {2} - exclusive OR',
    'Bit XOR {0} ^ {1} = {2} - toggle operation',
    'Exclusive OR {0}, {1} → {2} - difference bits',
    'XOR operation {0} ^ {1} → {2} - toggle bits',
    'Bitwise {0} XOR {1} = {2} - flip specific bits',
    'XOR bits {0} ^ {1} → {2} - find differences',
    'Toggle {0} by {1} → {2} - XOR operation',
  ],

  NOT: [
    'Bitwise NOT {0} → {1} - flip all bits',
    'NOT {0} → {1} - invert every bit',
    'Bit NOT {0} = {1} - complement operation',
    'Logical NOT {0} → {1} - all bits flip',
    'NOT operation {0} → {1} - ones complement',
    'Invert {0} → {1} - all bits toggle',
    'NOT bits {0} → {1} - complement',
    'Flip all {0} → {1} - NOT operation',
  ],

  // Boolean AND/OR/XOR/NOT
  BAND: [
    'Boolean AND {0} && {1} → {2} - both must be true',
    'BAND {0}, {1} → {2} - logical AND result',
    'Bool AND {0} && {1} = {2} - true if both true',
    'Logical BAND {0}, {1} → {2} - AND of conditions',
    'Boolean {0} AND {1} → {2} - combined condition',
    'BAND operation {0} && {1} = {2}',
    'Both true? {0} && {1} → {2}',
    'AND conditions {0}, {1} → {2}',
  ],

  BOR: [
    'Boolean OR {0} || {1} → {2} - either can be true',
    'BOR {0}, {1} → {2} - logical OR result',
    'Bool OR {0} || {1} = {2} - true if either true',
    'Logical BOR {0}, {1} → {2} - OR of conditions',
    'Boolean {0} OR {1} → {2} - either condition',
    'BOR operation {0} || {1} = {2}',
    'Either true? {0} || {1} → {2}',
    'OR conditions {0}, {1} → {2}',
  ],

  BXOR: [
    'Boolean XOR {0} ^ {1} → {2} - exactly one true',
    'BXOR {0}, {1} → {2} - exclusive OR result',
    'Bool XOR {0} ^ {1} = {2} - true if different',
    'Logical BXOR {0}, {1} → {2} - one or the other',
    'Boolean {0} XOR {1} → {2} - differ check',
    'BXOR operation {0} ^ {1} = {2}',
    'One true? {0} ^ {1} → {2}',
    'XOR conditions {0}, {1} → {2}',
  ],

  BNOT: [
    'Boolean NOT {0} → {1} - flip true/false',
    'BNOT {0} → {1} - logical inversion',
    'Bool NOT {0} = {1} - opposite value',
    'Logical BNOT {0} → {1} - invert condition',
    'Boolean NOT {0} → {1} - true becomes false',
    'BNOT operation {0} → {1}',
    'Invert condition {0} → {1}',
    'NOT condition {0} → {1}',
  ],

  // ============================================================================
  // CONVERSION INSTRUCTIONS
  // ============================================================================

  // TOD - To BCD
  TOD: [
    'Convert to BCD {0} → {1} - integer to BCD format',
    'TOD {0} → {1} - convert for 7-segment display',
    'To BCD {0} → {1} - like for thumbwheel output',
    'Integer to BCD {0} → {1} - display encoding',
    'Convert {0} to BCD {1} - for BCD devices',
    'TOD conversion {0} → {1} - decimal to BCD',
    'BCD encode {0} → {1} - for display output',
    'Make BCD {0} → {1} - digit encoding',
  ],

  // FRD - From BCD
  FRD: [
    'Convert from BCD {0} → {1} - BCD to integer format',
    'FRD {0} → {1} - read BCD thumbwheel input',
    'From BCD {0} → {1} - like reading BCD switches',
    'BCD to integer {0} → {1} - decode BCD input',
    'Convert {0} from BCD {1} - read BCD devices',
    'FRD conversion {0} → {1} - BCD to decimal',
    'BCD decode {0} → {1} - from BCD input',
    'Read BCD {0} → {1} - digit decoding',
  ],

  // TRN - Truncate
  TRN: [
    'Truncate {0} → {1} - drop decimal portion',
    'TRN {0} → {1} - convert to integer by truncation',
    'Truncate {0} → {1} - like rounding toward zero',
    'Drop decimals {0} → {1} - integer part only',
    'TRN conversion {0} → {1} - remove fraction',
    'Truncate float {0} → {1} - keep whole number',
    'Integer from {0} → {1} - by truncation',
    'Cut decimals {0} → {1} - truncate operation',
  ],

  // DEG - Radians to Degrees
  DEG: [
    'Radians to degrees {0} → {1} - convert angle unit',
    'DEG {0} → {1} - radian angle to degrees',
    'To degrees {0} → {1} - like converting trig result',
    'Rad to deg {0} → {1} - angle conversion',
    'DEG conversion {0} → {1} - radian input to degrees',
    'Convert {0} rad to deg {1} - angle unit change',
    'Degrees from radians {0} → {1}',
    'Angle to degrees {0} → {1}',
  ],

  // RAD - Degrees to Radians
  RAD: [
    'Degrees to radians {0} → {1} - convert angle unit',
    'RAD {0} → {1} - degree angle to radians',
    'To radians {0} → {1} - like preparing for trig',
    'Deg to rad {0} → {1} - angle conversion',
    'RAD conversion {0} → {1} - degree input to radians',
    'Convert {0} deg to rad {1} - angle unit change',
    'Radians from degrees {0} → {1}',
    'Angle to radians {0} → {1}',
  ],

  // ============================================================================
  // TRIG FUNCTIONS
  // ============================================================================

  SIN: [
    'Sine of {0} → {1} - trig function',
    'SIN {0} → {1} - calculate sine value',
    'Sine {0} → {1} - for position calculations',
    'Calculate sin({0}) → {1} - trig result',
    'SIN function {0} → {1} - sinusoidal',
    'Sine wave {0} → {1} - oscillation calc',
    'Sin({0}) = {1} - trigonometry',
    'Trig sine {0} → {1}',
  ],

  COS: [
    'Cosine of {0} → {1} - trig function',
    'COS {0} → {1} - calculate cosine value',
    'Cosine {0} → {1} - for position calculations',
    'Calculate cos({0}) → {1} - trig result',
    'COS function {0} → {1} - cosine wave',
    'Cosine wave {0} → {1} - oscillation calc',
    'Cos({0}) = {1} - trigonometry',
    'Trig cosine {0} → {1}',
  ],

  TAN: [
    'Tangent of {0} → {1} - trig function',
    'TAN {0} → {1} - calculate tangent value',
    'Tangent {0} → {1} - for angle calculations',
    'Calculate tan({0}) → {1} - trig result',
    'TAN function {0} → {1} - tangent',
    'Tangent calc {0} → {1} - slope calculation',
    'Tan({0}) = {1} - trigonometry',
    'Trig tangent {0} → {1}',
  ],

  ASN: [
    'Arc sine of {0} → {1} - inverse sin',
    'ASN {0} → {1} - calculate arcsine angle',
    'Arcsine {0} → {1} - find angle from ratio',
    'Calculate asin({0}) → {1} - inverse trig',
    'ASN function {0} → {1} - angle from sine',
    'Inverse sine {0} → {1} - angle result',
    'Asin({0}) = {1} - inverse trig',
    'Angle from sin {0} → {1}',
  ],

  ACS: [
    'Arc cosine of {0} → {1} - inverse cos',
    'ACS {0} → {1} - calculate arccosine angle',
    'Arccosine {0} → {1} - find angle from ratio',
    'Calculate acos({0}) → {1} - inverse trig',
    'ACS function {0} → {1} - angle from cosine',
    'Inverse cosine {0} → {1} - angle result',
    'Acos({0}) = {1} - inverse trig',
    'Angle from cos {0} → {1}',
  ],

  ATN: [
    'Arc tangent of {0} → {1} - inverse tan',
    'ATN {0} → {1} - calculate arctangent angle',
    'Arctangent {0} → {1} - find angle from ratio',
    'Calculate atan({0}) → {1} - inverse trig',
    'ATN function {0} → {1} - angle from tangent',
    'Inverse tangent {0} → {1} - angle result',
    'Atan({0}) = {1} - inverse trig',
    'Angle from tan {0} → {1}',
  ],

  LN: [
    'Natural log of {0} → {1} - ln function',
    'LN {0} → {1} - calculate natural logarithm',
    'Natural log {0} → {1} - base e logarithm',
    'Calculate ln({0}) → {1} - log base e',
    'LN function {0} → {1} - natural log',
    'Log base e {0} → {1} - natural logarithm',
    'Ln({0}) = {1} - natural log result',
    'Natural logarithm {0} → {1}',
  ],

  LOG: [
    'Log base 10 of {0} → {1} - common log',
    'LOG {0} → {1} - calculate common logarithm',
    'Log10 {0} → {1} - base 10 logarithm',
    'Calculate log({0}) → {1} - log base 10',
    'LOG function {0} → {1} - common log',
    'Log base 10 {0} → {1} - common logarithm',
    'Log({0}) = {1} - log10 result',
    'Common logarithm {0} → {1}',
  ],

  XPY: [
    'X to power Y: {0}^{1} → {2} - exponentiation',
    'XPY {0}^{1} → {2} - raise to power',
    'Power {0}^{1} = {2} - exponential calc',
    'Calculate {0}^{1} → {2} - power function',
    'Exponent {0}^{1} → {2} - X raised to Y',
    '{0} to the {1} power → {2}',
    'Power of {0}^{1} = {2} - exponential',
    'Raise {0} to {1} → {2}',
  ],

  // ============================================================================
  // STRING INSTRUCTIONS
  // ============================================================================

  CONCAT: [
    'Concatenate {0} + {1} → {2} - join strings',
    'CONCAT {0} with {1} → {2} - combine text',
    'Join strings {0} + {1} = {2} - append text',
    'String join {0} + {1} → {2} - combine messages',
    'Append {1} to {0} → {2} - build string',
    'Combine text {0} + {1} → {2} - concatenate',
    'Merge strings {0}, {1} → {2}',
    'Text join {0} + {1} → {2}',
  ],

  MID: [
    'Extract middle {0} from position {1}, {2} chars → {3}',
    'MID {0} at {1} for {2} → {3} - substring extraction',
    'Substring {0} from {1}, length {2} → {3}',
    'Get chars from {0} at position {1} → {3}',
    'Extract portion {0}[{1}:{2}] → {3}',
    'Middle of string {0} → {3}',
    'Substring extract {0} → {3}',
    'Pull chars from {0} position {1} → {3}',
  ],

  DELETE: [
    'Delete from {0} at position {1}, {2} chars → {3}',
    'DELETE {2} chars from {0} at {1} → {3}',
    'Remove chars from {0} → {3} - delete portion',
    'String delete {0} → {3} - remove substring',
    'Cut from {0} at {1}, length {2} → {3}',
    'Remove portion from {0} → {3}',
    'Delete substring {0} → {3}',
    'Strip chars from {0} → {3}',
  ],

  INSERT: [
    'Insert {1} into {0} at position {2} → {3}',
    'INSERT {1} in {0} at {2} → {3} - add text',
    'Add string {1} to {0} at position {2}',
    'String insert {1} into {0} → {3}',
    'Put {1} in {0} at {2} → {3}',
    'Insert text {1} into {0} → {3}',
    'Add {1} to string {0} → {3}',
    'Inject {1} at {0}[{2}] → {3}',
  ],

  FIND: [
    'Find {1} in {0} starting at {2} → {3} - search string',
    'FIND {1} within {0} → {3} - locate substring',
    'Search {0} for {1} → {3} - find position',
    'Locate {1} in {0} → {3} - string search',
    'Find text {1} in {0} → position {3}',
    'Search string {0} for {1} → {3}',
    'Substring position {1} in {0} → {3}',
    'Find occurrence {1} in {0} → {3}',
  ],

  DTOS: [
    'DINT to string {0} → {1} - convert number to text',
    'DTOS {0} → {1} - integer to string',
    'Number to text {0} → {1} - for display',
    'Convert DINT {0} to string {1}',
    'Int to string {0} → {1} - numeric format',
    'Format number {0} → {1} - to text',
    'Stringify {0} → {1} - DINT to STRING',
    'Number as text {0} → {1}',
  ],

  STOD: [
    'String to DINT {0} → {1} - convert text to number',
    'STOD {0} → {1} - string to integer',
    'Text to number {0} → {1} - parse string',
    'Convert string {0} to DINT {1}',
    'Parse number {0} → {1} - from text',
    'String to int {0} → {1} - numeric parse',
    'Parse {0} → {1} - STRING to DINT',
    'Text as number {0} → {1}',
  ],

  RTOS: [
    'REAL to string {0} → {1} - convert float to text',
    'RTOS {0} → {1} - real to string',
    'Float to text {0} → {1} - for display',
    'Convert REAL {0} to string {1}',
    'Real to string {0} → {1} - decimal format',
    'Format real {0} → {1} - to text',
    'Stringify {0} → {1} - REAL to STRING',
    'Float as text {0} → {1}',
  ],

  STOR: [
    'String to REAL {0} → {1} - convert text to float',
    'STOR {0} → {1} - string to real',
    'Text to float {0} → {1} - parse string',
    'Convert string {0} to REAL {1}',
    'Parse real {0} → {1} - from text',
    'String to float {0} → {1} - decimal parse',
    'Parse {0} → {1} - STRING to REAL',
    'Text as float {0} → {1}',
  ],

  UPPER: [
    'To uppercase {0} → {1} - convert string',
    'UPPER {0} → {1} - make all caps',
    'Uppercase {0} → {1} - all letters capital',
    'Capitalize {0} → {1} - to upper case',
    'Make upper {0} → {1} - uppercase string',
    'All caps {0} → {1} - convert to upper',
    'String to upper {0} → {1}',
    'Uppercase text {0} → {1}',
  ],

  LOWER: [
    'To lowercase {0} → {1} - convert string',
    'LOWER {0} → {1} - make all lowercase',
    'Lowercase {0} → {1} - all letters small',
    'Decapitalize {0} → {1} - to lower case',
    'Make lower {0} → {1} - lowercase string',
    'All small {0} → {1} - convert to lower',
    'String to lower {0} → {1}',
    'Lowercase text {0} → {1}',
  ],

  // ============================================================================
  // SELECT/MUX INSTRUCTIONS
  // ============================================================================

  SEL: [
    'Select {0}: if false use {1}, if true use {2} → {3}',
    'SEL {0} ? {2} : {1} → {3} - conditional select',
    'Choose based on {0}: {1} or {2} → {3}',
    'Select value {0} → {3} - pick from two options',
    'Conditional {0}: pick {1} or {2} → {3}',
    'If {0} then {2} else {1} → {3}',
    'Select output based on {0} → {3}',
    'Binary select {0} → {3}',
  ],

  MUX: [
    'Multiplex {0} → select from {1} array → {2}',
    'MUX {0} → {2} - select by index',
    'Index select {0} from array → {2}',
    'Multiplexer {0} selects from {1} → {2}',
    'Select element [{0}] from {1} → {2}',
    'Choose by index {0} → {2}',
    'Array select {0} from {1} → {2}',
    'Pick by number {0} → {2}',
  ],

  // ============================================================================
  // STATISTICAL INSTRUCTIONS
  // ============================================================================

  AVE: [
    'Average of {0} → {1} - calculate mean',
    'AVE {0} → {1} - array average',
    'Calculate average {0} → {1} - mean value',
    'Mean of {0} → {1} - sum divided by count',
    'Average array {0} → {1} - statistical mean',
    'Find average {0} → {1} - arithmetic mean',
    'Compute mean {0} → {1}',
    'Array mean {0} → {1}',
  ],

  STD: [
    'Standard deviation of {0} → {1} - calculate spread',
    'STD {0} → {1} - array std dev',
    'Calculate std dev {0} → {1} - variation measure',
    'Std dev of {0} → {1} - statistical spread',
    'Standard dev {0} → {1} - data variation',
    'Find std dev {0} → {1} - sigma value',
    'Compute std dev {0} → {1}',
    'Array deviation {0} → {1}',
  ],

  SRT: [
    'Sort array {0} - arrange in order',
    'SRT {0} - sort elements ascending',
    'Sort {0} - order the array',
    'Arrange {0} - sort ascending',
    'Order array {0} - smallest to largest',
    'Sort data {0} - arrange elements',
    'Array sort {0} - organize values',
    'Sort elements {0} - in order',
  ],

  // ============================================================================
  // ALARM INSTRUCTIONS
  // ============================================================================

  ALMD: [
    'Digital alarm {0} - level-based alarm detection',
    'ALMD {0} - discrete alarm condition',
    'Alarm digital {0} - on/off alarm check',
    'Digital alarm {0} - like limit switch alarm',
    'Level alarm {0} - binary condition',
    'Discrete alarm {0} - state-based',
    'ALMD {0} - digital alarm detection',
    'Binary alarm {0} - true/false condition',
  ],

  ALMA: [
    'Analog alarm {0} - level monitoring alarm',
    'ALMA {0} - process variable alarm',
    'Alarm analog {0} - high/low limit check',
    'Analog alarm {0} - like temperature alarm',
    'Level monitoring {0} - analog limits',
    'Process alarm {0} - variable monitoring',
    'ALMA {0} - analog alarm detection',
    'Variable alarm {0} - continuous monitoring',
  ],

  // ============================================================================
  // PROCESS CONTROL
  // ============================================================================

  PID: [
    'PID loop {0} - proportional-integral-derivative control',
    'PID {0} - closed-loop process control',
    'Process control {0} - PID regulation',
    'PID controller {0} - like temperature control',
    'Loop control {0} - PID algorithm',
    'Regulate {0} - PID feedback loop',
    'PID {0} - setpoint tracking control',
    'Control loop {0} - process regulation',
  ],

  PIDE: [
    'Enhanced PID {0} - advanced process control',
    'PIDE {0} - enhanced closed-loop control',
    'Advanced PID {0} - with anti-windup',
    'PIDE controller {0} - industrial process control',
    'Enhanced loop {0} - PIDE algorithm',
    'Process control {0} - enhanced PID',
    'PIDE {0} - professional process control',
    'Advanced control {0} - enhanced features',
  ],

  SCL: [
    'Scale {0} to {1} - linear scaling',
    'SCL {0} → {1} - input to output scaling',
    'Linear scale {0} → {1} - range conversion',
    'Scale value {0} → {1} - like 4-20mA to engineering',
    'Range scale {0} → {1} - input/output mapping',
    'Scale {0} → {1} - linear transformation',
    'Scaling {0} → {1} - range mapping',
    'Convert range {0} → {1} - linear scale',
  ],

  TOT: [
    'Totalizer {0} - accumulate over time',
    'TOT {0} - running total of rate',
    'Totalize {0} - like flow totalizer',
    'Accumulate {0} - rate integration',
    'Total {0} - sum rate over time',
    'Totalizer {0} - gallons from GPM',
    'TOT {0} - integrate rate',
    'Running total {0} - accumulator',
  ],

  // ============================================================================
  // MOTION INSTRUCTIONS (abbreviated set)
  // ============================================================================

  MSO: [
    'Motion servo on {0} - enable axis servo',
    'MSO {0} - turn on servo drive',
    'Servo on {0} - enable axis control',
    'Enable servo {0} - motor power on',
    'Axis on {0} - servo enable',
    'Servo enable {0} - axis ready',
    'MSO {0} - start servo control',
    'Power axis {0} - servo on',
  ],

  MSF: [
    'Motion servo off {0} - disable axis servo',
    'MSF {0} - turn off servo drive',
    'Servo off {0} - disable axis control',
    'Disable servo {0} - motor power off',
    'Axis off {0} - servo disable',
    'Servo disable {0} - axis shutdown',
    'MSF {0} - stop servo control',
    'Depower axis {0} - servo off',
  ],

  MAJ: [
    'Motion axis jog {0} - jog axis at velocity',
    'MAJ {0} - jog move continuous',
    'Jog axis {0} - continuous velocity move',
    'Axis jog {0} - manual jogging',
    'Jog {0} - continuous motion',
    'MAJ {0} - velocity mode jog',
    'Jog move {0} - axis jogging',
    'Continuous jog {0} - velocity motion',
  ],

  MAM: [
    'Motion axis move {0} - move to position',
    'MAM {0} - absolute or incremental move',
    'Axis move {0} - position move',
    'Move axis {0} - point to point',
    'Position move {0} - MAM command',
    'MAM {0} - motion move',
    'Move to position {0} - axis move',
    'Point move {0} - position motion',
  ],

  MAS: [
    'Motion axis stop {0} - stop axis motion',
    'MAS {0} - commanded stop',
    'Stop axis {0} - halt motion',
    'Axis stop {0} - motion halt',
    'Stop motion {0} - MAS command',
    'MAS {0} - stop move',
    'Halt axis {0} - stop motion',
    'Motion stop {0} - axis halt',
  ],

  MAH: [
    'Motion axis home {0} - home the axis',
    'MAH {0} - homing sequence',
    'Home axis {0} - find home position',
    'Axis home {0} - reference search',
    'Home {0} - MAH command',
    'MAH {0} - home move',
    'Find home {0} - axis homing',
    'Reference axis {0} - home sequence',
  ],

  MAG: [
    'Motion axis gear {0} - electronic gearing',
    'MAG {0} - gear to master axis',
    'Gear axis {0} - follow master',
    'Electronic gear {0} - slave to master',
    'Axis gear {0} - MAG command',
    'MAG {0} - gearing enable',
    'Gear follow {0} - sync to master',
    'Ratio follow {0} - electronic gearing',
  ],

  MASD: [
    'Motion axis shutdown {0} - emergency shutdown',
    'MASD {0} - axis shutdown',
    'Shutdown axis {0} - emergency stop',
    'Axis shutdown {0} - MASD command',
    'Emergency shutdown {0} - axis halt',
    'MASD {0} - shutdown motion',
    'Axis emergency stop {0}',
    'Shutdown {0} - motion halt',
  ],

  MASR: [
    'Motion axis shutdown reset {0} - clear shutdown',
    'MASR {0} - reset axis after shutdown',
    'Reset shutdown {0} - clear axis fault',
    'Axis reset {0} - MASR command',
    'Clear shutdown {0} - axis recovery',
    'MASR {0} - shutdown reset',
    'Reset axis {0} - clear fault',
    'Recover axis {0} - reset shutdown',
  ],

  MRP: [
    'Motion redefine position {0} - set axis position',
    'MRP {0} - redefine current position',
    'Redefine position {0} - set new reference',
    'Set position {0} - MRP command',
    'Position redefine {0} - change reference',
    'MRP {0} - new position',
    'Reset position {0} - redefine location',
    'Define position {0} - axis reference',
  ],

  // ============================================================================
  // I/O INSTRUCTIONS
  // ============================================================================

  IOT: [
    'Immediate output {0} - update output now',
    'IOT {0} - immediate I/O transfer',
    'Output now {0} - don\'t wait for scan end',
    'Immediate I/O {0} - force output update',
    'IOT {0} - real-time output',
    'Update output {0} - immediate write',
    'Force output {0} - instant I/O',
    'Real-time out {0} - immediate transfer',
  ],

  // ============================================================================
  // ASCII SERIAL INSTRUCTIONS
  // ============================================================================

  ABL: [
    'ASCII buffer line {0} - count chars in buffer',
    'ABL {0} - get available buffer length',
    'Buffer length {0} - chars available',
    'Line count {0} - ASCII buffer status',
    'ABL {0} - check buffer contents',
    'Buffer status {0} - available data',
    'Check buffer {0} - char count',
    'Buffer chars {0} - available length',
  ],

  ACB: [
    'ASCII chars in buffer {0} - count all chars',
    'ACB {0} - total buffer content count',
    'Char count {0} - ASCII buffer total',
    'Buffer total {0} - all characters',
    'ACB {0} - buffer character count',
    'Total chars {0} - in buffer',
    'Count buffer {0} - all chars',
    'Buffer size {0} - char count',
  ],

  AHL: [
    'ASCII handshake lines {0} - control serial signals',
    'AHL {0} - set/get handshake status',
    'Handshake {0} - serial control lines',
    'Serial handshake {0} - DTR/RTS control',
    'AHL {0} - modem control lines',
    'Control lines {0} - serial handshake',
    'Handshake lines {0} - serial status',
    'Serial control {0} - handshake',
  ],

  ARD: [
    'ASCII read {0} - read from serial buffer',
    'ARD {0} - receive serial data',
    'Read serial {0} - get ASCII data',
    'Serial receive {0} - ARD command',
    'ARD {0} - ASCII input',
    'Receive data {0} - serial read',
    'Get serial {0} - read buffer',
    'Read chars {0} - serial input',
  ],

  ARL: [
    'ASCII read line {0} - read until terminator',
    'ARL {0} - receive serial line',
    'Read line {0} - get ASCII line',
    'Serial line read {0} - ARL command',
    'ARL {0} - ASCII line input',
    'Receive line {0} - serial read',
    'Get line {0} - read to terminator',
    'Read serial line {0}',
  ],

  AWA: [
    'ASCII write append {0} - send with terminator',
    'AWA {0} - transmit with auto append',
    'Write append {0} - send ASCII with suffix',
    'Serial send {0} - AWA command',
    'AWA {0} - ASCII output with terminator',
    'Send with terminator {0} - serial write',
    'Transmit append {0} - auto suffix',
    'Write with suffix {0} - serial output',
  ],

  AWT: [
    'ASCII write {0} - send serial data',
    'AWT {0} - transmit ASCII data',
    'Write serial {0} - send data',
    'Serial transmit {0} - AWT command',
    'AWT {0} - ASCII output',
    'Send data {0} - serial write',
    'Transmit {0} - serial output',
    'Write chars {0} - serial send',
  ],

  ACL: [
    'ASCII clear {0} - clear serial buffer',
    'ACL {0} - flush serial buffer',
    'Clear buffer {0} - ASCII clear',
    'Serial flush {0} - ACL command',
    'ACL {0} - empty buffer',
    'Flush serial {0} - clear data',
    'Clear serial {0} - reset buffer',
    'Buffer clear {0} - serial flush',
  ],

  // ============================================================================
  // DIAGNOSTIC/SPECIAL
  // ============================================================================

  FBC: [
    'File bit compare {0} - compare bit files',
    'FBC {0} - find bit differences',
    'Bit file compare {0} - diagnostic check',
    'Compare bits {0} - file diagnostic',
    'FBC {0} - bit comparison',
    'Diagnostic compare {0} - bit check',
    'Bit check {0} - file compare',
    'Compare file bits {0}',
  ],

  DDT: [
    'Diagnostic detect {0} - find differences',
    'DDT {0} - diagnostic comparison',
    'Detect differences {0} - diagnostic test',
    'Diagnostic {0} - DDT check',
    'DDT {0} - detect changes',
    'Find differences {0} - diagnostic',
    'Diagnostic detect {0} - compare',
    'Difference detect {0}',
  ],

  DTR: [
    'Data transition {0} - capture transitions',
    'DTR {0} - detect data changes',
    'Transition detect {0} - state change',
    'Data change {0} - DTR capture',
    'DTR {0} - transition capture',
    'Capture transitions {0} - data log',
    'State transition {0} - detect change',
    'Transition capture {0}',
  ],

  PFL: [
    'Program fault log {0} - record fault info',
    'PFL {0} - log program fault',
    'Fault log {0} - capture error',
    'Log fault {0} - PFL record',
    'PFL {0} - program error log',
    'Record fault {0} - diagnostic',
    'Fault record {0} - program log',
    'Error log {0} - PFL',
  ],

  // ============================================================================
  // ADDITIONAL MOTION INSTRUCTIONS
  // ============================================================================

  MAFR: [
    'Motion axis fault reset {0} - clear axis fault',
    'MAFR {0} - reset motion fault',
    'Axis fault reset {0} - clear error',
    'Reset axis fault {0} - recover from error',
    'MAFR {0} - clear motion error',
    'Fault reset {0} - axis recovery',
    'Clear axis fault {0} - reset error',
    'Motion fault clear {0}',
  ],

  MAHD: [
    'Motion axis hold {0} - hold current position',
    'MAHD {0} - axis position hold',
    'Hold axis {0} - maintain position',
    'Position hold {0} - lock in place',
    'MAHD {0} - hold motion',
    'Axis hold {0} - freeze position',
    'Hold position {0} - axis lock',
    'Lock axis {0} - position hold',
  ],

  MRHD: [
    'Motion resume hold {0} - release position hold',
    'MRHD {0} - resume from hold',
    'Resume axis {0} - release hold',
    'Release hold {0} - continue motion',
    'MRHD {0} - release position hold',
    'Resume motion {0} - end hold',
    'End hold {0} - resume axis',
    'Continue axis {0} - release hold',
  ],

  MAW: [
    'Motion axis watch {0} - monitor axis position',
    'MAW {0} - position watch trigger',
    'Watch position {0} - axis monitoring',
    'Axis watch {0} - position trigger',
    'MAW {0} - monitor motion',
    'Position monitor {0} - axis watch',
    'Watch axis {0} - position event',
    'Motion watch {0} - position trigger',
  ],

  MDW: [
    'Motion direct write {0} - write axis parameter',
    'MDW {0} - direct drive write',
    'Direct write {0} - axis parameter',
    'Write axis {0} - direct access',
    'MDW {0} - drive parameter write',
    'Parameter write {0} - direct motion',
    'Axis parameter {0} - direct write',
    'Direct axis write {0}',
  ],

  MRAT: [
    'Motion run assemble test {0} - test assembly',
    'MRAT {0} - motion assembly test',
    'Assembly test {0} - check configuration',
    'Run test {0} - verify assembly',
    'MRAT {0} - test axis config',
    'Test motion {0} - assembly check',
    'Assemble test {0} - verify setup',
    'Config test {0} - motion assembly',
  ],

  MDRT: [
    'Motion direct read test {0} - test direct read',
    'MDRT {0} - read test',
    'Direct read test {0} - verify read',
    'Test read {0} - direct access',
    'MDRT {0} - drive read test',
    'Read test {0} - direct motion',
    'Axis read test {0}',
    'Direct test {0} - read verify',
  ],

  MCD: [
    'Motion change dynamics {0} - modify motion profile',
    'MCD {0} - change speed/accel on the fly',
    'Change dynamics {0} - update motion parameters',
    'Dynamics change {0} - adjust speed profile',
    'MCD {0} - modify motion speed',
    'Motion profile change {0}',
    'Update dynamics {0} - motion change',
    'Change motion {0} - dynamics update',
  ],

  MAPC: [
    'Motion axis position cam {0} - cam profiling',
    'MAPC {0} - position-based cam',
    'Position cam {0} - cam table follow',
    'Cam profile {0} - position sync',
    'MAPC {0} - cam master',
    'Cam axis {0} - position profile',
    'Position profile {0} - cam follow',
    'Axis cam {0} - profile sync',
  ],

  MATC: [
    'Motion axis time cam {0} - time-based cam',
    'MATC {0} - time cam profile',
    'Time cam {0} - timed motion profile',
    'Cam time {0} - time-based profile',
    'MATC {0} - temporal cam',
    'Timed cam {0} - motion profile',
    'Time profile {0} - cam motion',
    'Temporal profile {0} - axis cam',
  ],

  MAOC: [
    'Motion axis output cam {0} - cam output',
    'MAOC {0} - output during cam',
    'Output cam {0} - cam-triggered output',
    'Cam output {0} - position-based output',
    'MAOC {0} - cam digital output',
    'Output profile {0} - cam trigger',
    'Cam trigger {0} - output event',
    'Position output {0} - cam event',
  ],

  MDAC: [
    'Motion direct axis control {0} - direct control',
    'MDAC {0} - direct axis command',
    'Direct control {0} - axis command',
    'Axis control {0} - direct mode',
    'MDAC {0} - direct motion control',
    'Direct command {0} - axis direct',
    'Control direct {0} - axis command',
    'Direct axis {0} - control command',
  ],

  MDCC: [
    'Motion direct command control {0} - command control',
    'MDCC {0} - direct command',
    'Command control {0} - direct mode',
    'Direct command {0} - motion control',
    'MDCC {0} - direct motion command',
    'Command direct {0} - control mode',
    'Control command {0} - direct access',
    'Direct control {0} - command mode',
  ],

  MDOC: [
    'Motion direct output cam {0} - direct output',
    'MDOC {0} - direct cam output',
    'Direct output {0} - cam control',
    'Output direct {0} - cam signal',
    'MDOC {0} - direct cam trigger',
    'Direct cam {0} - output control',
    'Cam direct {0} - output signal',
    'Direct signal {0} - cam output',
  ],

  // Motion Group Instructions
  MGS: [
    'Motion group stop {0} - stop motion group',
    'MGS {0} - group stop command',
    'Group stop {0} - halt all axes',
    'Stop group {0} - motion halt',
    'MGS {0} - stop coordinated motion',
    'Halt group {0} - stop all',
    'Motion group halt {0}',
    'Coordinated stop {0}',
  ],

  MGSD: [
    'Motion group shutdown {0} - shutdown group',
    'MGSD {0} - group emergency shutdown',
    'Group shutdown {0} - emergency stop',
    'Shutdown group {0} - E-stop',
    'MGSD {0} - motion group shutdown',
    'Emergency shutdown {0} - group',
    'Group E-stop {0} - shutdown',
    'Motion shutdown {0} - group',
  ],

  MGSR: [
    'Motion group shutdown reset {0} - reset group',
    'MGSR {0} - group shutdown reset',
    'Group reset {0} - clear shutdown',
    'Reset group {0} - recovery',
    'MGSR {0} - clear group fault',
    'Shutdown reset {0} - group',
    'Group recovery {0} - reset',
    'Reset shutdown {0} - group',
  ],

  MGSP: [
    'Motion group strobe position {0} - capture positions',
    'MGSP {0} - group position capture',
    'Strobe positions {0} - capture all',
    'Group capture {0} - position strobe',
    'MGSP {0} - capture group positions',
    'Position capture {0} - group strobe',
    'Capture all {0} - group positions',
    'Strobe group {0} - positions',
  ],

  // Coordinated Motion Instructions
  MCCP: [
    'Motion coordinated change path {0} - change path',
    'MCCP {0} - path change',
    'Change path {0} - coordinated motion',
    'Path change {0} - modify trajectory',
    'MCCP {0} - trajectory change',
    'Modify path {0} - coordinated',
    'Coordinated path {0} - change',
    'Trajectory modify {0}',
  ],

  MCCM: [
    'Motion coordinated circular move {0} - circular path',
    'MCCM {0} - circular interpolation',
    'Circular move {0} - arc motion',
    'Arc move {0} - coordinated circular',
    'MCCM {0} - circle path',
    'Circle motion {0} - coordinated',
    'Coordinated arc {0} - circular',
    'Arc interpolation {0}',
  ],

  MCLM: [
    'Motion coordinated linear move {0} - linear path',
    'MCLM {0} - linear interpolation',
    'Linear move {0} - straight line motion',
    'Straight move {0} - coordinated linear',
    'MCLM {0} - line path',
    'Line motion {0} - coordinated',
    'Coordinated line {0} - linear',
    'Linear interpolation {0}',
  ],

  MCPM: [
    'Motion coordinated position move {0} - position move',
    'MCPM {0} - coordinated position',
    'Position move {0} - coordinated axes',
    'Coordinated move {0} - position',
    'MCPM {0} - multi-axis position',
    'Multi-axis move {0} - coordinated',
    'Coordinated position {0} - move',
    'Position coordinated {0}',
  ],

  MCS: [
    'Motion coordinated stop {0} - stop coordinated',
    'MCS {0} - coordinated stop',
    'Coordinated stop {0} - halt motion',
    'Stop coordinated {0} - motion halt',
    'MCS {0} - stop multi-axis',
    'Halt coordinated {0} - stop',
    'Multi-axis stop {0}',
    'Coordinated halt {0}',
  ],

  MCSD: [
    'Motion coordinated shutdown {0} - shutdown coordinated',
    'MCSD {0} - coordinated shutdown',
    'Coordinated shutdown {0} - emergency',
    'Shutdown coordinated {0} - E-stop',
    'MCSD {0} - multi-axis shutdown',
    'Emergency shutdown {0} - coordinated',
    'Multi-axis E-stop {0}',
    'Coordinated emergency {0}',
  ],

  MCSR: [
    'Motion coordinated shutdown reset {0} - reset',
    'MCSR {0} - reset coordinated shutdown',
    'Coordinated reset {0} - clear fault',
    'Reset coordinated {0} - recovery',
    'MCSR {0} - clear coordinated fault',
    'Multi-axis reset {0} - recovery',
    'Clear fault {0} - coordinated',
    'Coordinated recovery {0}',
  ],

  MCT: [
    'Motion coordinated transform {0} - coordinate transform',
    'MCT {0} - transform coordinates',
    'Transform {0} - coordinate system',
    'Coordinate transform {0} - motion',
    'MCT {0} - motion transform',
    'System transform {0} - coordinates',
    'Transform coordinates {0}',
    'Coordinated transform {0}',
  ],

  MCTP: [
    'Motion calculate transform position {0} - calc position',
    'MCTP {0} - transform position calc',
    'Calculate transform {0} - position',
    'Transform position {0} - calculate',
    'MCTP {0} - position transform calc',
    'Calc position {0} - transform',
    'Position calculate {0} - transform',
    'Transform calc {0} - position',
  ],

  // ============================================================================
  // PROCESS CONTROL INSTRUCTIONS
  // ============================================================================

  RMPS: [
    'Ramp/soak {0} - temperature profile control',
    'RMPS {0} - ramp soak profile',
    'Ramp soak {0} - heat treat profile',
    'Temperature profile {0} - ramp/soak',
    'RMPS {0} - profile control',
    'Profile {0} - ramp and soak',
    'Soak ramp {0} - temperature control',
    'Heat profile {0} - ramp soak',
  ],

  POSP: [
    'Position proportional {0} - position control',
    'POSP {0} - proportional positioning',
    'Position control {0} - proportional',
    'Proportional position {0} - control',
    'POSP {0} - valve positioning',
    'Positioning {0} - proportional',
    'Control position {0} - proportional',
    'Proportional {0} - position',
  ],

  SRTP: [
    'Split range time proportional {0} - split control',
    'SRTP {0} - split range output',
    'Split range {0} - time proportional',
    'Time proportional {0} - split range',
    'SRTP {0} - dual output control',
    'Split control {0} - time prop',
    'Range split {0} - proportional',
    'Dual output {0} - split range',
  ],

  LDLG: [
    'Lead lag {0} - lead/lag compensation',
    'LDLG {0} - lead lag filter',
    'Lead lag {0} - process compensation',
    'Compensation {0} - lead/lag',
    'LDLG {0} - filter lead lag',
    'Process lead lag {0}',
    'Lead/lag filter {0}',
    'Compensate {0} - lead lag',
  ],

  FGEN: [
    'Function generator {0} - signal generation',
    'FGEN {0} - generate waveform',
    'Signal generator {0} - function',
    'Waveform {0} - function gen',
    'FGEN {0} - waveform output',
    'Generate signal {0} - function',
    'Function {0} - signal gen',
    'Generate {0} - waveform',
  ],

  DEDT: [
    'Deadtime {0} - process dead time',
    'DEDT {0} - dead time delay',
    'Dead time {0} - transport delay',
    'Process delay {0} - dead time',
    'DEDT {0} - transport lag',
    'Delay {0} - dead time',
    'Transport delay {0} - process',
    'Dead band time {0}',
  ],

  HPF: [
    'High pass filter {0} - filter high frequencies',
    'HPF {0} - high pass',
    'High pass {0} - filter low out',
    'Filter {0} - high pass',
    'HPF {0} - pass high frequencies',
    'High frequency {0} - filter',
    'Pass high {0} - filter low',
    'Filter high {0} - pass',
  ],

  LPF: [
    'Low pass filter {0} - filter low frequencies',
    'LPF {0} - low pass',
    'Low pass {0} - filter high out',
    'Filter {0} - low pass',
    'LPF {0} - pass low frequencies',
    'Low frequency {0} - filter',
    'Pass low {0} - filter high',
    'Filter low {0} - pass',
  ],

  NTCH: [
    'Notch filter {0} - remove specific frequency',
    'NTCH {0} - notch filter',
    'Notch {0} - band reject',
    'Filter {0} - notch reject',
    'NTCH {0} - frequency reject',
    'Band reject {0} - notch',
    'Reject frequency {0} - notch',
    'Notch reject {0} - filter',
  ],

  INTG: [
    'Integrator {0} - integrate signal',
    'INTG {0} - integration',
    'Integrate {0} - accumulate',
    'Integration {0} - signal sum',
    'INTG {0} - running integral',
    'Signal integrate {0}',
    'Accumulate {0} - integrate',
    'Running sum {0} - integral',
  ],

  DERV: [
    'Derivative {0} - rate of change',
    'DERV {0} - differentiate',
    'Derivative {0} - calculate rate',
    'Rate of change {0} - derivative',
    'DERV {0} - slope calculation',
    'Differentiate {0} - rate',
    'Rate calc {0} - derivative',
    'Slope {0} - rate of change',
  ],

  SCLE: [
    'Scale with EU {0} - engineering unit scale',
    'SCLE {0} - engineering scaling',
    'EU scale {0} - engineering units',
    'Scale EU {0} - unit conversion',
    'SCLE {0} - unit scaling',
    'Engineering scale {0} - units',
    'Unit conversion {0} - SCLE',
    'Scale to EU {0} - conversion',
  ],

  PI: [
    'PI control {0} - proportional integral',
    'PI {0} - P+I control',
    'Proportional integral {0} - control',
    'Control {0} - PI loop',
    'PI {0} - process control',
    'P+I loop {0} - control',
    'Loop control {0} - PI',
    'PI controller {0}',
  ],

  PMUL: [
    'Pulse multiplier {0} - multiply pulses',
    'PMUL {0} - pulse multiplication',
    'Multiply pulses {0} - scale',
    'Pulse scale {0} - multiply',
    'PMUL {0} - pulse scaling',
    'Scale pulses {0} - multiply',
    'Pulse multiply {0}',
    'Multiplier {0} - pulses',
  ],

  SCRV: [
    'S-curve {0} - motion profile',
    'SCRV {0} - S-curve profile',
    'S-curve profile {0} - smooth motion',
    'Smooth profile {0} - S-curve',
    'SCRV {0} - smooth acceleration',
    'Profile S-curve {0}',
    'Smooth motion {0} - S-curve',
    'S-curve ramp {0}',
  ],

  UPDN: [
    'Up/down accumulator {0} - count up/down',
    'UPDN {0} - bidirectional count',
    'Up down {0} - accumulator',
    'Accumulator {0} - up/down',
    'UPDN {0} - count both ways',
    'Count up/down {0}',
    'Bidirectional {0} - accumulator',
    'Up/down count {0}',
  ],

  HHS: [
    'High/high select {0} - select highest',
    'HHS {0} - high high selector',
    'High select {0} - pick highest',
    'Select highest {0} - HHS',
    'HHS {0} - max of inputs',
    'Highest select {0}',
    'Max select {0} - high high',
    'Pick highest {0}',
  ],

  LLS: [
    'Low/low select {0} - select lowest',
    'LLS {0} - low low selector',
    'Low select {0} - pick lowest',
    'Select lowest {0} - LLS',
    'LLS {0} - min of inputs',
    'Lowest select {0}',
    'Min select {0} - low low',
    'Pick lowest {0}',
  ],

  MAVE: [
    'Moving average {0} - running average',
    'MAVE {0} - moving avg filter',
    'Moving avg {0} - smooth data',
    'Average {0} - moving window',
    'MAVE {0} - rolling average',
    'Rolling avg {0} - filter',
    'Smooth {0} - moving average',
    'Filter {0} - moving avg',
  ],

  MAXC: [
    'Maximum capture {0} - capture max value',
    'MAXC {0} - track maximum',
    'Max capture {0} - peak hold',
    'Peak hold {0} - maximum',
    'MAXC {0} - maximum tracking',
    'Capture max {0} - peak',
    'Track maximum {0}',
    'Maximum hold {0}',
  ],

  MINC: [
    'Minimum capture {0} - capture min value',
    'MINC {0} - track minimum',
    'Min capture {0} - valley hold',
    'Valley hold {0} - minimum',
    'MINC {0} - minimum tracking',
    'Capture min {0} - valley',
    'Track minimum {0}',
    'Minimum hold {0}',
  ],

  ESEL: [
    'Enhanced select {0} - select best signal',
    'ESEL {0} - enhanced selector',
    'Enhanced select {0} - signal selection',
    'Signal select {0} - enhanced',
    'ESEL {0} - smart selection',
    'Best signal {0} - select',
    'Select signal {0} - enhanced',
    'Smart select {0}',
  ],

  HLL: [
    'High/low limit {0} - clamp value',
    'HLL {0} - value limiter',
    'Limit {0} - high and low',
    'Clamp {0} - high/low limit',
    'HLL {0} - value clamping',
    'Value limit {0} - high/low',
    'Clamp value {0} - limits',
    'Limit value {0}',
  ],

  RLIM: [
    'Rate limit {0} - limit rate of change',
    'RLIM {0} - rate limiter',
    'Rate limit {0} - slew rate',
    'Slew limit {0} - rate',
    'RLIM {0} - change rate limit',
    'Limit rate {0} - slew',
    'Change limit {0} - rate',
    'Rate of change limit {0}',
  ],

  SNEG: [
    'Selectable negate {0} - conditional negate',
    'SNEG {0} - selective negate',
    'Negate {0} - selectable',
    'Selective negate {0} - sign',
    'SNEG {0} - conditional sign flip',
    'Conditional negate {0}',
    'Sign select {0} - negate',
    'Selectable sign {0}',
  ],

  // ============================================================================
  // PHASE INSTRUCTIONS
  // ============================================================================

  PSC: [
    'Phase state complete {0} - phase done',
    'PSC {0} - state complete',
    'State complete {0} - phase',
    'Phase complete {0} - state done',
    'PSC {0} - phase state done',
    'Complete state {0} - phase',
    'Phase done {0} - state',
    'State done {0}',
  ],

  PCMD: [
    'Phase command {0} - send phase command',
    'PCMD {0} - phase control',
    'Phase command {0} - control',
    'Command phase {0} - control',
    'PCMD {0} - phase instruction',
    'Control phase {0}',
    'Phase control {0} - command',
    'Send phase {0}',
  ],

  PCLF: [
    'Phase clear failure {0} - clear phase fault',
    'PCLF {0} - clear failure',
    'Clear failure {0} - phase',
    'Phase fault clear {0}',
    'PCLF {0} - reset failure',
    'Failure clear {0} - phase',
    'Clear phase fault {0}',
    'Reset phase failure {0}',
  ],

  PATT: [
    'Phase attach {0} - attach to phase',
    'PATT {0} - phase attachment',
    'Attach phase {0} - equipment',
    'Phase attach {0} - equipment',
    'PATT {0} - attach equipment',
    'Equipment attach {0} - phase',
    'Attach to phase {0}',
    'Phase equipment {0} - attach',
  ],

  PDET: [
    'Phase detach {0} - detach from phase',
    'PDET {0} - phase detachment',
    'Detach phase {0} - equipment',
    'Phase detach {0} - equipment',
    'PDET {0} - detach equipment',
    'Equipment detach {0} - phase',
    'Detach from phase {0}',
    'Phase equipment {0} - detach',
  ],

  POVR: [
    'Phase override {0} - override phase',
    'POVR {0} - phase override',
    'Override phase {0} - control',
    'Phase override {0} - command',
    'POVR {0} - override command',
    'Override {0} - phase',
    'Phase command {0} - override',
    'Override control {0} - phase',
  ],

  PRNP: [
    'Phase run next phase {0} - advance phase',
    'PRNP {0} - next phase run',
    'Run next phase {0}',
    'Next phase {0} - advance',
    'PRNP {0} - phase advance',
    'Advance phase {0}',
    'Phase next {0} - run',
    'Continue phase {0}',
  ],

  PPD: [
    'Phase pause/dwell {0} - pause phase',
    'PPD {0} - phase dwell',
    'Pause phase {0} - dwell',
    'Phase pause {0} - hold',
    'PPD {0} - dwell time',
    'Dwell {0} - phase pause',
    'Hold phase {0} - pause',
    'Phase hold {0} - dwell',
  ],

  PXRQ: [
    'Phase external request {0} - external input',
    'PXRQ {0} - external request',
    'External request {0} - phase',
    'Phase request {0} - external',
    'PXRQ {0} - phase input',
    'Request {0} - external phase',
    'External phase {0} - request',
    'Phase external {0}',
  ],

  // ============================================================================
  // SAFETY INSTRUCTIONS
  // ============================================================================

  SASI: [
    'Safety instruction input {0} - safety input',
    'SASI {0} - safety input',
    'Safety input {0} - SASI',
    'Input safety {0}',
    'SASI {0} - safety signal input',
    'Safety signal {0} - input',
    'Input {0} - safety',
    'Safety {0} - input instruction',
  ],

  SCMD: [
    'Safety command {0} - safety control',
    'SCMD {0} - safety command',
    'Safety command {0} - control',
    'Command safety {0}',
    'SCMD {0} - safety instruction',
    'Safety control {0} - command',
    'Control safety {0}',
    'Safety {0} - command',
  ],

  SOVR: [
    'Safety override {0} - override safety',
    'SOVR {0} - safety override',
    'Override safety {0}',
    'Safety override {0} - command',
    'SOVR {0} - override instruction',
    'Override {0} - safety',
    'Safety {0} - override',
    'Override command {0} - safety',
  ],

  SDET: [
    'Safety detach {0} - detach safety',
    'SDET {0} - safety detachment',
    'Detach safety {0}',
    'Safety detach {0} - equipment',
    'SDET {0} - detach from safety',
    'Detach {0} - safety',
    'Safety {0} - detach',
    'Detachment {0} - safety',
  ],

  SCLF: [
    'Safety clear failure {0} - clear safety fault',
    'SCLF {0} - clear safety failure',
    'Clear safety fault {0}',
    'Safety fault clear {0}',
    'SCLF {0} - reset safety failure',
    'Clear {0} - safety fault',
    'Safety {0} - clear failure',
    'Reset safety {0}',
  ],

  SAFETYTASK: [
    'Safety task {0} - safety controller task',
    'SAFETYTASK {0} - safety task',
    'Safety task {0}',
    'Task {0} - safety controller',
    'SAFETYTASK {0} - safety execution',
    'Safety execution {0} - task',
    'Task safety {0}',
    'Safety {0} - task control',
  ],

  // ============================================================================
  // MISCELLANEOUS
  // ============================================================================

  AOI: [
    'Add-on instruction {0} - custom instruction',
    'AOI {0} - user-defined instruction',
    'Custom instruction {0} - AOI',
    'User instruction {0} - add-on',
    'AOI {0} - reusable logic block',
    'Add-on {0} - custom logic',
    'Instruction {0} - add-on',
    'Reusable block {0} - AOI',
  ],

  BTDT: [
    'Bit field distribute with target {0} - distribute bits',
    'BTDT {0} - bit distribute with target',
    'Distribute bits {0} - with target',
    'Bit distribute {0} - target mode',
    'BTDT {0} - targeted bit field',
    'Targeted distribute {0} - bits',
    'Bit field {0} - distribute target',
    'Target distribute {0} - bits',
  ],
}

// Simple hash function to get consistent number from string
function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash)
}

// Get a varied friendly explanation based on instruction and context
export function getVariedFriendlyExplanation(
  instruction: string,
  operands: string[],
  contextSeed?: string
): string | null {
  const analogies = FRIENDLY_ANALOGIES[instruction.toUpperCase()]
  if (!analogies || analogies.length === 0) {
    return null
  }

  // Use context (tag names, rung position) to pick a consistent analogy
  const seed = contextSeed || operands.join(',') || instruction
  const index = hashString(seed) % analogies.length

  let explanation = analogies[index]

  // Replace placeholders with operands
  operands.forEach((op, i) => {
    explanation = explanation.replace(new RegExp(`\\{${i}\\}`, 'g'), op)
  })

  return explanation
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
 * For 'friendly' mode, uses varied real-world analogies to keep explanations fresh
 */
export function getInstructionExplanation(
  instruction: string,
  operands: string[],
  mode: ExplanationMode,
  contextSeed?: string
): string | null {
  const inst = INSTRUCTIONS[instruction.toUpperCase()]
  if (!inst) return null

  let explanation: string

  // For friendly mode, try to get a varied analogy first
  if (mode === 'friendly') {
    const variedExplanation = getVariedFriendlyExplanation(instruction, operands, contextSeed)
    if (variedExplanation) {
      explanation = variedExplanation
    } else {
      // Fall back to standard friendly explanation
      explanation = inst[mode]
      operands.forEach((op, i) => {
        explanation = explanation.replace(new RegExp(`\\{${i}\\}`, 'g'), op)
      })
    }
  } else {
    // Technical and operator modes use standard explanations
    explanation = inst[mode]
    operands.forEach((op, i) => {
      explanation = explanation.replace(new RegExp(`\\{${i}\\}`, 'g'), op)
    })
  }

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
 * contextSeed is used to select varied analogies consistently
 */
export function getContextualExplanation(
  instruction: string,
  operands: string[],
  mode: ExplanationMode,
  contextSeed?: string
): { explanation: string; device?: DevicePattern; troubleshooting?: string[] } | null {
  const baseExplanation = getInstructionExplanation(instruction, operands, mode, contextSeed)
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
 * Uses varied analogies based on tag names to keep explanations fresh
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
  let instructionIndex = 0

  while ((match = regex.exec(rungText)) !== null) {
    const instruction = match[1].toUpperCase()
    const operandsStr = match[2]
    const operands = parseOperands(operandsStr)

    // Create a context seed from the tag name and position for varied analogies
    // This ensures the same tag always gets the same analogy, but different tags get different ones
    const contextSeed = `${operands[0] || ''}:${instructionIndex}`

    const result = getContextualExplanation(instruction, operands, mode, contextSeed)
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

    instructionIndex++
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
 * Parsed rung structure showing shared conditions, branches, and outputs
 */
interface ParsedRungStructure {
  sharedPrefix: string[]  // Instructions before any branches
  branches: string[][]    // Parallel branches (each is an array of instruction strings)
  sharedSuffix: string[]  // Instructions after branches (outputs)
  hasBranches: boolean
}

/**
 * Check if a bracket at position i is a branch bracket (not an array index)
 * Branch brackets contain instructions (have INSTR( pattern inside) or commas
 * Array brackets just contain numbers/expressions like [1], [i], [x+1]
 */
function isBranchBracket(text: string, openPos: number): boolean {
  // Find the matching close bracket
  let depth = 1
  let closePos = openPos + 1
  while (closePos < text.length && depth > 0) {
    if (text[closePos] === '[') depth++
    else if (text[closePos] === ']') depth--
    closePos++
  }

  const content = text.substring(openPos + 1, closePos - 1)

  // Branch brackets contain instructions (NAME() pattern) or commas at top level
  // Array brackets are short and contain only numbers, identifiers, or simple expressions

  // Check for instruction pattern (NAME followed by open paren)
  if (/[A-Z_][A-Z0-9_]*\(/i.test(content)) {
    return true
  }

  // Check if comma is at top level (not inside parentheses) = branch separator
  let parenDepth = 0
  for (const char of content) {
    if (char === '(') parenDepth++
    else if (char === ')') parenDepth--
    else if (char === ',' && parenDepth === 0) return true
  }

  return false
}

/**
 * Parse rung text into structured sections
 * Rockwell format: INSTR()[BRANCH1,BRANCH2,...]INSTR()
 */
function parseRungStructure(rungText: string): ParsedRungStructure {
  const result: ParsedRungStructure = {
    sharedPrefix: [],
    branches: [],
    sharedSuffix: [],
    hasBranches: false
  }

  // Find the bracket structure for branches (skip array index brackets)
  let bracketStart = -1
  let bracketEnd = -1
  let depth = 0
  let parenDepth = 0

  for (let i = 0; i < rungText.length; i++) {
    const char = rungText[i]
    if (char === '(') {
      parenDepth++
    } else if (char === ')') {
      parenDepth--
    } else if (char === '[' && parenDepth === 0) {
      // Only consider brackets outside of instruction operands
      if (depth === 0) {
        // Check if this is a branch bracket, not an array index
        if (isBranchBracket(rungText, i)) {
          bracketStart = i
          depth++
        }
      } else {
        depth++
      }
    } else if (char === ']' && parenDepth === 0 && depth > 0) {
      depth--
      if (depth === 0) {
        bracketEnd = i
        break // Only handle first top-level bracket group
      }
    }
  }

  if (bracketStart === -1 || bracketEnd === -1) {
    // No branch brackets - simple linear rung
    result.sharedPrefix = extractInstructions(rungText)
    return result
  }

  result.hasBranches = true

  // Extract prefix (before brackets)
  const prefixText = rungText.substring(0, bracketStart)
  result.sharedPrefix = extractInstructions(prefixText)

  // Extract suffix (after brackets)
  const suffixText = rungText.substring(bracketEnd + 1)
  result.sharedSuffix = extractInstructions(suffixText)

  // Extract branches from inside brackets
  const branchContent = rungText.substring(bracketStart + 1, bracketEnd)

  // Split by commas at depth 0 (within this bracket level, outside parens)
  const branchTexts: string[] = []
  let currentBranch = ''
  depth = 0
  parenDepth = 0

  for (const char of branchContent) {
    if (char === '(') {
      parenDepth++
      currentBranch += char
    } else if (char === ')') {
      parenDepth--
      currentBranch += char
    } else if (char === '[') {
      depth++
      currentBranch += char
    } else if (char === ']') {
      depth--
      currentBranch += char
    } else if (char === ',' && depth === 0 && parenDepth === 0) {
      branchTexts.push(currentBranch.trim())
      currentBranch = ''
    } else {
      currentBranch += char
    }
  }
  if (currentBranch.trim()) {
    branchTexts.push(currentBranch.trim())
  }

  // Parse instructions in each branch
  result.branches = branchTexts.map(bt => extractInstructions(bt))

  return result
}

/**
 * Extract instruction strings from a text segment
 */
function extractInstructions(text: string): string[] {
  const instructions: string[] = []
  // Match instructions - looking for NAME( pattern
  const regex = /([A-Z_][A-Z0-9_]*)\(/gi
  let match

  while ((match = regex.exec(text)) !== null) {
    const instrName = match[1].toUpperCase()
    const startIdx = match.index + match[0].length

    // Find matching closing paren, only count () for depth (not [] which are array indexes)
    let depth = 1
    let endIdx = startIdx
    while (endIdx < text.length && depth > 0) {
      if (text[endIdx] === '(') depth++
      else if (text[endIdx] === ')') depth--
      endIdx++
    }

    const operands = text.substring(startIdx, endIdx - 1)
    instructions.push(`${instrName}(${operands})`)
  }

  return instructions
}

/**
 * Check if instruction is a condition (input) type
 */
function isConditionInstruction(instruction: string): boolean {
  return ['XIC', 'XIO', 'EQU', 'NEQ', 'GRT', 'GEQ', 'LES', 'LEQ', 'LIM', 'CMP', 'MEQ'].includes(instruction)
}

/**
 * Get explanation for an instruction string like "XIC(tag)"
 */
function getInstructionExplanationFromString(
  instrString: string,
  mode: ExplanationMode
): { instruction: string; operands: string[]; explanation: string } | null {
  const match = instrString.match(/([A-Z_][A-Z0-9_]*)\(([^)]*)\)/i)
  if (!match) return null

  const instruction = match[1].toUpperCase()
  const operands = parseOperands(match[2])
  const explanation = getInstructionExplanation(instruction, operands, mode)

  return {
    instruction,
    operands,
    explanation: explanation || `${instruction}(${operands.join(', ')})`
  }
}

export function generateFullRungExplanation(
  rungText: string,
  mode: ExplanationMode,
  includeRaw: boolean = false
): string {
  const structure = parseRungStructure(rungText)
  const allInstructions = explainRungInstructions(rungText, mode)

  if (allInstructions.length === 0) {
    return 'No instructions found in this rung.'
  }

  let explanation = ''

  if (mode === 'friendly') {
    // Get shared prefix conditions
    const prefixParts = structure.sharedPrefix
      .map(s => getInstructionExplanationFromString(s, mode))
      .filter(Boolean)
    const prefixConditions = prefixParts.filter(p => isConditionInstruction(p!.instruction))

    // Get shared suffix outputs
    const suffixParts = structure.sharedSuffix
      .map(s => getInstructionExplanationFromString(s, mode))
      .filter(Boolean)

    if (structure.hasBranches && structure.branches.some(b => b.length > 0)) {
      // Has parallel branches
      const nonEmptyBranches = structure.branches.filter(b => b.length > 0)

      if (nonEmptyBranches.length > 1) {
        // Multiple non-empty branches
        explanation = 'When '
        if (prefixConditions.length > 0) {
          explanation += prefixConditions.map(c => c!.explanation).join(' AND ')
          explanation += ', one of these parallel paths executes:\n'
        } else {
          explanation += 'one of these parallel paths executes:\n'
        }

        nonEmptyBranches.forEach((branch, idx) => {
          const branchParts = branch
            .map(s => getInstructionExplanationFromString(s, mode))
            .filter(Boolean)

          const branchConditions = branchParts.filter(p => isConditionInstruction(p!.instruction))
          const branchOutputs = branchParts.filter(p => !isConditionInstruction(p!.instruction))

          explanation += `  ${idx + 1}. `
          if (branchConditions.length > 0) {
            explanation += `If ${branchConditions.map(c => c!.explanation).join(' AND ')}`
          }
          if (branchOutputs.length > 0) {
            if (branchConditions.length > 0) explanation += ' → '
            explanation += branchOutputs.map(o => o!.explanation).join(', ')
          }
          explanation += '\n'
        })
      } else if (nonEmptyBranches.length === 1) {
        // Single non-empty branch (other branch was empty - unconditional parallel path)
        const branchParts = nonEmptyBranches[0]
          .map(s => getInstructionExplanationFromString(s, mode))
          .filter(Boolean)

        const branchConditions = branchParts.filter(p => isConditionInstruction(p!.instruction))
        const branchOutputs = branchParts.filter(p => !isConditionInstruction(p!.instruction))

        const allConditions = [...prefixConditions, ...branchConditions]
        const allOutputs = [...branchOutputs]

        if (allConditions.length > 0 && allOutputs.length > 0) {
          explanation = `If ${allConditions.map(c => c!.explanation).join(' AND ')} → ${allOutputs.map(o => o!.explanation).join(', ')}`
        } else if (allConditions.length > 0) {
          explanation = `Check: ${allConditions.map(c => c!.explanation).join(' AND ')}`
        } else if (allOutputs.length > 0) {
          explanation = `Execute: ${allOutputs.map(o => o!.explanation).join(', ')}`
        }
      }

      // Add suffix outputs
      if (suffixParts.length > 0) {
        explanation += `\nAlso: ${suffixParts.map(s => s!.explanation).join(', ')}`
      }
    } else {
      // Simple linear rung - no branches
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
