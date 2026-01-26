import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface TraceLocation {
  program: string
  routine: string
  rungNumber: number
  rungId: string
  rungText: string
  rungComment?: string
}

interface TraceCondition {
  tag: string
  instruction: string
  type: 'input' | 'compare' | 'timer' | 'counter' | 'other'
  negated: boolean
}

interface TraceResult {
  tag: string
  type: 'output' | 'input'
  directSources: {
    location: TraceLocation
    conditions: TraceCondition[]
    outputInstruction: string
  }[]
  directTargets: {
    location: TraceLocation
    instruction: string
    effect: string
  }[]
}

// Patterns for output instructions (things that SET/WRITE to a tag)
const OUTPUT_PATTERNS = [
  { regex: /OTE\(([^)]+)\)/gi, instruction: 'OTE', effect: 'Energize' },
  { regex: /OTL\(([^)]+)\)/gi, instruction: 'OTL', effect: 'Latch ON' },
  { regex: /OTU\(([^)]+)\)/gi, instruction: 'OTU', effect: 'Unlatch OFF' },
  { regex: /MOV\([^,]+,\s*([^)]+)\)/gi, instruction: 'MOV', effect: 'Move value to' },
  { regex: /COP\([^,]+,\s*([^,]+)/gi, instruction: 'COP', effect: 'Copy to' },
  { regex: /CLR\(([^)]+)\)/gi, instruction: 'CLR', effect: 'Clear' },
  { regex: /TON\(([^,]+)/gi, instruction: 'TON', effect: 'Timer ON' },
  { regex: /TOF\(([^,]+)/gi, instruction: 'TOF', effect: 'Timer OFF' },
  { regex: /RTO\(([^,]+)/gi, instruction: 'RTO', effect: 'Retentive Timer' },
  { regex: /CTU\(([^,]+)/gi, instruction: 'CTU', effect: 'Count UP' },
  { regex: /CTD\(([^,]+)/gi, instruction: 'CTD', effect: 'Count DOWN' },
  { regex: /RES\(([^)]+)\)/gi, instruction: 'RES', effect: 'Reset' },
  { regex: /ADD\([^,]+,[^,]+,\s*([^)]+)\)/gi, instruction: 'ADD', effect: 'Add result to' },
  { regex: /SUB\([^,]+,[^,]+,\s*([^)]+)\)/gi, instruction: 'SUB', effect: 'Subtract result to' },
  { regex: /MUL\([^,]+,[^,]+,\s*([^)]+)\)/gi, instruction: 'MUL', effect: 'Multiply result to' },
  { regex: /DIV\([^,]+,[^,]+,\s*([^)]+)\)/gi, instruction: 'DIV', effect: 'Divide result to' },
]

// Patterns for input/condition instructions (things that READ a tag)
const INPUT_PATTERNS = [
  { regex: /XIC\(([^)]+)\)/gi, instruction: 'XIC', negated: false },
  { regex: /XIO\(([^)]+)\)/gi, instruction: 'XIO', negated: true },
  { regex: /ONS\(([^)]+)\)/gi, instruction: 'ONS', negated: false },
  { regex: /OSR\(([^)]+)\)/gi, instruction: 'OSR', negated: false },
  { regex: /OSF\(([^)]+)\)/gi, instruction: 'OSF', negated: false },
]

// Compare instructions pattern
const COMPARE_PATTERNS = [
  { regex: /EQU\(([^,]+),\s*([^)]+)\)/gi, instruction: 'EQU' },
  { regex: /NEQ\(([^,]+),\s*([^)]+)\)/gi, instruction: 'NEQ' },
  { regex: /GRT\(([^,]+),\s*([^)]+)\)/gi, instruction: 'GRT' },
  { regex: /GEQ\(([^,]+),\s*([^)]+)\)/gi, instruction: 'GEQ' },
  { regex: /LES\(([^,]+),\s*([^)]+)\)/gi, instruction: 'LES' },
  { regex: /LEQ\(([^,]+),\s*([^)]+)\)/gi, instruction: 'LEQ' },
  { regex: /LIM\(([^,]+),\s*([^,]+),\s*([^)]+)\)/gi, instruction: 'LIM' },
]

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const searchParams = request.nextUrl.searchParams
  const tagName = searchParams.get('tag')
  const direction = searchParams.get('direction') || 'sources' // 'sources' = what turns this on, 'targets' = what this affects

  if (!tagName) {
    return NextResponse.json({ error: 'Tag parameter required' }, { status: 400 })
  }

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
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const result: TraceResult = {
      tag: tagName,
      type: direction === 'sources' ? 'output' : 'input',
      directSources: [],
      directTargets: []
    }

    // Normalize tag name for comparison (handle array indices, member access)
    const normalizeTag = (t: string) => t.trim().toLowerCase()
    const tagLower = normalizeTag(tagName)

    // Also match tag with .DN, .TT, .EN bits for timers/counters
    const tagVariants = [
      tagLower,
      tagLower + '.dn',
      tagLower + '.tt',
      tagLower + '.en',
      tagLower + '.acc',
      tagLower + '.pre',
    ]

    for (const program of project.programs) {
      for (const routine of program.routines) {
        for (const rung of routine.rungs) {
          const text = rung.rawText

          if (direction === 'sources') {
            // Find where this tag is SET/WRITTEN TO
            for (const pattern of OUTPUT_PATTERNS) {
              pattern.regex.lastIndex = 0
              let match
              while ((match = pattern.regex.exec(text)) !== null) {
                const outputTag = normalizeTag(match[1])

                if (tagVariants.some(v => outputTag.includes(v) || v.includes(outputTag.split('.')[0]))) {
                  // This rung writes to our tag - extract conditions
                  const conditions = extractConditions(text)

                  result.directSources.push({
                    location: {
                      program: program.name,
                      routine: routine.name,
                      rungNumber: rung.number,
                      rungId: rung.id,
                      rungText: rung.rawText,
                      rungComment: rung.comment || undefined
                    },
                    conditions,
                    outputInstruction: match[0]
                  })
                  break // Only add once per rung per pattern
                }
              }
            }
          } else {
            // Find where this tag is READ/USED as input
            for (const pattern of INPUT_PATTERNS) {
              pattern.regex.lastIndex = 0
              let match
              while ((match = pattern.regex.exec(text)) !== null) {
                const inputTag = normalizeTag(match[1])

                if (tagVariants.some(v => inputTag.includes(v) || v.includes(inputTag.split('.')[0]))) {
                  // Find what this rung outputs
                  const outputs = extractOutputs(text)

                  for (const output of outputs) {
                    result.directTargets.push({
                      location: {
                        program: program.name,
                        routine: routine.name,
                        rungNumber: rung.number,
                        rungId: rung.id,
                        rungText: rung.rawText,
                        rungComment: rung.comment || undefined
                      },
                      instruction: match[0],
                      effect: `${pattern.instruction}(${tagName}) → ${output.instruction}(${output.tag})`
                    })
                  }
                  break
                }
              }
            }

            // Also check compare instructions
            for (const pattern of COMPARE_PATTERNS) {
              pattern.regex.lastIndex = 0
              let match
              while ((match = pattern.regex.exec(text)) !== null) {
                const operands = [match[1], match[2], match[3]].filter(Boolean).map(normalizeTag)

                if (operands.some(op => tagVariants.some(v => op.includes(v) || v.includes(op.split('.')[0])))) {
                  const outputs = extractOutputs(text)

                  for (const output of outputs) {
                    result.directTargets.push({
                      location: {
                        program: program.name,
                        routine: routine.name,
                        rungNumber: rung.number,
                        rungId: rung.id,
                        rungText: rung.rawText,
                        rungComment: rung.comment || undefined
                      },
                      instruction: match[0],
                      effect: `${pattern.instruction} using ${tagName} → ${output.instruction}(${output.tag})`
                    })
                  }
                  break
                }
              }
            }
          }
        }
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error tracing tag:', error)
    return NextResponse.json(
      { error: 'Failed to trace tag' },
      { status: 500 }
    )
  }
}

function extractConditions(rungText: string): TraceCondition[] {
  const conditions: TraceCondition[] = []

  // Extract XIC/XIO conditions
  for (const pattern of INPUT_PATTERNS) {
    pattern.regex.lastIndex = 0
    let match
    while ((match = pattern.regex.exec(rungText)) !== null) {
      conditions.push({
        tag: match[1].trim(),
        instruction: pattern.instruction,
        type: 'input',
        negated: pattern.negated
      })
    }
  }

  // Extract compare conditions
  for (const pattern of COMPARE_PATTERNS) {
    pattern.regex.lastIndex = 0
    let match
    while ((match = pattern.regex.exec(rungText)) !== null) {
      const operands = [match[1], match[2], match[3]].filter(Boolean)
      conditions.push({
        tag: operands.join(' vs '),
        instruction: pattern.instruction,
        type: 'compare',
        negated: pattern.instruction === 'NEQ'
      })
    }
  }

  // Extract timer .DN conditions
  const timerDnRegex = /XIC\(([^)]+)\.(DN|TT|EN)\)/gi
  let timerMatch: RegExpExecArray | null
  while ((timerMatch = timerDnRegex.exec(rungText)) !== null) {
    // Already captured by XIC, but add specific type
    const existing = conditions.find(c => c.tag.toLowerCase() === `${timerMatch![1]}.${timerMatch![2]}`.toLowerCase())
    if (existing) {
      existing.type = 'timer'
    }
  }

  // Extract counter .DN conditions
  const counterDnRegex = /XIC\(([^)]+)\.(DN|CU|CD)\)/gi
  let counterMatch: RegExpExecArray | null
  while ((counterMatch = counterDnRegex.exec(rungText)) !== null) {
    const existing = conditions.find(c => c.tag.toLowerCase() === `${counterMatch![1]}.${counterMatch![2]}`.toLowerCase())
    if (existing) {
      existing.type = 'counter'
    }
  }

  return conditions
}

function extractOutputs(rungText: string): { tag: string; instruction: string }[] {
  const outputs: { tag: string; instruction: string }[] = []

  for (const pattern of OUTPUT_PATTERNS) {
    pattern.regex.lastIndex = 0
    let match
    while ((match = pattern.regex.exec(rungText)) !== null) {
      outputs.push({
        tag: match[1].trim(),
        instruction: pattern.instruction
      })
    }
  }

  return outputs
}
