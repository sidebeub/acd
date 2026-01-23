import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface TimerInfo {
  tagName: string
  type: 'TON' | 'TOF' | 'RTO'
  preset: string
  accum: string
  locations: {
    program: string
    routine: string
    rungNumber: number
    rungId: string
    instruction: string
  }[]
  resets: {
    program: string
    routine: string
    rungNumber: number
    rungId: string
  }[]
}

interface CounterInfo {
  tagName: string
  type: 'CTU' | 'CTD' | 'CTUD'
  preset: string
  accum: string
  locations: {
    program: string
    routine: string
    rungNumber: number
    rungId: string
    instruction: string
  }[]
  resets: {
    program: string
    routine: string
    rungNumber: number
    rungId: string
  }[]
}

// GET - Get timer/counter analysis for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        programs: {
          include: {
            routines: {
              include: {
                rungs: true
              }
            }
          }
        },
        tags: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const timers: Record<string, TimerInfo> = {}
    const counters: Record<string, CounterInfo> = {}

    // Timer instruction patterns
    const timerRegex = /(TON|TOF|RTO)\(([^)]+)\)/gi
    const counterRegex = /(CTU|CTD|CTUD)\(([^)]+)\)/gi
    const resetRegex = /RES\(([^)]+)\)/gi

    for (const program of project.programs) {
      for (const routine of program.routines) {
        for (const rung of routine.rungs) {
          // Find timers
          let match
          while ((match = timerRegex.exec(rung.rawText)) !== null) {
            const type = match[1].toUpperCase() as 'TON' | 'TOF' | 'RTO'
            const operands = parseOperands(match[2])
            const tagName = operands[0]?.trim()

            if (tagName) {
              if (!timers[tagName]) {
                timers[tagName] = {
                  tagName,
                  type,
                  preset: operands[1]?.trim() || '',
                  accum: operands[2]?.trim() || '0',
                  locations: [],
                  resets: []
                }
              }

              timers[tagName].locations.push({
                program: program.name,
                routine: routine.name,
                rungNumber: rung.number,
                rungId: rung.id,
                instruction: match[0]
              })
            }
          }

          // Find counters
          while ((match = counterRegex.exec(rung.rawText)) !== null) {
            const type = match[1].toUpperCase() as 'CTU' | 'CTD' | 'CTUD'
            const operands = parseOperands(match[2])
            const tagName = operands[0]?.trim()

            if (tagName) {
              if (!counters[tagName]) {
                counters[tagName] = {
                  tagName,
                  type,
                  preset: operands[1]?.trim() || '',
                  accum: operands[2]?.trim() || '0',
                  locations: [],
                  resets: []
                }
              }

              counters[tagName].locations.push({
                program: program.name,
                routine: routine.name,
                rungNumber: rung.number,
                rungId: rung.id,
                instruction: match[0]
              })
            }
          }

          // Find resets - apply to both timers and counters
          while ((match = resetRegex.exec(rung.rawText)) !== null) {
            const tagName = match[1].trim()

            if (timers[tagName]) {
              timers[tagName].resets.push({
                program: program.name,
                routine: routine.name,
                rungNumber: rung.number,
                rungId: rung.id
              })
            }

            if (counters[tagName]) {
              counters[tagName].resets.push({
                program: program.name,
                routine: routine.name,
                rungNumber: rung.number,
                rungId: rung.id
              })
            }
          }
        }
      }
    }

    // Get tag info for timers/counters
    const timerTags = project.tags.filter(t =>
      t.dataType === 'TIMER' || t.dataType?.startsWith('TIMER')
    )
    const counterTags = project.tags.filter(t =>
      t.dataType === 'COUNTER' || t.dataType?.startsWith('COUNTER')
    )

    // Sort by tag name
    const sortedTimers = Object.values(timers).sort((a, b) =>
      a.tagName.localeCompare(b.tagName)
    )
    const sortedCounters = Object.values(counters).sort((a, b) =>
      a.tagName.localeCompare(b.tagName)
    )

    return NextResponse.json({
      projectId: id,
      projectName: project.name,
      stats: {
        totalTimers: sortedTimers.length,
        totalCounters: sortedCounters.length,
        timersByType: {
          TON: sortedTimers.filter(t => t.type === 'TON').length,
          TOF: sortedTimers.filter(t => t.type === 'TOF').length,
          RTO: sortedTimers.filter(t => t.type === 'RTO').length
        },
        countersByType: {
          CTU: sortedCounters.filter(c => c.type === 'CTU').length,
          CTD: sortedCounters.filter(c => c.type === 'CTD').length,
          CTUD: sortedCounters.filter(c => c.type === 'CTUD').length
        }
      },
      timers: sortedTimers,
      counters: sortedCounters,
      timerTags: timerTags.map(t => ({ name: t.name, scope: t.scope })),
      counterTags: counterTags.map(t => ({ name: t.name, scope: t.scope }))
    })

  } catch (error) {
    console.error('Error analyzing timers/counters:', error)
    return NextResponse.json(
      { error: 'Failed to analyze timers/counters' },
      { status: 500 }
    )
  }
}

function parseOperands(operandsStr: string): string[] {
  const operands: string[] = []
  let current = ''
  let depth = 0

  for (const char of operandsStr) {
    if (char === '(' || char === '[') {
      depth++
      current += char
    } else if (char === ')' || char === ']') {
      depth--
      current += char
    } else if (char === ',' && depth === 0) {
      if (current.trim()) operands.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) operands.push(current.trim())
  return operands
}
