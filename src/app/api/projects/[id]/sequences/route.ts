import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface SequenceStep {
  stepNumber: number
  description?: string
  conditions: string[]
  actions: string[]
  location: {
    program: string
    routine: string
    rungNumber: number
    rungId: string
  }
}

interface SequenceInfo {
  tagName: string
  type: 'SQO' | 'SQI' | 'SQL' | 'STEP' | 'STATE'
  arrayLength?: number
  currentStep?: string
  mask?: string
  steps: SequenceStep[]
  locations: {
    program: string
    routine: string
    rungNumber: number
    rungId: string
    instruction: string
  }[]
}

interface StatePattern {
  tagName: string
  pattern: 'step_counter' | 'state_machine' | 'phase'
  stateValues: {
    value: number | string
    locations: {
      program: string
      routine: string
      rungNumber: number
      rungId: string
      context: string
    }[]
  }[]
}

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

    const sequences: Record<string, SequenceInfo> = {}
    const statePatterns: Record<string, StatePattern> = {}

    // Sequencer instruction patterns
    const sqoRegex = /SQO\(([^)]+)\)/gi
    const sqiRegex = /SQI\(([^)]+)\)/gi
    const sqlRegex = /SQL\(([^)]+)\)/gi

    // Step/state patterns in comparisons
    const stepEqualRegex = /(EQU|NEQ|GRT|LES|GEQ|LEQ)\(([^,]+(?:step|state|seq|phase)[^,]*),\s*(\d+)\)/gi
    const stepCompareRegex = /XIC\(([^)]+(?:step|state|seq|phase)[^)]*\.(\d+))\)/gi
    const movStepRegex = /MOV\((\d+),\s*([^)]+(?:step|state|seq|phase)[^)]*)\)/gi

    for (const program of project.programs) {
      for (const routine of program.routines) {
        for (const rung of routine.rungs) {
          const text = rung.rawText
          let match

          // Find SQO instructions
          sqoRegex.lastIndex = 0
          while ((match = sqoRegex.exec(text)) !== null) {
            const operands = parseOperands(match[1])
            const tagName = operands[0]?.trim()
            if (tagName) {
              if (!sequences[tagName]) {
                sequences[tagName] = {
                  tagName,
                  type: 'SQO',
                  mask: operands[2]?.trim(),
                  arrayLength: operands[4] ? parseInt(operands[4]) : undefined,
                  steps: [],
                  locations: []
                }
              }
              sequences[tagName].locations.push({
                program: program.name,
                routine: routine.name,
                rungNumber: rung.number,
                rungId: rung.id,
                instruction: match[0]
              })
            }
          }

          // Find SQI instructions
          sqiRegex.lastIndex = 0
          while ((match = sqiRegex.exec(text)) !== null) {
            const operands = parseOperands(match[1])
            const tagName = operands[0]?.trim()
            if (tagName) {
              if (!sequences[tagName]) {
                sequences[tagName] = {
                  tagName,
                  type: 'SQI',
                  mask: operands[2]?.trim(),
                  arrayLength: operands[4] ? parseInt(operands[4]) : undefined,
                  steps: [],
                  locations: []
                }
              }
              sequences[tagName].locations.push({
                program: program.name,
                routine: routine.name,
                rungNumber: rung.number,
                rungId: rung.id,
                instruction: match[0]
              })
            }
          }

          // Find SQL instructions
          sqlRegex.lastIndex = 0
          while ((match = sqlRegex.exec(text)) !== null) {
            const operands = parseOperands(match[1])
            const tagName = operands[0]?.trim()
            if (tagName) {
              if (!sequences[tagName]) {
                sequences[tagName] = {
                  tagName,
                  type: 'SQL',
                  steps: [],
                  locations: []
                }
              }
              sequences[tagName].locations.push({
                program: program.name,
                routine: routine.name,
                rungNumber: rung.number,
                rungId: rung.id,
                instruction: match[0]
              })
            }
          }

          // Find step/state compare patterns (EQU(Step,5), etc.)
          stepEqualRegex.lastIndex = 0
          while ((match = stepEqualRegex.exec(text)) !== null) {
            const instruction = match[1]
            const tagName = match[2]?.trim()
            const stepValue = parseInt(match[3])

            if (tagName && !isNaN(stepValue)) {
              const key = normalizeTagName(tagName)
              if (!statePatterns[key]) {
                statePatterns[key] = {
                  tagName: key,
                  pattern: detectPattern(tagName),
                  stateValues: []
                }
              }

              // Find or create step entry
              let stepEntry = statePatterns[key].stateValues.find(s => s.value === stepValue)
              if (!stepEntry) {
                stepEntry = { value: stepValue, locations: [] }
                statePatterns[key].stateValues.push(stepEntry)
              }

              stepEntry.locations.push({
                program: program.name,
                routine: routine.name,
                rungNumber: rung.number,
                rungId: rung.id,
                context: `${instruction}(${tagName}, ${stepValue})`
              })
            }
          }

          // Find bit-based step patterns (XIC(Step.5))
          stepCompareRegex.lastIndex = 0
          while ((match = stepCompareRegex.exec(text)) !== null) {
            const fullTag = match[1]?.trim()
            const bitNumber = parseInt(match[2])
            const tagName = fullTag.split('.')[0]

            if (tagName && !isNaN(bitNumber)) {
              const key = normalizeTagName(tagName)
              if (!statePatterns[key]) {
                statePatterns[key] = {
                  tagName: key,
                  pattern: detectPattern(tagName),
                  stateValues: []
                }
              }

              let stepEntry = statePatterns[key].stateValues.find(s => s.value === bitNumber)
              if (!stepEntry) {
                stepEntry = { value: bitNumber, locations: [] }
                statePatterns[key].stateValues.push(stepEntry)
              }

              stepEntry.locations.push({
                program: program.name,
                routine: routine.name,
                rungNumber: rung.number,
                rungId: rung.id,
                context: `XIC(${fullTag})`
              })
            }
          }

          // Find MOV to step tags (MOV(5, Step))
          movStepRegex.lastIndex = 0
          while ((match = movStepRegex.exec(text)) !== null) {
            const stepValue = parseInt(match[1])
            const tagName = match[2]?.trim()

            if (tagName && !isNaN(stepValue)) {
              const key = normalizeTagName(tagName)
              if (!statePatterns[key]) {
                statePatterns[key] = {
                  tagName: key,
                  pattern: detectPattern(tagName),
                  stateValues: []
                }
              }

              let stepEntry = statePatterns[key].stateValues.find(s => s.value === stepValue)
              if (!stepEntry) {
                stepEntry = { value: stepValue, locations: [] }
                statePatterns[key].stateValues.push(stepEntry)
              }

              stepEntry.locations.push({
                program: program.name,
                routine: routine.name,
                rungNumber: rung.number,
                rungId: rung.id,
                context: `MOV(${stepValue}, ${tagName})`
              })
            }
          }
        }
      }
    }

    // Get step/state related tags from database
    const stepTags = project.tags.filter(t =>
      /step|state|seq|phase/i.test(t.name) && /int|dint|sint/i.test(t.dataType || '')
    )

    // Sort state values by number
    Object.values(statePatterns).forEach(sp => {
      sp.stateValues.sort((a, b) => {
        const aNum = typeof a.value === 'number' ? a.value : parseInt(a.value as string) || 0
        const bNum = typeof b.value === 'number' ? b.value : parseInt(b.value as string) || 0
        return aNum - bNum
      })
    })

    return NextResponse.json({
      projectId: id,
      projectName: project.name,
      stats: {
        totalSequencers: Object.keys(sequences).length,
        totalStatePatterns: Object.keys(statePatterns).length,
        sequencersByType: {
          SQO: Object.values(sequences).filter(s => s.type === 'SQO').length,
          SQI: Object.values(sequences).filter(s => s.type === 'SQI').length,
          SQL: Object.values(sequences).filter(s => s.type === 'SQL').length
        }
      },
      sequences: Object.values(sequences).sort((a, b) => a.tagName.localeCompare(b.tagName)),
      statePatterns: Object.values(statePatterns)
        .filter(sp => sp.stateValues.length > 1) // Only show patterns with multiple states
        .sort((a, b) => a.tagName.localeCompare(b.tagName)),
      stepTags: stepTags.map(t => ({
        name: t.name,
        dataType: t.dataType,
        scope: t.scope,
        description: t.description
      }))
    })

  } catch (error) {
    console.error('Error analyzing sequences:', error)
    return NextResponse.json(
      { error: 'Failed to analyze sequences' },
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

function normalizeTagName(tag: string): string {
  // Remove array indices and member access for grouping
  return tag.split('[')[0].split('.')[0].trim()
}

function detectPattern(tagName: string): 'step_counter' | 'state_machine' | 'phase' {
  const lower = tagName.toLowerCase()
  if (lower.includes('phase')) return 'phase'
  if (lower.includes('state')) return 'state_machine'
  return 'step_counter'
}
