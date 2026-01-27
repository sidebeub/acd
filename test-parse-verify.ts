/**
 * Test script to verify RSS parsing produces sensible ladder logic
 */

import * as fs from 'fs'
import { parseRSS } from './src/lib/rss-parser'

const RSS_FILE = './LANLOGIX_BR.RSS'

async function verifyParsing() {
  console.log('Reading and parsing RSS file...\n')
  const buffer = fs.readFileSync(RSS_FILE)
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

  const project = await parseRSS(arrayBuffer)

  console.log('\n=== PROJECT SUMMARY ===')
  console.log(`Name: ${project.name}`)
  console.log(`Processor: ${project.processorType}`)
  console.log(`Tags: ${project.tags.length}`)
  console.log(`Programs: ${project.programs.length}`)

  // Analyze instruction distribution
  const instCounts: Record<string, number> = {}
  let totalRungs = 0
  let totalInstructions = 0

  for (const program of project.programs) {
    for (const routine of program.routines) {
      totalRungs += routine.rungs.length
      for (const rung of routine.rungs) {
        for (const inst of rung.instructions) {
          instCounts[inst.type] = (instCounts[inst.type] || 0) + 1
          totalInstructions++
        }
      }
    }
  }

  console.log(`\nTotal Rungs: ${totalRungs}`)
  console.log(`Total Instructions: ${totalInstructions}`)

  console.log('\n=== INSTRUCTION DISTRIBUTION ===')
  const sorted = Object.entries(instCounts).sort((a, b) => b[1] - a[1])
  for (const [type, count] of sorted) {
    const pct = ((count / totalInstructions) * 100).toFixed(1)
    console.log(`  ${type}: ${count} (${pct}%)`)
  }

  // Check if distribution makes sense for a real PLC program
  console.log('\n=== SANITY CHECK ===')

  const xicCount = instCounts['XIC'] || 0
  const xioCount = instCounts['XIO'] || 0
  const oteCount = instCounts['OTE'] || 0
  const otlCount = instCounts['OTL'] || 0
  const otuCount = instCounts['OTU'] || 0

  const inputInst = xicCount + xioCount
  const outputInst = oteCount + otlCount + otuCount

  console.log(`Input instructions (XIC+XIO): ${inputInst}`)
  console.log(`Output instructions (OTE+OTL+OTU): ${outputInst}`)
  console.log(`Input/Output ratio: ${(inputInst / outputInst).toFixed(2)}:1`)

  // Typical PLC programs have more inputs than outputs (2-5:1 ratio is common)
  if (inputInst > outputInst && inputInst / outputInst >= 1.5) {
    console.log('✓ Input/output ratio looks reasonable for ladder logic')
  } else {
    console.log('⚠ Input/output ratio seems unusual')
  }

  // Show sample rungs
  console.log('\n=== SAMPLE RUNGS ===')
  const routine = project.programs[0]?.routines[0]
  if (routine) {
    for (let i = 0; i < Math.min(15, routine.rungs.length); i++) {
      const rung = routine.rungs[i]
      const instStr = rung.instructions.map(inst => `${inst.type}(${inst.operands.join(',')})`).join(' ')
      console.log(`Rung ${rung.number}: ${instStr}`)
    }
  }

  // Check for typical ladder patterns
  console.log('\n=== PATTERN ANALYSIS ===')
  let validPatterns = 0
  let totalChecked = 0

  if (routine) {
    for (const rung of routine.rungs.slice(0, 100)) {
      if (rung.instructions.length === 0) continue
      totalChecked++

      const lastInst = rung.instructions[rung.instructions.length - 1]
      const firstInsts = rung.instructions.slice(0, -1)

      // Valid pattern: inputs (XIC/XIO) followed by output (OTE/OTL/OTU)
      const hasInputs = firstInsts.every(i => ['XIC', 'XIO'].includes(i.type)) || firstInsts.length === 0
      const hasOutput = ['OTE', 'OTL', 'OTU', 'TON', 'TOF', 'CTU', 'CTD', 'MOV', 'ADD', 'SUB'].includes(lastInst.type)

      if (hasInputs && hasOutput) {
        validPatterns++
      }
    }
  }

  if (totalChecked > 0) {
    const validPct = ((validPatterns / totalChecked) * 100).toFixed(1)
    console.log(`Valid input->output patterns: ${validPatterns}/${totalChecked} (${validPct}%)`)

    if (validPatterns / totalChecked >= 0.5) {
      console.log('✓ Majority of rungs follow standard ladder logic patterns')
    } else {
      console.log('⚠ Many rungs dont follow standard patterns (may need review)')
    }
  }
}

verifyParsing().catch(console.error)
