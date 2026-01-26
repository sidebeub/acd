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

// RSLogix 500 instruction opcodes (common ones)
const SLC500_OPCODES: Record<number, string> = {
  0x01: 'XIC',   // Examine If Closed
  0x02: 'XIO',   // Examine If Open
  0x03: 'OTE',   // Output Energize
  0x04: 'OTL',   // Output Latch
  0x05: 'OTU',   // Output Unlatch
  0x06: 'ONS',   // One Shot
  0x07: 'OSR',   // One Shot Rising
  0x08: 'OSF',   // One Shot Falling
  0x10: 'TON',   // Timer On Delay
  0x11: 'TOF',   // Timer Off Delay
  0x12: 'RTO',   // Retentive Timer
  0x13: 'CTU',   // Count Up
  0x14: 'CTD',   // Count Down
  0x15: 'RES',   // Reset
  0x20: 'ADD',   // Add
  0x21: 'SUB',   // Subtract
  0x22: 'MUL',   // Multiply
  0x23: 'DIV',   // Divide
  0x24: 'NEG',   // Negate
  0x25: 'CLR',   // Clear
  0x26: 'MOV',   // Move
  0x27: 'MVM',   // Masked Move
  0x28: 'AND',   // Bitwise AND
  0x29: 'OR',    // Bitwise OR
  0x2A: 'XOR',   // Bitwise XOR
  0x2B: 'NOT',   // Bitwise NOT
  0x30: 'EQU',   // Equal
  0x31: 'NEQ',   // Not Equal
  0x32: 'LES',   // Less Than
  0x33: 'LEQ',   // Less Than or Equal
  0x34: 'GRT',   // Greater Than
  0x35: 'GEQ',   // Greater Than or Equal
  0x36: 'LIM',   // Limit Test
  0x37: 'MEQ',   // Masked Comparison
  0x40: 'JMP',   // Jump
  0x41: 'LBL',   // Label
  0x42: 'JSR',   // Jump to Subroutine
  0x43: 'SBR',   // Subroutine
  0x44: 'RET',   // Return
  0x45: 'MCR',   // Master Control Reset
  0x50: 'COP',   // Copy File
  0x51: 'FLL',   // Fill File
  0x52: 'BSL',   // Bit Shift Left
  0x53: 'BSR',   // Bit Shift Right
  0x54: 'FFL',   // FIFO Load
  0x55: 'FFU',   // FIFO Unload
  0x60: 'SQO',   // Sequencer Output
  0x61: 'SQI',   // Sequencer Input
  0x62: 'SQC',   // Sequencer Compare
  0x63: 'SQL',   // Sequencer Load
  0x70: 'MSG',   // Message
  0x71: 'PID',   // PID Control
  0x80: 'ABL',   // ASCII Test Buffer For Line
  0x81: 'ACB',   // ASCII Characters in Buffer
  0x82: 'AHL',   // ASCII Handshake Lines
  0x83: 'ARD',   // ASCII Read
  0x84: 'ARL',   // ASCII Read Line
  0x85: 'AWA',   // ASCII Write Append
  0x86: 'AWL',   // ASCII Write Line
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

  // Try to parse binary ladder structure first
  const binaryResult = parseBinaryLadder(programData)
  console.log(`[RSS Parser] Binary parsing found ${binaryResult.rungs.length} rungs, ${binaryResult.addresses.size} addresses, ${binaryResult.ladderFiles.length} ladder files`)

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

  // Use binary-parsed rungs if available, otherwise fall back to text extraction
  let rungs = binaryResult.rungs.length > 0 ? binaryResult.rungs : extractRungs(programData, text, addresses)
  console.log(`[RSS Parser] Extracted ${rungs.length} rungs`)

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

  // Build program structure
  const mainRoutine: PlcRoutine = {
    name: 'MainRoutine',
    type: 'Ladder',
    rungs
  }

  const mainProgram: PlcProgram = {
    name: projectName,
    mainRoutineName: 'MainRoutine',
    disabled: false,
    routines: [mainRoutine],
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
 * Parse binary ladder logic from PROGRAM FILES stream
 * RSLogix 500 stores ladder data with text markers and ASCII addresses
 * Structure: CProgHolder > CLadFile > CRung > CIns/CBranchLeg
 */
function parseBinaryLadder(data: Buffer): { rungs: PlcRung[], addresses: Set<string>, ladderFiles: string[] } {
  const rungs: PlcRung[] = []
  const addresses = new Set<string>()
  const ladderFiles: string[] = []

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

  // Find ladder file names (e.g., MAIN, LAD 3, etc.)
  const ladFilePattern = /CLadFile[^\x00]*?([A-Z][A-Z0-9_]{0,10})/gi
  while ((match = ladFilePattern.exec(text)) !== null) {
    const name = match[1]
    if (name && name !== 'CLadFile' && !ladderFiles.includes(name)) {
      ladderFiles.push(name)
    }
  }

  // Also look for routine names after specific patterns
  const routinePattern = /\x00([A-Z][A-Z0-9_]{2,15})\x00/g
  while ((match = routinePattern.exec(text)) !== null) {
    const name = match[1]
    if (name && !['CProgHolder', 'CLadFile', 'CRung', 'CIns', 'CBranch', 'CBranchLeg'].includes(name)) {
      if (!ladderFiles.includes(name)) {
        ladderFiles.push(name)
      }
    }
  }

  console.log(`[RSS Parser] Found ladder files: ${ladderFiles.join(', ') || 'none'}`)

  // Parse rungs using structure markers: CRung marks each rung, CIns marks each instruction
  // Format: ...CRung...CIns...address...CIns...address...CRung...
  const rungMarker = 'CRung'
  const insMarker = 'CIns'
  let rungNumber = 0

  // Find all CRung positions
  const rungPositions: number[] = []
  let pos = text.indexOf(rungMarker)
  while (pos !== -1) {
    rungPositions.push(pos)
    pos = text.indexOf(rungMarker, pos + rungMarker.length)
  }

  console.log(`[RSS Parser] Found ${rungPositions.length} CRung markers`)

  // Process each rung
  for (let r = 0; r < rungPositions.length; r++) {
    const rungStart = rungPositions[r]
    const rungEnd = r < rungPositions.length - 1 ? rungPositions[r + 1] : text.length
    const rungText = text.substring(rungStart, rungEnd)

    // Find all CIns markers in this rung
    const rungAddresses: string[] = []
    let insPos = rungText.indexOf(insMarker)

    while (insPos !== -1) {
      // Look for address after this CIns marker (within next 100 chars)
      const searchStart = insPos + insMarker.length
      const searchText = rungText.substring(searchStart, searchStart + 100)

      // Find the first valid address
      const addrMatch = searchText.match(/([BIOTCRNFSAL])(\d+):(\d+)(?:\/(\d+))?(?:\.([A-Z]+))?/i) ||
                        searchText.match(/([IO]):(\d+)(?:\/(\d+))?/i)

      if (addrMatch) {
        const addr = addrMatch[0].toUpperCase()
        rungAddresses.push(addr)
      }

      insPos = rungText.indexOf(insMarker, insPos + insMarker.length)
    }

    // Create rung if we found addresses
    if (rungAddresses.length > 0) {
      const instructions = createInstructionsFromAddresses(rungAddresses)
      rungs.push({
        number: rungNumber++,
        rawText: instructions.map(i => `${i.type}(${i.operands.join(',')})`).join(' '),
        instructions
      })
    }
  }

  console.log(`[RSS Parser] Created ${rungs.length} rungs from CRung/CIns markers`)

  // If no CRung markers found, try alternative parsing
  if (rungs.length === 0 && addresses.size > 0) {
    console.log('[RSS Parser] No CRung markers found, creating rungs from addresses')

    // Group addresses into synthetic rungs
    const addrArray = [...addresses]
    const ADDRS_PER_RUNG = 5

    for (let i = 0; i < addrArray.length; i += ADDRS_PER_RUNG) {
      const rungAddrs = addrArray.slice(i, i + ADDRS_PER_RUNG)
      const instructions: PlcInstruction[] = rungAddrs.map((addr, idx) => {
        const isLast = idx === rungAddrs.length - 1
        let type = 'XIC'
        if (addr.startsWith('O:')) type = 'OTE'
        else if (isLast && addr.startsWith('B')) type = 'OTE'
        return { type, operands: [addr] }
      })

      rungs.push({
        number: rungNumber++,
        rawText: instructions.map(i => `${i.type}(${i.operands[0]})`).join(' '),
        instructions
      })
    }
  }

  console.log(`[RSS Parser] Parsed ${rungs.length} rungs from structure markers`)

  return { rungs, addresses, ladderFiles }
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

  return {
    name: address,
    dataType,
    scope: 'controller',
    description: `${fileInfo.name} - ${fileInfo.description}`
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
