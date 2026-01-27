/**
 * Analyze the CLadFile markers in the RSS binary to find routine names
 */

import * as fs from 'fs'
import CFB from 'cfb'
import { inflateSync } from 'zlib'

const RSS_FILE = './LANLOGIX_BR.RSS'

async function analyzeLadFiles() {
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
        if (content.length > 16) {
          try {
            programData = inflateSync(content.subarray(16))
            console.log(`Decompressed PROGRAM FILES: ${content.length} -> ${programData.length} bytes`)
          } catch (e) {
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

  // Find all CLadFile markers and analyze their surroundings
  console.log('\n=== CLadFile Markers ===\n')

  const cladFileMarker = 'CLadFile'
  let pos = 0
  let count = 0

  while ((pos = text.indexOf(cladFileMarker, pos)) !== -1) {
    // Get 100 bytes after the marker
    const afterMarker = programData.subarray(pos, pos + 150)
    const afterText = text.substring(pos, pos + 150)

    // Look for readable text (routine name) in the bytes after
    const readable = afterText.replace(/[^\x20-\x7E]/g, '.')

    console.log(`CLadFile #${count} at position ${pos}:`)
    console.log(`  Hex: ${afterMarker.subarray(0, 80).toString('hex')}`)
    console.log(`  Text: ${readable.slice(0, 80)}`)

    // Try to find routine name - look for uppercase words
    const nameMatch = afterText.match(/[\x00\x01]([A-Z][A-Z0-9_]{1,15})\x00/)
    if (nameMatch) {
      console.log(`  Found name: ${nameMatch[1]}`)
    }

    pos += cladFileMarker.length
    count++
    console.log('')
  }

  console.log(`\nTotal CLadFile markers found: ${count}`)

  // Also look for the routine names we know exist
  console.log('\n=== Known routine names search ===\n')
  const knownNames = ['MAIN', 'FILM', 'PROFILES', 'OPTIONS', 'CONSTANTS', 'OUTPUTS', 'INPUTS', 'ROTATION', 'CARRIAGE', 'MPS', 'TSD', 'INTERFACE', 'SECURITY', 'HMI', 'WARNINGS', 'MESSAGES', 'ALARMS', 'MAINT', 'PDATA', 'PCHART', 'CDATA', 'MODBUS']

  for (const name of knownNames) {
    const positions: number[] = []
    let searchPos = 0
    while ((searchPos = text.indexOf(name, searchPos)) !== -1) {
      positions.push(searchPos)
      searchPos += name.length
    }
    if (positions.length > 0) {
      console.log(`${name}: found at positions ${positions.slice(0, 5).join(', ')}${positions.length > 5 ? '...' : ''} (${positions.length} total)`)

      // Show context for first occurrence
      const firstPos = positions[0]
      const context = programData.subarray(Math.max(0, firstPos - 20), firstPos + name.length + 10)
      console.log(`  Context: ${context.toString('hex')}`)
    }
  }
}

analyzeLadFiles().catch(console.error)
