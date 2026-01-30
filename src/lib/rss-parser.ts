/**
 * RSLogix 500 (.RSS) File Parser
 *
 * Parses SLC 500/MicroLogix ladder logic files.
 * RSS files are OLE compound documents with zlib-compressed program data.
 */

import CFB from 'cfb'
import { inflateSync, inflateRawSync, gunzipSync } from 'zlib'
import type { PlcProject, PlcProgram, PlcRoutine, PlcRung, PlcInstruction, PlcTag, PlcTimerProgramValue, PlcCounterProgramValue } from './l5x-parser'

/**
 * Try multiple decompression methods on data
 */
function tryDecompress(data: Buffer, expectedSize?: number): Buffer | null {
  // Try at multiple offsets (0, 16, etc.) with multiple methods
  const offsets = [0, 16]
  const methods = [
    { name: 'zlib', fn: (d: Buffer) => inflateSync(d) },
    { name: 'raw deflate', fn: (d: Buffer) => inflateRawSync(d) },
    { name: 'gzip', fn: (d: Buffer) => gunzipSync(d) },
  ]

  for (const offset of offsets) {
    if (offset >= data.length) continue
    const slice = offset > 0 ? data.subarray(offset) : data

    for (const method of methods) {
      try {
        const result = method.fn(slice)
        // If we got expected size, this is likely correct
        if (expectedSize && result.length === expectedSize) {
          console.log(`[RSS Parser] Decompressed with ${method.name} at offset ${offset}: ${result.length} bytes (matches expected)`)
          return result
        }
        // If result is significantly larger than input, likely successful decompression
        if (result.length > slice.length * 1.5) {
          console.log(`[RSS Parser] Decompressed with ${method.name} at offset ${offset}: ${result.length} bytes`)
          return result
        }
      } catch {
        // Method didn't work, try next
      }
    }
  }

  return null
}

// RSLogix 500 data file type prefixes
export const RSS500_FILE_TYPES: Record<string, { name: string; description: string }> = {
  'O': { name: 'Output', description: 'Physical outputs' },
  'I': { name: 'Input', description: 'Physical inputs' },
  'S': { name: 'Status', description: 'Processor status' },
  'B': { name: 'Binary', description: 'Bit storage' },
  'T': { name: 'Timer', description: 'Timer storage' },
  'C': { name: 'Counter', description: 'Counter storage' },
  'R': { name: 'Control', description: 'Control structures' },
  'N': { name: 'Integer', description: 'Integer storage' },
  'F': { name: 'Float', description: 'Floating point' },
  'ST': { name: 'String', description: 'String storage' },
  'A': { name: 'ASCII', description: 'ASCII data' },
  'D': { name: 'BCD', description: 'Binary coded decimal' },
  'L': { name: 'Long', description: 'Long integer (32-bit)' },
  'MG': { name: 'Message', description: 'Message control' },
  'PD': { name: 'PID', description: 'PID control' },
  'SC': { name: 'SFC', description: 'Sequential function chart' },
}

// Timer/Counter subfield meanings
const TIMER_COUNTER_SUBFIELDS: Record<string, string> = {
  '.DN': 'Done',
  '.TT': 'Timer Timing',
  '.EN': 'Enable',
  '.PRE': 'Preset',
  '.ACC': 'Accumulated',
  '.OV': 'Overflow',
  '.UN': 'Underflow',
  '.CU': 'Count Up',
  '.CD': 'Count Down',
  '.ER': 'Error',
  '.FD': 'Found',
  '.IN': 'Inhibit',
  '.LEN': 'Length',
  '.POS': 'Position',
}

// Symbol table type for address-to-name mappings
export interface RssSymbol {
  symbol: string
  description: string
}

// Global symbol table extracted from RSS file
let symbolTable: Map<string, RssSymbol> = new Map()

// Global data table values extracted from RSS file (address -> numeric value)
let dataTableValues: Map<string, number> = new Map()

// Timer/counter values extracted from PROGRAM FILES instruction parameters
// These are the programmed initial values, more reliable than DATA FILES runtime values
export interface ProgramTimerValue {
  timeBase: number    // Time base in seconds (0.001, 0.01, 0.1, or 1.0)
  preset: number      // PRE value
  accum: number       // ACC value (initial/programmed)
}

export interface ProgramCounterValue {
  preset: number      // PRE value
  accum: number       // ACC value (initial/programmed)
}

let programTimerValues: Map<string, ProgramTimerValue> = new Map()
let programCounterValues: Map<string, ProgramCounterValue> = new Map()

/**
 * Get the symbol table (for use by other modules)
 */
export function getSymbolTable(): Map<string, RssSymbol> {
  return symbolTable
}

/**
 * Get the data table values (for use by other modules)
 */
export function getDataTableValues(): Map<string, number> {
  return dataTableValues
}

/**
 * Get timer values extracted from PROGRAM FILES instruction parameters
 * These are the programmed initial values (timeBase, PRE, ACC)
 * More reliable than DATA FILES runtime values for simulation initialization
 */
export function getProgramTimerValues(): Map<string, ProgramTimerValue> {
  return programTimerValues
}

/**
 * Get counter values extracted from PROGRAM FILES instruction parameters
 * These are the programmed initial values (PRE, ACC)
 * More reliable than DATA FILES runtime values for simulation initialization
 */
export function getProgramCounterValues(): Map<string, ProgramCounterValue> {
  return programCounterValues
}

/**
 * Look up a timer's programmed values by address (e.g., "T4:0")
 * Returns timeBase (seconds), preset, and initial accumulator
 */
export function lookupProgramTimerValue(address: string): ProgramTimerValue | undefined {
  const normalized = normalizeAddress(address)
  return programTimerValues.get(normalized) ?? programTimerValues.get(address)
}

/**
 * Look up a counter's programmed values by address (e.g., "C5:0")
 * Returns preset and initial accumulator
 */
export function lookupProgramCounterValue(address: string): ProgramCounterValue | undefined {
  const normalized = normalizeAddress(address)
  return programCounterValues.get(normalized) ?? programCounterValues.get(address)
}

/**
 * Look up a symbol for an address
 */
export function lookupSymbol(address: string): RssSymbol | undefined {
  // Normalize address for lookup (remove leading zeros, standardize format)
  const normalized = normalizeAddress(address)
  return symbolTable.get(normalized) || symbolTable.get(address)
}

/**
 * Look up a data value for an address
 */
export function lookupDataValue(address: string): number | undefined {
  const normalized = normalizeAddress(address)
  return dataTableValues.get(normalized) ?? dataTableValues.get(address)
}

/**
 * Normalize an address format
 * B0003:002/02 -> B3:2/2
 * B3:2/2 -> B3:2/2 (already normalized)
 */
function normalizeAddress(addr: string): string {
  // Handle format like B0003:002/02 -> B3:2/2
  const match = addr.match(/^([A-Z]+)0*(\d+):0*(\d+)(\/0*(\d+))?(\.[A-Z]+)?$/i)
  if (match) {
    let result = `${match[1].toUpperCase()}${parseInt(match[2])}:${parseInt(match[3])}`
    if (match[5]) result += `/${parseInt(match[5])}`
    if (match[6]) result += match[6].toUpperCase()
    return result
  }
  return addr.toUpperCase()
}

/**
 * Extract symbol table from MEM DATABASE stream in RSS file
 * Symbols are stored as: [len][addr][len][symbol][len][desc1][len][desc2]...
 */
function extractSymbolTable(cfb: CFB.CFB$Container): Map<string, RssSymbol> {
  const symbols = new Map<string, RssSymbol>()

  try {
    const entry = CFB.find(cfb, 'Root Entry/MEM DATABASE/ObjectData')
    if (!entry || !entry.content || entry.content.length === 0) {
      console.log('[RSS Parser] No MEM DATABASE/ObjectData stream found')
      return symbols
    }

    const content = Buffer.from(entry.content)
    let memData: Buffer

    try {
      memData = inflateSync(content.subarray(16))
    } catch {
      console.log('[RSS Parser] Could not decompress MEM DATABASE')
      return symbols
    }

    // Scan for address patterns followed by symbols
    for (let i = 0; i < memData.length - 20; i++) {
      const len1 = memData[i]
      if (len1 >= 8 && len1 <= 20) {
        const addrBytes = memData.subarray(i + 1, i + 1 + len1)
        const addr = Buffer.from(addrBytes).toString('latin1')

        // Match patterns like B0003:002/02, N0007:005, T0004:007
        if (/^[BNTCIOFSR]\d{4}:\d{3}(\/\d{2})?(\.[A-Z]+)?$/.test(addr)) {
          const symbolLen = memData[i + 1 + len1]
          if (symbolLen >= 2 && symbolLen <= 30) {
            const symbolBytes = memData.subarray(i + 2 + len1, i + 2 + len1 + symbolLen)
            const symbol = Buffer.from(symbolBytes).toString('latin1')

            // Check if it looks like a valid symbol
            if (/^[A-Z][A-Z0-9_]*$/i.test(symbol)) {
              const normalAddr = normalizeAddress(addr)

              // Get description parts
              const descParts: string[] = []
              let pos = i + 2 + len1 + symbolLen
              for (let d = 0; d < 4 && pos < memData.length - 1; d++) {
                const descLen = memData[pos]
                if (descLen >= 1 && descLen <= 30) {
                  const descBytes = memData.subarray(pos + 1, pos + 1 + descLen)
                  const desc = Buffer.from(descBytes).toString('latin1')
                  if (/^[\x20-\x7E]+$/.test(desc)) {
                    descParts.push(desc)
                    pos += 1 + descLen
                  } else {
                    break
                  }
                } else {
                  break
                }
              }

              symbols.set(normalAddr, {
                symbol,
                description: descParts.join(' ').trim()
              })
            }
          }
        }
      }
    }

    console.log(`[RSS Parser] Extracted ${symbols.size} symbols from MEM DATABASE`)
  } catch (e) {
    console.log('[RSS Parser] Error extracting symbols:', e)
  }

  return symbols
}

/**
 * Extract data table values from DATA FILES stream
 *
 * RSS DATA FILES structure:
 * - Files are stored sequentially with headers containing type and element count
 * - File numbers are assigned based on order within each type
 * - Default starting numbers: O=0, I=1, S=2, B=3, T=4, C=5, R=6, N=7, F=8
 *
 * Header format at each 0x03 0x80 marker:
 * - Byte 2: File type (0x08=N, 0x09=F, etc.)
 * - Bytes 10-11: Element count (16-bit LE)
 * - Bytes 12-13: Words per element
 * - Data follows after 16-byte header
 */
function extractDataTableValues(dataFilesStream: Buffer): Map<string, number> {
  const values = new Map<string, number>()

  if (!dataFilesStream || dataFilesStream.length < 20) {
    return values
  }

  console.log(`[RSS Parser] Extracting data table values from ${dataFilesStream.length} bytes`)

  // File type codes
  const FILE_TYPES: Record<number, string> = {
    0x01: 'O', 0x02: 'I', 0x03: 'S', 0x04: 'B', 0x05: 'T',
    0x06: 'C', 0x07: 'R', 0x08: 'N', 0x09: 'F', 0x0D: 'L'
  }

  // Default starting file numbers by type (RSLogix 500 standard)
  const DEFAULT_FILE_NUMS: Record<string, number> = {
    'O': 0, 'I': 1, 'S': 2, 'B': 3, 'T': 4, 'C': 5, 'R': 6, 'N': 7, 'F': 8, 'L': 9
  }

  // Track file numbers by type as we encounter them
  const fileCounters: Record<string, number> = {}

  // Scan for file headers (0x03 0x80 marker)
  for (let i = 0; i < dataFilesStream.length - 20; i++) {
    if (dataFilesStream[i] === 0x03 && dataFilesStream[i + 1] === 0x80) {
      const fileTypeCode = dataFilesStream[i + 2]
      const typeName = FILE_TYPES[fileTypeCode]

      if (!typeName) continue

      // Determine file number based on order of appearance
      if (!(typeName in fileCounters)) {
        fileCounters[typeName] = DEFAULT_FILE_NUMS[typeName] ?? 0
      }
      const fileNum = fileCounters[typeName]
      fileCounters[typeName]++

      // Get element count and words per element from header
      const elementCount = dataFilesStream.readUInt16LE(i + 10)
      const wordsPerElement = dataFilesStream.readUInt16LE(i + 12)

      // Skip invalid entries
      if (elementCount === 0 || elementCount > 10000 || wordsPerElement === 0) continue

      // Data starts after 16-byte header
      const dataStart = i + 16

      // Extract values based on file type
      if (typeName === 'N') {
        // Integer file: structure varies - try to extract sensible values
        // RSLogix 500 N files store 16-bit integers, but the binary structure
        // may include metadata. We'll read values and only store "reasonable" ones.
        let validCount = 0
        for (let elem = 0; elem < elementCount && dataStart + elem * wordsPerElement * 2 + 1 < dataFilesStream.length; elem++) {
          const value = dataFilesStream.readInt16LE(dataStart + elem * wordsPerElement * 2)
          // Only store values that look like valid program data
          // Skip -1 (0xFFFF, often means "empty") and very large values that look like garbage
          if (value !== -1 && Math.abs(value) < 32000) {
            const addr = `N${fileNum}:${elem}`
            values.set(addr, value)
            validCount++
          }
        }
        if (validCount > 0) {
          console.log(`[RSS Parser] Extracted N${fileNum}: ${validCount} valid values`)
        }
      } else if (typeName === 'F') {
        // Float file: 32-bit IEEE floats
        let validCount = 0
        for (let elem = 0; elem < elementCount && dataStart + elem * 4 + 3 < dataFilesStream.length; elem++) {
          const value = dataFilesStream.readFloatLE(dataStart + elem * 4)
          // Only store finite values that look like valid program data
          if (isFinite(value) && Math.abs(value) < 1e10) {
            const addr = `F${fileNum}:${elem}`
            values.set(addr, value)
            validCount++
          }
        }
        if (validCount > 0) {
          console.log(`[RSS Parser] Extracted F${fileNum}: ${validCount} valid values`)
        }
      } else if (typeName === 'T') {
        // Timer file: 3 words per element (control, PRE, ACC)
        for (let elem = 0; elem < elementCount && dataStart + elem * 6 + 5 < dataFilesStream.length; elem++) {
          const preset = dataFilesStream.readInt16LE(dataStart + elem * 6 + 2)
          const accum = dataFilesStream.readInt16LE(dataStart + elem * 6 + 4)
          values.set(`T${fileNum}:${elem}.PRE`, preset)
          values.set(`T${fileNum}:${elem}.ACC`, accum)
        }
        if (elementCount > 0) {
          console.log(`[RSS Parser] Extracted T${fileNum}: ${elementCount} timers`)
        }
      } else if (typeName === 'C') {
        // Counter file: 3 words per element (control, PRE, ACC)
        for (let elem = 0; elem < elementCount && dataStart + elem * 6 + 5 < dataFilesStream.length; elem++) {
          const preset = dataFilesStream.readInt16LE(dataStart + elem * 6 + 2)
          const accum = dataFilesStream.readInt16LE(dataStart + elem * 6 + 4)
          values.set(`C${fileNum}:${elem}.PRE`, preset)
          values.set(`C${fileNum}:${elem}.ACC`, accum)
        }
        if (elementCount > 0) {
          console.log(`[RSS Parser] Extracted C${fileNum}: ${elementCount} counters`)
        }
      }
    }
  }

  console.log(`[RSS Parser] Total data values extracted: ${values.size}`)

  // Log sample values
  const sampleN = [...values.entries()].filter(([k]) => k.startsWith('N')).slice(0, 5)
  const sampleF = [...values.entries()].filter(([k]) => k.startsWith('F')).slice(0, 5)
  if (sampleN.length > 0) {
    console.log(`[RSS Parser] Sample N values: ${sampleN.map(([k, v]) => `${k}=${v}`).join(', ')}`)
  }
  if (sampleF.length > 0) {
    console.log(`[RSS Parser] Sample F values: ${sampleF.map(([k, v]) => `${k}=${v.toFixed(2)}`).join(', ')}`)
  }

  return values
}

// RSLogix 500 instruction opcodes - decoded from binary analysis
// Format: [type byte][0b][80][01][00][length][address]
// The low 2 bits encode the base instruction type:
//   0x00 = XIC (Examine If Closed)
//   0x01 = XIO (Examine If Open)
//   0x02 = OTL (Output Latch)
//   0x03 = OTE (Output Energize)
// Higher bits may encode branch position or other structural info

/**
 * Extract a constant value (stored as length-prefixed ASCII) from binary data
 * Pattern: [length byte][ASCII digits]
 * Example: 03 33 30 30 = length 3 + "300"
 * Returns null if no valid constant found
 */
function extractConstantValue(data: Buffer, searchEndPos: number, maxSearchBytes: number = 30): string | null {
  // Search backwards from the position looking for length-prefixed ASCII numbers
  const searchStart = Math.max(0, searchEndPos - maxSearchBytes)

  for (let pos = searchEndPos - 1; pos >= searchStart; pos--) {
    const lengthByte = data[pos]

    // Valid constant lengths are 1-10 digits
    if (lengthByte >= 1 && lengthByte <= 10 && pos + lengthByte < searchEndPos) {
      // Check if the following bytes are all ASCII digits (0x30-0x39)
      let isValidConstant = true
      let constantValue = ''

      for (let i = 1; i <= lengthByte; i++) {
        const charByte = data[pos + i]
        if (charByte >= 0x30 && charByte <= 0x39) {
          constantValue += String.fromCharCode(charByte)
        } else {
          isValidConstant = false
          break
        }
      }

      if (isValidConstant && constantValue.length === lengthByte) {
        // Verify it's a valid number
        const numValue = parseInt(constantValue, 10)
        if (!isNaN(numValue)) {
          return constantValue
        }
      }
    }
  }

  return null
}

/**
 * Extract Source A operand for comparison/math instructions
 * Looks backwards for either a previous address marker or a constant
 * Returns the source operand (address string or constant) or null
 */
function extractSourceAOperand(data: Buffer, text: string, currentAddrPos: number, maxSearchBytes: number = 50): string | null {
  const searchStart = Math.max(0, currentAddrPos - maxSearchBytes)

  // First, look for another address marker (0b 80 XX 00) before this one
  for (let pos = currentAddrPos - 10; pos >= searchStart; pos--) {
    if (data[pos] === 0x0b && data[pos + 1] === 0x80 && data[pos + 3] === 0x00) {
      // Found a marker - extract the address
      const addrLength = data[pos + 4]
      if (addrLength > 0 && addrLength < 20 && pos + 5 + addrLength <= currentAddrPos) {
        const addrText = text.substring(pos + 5, pos + 5 + addrLength)
        // Validate it looks like an SLC address
        if (/^[BIOTCRNFSAL]\d+/i.test(addrText)) {
          return addrText.toUpperCase()
        }
      }
    }
  }

  // If no address found, look for a constant
  // Constants appear as length-prefixed ASCII digits
  const constant = extractConstantValue(data, currentAddrPos - 5, maxSearchBytes)
  if (constant) {
    return constant
  }

  return null
}

/**
 * Extract timer parameters (time base, preset, accumulated) from binary data
 *
 * Timer instruction binary pattern (from research):
 * [0x0b 0x80] [type=0x04] [0x00] [len] [address] [len] [timebase] [len] [preset] [len] [accum]
 *
 * Example: T4:14 with 0.01s time base, 300 preset, 0 accumulated:
 *   0b 80 04 XX 05 54 34 3a 31 34  04 30 2e 30 31  03 33 30 30  01 30
 *                  T  4  :  1  4   [4] "0.01"      [3] "300"    [1] "0"
 *
 * Valid time bases: "0.001" (1ms), "0.01" (10ms), "0.1" (100ms), "1.0" (1s)
 * PRE/ACC are integer strings (max 32767 due to 16-bit signed limit)
 */
function extractTimerParams(data: Buffer, text: string, timerAddrPos: number, timerAddrLen: number): { timeBase: string | null, preset: string | null, accum: string | null } {
  const afterPos = timerAddrPos + timerAddrLen
  // Timer parameters appear immediately after the address, within ~30 bytes
  const maxSearch = 30

  const params: string[] = []

  let pos = afterPos
  while (params.length < 3 && pos < afterPos + maxSearch && pos < data.length - 1) {
    const len = data[pos]
    // Valid parameter lengths: 1-10 characters
    // Time base: 3-5 chars ("1.0", "0.01", "0.001", "0.1")
    // PRE/ACC: 1-5 chars (up to 32767)
    if (len >= 1 && len <= 10 && pos + len < data.length) {
      let isValid = true
      let value = ''
      for (let i = 1; i <= len; i++) {
        const c = data[pos + i]
        // Allow digits (0x30-0x39) and decimal point (0x2e)
        if ((c >= 0x30 && c <= 0x39) || c === 0x2e) {
          value += String.fromCharCode(c)
        } else {
          isValid = false
          break
        }
      }

      // Validate the extracted value
      if (isValid && value.length === len) {
        if (params.length === 0) {
          // First param is time base - must be a valid time base value
          // Valid: 0.001, 0.01, 0.1, 1.0 (and variations like "1" for 1.0)
          if (/^(0\.001|0\.01|0\.1|1\.0|1)$/.test(value)) {
            params.push(value)
            pos += len + 1
            continue
          }
          // Also accept other decimal values as time base (some programs may use non-standard)
          if (/^\d+\.?\d*$/.test(value) && parseFloat(value) <= 10) {
            params.push(value)
            pos += len + 1
            continue
          }
        } else {
          // PRE and ACC must be integers
          if (/^\d+$/.test(value)) {
            const numValue = parseInt(value, 10)
            // Valid range for 16-bit signed: 0 to 32767 (negative values unlikely for PRE/ACC)
            if (numValue >= 0 && numValue <= 32767) {
              params.push(value)
              pos += len + 1
              continue
            }
          }
        }
      }
    }
    pos++
  }

  return {
    timeBase: params[0] || null,
    preset: params[1] || null,
    accum: params[2] || null
  }
}

/**
 * Extract counter parameters (preset, accumulated) from binary data
 *
 * Counter instruction binary pattern (from research):
 * [0x0b 0x80] [type] [0x00] [len] [address] [len] [preset] [len] [accum]
 *
 * Example: C5:0 with preset 100, accumulated 0:
 *   0b 80 XX 00 04 43 35 3a 30  03 31 30 30  01 30
 *               C  5  :  0      [3] "100"   [1] "0"
 *
 * PRE/ACC are integer strings (max 32767 due to 16-bit signed limit)
 */
function extractCounterParams(data: Buffer, text: string, counterAddrPos: number, counterAddrLen: number): { preset: string | null, accum: string | null } {
  const afterPos = counterAddrPos + counterAddrLen
  // Counter parameters appear immediately after the address, within ~20 bytes
  const maxSearch = 20

  const params: string[] = []

  let pos = afterPos
  while (params.length < 2 && pos < afterPos + maxSearch && pos < data.length - 1) {
    const len = data[pos]
    // Valid parameter lengths: 1-5 characters (up to 32767)
    if (len >= 1 && len <= 5 && pos + len < data.length) {
      let isValid = true
      let value = ''
      for (let i = 1; i <= len; i++) {
        const c = data[pos + i]
        // Counter params are integers only (0x30-0x39)
        if (c >= 0x30 && c <= 0x39) {
          value += String.fromCharCode(c)
        } else {
          isValid = false
          break
        }
      }

      // Validate: must be an integer within 16-bit signed range
      if (isValid && value.length === len && /^\d+$/.test(value)) {
        const numValue = parseInt(value, 10)
        if (numValue >= 0 && numValue <= 32767) {
          params.push(value)
          pos += len + 1
          continue
        }
      }
    }
    pos++
  }

  return {
    preset: params[0] || null,
    accum: params[1] || null
  }
}

/**
 * Extract a length-prefixed ASCII value AFTER a given position
 * Pattern: [length byte][ASCII characters]
 * Supports integers, floats, and address references
 * Returns { value, nextPos } or null if no valid value found
 */
function extractLengthPrefixedValue(data: Buffer, startPos: number): { value: string, nextPos: number } | null {
  if (startPos >= data.length) return null

  const lengthByte = data[startPos]

  // Valid lengths: 1-20 characters (addresses can be longer than numbers)
  if (lengthByte < 1 || lengthByte > 20 || startPos + lengthByte >= data.length) {
    return null
  }

  let value = ''
  let isValid = true

  for (let i = 1; i <= lengthByte; i++) {
    const charByte = data[startPos + i]
    // Allow printable ASCII: digits, letters, decimal point, colon, slash, minus, brackets
    if ((charByte >= 0x30 && charByte <= 0x39) ||  // 0-9
        (charByte >= 0x41 && charByte <= 0x5A) ||  // A-Z
        (charByte >= 0x61 && charByte <= 0x7A) ||  // a-z
        charByte === 0x2E ||  // .
        charByte === 0x3A ||  // :
        charByte === 0x2F ||  // /
        charByte === 0x2D ||  // -
        charByte === 0x5B ||  // [
        charByte === 0x5D ||  // ]
        charByte === 0x23) {  // #
      value += String.fromCharCode(charByte)
    } else {
      isValid = false
      break
    }
  }

  if (isValid && value.length === lengthByte) {
    return { value, nextPos: startPos + lengthByte + 1 }
  }

  return null
}

/**
 * Check if a string looks like an SLC-500 address
 */
function isSlcAddress(value: string): boolean {
  // Standard addresses: B3:0/15, N7:5, T4:0.DN, F8:36, etc.
  // Indirect: N200:[N200:35], #N210:[N200:40]
  return /^#?[BIOTCRNFSAL]\d+:(\d+|\[[^\]]+\])(\/\d+)?(\.[A-Z]+)?$/i.test(value)
}

/**
 * Check if a string looks like a numeric constant (integer or float)
 */
function isNumericConstant(value: string): boolean {
  return /^-?\d+\.?\d*$/.test(value)
}

/**
 * Extract MOV source operand AFTER the destination address
 * Research finding: Source operands come AFTER the destination in MOV instructions
 * Pattern: [dest_addr] ... [len][source_value]
 * Returns the source value (address or constant) or null
 */
function extractMovSourceAfterDest(data: Buffer, text: string, destAddrEndPos: number, maxSearchBytes: number = 50): string | null {
  const searchEnd = Math.min(data.length, destAddrEndPos + maxSearchBytes)

  // Scan for length-prefixed values after the destination
  // Skip initial metadata bytes - source operands typically appear after some control bytes
  for (let pos = destAddrEndPos; pos < searchEnd; pos++) {
    const result = extractLengthPrefixedValue(data, pos)
    if (result) {
      const { value, nextPos } = result

      // Check if this is an address reference
      if (isSlcAddress(value)) {
        console.log(`[RSS Parser] MOV source address found AFTER dest at pos ${pos}: ${value}`)
        return value.toUpperCase()
      }

      // Check if this is a numeric constant
      if (isNumericConstant(value)) {
        // Skip single digit "0" values that are likely metadata/status bytes
        // Real source constants usually have more significance
        const numVal = parseFloat(value)
        if (value.length > 1 || numVal !== 0) {
          console.log(`[RSS Parser] MOV source constant found AFTER dest at pos ${pos}: ${value}`)
          return value
        }
      }

      // Move past this value
      pos = nextPos - 1  // -1 because loop will increment
    }
  }

  return null
}

/**
 * Extract math instruction operands (ADD/SUB/MUL/DIV) AFTER the destination address
 *
 * Research findings from program-files-structure.md:
 * - Source operands come AFTER the destination address in the binary
 * - Example: Type0x06 Dest="T4:5.ACC" Operands: [0, 10, 10, N14:0, 10]
 *           -> ADD instruction: ADD(10, N14:0, T4:5.ACC)
 * - Example: Type0x06 Dest="F8:36" Operands: [20.0, F9:34, 4.0, F9:37, 16.0]
 *
 * For math: INST(SourceA, SourceB, Dest) but stored as Dest first, then operands
 * Returns { sourceA, sourceB } or null values if not found
 */
function extractMathOperandsAfterDest(data: Buffer, text: string, destAddrEndPos: number, maxSearchBytes: number = 80): { sourceA: string | null, sourceB: string | null } {
  const searchEnd = Math.min(data.length, destAddrEndPos + maxSearchBytes)
  const foundOperands: { value: string, pos: number, isAddr: boolean }[] = []

  // Scan for length-prefixed values after the destination
  let pos = destAddrEndPos
  while (pos < searchEnd && foundOperands.length < 8) {
    const result = extractLengthPrefixedValue(data, pos)
    if (result) {
      const { value, nextPos } = result

      // Check if this is an address reference
      if (isSlcAddress(value)) {
        foundOperands.push({ value: value.toUpperCase(), pos, isAddr: true })
        console.log(`[RSS Parser] Math operand (address) at pos ${pos}: ${value}`)
      } else if (isNumericConstant(value)) {
        // Include numeric constants
        foundOperands.push({ value, pos, isAddr: false })
        const numVal = parseFloat(value)
        if (value.length > 1 || numVal !== 0) {
          console.log(`[RSS Parser] Math operand (constant) at pos ${pos}: ${value}`)
        }
      }

      pos = nextPos
    } else {
      pos++
    }
  }

  // Filter and identify Source A and Source B
  // Based on research: operands like [0, 10, 10, N14:0, 10] where
  // the meaningful values are "10" (Source A) and "N14:0" (Source B)
  // Leading zeros are often metadata, not operands

  // Strategy: Find the first significant operand (non-zero or address) as Source A
  // and the second significant operand as Source B
  const significantOperands: string[] = []

  for (const op of foundOperands) {
    if (op.isAddr) {
      // Addresses are always significant
      significantOperands.push(op.value)
    } else {
      const numVal = parseFloat(op.value)
      // Non-zero constants or multi-digit zeros (like "10" or "20.0") are significant
      if (numVal !== 0 || op.value.length > 1) {
        significantOperands.push(op.value)
      }
    }

    // Stop after finding 2 significant operands
    if (significantOperands.length >= 2) break
  }

  if (significantOperands.length >= 2) {
    return {
      sourceA: significantOperands[0],
      sourceB: significantOperands[1]
    }
  } else if (significantOperands.length === 1) {
    // Single operand - might be used for both Source A and Source B
    return {
      sourceA: significantOperands[0],
      sourceB: significantOperands[0]
    }
  }

  return { sourceA: null, sourceB: null }
}

/**
 * Extract both Source A and Source B operands for math instructions (ADD, SUB, MUL, DIV)
 * DEPRECATED: This function searches BEFORE the destination, which may be incorrect.
 * Use extractMathOperandsAfterDest as the primary method, with this as fallback.
 *
 * These instructions have format: INST(SourceA, SourceB, Dest)
 * Returns { sourceA, sourceB } or null values if not found
 */
function extractMathOperands(data: Buffer, text: string, destAddrPos: number, maxSearchBytes: number = 80): { sourceA: string | null, sourceB: string | null } {
  const searchStart = Math.max(0, destAddrPos - maxSearchBytes)
  const foundAddresses: { pos: number, addr: string }[] = []

  // Find all address markers in the search region
  for (let pos = searchStart; pos < destAddrPos - 5; pos++) {
    if (data[pos] === 0x0b && data[pos + 1] === 0x80 && data[pos + 3] === 0x00) {
      const addrLength = data[pos + 4]
      if (addrLength > 0 && addrLength < 20 && pos + 5 + addrLength <= destAddrPos) {
        const addrText = text.substring(pos + 5, pos + 5 + addrLength)
        if (/^[BIOTCRNFSAL]\d+/i.test(addrText)) {
          foundAddresses.push({ pos: pos + 5, addr: addrText.toUpperCase() })
        }
      }
    }
  }

  // Also look for constants (including floating point like "16.0")
  const foundConstants: { pos: number, value: string }[] = []
  for (let pos = searchStart; pos < destAddrPos - 5; pos++) {
    const len = data[pos]
    if (len >= 1 && len <= 12 && pos + len < destAddrPos) {
      let isNumeric = true
      let value = ''
      for (let i = 1; i <= len; i++) {
        const c = data[pos + i]
        // Allow digits and decimal point for floating point constants
        if ((c >= 0x30 && c <= 0x39) || c === 0x2e) {
          value += String.fromCharCode(c)
        } else {
          isNumeric = false
          break
        }
      }
      // Validate it's a proper number (integer or float)
      if (isNumeric && value.length === len && /^\d+\.?\d*$/.test(value)) {
        // Make sure it's not part of an address (not followed by : or /)
        const nextByte = data[pos + len + 1]
        if (nextByte !== 0x3a && nextByte !== 0x2f) {
          foundConstants.push({ pos, value })
        }
      }
    }
  }

  // Combine and sort by position
  const allOperands = [
    ...foundAddresses.map(a => ({ pos: a.pos, value: a.addr, type: 'addr' })),
    ...foundConstants.map(c => ({ pos: c.pos, value: c.value, type: 'const' }))
  ].sort((a, b) => a.pos - b.pos)

  // The last two operands before the destination are Source A and Source B
  // Sometimes there's only one (used for both), sometimes Source B is a constant after Source A
  if (allOperands.length >= 2) {
    // Last two are most likely Source A and Source B
    const sourceA = allOperands[allOperands.length - 2].value
    const sourceB = allOperands[allOperands.length - 1].value
    return { sourceA, sourceB }
  } else if (allOperands.length === 1) {
    // Only one operand found - might be used for both or we're missing the constant
    const sourceA = allOperands[0].value
    // Check if there's a constant right after this address
    const addrInfo = foundAddresses.find(a => a.addr === sourceA)
    if (addrInfo) {
      // Look for constant immediately after the address
      for (const c of foundConstants) {
        if (c.pos > addrInfo.pos && c.pos < addrInfo.pos + 20) {
          return { sourceA, sourceB: c.value }
        }
      }
    }
    return { sourceA, sourceB: sourceA } // Default: use same value for both
  }

  return { sourceA: null, sourceB: null }
}

/**
 * Decode SLC 500 opcode to instruction type
 * Based on analysis of 5038 instructions from LANLOGIX_BR.RSS
 */
function decodeOpcode(opcode: number): { type: string; operandCount: number } {
  // Explicit mappings for known instruction types
  // Format: { type, operandCount } where operandCount > 1 means multi-operand instruction
  const explicitMap: Record<number, { type: string; operandCount: number }> = {
    0x05: { type: 'OTU', operandCount: 1 },   // Output Unlatch
    0x06: { type: 'ONS', operandCount: 1 },   // One Shot
    0x07: { type: 'OSR', operandCount: 1 },   // One Shot Rising
    0x08: { type: 'OSF', operandCount: 1 },   // One Shot Falling
    // Math/Move instructions typically have 2-3 operands
    0x09: { type: 'MOV', operandCount: 2 },   // Move
    0x0A: { type: 'ADD', operandCount: 3 },   // Add
    0x0B: { type: 'SUB', operandCount: 3 },   // Subtract
    0x0C: { type: 'MUL', operandCount: 3 },   // Multiply
    0x0D: { type: 'DIV', operandCount: 3 },   // Divide
    // Comparison instructions
    0x10: { type: 'EQU', operandCount: 2 },   // Equal
    0x11: { type: 'NEQ', operandCount: 2 },   // Not Equal
    0x12: { type: 'LES', operandCount: 2 },   // Less Than
    0x13: { type: 'LEQ', operandCount: 2 },   // Less Than or Equal
    0x14: { type: 'GRT', operandCount: 2 },   // Greater Than
    0x15: { type: 'GEQ', operandCount: 2 },   // Greater Than or Equal
  }

  if (explicitMap[opcode]) {
    return explicitMap[opcode]
  }

  // For most opcodes, the low 2 bits encode the base instruction
  const baseType = opcode & 0x03

  switch (baseType) {
    case 0x00: return { type: 'XIC', operandCount: 1 }   // Examine If Closed
    case 0x01: return { type: 'XIO', operandCount: 1 }   // Examine If Open
    case 0x02: return { type: 'OTL', operandCount: 1 }   // Output Latch
    case 0x03: return { type: 'OTE', operandCount: 1 }   // Output Energize
    default: return { type: 'XIC', operandCount: 1 }
  }
}

// File type codes in SLC 500 binary format
const SLC500_FILE_TYPES_BINARY: Record<number, string> = {
  0x01: 'O',   // Output
  0x02: 'I',   // Input
  0x03: 'S',   // Status
  0x04: 'B',   // Binary/Bit
  0x05: 'T',   // Timer
  0x06: 'C',   // Counter
  0x07: 'R',   // Control
  0x08: 'N',   // Integer
  0x09: 'F',   // Float
  0x0A: 'ST',  // String
  0x0B: 'A',   // ASCII
  0x0C: 'D',   // BCD
  0x0D: 'L',   // Long Integer
}

/**
 * Parse an RSS file (RSLogix 500 format)
 */
export async function parseRSS(buffer: ArrayBuffer): Promise<PlcProject> {
  const data = new Uint8Array(buffer)
  const cfb = CFB.read(data, { type: 'array' })

  // Clear global maps from previous parses
  programTimerValues = new Map()
  programCounterValues = new Map()

  // Extract symbol table from MEM DATABASE (contains address-to-name mappings)
  symbolTable = extractSymbolTable(cfb)

  // List all entries
  const entries = cfb.FullPaths || []
  console.log('[RSS Parser] Found OLE entries:', entries)

  // Collect all stream data for analysis
  const streams: { path: string; content: Buffer; decompressed?: Buffer }[] = []

  for (const path of entries) {
    const entry = CFB.find(cfb, path)
    if (entry && entry.content && entry.content.length > 0) {
      const content = Buffer.from(entry.content)
      console.log(`[RSS Parser] Entry: "${path}", size: ${content.length}, first bytes: ${content.slice(0, 16).toString('hex')}`)

      const streamInfo: { path: string; content: Buffer; decompressed?: Buffer } = { path, content }

      // Parse RSS stream header to get expected uncompressed size
      // Format: [version:4][headerSize:4][compSize:4][uncompSize:4]
      let expectedSize: number | undefined
      if (content.length >= 16) {
        const version = content.readUInt32LE(0)
        const headerSize = content.readUInt32LE(4)
        const uncompSize = content.readUInt32LE(12)

        // Check if this looks like a valid RSS header
        if ((version === 0 || version === 2) && headerSize === 16 && uncompSize > content.length) {
          expectedSize = uncompSize
          console.log(`[RSS Parser]   -> Header indicates uncompressed size: ${expectedSize}`)
        }
      }

      // Try to decompress using multiple methods
      const decompressed = tryDecompress(content, expectedSize)
      if (decompressed) {
        streamInfo.decompressed = decompressed
      }

      streams.push(streamInfo)
    }
  }

  // Find the best stream to parse
  let programData: Buffer | null = null
  let rawProgramStream: Buffer | null = null
  let projectName = 'RSLogix 500 Project'
  let processorType = 'SLC 500'

  // Strategy 1: Look specifically for PROGRAM FILES stream (contains ladder logic)
  for (const stream of streams) {
    if (stream.path.includes('PROGRAM FILES') && !stream.path.includes('ONLINEIMAGE')) {
      rawProgramStream = stream.content
      programData = stream.decompressed || stream.content
      console.log(`[RSS Parser] Using PROGRAM FILES stream: ${stream.path} (raw: ${stream.content.length}, decompressed: ${programData.length} bytes)`)
      break
    }
  }

  // Strategy 2: Look for DATA FILES stream (contains tag/address data)
  let dataFilesStream: Buffer | null = null
  for (const stream of streams) {
    if (stream.path.includes('DATA FILES') && !stream.path.includes('Extensional') && !stream.path.includes('ONLINEIMAGE')) {
      dataFilesStream = stream.decompressed || stream.content
      console.log(`[RSS Parser] Found DATA FILES stream: ${stream.path} (${dataFilesStream.length} bytes)`)
      break
    }
  }

  // Extract data table values from DATA FILES stream
  if (dataFilesStream) {
    dataTableValues = extractDataTableValues(dataFilesStream)
  } else {
    dataTableValues = new Map()
  }

  // Strategy 3: Try COMPILER stream which may have symbol info
  let compilerStream: Buffer | null = null
  for (const stream of streams) {
    if (stream.path.includes('COMPILER') && !stream.path.includes('ONLINEIMAGE')) {
      compilerStream = stream.decompressed || stream.content
      console.log(`[RSS Parser] Found COMPILER stream: ${stream.path} (${compilerStream.length} bytes)`)
      break
    }
  }

  // Extract project name from PROCESSOR stream
  for (const stream of streams) {
    if (stream.path.includes('PROCESSOR') && !stream.path.includes('ONLINEIMAGE')) {
      const procData = stream.decompressed || stream.content
      const text = procData.toString('latin1')
      // Look for project name patterns - typically after some header bytes
      // The visible text sample shows: "...LANLOGIX.MAIN_PROG..."
      const nameMatch = text.match(/([A-Z][A-Z0-9_]{3,15})(?=[^A-Z0-9_]|$)/i)
      if (nameMatch) {
        projectName = nameMatch[1]
        console.log(`[RSS Parser] Found project name: ${projectName}`)
      }
      break
    }
  }

  // Fallback: Use the largest stream that's not PROCESSOR
  if (!programData) {
    let largestStream: { path: string; content: Buffer; decompressed?: Buffer } | null = null
    let largestSize = 0

    for (const stream of streams) {
      if (stream.path.includes('PROCESSOR')) continue // Skip processor metadata
      const size = stream.decompressed?.length || stream.content.length
      if (size > largestSize) {
        largestSize = size
        largestStream = stream
      }
    }

    if (largestStream) {
      rawProgramStream = largestStream.content
      programData = largestStream.decompressed || largestStream.content
      console.log(`[RSS Parser] Fallback - using largest stream: ${largestStream.path} (${programData.length} bytes)`)
    }
  }

  // If no good stream found, use any stream with data
  if (!programData) {
    for (const stream of streams) {
      if (stream.content.length > 0) {
        rawProgramStream = stream.content
        programData = stream.decompressed || stream.content
        console.log(`[RSS Parser] Fallback: using stream ${stream.path}`)
        break
      }
    }
  }

  if (!programData || programData.length === 0) {
    // Last resort: create minimal project from OLE structure info
    console.log('[RSS Parser] No usable data found, creating minimal project')
    const streamInfo = streams.map(s => `${s.path} (${s.content.length} bytes)`).join(', ')

    return {
      name: 'RSLogix 500 Project',
      processorType: 'SLC 500',
      softwareVersion: 'RSLogix 500',
      tags: [],
      programs: [{
        name: 'MainProgram',
        mainRoutineName: 'MainRoutine',
        disabled: false,
        routines: [{
          name: 'MainRoutine',
          type: 'Ladder',
          rungs: [{
            number: 0,
            comment: `RSS file structure: ${streamInfo || 'no streams found'}`,
            rawText: '// Could not parse RSS binary format',
            instructions: []
          }]
        }],
        localTags: []
      }],
      tasks: [],
      modules: [],
      dataTypes: []
    }
  }

  // Parse the header to understand data structure
  // RSS PROGRAM FILES header format:
  // Bytes 0-3: Version/flags
  // Bytes 4-7: Header size (typically 0x10 = 16)
  // Bytes 8-11: Compressed size
  // Bytes 12-15: Uncompressed size
  let headerInfo = ''
  if (rawProgramStream && rawProgramStream.length >= 16) {
    const version = rawProgramStream.readUInt32LE(0)
    const headerSize = rawProgramStream.readUInt32LE(4)
    const compSize = rawProgramStream.readUInt32LE(8)
    const uncompSize = rawProgramStream.readUInt32LE(12)
    headerInfo = `version=${version}, headerSize=${headerSize}, compSize=${compSize}, uncompSize=${uncompSize}`
    console.log(`[RSS Parser] Header: ${headerInfo}`)
  }

  // Parse the data
  const text = programData.toString('latin1')
  const hexDump = programData.slice(0, 200).toString('hex')
  console.log(`[RSS Parser] First 200 bytes hex: ${hexDump}`)
  console.log(`[RSS Parser] Visible text sample: ${text.slice(0, 300).replace(/[^\x20-\x7E]/g, '.')}`)

  // Extract processor info
  if (text.includes('MicroLogix') || text.includes('1761') || text.includes('1762') ||
      text.includes('1763') || text.includes('1766')) {
    processorType = 'MicroLogix'
  }

  // Analyze instruction opcodes in the binary data
  console.log('[RSS Parser] Analyzing instruction opcodes...')
  const opcodeMap = analyzeInstructionOpcodes(programData)
  console.log(`[RSS Parser] Analyzed ${opcodeMap.size} instruction opcodes`)

  // Try to parse binary ladder structure first
  const binaryResult = parseBinaryLadder(programData, opcodeMap)
  const totalRungs = [...binaryResult.routineRungs.values()].reduce((sum, r) => sum + r.length, 0)
  console.log(`[RSS Parser] Binary parsing found ${totalRungs} rungs across ${binaryResult.routineRungs.size} routines, ${binaryResult.addresses.size} addresses`)

  // Extract all visible addresses from text as fallback
  const addresses = binaryResult.addresses.size > 0 ? binaryResult.addresses : extractAddresses(text)

  // Also scan DATA FILES and COMPILER streams for addresses
  if (dataFilesStream) {
    const dataText = dataFilesStream.toString('latin1')
    const dataAddrs = extractAddresses(dataText)
    dataAddrs.forEach(a => addresses.add(a))
    console.log(`[RSS Parser] DATA FILES added ${dataAddrs.size} addresses`)
  }
  if (compilerStream) {
    const compText = compilerStream.toString('latin1')
    const compAddrs = extractAddresses(compText)
    compAddrs.forEach(a => addresses.add(a))
    console.log(`[RSS Parser] COMPILER added ${compAddrs.size} addresses`)
  }

  console.log(`[RSS Parser] Total unique addresses: ${addresses.size}`)

  // Convert addresses to tags
  const tags: PlcTag[] = []
  for (const addr of addresses) {
    const tag = addressToTag(addr)
    if (tag) {
      tags.push(tag)
    }
  }

  // Add synthetic tags for timer/counter programmed values (for simulation initialization)
  // These allow the simulation to initialize PRE/ACC values from the programmed parameters
  for (const [address, timerVal] of programTimerValues) {
    // Create timer preset tag with calculated millisecond value
    const presetMs = timerVal.preset * timerVal.timeBase * 1000
    tags.push({
      name: `${address}.PRE`,
      dataType: 'INT',
      scope: 'controller',
      description: `Timer preset (${timerVal.preset} x ${timerVal.timeBase}s = ${presetMs}ms)`,
      value: String(presetMs)
    })
    // Create timer accumulator tag
    const accumMs = timerVal.accum * timerVal.timeBase * 1000
    tags.push({
      name: `${address}.ACC`,
      dataType: 'INT',
      scope: 'controller',
      description: `Timer accumulator (initial: ${timerVal.accum})`,
      value: String(accumMs)
    })
    // Create timebase tag (for reference)
    tags.push({
      name: `${address}.TB`,
      dataType: 'REAL',
      scope: 'controller',
      description: `Timer time base (seconds per count)`,
      value: String(timerVal.timeBase)
    })
  }

  for (const [address, counterVal] of programCounterValues) {
    // Create counter preset tag
    tags.push({
      name: `${address}.PRE`,
      dataType: 'INT',
      scope: 'controller',
      description: `Counter preset`,
      value: String(counterVal.preset)
    })
    // Create counter accumulator tag
    tags.push({
      name: `${address}.ACC`,
      dataType: 'INT',
      scope: 'controller',
      description: `Counter accumulator (initial: ${counterVal.accum})`,
      value: String(counterVal.accum)
    })
  }

  console.log(`[RSS Parser] Added ${programTimerValues.size} timer tags and ${programCounterValues.size} counter tags`)

  // Build routines from parsed ladder files
  const routines: PlcRoutine[] = []

  if (binaryResult.routineRungs.size > 0) {
    // Create a routine for each ladder file
    for (const [routineName, rungs] of binaryResult.routineRungs) {
      routines.push({
        name: routineName,
        type: 'Ladder',
        rungs
      })
      console.log(`[RSS Parser] Created routine "${routineName}" with ${rungs.length} rungs`)
    }
  } else {
    // Fallback: create single MAIN routine from text extraction
    let rungs = extractRungs(programData, text, addresses)
    console.log(`[RSS Parser] Fallback: Extracted ${rungs.length} rungs`)

    // Ensure we always have at least one rung with file info
    if (rungs.length === 0) {
      const sampleHex = programData.slice(0, 100).toString('hex')
      const sampleText = text.slice(0, 200).replace(/[^\x20-\x7E]/g, '.')
      rungs = [{
        number: 0,
        comment: 'RSS file loaded - binary format analysis',
        rawText: `// Data size: ${programData.length} bytes`,
        instructions: []
      }, {
        number: 1,
        comment: `Hex sample: ${sampleHex.slice(0, 50)}...`,
        rawText: `// Text sample: ${sampleText.slice(0, 100)}...`,
        instructions: []
      }]

      // Add addresses as rungs if found
      if (addresses.size > 0) {
        const addrList = [...addresses].slice(0, 30)
        rungs.push({
          number: 2,
          comment: `Found ${addresses.size} addresses in file`,
          rawText: addrList.join(', '),
          instructions: addrList.map(addr => ({ type: 'TAG', operands: [addr] }))
        })
      }
    }

    routines.push({
      name: 'MAIN',
      type: 'Ladder',
      rungs
    })
  }

  // Determine main routine name (first routine or MAIN)
  const mainRoutineName = routines.length > 0 ? routines[0].name : 'MAIN'

  const mainProgram: PlcProgram = {
    name: projectName,
    mainRoutineName,
    disabled: false,
    routines,
    localTags: []
  }

  // Convert timer/counter Maps to arrays for export
  const timerProgramValues: PlcTimerProgramValue[] = []
  for (const [address, value] of programTimerValues) {
    timerProgramValues.push({
      address,
      timeBase: value.timeBase,
      preset: value.preset,
      accum: value.accum
    })
  }

  const counterProgramValues: PlcCounterProgramValue[] = []
  for (const [address, value] of programCounterValues) {
    counterProgramValues.push({
      address,
      preset: value.preset,
      accum: value.accum
    })
  }

  console.log(`[RSS Parser] Exporting ${timerProgramValues.length} timer values, ${counterProgramValues.length} counter values`)

  return {
    name: projectName,
    processorType,
    softwareVersion: 'RSLogix 500',
    tags,
    programs: [mainProgram],
    tasks: [],
    modules: [],
    dataTypes: [],
    timerProgramValues: timerProgramValues.length > 0 ? timerProgramValues : undefined,
    counterProgramValues: counterProgramValues.length > 0 ? counterProgramValues : undefined
  }
}

/**
 * Analyze binary data to find instruction opcodes before addresses
 * RSLogix 500 format: [instruction_type][0b][80][01][00][length][address_string]
 */
function analyzeInstructionOpcodes(data: Buffer): Map<string, number> {
  const results = new Map<string, number>() // address position -> instruction type
  const text = data.toString('latin1')

  // Find each address and look at bytes before it
  const addrPattern = /([BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?|U:\d+|HSC\d+(?:\.\d+)?)/gi
  let match

  // Track instruction types for analysis
  const instructionCounts: Map<number, number> = new Map()
  const typeByAddress: Map<string, number[]> = new Map()
  let count = 0

  while ((match = addrPattern.exec(text)) !== null) {
    const addr = match[0].toUpperCase()
    const pos = match.index

    if (pos >= 10) {
      // Check for the pattern [type][0b][80][01][00][len][address]
      // The address length byte should be at pos-1
      const lengthByte = data[pos - 1]
      const addrLen = addr.length

      if (lengthByte === addrLen) {
        // Check if bytes at pos-5 to pos-2 are [0b][80][01][00]
        const marker = data.subarray(pos - 5, pos - 1)
        if (marker[0] === 0x0b && marker[1] === 0x80 && marker[2] === 0x01 && marker[3] === 0x00) {
          // Found the pattern! Instruction type is at pos-6
          const instType = data[pos - 6]
          results.set(`${pos}`, instType)

          // Track for analysis
          instructionCounts.set(instType, (instructionCounts.get(instType) || 0) + 1)

          const addrType = addr.charAt(0)
          if (!typeByAddress.has(addrType)) {
            typeByAddress.set(addrType, [])
          }
          typeByAddress.get(addrType)!.push(instType)

          if (count < 30) {
            console.log(`[RSS Opcode] ${addr}: type=0x${instType.toString(16).padStart(2, '0')}`)
          }
          count++
        }
      }
    }
  }

  // Log instruction type distribution
  console.log('[RSS Opcode] Instruction type distribution:')
  const sortedTypes = [...instructionCounts.entries()].sort((a, b) => b[1] - a[1])
  for (const [type, count] of sortedTypes.slice(0, 15)) {
    console.log(`  0x${type.toString(16).padStart(2, '0')}: ${count} occurrences`)
  }

  // Log patterns by address type
  console.log('[RSS Opcode] Instruction types by address prefix:')
  for (const [addrType, types] of typeByAddress) {
    const typeCounts = new Map<number, number>()
    for (const t of types) {
      typeCounts.set(t, (typeCounts.get(t) || 0) + 1)
    }
    const topTypes = [...typeCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5)
    console.log(`  ${addrType}: ${topTypes.map(([t, c]) => `0x${t.toString(16).padStart(2, '0')}(${c})`).join(', ')}`)
  }

  return results
}

/**
 * Infer instruction type from address pattern when opcode is unknown
 */
function inferInstructionType(addr: string, isLast: boolean): string {
  if (addr.startsWith('O:') || addr.startsWith('O0:')) return 'OTE'
  if (addr.match(/^T\d+:\d+$/)) return 'TON'
  if (addr.match(/^T\d+:\d+\.DN$/i)) return 'XIC'
  if (addr.match(/^T\d+:\d+\.(?:PRE|ACC)$/i)) return 'MOV'
  if (addr.match(/^C\d+:\d+$/)) return 'CTU'
  if (addr.match(/^C\d+:\d+\.DN$/i)) return 'XIC'
  if (addr.startsWith('I:')) return 'XIC'
  if (isLast && addr.match(/^B\d+:\d+\/\d+$/)) return 'OTE'
  if (isLast && addr.match(/^N\d+:\d+$/)) return 'MOV'
  return 'XIC'
}

/**
 * Create instructions from a list of addresses
 * Infers instruction type based on address type and position
 */
function createInstructionsFromAddresses(addrs: string[]): PlcInstruction[] {
  const instructions: PlcInstruction[] = []

  for (let i = 0; i < addrs.length; i++) {
    const addr = addrs[i]
    const isLast = i === addrs.length - 1

    // Determine instruction type based on address pattern and position
    let instType = 'XIC' // Default to examine if closed

    if (addr.startsWith('O:') || addr.startsWith('O0:')) {
      instType = 'OTE'
    } else if (addr.match(/^T\d+:\d+$/)) {
      // Timer without subfield - this is the timer instruction itself
      instType = 'TON'
    } else if (addr.match(/^T\d+:\d+\.DN$/i)) {
      instType = 'XIC' // Timer done bit - examine
    } else if (addr.match(/^T\d+:\d+\.TT$/i)) {
      instType = 'XIC' // Timer timing bit - examine
    } else if (addr.match(/^T\d+:\d+\.(?:PRE|ACC)$/i)) {
      instType = 'MOV' // Timer preset/acc - likely move target
    } else if (addr.match(/^C\d+:\d+$/)) {
      // Counter without subfield - counter instruction
      instType = 'CTU'
    } else if (addr.match(/^C\d+:\d+\.DN$/i)) {
      instType = 'XIC' // Counter done bit
    } else if (addr.match(/^C\d+:\d+\.(?:PRE|ACC)$/i)) {
      instType = 'MOV' // Counter preset/acc
    } else if (addr.startsWith('I:')) {
      instType = 'XIC' // Physical input - examine
    } else if (addr.match(/^B\d+:\d+\/\d+$/) && isLast) {
      instType = 'OTE' // Bit at end of rung - likely output
    } else if (addr.match(/^N\d+:\d+$/) && isLast) {
      instType = 'MOV' // Integer at end - likely move destination
    }

    instructions.push({
      type: instType,
      operands: [addr]
    })
  }

  return instructions
}

/**
 * Get display name for an address - returns symbol name if available, otherwise the address
 * Format: "SYMBOL" if symbol exists, or "B3:2/0" if no symbol
 */
function getDisplayName(addr: string): string {
  const symbol = lookupSymbol(addr)
  return symbol ? symbol.symbol : addr
}

/**
 * Format instructions with branch indicators in rawText
 * Shows parallel branches with visual separators like: [Branch: XIC(A) XIC(B) | XIC(C) XIC(D)]
 */
function formatInstructionsWithBranches(instructions: PlcInstruction[]): string {
  // Check if any instructions have branchLeg set
  const hasBranches = instructions.some(inst => inst.branchLeg !== undefined)

  if (!hasBranches) {
    // No branches - simple format
    return instructions.map(inst => `${inst.type}(${inst.operands.join(',')})`).join(' ')
  }

  // Group instructions by branch leg
  const mainRung: PlcInstruction[] = []
  const branchLegs = new Map<number, PlcInstruction[]>()

  for (const inst of instructions) {
    if (inst.branchLeg !== undefined) {
      if (!branchLegs.has(inst.branchLeg)) {
        branchLegs.set(inst.branchLeg, [])
      }
      branchLegs.get(inst.branchLeg)!.push(inst)
    } else {
      mainRung.push(inst)
    }
  }

  // Format output
  const parts: string[] = []

  // Main rung instructions before branch
  if (mainRung.length > 0) {
    parts.push(mainRung.map(inst => `${inst.type}(${inst.operands.join(',')})`).join(' '))
  }

  // Branch legs
  if (branchLegs.size > 0) {
    const legStrings: string[] = []
    const sortedLegs = [...branchLegs.entries()].sort((a, b) => a[0] - b[0])
    for (const [, legInsts] of sortedLegs) {
      legStrings.push(legInsts.map(inst => `${inst.type}(${inst.operands.join(',')})`).join(' '))
    }
    parts.push(`[Branch: ${legStrings.join(' | ')}]`)
  }

  return parts.join(' ')
}

/**
 * Parse binary ladder logic from PROGRAM FILES stream
 * RSLogix 500 stores ladder data with text markers and ASCII addresses
 * Structure: CProgHolder > CLadFile > CRung > CIns/CBranchLeg
 */
function parseBinaryLadder(data: Buffer, opcodeMap?: Map<string, number>): {
  routineRungs: Map<string, PlcRung[]>,
  addresses: Set<string>,
  ladderFiles: string[]
} {
  const addresses = new Set<string>()
  const routineRungs = new Map<string, PlcRung[]>()

  const text = data.toString('latin1')

  // Extract all valid SLC 500 addresses from the text
  // Address patterns: B3:0/15, N7:5, T4:0.DN, I:0/0, O:0/0, etc.
  // Standard addresses: B3:0/15, N11:0, T4:14.DN
  // JSR subroutine files: U:4, U:250
  const addressPattern = /\b([BIOTCRNFSAL])(\d+):(\d+)(?:\/(\d+))?(?:\.([A-Z]+))?\b|\b(U):(\d+)\b|\b(HSC)(\d+)(?:\.(\d+))?\b/gi
  const ioPattern = /\b([IO]):(\d+)(?:\/(\d+))?\b/gi

  // Find all addresses
  let match
  while ((match = addressPattern.exec(text)) !== null) {
    const addr = match[0].toUpperCase()
    // Check if this is a U:X match (groups 6 and 7), HSC match (groups 8, 9, 10), or standard address
    if (match[8]) {
      // HSC format - HSC0, HSC1, HSC0.0, etc.
      addresses.add(addr)
    } else if (match[6]) {
      // U:X format - just validate file number
      const fileNum = parseInt(match[7])
      if (fileNum <= 999) {
        addresses.add(addr)
      }
    } else {
      // Standard address format - validate file number and element
      const fileNum = parseInt(match[2])
      const element = parseInt(match[3])
      if (fileNum <= 255 && element <= 999) {
        addresses.add(addr)
      }
    }
  }

  while ((match = ioPattern.exec(text)) !== null) {
    addresses.add(match[0].toUpperCase())
  }

  console.log(`[RSS Parser] Found ${addresses.size} unique addresses in decompressed data`)

  // Find ladder file positions and names
  // Pattern in binary: 0380XX000100[NAME]00
  // Example: 0380450001004d41494e00 = marker + 45 + 000100 + "MAIN" + 00
  interface LadderFileInfo {
    name: string
    startPos: number
    endPos: number
  }
  const ladderFileInfos: LadderFileInfo[] = []

  // Find routine markers - pattern: 03 80 XX 00 01 00 [NAME]
  // The routine name starts at offset 6 from the 0380 marker
  for (let i = 0; i < data.length - 30; i++) {
    if (data[i] === 0x03 && data[i + 1] === 0x80 &&
        data[i + 3] === 0x00 && data[i + 4] === 0x01 && data[i + 5] === 0x00) {
      // Found potential marker, extract routine name starting at offset 6
      // Name is null-terminated or space-padded
      let nameEnd = i + 6
      while (nameEnd < data.length && nameEnd < i + 30 &&
             data[nameEnd] !== 0x00 && data[nameEnd] >= 0x20 && data[nameEnd] <= 0x7E) {
        nameEnd++
      }

      if (nameEnd > i + 6) {
        const nameBytes = data.subarray(i + 6, nameEnd)
        // Strip trailing non-alphanumeric characters (like parentheses) and trim
        const rawName = Buffer.from(nameBytes).toString('latin1').trim()
        const name = rawName.replace(/[^A-Z0-9_ ]+$/i, '').trim()

        // Validate it's a proper routine name (letters, numbers, underscore, space allowed)
        if (name.length >= 2 && /^[A-Z][A-Z0-9_ ]*$/i.test(name) &&
            !['CProgHolder', 'CLadFile', 'CRung', 'CIns', 'CBranch', 'CBranchLeg'].includes(name)) {
          // Check if we haven't already found this routine
          if (!ladderFileInfos.some(lf => lf.name === name)) {
            ladderFileInfos.push({
              name,
              startPos: i,
              endPos: data.length // Will be updated
            })
          }
        }
      }
    }
  }

  // Update end positions based on next ladder file start
  for (let i = 0; i < ladderFileInfos.length; i++) {
    if (i + 1 < ladderFileInfos.length) {
      ladderFileInfos[i].endPos = ladderFileInfos[i + 1].startPos
    }
  }

  const ladderFiles = ladderFileInfos.map(lf => lf.name)
  console.log(`[RSS Parser] Found ${ladderFiles.length} ladder files: ${ladderFiles.join(', ') || 'none'}`)

  // Find rung START markers: pattern 07 80 09 80
  // This pattern marks the start of each new rung (rungs 1+)
  // Rung 0 is before the first occurrence of this pattern
  // Each 07 80 09 80 is followed by: XX 00 0b 80 00 00 01 00 ... then instruction data
  const rungStartPositions: number[] = []
  for (let i = 0; i < data.length - 8; i++) {
    if (data[i] === 0x07 &&
        data[i+1] === 0x80 &&
        data[i+2] === 0x09 &&
        data[i+3] === 0x80) {
      rungStartPositions.push(i)
    }
  }

  // Sort and deduplicate rung positions (filter out patterns that are too close together)
  rungStartPositions.sort((a, b) => a - b)
  const uniqueRungStarts = rungStartPositions.filter((pos, i) =>
    i === 0 || pos - rungStartPositions[i - 1] > 30
  )

  console.log(`[RSS Parser] Found ${uniqueRungStarts.length} rung boundaries (07 80 09 80 patterns)`)

  // Helper function to determine which rung a position belongs to
  // Pattern at index i marks the START of rung i+1 (rung 0 is before the first pattern)
  function getRungIndex(pos: number): number {
    for (let i = uniqueRungStarts.length - 1; i >= 0; i--) {
      if (pos >= uniqueRungStarts[i]) {
        return i + 1  // Pattern i marks start of rung i+1
      }
    }
    return 0  // Before first pattern = rung 0
  }

  // Parse instructions using actual opcodes from binary
  // Format: [type byte at pos-6][0b][80][XX][00][length][address]
  // Note: XX can be 01, 04, etc. - not just 01
  // Include 'U:X' for subroutine file references (JSR U:4 etc.)
  // Note: U:X has different format than other files (no element number after colon)
  const addrRegex3 = /([BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?|U:\d+|HSC\d+(?:\.\d+)?)/gi

  // Find all addresses with their opcodes and positions
  interface ParsedAddress {
    pos: number
    addr: string
    opcode: number
    instType: string
    operandCount: number
    sourceConstant?: string  // For MOV instructions, the source constant value
    sourceA?: string         // For comparison/math instructions, Source A operand
    sourceB?: string         // For math instructions (ADD, SUB, MUL, DIV), Source B operand
    timerParams?: { timeBase: string | null, preset: string | null, accum: string | null }
    counterParams?: { preset: string | null, accum: string | null }
    branchLeg?: number       // Which branch leg this instruction is in (0 = main, 1+ = parallel legs)
    branchStart?: boolean    // True if this instruction starts a new branch
    branchLevel?: number     // Nesting depth (0=main, 1=first nest, etc.)
  }
  const allAddresses: ParsedAddress[] = []

  // Detect parallel branch regions
  // CBranchLeg marks start of a branch leg, CBranch marks end of branch structure
  interface BranchRegion {
    legStart: number    // Position of CBranchLeg
    branchEnd: number   // Position of CBranch (end of all legs)
    legNumber: number   // Which leg (1, 2, 3...)
  }
  const branchRegions: BranchRegion[] = []

  // Find all CBranchLeg markers
  let branchLegPos = 0
  let legNumber = 0
  while ((branchLegPos = text.indexOf('CBranchLeg', branchLegPos)) !== -1) {
    legNumber++
    // Find the corresponding CBranch (end marker) - it's "CBranch" not followed by "Leg"
    let endPos = branchLegPos + 10
    while (endPos < text.length) {
      const nextBranch = text.indexOf('CBranch', endPos)
      if (nextBranch === -1) {
        endPos = text.length
        break
      }
      // Check if it's CBranchLeg or CBranch
      if (text.substring(nextBranch, nextBranch + 10) !== 'CBranchLeg') {
        endPos = nextBranch
        break
      }
      endPos = nextBranch + 10
    }

    branchRegions.push({
      legStart: branchLegPos,
      branchEnd: endPos,
      legNumber
    })
    console.log(`[RSS Parser] Found branch leg ${legNumber} from ${branchLegPos} to ${endPos}`)
    branchLegPos += 10
  }

  // Helper to check if a position is inside a branch leg
  // Uses text-based CBranchLeg/CBranch region detection
  function getBranchLeg(pos: number): number | undefined {
    for (const region of branchRegions) {
      if (pos > region.legStart && pos < region.branchEnd) {
        return region.legNumber
      }
    }
    return undefined
  }

  // Helper to calculate branch nesting level
  // Returns how many branch regions contain this position (0 = main, 1 = first level branch, etc.)
  function getBranchLevel(pos: number): number {
    let level = 0
    for (const region of branchRegions) {
      if (pos > region.legStart && pos < region.branchEnd) {
        level++
      }
    }
    return level
  }

  // Helper to detect if an instruction starts a new parallel path
  // New parallel paths have a "clean marker" pattern: 00 00 00 00 01 00 XX 0b 80 01 00 LL <address>
  // The pattern is at fixed positions relative to the address:
  // pos-12: 00, pos-11: 00, pos-10: 00, pos-9: 00, pos-8: 01, pos-7: 00, pos-6: XX, pos-5: 0b, pos-4: 80
  // Continuation instructions have different bytes at pos-12 through pos-9 (not all zeros)
  function isNewParallelPath(pos: number): boolean {
    if (pos < 12) return false

    // Check for clean marker pattern
    // The 0b 80 at pos-5, pos-4
    if (data[pos - 5] !== 0x0b || data[pos - 4] !== 0x80) {
      return false
    }

    // Check for the clean pattern: 00 00 00 00 01 00 at pos-12 to pos-7
    return data[pos - 12] === 0x00 &&
           data[pos - 11] === 0x00 &&
           data[pos - 10] === 0x00 &&
           data[pos - 9] === 0x00 &&
           data[pos - 8] === 0x01 &&
           data[pos - 7] === 0x00
  }

  // Track opcode distribution for debugging
  const opcodeStats = new Map<number, { count: number; samples: string[] }>()

  let m
  while ((m = addrRegex3.exec(text)) !== null) {
    const addr = m[0].toUpperCase()
    const pos = m.index

    if (pos >= 6) {
      // Check for the marker pattern [0b][80][XX][00] at pos-5 to pos-1 (before length byte)
      // Note: XX can be 01, 04, 06, etc. - not just 01
      const lengthByte = data[pos - 1]
      if (lengthByte === addr.length) {
        const marker = data.subarray(pos - 5, pos - 1)
        if (marker[0] === 0x0b && marker[1] === 0x80 && marker[3] === 0x00) {
          const opcode = data[pos - 6]
          let decoded = decodeOpcode(opcode)

          // Override instruction type based on symbol description
          // The MEM DATABASE has descriptions like "- Input - Gate 2 Open" or "- Output - Gate Unlock"
          // Use this to correct misidentified instruction types
          const symbol = lookupSymbol(addr)
          if (symbol && symbol.description) {
            const desc = symbol.description.toLowerCase()
            if (desc.startsWith('- input -') || desc.includes(' input ')) {
              // This is an input - should be XIC or XIO, not an output
              if (decoded.type === 'OTE' || decoded.type === 'OTL' || decoded.type === 'OTU') {
                decoded = { type: 'XIC', operandCount: 1 }
              }
            } else if (desc.startsWith('- output -') || desc.includes(' output ')) {
              // This is an output - should be OTE, OTL, or OTU
              if (decoded.type === 'XIC' || decoded.type === 'XIO') {
                decoded = { type: 'OTE', operandCount: 1 }
              }
            }
          }

          // Override instruction type based on address pattern for timers/counters
          // The opcode byte may not correctly identify these instruction types
          if (addr.match(/^T\d+:\d+$/)) {
            decoded = { type: 'TON', operandCount: 1 }
          } else if (addr.match(/^T\d+:\d+\.DN$/i) || addr.match(/^T\d+:\d+\.TT$/i) || addr.match(/^T\d+:\d+\.EN$/i)) {
            decoded = { type: 'XIC', operandCount: 1 }
          } else if (addr.match(/^C\d+:\d+$/)) {
            decoded = { type: 'CTU', operandCount: 1 }
          } else if (addr.match(/^C\d+:\d+\.DN$/i) || addr.match(/^C\d+:\d+\.UN$/i) || addr.match(/^C\d+:\d+\.OV$/i)) {
            decoded = { type: 'XIC', operandCount: 1 }
          }

          // For MOV instructions (timer/counter PRE/ACC), look for source value
          // Research finding: Source operands come AFTER the destination address
          let sourceConstant: string | undefined
          if (decoded.type === 'MOV' || addr.match(/\.(PRE|ACC)$/i)) {
            // Calculate position after the address (pos is start of address, addr.length is its length)
            const afterAddrPos = pos + addr.length

            // First try: Search AFTER the destination address (correct per research)
            sourceConstant = extractMovSourceAfterDest(data, text, afterAddrPos) || undefined

            // Fallback: Search backwards (legacy method) if forward search fails
            if (!sourceConstant) {
              const markerPos = pos - 5
              sourceConstant = extractConstantValue(data, markerPos) || undefined
            }

            if (sourceConstant) {
              console.log(`[RSS Parser] Found source ${sourceConstant} for MOV -> ${addr}`)
            }
          }

          // For comparison instructions (EQU, NEQ, LES, LEQ, GRT, GEQ), extract Source A
          // These opcodes are 0x10-0x15
          let sourceA: string | undefined
          let sourceB: string | undefined
          const comparisonOpcodes = [0x10, 0x11, 0x12, 0x13, 0x14, 0x15]
          if (comparisonOpcodes.includes(opcode)) {
            // Calculate position after the address
            const afterAddrPos = pos + addr.length

            // Try searching AFTER destination first (per research), then fallback to BEFORE
            const afterOperands = extractMathOperandsAfterDest(data, text, afterAddrPos)
            if (afterOperands.sourceA) {
              sourceA = afterOperands.sourceA
              console.log(`[RSS Parser] Found Source A "${sourceA}" AFTER dest for ${decoded.type}(${sourceA}, ${addr})`)
            } else {
              // Fallback: Look backwards for Source A
              sourceA = extractSourceAOperand(data, text, pos) || undefined
              if (sourceA) {
                console.log(`[RSS Parser] Found Source A "${sourceA}" BEFORE dest for ${decoded.type}(${sourceA}, ${addr})`)
              }
            }
          }

          // For math instructions (ADD, SUB, MUL, DIV), extract Source A and Source B
          // Research finding: Source operands come AFTER the destination address
          // Example: Dest="T4:5.ACC" Operands: [0, 10, 10, N14:0, 10] -> ADD(10, N14:0, T4:5.ACC)
          const mathOpcodes = [0x0A, 0x0B, 0x0C, 0x0D]
          if (mathOpcodes.includes(opcode)) {
            // Calculate position after the address
            const afterAddrPos = pos + addr.length

            // First try: Search AFTER the destination address (correct per research)
            const afterOperands = extractMathOperandsAfterDest(data, text, afterAddrPos)
            if (afterOperands.sourceA) {
              sourceA = afterOperands.sourceA
              sourceB = afterOperands.sourceB || sourceA  // Use sourceA if sourceB not found
              console.log(`[RSS Parser] Found operands AFTER dest for ${decoded.type}(${sourceA}, ${sourceB}, ${addr})`)
            } else {
              // Fallback: Search before destination (legacy method)
              const beforeOperands = extractMathOperands(data, text, pos)
              sourceA = beforeOperands.sourceA || undefined
              sourceB = beforeOperands.sourceB || undefined
              if (sourceA && sourceB) {
                console.log(`[RSS Parser] Found operands BEFORE dest for ${decoded.type}(${sourceA}, ${sourceB}, ${addr})`)
              }
            }
          }

          // For timer instructions (TON, TOF, RTO), extract time base, preset, and accumulated
          let timerParams: { timeBase: string | null, preset: string | null, accum: string | null } | undefined
          if (decoded.type === 'TON' || decoded.type === 'TOF' || decoded.type === 'RTO') {
            timerParams = extractTimerParams(data, text, pos, addr.length)
            if (timerParams.preset) {
              console.log(`[RSS Parser] Timer ${addr}: timeBase=${timerParams.timeBase}, preset=${timerParams.preset}, accum=${timerParams.accum}`)

              // Store in global programTimerValues map for simulation initialization
              // Parse time base to numeric seconds (default to 1.0 if invalid)
              let timeBaseSec = 1.0
              if (timerParams.timeBase) {
                const tb = parseFloat(timerParams.timeBase)
                if (!isNaN(tb) && tb > 0) {
                  timeBaseSec = tb
                }
              }

              const presetNum = parseInt(timerParams.preset, 10)
              const accumNum = timerParams.accum ? parseInt(timerParams.accum, 10) : 0

              // Store using normalized address (e.g., "T4:14")
              const normalAddr = normalizeAddress(addr)
              programTimerValues.set(normalAddr, {
                timeBase: timeBaseSec,
                preset: presetNum,
                accum: accumNum
              })
            }
          }

          // For counter instructions (CTU, CTD), extract preset and accumulated
          let counterParams: { preset: string | null, accum: string | null } | undefined
          if (decoded.type === 'CTU' || decoded.type === 'CTD') {
            counterParams = extractCounterParams(data, text, pos, addr.length)
            if (counterParams.preset) {
              console.log(`[RSS Parser] Counter ${addr}: preset=${counterParams.preset}, accum=${counterParams.accum}`)

              // Store in global programCounterValues map for simulation initialization
              const presetNum = parseInt(counterParams.preset, 10)
              const accumNum = counterParams.accum ? parseInt(counterParams.accum, 10) : 0

              // Store using normalized address (e.g., "C5:0")
              const normalAddr = normalizeAddress(addr)
              programCounterValues.set(normalAddr, {
                preset: presetNum,
                accum: accumNum
              })
            }
          }

          // Track opcode stats
          if (!opcodeStats.has(opcode)) {
            opcodeStats.set(opcode, { count: 0, samples: [] })
          }
          const stat = opcodeStats.get(opcode)!
          stat.count++
          if (stat.samples.length < 3) {
            stat.samples.push(`${addr}->${decoded.type}`)
          }

          allAddresses.push({ pos, addr, opcode, instType: decoded.type, operandCount: decoded.operandCount, sourceConstant, sourceA, sourceB, timerParams, counterParams, branchLeg: getBranchLeg(pos), branchLevel: getBranchLevel(pos) })
          addresses.add(addr)
        } else {
          // Fallback: still add address but infer instruction type
          addresses.add(addr)
          const inferredType = inferInstructionType(addr, false)
          // Don't try multi-operand grouping for inferred types - let rung markers handle grouping
          allAddresses.push({
            pos,
            addr,
            opcode: 0xFF, // Unknown
            instType: inferredType,
            operandCount: 1,  // Single operand - rung markers will handle grouping
            branchLeg: getBranchLeg(pos),
            branchLevel: getBranchLevel(pos)
          })
        }
      }
    }
  }

  // Log opcode distribution
  console.log('[RSS Parser] Opcode distribution (top 20):')
  const sortedOpcodes = [...opcodeStats.entries()].sort((a, b) => b[1].count - a[1].count)
  for (const [opcode, stat] of sortedOpcodes.slice(0, 20)) {
    console.log(`  0x${opcode.toString(16).padStart(2, '0')}: ${stat.count}x (samples: ${stat.samples.join(', ')})`)
  }

  console.log(`[RSS Parser] Found ${allAddresses.length} addresses total`)

  // Log branch level distribution
  const branchLevelCounts = new Map<number | undefined, number>()
  for (const addr of allAddresses) {
    const level = addr.branchLeg
    branchLevelCounts.set(level, (branchLevelCounts.get(level) || 0) + 1)
  }
  console.log('[RSS Parser] Branch level distribution:')
  for (const [level, count] of branchLevelCounts.entries()) {
    console.log(`  Level ${level ?? 'main'}: ${count} addresses`)
  }

  // Determine which ladder file each position belongs to
  function getLadderFileForPos(pos: number): string {
    for (const lf of ladderFileInfos) {
      if (pos >= lf.startPos && pos < lf.endPos) {
        return lf.name
      }
    }
    return ladderFileInfos.length > 0 ? ladderFileInfos[0].name : 'MAIN'
  }

  // Group addresses by ladder file
  const addressesByFile = new Map<string, ParsedAddress[]>()
  for (const addr of allAddresses) {
    const fileName = getLadderFileForPos(addr.pos)
    if (!addressesByFile.has(fileName)) {
      addressesByFile.set(fileName, [])
    }
    addressesByFile.get(fileName)!.push(addr)
  }

  // Log address distribution
  console.log('[RSS Parser] Addresses by file:')
  for (const [name, addrs] of addressesByFile) {
    console.log(`  "${name}": ${addrs.length} addresses (first pos: ${addrs[0]?.pos}, last pos: ${addrs[addrs.length - 1]?.pos})`)
  }

  // Create rungs for each ladder file using rung START markers
  // Each rung contains all addresses between consecutive markers
  for (const [fileName, fileAddresses] of addressesByFile) {
    // Sort addresses by position
    fileAddresses.sort((a, b) => a.pos - b.pos)

    // Get file boundaries for this routine
    const fileInfo = ladderFileInfos.find(lf => lf.name === fileName)
    const fileStartPos = fileInfo?.startPos ?? 0
    const fileEndPos = fileInfo?.endPos ?? data.length

    // Filter rung boundaries to only those within this file's boundaries
    const fileRungStarts = uniqueRungStarts.filter(pos => pos >= fileStartPos && pos < fileEndPos)
    console.log(`[RSS Parser] File "${fileName}": ${fileRungStarts.length} rung boundaries (positions ${fileStartPos}-${fileEndPos})`)

    // File-specific getRungIndex function
    function getFileRungIndex(pos: number): number {
      for (let i = fileRungStarts.length - 1; i >= 0; i--) {
        if (pos >= fileRungStarts[i]) {
          return i + 1  // Pattern i marks start of rung i+1
        }
      }
      return 0  // Before first pattern = rung 0
    }

    // First pass: identify likely output instructions based on patterns
    // In ladder logic, outputs typically come after inputs in each rung
    // We look for patterns where a bit address follows input addresses
    for (let i = 0; i < fileAddresses.length; i++) {
      const addr = fileAddresses[i]
      const nextAddr = fileAddresses[i + 1]

      // Physical output addresses are always outputs
      const isPhysicalOutput = addr.addr.startsWith('O:') || addr.addr.startsWith('O0:')

      // Check if next address is in a different rung (using markers)
      const currentRungIdx = getFileRungIndex(addr.pos)
      const nextRungIdx = nextAddr ? getFileRungIndex(nextAddr.pos) : currentRungIdx + 1
      const isLastInRung = nextRungIdx > currentRungIdx

      // B (bit) file addresses can be outputs
      const isBitFileAddress = /^B\d+:\d+\/\d+$/.test(addr.addr)

      // Check if next address is an input type (N11:, I:, etc. - typically status/input bits)
      const nextIsInputType = nextAddr && (
        nextAddr.addr.startsWith('N11:') ||  // Status bits
        nextAddr.addr.startsWith('I:') ||     // Physical inputs
        nextAddr.addr.match(/^N\d+:\d+\/\d+$/) // Integer bit references
      )

      // This address is likely an output if:
      // 1. It's a physical output (O:)
      // 2. It's a B file address AND (last in rung OR followed by input-type address)
      // 3. It's NOT an input-type address itself
      const isNotInputType = !addr.addr.startsWith('N11:') && !addr.addr.startsWith('I:')

      if (addr.instType === 'XIC' && isNotInputType) {
        if (isPhysicalOutput || (isBitFileAddress && (isLastInRung || nextIsInputType))) {
          addr.instType = 'OTE'
        }
      }
    }

    // Group addresses by rung index, then further split on output instructions
    // Output instructions (OTE, OTL, OTU, TON, TOF, RTO, CTU, CTD) typically end a rung
    const outputInstructionTypes = ['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'RTO', 'CTU', 'CTD', 'RES', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV']

    const addressesByRung = new Map<number, ParsedAddress[]>()
    for (const addr of fileAddresses) {
      const rungIdx = getFileRungIndex(addr.pos)
      if (!addressesByRung.has(rungIdx)) {
        addressesByRung.set(rungIdx, [])
      }
      addressesByRung.get(rungIdx)!.push(addr)
    }

    // Process rung groups: detect parallel paths within each rung and assign branchLeg
    // Check if there are addresses before the first pattern (rung 0)
    // If yes: total rungs = patterns + 1 (rung 0 exists before first pattern)
    // If no: total rungs = patterns (first pattern marks rung 0, not rung 1)
    const hasRung0Content = addressesByRung.has(0) && addressesByRung.get(0)!.length > 0
    const splitRungGroups: ParsedAddress[][] = []

    // Determine which rung indices to process
    // With rung 0 content: process indices 0 to N (where N = number of patterns)
    // Without rung 0 content: process indices 1 to N (skip empty rung 0)
    const rungIndicesToProcess: number[] = []
    if (hasRung0Content) {
      for (let i = 0; i <= fileRungStarts.length; i++) {
        rungIndicesToProcess.push(i)
      }
    } else {
      for (let i = 1; i <= fileRungStarts.length; i++) {
        rungIndicesToProcess.push(i)
      }
    }

    for (const rungIdx of rungIndicesToProcess) {
      const group = addressesByRung.get(rungIdx) || []

      // Detect parallel paths using multiple methods:
      // 1. CBranchLeg text markers (already set in addr.branchLeg from getBranchLeg)
      // 2. Binary "clean marker" pattern (isNewParallelPath)
      // 3. branchStart markers

      // Detect parallel paths using binary "clean marker" pattern
      // The binary pattern marks branch points, but we need smarter grouping
      // to match RSLogix visual structure where instructions on the same
      // horizontal row belong to the same branchLeg

      // Output instruction types that typically end a branch row
      const outputTypes = ['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'RTO', 'CTU', 'CTD', 'MOV', 'JSR', 'RET']

      // First pass: mark all binary pattern matches
      const branchMarkers: boolean[] = []
      for (let i = 0; i < group.length; i++) {
        branchMarkers[i] = i > 0 && isNewParallelPath(group[i].pos)
      }

      // Second pass: smart grouping
      // Only start a new branchLeg when we see a branch marker AND:
      // 1. The previous leg had at least one output (completed a branch), OR
      // 2. This is an input instruction after we've processed the main row
      let currentBranchLeg = 0
      let binaryBranchesFound = 0
      let outputCountOnCurrentLeg = 0
      let mainRowComplete = false  // True after first branch marker

      for (let i = 0; i < group.length; i++) {
        const addr = group[i]
        const isOutput = outputTypes.includes(addr.instType)
        const hasBranchMarker = branchMarkers[i]

        // Decide whether to start a new leg
        if (hasBranchMarker) {
          // First branch marker after main row - always start new leg
          if (!mainRowComplete) {
            mainRowComplete = true
            currentBranchLeg++
            binaryBranchesFound++
            outputCountOnCurrentLeg = 0  // Reset output count for new branch
            addr.branchStart = true
          }
          // Subsequent markers: only new leg if we've completed at least one output
          // on the current leg (meaning we finished a parallel branch)
          else if (outputCountOnCurrentLeg > 0) {
            currentBranchLeg++
            binaryBranchesFound++
            outputCountOnCurrentLeg = 0
            addr.branchStart = true
          }
          // Otherwise, stay on current leg (continuing the same branch row)
        }

        // Assign branch leg
        addr.branchLeg = currentBranchLeg

        // Track outputs on current leg
        if (isOutput) {
          outputCountOnCurrentLeg++
        }
      }

      if (binaryBranchesFound > 0) {
        console.log(`[RSS Parser] Rung ${rungIdx}: Grouped into ${currentBranchLeg + 1} branch legs (${binaryBranchesFound} branch starts)`)
      }

      // Post-processing: merge legs where an input on leg N+1 should be on leg N
      // This handles cases where binary order is: input1, output1, input2, output2
      // but visual order should be: input1, input2, output1 (with output2 on sub-branch)
      //
      // Heuristic: If leg N ends with an output, and leg N+1 starts with inputs
      // followed by an output on the SAME tag (like OTE followed by OTL), then
      // the inputs from leg N+1 should move to leg N
      const inputTypes = ['XIC', 'XIO']
      const legGroups = new Map<number, typeof group>()
      for (const addr of group) {
        const leg = addr.branchLeg ?? 0
        if (!legGroups.has(leg)) legGroups.set(leg, [])
        legGroups.get(leg)!.push(addr)
      }

      // Check each pair of adjacent legs for merge opportunity
      const sortedLegs = Array.from(legGroups.keys()).sort((a, b) => a - b)
      for (let i = 0; i < sortedLegs.length - 1; i++) {
        const legN = sortedLegs[i]
        const legN1 = sortedLegs[i + 1]
        const legNAddrs = legGroups.get(legN)!
        const legN1Addrs = legGroups.get(legN1)!

        if (legNAddrs.length === 0 || legN1Addrs.length === 0) continue

        // Find last output on leg N
        const lastOutputN = [...legNAddrs].reverse().find(a => outputTypes.includes(a.instType))
        if (!lastOutputN) continue

        // Find outputs on leg N+1
        const outputsN1 = legN1Addrs.filter(a => outputTypes.includes(a.instType))
        if (outputsN1.length === 0) continue

        // Check if any output on leg N+1 is on the same tag as leg N's last output
        // (like OTE GATESTOPREQUEST followed by OTL GATESTOPREQUEST)
        const sameTagOutput = outputsN1.find(a => a.addr === lastOutputN.addr)
        if (sameTagOutput) {
          // This looks like a sub-branch pattern
          // Move inputs from leg N+1 to leg N (they should be on the same visual row)
          const inputsToMove = legN1Addrs.filter(a => inputTypes.includes(a.instType))
          for (const input of inputsToMove) {
            input.branchLeg = legN
            // Also update the leg groups
            legGroups.get(legN)!.push(input)
          }
          // Keep only outputs on leg N+1
          legGroups.set(legN1, legN1Addrs.filter(a => !inputTypes.includes(a.instType)))

          if (rungIdx === 2) {
            console.log(`[RSS Parser] Rung 2: Merged ${inputsToMove.length} inputs from leg ${legN1} to leg ${legN}`)
          }
        }
      }

      // Second merge pass: Handle output-only legs
      // If a leg has ONLY outputs (no inputs), and ANY output shares a tag with
      // an output from a PREVIOUS leg that HAS inputs, merge the output-only leg
      // into that previous leg (so they share the same conditions)
      const updatedSortedLegs = Array.from(legGroups.keys()).sort((a, b) => a - b)
      for (let i = updatedSortedLegs.length - 1; i >= 0; i--) {
        const currentLeg = updatedSortedLegs[i]
        const currentLegAddrs = legGroups.get(currentLeg)!

        // Check if this leg is output-only (no inputs)
        const hasInputs = currentLegAddrs.some(a => inputTypes.includes(a.instType))
        if (hasInputs) continue

        // This leg has only outputs - look for a previous leg to merge into
        const currentOutputTags = currentLegAddrs
          .filter(a => outputTypes.includes(a.instType))
          .map(a => a.addr)

        // Search previous legs for one with matching output tag AND has inputs
        for (let j = i - 1; j >= 0; j--) {
          const prevLeg = updatedSortedLegs[j]
          const prevLegAddrs = legGroups.get(prevLeg)!

          // Previous leg must have inputs (conditions)
          const prevHasInputs = prevLegAddrs.some(a => inputTypes.includes(a.instType))
          if (!prevHasInputs) continue

          // Check if any output tag matches
          const prevOutputTags = prevLegAddrs
            .filter(a => outputTypes.includes(a.instType))
            .map(a => a.addr)

          const hasMatchingTag = currentOutputTags.some(tag => prevOutputTags.includes(tag))
          if (hasMatchingTag) {
            // Merge: move all outputs from current leg to previous leg
            console.log(`[RSS Parser] Rung ${rungIdx}: Merging output-only leg ${currentLeg} into leg ${prevLeg} (shared tag)`)
            for (const addr of currentLegAddrs) {
              addr.branchLeg = prevLeg
              legGroups.get(prevLeg)!.push(addr)
            }
            legGroups.set(currentLeg, [])
            break
          }
        }
      }

      // After merging, reorder instructions within each leg to put inputs before outputs
      // This matches RSLogix visual order: contacts → coils
      // Also sort the main group array to reflect this order
      const reorderedGroup: typeof group = []
      for (const leg of sortedLegs) {
        const addrs = legGroups.get(leg)!
        if (addrs.length <= 1) {
          reorderedGroup.push(...addrs)
          continue
        }

        // Separate inputs and outputs, preserving relative order within each group
        const inputs = addrs.filter(a => inputTypes.includes(a.instType))
        const outputs = addrs.filter(a => !inputTypes.includes(a.instType))

        // Add inputs first, then outputs
        reorderedGroup.push(...inputs, ...outputs)
      }

      // Replace the group contents with reordered version
      group.length = 0
      group.push(...reorderedGroup)

      // Trust the rung boundaries from 07 80 09 80 pattern
      // Each group is one rung - include even if empty
      splitRungGroups.push(group)

      // Debug: log branch distribution for this rung
      const branchLegsInRung = new Set(group.map(a => a.branchLeg ?? 0))
      if (branchLegsInRung.size > 1) {
        console.log(`[RSS Parser] Rung ${rungIdx} has ${branchLegsInRung.size} branch legs: ${[...branchLegsInRung].join(', ')}`)
      }
    }

    const rungs: PlcRung[] = []
    let rungNumber = 0

    // Create a rung for each split group (including empty rungs like END/RET)
    for (const currentRungAddresses of splitRungGroups) {

      // Convert addresses to instructions, handling multi-operand instructions
      const instructions: PlcInstruction[] = []
      let j = 0
      while (j < currentRungAddresses.length) {
          const a = currentRungAddresses[j]

          // Check if this is a MOV instruction with a constant source
          if (a.instType === 'MOV' && a.sourceConstant) {
            // MOV instruction with constant source: MOV(source, dest)
            instructions.push({
              type: 'MOV',
              operands: [a.sourceConstant, getDisplayName(a.addr)],
              branchLeg: a.branchLeg,
              branchLevel: a.branchLevel,
              branchStart: a.branchStart
            })
            j++
            continue
          }

          // Check if this is a comparison instruction with sourceA
          const comparisonTypes = ['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ']
          if (comparisonTypes.includes(a.instType) && a.sourceA) {
            // Comparison instruction: EQU(sourceA, sourceB)
            instructions.push({
              type: a.instType,
              operands: [getDisplayName(a.sourceA), getDisplayName(a.addr)],
              branchLeg: a.branchLeg,
              branchLevel: a.branchLevel,
              branchStart: a.branchStart
            })
            j++
            continue
          }

          // Check if this is a math instruction with sourceA and sourceB
          const mathTypes = ['ADD', 'SUB', 'MUL', 'DIV']
          if (mathTypes.includes(a.instType) && a.sourceA) {
            // Math instruction: ADD(sourceA, sourceB, dest)
            const sourceB = a.sourceB || a.sourceA // Use sourceA if sourceB not found
            instructions.push({
              type: a.instType,
              operands: [getDisplayName(a.sourceA), getDisplayName(sourceB), getDisplayName(a.addr)],
              branchLeg: a.branchLeg,
              branchLevel: a.branchLevel,
              branchStart: a.branchStart
            })
            j++
            continue
          }

          // Check if this is a timer instruction
          const timerTypes = ['TON', 'TOF', 'RTO']
          if (timerTypes.includes(a.instType)) {
            // Timer instruction: TON(timer, timeBase, preset, accum)
            const operands = [getDisplayName(a.addr)]
            if (a.timerParams?.timeBase) operands.push(a.timerParams.timeBase)
            else operands.push('1.0')  // Default time base
            if (a.timerParams?.preset) operands.push(a.timerParams.preset)
            else operands.push('0')    // Default preset
            if (a.timerParams?.accum) operands.push(a.timerParams.accum)
            else operands.push('0')    // Default accum

            instructions.push({
              type: a.instType,
              operands,
              branchLeg: a.branchLeg,
              branchLevel: a.branchLevel,
              branchStart: a.branchStart
            })
            j++
            continue
          }

          // Check if this is a counter instruction
          const counterTypes = ['CTU', 'CTD']
          if (counterTypes.includes(a.instType)) {
            // Counter instruction: CTU(counter, preset, accum)
            const operands = [getDisplayName(a.addr)]
            if (a.counterParams?.preset) operands.push(a.counterParams.preset)
            else operands.push('0')    // Default preset
            if (a.counterParams?.accum) operands.push(a.counterParams.accum)
            else operands.push('0')    // Default accum

            instructions.push({
              type: a.instType,
              operands,
              branchLeg: a.branchLeg,
              branchLevel: a.branchLevel,
              branchStart: a.branchStart
            })
            j++
            continue
          }

          // Check if this is a multi-operand instruction
          if (a.operandCount > 1 && j + a.operandCount - 1 < currentRungAddresses.length) {
            const nextAddrs = currentRungAddresses.slice(j + 1, j + a.operandCount)
            const conditionTypes = ['XIC', 'XIO']
            // Check operands are valid (not conditions, and close by in position)
            const allValid = nextAddrs.every((next, idx) => {
              const prevA = idx === 0 ? a : currentRungAddresses[j + idx]
              const distance = next.pos - prevA.pos
              return !conditionTypes.includes(next.instType) && distance < 150
            })

            if (allValid && nextAddrs.length === a.operandCount - 1) {
              instructions.push({
                type: a.instType,
                operands: [getDisplayName(a.addr), ...nextAddrs.map(x => getDisplayName(x.addr))],
                branchLeg: a.branchLeg,
                branchLevel: a.branchLevel,
                branchStart: a.branchStart
              })
              j += a.operandCount
              continue
            }
          }

          // Single operand
          instructions.push({
            type: a.instType,
            operands: [getDisplayName(a.addr)],
            branchLeg: a.branchLeg,
            branchLevel: a.branchLevel,
            branchStart: a.branchStart
          })
          j++
        }

        // Generate rawText with branch indicators
        const rawText = formatInstructionsWithBranches(instructions)

        // Debug: count branch legs in this rung
        const branchLegsInRung = new Set(instructions.map(i => i.branchLeg ?? 0))
        const debugInfo = branchLegsInRung.size > 1
          ? ` [DEBUG: ${branchLegsInRung.size} branch legs: ${[...branchLegsInRung].join(',')}]`
          : ''

        rungs.push({
          number: rungNumber++,
          rawText: rawText + debugInfo,
          instructions
      })
    }

    if (rungs.length > 0) {
      routineRungs.set(fileName, rungs)
      console.log(`[RSS Parser] Ladder file "${fileName}": ${rungs.length} rungs`)
    }
  }

  // Handle case where no ladder files found
  if (routineRungs.size === 0 && allAddresses.length > 0) {
    console.log('[RSS Parser] No ladder files found, creating single MAIN routine')
    const rungs: PlcRung[] = []
    let rungNumber = 0
    let currentRungInstructions: PlcInstruction[] = []
    const fallbackOutputTypes = ['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'RTO', 'CTU', 'CTD', 'RES', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV']

    const comparisonTypes = ['EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ']
    const mathTypes = ['ADD', 'SUB', 'MUL', 'DIV']
    const timerTypes = ['TON', 'TOF', 'RTO']
    const counterTypes = ['CTU', 'CTD']
    for (const addr of allAddresses) {
      // Handle MOV with constant source
      if (addr.instType === 'MOV' && addr.sourceConstant) {
        currentRungInstructions.push({
          type: 'MOV',
          operands: [addr.sourceConstant, getDisplayName(addr.addr)],
          branchLeg: addr.branchLeg,
          branchLevel: addr.branchLevel
        })
      } else if (comparisonTypes.includes(addr.instType) && addr.sourceA) {
        // Handle comparison instructions with sourceA
        currentRungInstructions.push({
          type: addr.instType,
          operands: [getDisplayName(addr.sourceA), getDisplayName(addr.addr)],
          branchLeg: addr.branchLeg,
          branchLevel: addr.branchLevel
        })
      } else if (mathTypes.includes(addr.instType) && addr.sourceA) {
        // Handle math instructions with sourceA and sourceB
        const sourceB = addr.sourceB || addr.sourceA
        currentRungInstructions.push({
          type: addr.instType,
          operands: [getDisplayName(addr.sourceA), getDisplayName(sourceB), getDisplayName(addr.addr)],
          branchLeg: addr.branchLeg,
          branchLevel: addr.branchLevel
        })
      } else if (timerTypes.includes(addr.instType) && addr.timerParams?.preset) {
        // Handle timer instructions with parameters
        currentRungInstructions.push({
          type: addr.instType,
          operands: [getDisplayName(addr.addr), addr.timerParams.timeBase || '1.0', addr.timerParams.preset, addr.timerParams.accum || '0'],
          branchLeg: addr.branchLeg,
          branchLevel: addr.branchLevel
        })
      } else if (counterTypes.includes(addr.instType) && addr.counterParams?.preset) {
        // Handle counter instructions with parameters
        currentRungInstructions.push({
          type: addr.instType,
          operands: [getDisplayName(addr.addr), addr.counterParams.preset, addr.counterParams.accum || '0'],
          branchLeg: addr.branchLeg,
          branchLevel: addr.branchLevel
        })
      } else {
        currentRungInstructions.push({
          type: addr.instType,
          operands: [getDisplayName(addr.addr)],
          branchLeg: addr.branchLeg,
          branchLevel: addr.branchLevel
        })
      }

      const isOutput = fallbackOutputTypes.includes(addr.instType)
      if (isOutput || currentRungInstructions.length >= 15) {
        rungs.push({
          number: rungNumber++,
          rawText: formatInstructionsWithBranches(currentRungInstructions),
          instructions: currentRungInstructions
        })
        currentRungInstructions = []
      }
    }

    if (currentRungInstructions.length > 0) {
      rungs.push({
        number: rungNumber++,
        rawText: formatInstructionsWithBranches(currentRungInstructions),
        instructions: currentRungInstructions
      })
    }

    routineRungs.set('MAIN', rungs)
  }

  const totalRungs = [...routineRungs.values()].reduce((sum, r) => sum + r.length, 0)
  console.log(`[RSS Parser] Created ${totalRungs} rungs across ${routineRungs.size} routines`)

  // Log timer/counter extraction summary
  if (programTimerValues.size > 0) {
    console.log(`[RSS Parser] Extracted ${programTimerValues.size} timer values from PROGRAM FILES:`)
    const timerSamples = [...programTimerValues.entries()].slice(0, 5)
    for (const [addr, val] of timerSamples) {
      console.log(`  ${addr}: timeBase=${val.timeBase}s, PRE=${val.preset}, ACC=${val.accum}`)
    }
    if (programTimerValues.size > 5) {
      console.log(`  ... and ${programTimerValues.size - 5} more timers`)
    }
  }

  if (programCounterValues.size > 0) {
    console.log(`[RSS Parser] Extracted ${programCounterValues.size} counter values from PROGRAM FILES:`)
    const counterSamples = [...programCounterValues.entries()].slice(0, 5)
    for (const [addr, val] of counterSamples) {
      console.log(`  ${addr}: PRE=${val.preset}, ACC=${val.accum}`)
    }
    if (programCounterValues.size > 5) {
      console.log(`  ... and ${programCounterValues.size - 5} more counters`)
    }
  }

  return { routineRungs, addresses, ladderFiles }
}

/**
 * Format a binary address reference to string format
 */
function formatBinaryAddress(fileType: number, fileNum: number, element: number, bit?: number): string | null {
  const typeCode = SLC500_FILE_TYPES_BINARY[fileType & 0x0F]
  if (!typeCode) return null

  let addr = `${typeCode}${fileNum}:${element}`
  if (bit !== undefined) {
    addr += `/${bit}`
  }

  return addr
}

/**
 * Extract all RSLogix 500 style addresses from text
 */
function extractAddresses(text: string): Set<string> {
  const addresses = new Set<string>()

  // Pattern for SLC 500 addresses: B3:0/15, N7:5, T4:0.DN, I:0/0, O:0/0, HSC0.0
  const patterns = [
    /[BIOTCRNFSALDMGPSC][A-Z]?\d*:\d+(?:\/\d+)?(?:\.[A-Z]+)?/gi,
    /[IO]:\d+(?:\/\d+)?/gi,  // I:0/0, O:0/0 format
    /HSC\d+(?:\.\d+)?/gi,    // HSC0, HSC1.0, etc.
  ]

  for (const pattern of patterns) {
    const matches = text.matchAll(pattern)
    for (const match of matches) {
      // Validate it looks like a real address
      const addr = match[0].toUpperCase()
      if (addr.length >= 3 && addr.length <= 20) {
        addresses.add(addr)
      }
    }
  }

  return addresses
}

/**
 * Extract rungs from binary data using multiple strategies
 */
function extractRungs(data: Buffer, text: string, addresses: Set<string>): PlcRung[] {
  const rungs: PlcRung[] = []

  // Log some binary analysis
  console.log(`[RSS Parser] PROGRAM FILES size: ${data.length} bytes`)

  // RSLogix 500 PROGRAM FILES format analysis:
  // The file has a header followed by ladder file entries
  // Each ladder file (LAD 2, 3, etc.) contains rungs
  // Rungs contain instruction opcodes and operand references

  // Try to find rung boundaries by looking for patterns
  // RSLogix 500 often uses 0xFF or specific byte patterns as delimiters

  // Strategy 0: Try to parse binary structure
  // Look for repeating patterns that might indicate rung boundaries
  const rungCandidates: number[] = []
  for (let i = 0; i < data.length - 4; i++) {
    // Look for potential rung start markers
    // Common patterns: 0x00 0x00 followed by instruction data
    if (data[i] === 0x00 && data[i + 1] === 0x00 && data[i + 2] !== 0x00 && data[i + 3] !== 0x00) {
      // Could be a rung boundary
      if (rungCandidates.length === 0 || i - rungCandidates[rungCandidates.length - 1] > 10) {
        rungCandidates.push(i)
      }
    }
  }
  console.log(`[RSS Parser] Found ${rungCandidates.length} potential rung boundaries`)

  // Strategy 1: Look for instruction mnemonics in the text
  const instructionPattern = /\b(XIC|XIO|OTE|OTL|OTU|ONS|OSR|OSF|TON|TOF|RTO|CTU|CTD|RES|ADD|SUB|MUL|DIV|MOV|MVM|COP|FLL|EQU|NEQ|LES|LEQ|GRT|GEQ|LIM|MEQ|JMP|LBL|JSR|SBR|RET|MCR|SQO|SQI|SQC|SQL|BSL|BSR|FFL|FFU|LFL|LFU|MSG|PID|AND|OR|XOR|NOT|NEG|CLR|ABS|SQR|CPT|DDV|FRD|TOD|DCD|ENC)\b/gi

  const instructionMatches = [...text.matchAll(instructionPattern)]
  console.log(`[RSS Parser] Found ${instructionMatches.length} instruction mnemonics in text`)

  if (instructionMatches.length > 0) {
    // Group instructions into rungs
    // Look for patterns: instruction followed by nearby address
    let currentInstructions: PlcInstruction[] = []
    let currentRawText = ''
    let rungNumber = 0

    for (let i = 0; i < instructionMatches.length; i++) {
      const match = instructionMatches[i]
      const instType = match[1].toUpperCase()
      const position = match.index || 0

      // Look for an address near this instruction (within 50 chars)
      const nearbyText = text.substring(position, position + 50)
      const addrMatch = nearbyText.match(/[BIOTCRNFSALDMGPSC][A-Z]?\d*:\d+(?:\/\d+)?(?:\.[A-Z]+)?|HSC\d+(?:\.\d+)?/i)
      const operand = addrMatch ? addrMatch[0].toUpperCase() : ''

      currentInstructions.push({
        type: instType,
        operands: operand ? [operand] : []
      })
      currentRawText += operand ? `${instType}(${operand})` : `${instType}()`

      // End rung on output instructions or after several instructions
      const isOutput = ['OTE', 'OTL', 'OTU', 'RES', 'TON', 'TOF', 'RTO', 'CTU', 'CTD', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'JSR', 'JMP', 'RET'].includes(instType)

      if (isOutput || currentInstructions.length >= 8) {
        if (currentInstructions.length > 0) {
          rungs.push({
            number: rungNumber++,
            rawText: currentRawText,
            instructions: currentInstructions
          })
          currentInstructions = []
          currentRawText = ''
        }
      }
    }

    // Add any remaining instructions
    if (currentInstructions.length > 0) {
      rungs.push({
        number: rungNumber++,
        rawText: currentRawText,
        instructions: currentInstructions
      })
    }
  }

  // Strategy 2: If no instructions found, create synthetic rungs from addresses
  if (rungs.length === 0 && addresses.size > 0) {
    console.log('[RSS Parser] No instruction mnemonics found, creating rungs from addresses')

    // Group addresses by type and create representative rungs
    const inputs: string[] = []
    const outputs: string[] = []
    const internals: string[] = []

    for (const addr of addresses) {
      if (addr.startsWith('I:') || addr.startsWith('I ')) {
        inputs.push(addr)
      } else if (addr.startsWith('O:') || addr.startsWith('O ')) {
        outputs.push(addr)
      } else {
        internals.push(addr)
      }
    }

    let rungNumber = 0

    // Create a rung showing inputs
    if (inputs.length > 0) {
      const instructions: PlcInstruction[] = inputs.slice(0, 10).map(addr => ({
        type: 'XIC',
        operands: [addr]
      }))
      rungs.push({
        number: rungNumber++,
        comment: 'Physical Inputs (auto-detected)',
        rawText: instructions.map(i => `XIC(${i.operands[0]})`).join(''),
        instructions
      })
    }

    // Create a rung showing outputs
    if (outputs.length > 0) {
      const instructions: PlcInstruction[] = outputs.slice(0, 10).map(addr => ({
        type: 'OTE',
        operands: [addr]
      }))
      rungs.push({
        number: rungNumber++,
        comment: 'Physical Outputs (auto-detected)',
        rawText: instructions.map(i => `OTE(${i.operands[0]})`).join(''),
        instructions
      })
    }

    // Create rungs for timers
    const timers = [...addresses].filter(a => a.startsWith('T'))
    for (const timer of timers.slice(0, 5)) {
      rungs.push({
        number: rungNumber++,
        comment: `Timer ${timer}`,
        rawText: `TON(${timer})`,
        instructions: [{ type: 'TON', operands: [timer] }]
      })
    }

    // Create rungs for counters
    const counters = [...addresses].filter(a => a.startsWith('C'))
    for (const counter of counters.slice(0, 5)) {
      rungs.push({
        number: rungNumber++,
        comment: `Counter ${counter}`,
        rawText: `CTU(${counter})`,
        instructions: [{ type: 'CTU', operands: [counter] }]
      })
    }

    // Create rungs for bit operations
    const bits = [...addresses].filter(a => a.startsWith('B'))
    if (bits.length > 0) {
      const bitInstructions: PlcInstruction[] = bits.slice(0, 5).map(addr => ({
        type: 'XIC',
        operands: [addr]
      }))
      if (bitInstructions.length > 0) {
        bitInstructions.push({ type: 'OTE', operands: [bits[0] || 'B3:0/0'] })
        rungs.push({
          number: rungNumber++,
          comment: 'Internal Bits (auto-detected)',
          rawText: bitInstructions.map(i => `${i.type}(${i.operands[0]})`).join(''),
          instructions: bitInstructions
        })
      }
    }

    // Create rungs for integers/math
    const integers = [...addresses].filter(a => a.startsWith('N'))
    if (integers.length >= 2) {
      rungs.push({
        number: rungNumber++,
        comment: 'Integer Operations (auto-detected)',
        rawText: `MOV(${integers[0]},${integers[1]})`,
        instructions: [{ type: 'MOV', operands: [integers[0], integers[1]] }]
      })
    }
  }

  // Strategy 3: If still no rungs, create placeholder
  if (rungs.length === 0) {
    console.log('[RSS Parser] Creating placeholder rung - binary format could not be parsed')
    rungs.push({
      number: 0,
      comment: 'RSLogix 500 binary format - detailed parsing not yet supported',
      rawText: '// Binary ladder logic - addresses extracted below',
      instructions: []
    })

    // List found addresses as info
    if (addresses.size > 0) {
      rungs.push({
        number: 1,
        comment: `Found ${addresses.size} addresses: ${[...addresses].slice(0, 20).join(', ')}${addresses.size > 20 ? '...' : ''}`,
        rawText: '// See tags list for all detected addresses',
        instructions: []
      })
    }
  }

  return rungs
}

/**
 * Parse an RSLogix 500 address string
 */
export function parseRss500Address(address: string): {
  fileType: string
  fileNumber: number
  element: number
  bit?: number
  subfield?: string
} | null {
  // Match HSC addresses first (HSC0, HSC1.0, etc.)
  const hscMatch = address.match(/^(HSC)(\d+)(?:\.(\d+))?$/i)
  if (hscMatch) {
    return {
      fileType: 'HSC',
      fileNumber: parseInt(hscMatch[2]),
      element: hscMatch[3] ? parseInt(hscMatch[3]) : 0,
      subfield: hscMatch[3] ? `.${hscMatch[3]}` : undefined
    }
  }

  // Match patterns like B3:0/15, N7:5, T4:0.DN, I:0/0
  const match = address.match(/^([BIOTCRNFSALDMGPSC][A-Z]?)(\d+)?:(\d+)(?:\/(\d+))?(?:\.([A-Z]+))?$/i)

  if (!match) return null

  return {
    fileType: match[1].toUpperCase(),
    fileNumber: match[2] ? parseInt(match[2]) : 0,
    element: parseInt(match[3]),
    bit: match[4] ? parseInt(match[4]) : undefined,
    subfield: match[5] ? `.${match[5].toUpperCase()}` : undefined
  }
}

/**
 * Format RSLogix 500 address for display
 */
export function formatRss500Address(address: string): string {
  const parsed = parseRss500Address(address)
  if (!parsed) return address

  const fileInfo = RSS500_FILE_TYPES[parsed.fileType] || { name: parsed.fileType, description: '' }

  let result = `${fileInfo.name} ${parsed.fileNumber}:${parsed.element}`

  if (parsed.bit !== undefined) {
    result += `, Bit ${parsed.bit}`
  }

  if (parsed.subfield) {
    const subfieldName = TIMER_COUNTER_SUBFIELDS[parsed.subfield] || parsed.subfield
    result += ` (${subfieldName})`
  }

  return result
}

/**
 * Convert RSLogix 500 address to a PlcTag
 */
function addressToTag(address: string): PlcTag | null {
  const parsed = parseRss500Address(address)
  if (!parsed) return null

  const fileInfo = RSS500_FILE_TYPES[parsed.fileType] || { name: parsed.fileType, description: '' }

  // Look up symbol name from symbol table
  const symbol = lookupSymbol(address)

  // Determine data type based on file type
  let dataType = 'INT'
  switch (parsed.fileType) {
    case 'B':
    case 'I':
    case 'O':
      dataType = 'BOOL'
      break
    case 'T':
      dataType = 'TIMER'
      break
    case 'C':
      dataType = 'COUNTER'
      break
    case 'N':
      dataType = 'INT'
      break
    case 'F':
      dataType = 'REAL'
      break
    case 'ST':
      dataType = 'STRING'
      break
    case 'L':
      dataType = 'DINT'
      break
    case 'R':
      dataType = 'CONTROL'
      break
  }

  // Build description: include symbol name and description if available
  let description = `${fileInfo.name} - ${fileInfo.description}`
  if (symbol) {
    description = symbol.description || symbol.symbol
  }

  // Look up data value for this address
  const dataValue = lookupDataValue(address)
  let value: string | undefined
  if (dataValue !== undefined) {
    value = String(dataValue)
  }

  return {
    name: symbol ? symbol.symbol : address,
    aliasFor: symbol ? address : undefined,  // Store address as aliasFor if we have a symbol
    dataType,
    scope: 'controller',
    description,
    value
  }
}

/**
 * Check if a buffer is an RSS file (OLE compound document)
 */
export function isRSSFile(buffer: ArrayBuffer): boolean {
  const header = new Uint8Array(buffer.slice(0, 8))
  // OLE Compound Document signature: D0 CF 11 E0 A1 B1 1A E1
  return header[0] === 0xD0 &&
         header[1] === 0xCF &&
         header[2] === 0x11 &&
         header[3] === 0xE0 &&
         header[4] === 0xA1 &&
         header[5] === 0xB1 &&
         header[6] === 0x1A &&
         header[7] === 0xE1
}
