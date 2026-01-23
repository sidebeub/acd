import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface CrossRefEntry {
  tagName: string
  programName: string
  routineName: string
  rungNumber: number
  rungId: string
  instructionType: string
  operandPosition: number
  context: string // snippet of raw text around the tag
}

// GET - Get cross-reference for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const tagFilter = searchParams.get('tag')
  const instructionFilter = searchParams.get('instruction')

  try {
    // Get the project with all rungs
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
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Build cross-reference by parsing all rungs
    const crossRefs: CrossRefEntry[] = []
    const tagUsage: Record<string, {
      reads: number
      writes: number
      total: number
      locations: CrossRefEntry[]
    }> = {}

    // Instruction types that READ a tag (conditions)
    const readInstructions = ['XIC', 'XIO', 'EQU', 'NEQ', 'GRT', 'GEQ', 'LES', 'LEQ', 'LIM', 'CMP', 'MEQ', 'ONS', 'OSR', 'OSF']
    // Instruction types that WRITE a tag (outputs)
    const writeInstructions = ['OTE', 'OTL', 'OTU', 'MOV', 'ADD', 'SUB', 'MUL', 'DIV', 'CLR', 'COP', 'FLL', 'TON', 'TOF', 'RTO', 'CTU', 'CTD', 'RES']

    for (const program of project.programs) {
      for (const routine of program.routines) {
        for (const rung of routine.rungs) {
          // Parse instructions from rung
          const instructionRegex = /([A-Z_][A-Z0-9_]*)\(([^)]*)\)/gi
          let match

          while ((match = instructionRegex.exec(rung.rawText)) !== null) {
            const instructionType = match[1].toUpperCase()
            const operandsStr = match[2]

            // Skip if filtering by instruction and doesn't match
            if (instructionFilter && instructionType !== instructionFilter.toUpperCase()) {
              continue
            }

            // Parse operands
            const operands = parseOperands(operandsStr)

            for (let i = 0; i < operands.length; i++) {
              const operand = operands[i]

              // Skip numeric literals and empty operands
              if (!operand || /^-?\d+(\.\d+)?$/.test(operand)) continue

              // Extract base tag name (before any dots or brackets)
              const tagName = extractTagName(operand)
              if (!tagName) continue

              // Skip if filtering by tag and doesn't match
              if (tagFilter && !tagName.toLowerCase().includes(tagFilter.toLowerCase())) {
                continue
              }

              const entry: CrossRefEntry = {
                tagName: operand, // Keep full reference
                programName: program.name,
                routineName: routine.name,
                rungNumber: rung.number,
                rungId: rung.id,
                instructionType,
                operandPosition: i,
                context: extractContext(rung.rawText, operand)
              }

              crossRefs.push(entry)

              // Track usage stats
              if (!tagUsage[tagName]) {
                tagUsage[tagName] = { reads: 0, writes: 0, total: 0, locations: [] }
              }

              if (readInstructions.includes(instructionType)) {
                tagUsage[tagName].reads++
              } else if (writeInstructions.includes(instructionType)) {
                tagUsage[tagName].writes++
              }
              tagUsage[tagName].total++
              tagUsage[tagName].locations.push(entry)
            }
          }
        }
      }
    }

    // Sort by tag name
    const sortedTags = Object.entries(tagUsage)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([tag, usage]) => ({
        tag,
        ...usage,
        locations: usage.locations.slice(0, 100) // Limit locations per tag
      }))

    return NextResponse.json({
      projectId: id,
      projectName: project.name,
      totalReferences: crossRefs.length,
      uniqueTags: Object.keys(tagUsage).length,
      tags: sortedTags
    })

  } catch (error) {
    console.error('Error building cross-reference:', error)
    return NextResponse.json(
      { error: 'Failed to build cross-reference' },
      { status: 500 }
    )
  }
}

// POST - Build and cache cross-reference to database
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Get the project with all rungs
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
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Delete existing cross-references for this project
    await prisma.crossReference.deleteMany({
      where: { projectId: id }
    })

    // Build and store cross-references
    const crossRefs: {
      projectId: string
      tagName: string
      routineName: string
      programName: string
      rungNumber: number
      instructionType: string
      operandPosition: number
    }[] = []

    for (const program of project.programs) {
      for (const routine of program.routines) {
        for (const rung of routine.rungs) {
          const instructionRegex = /([A-Z_][A-Z0-9_]*)\(([^)]*)\)/gi
          let match

          while ((match = instructionRegex.exec(rung.rawText)) !== null) {
            const instructionType = match[1].toUpperCase()
            const operands = parseOperands(match[2])

            for (let i = 0; i < operands.length; i++) {
              const operand = operands[i]
              if (!operand || /^-?\d+(\.\d+)?$/.test(operand)) continue

              const tagName = extractTagName(operand)
              if (!tagName) continue

              crossRefs.push({
                projectId: id,
                tagName: operand,
                programName: program.name,
                routineName: routine.name,
                rungNumber: rung.number,
                instructionType,
                operandPosition: i
              })
            }
          }
        }
      }
    }

    // Batch insert
    if (crossRefs.length > 0) {
      await prisma.crossReference.createMany({
        data: crossRefs
      })
    }

    return NextResponse.json({
      success: true,
      referencesCreated: crossRefs.length
    })

  } catch (error) {
    console.error('Error building cross-reference:', error)
    return NextResponse.json(
      { error: 'Failed to build cross-reference' },
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

function extractTagName(operand: string): string | null {
  // Remove array indices and member access for base tag
  const match = operand.match(/^([A-Za-z_][A-Za-z0-9_]*)/)
  return match ? match[1] : null
}

function extractContext(rawText: string, tag: string): string {
  const idx = rawText.indexOf(tag)
  if (idx === -1) return ''

  const start = Math.max(0, idx - 20)
  const end = Math.min(rawText.length, idx + tag.length + 20)
  let context = rawText.substring(start, end)

  if (start > 0) context = '...' + context
  if (end < rawText.length) context = context + '...'

  return context
}
