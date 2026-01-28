// Test branch level detection
import { parseRSS } from './src/lib/rss-parser'
import * as fs from 'fs'

async function test() {
  const rssPath = '/home/beub/Hatfield PA, Palletizer/acd-viewer-web/LANLOGIX_BR.RSS'
  const fileBuffer = fs.readFileSync(rssPath)
  const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength)

  const parsed = await parseRSS(arrayBuffer)

  // Find MAIN routine, rung 2
  for (const prog of parsed.programs) {
    for (const routine of prog.routines) {
      if (routine.name === 'MAIN') {
        const rung2 = routine.rungs.find(r => r.number === 2)
        if (rung2) {
          console.log('=== RUNG 2 WITH BRANCH LEVELS ===\n')

          // Group by branchLeg
          const byLeg = new Map<number, typeof rung2.instructions>()
          for (const inst of rung2.instructions) {
            const leg = inst.branchLeg ?? 0
            if (!byLeg.has(leg)) byLeg.set(leg, [])
            byLeg.get(leg)!.push(inst)
          }

          for (const [leg, insts] of Array.from(byLeg.entries()).sort((a, b) => a[0] - b[0])) {
            const level = insts[0]?.branchLevel ?? 0
            const indent = '  '.repeat(level)
            const instStr = insts.map(i => `${i.type}(${i.operands[0]})`).join(' → ')
            console.log(`${indent}Leg ${leg} (level ${level}): ${instStr}`)
          }
        }
      }
    }
  }
}

test().catch(console.error)
