/**
 * Debug the routine marker pattern
 */

import * as fs from 'fs'
import CFB from 'cfb'
import { inflateSync } from 'zlib'

const RSS_FILE = './LANLOGIX_BR.RSS'

async function debugPattern() {
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

  // Known routine positions from earlier test
  const routinePositions = [
    { name: 'MAIN', pos: 79 },
    { name: 'FILM', pos: 26417 },
    { name: 'PROFILES', pos: 31750 },
    { name: 'OPTIONS', pos: 97870 },
    { name: 'CONSTANTS', pos: 101970 },
  ]

  console.log('=== Analyzing bytes before each routine name ===\n')

  for (const { name, pos } of routinePositions) {
    console.log(`${name} at position ${pos}:`)

    // Show 20 bytes before the name
    const before = programData.subarray(pos - 20, pos)
    console.log(`  20 bytes before: ${before.toString('hex')}`)

    // Find the 0380 pattern
    for (let i = 0; i < before.length - 1; i++) {
      if (before[i] === 0x03 && before[i + 1] === 0x80) {
        console.log(`  Found 0380 at offset -${20 - i} from name`)
        const afterMarker = before.subarray(i)
        console.log(`  After 0380: ${afterMarker.toString('hex')}`)
      }
    }

    // Check what the length byte is
    const lenByte = programData[pos - 1]
    console.log(`  Byte at pos-1 (should be length): 0x${lenByte.toString(16)} = ${lenByte} (name length: ${name.length})`)

    console.log('')
  }

  // Now search for the actual pattern
  console.log('=== Searching for 0380 pattern ===\n')

  let found = 0
  for (let i = 0; i < programData.length - 20; i++) {
    if (programData[i] === 0x03 && programData[i + 1] === 0x80) {
      if (found < 30) {
        // Check bytes after
        const after = programData.subarray(i, i + 20)
        console.log(`0380 at ${i}: ${after.toString('hex')}`)
      }
      found++
    }
  }
  console.log(`\nTotal 0380 markers: ${found}`)
}

debugPattern().catch(console.error)
