/**
 * RSLogix 500 (.RSS) File Parser
 *
 * Parses SLC 500/MicroLogix ladder logic files.
 * RSS files are OLE compound documents with zlib-compressed program data.
 */

import CFB from 'cfb'
import { inflateSync } from 'zlib'
import type { PlcProject, PlcProgram, PlcRoutine, PlcRung, PlcInstruction, PlcTag } from './l5x-parser'

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

      // Try to decompress if it looks like zlib
      if (content[0] === 0x78) {
        try {
          streamInfo.decompressed = inflateSync(content)
          console.log(`[RSS Parser]   -> Decompressed to ${streamInfo.decompressed.length} bytes`)
        } catch {
          // Not zlib compressed
        }
      }

      streams.push(streamInfo)
    }
  }

  // Find the best stream to parse
  let programData: Buffer | null = null
  let projectName = 'RSLogix 500 Project'
  let processorType = 'SLC 500'

  // Strategy 1: Look specifically for PROGRAM FILES stream (contains ladder logic)
  for (const stream of streams) {
    if (stream.path.includes('PROGRAM FILES') && !stream.path.includes('ONLINEIMAGE')) {
      programData = stream.decompressed || stream.content
      console.log(`[RSS Parser] Using PROGRAM FILES stream: ${stream.path} (${programData.length} bytes)`)
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
      const text = (stream.decompressed || stream.content).toString('latin1')
      // Look for project name patterns
      const nameMatch = text.match(/LANLOGIX|([A-Z][A-Z0-9_]{3,15})/i)
      if (nameMatch) {
        projectName = nameMatch[0]
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
      programData = largestStream.decompressed || largestStream.content
      console.log(`[RSS Parser] Fallback - using largest stream: ${largestStream.path} (${programData.length} bytes)`)
    }
  }

  // If no good stream found, use any stream with data
  if (!programData) {
    for (const stream of streams) {
      if (stream.content.length > 0) {
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

  // Parse the data
  const text = programData.toString('latin1')
  const hexDump = programData.slice(0, 500).toString('hex')
  console.log(`[RSS Parser] First 500 bytes hex: ${hexDump}`)
  console.log(`[RSS Parser] Visible text sample: ${text.slice(0, 500).replace(/[^\x20-\x7E]/g, '.')}`)

  // Extract processor info
  if (text.includes('MicroLogix') || text.includes('1761') || text.includes('1762') ||
      text.includes('1763') || text.includes('1766')) {
    processorType = 'MicroLogix'
  }

  // Extract all visible addresses from multiple streams
  const addresses = extractAddresses(text)

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

  // Try to extract ladder logic structure from PROGRAM FILES
  let rungs = extractRungs(programData, text, addresses)
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
