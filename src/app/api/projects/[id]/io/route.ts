import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface IOPoint {
  tagName: string
  fullPath: string
  type: 'input' | 'output' | 'unknown'
  module?: string
  slot?: number
  channel?: number
  description?: string
  usage: {
    program: string
    routine: string
    rungNumber: number
    rungId: string
    instruction: string
  }[]
}

// GET - Get I/O analysis for a project
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
        modules: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const ioPoints: Record<string, IOPoint> = {}

    // Common I/O tag patterns
    // Local:X:I.Data.Y - local I/O
    // ModuleName:I.Data.X - remote I/O
    const ioPatterns = [
      /Local:(\d+):([IO])\.Data\.(\d+)/gi,       // Local:slot:I/O.Data.channel
      /Local:(\d+):([IO])\.(\d+)/gi,             // Local:slot:I/O.channel
      /([A-Za-z_][A-Za-z0-9_]*):([IO])\.Data\.(\d+)/gi, // Module:I/O.Data.channel
      /([A-Za-z_][A-Za-z0-9_]*):(\d+):([IO])/gi  // Module:slot:I/O
    ]

    // Also look for tags with I/O-related data types
    const ioTags = project.tags.filter(t =>
      t.dataType?.includes('INPUT') ||
      t.dataType?.includes('OUTPUT') ||
      t.name.includes(':I.') ||
      t.name.includes(':O.') ||
      t.aliasFor?.includes(':I.') ||
      t.aliasFor?.includes(':O.')
    )

    // Add tags to ioPoints
    for (const tag of ioTags) {
      const isInput = tag.dataType?.includes('INPUT') ||
                      tag.name.includes(':I.') ||
                      tag.aliasFor?.includes(':I.')
      const isOutput = tag.dataType?.includes('OUTPUT') ||
                       tag.name.includes(':O.') ||
                       tag.aliasFor?.includes(':O.')

      ioPoints[tag.name] = {
        tagName: tag.name,
        fullPath: tag.aliasFor || tag.name,
        type: isInput ? 'input' : isOutput ? 'output' : 'unknown',
        description: tag.description || undefined,
        usage: []
      }
    }

    // Parse rungs for I/O references
    for (const program of project.programs) {
      for (const routine of program.routines) {
        for (const rung of routine.rungs) {
          // Extract all instruction operands
          const instructionRegex = /([A-Z_][A-Z0-9_]*)\(([^)]*)\)/gi
          let match

          while ((match = instructionRegex.exec(rung.rawText)) !== null) {
            const instruction = match[1].toUpperCase()
            const operands = parseOperands(match[2])

            for (const operand of operands) {
              // Check if this looks like an I/O reference
              const isIORef =
                operand.includes(':I.') ||
                operand.includes(':O.') ||
                operand.startsWith('Local:') ||
                ioPoints[operand]

              if (isIORef) {
                const baseName = extractBaseName(operand)
                const isInput = operand.includes(':I.')
                const isOutput = operand.includes(':O.')

                if (!ioPoints[baseName]) {
                  ioPoints[baseName] = {
                    tagName: baseName,
                    fullPath: operand,
                    type: isInput ? 'input' : isOutput ? 'output' : 'unknown',
                    usage: []
                  }

                  // Try to extract module/slot/channel info
                  const localMatch = operand.match(/Local:(\d+):([IO])\.(?:Data\.)?(\d+)/)
                  if (localMatch) {
                    ioPoints[baseName].slot = parseInt(localMatch[1])
                    ioPoints[baseName].channel = parseInt(localMatch[3])
                  }
                }

                ioPoints[baseName].usage.push({
                  program: program.name,
                  routine: routine.name,
                  rungNumber: rung.number,
                  rungId: rung.id,
                  instruction: `${instruction}(${operand})`
                })
              }
            }
          }
        }
      }
    }

    // Organize by module/slot
    const byModule: Record<string, IOPoint[]> = {}
    const inputs: IOPoint[] = []
    const outputs: IOPoint[] = []

    for (const io of Object.values(ioPoints)) {
      if (io.type === 'input') {
        inputs.push(io)
      } else if (io.type === 'output') {
        outputs.push(io)
      }

      // Group by module
      const moduleMatch = io.fullPath.match(/^([^:]+):/)
      const moduleName = moduleMatch ? moduleMatch[1] : 'Unknown'
      if (!byModule[moduleName]) {
        byModule[moduleName] = []
      }
      byModule[moduleName].push(io)
    }

    // Sort
    inputs.sort((a, b) => a.tagName.localeCompare(b.tagName))
    outputs.sort((a, b) => a.tagName.localeCompare(b.tagName))

    return NextResponse.json({
      projectId: id,
      projectName: project.name,
      stats: {
        totalIOPoints: Object.keys(ioPoints).length,
        inputs: inputs.length,
        outputs: outputs.length,
        modules: Object.keys(byModule).length
      },
      inputs,
      outputs,
      byModule,
      hardwareModules: project.modules.map(m => ({
        name: m.name,
        catalogNumber: m.catalogNumber,
        slot: m.slot,
        parent: m.parentModule
      }))
    })

  } catch (error) {
    console.error('Error analyzing I/O:', error)
    return NextResponse.json(
      { error: 'Failed to analyze I/O' },
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

function extractBaseName(operand: string): string {
  // For aliased tags, just return the tag name
  // For direct I/O, return the full path up to the bit level
  const match = operand.match(/^([A-Za-z_][A-Za-z0-9_:.]*)/)
  return match ? match[1] : operand
}
