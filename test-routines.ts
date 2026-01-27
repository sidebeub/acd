/**
 * Test script to verify RSS parsing separates ladder files into routines
 */

import * as fs from 'fs'
import { parseRSS } from './src/lib/rss-parser'

const RSS_FILE = './LANLOGIX_BR.RSS'

async function testRoutines() {
  console.log('Reading and parsing RSS file...\n')
  const buffer = fs.readFileSync(RSS_FILE)
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)

  const project = await parseRSS(arrayBuffer)

  console.log('\n=== PROJECT SUMMARY ===')
  console.log(`Name: ${project.name}`)
  console.log(`Processor: ${project.processorType}`)
  console.log(`Programs: ${project.programs.length}`)

  for (const program of project.programs) {
    console.log(`\n=== PROGRAM: ${program.name} ===`)
    console.log(`Main Routine: ${program.mainRoutineName}`)
    console.log(`Total Routines: ${program.routines.length}`)

    console.log('\nRoutine breakdown:')
    let totalRungs = 0
    for (const routine of program.routines) {
      console.log(`  ${routine.name}: ${routine.rungs.length} rungs`)
      totalRungs += routine.rungs.length
    }
    console.log(`\nTotal rungs across all routines: ${totalRungs}`)
  }

  // Show first few rungs of each routine
  console.log('\n=== SAMPLE RUNGS FROM EACH ROUTINE ===')
  for (const program of project.programs) {
    for (const routine of program.routines.slice(0, 5)) {
      console.log(`\n--- ${routine.name} (${routine.rungs.length} rungs) ---`)
      for (const rung of routine.rungs.slice(0, 3)) {
        const instStr = rung.instructions.map(i => `${i.type}(${i.operands.join(',')})`).join(' ')
        console.log(`  Rung ${rung.number}: ${instStr.slice(0, 80)}${instStr.length > 80 ? '...' : ''}`)
      }
    }
  }
}

testRoutines().catch(console.error)
