import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface TimerInfo {
  tagName: string
  type: 'TON' | 'TOF' | 'RTO'
  preset: string
  presetValue: number | null
  presetUnit: string
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
  presetValue: number | null
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

// Parse preset value - handles numbers, tag references, expressions
function parsePresetValue(preset: string): { value: number | null; display: string; unit: string } {
  if (!preset) return { value: null, display: '?', unit: '' }

  const trimmed = preset.trim()

  // Direct number (milliseconds for timers)
  const numMatch = trimmed.match(/^(\d+)$/)
  if (numMatch) {
    const ms = parseInt(numMatch[1])
    // Format as seconds if >= 1000ms
    if (ms >= 1000) {
      return { value: ms, display: `${(ms / 1000).toFixed(1)}s`, unit: 'ms' }
    }
    return { value: ms, display: `${ms}ms`, unit: 'ms' }
  }

  // Tag.PRE reference - show tag name
  if (trimmed.includes('.PRE')) {
    const tagName = trimmed.split('.')[0]
    return { value: null, display: `${tagName}.PRE`, unit: '' }
  }

  // Other tag reference or expression
  return { value: null, display: trimmed, unit: '' }
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

    // Timer instruction patterns - handle various formats
    // TON(timer,preset,accum) or TON(timer,?,preset,accum) depending on version
    const timerRegex = /(TON|TOF|RTO)\(([^)]+)\)/gi
    const counterRegex = /(CTU|CTD|CTUD)\(([^)]+)\)/gi
    const resetRegex = /RES\(([^)]+)\)/gi

    for (const program of project.programs) {
      for (const routine of program.routines) {
        for (const rung of routine.rungs) {
          // Find timers
          let match
          timerRegex.lastIndex = 0 // Reset regex state
          while ((match = timerRegex.exec(rung.rawText)) !== null) {
            const type = match[1].toUpperCase() as 'TON' | 'TOF' | 'RTO'
            const operands = parseOperands(match[2])
            const tagName = operands[0]?.trim()

            if (tagName) {
              // Preset is typically second operand, but may vary
              // Try to find a numeric or .PRE reference
              let presetRaw = ''
              for (let i = 1; i < operands.length; i++) {
                const op = operands[i]?.trim()
                if (op && (/^\d+$/.test(op) || op.includes('.PRE'))) {
                  presetRaw = op
                  break
                }
              }
              if (!presetRaw && operands[1]) {
                presetRaw = operands[1].trim()
              }

              const presetInfo = parsePresetValue(presetRaw)

              if (!timers[tagName]) {
                timers[tagName] = {
                  tagName,
                  type,
                  preset: presetRaw,
                  presetValue: presetInfo.value,
                  presetUnit: presetInfo.unit,
                  accum: operands[2]?.trim() || '0',
                  locations: [],
                  resets: []
                }
              } else if (!timers[tagName].presetValue && presetInfo.value) {
                // Update with better preset info if we find it
                timers[tagName].preset = presetRaw
                timers[tagName].presetValue = presetInfo.value
                timers[tagName].presetUnit = presetInfo.unit
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
          counterRegex.lastIndex = 0
          while ((match = counterRegex.exec(rung.rawText)) !== null) {
            const type = match[1].toUpperCase() as 'CTU' | 'CTD' | 'CTUD'
            const operands = parseOperands(match[2])
            const tagName = operands[0]?.trim()

            if (tagName) {
              // Find preset value
              let presetRaw = ''
              for (let i = 1; i < operands.length; i++) {
                const op = operands[i]?.trim()
                if (op && (/^\d+$/.test(op) || op.includes('.PRE'))) {
                  presetRaw = op
                  break
                }
              }
              if (!presetRaw && operands[1]) {
                presetRaw = operands[1].trim()
              }

              const numMatch = presetRaw.match(/^(\d+)$/)
              const presetValue = numMatch ? parseInt(numMatch[1]) : null

              if (!counters[tagName]) {
                counters[tagName] = {
                  tagName,
                  type,
                  preset: presetRaw,
                  presetValue,
                  accum: operands[2]?.trim() || '0',
                  locations: [],
                  resets: []
                }
              } else if (!counters[tagName].presetValue && presetValue) {
                counters[tagName].preset = presetRaw
                counters[tagName].presetValue = presetValue
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
          resetRegex.lastIndex = 0
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

    // Get tag info for timers/counters from tags table
    const timerTags = project.tags.filter(t =>
      t.dataType === 'TIMER' || t.dataType?.startsWith('TIMER')
    )
    const counterTags = project.tags.filter(t =>
      t.dataType === 'COUNTER' || t.dataType?.startsWith('COUNTER')
    )

    // Format timers with display-friendly preset
    const sortedTimers = Object.values(timers)
      .map(t => ({
        ...t,
        presetDisplay: t.presetValue
          ? (t.presetValue >= 1000 ? `${(t.presetValue / 1000).toFixed(1)}s` : `${t.presetValue}ms`)
          : (t.preset || '?')
      }))
      .sort((a, b) => a.tagName.localeCompare(b.tagName))

    // Format counters
    const sortedCounters = Object.values(counters)
      .map(c => ({
        ...c,
        presetDisplay: c.presetValue?.toString() || c.preset || '?'
      }))
      .sort((a, b) => a.tagName.localeCompare(b.tagName))

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
