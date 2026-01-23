import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface IOPoint {
  tagName: string
  aliasName?: string
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

    // Build alias map: raw I/O address -> friendly tag name
    // e.g., "&ee491627:5:I.0" -> "MagLiftUp"
    const aliasMap: Record<string, { name: string; description?: string }> = {}
    for (const tag of project.tags) {
      if (tag.aliasFor) {
        aliasMap[tag.aliasFor] = { name: tag.name, description: tag.description || undefined }
        // Also map without the leading & if present
        if (tag.aliasFor.startsWith('&')) {
          aliasMap[tag.aliasFor.substring(1)] = { name: tag.name, description: tag.description || undefined }
        }
      }
    }

    // Also look for tags with I/O-related data types or patterns
    const ioTags = project.tags.filter(t =>
      t.dataType?.includes('INPUT') ||
      t.dataType?.includes('OUTPUT') ||
      t.name.includes(':I.') ||
      t.name.includes(':O.') ||
      t.aliasFor?.includes(':I.') ||
      t.aliasFor?.includes(':O.') ||
      // Common I/O naming patterns various programmers use
      t.name.match(/^(Local|Remote):/i) ||
      t.aliasFor?.match(/^&[a-f0-9]+:/i)
    )

    // Add aliased I/O tags first (these have friendly names)
    for (const tag of ioTags) {
      if (tag.aliasFor) {
        const isInput = tag.aliasFor.includes(':I.')
        const isOutput = tag.aliasFor.includes(':O.')

        if (isInput || isOutput) {
          ioPoints[tag.aliasFor] = {
            tagName: tag.aliasFor,
            aliasName: tag.name,
            fullPath: tag.aliasFor,
            type: isInput ? 'input' : 'output',
            description: tag.description || undefined,
            usage: []
          }
        }
      }
    }

    // Parse rungs for I/O references
    for (const program of project.programs) {
      for (const routine of program.routines) {
        for (const rung of routine.rungs) {
          // Extract all instruction operands
          const instructionRegex = /([A-Z_][A-Z0-9_]*)\(([^)]*)\)/gi
          let match

          instructionRegex.lastIndex = 0
          while ((match = instructionRegex.exec(rung.rawText)) !== null) {
            const instruction = match[1].toUpperCase()
            const operands = parseOperands(match[2])

            for (const operand of operands) {
              // Check if this looks like an I/O reference
              // Various patterns programmers use:
              // - &hexid:slot:I.bit or &hexid:slot:O.bit (Point I/O)
              // - Local:slot:I.Data.bit (local chassis)
              // - ModuleName:I.Data.bit (named modules)
              const isIORef =
                operand.includes(':I.') ||
                operand.includes(':O.') ||
                operand.startsWith('Local:') ||
                operand.startsWith('&') ||
                ioPoints[operand]

              if (isIORef) {
                const isInput = operand.includes(':I.')
                const isOutput = operand.includes(':O.')

                if (!ioPoints[operand]) {
                  // Look up alias for this address
                  const alias = aliasMap[operand] || aliasMap[operand.replace(/^&/, '')]

                  ioPoints[operand] = {
                    tagName: operand,
                    aliasName: alias?.name,
                    fullPath: operand,
                    type: isInput ? 'input' : isOutput ? 'output' : 'unknown',
                    description: alias?.description,
                    usage: []
                  }

                  // Try to extract module/slot/channel info
                  // Pattern: &hexid:slot:I/O.bit or Local:slot:I/O.Data.bit
                  const slotMatch = operand.match(/:(\d+):([IO])\./)
                  if (slotMatch) {
                    ioPoints[operand].slot = parseInt(slotMatch[1])
                  }
                  const channelMatch = operand.match(/\.(\d+)$/)
                  if (channelMatch) {
                    ioPoints[operand].channel = parseInt(channelMatch[1])
                  }
                }

                ioPoints[operand].usage.push({
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

      // Group by module - extract module identifier
      let moduleName = 'Unknown'
      const moduleMatch = io.fullPath.match(/^(&?[^:]+):/)
      if (moduleMatch) {
        moduleName = moduleMatch[1]
        // Try to find a friendly module name from hardware modules
        const hwModule = project.modules.find(m =>
          m.name && io.fullPath.includes(m.name)
        )
        if (hwModule?.name) {
          moduleName = hwModule.name
        }
      }

      if (!byModule[moduleName]) {
        byModule[moduleName] = []
      }
      byModule[moduleName].push(io)
    }

    // Sort - put aliased (named) I/O first, then by address
    const sortIO = (a: IOPoint, b: IOPoint) => {
      // Aliased tags first
      if (a.aliasName && !b.aliasName) return -1
      if (!a.aliasName && b.aliasName) return 1
      // Then by alias name or tag name
      const nameA = a.aliasName || a.tagName
      const nameB = b.aliasName || b.tagName
      return nameA.localeCompare(nameB)
    }

    inputs.sort(sortIO)
    outputs.sort(sortIO)

    return NextResponse.json({
      projectId: id,
      projectName: project.name,
      stats: {
        totalIOPoints: Object.keys(ioPoints).length,
        inputs: inputs.length,
        outputs: outputs.length,
        namedInputs: inputs.filter(i => i.aliasName).length,
        namedOutputs: outputs.filter(o => o.aliasName).length,
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
