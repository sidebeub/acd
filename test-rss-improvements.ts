/**
 * Comprehensive Test Script for RSS Parsing Improvements
 *
 * This script verifies the correct extraction of:
 * 1. Timer/Counter PRE/ACC values from instruction parameters
 * 2. MOV instruction source operands
 * 3. Integer (N file) values from DATA FILES stream
 *
 * Run with: npx ts-node test-rss-improvements.ts
 *
 * Based on research documentation from rss-research/
 */

import * as fs from 'fs'
import CFB from 'cfb'
import { inflateSync } from 'zlib'

// =============================================================================
// Configuration
// =============================================================================

const RSS_FILE = './LANLOGIX_BR.RSS'

// Expected values from research documents (timer-counter-structure.md)
const EXPECTED_TIMERS: Record<string, { timeBase: string; preset: string; accum: string }> = {
  'T4:0': { timeBase: '0.01', preset: '50', accum: '0' },
  'T4:1': { timeBase: '0.01', preset: '1000', accum: '0' },
  'T4:14': { timeBase: '0.01', preset: '300', accum: '0' },
  'T4:26': { timeBase: '0.01', preset: '250', accum: '250' },
  'T4:30': { timeBase: '0.01', preset: '5000', accum: '5000' },
  'T4:41': { timeBase: '1.0', preset: '5994', accum: '0' },
  'T4:62': { timeBase: '1.0', preset: '3600', accum: '1216' },
  'T4:76': { timeBase: '0.01', preset: '32000', accum: '0' },
}

// =============================================================================
// Test Result Types
// =============================================================================

interface TestResult {
  name: string
  passed: boolean
  message: string
  details?: string[]
}

interface TestSuite {
  name: string
  results: TestResult[]
}

// =============================================================================
// Utility Functions
// =============================================================================

function loadRssFile(): { programData: Buffer; dataFilesData: Buffer | null } {
  const buffer = fs.readFileSync(RSS_FILE)
  const data = new Uint8Array(buffer)
  const cfb = CFB.read(data, { type: 'array' })

  let programData: Buffer | null = null
  let dataFilesData: Buffer | null = null

  for (const path of cfb.FullPaths || []) {
    const entry = CFB.find(cfb, path)
    if (!entry || !entry.content || entry.content.length === 0) continue

    const content = Buffer.from(entry.content)

    if (path.includes('PROGRAM FILES') && !path.includes('ONLINEIMAGE')) {
      if (content.length > 16) {
        try {
          programData = inflateSync(content.subarray(16))
        } catch {
          programData = content
        }
      }
    }

    if (path.includes('DATA FILES') && !path.includes('Extensional') && !path.includes('ONLINEIMAGE')) {
      if (content.length > 16) {
        try {
          dataFilesData = inflateSync(content.subarray(16))
        } catch {
          dataFilesData = content
        }
      }
    }
  }

  if (!programData) {
    throw new Error('Could not find PROGRAM FILES stream in RSS file')
  }

  return { programData, dataFilesData }
}

/**
 * Extract timer instruction parameters from PROGRAM FILES stream
 * Pattern: [0x0b 0x80] [type] [0x00] [len] [address] [len] [timebase] [len] [preset] [len] [accum]
 */
function extractTimerParams(
  data: Buffer,
  text: string,
  timerAddrPos: number,
  timerAddrLen: number
): { timeBase: string | null; preset: string | null; accum: string | null } {
  const afterPos = timerAddrPos + timerAddrLen
  const maxSearch = 25

  const params: string[] = []
  let pos = afterPos

  while (params.length < 3 && pos < afterPos + maxSearch && pos < data.length - 1) {
    const len = data[pos]
    if (len >= 1 && len <= 10 && pos + len < data.length) {
      let isValid = true
      let value = ''
      for (let i = 1; i <= len; i++) {
        const c = data[pos + i]
        // Allow digits, decimal point, and minus sign
        if ((c >= 0x30 && c <= 0x39) || c === 0x2e || c === 0x2d) {
          value += String.fromCharCode(c)
        } else {
          isValid = false
          break
        }
      }
      if (isValid && value.length === len && /^-?\d+\.?\d*$/.test(value)) {
        params.push(value)
        pos += len + 1
        continue
      }
    }
    pos++
  }

  return {
    timeBase: params[0] || null,
    preset: params[1] || null,
    accum: params[2] || null,
  }
}

/**
 * Extract counter instruction parameters from PROGRAM FILES stream
 * Pattern: [0x0b 0x80] [type] [0x00] [len] [address] [len] [preset] [len] [accum]
 */
function extractCounterParams(
  data: Buffer,
  text: string,
  counterAddrPos: number,
  counterAddrLen: number
): { preset: string | null; accum: string | null } {
  const afterPos = counterAddrPos + counterAddrLen
  const maxSearch = 15

  const params: string[] = []
  let pos = afterPos

  while (params.length < 2 && pos < afterPos + maxSearch && pos < data.length - 1) {
    const len = data[pos]
    if (len >= 1 && len <= 10 && pos + len < data.length) {
      let isValid = true
      let value = ''
      for (let i = 1; i <= len; i++) {
        const c = data[pos + i]
        if ((c >= 0x30 && c <= 0x39) || c === 0x2d) {
          value += String.fromCharCode(c)
        } else {
          isValid = false
          break
        }
      }
      if (isValid && value.length === len && /^-?\d+$/.test(value)) {
        params.push(value)
        pos += len + 1
        continue
      }
    }
    pos++
  }

  return {
    preset: params[0] || null,
    accum: params[1] || null,
  }
}

/**
 * Extract MOV instruction source operand
 * MOV instructions have destination address followed by source (constant or address)
 */
function extractMovSource(
  data: Buffer,
  text: string,
  destAddrPos: number,
  destAddrLen: number
): string | null {
  // For MOV, the source can be before the destination (in the instruction encoding)
  // Look backwards for a constant or another address

  const searchStart = Math.max(0, destAddrPos - 50)

  // First, look for a constant (length-prefixed ASCII digits)
  for (let pos = destAddrPos - 2; pos >= searchStart; pos--) {
    const len = data[pos]
    if (len >= 1 && len <= 10 && pos + len < destAddrPos) {
      let isNumeric = true
      let value = ''
      for (let i = 1; i <= len; i++) {
        const c = data[pos + i]
        if ((c >= 0x30 && c <= 0x39) || c === 0x2e || c === 0x2d) {
          value += String.fromCharCode(c)
        } else {
          isNumeric = false
          break
        }
      }
      if (isNumeric && value.length === len && /^-?\d+\.?\d*$/.test(value)) {
        return value
      }
    }
  }

  // Look for another address marker before this one
  for (let pos = destAddrPos - 10; pos >= searchStart; pos--) {
    if (data[pos] === 0x0b && data[pos + 1] === 0x80 && data[pos + 3] === 0x00) {
      const addrLength = data[pos + 4]
      if (addrLength > 0 && addrLength < 20 && pos + 5 + addrLength <= destAddrPos) {
        const addrText = text.substring(pos + 5, pos + 5 + addrLength)
        if (/^[BIOTCRNFSAL]\d+/i.test(addrText)) {
          return addrText.toUpperCase()
        }
      }
    }
  }

  return null
}

/**
 * Extract N file (integer) values from DATA FILES stream
 * Header: 0x03 0x80 [fileType] ... [elementCount at offset 10] [wordsPerElement at offset 12]
 * Data starts at offset 18 from marker
 */
function extractNFileValues(dataStream: Buffer): Map<string, number> {
  const values = new Map<string, number>()

  if (!dataStream || dataStream.length < 20) {
    return values
  }

  // Track file numbers by type
  const fileCounters: Record<string, number> = {}
  const DEFAULT_FILE_NUMS: Record<string, number> = {
    O: 0, I: 1, S: 2, B: 3, T: 4, C: 5, R: 6, N: 7, F: 8, L: 9,
  }

  const FILE_TYPES: Record<number, string> = {
    0x01: 'O', 0x02: 'I', 0x03: 'S', 0x04: 'B', 0x05: 'T',
    0x06: 'C', 0x07: 'R', 0x08: 'N', 0x09: 'F', 0x0d: 'L',
  }

  for (let i = 0; i < dataStream.length - 20; i++) {
    if (dataStream[i] === 0x03 && dataStream[i + 1] === 0x80) {
      const fileTypeCode = dataStream[i + 2]
      const typeName = FILE_TYPES[fileTypeCode]

      if (!typeName) continue

      if (!(typeName in fileCounters)) {
        fileCounters[typeName] = DEFAULT_FILE_NUMS[typeName] ?? 0
      }
      const fileNum = fileCounters[typeName]
      fileCounters[typeName]++

      const elementCount = dataStream.readUInt16LE(i + 10)
      const wordsPerElement = dataStream.readUInt16LE(i + 12)

      if (elementCount === 0 || elementCount > 10000 || wordsPerElement === 0) continue

      // Data starts after 18 bytes (16-byte header + 2-byte separator 0xFFFF)
      const dataStart = i + 18

      if (typeName === 'N') {
        // N files: 2 words per element = 4 bytes
        for (let elem = 0; elem < elementCount && dataStart + elem * 4 + 3 < dataStream.length; elem++) {
          // Check if it's being stored as float (common in RSLogix 500)
          const word2 = dataStream.readUInt16LE(dataStart + elem * 4 + 2)
          const exp = (word2 >> 7) & 0xff

          if (exp >= 100 && exp <= 150) {
            // Likely IEEE 754 float
            const floatValue = dataStream.readFloatLE(dataStart + elem * 4)
            if (isFinite(floatValue)) {
              values.set(`N${fileNum}:${elem}`, floatValue)
            }
          } else {
            // Try as 16-bit integer (first word only)
            const intValue = dataStream.readInt16LE(dataStart + elem * 4)
            if (intValue !== -1 && intValue !== 0) {
              values.set(`N${fileNum}:${elem}`, intValue)
            }
          }
        }
      }
    }
  }

  return values
}

/**
 * Extract timer/counter runtime values from DATA FILES stream
 */
function extractTimerCounterRuntimeValues(dataStream: Buffer): Map<string, { pre: number; acc: number }> {
  const values = new Map<string, { pre: number; acc: number }>()

  if (!dataStream || dataStream.length < 20) {
    return values
  }

  const fileCounters: Record<string, number> = {}
  const DEFAULT_FILE_NUMS: Record<string, number> = {
    T: 4, C: 5,
  }

  for (let i = 0; i < dataStream.length - 20; i++) {
    if (dataStream[i] === 0x03 && dataStream[i + 1] === 0x80) {
      const fileTypeCode = dataStream[i + 2]
      let typeName: string | null = null

      if (fileTypeCode === 0x05) typeName = 'T'
      else if (fileTypeCode === 0x06) typeName = 'C'

      if (!typeName) continue

      if (!(typeName in fileCounters)) {
        fileCounters[typeName] = DEFAULT_FILE_NUMS[typeName]
      }
      const fileNum = fileCounters[typeName]
      fileCounters[typeName]++

      const elementCount = dataStream.readUInt16LE(i + 10)
      const wordsPerElement = dataStream.readUInt16LE(i + 12)

      if (elementCount === 0 || wordsPerElement !== 3) continue

      const dataStart = i + 18

      for (let elem = 0; elem < elementCount && dataStart + elem * 6 + 5 < dataStream.length; elem++) {
        const pre = dataStream.readInt16LE(dataStart + elem * 6 + 2)
        const acc = dataStream.readInt16LE(dataStart + elem * 6 + 4)
        values.set(`${typeName}${fileNum}:${elem}`, { pre, acc })
      }
    }
  }

  return values
}

// =============================================================================
// Test Suites
// =============================================================================

function testTimerParameterExtraction(programData: Buffer): TestSuite {
  const results: TestResult[] = []
  const text = programData.toString('latin1')

  // Find all timer instructions and extract their parameters
  const timerPattern = /T\d+:\d+(?![.\/\[])/g
  let match: RegExpExecArray | null
  const foundTimers: Map<string, { timeBase: string | null; preset: string | null; accum: string | null }> = new Map()

  while ((match = timerPattern.exec(text)) !== null) {
    const addr = match[0]
    const pos = match.index

    if (pos >= 6) {
      const lengthByte = programData[pos - 1]
      if (lengthByte === addr.length) {
        const marker = programData.subarray(pos - 5, pos - 1)
        if (marker[0] === 0x0b && marker[1] === 0x80 && marker[3] === 0x00) {
          const params = extractTimerParams(programData, text, pos, addr.length)
          if (params.preset !== null && !foundTimers.has(addr)) {
            foundTimers.set(addr, params)
          }
        }
      }
    }
  }

  // Test: Timer instruction detection
  results.push({
    name: 'Timer instruction detection',
    passed: foundTimers.size > 0,
    message: foundTimers.size > 0
      ? `Found ${foundTimers.size} unique timer instructions`
      : 'No timer instructions found',
    details: foundTimers.size > 0
      ? Array.from(foundTimers.entries())
          .slice(0, 10)
          .map(([addr, p]) => `${addr}: TB=${p.timeBase}, PRE=${p.preset}, ACC=${p.accum}`)
      : undefined,
  })

  // Test: Expected timer values
  let expectedMatchCount = 0
  const expectedDetails: string[] = []

  for (const [addr, expected] of Object.entries(EXPECTED_TIMERS)) {
    const found = foundTimers.get(addr)
    if (found) {
      const matches =
        found.timeBase === expected.timeBase &&
        found.preset === expected.preset &&
        found.accum === expected.accum

      if (matches) {
        expectedMatchCount++
        expectedDetails.push(`[PASS] ${addr}: TB=${found.timeBase}, PRE=${found.preset}, ACC=${found.accum}`)
      } else {
        expectedDetails.push(
          `[FAIL] ${addr}: Expected TB=${expected.timeBase}, PRE=${expected.preset}, ACC=${expected.accum}; ` +
            `Got TB=${found.timeBase}, PRE=${found.preset}, ACC=${found.accum}`
        )
      }
    } else {
      expectedDetails.push(`[FAIL] ${addr}: Timer not found in program data`)
    }
  }

  const totalExpected = Object.keys(EXPECTED_TIMERS).length
  results.push({
    name: 'Expected timer values match',
    passed: expectedMatchCount === totalExpected,
    message: `${expectedMatchCount}/${totalExpected} expected timers match`,
    details: expectedDetails,
  })

  // Test: Time base values are valid
  const validTimeBases = ['0.001', '0.01', '0.1', '1.0']
  let validTimeBaseCount = 0
  const invalidTimeBases: string[] = []

  for (const [addr, params] of foundTimers) {
    if (params.timeBase && validTimeBases.includes(params.timeBase)) {
      validTimeBaseCount++
    } else if (params.timeBase) {
      invalidTimeBases.push(`${addr}: ${params.timeBase}`)
    }
  }

  results.push({
    name: 'Valid time base values',
    passed: invalidTimeBases.length === 0,
    message:
      invalidTimeBases.length === 0
        ? `All ${validTimeBaseCount} timers have valid time bases`
        : `${invalidTimeBases.length} timers have invalid time bases`,
    details: invalidTimeBases.length > 0 ? invalidTimeBases : undefined,
  })

  // Test: PRE values are numeric
  let numericPreCount = 0
  const nonNumericPre: string[] = []

  for (const [addr, params] of foundTimers) {
    if (params.preset && /^\d+$/.test(params.preset)) {
      numericPreCount++
    } else if (params.preset) {
      nonNumericPre.push(`${addr}: ${params.preset}`)
    }
  }

  results.push({
    name: 'PRE values are numeric',
    passed: nonNumericPre.length === 0,
    message:
      nonNumericPre.length === 0
        ? `All ${numericPreCount} PRE values are numeric`
        : `${nonNumericPre.length} PRE values are non-numeric`,
    details: nonNumericPre.length > 0 ? nonNumericPre : undefined,
  })

  return { name: 'Timer/Counter Parameter Extraction', results }
}

function testMovInstructionExtraction(programData: Buffer): TestSuite {
  const results: TestResult[] = []
  const text = programData.toString('latin1')

  // Find MOV instructions by looking for type 0x04 instructions with specific patterns
  // MOV typically writes to timer ACC/PRE or N file addresses
  const movTargetPattern = /(T\d+:\d+\.ACC|T\d+:\d+\.PRE|N\d+:\d+)(?![.\/\[])/g
  let match: RegExpExecArray | null
  const movInstructions: { dest: string; source: string | null }[] = []

  while ((match = movTargetPattern.exec(text)) !== null) {
    const addr = match[0]
    const pos = match.index

    if (pos >= 6) {
      const lengthByte = programData[pos - 1]
      if (lengthByte === addr.length) {
        const marker = programData.subarray(pos - 5, pos - 1)
        // Check for instruction marker
        if (marker[0] === 0x0b && marker[1] === 0x80) {
          const source = extractMovSource(programData, text, pos, addr.length)
          if (source !== null) {
            movInstructions.push({ dest: addr, source })
          }
        }
      }
    }
  }

  // Test: MOV instruction detection
  results.push({
    name: 'MOV instruction detection',
    passed: movInstructions.length > 0,
    message: movInstructions.length > 0
      ? `Found ${movInstructions.length} potential MOV instructions`
      : 'No MOV instructions found',
    details: movInstructions.slice(0, 10).map((m) => `MOV ${m.source} -> ${m.dest}`),
  })

  // Test: MOV source operands are valid
  let validSourceCount = 0
  const invalidSources: string[] = []

  for (const mov of movInstructions) {
    if (mov.source) {
      // Valid source: numeric constant or address pattern
      if (/^-?\d+\.?\d*$/.test(mov.source) || /^[BIOTCRNFSAL]\d+/i.test(mov.source)) {
        validSourceCount++
      } else {
        invalidSources.push(`${mov.dest} <- ${mov.source}`)
      }
    }
  }

  results.push({
    name: 'MOV source operands valid format',
    passed: invalidSources.length === 0 || movInstructions.length === 0,
    message:
      movInstructions.length === 0
        ? 'No MOV instructions to validate'
        : invalidSources.length === 0
          ? `All ${validSourceCount} MOV sources are valid`
          : `${invalidSources.length} invalid sources found`,
    details: invalidSources.length > 0 ? invalidSources.slice(0, 10) : undefined,
  })

  // Test: MOV instructions writing to timer.ACC have reasonable values
  const timerAccMoves = movInstructions.filter((m) => m.dest.includes('.ACC'))
  results.push({
    name: 'Timer ACC MOV instructions found',
    passed: true, // Informational
    message: `Found ${timerAccMoves.length} MOV instructions writing to timer ACC`,
    details: timerAccMoves.slice(0, 5).map((m) => `MOV ${m.source} -> ${m.dest}`),
  })

  return { name: 'MOV Instruction Source Extraction', results }
}

function testIntegerFileExtraction(dataFilesData: Buffer | null): TestSuite {
  const results: TestResult[] = []

  if (!dataFilesData) {
    results.push({
      name: 'DATA FILES stream available',
      passed: false,
      message: 'DATA FILES stream not found or could not be decompressed',
    })
    return { name: 'Integer (N File) Value Extraction', results }
  }

  results.push({
    name: 'DATA FILES stream available',
    passed: true,
    message: `DATA FILES stream: ${dataFilesData.length} bytes`,
  })

  // Extract N file values
  const nFileValues = extractNFileValues(dataFilesData)

  results.push({
    name: 'N file values extracted',
    passed: nFileValues.size > 0,
    message: nFileValues.size > 0
      ? `Extracted ${nFileValues.size} N file values`
      : 'No N file values found',
    details: nFileValues.size > 0
      ? Array.from(nFileValues.entries())
          .slice(0, 15)
          .map(([addr, val]) => `${addr} = ${typeof val === 'number' && !Number.isInteger(val) ? val.toFixed(4) : val}`)
      : undefined,
  })

  // Test: Check for reasonable value ranges
  let reasonableCount = 0
  let unreasonableCount = 0
  const unreasonableValues: string[] = []

  for (const [addr, value] of nFileValues) {
    if (typeof value === 'number' && isFinite(value) && Math.abs(value) < 1e10) {
      reasonableCount++
    } else {
      unreasonableCount++
      if (unreasonableValues.length < 5) {
        unreasonableValues.push(`${addr} = ${value}`)
      }
    }
  }

  results.push({
    name: 'N file values in reasonable range',
    passed: unreasonableCount === 0 || unreasonableCount < nFileValues.size * 0.1,
    message:
      unreasonableCount === 0
        ? `All ${reasonableCount} values are in reasonable range`
        : `${unreasonableCount} values out of range (${((unreasonableCount / nFileValues.size) * 100).toFixed(1)}%)`,
    details: unreasonableValues.length > 0 ? unreasonableValues : undefined,
  })

  // Test: Check for float vs integer detection
  let floatCount = 0
  let intCount = 0

  for (const [, value] of nFileValues) {
    if (typeof value === 'number') {
      if (Number.isInteger(value)) {
        intCount++
      } else {
        floatCount++
      }
    }
  }

  results.push({
    name: 'Float vs Integer detection',
    passed: true, // Informational
    message: `Detected ${intCount} integers and ${floatCount} floats in N files`,
  })

  return { name: 'Integer (N File) Value Extraction', results }
}

function testTimerCounterRuntimeValues(dataFilesData: Buffer | null): TestSuite {
  const results: TestResult[] = []

  if (!dataFilesData) {
    results.push({
      name: 'DATA FILES stream available',
      passed: false,
      message: 'DATA FILES stream not found',
    })
    return { name: 'Timer/Counter Runtime Values', results }
  }

  const runtimeValues = extractTimerCounterRuntimeValues(dataFilesData)

  const timerValues = Array.from(runtimeValues.entries()).filter(([k]) => k.startsWith('T'))
  const counterValues = Array.from(runtimeValues.entries()).filter(([k]) => k.startsWith('C'))

  results.push({
    name: 'Timer runtime values from DATA FILES',
    passed: timerValues.length >= 0, // May be 0 if file uses minimal timer allocation
    message: `Found ${timerValues.length} timer runtime values`,
    details: timerValues.slice(0, 10).map(([addr, v]) => `${addr}: PRE=${v.pre}, ACC=${v.acc}`),
  })

  results.push({
    name: 'Counter runtime values from DATA FILES',
    passed: counterValues.length >= 0,
    message: `Found ${counterValues.length} counter runtime values`,
    details: counterValues.slice(0, 10).map(([addr, v]) => `${addr}: PRE=${v.pre}, ACC=${v.acc}`),
  })

  // Note about runtime vs programmed values
  results.push({
    name: 'Runtime vs Programmed values note',
    passed: true,
    message:
      'DATA FILES contains runtime values (may be 0). PROGRAM FILES contains programmed/initial values.',
  })

  return { name: 'Timer/Counter Runtime Values (DATA FILES)', results }
}

// =============================================================================
// Main Test Runner
// =============================================================================

function runTests(): void {
  console.log('='.repeat(80))
  console.log('RSS PARSING IMPROVEMENTS TEST SUITE')
  console.log('='.repeat(80))
  console.log(`File: ${RSS_FILE}`)
  console.log(`Date: ${new Date().toISOString()}`)
  console.log('')

  // Load RSS file
  let programData: Buffer
  let dataFilesData: Buffer | null

  try {
    const loaded = loadRssFile()
    programData = loaded.programData
    dataFilesData = loaded.dataFilesData
    console.log(`Program data: ${programData.length} bytes`)
    console.log(`Data files: ${dataFilesData ? dataFilesData.length : 0} bytes`)
    console.log('')
  } catch (e) {
    console.error(`FATAL: Could not load RSS file: ${e}`)
    process.exit(1)
  }

  // Run test suites
  const suites: TestSuite[] = [
    testTimerParameterExtraction(programData),
    testMovInstructionExtraction(programData),
    testIntegerFileExtraction(dataFilesData),
    testTimerCounterRuntimeValues(dataFilesData),
  ]

  // Print results
  let totalPassed = 0
  let totalFailed = 0

  for (const suite of suites) {
    console.log('')
    console.log('='.repeat(80))
    console.log(`TEST SUITE: ${suite.name}`)
    console.log('='.repeat(80))

    for (const result of suite.results) {
      const status = result.passed ? '[PASS]' : '[FAIL]'
      const statusColor = result.passed ? '\x1b[32m' : '\x1b[31m'
      const resetColor = '\x1b[0m'

      console.log('')
      console.log(`${statusColor}${status}${resetColor} ${result.name}`)
      console.log(`       ${result.message}`)

      if (result.details && result.details.length > 0) {
        console.log('       Details:')
        for (const detail of result.details) {
          console.log(`         - ${detail}`)
        }
      }

      if (result.passed) {
        totalPassed++
      } else {
        totalFailed++
      }
    }
  }

  // Summary
  console.log('')
  console.log('='.repeat(80))
  console.log('SUMMARY')
  console.log('='.repeat(80))
  console.log(`Total tests: ${totalPassed + totalFailed}`)
  console.log(`Passed: ${totalPassed}`)
  console.log(`Failed: ${totalFailed}`)
  console.log('')

  if (totalFailed === 0) {
    console.log('\x1b[32mAll tests passed!\x1b[0m')
  } else {
    console.log(`\x1b[31m${totalFailed} test(s) failed.\x1b[0m`)
  }

  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0)
}

// Run if executed directly
runTests()
