import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface AlarmInfo {
  tagName: string
  type: string
  message?: string
  severity?: string
  locations: {
    program: string
    routine: string
    rungNumber: number
    rungId: string
    instruction: string
    context: string
  }[]
}

// GET - Get alarm analysis for a project
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
        tags: true,
        dataTypes: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const alarms: Record<string, AlarmInfo> = {}

    // Alarm instruction patterns
    // ALMD - Digital Alarm
    // ALMA - Analog Alarm
    // ALM - Basic Alarm
    const alarmInstructions = ['ALMD', 'ALMA', 'ALM']
    const alarmRegex = new RegExp(`(${alarmInstructions.join('|')})\\(([^)]+)\\)`, 'gi')

    // Also look for tags that might be alarms (by naming convention)
    const alarmPatterns = [
      /alarm/i,
      /fault/i,
      /error/i,
      /warning/i,
      /_alm$/i,
      /_flt$/i,
      /_err$/i
    ]

    // Find alarm-related tags
    const alarmTags = project.tags.filter(t =>
      alarmPatterns.some(p => p.test(t.name)) ||
      t.dataType?.includes('ALARM') ||
      t.description?.toLowerCase().includes('alarm') ||
      t.description?.toLowerCase().includes('fault')
    )

    // Add alarm tags
    for (const tag of alarmTags) {
      alarms[tag.name] = {
        tagName: tag.name,
        type: tag.dataType || 'Unknown',
        message: tag.description || undefined,
        locations: []
      }
    }

    // Parse rungs for alarm instructions
    for (const program of project.programs) {
      for (const routine of program.routines) {
        for (const rung of routine.rungs) {
          let match

          // Find alarm instructions
          while ((match = alarmRegex.exec(rung.rawText)) !== null) {
            const instruction = match[1].toUpperCase()
            const operands = parseOperands(match[2])
            const tagName = operands[0]?.trim()

            if (tagName) {
              if (!alarms[tagName]) {
                alarms[tagName] = {
                  tagName,
                  type: instruction,
                  locations: []
                }
              }

              alarms[tagName].locations.push({
                program: program.name,
                routine: routine.name,
                rungNumber: rung.number,
                rungId: rung.id,
                instruction: match[0],
                context: extractContext(rung.rawText, tagName)
              })
            }
          }

          // Also check for tags being used in OTE with alarm-like names
          const oteRegex = /OTE\(([^)]+)\)/gi
          while ((match = oteRegex.exec(rung.rawText)) !== null) {
            const tagName = match[1].trim()

            if (alarmPatterns.some(p => p.test(tagName))) {
              if (!alarms[tagName]) {
                alarms[tagName] = {
                  tagName,
                  type: 'BOOL (Alarm Flag)',
                  locations: []
                }
              }

              alarms[tagName].locations.push({
                program: program.name,
                routine: routine.name,
                rungNumber: rung.number,
                rungId: rung.id,
                instruction: match[0],
                context: extractContext(rung.rawText, tagName)
              })
            }
          }
        }
      }
    }

    // Categorize alarms by type
    const digitalAlarms = Object.values(alarms).filter(a =>
      a.type === 'ALMD' || a.type === 'BOOL (Alarm Flag)'
    )
    const analogAlarms = Object.values(alarms).filter(a =>
      a.type === 'ALMA'
    )
    const faults = Object.values(alarms).filter(a =>
      a.tagName.toLowerCase().includes('fault') ||
      a.tagName.toLowerCase().includes('flt')
    )
    const warnings = Object.values(alarms).filter(a =>
      a.tagName.toLowerCase().includes('warning') ||
      a.tagName.toLowerCase().includes('warn')
    )

    // Sort by tag name
    const sortedAlarms = Object.values(alarms).sort((a, b) =>
      a.tagName.localeCompare(b.tagName)
    )

    return NextResponse.json({
      projectId: id,
      projectName: project.name,
      stats: {
        totalAlarms: sortedAlarms.length,
        digitalAlarms: digitalAlarms.length,
        analogAlarms: analogAlarms.length,
        faults: faults.length,
        warnings: warnings.length
      },
      alarms: sortedAlarms,
      byCategory: {
        digital: digitalAlarms,
        analog: analogAlarms,
        faults,
        warnings
      },
      alarmDataTypes: project.dataTypes
        .filter(dt => dt.name.toLowerCase().includes('alarm'))
        .map(dt => ({
          name: dt.name,
          family: dt.family,
          members: JSON.parse(dt.members || '[]')
        }))
    })

  } catch (error) {
    console.error('Error analyzing alarms:', error)
    return NextResponse.json(
      { error: 'Failed to analyze alarms' },
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

function extractContext(rawText: string, tag: string): string {
  const idx = rawText.indexOf(tag)
  if (idx === -1) return ''

  const start = Math.max(0, idx - 30)
  const end = Math.min(rawText.length, idx + tag.length + 30)
  let context = rawText.substring(start, end)

  if (start > 0) context = '...' + context
  if (end < rawText.length) context = context + '...'

  return context
}
