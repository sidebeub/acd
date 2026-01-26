import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface SafetyItem {
  tagName: string
  category: 'estop' | 'guard' | 'lightcurtain' | 'safetyrelay' | 'interlock' | 'reset' | 'alarm' | 'fault'
  severity: 'critical' | 'high' | 'medium'
  description: string
  locations: {
    program: string
    routine: string
    rungNumber: number
    rungId: string
    rungComment?: string
    instruction: string
    context: string
  }[]
}

// Safety-related tag patterns
const SAFETY_PATTERNS = [
  // E-Stop patterns
  { regex: /e[-_]?stop|estop|emergency[-_]?stop/i, category: 'estop' as const, severity: 'critical' as const, description: 'Emergency Stop' },
  { regex: /ems[-_]|[-_]ems|e[-_]?s[-_]?[0-9]/i, category: 'estop' as const, severity: 'critical' as const, description: 'Emergency Stop' },

  // Guard/Door interlocks
  { regex: /guard|door[-_]?sw|gate[-_]?sw|access[-_]?door|safety[-_]?door/i, category: 'guard' as const, severity: 'critical' as const, description: 'Guard/Door Interlock' },
  { regex: /enclosure|cabinet[-_]?door|panel[-_]?door/i, category: 'guard' as const, severity: 'high' as const, description: 'Enclosure Access' },

  // Light curtains
  { regex: /light[-_]?curtain|lc[-_]|[-_]lc[0-9]|photo[-_]?eye[-_]?safety|safety[-_]?beam/i, category: 'lightcurtain' as const, severity: 'critical' as const, description: 'Light Curtain' },
  { regex: /area[-_]?scanner|safety[-_]?scanner|laser[-_]?scanner/i, category: 'lightcurtain' as const, severity: 'critical' as const, description: 'Safety Scanner' },

  // Safety relays/PLCs
  { regex: /safety[-_]?relay|sr[-_]|[-_]sr[0-9]|safety[-_]?plc|guardmaster|pilz|sick[-_]?safety/i, category: 'safetyrelay' as const, severity: 'critical' as const, description: 'Safety Relay/Controller' },
  { regex: /safe[-_]?torque|sto[-_]|ss1[-_]|ss2[-_]|sls[-_]|sbc[-_]/i, category: 'safetyrelay' as const, severity: 'critical' as const, description: 'Safe Motion Function' },

  // General interlocks
  { regex: /interlock|intlk|i[-_]?lock/i, category: 'interlock' as const, severity: 'high' as const, description: 'Interlock' },
  { regex: /permit|enable[-_]?sw|run[-_]?permit/i, category: 'interlock' as const, severity: 'high' as const, description: 'Run Permit' },
  { regex: /bypass|override/i, category: 'interlock' as const, severity: 'high' as const, description: 'Bypass/Override (Review Required)' },

  // Reset circuits
  { regex: /reset|rst[-_]|[-_]rst|fault[-_]?reset|alarm[-_]?reset/i, category: 'reset' as const, severity: 'medium' as const, description: 'Reset Circuit' },
  { regex: /acknowledge|ack[-_]|[-_]ack/i, category: 'reset' as const, severity: 'medium' as const, description: 'Alarm Acknowledge' },

  // Alarms
  { regex: /alarm|alm[-_]|[-_]alm/i, category: 'alarm' as const, severity: 'medium' as const, description: 'Alarm' },
  { regex: /warning|warn[-_]/i, category: 'alarm' as const, severity: 'medium' as const, description: 'Warning' },

  // Faults
  { regex: /fault|flt[-_]|[-_]flt|fail|error/i, category: 'fault' as const, severity: 'high' as const, description: 'Fault/Error' },
  { regex: /overload|ol[-_]|[-_]ol|overcurrent|oc[-_]/i, category: 'fault' as const, severity: 'high' as const, description: 'Overload Protection' },
  { regex: /overheat|over[-_]?temp|high[-_]?temp/i, category: 'fault' as const, severity: 'high' as const, description: 'Thermal Protection' },
]

// Instruction patterns that indicate safety-critical usage
const SAFETY_INSTRUCTIONS = [
  { regex: /OTU\(/i, context: 'Unlatch (possible safety stop)' },
  { regex: /OTL\(/i, context: 'Latch (possible fault latch)' },
  { regex: /RES\(/i, context: 'Reset instruction' },
  { regex: /AFI\(/i, context: 'Always False (disabled logic)' },
]

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

    const safetyItems: Record<string, SafetyItem> = {}

    // Scan all rungs for safety patterns
    for (const program of project.programs) {
      for (const routine of program.routines) {
        for (const rung of routine.rungs) {
          const text = rung.rawText

          // Check each safety pattern
          for (const pattern of SAFETY_PATTERNS) {
            // Find all tag references in the rung
            const tagRegex = /([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*(?:\[[^\]]+\])?(?:\.[A-Za-z_][A-Za-z0-9_]*)*)/g
            let tagMatch

            while ((tagMatch = tagRegex.exec(text)) !== null) {
              const tagName = tagMatch[1]

              if (pattern.regex.test(tagName)) {
                const key = `${tagName.toLowerCase()}-${pattern.category}`

                // Find the instruction using this tag
                const instructionRegex = new RegExp(`([A-Z_]+)\\([^)]*${escapeRegex(tagName)}[^)]*\\)`, 'i')
                const instMatch = instructionRegex.exec(text)
                const instruction = instMatch ? instMatch[0] : 'Unknown'

                // Determine context
                let context = pattern.description
                for (const safetyInst of SAFETY_INSTRUCTIONS) {
                  if (safetyInst.regex.test(instruction)) {
                    context += ` - ${safetyInst.context}`
                    break
                  }
                }

                if (!safetyItems[key]) {
                  safetyItems[key] = {
                    tagName,
                    category: pattern.category,
                    severity: pattern.severity,
                    description: pattern.description,
                    locations: []
                  }
                }

                // Avoid duplicate locations
                const locKey = `${program.name}-${routine.name}-${rung.number}`
                if (!safetyItems[key].locations.some(l =>
                  l.program === program.name && l.routine === routine.name && l.rungNumber === rung.number
                )) {
                  safetyItems[key].locations.push({
                    program: program.name,
                    routine: routine.name,
                    rungNumber: rung.number,
                    rungId: rung.id,
                    rungComment: rung.comment || undefined,
                    instruction,
                    context
                  })
                }
              }
            }
          }
        }
      }
    }

    // Also check tags database for safety-related tags
    for (const tag of project.tags) {
      for (const pattern of SAFETY_PATTERNS) {
        if (pattern.regex.test(tag.name)) {
          const key = `${tag.name.toLowerCase()}-${pattern.category}`
          if (!safetyItems[key]) {
            safetyItems[key] = {
              tagName: tag.name,
              category: pattern.category,
              severity: pattern.severity,
              description: pattern.description + (tag.description ? ` - ${tag.description}` : ''),
              locations: []
            }
          }
        }
      }
    }

    // Convert to array and sort by severity, then category
    const severityOrder = { critical: 0, high: 1, medium: 2 }
    const items = Object.values(safetyItems).sort((a, b) => {
      const sevDiff = severityOrder[a.severity] - severityOrder[b.severity]
      if (sevDiff !== 0) return sevDiff
      return a.category.localeCompare(b.category)
    })

    // Generate summary
    const summary = {
      total: items.length,
      critical: items.filter(i => i.severity === 'critical').length,
      high: items.filter(i => i.severity === 'high').length,
      medium: items.filter(i => i.severity === 'medium').length,
      byCategory: {
        estop: items.filter(i => i.category === 'estop').length,
        guard: items.filter(i => i.category === 'guard').length,
        lightcurtain: items.filter(i => i.category === 'lightcurtain').length,
        safetyrelay: items.filter(i => i.category === 'safetyrelay').length,
        interlock: items.filter(i => i.category === 'interlock').length,
        reset: items.filter(i => i.category === 'reset').length,
        alarm: items.filter(i => i.category === 'alarm').length,
        fault: items.filter(i => i.category === 'fault').length,
      }
    }

    return NextResponse.json({
      projectId: id,
      projectName: project.name,
      summary,
      safetyItems: items
    })

  } catch (error) {
    console.error('Error analyzing safety:', error)
    return NextResponse.json(
      { error: 'Failed to analyze safety items' },
      { status: 500 }
    )
  }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
