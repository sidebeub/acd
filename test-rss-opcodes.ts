/**
 * Test script to analyze RSS file binary format and decode instruction opcodes
 * Run with: npx ts-node test-rss-opcodes.ts
 */

import * as fs from 'fs'
import CFB from 'cfb'
import { inflateSync } from 'zlib'

const RSS_FILE = './LANLOGIX_BR.RSS'

async function analyzeRSS() {
  console.log('Reading RSS file...')
  const buffer = fs.readFileSync(RSS_FILE)
  const data = new Uint8Array(buffer)
  const cfb = CFB.read(data, { type: 'array' })

  // Find PROGRAM FILES stream
  let programData: Buffer | null = null
  for (const path of cfb.FullPaths || []) {
    if (path.includes('PROGRAM FILES') && !path.includes('ONLINEIMAGE')) {
      const entry = CFB.find(cfb, path)
      if (entry && entry.content && entry.content.length > 0) {
        const content = Buffer.from(entry.content)
        // Decompress after 16-byte header
        if (content.length > 16) {
          try {
            programData = inflateSync(content.subarray(16))
            console.log(`Decompressed PROGRAM FILES: ${content.length} -> ${programData.length} bytes`)
          } catch (e) {
            console.log('Decompression failed, using raw data')
            programData = content
          }
        }
        break
      }
    }
  }

  if (!programData) {
    console.log('Could not find PROGRAM FILES stream')
    return
  }

  const text = programData.toString('latin1')

  // Find all addresses and analyze bytes before them
  console.log('\n=== Analyzing instruction opcodes ===\n')

  const addrPattern = /([BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?)/gi
  let match
  let count = 0

  const instructionTypes: Map<number, { count: number, examples: string[] }> = new Map()

  while ((match = addrPattern.exec(text)) !== null) {
    const addr = match[0].toUpperCase()
    const pos = match.index

    if (pos >= 10) {
      const lengthByte = programData[pos - 1]
      const addrLen = addr.length

      // Check for pattern [type][0b][80][01][00][len][address]
      if (lengthByte === addrLen) {
        const marker = programData.subarray(pos - 5, pos - 1)
        if (marker[0] === 0x0b && marker[1] === 0x80 && marker[2] === 0x01 && marker[3] === 0x00) {
          const instType = programData[pos - 6]

          if (!instructionTypes.has(instType)) {
            instructionTypes.set(instType, { count: 0, examples: [] })
          }
          const typeInfo = instructionTypes.get(instType)!
          typeInfo.count++
          if (typeInfo.examples.length < 5) {
            typeInfo.examples.push(addr)
          }

          if (count < 50) {
            // Get more context - look at 20 bytes before address
            const context = programData.subarray(pos - 20, pos + addr.length + 5)
            console.log(`[${count}] ${addr}: type=0x${instType.toString(16).padStart(2, '0')} | context: ${context.toString('hex')}`)
          }
          count++
        }
      }
    }
  }

  console.log(`\n=== Instruction Type Distribution (${count} total instructions) ===\n`)

  const sorted = [...instructionTypes.entries()].sort((a, b) => b[1].count - a[1].count)
  for (const [type, info] of sorted) {
    console.log(`0x${type.toString(16).padStart(2, '0')}: ${info.count} occurrences`)
    console.log(`    Examples: ${info.examples.join(', ')}`)
  }

  // Now let's look at the binary structure more carefully
  console.log('\n=== Analyzing CIns structure ===\n')

  // Find CIns markers and examine their structure
  const cInsMarker = 'CIns'
  let insPos = text.indexOf(cInsMarker)
  let insCount = 0

  while (insPos !== -1 && insCount < 20) {
    // Get bytes after CIns marker
    const afterCIns = programData.subarray(insPos + cInsMarker.length, insPos + cInsMarker.length + 50)
    console.log(`CIns at ${insPos}: ${afterCIns.toString('hex')}`)

    // Find the address that follows
    const afterText = text.substring(insPos + cInsMarker.length, insPos + cInsMarker.length + 100)
    const addrMatch = afterText.match(/([BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?)/i)
    if (addrMatch) {
      console.log(`  -> Address: ${addrMatch[0]}`)
    }

    insPos = text.indexOf(cInsMarker, insPos + cInsMarker.length)
    insCount++
  }

  // Look for patterns that might indicate instruction type
  console.log('\n=== Looking for opcode patterns ===\n')

  // RSLogix 500 common instruction opcodes (hypothesized):
  // Let's see what byte values appear most often before addresses
  // and correlate with address types

  const bytePatterns: Map<string, { count: number, addresses: string[] }> = new Map()

  addrPattern.lastIndex = 0
  while ((match = addrPattern.exec(text)) !== null) {
    const addr = match[0].toUpperCase()
    const pos = match.index

    if (pos >= 15) {
      // Get 10 bytes before the address
      const beforeBytes = programData.subarray(pos - 10, pos)
      const pattern = beforeBytes.toString('hex')

      if (!bytePatterns.has(pattern)) {
        bytePatterns.set(pattern, { count: 0, addresses: [] })
      }
      const info = bytePatterns.get(pattern)!
      info.count++
      if (info.addresses.length < 3) {
        info.addresses.push(addr)
      }
    }
  }

  // Show most common patterns
  const sortedPatterns = [...bytePatterns.entries()].sort((a, b) => b[1].count - a[1].count)
  console.log('Top 20 byte patterns before addresses:')
  for (const [pattern, info] of sortedPatterns.slice(0, 20)) {
    console.log(`  ${pattern}: ${info.count}x (${info.addresses.join(', ')})`)
  }
}

analyzeRSS().catch(console.error)
