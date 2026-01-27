/**
 * RSLogix 500 (.RSS) File Parser
 *
 * Parses SLC 500/MicroLogix ladder logic files.
 * RSS files are OLE compound documents with zlib-compressed program data.
 */

import CFB from 'cfb'
import { inflateSync, inflateRawSync, gunzipSync } from 'zlib'
import type { PlcProject, PlcProgram, PlcRoutine, PlcRung, PlcInstruction, PlcTag } from './l5x-parser'

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

/**
 * Get the symbol table (for use by other modules)
 */
export function getSymbolTable(): Map<string, RssSymbol> {
  return symbolTable
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
 * Timer instructions are followed by: [len][timebase][len][preset][len][accum]
 * Example: T4:14 followed by 04 30 2e 30 31 (0.01) 03 33 30 30 (300) 01 30 (0)
 */
function extractTimerParams(data: Buffer, text: string, timerAddrPos: number, timerAddrLen: number): { timeBase: string | null, preset: string | null, accum: string | null } {
  const afterPos = timerAddrPos + timerAddrLen
  const maxSearch = 20

  const params: string[] = []

  let pos = afterPos
  while (params.length < 3 && pos < afterPos + maxSearch && pos < data.length - 1) {
    const len = data[pos]
    if (len >= 1 && len <= 10 && pos + len < data.length) {
      let isValid = true
      let value = ''
      for (let i = 1; i <= len; i++) {
        const c = data[pos + i]
        // Allow digits and decimal point
        if ((c >= 0x30 && c <= 0x39) || c === 0x2e) {
          value += String.fromCharCode(c)
        } else {
          isValid = false
          break
        }
      }
      if (isValid && value.length === len && /^\d+\.?\d*$/.test(value)) {
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
    accum: params[2] || null
  }
}

/**
 * Extract counter parameters (preset, accumulated) from binary data
 * Counter instructions are followed by: [len][preset][len][accum]
 */
function extractCounterParams(data: Buffer, text: string, counterAddrPos: number, counterAddrLen: number): { preset: string | null, accum: string | null } {
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
        if (c >= 0x30 && c <= 0x39) {
          value += String.fromCharCode(c)
        } else {
          isValid = false
          break
        }
      }
      if (isValid && value.length === len && /^\d+$/.test(value)) {
        params.push(value)
        pos += len + 1
        continue
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
 * Extract both Source A and Source B operands for math instructions (ADD, SUB, MUL, DIV)
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

  return {
    name: projectName,
    processorType,
    softwareVersion: 'RSLogix 500',
    tags,
    programs: [mainProgram],
    tasks: [],
    modules: [],
    dataTypes: []
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
  const addrPattern = /([BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?)/gi
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
  const addressPattern = /\b([BIOTCRNFSAL])(\d+):(\d+)(?:\/(\d+))?(?:\.([A-Z]+))?\b/gi
  const ioPattern = /\b([IO]):(\d+)(?:\/(\d+))?\b/gi

  // Find all addresses
  let match
  while ((match = addressPattern.exec(text)) !== null) {
    const addr = match[0].toUpperCase()
    // Validate reasonable file numbers (0-255) and elements (0-999)
    const fileNum = parseInt(match[2])
    const element = parseInt(match[3])
    if (fileNum <= 255 && element <= 999) {
      addresses.add(addr)
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
        const name = Buffer.from(nameBytes).toString('latin1').trim()

        // Validate it's a proper routine name (letters, numbers, underscore, space allowed)
        if (name.length >= 2 && /^[A-Z][A-Z0-9_ ]*$/i.test(name) &&
            !['CProgHolder', 'CLadFile', 'CRung', 'CIns', 'CBranch', 'CBranchLeg', 'MODE SEL'].includes(name)) {
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

  // Find rung START markers: pattern 00 00 01 00 00 0b 80
  // This pattern precedes the first instruction of each new rung
  // Branch instructions have 00 00 01 00 XX 0b 80 where XX > 0
  const rungStartPositions: number[] = []
  for (let i = 0; i < data.length - 10; i++) {
    if (data[i] === 0x00 &&
        data[i+1] === 0x00 &&
        data[i+2] === 0x01 &&
        data[i+3] === 0x00 &&
        data[i+4] === 0x00 &&  // Must be 00 for new rung (not branch)
        data[i+5] === 0x0b &&
        data[i+6] === 0x80) {
      rungStartPositions.push(i)
    }
  }

  // Also find CBranch markers (not CBranchLeg) which indicate visual rung boundaries
  // CBranch appears between output of one rung and input of next rung
  const cbranchMarker = 'CBranch'
  let searchPos = 0
  while (searchPos < text.length) {
    const idx = text.indexOf(cbranchMarker, searchPos)
    if (idx === -1) break
    // Make sure it's not CBranchLeg
    if (text.substring(idx, idx + 10) !== 'CBranchLeg') {
      // The next instruction after CBranch is a new visual rung
      // Find the position after CBranch where the next instruction marker would be
      // CBranch is followed by instruction data, so add its position
      rungStartPositions.push(idx)
    }
    searchPos = idx + cbranchMarker.length
  }

  // Sort and deduplicate rung positions
  rungStartPositions.sort((a, b) => a - b)
  const uniqueRungStarts = rungStartPositions.filter((pos, i) =>
    i === 0 || pos - rungStartPositions[i - 1] > 20
  )

  console.log(`[RSS Parser] Found ${uniqueRungStarts.length} rung boundaries (including CBranch markers)`)

  // Helper function to determine which rung a position belongs to
  function getRungIndex(pos: number): number {
    for (let i = uniqueRungStarts.length - 1; i >= 0; i--) {
      if (pos >= uniqueRungStarts[i]) {
        return i
      }
    }
    return 0
  }

  // Parse instructions using actual opcodes from binary
  // Format: [type byte at pos-6][0b][80][XX][00][length][address]
  // Note: XX can be 01, 04, etc. - not just 01
  const addrRegex3 = /([BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?)/gi

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
  function getBranchLeg(pos: number): number | undefined {
    for (const region of branchRegions) {
      if (pos > region.legStart && pos < region.branchEnd) {
        return region.legNumber
      }
    }
    return undefined
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

          // For MOV instructions (timer/counter PRE/ACC), look for constant source value
          let sourceConstant: string | undefined
          if (decoded.type === 'MOV' || addr.match(/\.(PRE|ACC)$/i)) {
            // Search backwards from the address marker position for a constant
            // The marker is at pos-5, so search before that
            const markerPos = pos - 5
            sourceConstant = extractConstantValue(data, markerPos) || undefined
            if (sourceConstant) {
              console.log(`[RSS Parser] Found constant ${sourceConstant} for MOV -> ${addr}`)
            }
          }

          // For comparison instructions (EQU, NEQ, LES, LEQ, GRT, GEQ), extract Source A
          // These opcodes are 0x10-0x15
          let sourceA: string | undefined
          let sourceB: string | undefined
          const comparisonOpcodes = [0x10, 0x11, 0x12, 0x13, 0x14, 0x15]
          if (comparisonOpcodes.includes(opcode)) {
            // Look backwards for Source A (either an address or constant)
            sourceA = extractSourceAOperand(data, text, pos) || undefined
            if (sourceA) {
              console.log(`[RSS Parser] Found Source A "${sourceA}" for ${decoded.type}(${sourceA}, ${addr})`)
            }
          }

          // For math instructions (ADD, SUB, MUL, DIV), extract Source A and Source B
          // These opcodes are 0x0A-0x0D
          const mathOpcodes = [0x0A, 0x0B, 0x0C, 0x0D]
          if (mathOpcodes.includes(opcode)) {
            const mathOperands = extractMathOperands(data, text, pos)
            sourceA = mathOperands.sourceA || undefined
            sourceB = mathOperands.sourceB || undefined
            if (sourceA && sourceB) {
              console.log(`[RSS Parser] Found operands for ${decoded.type}(${sourceA}, ${sourceB}, ${addr})`)
            }
          }

          // For timer instructions (TON, TOF, RTO), extract time base, preset, and accumulated
          let timerParams: { timeBase: string | null, preset: string | null, accum: string | null } | undefined
          if (decoded.type === 'TON' || decoded.type === 'TOF' || decoded.type === 'RTO') {
            timerParams = extractTimerParams(data, text, pos, addr.length)
            if (timerParams.preset) {
              console.log(`[RSS Parser] Timer ${addr}: timeBase=${timerParams.timeBase}, preset=${timerParams.preset}, accum=${timerParams.accum}`)
            }
          }

          // For counter instructions (CTU, CTD), extract preset and accumulated
          let counterParams: { preset: string | null, accum: string | null } | undefined
          if (decoded.type === 'CTU' || decoded.type === 'CTD') {
            counterParams = extractCounterParams(data, text, pos, addr.length)
            if (counterParams.preset) {
              console.log(`[RSS Parser] Counter ${addr}: preset=${counterParams.preset}, accum=${counterParams.accum}`)
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

          allAddresses.push({ pos, addr, opcode, instType: decoded.type, operandCount: decoded.operandCount, sourceConstant, sourceA, sourceB, timerParams, counterParams, branchLeg: getBranchLeg(pos) })
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
            branchLeg: getBranchLeg(pos)
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

    // First pass: identify likely output instructions based on patterns
    // In ladder logic, outputs typically come after inputs in each rung
    // We look for patterns where a bit address follows input addresses
    for (let i = 0; i < fileAddresses.length; i++) {
      const addr = fileAddresses[i]
      const nextAddr = fileAddresses[i + 1]

      // Physical output addresses are always outputs
      const isPhysicalOutput = addr.addr.startsWith('O:') || addr.addr.startsWith('O0:')

      // Check if next address is in a different rung (using markers)
      const currentRungIdx = getRungIndex(addr.pos)
      const nextRungIdx = nextAddr ? getRungIndex(nextAddr.pos) : currentRungIdx + 1
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
      const rungIdx = getRungIndex(addr.pos)
      if (!addressesByRung.has(rungIdx)) {
        addressesByRung.set(rungIdx, [])
      }
      addressesByRung.get(rungIdx)!.push(addr)
    }

    // Further split rung groups on output instructions
    // This handles cases where binary markers are too coarse
    const splitRungGroups: ParsedAddress[][] = []
    const sortedRungIndices = [...addressesByRung.keys()].sort((a, b) => a - b)
    for (const rungIdx of sortedRungIndices) {
      const group = addressesByRung.get(rungIdx)!
      if (group.length === 0) continue

      let currentGroup: ParsedAddress[] = []
      for (let i = 0; i < group.length; i++) {
        const addr = group[i]
        currentGroup.push(addr)

        // Check if this is an output instruction (not just the last one)
        const isOutput = outputInstructionTypes.includes(addr.instType)
        const hasMoreInstructions = i < group.length - 1

        // If this is an output and there are more instructions, split here
        // But only if the next instruction is NOT in a parallel branch with this one
        if (isOutput && hasMoreInstructions) {
          const nextAddr = group[i + 1]
          const sameTimerCounter = addr.addr.match(/^[TC]\d+:/) && nextAddr.addr.match(/^[TC]\d+:/) &&
                                   addr.addr.split('.')[0] === nextAddr.addr.split('.')[0]
          // Don't split if it's the same timer/counter (e.g., T4:14 and T4:14.DN)
          // Don't split if both are in the same branch leg
          const sameBranch = addr.branchLeg !== undefined && addr.branchLeg === nextAddr.branchLeg

          if (!sameTimerCounter && !sameBranch) {
            splitRungGroups.push(currentGroup)
            currentGroup = []
          }
        }
      }
      if (currentGroup.length > 0) {
        splitRungGroups.push(currentGroup)
      }
    }

    const rungs: PlcRung[] = []
    let rungNumber = 0

    // Create a rung for each split group
    for (const currentRungAddresses of splitRungGroups) {
      if (currentRungAddresses.length === 0) continue

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
              branchLeg: a.branchLeg
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
              branchLeg: a.branchLeg
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
              branchLeg: a.branchLeg
            })
            j++
            continue
          }

          // Check if this is a timer instruction with parameters
          const timerTypes = ['TON', 'TOF', 'RTO']
          if (timerTypes.includes(a.instType) && a.timerParams?.preset) {
            // Timer instruction: TON(timer, timeBase, preset, accum)
            instructions.push({
              type: a.instType,
              operands: [getDisplayName(a.addr), a.timerParams.timeBase || '1.0', a.timerParams.preset, a.timerParams.accum || '0'],
              branchLeg: a.branchLeg
            })
            j++
            continue
          }

          // Check if this is a counter instruction with parameters
          const counterTypes = ['CTU', 'CTD']
          if (counterTypes.includes(a.instType) && a.counterParams?.preset) {
            // Counter instruction: CTU(counter, preset, accum)
            instructions.push({
              type: a.instType,
              operands: [getDisplayName(a.addr), a.counterParams.preset, a.counterParams.accum || '0'],
              branchLeg: a.branchLeg
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
                branchLeg: a.branchLeg
              })
              j += a.operandCount
              continue
            }
          }

          // Single operand
          instructions.push({
            type: a.instType,
            operands: [getDisplayName(a.addr)],
            branchLeg: a.branchLeg
          })
          j++
        }

        // Generate rawText with branch indicators
        const rawText = formatInstructionsWithBranches(instructions)

        rungs.push({
          number: rungNumber++,
          rawText,
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
          branchLeg: addr.branchLeg
        })
      } else if (comparisonTypes.includes(addr.instType) && addr.sourceA) {
        // Handle comparison instructions with sourceA
        currentRungInstructions.push({
          type: addr.instType,
          operands: [getDisplayName(addr.sourceA), getDisplayName(addr.addr)],
          branchLeg: addr.branchLeg
        })
      } else if (mathTypes.includes(addr.instType) && addr.sourceA) {
        // Handle math instructions with sourceA and sourceB
        const sourceB = addr.sourceB || addr.sourceA
        currentRungInstructions.push({
          type: addr.instType,
          operands: [getDisplayName(addr.sourceA), getDisplayName(sourceB), getDisplayName(addr.addr)],
          branchLeg: addr.branchLeg
        })
      } else if (timerTypes.includes(addr.instType) && addr.timerParams?.preset) {
        // Handle timer instructions with parameters
        currentRungInstructions.push({
          type: addr.instType,
          operands: [getDisplayName(addr.addr), addr.timerParams.timeBase || '1.0', addr.timerParams.preset, addr.timerParams.accum || '0'],
          branchLeg: addr.branchLeg
        })
      } else if (counterTypes.includes(addr.instType) && addr.counterParams?.preset) {
        // Handle counter instructions with parameters
        currentRungInstructions.push({
          type: addr.instType,
          operands: [getDisplayName(addr.addr), addr.counterParams.preset, addr.counterParams.accum || '0'],
          branchLeg: addr.branchLeg
        })
      } else {
        currentRungInstructions.push({
          type: addr.instType,
          operands: [getDisplayName(addr.addr)],
          branchLeg: addr.branchLeg
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

  // Pattern for SLC 500 addresses: B3:0/15, N7:5, T4:0.DN, I:0/0, O:0/0
  const patterns = [
    /[BIOTCRNFSALDMGPSC][A-Z]?\d*:\d+(?:\/\d+)?(?:\.[A-Z]+)?/gi,
    /[IO]:\d+(?:\/\d+)?/gi,  // I:0/0, O:0/0 format
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
      const addrMatch = nearbyText.match(/[BIOTCRNFSALDMGPSC][A-Z]?\d*:\d+(?:\/\d+)?(?:\.[A-Z]+)?/i)
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

  return {
    name: symbol ? symbol.symbol : address,
    aliasFor: symbol ? address : undefined,  // Store address as aliasFor if we have a symbol
    dataType,
    scope: 'controller',
    description
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
