/**
 * Analyze instruction opcodes and branch patterns in RSLogix 500 binary
 */

import * as fs from 'fs'
import CFB from 'cfb'
import { inflateSync } from 'zlib'

const RSS_FILE = './LANLOGIX_BR.RSS'

async function analyzeOpcodes() {
  const buffer = fs.readFileSync(RSS_FILE)
  const data = new Uint8Array(buffer)
  const cfb = CFB.read(data, { type: 'array' })

  let programData: Buffer | null = null
  for (const path of cfb.FullPaths || []) {
    if (path.includes('PROGRAM FILES') && !path.includes('ONLINEIMAGE')) {
      const entry = CFB.find(cfb, path)
      if (entry && entry.content && entry.content.length > 0) {
        const content = Buffer.from(entry.content)
        if (content.length > 16) {
          programData = inflateSync(content.subarray(16))
        }
        break
      }
    }
  }

  if (!programData) return

  const text = programData.toString('latin1')

  // Find all instruction markers and their opcodes
  // Pattern: [opcode][0b][80][01][00][length][address]
  console.log('=== Opcode Analysis ===\n')

  const addrPattern = /[BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?/gi
  const opcodeMap = new Map<number, { count: number, samples: string[], positions: number[] }>()

  let match
  while ((match = addrPattern.exec(text)) !== null) {
    const addr = match[0]
    const pos = match.index

    if (pos >= 6) {
      const lengthByte = programData[pos - 1]
      if (lengthByte === addr.length) {
        const marker = programData.subarray(pos - 5, pos - 1)
        if (marker[0] === 0x0b && marker[1] === 0x80 && marker[2] === 0x01 && marker[3] === 0x00) {
          const opcode = programData[pos - 6]

          if (!opcodeMap.has(opcode)) {
            opcodeMap.set(opcode, { count: 0, samples: [], positions: [] })
          }
          const entry = opcodeMap.get(opcode)!
          entry.count++
          if (entry.samples.length < 5) {
            entry.samples.push(addr)
            entry.positions.push(pos)
          }
        }
      }
    }
  }

  // Sort by frequency
  const sorted = [...opcodeMap.entries()].sort((a, b) => b[1].count - a[1].count)

  console.log('Opcode frequency (with samples):')
  for (const [opcode, data] of sorted) {
    const binary = opcode.toString(2).padStart(8, '0')
    const lowBits = opcode & 0x03
    const highBits = (opcode >> 2) & 0x3F
    console.log(`  0x${opcode.toString(16).padStart(2, '0')} (${binary}) low=${lowBits} high=${highBits}: ${data.count}x`)
    console.log(`    Samples: ${data.samples.join(', ')}`)
  }

  // Analyze bytes around T4:5 region to understand timer structure
  console.log('\n=== T4:5 Timer Region Detail ===\n')

  // Find T4:5.PRE, T4:5 (timer itself), T4:5.ACC
  const timerAddresses = ['T4:5.PRE', 'T4:5.ACC', 'T4:5.DN', 'T4:5.TT', 'T4:5.EN']
  const t45Positions: { addr: string, pos: number }[] = []

  for (const addr of timerAddresses) {
    let pos = text.indexOf(addr)
    while (pos !== -1) {
      t45Positions.push({ addr, pos })
      pos = text.indexOf(addr, pos + 1)
    }
  }

  // Also find bare T4:5 (the timer instruction itself)
  let barePos = 0
  while ((barePos = text.indexOf('T4:5', barePos)) !== -1) {
    // Check it's not part of a longer address
    const nextChar = text[barePos + 4]
    if (nextChar === '\x00' || nextChar === undefined || !/[.\/0-9A-Z]/i.test(nextChar)) {
      t45Positions.push({ addr: 'T4:5', pos: barePos })
    }
    barePos++
  }

  t45Positions.sort((a, b) => a.pos - b.pos)

  console.log('T4:5 related addresses found:')
  for (const { addr, pos } of t45Positions) {
    // Get opcode
    const lengthByte = programData[pos - 1]
    let opcode = -1
    if (pos >= 6 && lengthByte === addr.length) {
      const marker = programData.subarray(pos - 5, pos - 1)
      if (marker[0] === 0x0b && marker[1] === 0x80 && marker[2] === 0x01 && marker[3] === 0x00) {
        opcode = programData[pos - 6]
      }
    }

    // Show surrounding bytes
    const before = programData.subarray(Math.max(0, pos - 20), pos)
    console.log(`  ${addr} at ${pos}:`)
    console.log(`    Opcode: 0x${opcode >= 0 ? opcode.toString(16).padStart(2, '0') : 'unknown'}`)
    console.log(`    Before: ${before.toString('hex')}`)
  }

  // Look for the pattern that might indicate branch or rung structure
  console.log('\n=== Looking for Structural Markers ===\n')

  // Search for patterns that might indicate rung boundaries or branches
  // Common patterns: xx 80 (where xx varies)
  const markerBytes = new Map<number, number>()
  for (let i = 0; i < programData.length - 1; i++) {
    if (programData[i + 1] === 0x80) {
      const byte = programData[i]
      markerBytes.set(byte, (markerBytes.get(byte) || 0) + 1)
    }
  }

  console.log('Bytes followed by 0x80:')
  const sortedMarkers = [...markerBytes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)
  for (const [byte, count] of sortedMarkers) {
    console.log(`  0x${byte.toString(16).padStart(2, '0')}: ${count}x`)
  }

  // Analyze the region around rung with T4:5
  // Look for patterns that might indicate parallel branches
  console.log('\n=== Rung Structure Analysis ===\n')

  // Find a rung that should have branches (timer with PRE/ACC moves)
  // The pattern should be: conditions -> branch -> MOV PRE -> branch leg -> TON -> branch leg -> MOV ACC
  const t45PrePos = text.indexOf('T4:5.PRE')
  if (t45PrePos !== -1) {
    console.log('Analyzing rung containing T4:5:')

    // Find the start of this rung (look backwards for rung marker or previous output instruction)
    // Then show all addresses and their opcodes in sequence

    // Look backwards for potential rung start
    let rungStart = t45PrePos
    for (let i = t45PrePos - 1; i > Math.max(0, t45PrePos - 500); i--) {
      // Look for output instruction types that would end previous rung
      // OTE = 0x03, OTL = 0x02, etc.
      if (programData[i] === 0x0b && programData[i + 1] === 0x80 && i >= 6) {
        // Check if this is an output instruction
        const opcode = programData[i - 5]
        if ((opcode & 0x03) === 0x03 || (opcode & 0x03) === 0x02) { // OTE or OTL
          rungStart = i + 20 // Start after this instruction
          break
        }
      }
    }

    console.log(`Rung starts around position ${rungStart}`)

    // Now scan forward and show all instructions
    const rungEnd = Math.min(t45PrePos + 500, programData.length)
    const rungRegion = programData.subarray(rungStart, rungEnd)
    const rungText = text.substring(rungStart, rungEnd)

    // Find all addresses in this region with their opcodes
    const rungAddresses: { addr: string, pos: number, opcode: number, relPos: number }[] = []
    addrPattern.lastIndex = 0
    while ((match = addrPattern.exec(rungText)) !== null) {
      const addr = match[0]
      const relPos = match.index
      const absPos = rungStart + relPos

      if (relPos >= 6) {
        const lengthByte = rungRegion[relPos - 1]
        if (lengthByte === addr.length) {
          const marker = rungRegion.subarray(relPos - 5, relPos - 1)
          if (marker[0] === 0x0b && marker[1] === 0x80 && marker[2] === 0x01 && marker[3] === 0x00) {
            const opcode = rungRegion[relPos - 6]
            rungAddresses.push({ addr, pos: absPos, opcode, relPos })
          }
        }
      }
    }

    console.log('\nInstructions in rung region:')
    for (const { addr, pos, opcode, relPos } of rungAddresses.slice(0, 30)) {
      const instType = decodeOpcode(opcode)
      console.log(`  +${relPos.toString().padStart(4)}: 0x${opcode.toString(16).padStart(2, '0')} ${instType.padEnd(4)} ${addr}`)
    }
  }
}

function decodeOpcode(opcode: number): string {
  const explicitMap: Record<number, string> = {
    0x05: 'OTU',
    0x06: 'ONS',
    0x07: 'OSR',
    0x08: 'OSF',
    0x09: 'MOV',
    0x0A: 'ADD',
    0x0B: 'SUB',
    0x0C: 'MUL',
    0x0D: 'DIV',
    0x10: 'EQU',
    0x11: 'NEQ',
    0x12: 'LES',
    0x13: 'LEQ',
    0x14: 'GRT',
    0x15: 'GEQ',
  }

  if (explicitMap[opcode]) return explicitMap[opcode]

  const baseType = opcode & 0x03
  switch (baseType) {
    case 0x00: return 'XIC'
    case 0x01: return 'XIO'
    case 0x02: return 'OTL'
    case 0x03: return 'OTE'
    default: return '???'
  }
}

analyzeOpcodes().catch(console.error)
