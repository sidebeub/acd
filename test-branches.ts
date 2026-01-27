/**
 * Analyze branch structure in RSLogix 500 binary
 */

import * as fs from 'fs'
import CFB from 'cfb'
import { inflateSync } from 'zlib'

const RSS_FILE = './LANLOGIX_BR.RSS'

async function analyzeBranches() {
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
          programData = inflateSync(content.subarray(16))
          console.log(`Decompressed: ${programData.length} bytes`)
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

  // Search for branch markers
  console.log('\n=== Searching for Branch Markers ===\n')

  const markers = ['CBranch', 'CBranchLeg', 'CRung', 'CIns', 'CLadFile']

  for (const marker of markers) {
    const positions: number[] = []
    let pos = 0
    while ((pos = text.indexOf(marker, pos)) !== -1) {
      positions.push(pos)
      pos += marker.length
    }
    console.log(`${marker}: ${positions.length} occurrences`)
    if (positions.length > 0 && positions.length <= 10) {
      console.log(`  Positions: ${positions.join(', ')}`)
    } else if (positions.length > 10) {
      console.log(`  First 10: ${positions.slice(0, 10).join(', ')}`)
    }
  }

  // Analyze structure around T4:5 timer (which has branch issue)
  console.log('\n=== Analyzing T4:5 Timer Region ===\n')

  // Find T4:5 in the binary
  const t45Pos = text.indexOf('T4:5')
  if (t45Pos !== -1) {
    console.log(`T4:5 found at position ${t45Pos}`)

    // Show 200 bytes before and after
    const start = Math.max(0, t45Pos - 200)
    const end = Math.min(programData.length, t45Pos + 100)

    const region = programData.subarray(start, end)
    const regionText = text.substring(start, end)

    console.log('\nHex dump around T4:5:')
    // Show in chunks of 32 bytes
    for (let i = 0; i < region.length; i += 32) {
      const chunk = region.subarray(i, Math.min(i + 32, region.length))
      const hexPart = Array.from(chunk).map(b => b.toString(16).padStart(2, '0')).join(' ')
      const textPart = Array.from(chunk).map(b => (b >= 0x20 && b <= 0x7e) ? String.fromCharCode(b) : '.').join('')
      const offset = start + i
      console.log(`${offset.toString().padStart(6)}: ${hexPart.padEnd(96)} ${textPart}`)
    }

    // Look for branch markers in this region
    console.log('\nBranch markers in region:')
    for (const marker of ['CBranch', 'CBranchLeg', 'CRung']) {
      let searchPos = start
      while ((searchPos = text.indexOf(marker, searchPos)) !== -1 && searchPos < end) {
        console.log(`  ${marker} at offset ${searchPos} (relative: ${searchPos - t45Pos})`)
        searchPos += marker.length
      }
    }
  }

  // Look for branch byte patterns
  console.log('\n=== Searching for Branch Byte Patterns ===\n')

  // CBranch in hex (with length prefix variations)
  const cbranchBytes = Buffer.from('CBranch')
  let foundCount = 0
  for (let i = 0; i < programData.length - 20; i++) {
    if (programData[i] === 0x43 && // 'C'
        programData[i + 1] === 0x42 && // 'B'
        programData[i + 2] === 0x72) { // 'r'
      if (foundCount < 20) {
        // Show bytes before and after
        const before = programData.subarray(Math.max(0, i - 10), i)
        const after = programData.subarray(i, Math.min(programData.length, i + 30))
        console.log(`CBranch at ${i}:`)
        console.log(`  Before: ${before.toString('hex')}`)
        console.log(`  After:  ${after.toString('hex')}`)
        console.log(`  Text:   ${after.toString('latin1').replace(/[^\x20-\x7E]/g, '.')}`)
      }
      foundCount++
    }
  }
  console.log(`\nTotal CBranch patterns: ${foundCount}`)

  // Look for CBranchLeg
  console.log('\n=== CBranchLeg Analysis ===\n')
  let legCount = 0
  for (let i = 0; i < programData.length - 20; i++) {
    if (text.substring(i, i + 10) === 'CBranchLeg') {
      if (legCount < 20) {
        const before = programData.subarray(Math.max(0, i - 10), i)
        const after = programData.subarray(i, Math.min(programData.length, i + 40))
        console.log(`CBranchLeg at ${i}:`)
        console.log(`  Before: ${before.toString('hex')}`)
        console.log(`  After:  ${after.toString('hex')}`)
        console.log(`  Text:   ${after.toString('latin1').replace(/[^\x20-\x7E]/g, '.')}`)
      }
      legCount++
    }
  }
  console.log(`\nTotal CBranchLeg patterns: ${legCount}`)

  // Analyze the structure near the first few CBranch markers
  console.log('\n=== First 5 CBranch Structures ===\n')
  let branchNum = 0
  for (let i = 0; i < programData.length - 100 && branchNum < 5; i++) {
    if (text.substring(i, i + 7) === 'CBranch' && text.substring(i, i + 10) !== 'CBranchLeg') {
      console.log(`\nCBranch #${branchNum + 1} at position ${i}:`)

      // Find next 200 bytes and look for structure
      const region = programData.subarray(i, Math.min(i + 200, programData.length))
      const regionText = text.substring(i, i + 200)

      // Find addresses in this region
      const addrPattern = /[BIOTCRNFSAL]\d+:\d+(?:\/\d+)?(?:\.[A-Z]+)?/gi
      let match
      const addresses: { addr: string, pos: number }[] = []
      while ((match = addrPattern.exec(regionText)) !== null) {
        addresses.push({ addr: match[0], pos: i + match.index })
      }

      console.log(`  Addresses in region: ${addresses.map(a => a.addr).join(', ')}`)

      // Find CBranchLeg markers
      let legPos = regionText.indexOf('CBranchLeg')
      let legIndex = 0
      while (legPos !== -1 && legIndex < 5) {
        console.log(`  CBranchLeg at offset +${legPos}`)
        legPos = regionText.indexOf('CBranchLeg', legPos + 10)
        legIndex++
      }

      branchNum++
    }
  }
}

analyzeBranches().catch(console.error)
