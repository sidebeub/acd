/**
 * RSLogix 500 (.RSS) File Parser
 *
 * Parses SLC 500/MicroLogix ladder logic files.
 * RSS files are OLE compound documents with zlib-compressed program data.
 */

import CFB from 'cfb'
import { inflateSync } from 'zlib'
import type { PlcProject, PlcProgram, PlcRoutine, PlcRung, PlcInstruction, PlcTag } from './l5x-parser'

// RSLogix 500 instruction codes to names (common ones)
const RSS500_INSTRUCTION_MAP: Record<number, string> = {
  0x00: 'XIC',    // Examine If Closed
  0x01: 'XIO',    // Examine If Open
  0x02: 'OTE',    // Output Energize
  0x03: 'OTL',    // Output Latch
  0x04: 'OTU',    // Output Unlatch
  0x05: 'ONS',    // One Shot
  0x06: 'OSR',    // One Shot Rising
  0x07: 'OSF',    // One Shot Falling
  0x10: 'TON',    // Timer On Delay
  0x11: 'TOF',    // Timer Off Delay
  0x12: 'RTO',    // Retentive Timer On
  0x13: 'CTU',    // Count Up
  0x14: 'CTD',    // Count Down
  0x15: 'RES',    // Reset
  0x20: 'ADD',    // Add
  0x21: 'SUB',    // Subtract
  0x22: 'MUL',    // Multiply
  0x23: 'DIV',    // Divide
  0x24: 'NEG',    // Negate
  0x25: 'CLR',    // Clear
  0x30: 'MOV',    // Move
  0x31: 'MVM',    // Masked Move
  0x32: 'AND',    // AND
  0x33: 'OR',     // OR
  0x34: 'XOR',    // Exclusive OR
  0x35: 'NOT',    // NOT
  0x40: 'COP',    // Copy File
  0x41: 'FLL',    // Fill File
  0x50: 'EQU',    // Equal
  0x51: 'NEQ',    // Not Equal
  0x52: 'LES',    // Less Than
  0x53: 'LEQ',    // Less Than or Equal
  0x54: 'GRT',    // Greater Than
  0x55: 'GEQ',    // Greater Than or Equal
  0x56: 'LIM',    // Limit Test
  0x57: 'MEQ',    // Masked Comparison for Equal
  0x60: 'JMP',    // Jump to Label
  0x61: 'LBL',    // Label
  0x62: 'JSR',    // Jump to Subroutine
  0x63: 'SBR',    // Subroutine
  0x64: 'RET',    // Return from Subroutine
  0x65: 'MCR',    // Master Control Reset
  0x70: 'SQO',    // Sequencer Output
  0x71: 'SQI',    // Sequencer Input
  0x72: 'SQC',    // Sequencer Compare
  0x73: 'SQL',    // Sequencer Load
  0x80: 'BSL',    // Bit Shift Left
  0x81: 'BSR',    // Bit Shift Right
  0x82: 'FFL',    // FIFO Load
  0x83: 'FFU',    // FIFO Unload
  0x84: 'LFL',    // LIFO Load
  0x85: 'LFU',    // LIFO Unload
  0x90: 'MSG',    // Message
  0x91: 'SVC',    // Service Communication
  0xA0: 'PID',    // PID Control
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

/**
 * Parse an RSS file (RSLogix 500 format)
 */
export async function parseRSS(buffer: ArrayBuffer): Promise<PlcProject> {
  // Read OLE compound document
  const data = new Uint8Array(buffer)
  const cfb = CFB.read(data, { type: 'array' })

  console.log('[RSS Parser] OLE entries:', CFB.utils.cfb_new().FullPaths)

  // List all entries for debugging
  const entries = cfb.FullPaths || []
  console.log('[RSS Parser] Found entries:', entries)

  // Look for PROGRAM FILES stream (contains ladder logic)
  let programData: Buffer | null = null

  for (const path of entries) {
    const entry = CFB.find(cfb, path)
    if (entry && entry.content && entry.content.length > 0) {
      console.log(`[RSS Parser] Entry: ${path}, size: ${entry.content.length}`)

      // Check if this might be the program files
      if (path.toLowerCase().includes('program') ||
          path.toLowerCase().includes('ladder') ||
          path.toLowerCase().includes('logic')) {
        // Try to decompress if it's zlib compressed
        try {
          const content = Buffer.from(entry.content)
          if (content[0] === 0x78) { // zlib magic byte
            programData = inflateSync(content)
            console.log(`[RSS Parser] Decompressed ${path}: ${programData.length} bytes`)
          } else {
            programData = content
          }
          break
        } catch (e) {
          console.log(`[RSS Parser] Could not decompress ${path}:`, e)
        }
      }
    }
  }

  // If no program files found, try looking for any compressed stream
  if (!programData) {
    for (const path of entries) {
      const entry = CFB.find(cfb, path)
      if (entry && entry.content && entry.content.length > 100) {
        try {
          const content = Buffer.from(entry.content)
          if (content[0] === 0x78) { // zlib magic byte
            const decompressed = inflateSync(content)
            // Check if decompressed data contains ladder logic markers
            const text = decompressed.toString('latin1')
            if (text.includes('CRung') || text.includes('CIns') || text.includes('CLadFile')) {
              programData = decompressed
              console.log(`[RSS Parser] Found ladder logic in ${path}: ${programData.length} bytes`)
              break
            }
          }
        } catch {
          // Not compressed or invalid
        }
      }
    }
  }

  // Try direct binary search for ladder logic markers in any entry
  if (!programData) {
    for (const path of entries) {
      const entry = CFB.find(cfb, path)
      if (entry && entry.content && entry.content.length > 100) {
        const content = Buffer.from(entry.content)
        const text = content.toString('latin1')
        if (text.includes('CRung') || text.includes('CIns') || text.includes('MAIN')) {
          programData = content
          console.log(`[RSS Parser] Found markers in ${path}: ${programData.length} bytes`)
          break
        }
      }
    }
  }

  if (!programData) {
    throw new Error('No ladder logic program data found in RSS file')
  }

  // Parse the binary ladder logic data
  return parseLadderBinary(programData)
}

/**
 * Parse the decompressed binary ladder logic data
 */
function parseLadderBinary(data: Buffer): PlcProject {
  const text = data.toString('latin1')

  // Extract project name from the data
  let projectName = 'RSLogix 500 Project'
  const nameMatch = text.match(/CLadFile\x00+([A-Za-z0-9_]+)/)
  if (nameMatch) {
    projectName = nameMatch[1]
  }

  // Try to find processor type
  let processorType = 'SLC 500'
  if (text.includes('MicroLogix')) {
    processorType = 'MicroLogix'
  } else if (text.includes('1747')) {
    processorType = 'SLC 500'
  } else if (text.includes('1761')) {
    processorType = 'MicroLogix 1000'
  } else if (text.includes('1762')) {
    processorType = 'MicroLogix 1200'
  } else if (text.includes('1763')) {
    processorType = 'MicroLogix 1100'
  } else if (text.includes('1766')) {
    processorType = 'MicroLogix 1400'
  }

  // Extract rungs by looking for instruction patterns
  const programs: PlcProgram[] = []
  const tags: PlcTag[] = []

  // Find all program/file names
  const programNames: string[] = []
  const progMatches = text.matchAll(/CLadFile\x00+([A-Za-z0-9_]+)/g)
  for (const match of progMatches) {
    if (match[1] && !programNames.includes(match[1])) {
      programNames.push(match[1])
    }
  }

  if (programNames.length === 0) {
    programNames.push('MAIN')
  }

  // Extract all addresses used to create tags
  const addressPattern = /([BIOTCRNFSALDMGPSC][A-Z]?)(\d+):(\d+)(?:\/(\d+))?(?:\.([A-Z]+))?/g
  const foundAddresses = new Set<string>()
  let addrMatch
  while ((addrMatch = addressPattern.exec(text)) !== null) {
    foundAddresses.add(addrMatch[0])
  }

  // Convert addresses to tags
  for (const addr of foundAddresses) {
    const tag = addressToTag(addr)
    if (tag) {
      tags.push(tag)
    }
  }

  // Extract rungs - look for visible instruction patterns
  const rungs: PlcRung[] = []

  // Pattern to match RSLogix 500 style instructions in the binary
  // These appear as text strings like "XIC B3:0/15" or "TON T4:0"
  const instructionRegex = /\b(XIC|XIO|OTE|OTL|OTU|ONS|OSR|OSF|TON|TOF|RTO|CTU|CTD|RES|ADD|SUB|MUL|DIV|MOV|COP|FLL|EQU|NEQ|LES|LEQ|GRT|GEQ|LIM|MEQ|JMP|LBL|JSR|SBR|RET|MCR|SQO|SQI|SQC|SQL|BSL|BSR|FFL|FFU|LFL|LFU|MSG|PID|AND|OR|XOR|NOT|NEG|CLR)\s*([BIOTCRNFSALDMGPSC][A-Z]?\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?)/gi

  // Find all instructions and group them into rungs
  let rungInstructions: PlcInstruction[] = []
  let rungRawText = ''
  let rungNumber = 0

  // Look for rung boundaries marked by CRung
  const rungBoundaries: number[] = []
  let searchPos = 0
  while (true) {
    const pos = text.indexOf('CRung', searchPos)
    if (pos === -1) break
    rungBoundaries.push(pos)
    searchPos = pos + 5
  }

  if (rungBoundaries.length > 0) {
    // Process each rung section
    for (let i = 0; i < rungBoundaries.length; i++) {
      const start = rungBoundaries[i]
      const end = i < rungBoundaries.length - 1 ? rungBoundaries[i + 1] : text.length
      const rungSection = text.substring(start, end)

      // Extract instructions from this rung
      rungInstructions = []
      rungRawText = ''
      let instMatch
      const localRegex = new RegExp(instructionRegex.source, 'gi')

      while ((instMatch = localRegex.exec(rungSection)) !== null) {
        const instType = instMatch[1].toUpperCase()
        const operand = instMatch[2]
        rungInstructions.push({
          type: instType,
          operands: [operand]
        })
        rungRawText += `${instType}(${operand})`
      }

      if (rungInstructions.length > 0) {
        // Look for comment (often follows rung marker)
        let comment: string | undefined
        const commentMatch = rungSection.match(/\x00{2,}([A-Za-z][A-Za-z0-9 _-]{5,50})\x00/)
        if (commentMatch && !commentMatch[1].match(/^[A-Z]{2,5}$/)) {
          comment = commentMatch[1].trim()
        }

        rungs.push({
          number: rungNumber++,
          comment,
          rawText: rungRawText || `// Rung ${rungNumber}`,
          instructions: rungInstructions
        })
      }
    }
  } else {
    // Fallback: scan entire text for instruction patterns
    let instMatch
    while ((instMatch = instructionRegex.exec(text)) !== null) {
      const instType = instMatch[1].toUpperCase()
      const operand = instMatch[2]
      rungInstructions.push({
        type: instType,
        operands: [operand]
      })
      rungRawText += `${instType}(${operand})`

      // Group into rungs of ~5 instructions (heuristic)
      if (rungInstructions.length >= 5 && (instType === 'OTE' || instType === 'OTL' || instType === 'OTU')) {
        rungs.push({
          number: rungNumber++,
          rawText: rungRawText,
          instructions: [...rungInstructions]
        })
        rungInstructions = []
        rungRawText = ''
      }
    }

    // Add remaining instructions as last rung
    if (rungInstructions.length > 0) {
      rungs.push({
        number: rungNumber++,
        rawText: rungRawText,
        instructions: rungInstructions
      })
    }
  }

  // Create program structure
  const mainRoutine: PlcRoutine = {
    name: 'MainRoutine',
    type: 'Ladder',
    rungs
  }

  // Add subroutine files if found
  const routines: PlcRoutine[] = [mainRoutine]

  // Look for additional ladder files (LAD 2, LAD 3, etc.)
  const ladFileMatches = text.matchAll(/LAD\s*(\d+)/gi)
  const ladFiles = new Set<number>()
  for (const match of ladFileMatches) {
    ladFiles.add(parseInt(match[1]))
  }

  for (const ladNum of ladFiles) {
    if (ladNum !== 2) { // LAD 2 is usually main
      routines.push({
        name: `Subroutine_${ladNum}`,
        type: 'Ladder',
        rungs: [] // Would need deeper parsing to extract
      })
    }
  }

  // Create main program
  const mainProgram: PlcProgram = {
    name: programNames[0] || 'MainProgram',
    mainRoutineName: 'MainRoutine',
    disabled: false,
    routines,
    localTags: []
  }

  programs.push(mainProgram)

  // Add additional programs if found
  for (let i = 1; i < programNames.length; i++) {
    programs.push({
      name: programNames[i],
      disabled: false,
      routines: [],
      localTags: []
    })
  }

  console.log(`[RSS Parser] Extracted ${rungs.length} rungs, ${tags.length} tags from ${projectName}`)

  return {
    name: projectName,
    processorType,
    softwareVersion: 'RSLogix 500',
    tags,
    programs,
    tasks: [],
    modules: [],
    dataTypes: []
  }
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
