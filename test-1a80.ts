/**
 * Analyze the 1a 80 marker pattern which may indicate rung/branch structure
 */

import * as fs from 'fs'
import CFB from 'cfb'
import { inflateSync } from 'zlib'

const RSS_FILE = './LANLOGIX_BR.RSS'

async function analyze1a80() {
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

  // Find all 1a 80 markers
  console.log('=== Analyzing 1a 80 Markers ===\n')

  const markers1a80: number[] = []
  for (let i = 0; i < programData.length - 10; i++) {
    if (programData[i] === 0x1a && programData[i + 1] === 0x80) {
      markers1a80.push(i)
    }
  }

  console.log(`Total 1a 80 markers: ${markers1a80.length}`)

  // Analyze bytes after 1a 80
  console.log('\nBytes following 1a 80 (first 30):')
  const followingBytes = new Map<number, number>()
  for (let i = 0; i < Math.min(markers1a80.length, 100); i++) {
    const pos = markers1a80[i]
    const nextByte = programData[pos + 2]
    followingBytes.set(nextByte, (followingBytes.get(nextByte) || 0) + 1)
  }

  for (const [byte, count] of [...followingBytes.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
    console.log(`  0x${byte.toString(16).padStart(2, '0')}: ${count}x`)
  }

  // Show first 20 1a 80 markers with context
  console.log('\nFirst 20 1a 80 markers with context:')
  for (let i = 0; i < Math.min(20, markers1a80.length); i++) {
    const pos = markers1a80[i]
    const before = programData.subarray(Math.max(0, pos - 10), pos)
    const after = programData.subarray(pos, Math.min(programData.length, pos + 20))

    // Look for nearby addresses
    const nearbyText = text.substring(Math.max(0, pos - 30), Math.min(text.length, pos + 50))
    const addrMatch = nearbyText.match(/[BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?/gi)

    console.log(`\n#${i + 1} at pos ${pos}:`)
    console.log(`  Before: ${before.toString('hex')}`)
    console.log(`  After:  ${after.toString('hex')}`)
    console.log(`  Nearby: ${addrMatch ? addrMatch.join(', ') : 'none'}`)
  }

  // Now analyze around T4:5 region with 1a 80 markers
  console.log('\n=== T4:5 Region with 1a 80 Markers ===\n')

  const t45PrePos = text.indexOf('T4:5.PRE')
  if (t45PrePos !== -1) {
    // Find 1a 80 markers near T4:5
    const nearbyMarkers = markers1a80.filter(pos => Math.abs(pos - t45PrePos) < 500)
    console.log(`1a 80 markers within 500 bytes of T4:5.PRE (at ${t45PrePos}):`)
    for (const pos of nearbyMarkers) {
      const offset = pos - t45PrePos
      const after = programData.subarray(pos, Math.min(programData.length, pos + 20))
      console.log(`  ${offset >= 0 ? '+' : ''}${offset}: ${after.toString('hex')}`)
    }
  }

  // Analyze relationship between 1a 80 and addresses
  console.log('\n=== 1a 80 Relationship to Instructions ===\n')

  // For each 1a 80, find the next address
  let hasAddressCount = 0
  const distanceToNextAddr: number[] = []

  for (let i = 0; i < Math.min(100, markers1a80.length); i++) {
    const pos = markers1a80[i]
    // Look for address in next 100 bytes
    const regionText = text.substring(pos, Math.min(text.length, pos + 100))
    const addrMatch = regionText.match(/[BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?/i)
    if (addrMatch) {
      hasAddressCount++
      const addrPos = regionText.indexOf(addrMatch[0])
      distanceToNextAddr.push(addrPos)
    }
  }

  console.log(`Of first 100 markers, ${hasAddressCount} have an address within 100 bytes`)
  if (distanceToNextAddr.length > 0) {
    const avgDist = distanceToNextAddr.reduce((a, b) => a + b, 0) / distanceToNextAddr.length
    console.log(`Average distance to next address: ${avgDist.toFixed(1)} bytes`)
    console.log(`Min: ${Math.min(...distanceToNextAddr)}, Max: ${Math.max(...distanceToNextAddr)}`)
  }

  // Now look at 09 80 markers (5513 occurrences)
  console.log('\n=== Analyzing 09 80 Markers ===\n')

  const markers0980: number[] = []
  for (let i = 0; i < programData.length - 10; i++) {
    if (programData[i] === 0x09 && programData[i + 1] === 0x80) {
      markers0980.push(i)
    }
  }

  console.log(`Total 09 80 markers: ${markers0980.length}`)

  // Show first 20 09 80 markers
  console.log('\nFirst 20 09 80 markers with context:')
  for (let i = 0; i < Math.min(20, markers0980.length); i++) {
    const pos = markers0980[i]
    const before = programData.subarray(Math.max(0, pos - 6), pos)
    const after = programData.subarray(pos, Math.min(programData.length, pos + 20))
    const afterText = text.substring(pos, pos + 20).replace(/[^\x20-\x7E]/g, '.')

    console.log(`#${i + 1} at pos ${pos}: before=${before.toString('hex')} after=${after.toString('hex')} text="${afterText}"`)
  }

  // Look at 07 80 markers
  console.log('\n=== Analyzing 07 80 Markers ===\n')

  const markers0780: number[] = []
  for (let i = 0; i < programData.length - 10; i++) {
    if (programData[i] === 0x07 && programData[i + 1] === 0x80) {
      markers0780.push(i)
    }
  }

  console.log(`Total 07 80 markers: ${markers0780.length}`)

  // Show first 10 07 80 markers
  console.log('\nFirst 10 07 80 markers with context:')
  for (let i = 0; i < Math.min(10, markers0780.length); i++) {
    const pos = markers0780[i]
    const after = programData.subarray(pos, Math.min(programData.length, pos + 30))
    const afterText = text.substring(pos, pos + 30).replace(/[^\x20-\x7E]/g, '.')

    console.log(`#${i + 1} at pos ${pos}: ${after.toString('hex')}`)
    console.log(`   Text: "${afterText}"`)
  }

  // Summary: find pattern for rung boundaries
  console.log('\n=== Proposed Structure ===\n')
  console.log('Based on analysis:')
  console.log('- 0b 80: Address marker (instruction operand)')
  console.log('- 1a 80: Likely rung START marker (1549 occurrences ~ number of rungs)')
  console.log('- 09 80: Likely related to instruction structure')
  console.log('- 07 80: Possibly branch or instruction metadata')
}

analyze1a80().catch(console.error)
