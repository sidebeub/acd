import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { explainRung as explainRungWithAI } from '@/lib/claude'
import {
  INSTRUCTIONS,
  generateFullRungExplanation,
  needsAIFallback,
  getUnknownInstructions,
  explainRungInstructions,
  ExplanationMode,
  DEVICE_PATTERNS
} from '@/lib/instruction-library'

// Cache version - increment this to invalidate old cached explanations
const CACHE_VERSION = 14

// Helper to create a hash of rung text (includes version to invalidate old cache)
function hashRung(text: string): string {
  return createHash('sha256').update(`v${CACHE_VERSION}:${text.trim().toLowerCase()}`).digest('hex').substring(0, 32)
}

// POST - Get explanation for a rung
export async function POST(request: NextRequest) {
  try {
    const { rungId, mode = 'friendly' } = await request.json()

    if (!rungId) {
      return NextResponse.json({ error: 'rungId is required' }, { status: 400 })
    }

    // Validate mode
    const explanationMode: ExplanationMode = ['friendly', 'technical', 'operator'].includes(mode)
      ? mode as ExplanationMode
      : 'friendly'

    // Get the rung with its context and any pre-computed routine analysis
    const rung = await prisma.rung.findUnique({
      where: { id: rungId },
      include: {
        routine: {
          include: {
            analysis: true, // Pre-computed routine analysis for context
            program: {
              include: {
                project: {
                  include: {
                    tags: {
                      select: {
                        name: true,
                        dataType: true,
                        description: true
                      }
                    }
                  }
                },
                localTags: {
                  select: {
                    name: true,
                    dataType: true,
                    description: true
                  }
                }
              }
            }
          }
        }
      }
    })

    if (!rung) {
      return NextResponse.json({ error: 'Rung not found' }, { status: 404 })
    }

    const rungHash = hashRung(rung.rawText)

    // Step 1: Check rung-level cache first
    const cachedRung = await prisma.rungExplanationCache.findUnique({
      where: { rungHash }
    })

    const modeField = `${explanationMode}Expl` as 'friendlyExpl' | 'technicalExpl' | 'operatorExpl'

    if (cachedRung && cachedRung[modeField]) {
      // Increment usage count
      await prisma.rungExplanationCache.update({
        where: { rungHash },
        data: { usageCount: { increment: 1 } }
      })

      // Even for cached explanations, we need to regenerate the dynamic parts
      // (troubleshooting, conditions, crossRefs) since they're not cached
      const instructionDetails = explainRungInstructions(rung.rawText, explanationMode)

      // Collect unique troubleshooting tips
      const troubleshootingTips: string[] = []
      const deviceTypes: string[] = []

      for (const inst of instructionDetails) {
        if (inst.troubleshooting) {
          for (const tip of inst.troubleshooting) {
            if (!troubleshootingTips.includes(tip)) {
              troubleshootingTips.push(tip)
            }
          }
        }
        if (inst.device) {
          if (!deviceTypes.includes(inst.device.friendlyName)) {
            deviceTypes.push(inst.device.friendlyName)
          }
        }
      }

      // Generate condition breakdown
      const conditions = generateConditionBreakdown(rung.rawText)

      return NextResponse.json({
        explanation: cachedRung[modeField],
        source: cachedRung.source,
        mode: explanationMode,
        cached: true,
        troubleshooting: troubleshootingTips.length > 0 ? troubleshootingTips : undefined,
        deviceTypes: deviceTypes.length > 0 ? deviceTypes : undefined,
        conditions: conditions.length > 0 ? conditions : undefined
      })
    }

    // Step 2: Check which instructions are unknown
    const unknownInstructions = getUnknownInstructions(rung.rawText)

    // Step 3: Check if we have learned explanations for unknown instructions
    let learnedExplanations: Record<string, string> = {}
    let stillUnknown: string[] = []

    if (unknownInstructions.length > 0) {
      const learnedInsts = await prisma.learnedInstruction.findMany({
        where: {
          instruction: { in: unknownInstructions }
        }
      })

      for (const inst of unknownInstructions) {
        const learned = learnedInsts.find(l => l.instruction === inst)
        if (learned && learned[modeField]) {
          learnedExplanations[inst] = learned[modeField]!
          // Increment usage count
          await prisma.learnedInstruction.update({
            where: { id: learned.id },
            data: { usageCount: { increment: 1 } }
          })
        } else {
          stillUnknown.push(inst)
        }
      }
    }

    let explanation: string
    let source: 'library' | 'ai' | 'hybrid' | 'learned'

    if (stillUnknown.length === 0) {
      // All instructions are known (either in library or learned)
      if (Object.keys(learnedExplanations).length > 0) {
        // Combine library + learned explanations
        explanation = generateFullRungExplanation(rung.rawText, explanationMode, false)
        // Append learned instruction explanations
        for (const [inst, expl] of Object.entries(learnedExplanations)) {
          explanation += `\n• ${inst}: ${expl}`
        }
        source = 'learned'
      } else {
        // Pure library explanation
        explanation = generateFullRungExplanation(rung.rawText, explanationMode, false)
        source = 'library'
      }
    } else {
      // Some instructions still need AI
      try {
        // Build tag context
        const tags: Record<string, { dataType: string; description?: string }> = {}

        for (const tag of rung.routine.program.project.tags) {
          tags[tag.name] = {
            dataType: tag.dataType,
            description: tag.description || undefined
          }
        }

        for (const tag of rung.routine.program.localTags) {
          tags[tag.name] = {
            dataType: tag.dataType,
            description: tag.description || undefined
          }
        }

        // Build routine context if we have pre-computed analysis
        let routineContext = ''
        if (rung.routine.analysis?.status === 'complete') {
          routineContext = `\n\nRoutine Context (${rung.routine.program.name}/${rung.routine.name}):\n`
          routineContext += `Purpose: ${rung.routine.analysis.purpose}\n`
          if (rung.routine.analysis.keyLogic) {
            routineContext += `Key Logic: ${rung.routine.analysis.keyLogic}\n`
          }
        }

        // Get AI explanation with routine context
        explanation = await explainRungWithAI(
          rung.rawText + routineContext,
          tags,
          explanationMode
        )
        source = 'ai'

        // LEARN: Save the AI explanation for unknown instructions
        for (const inst of stillUnknown) {
          // Ask AI specifically about this instruction for learning
          const instExplanation = await learnInstruction(inst, explanationMode)

          if (instExplanation) {
            // Save to database
            await prisma.learnedInstruction.upsert({
              where: { instruction: inst },
              create: {
                instruction: inst,
                [modeField]: instExplanation,
                source: 'ai',
                usageCount: 1
              },
              update: {
                [modeField]: instExplanation,
                usageCount: { increment: 1 }
              }
            })
          }
        }

      } catch (aiError) {
        // AI failed - use partial library explanation
        console.warn('AI explanation failed:', aiError)
        explanation = generateFullRungExplanation(rung.rawText, explanationMode, false)
        if (stillUnknown.length > 0) {
          explanation += `\n\n[Unknown instructions: ${stillUnknown.join(', ')}]`
        }
        source = 'library'
      }
    }

    // Cache the full rung explanation
    await prisma.rungExplanationCache.upsert({
      where: { rungHash },
      create: {
        rungHash,
        rungText: rung.rawText,
        [modeField]: explanation,
        source,
        usageCount: 1
      },
      update: {
        [modeField]: explanation,
        source,
        usageCount: { increment: 1 }
      }
    })

    // Include routine analysis context if available
    const routineAnalysis = rung.routine.analysis?.status === 'complete' ? {
      purpose: rung.routine.analysis.purpose,
      keyLogic: rung.routine.analysis.keyLogic
    } : undefined

    // Get detailed instruction data with troubleshooting
    const instructionDetails = explainRungInstructions(rung.rawText, explanationMode)

    // Collect unique troubleshooting tips
    const troubleshootingTips: string[] = []
    const deviceTypes: string[] = []

    for (const inst of instructionDetails) {
      if (inst.troubleshooting) {
        for (const tip of inst.troubleshooting) {
          if (!troubleshootingTips.includes(tip)) {
            troubleshootingTips.push(tip)
          }
        }
      }
      if (inst.device) {
        if (!deviceTypes.includes(inst.device.friendlyName)) {
          deviceTypes.push(inst.device.friendlyName)
        }
      }
    }

    // Get I/O mappings for this rung
    const ioAddresses = parseIoAddresses(rung.rawText)
    const ioMappings: IoMapping[] = []

    if (ioAddresses.length > 0) {
      // Get unique module paths to look up
      const moduleNames = [...new Set(ioAddresses.map(io => io.modulePath))]

      // Fetch modules from database
      const modules = await prisma.module.findMany({
        where: {
          projectId: rung.routine.program.projectId,
          OR: [
            // Match by name
            { name: { in: moduleNames } },
            // Match by slot for "Local" references
            { slot: { in: ioAddresses.filter(io => io.modulePath === 'Local').map(io => io.slot) } }
          ]
        }
      })

      // Build module lookup
      const moduleBySlot = new Map<number, typeof modules[0]>()
      const moduleByName = new Map<string, typeof modules[0]>()
      for (const mod of modules) {
        if (mod.slot !== null) moduleBySlot.set(mod.slot, mod)
        moduleByName.set(mod.name, mod)
      }

      // Build I/O mappings
      for (const io of ioAddresses) {
        let module: typeof modules[0] | undefined

        if (io.modulePath === 'Local') {
          // Local I/O - look up by slot
          module = moduleBySlot.get(io.slot)
        } else {
          // Named module - look up by name
          module = moduleByName.get(io.modulePath)
        }

        ioMappings.push({
          tag: io.tag,
          type: io.type,
          modulePath: io.modulePath,
          slot: io.slot,
          point: io.point,
          fullAddress: io.tag,
          module: module ? {
            name: module.name,
            catalogNumber: module.catalogNumber,
            productType: module.productType
          } : undefined
        })
      }
    }

    // Get cross-references for tags in this rung
    const tagNames = extractTagNames(rung.rawText)
    const crossRefs: Array<{
      tag: string
      usedIn: Array<{ routine: string; rungNumber: number; usage: 'read' | 'write' }>
    }> = []

    if (tagNames.length > 0) {
      // Find other rungs that use these tags
      const otherRungs = await prisma.rung.findMany({
        where: {
          routine: {
            program: {
              projectId: rung.routine.program.projectId
            }
          },
          id: { not: rungId },
          OR: tagNames.map(tag => ({
            rawText: { contains: tag }
          }))
        },
        select: {
          number: true,
          rawText: true,
          routine: {
            select: {
              name: true,
              program: { select: { name: true } }
            }
          }
        },
        take: 50 // Limit for performance
      })

      // Build cross-reference map
      for (const tag of tagNames.slice(0, 10)) { // Limit to first 10 tags
        const refs: Array<{ routine: string; rungNumber: number; usage: 'read' | 'write' }> = []

        for (const otherRung of otherRungs) {
          if (otherRung.rawText.includes(tag)) {
            // Determine if it's a read or write
            const isWrite = isTagWrittenIn(tag, otherRung.rawText)
            refs.push({
              routine: `${otherRung.routine.program.name}/${otherRung.routine.name}`,
              rungNumber: otherRung.number,
              usage: isWrite ? 'write' : 'read'
            })
          }
        }

        if (refs.length > 0) {
          crossRefs.push({ tag, usedIn: refs.slice(0, 5) }) // Limit refs per tag
        }
      }
    }

    // Generate condition breakdown for fault finding
    const conditions = generateConditionBreakdown(rung.rawText)

    return NextResponse.json({
      explanation,
      source,
      mode: explanationMode,
      unknownInstructions: stillUnknown.length > 0 ? stillUnknown : undefined,
      learnedInstructions: Object.keys(learnedExplanations).length > 0 ? Object.keys(learnedExplanations) : undefined,
      routineContext: routineAnalysis,
      troubleshooting: troubleshootingTips.length > 0 ? troubleshootingTips : undefined,
      deviceTypes: deviceTypes.length > 0 ? deviceTypes : undefined,
      crossRefs: crossRefs.length > 0 ? crossRefs : undefined,
      ioMappings: ioMappings.length > 0 ? ioMappings : undefined,
      conditions: conditions.length > 0 ? conditions : undefined
    })

  } catch (error) {
    console.error('Error explaining rung:', error)
    return NextResponse.json(
      { error: 'Failed to generate explanation', details: String(error) },
      { status: 500 }
    )
  }
}

// Helper function to learn a specific instruction from AI
async function learnInstruction(instruction: string, mode: ExplanationMode): Promise<string | null> {
  try {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const modePrompts = {
      friendly: 'Explain using simple real-world analogies, like explaining to someone new to automation.',
      technical: 'Explain using professional engineering terminology.',
      operator: 'Explain for a machine operator or maintenance technician, focusing on practical operation.'
    }

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022',
      max_tokens: 256,
      system: `You are a PLC programming expert. Create a template explanation for a ladder logic instruction.
Use placeholders {0}, {1}, {2} etc. for operands.
${modePrompts[mode]}
Be concise - one sentence only.`,
      messages: [{
        role: 'user',
        content: `Create a template explanation for the PLC instruction: ${instruction}

Example format for XIC instruction: "Check if {0} is ON"
Example format for MOV instruction: "Copy value from {0} to {1}"

Now create one for: ${instruction}`
      }]
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    // Clean up the response - remove quotes if present
    return text.replace(/^["']|["']$/g, '').trim()
  } catch (error) {
    console.error(`Failed to learn instruction ${instruction}:`, error)
    return null
  }
}

// GET - Get explanation modes and stats
export async function GET() {
  // Get stats about learned instructions
  const learnedCount = await prisma.learnedInstruction.count()
  const cachedRungsCount = await prisma.rungExplanationCache.count()
  const builtInCount = Object.keys(INSTRUCTIONS).length

  const stats = {
    modes: ['friendly', 'technical', 'operator'],
    modeDescriptions: {
      friendly: 'Real-world analogies for operators and beginners',
      technical: 'Professional engineering terminology',
      operator: 'Operational language for technicians'
    },
    libraryStats: {
      builtInInstructions: builtInCount,
      learnedInstructions: learnedCount,
      totalInstructions: builtInCount + learnedCount,
      cachedRungs: cachedRungsCount
    }
  }

  return NextResponse.json(stats)
}

// Helper to extract tag names from rung text
function extractTagNames(rungText: string): string[] {
  const tags: string[] = []
  // Match tag patterns: word characters, dots, brackets, but not instruction names
  const regex = /([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z0-9_]+)*(?:\[[^\]]+\])?)/g
  const instructionPattern = /^(XIC|XIO|OTE|OTL|OTU|TON|TOF|CTU|CTD|MOV|COP|JSR|RET|ADD|SUB|MUL|DIV|EQU|NEQ|GRT|LES|GEQ|LEQ|ONS|RES|JMP|LBL|NOP|AFI|MCR|END)$/i

  let match
  while ((match = regex.exec(rungText)) !== null) {
    const tag = match[1]
    // Skip if it looks like an instruction name
    if (!instructionPattern.test(tag) && !tags.includes(tag) && tag.length > 1) {
      tags.push(tag)
    }
  }

  return tags
}

// Helper to determine if a tag is written (output) vs read (input) in rung text
function isTagWrittenIn(tag: string, rungText: string): boolean {
  // Output instructions that write to their operand
  const writePatterns = [
    new RegExp(`OTE\\s*\\(\\s*${escapeRegex(tag)}`, 'i'),
    new RegExp(`OTL\\s*\\(\\s*${escapeRegex(tag)}`, 'i'),
    new RegExp(`OTU\\s*\\(\\s*${escapeRegex(tag)}`, 'i'),
    new RegExp(`MOV\\s*\\([^,]+,\\s*${escapeRegex(tag)}`, 'i'),
    new RegExp(`COP\\s*\\([^,]+,\\s*${escapeRegex(tag)}`, 'i'),
    new RegExp(`ADD\\s*\\([^,]+,[^,]+,\\s*${escapeRegex(tag)}`, 'i'),
    new RegExp(`SUB\\s*\\([^,]+,[^,]+,\\s*${escapeRegex(tag)}`, 'i'),
    new RegExp(`MUL\\s*\\([^,]+,[^,]+,\\s*${escapeRegex(tag)}`, 'i'),
    new RegExp(`DIV\\s*\\([^,]+,[^,]+,\\s*${escapeRegex(tag)}`, 'i'),
  ]

  for (const pattern of writePatterns) {
    if (pattern.test(rungText)) {
      return true
    }
  }

  return false
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

// Generate condition breakdown for fault finding
interface Condition {
  tag: string
  instruction: string
  requirement: string
  type: 'input' | 'output' | 'compare'
}

function generateConditionBreakdown(rungText: string): Condition[] {
  const conditions: Condition[] = []

  // XIC - Examine If Closed (needs to be ON/true)
  const xicPattern = /XIC\s*\(\s*([^)]+)\s*\)/gi
  let match
  while ((match = xicPattern.exec(rungText)) !== null) {
    conditions.push({
      tag: match[1].trim(),
      instruction: 'XIC',
      requirement: 'Must be ON (true)',
      type: 'input'
    })
  }

  // XIO - Examine If Open (needs to be OFF/false)
  const xioPattern = /XIO\s*\(\s*([^)]+)\s*\)/gi
  while ((match = xioPattern.exec(rungText)) !== null) {
    conditions.push({
      tag: match[1].trim(),
      instruction: 'XIO',
      requirement: 'Must be OFF (false)',
      type: 'input'
    })
  }

  // Comparison instructions
  const compPatterns = [
    { pattern: /EQU\s*\(\s*([^,]+),\s*([^)]+)\s*\)/gi, name: 'EQU', req: (a: string, b: string) => `${a} must EQUAL ${b}` },
    { pattern: /NEQ\s*\(\s*([^,]+),\s*([^)]+)\s*\)/gi, name: 'NEQ', req: (a: string, b: string) => `${a} must NOT EQUAL ${b}` },
    { pattern: /LES\s*\(\s*([^,]+),\s*([^)]+)\s*\)/gi, name: 'LES', req: (a: string, b: string) => `${a} must be LESS THAN ${b}` },
    { pattern: /LEQ\s*\(\s*([^,]+),\s*([^)]+)\s*\)/gi, name: 'LEQ', req: (a: string, b: string) => `${a} must be LESS OR EQUAL to ${b}` },
    { pattern: /GRT\s*\(\s*([^,]+),\s*([^)]+)\s*\)/gi, name: 'GRT', req: (a: string, b: string) => `${a} must be GREATER THAN ${b}` },
    { pattern: /GEQ\s*\(\s*([^,]+),\s*([^)]+)\s*\)/gi, name: 'GEQ', req: (a: string, b: string) => `${a} must be GREATER OR EQUAL to ${b}` }
  ]

  for (const comp of compPatterns) {
    while ((match = comp.pattern.exec(rungText)) !== null) {
      conditions.push({
        tag: `${match[1].trim()} vs ${match[2].trim()}`,
        instruction: comp.name,
        requirement: comp.req(match[1].trim(), match[2].trim()),
        type: 'compare'
      })
    }
  }

  // Timer done bits often examined
  const timerDonePattern = /XIC\s*\(\s*([^)]+\.DN)\s*\)/gi
  // Already captured by XIC, but we can add context
  // Similarly for counter done, etc.

  return conditions
}

// Parse I/O addresses from tag names and return structured info
interface IoMapping {
  tag: string
  type: 'input' | 'output'
  modulePath: string  // e.g., "Local:1" or "Remote_Rack:2"
  slot: number
  point?: number
  fullAddress: string
  module?: {
    name: string
    catalogNumber: string | null
    productType: string | null
  }
}

function parseIoAddresses(rungText: string): { modulePath: string; slot: number; type: 'input' | 'output'; tag: string; point?: number }[] {
  const ioTags: { modulePath: string; slot: number; type: 'input' | 'output'; tag: string; point?: number }[] = []

  // Pattern for Allen-Bradley I/O addressing:
  // Local:1:I.Data.0 - Local I/O
  // ModuleName:1:I.Data[0] - Named module
  // _IO_EM_DI_01:I.0 - Point I/O style
  const ioPatterns = [
    // Local:Slot:I/O.Data.Bit or Local:Slot:I/O.Data[Index]
    /\b(Local):(\d+):(I|O)\.(?:Data\.?)?(\d+|\[\d+\])?/gi,
    // ModuleName:Slot:I/O.Data.Bit
    /\b([A-Za-z_][A-Za-z0-9_]*):(\d+):(I|O)\.(?:Data\.?)?(\d+|\[\d+\])?/gi,
    // Point I/O style: _IO_xxxx:I.Bit or :O.Bit
    /\b([A-Za-z_][A-Za-z0-9_]*):([IO])\.(\d+)/gi
  ]

  let match

  // Pattern 1 & 2: Standard I/O addressing
  const standardPattern = /\b([A-Za-z_][A-Za-z0-9_]*):(\d+):(I|O)\.(?:Data\.?)?(\d+|\[\d+\])?/gi
  while ((match = standardPattern.exec(rungText)) !== null) {
    const modulePath = match[1]
    const slot = parseInt(match[2], 10)
    const ioType = match[3].toUpperCase() === 'I' ? 'input' : 'output'
    let point: number | undefined
    if (match[4]) {
      const pointStr = match[4].replace(/[\[\]]/g, '')
      point = parseInt(pointStr, 10)
    }

    ioTags.push({
      modulePath,
      slot,
      type: ioType,
      tag: match[0],
      point
    })
  }

  // Pattern 3: Point I/O style (no slot number)
  const pointIoPattern = /\b([A-Za-z_][A-Za-z0-9_]*):([IO])\.(\d+)/gi
  while ((match = pointIoPattern.exec(rungText)) !== null) {
    // Skip if already captured by standard pattern
    const fullMatch = match[0]
    if (ioTags.some(t => t.tag === fullMatch)) continue

    ioTags.push({
      modulePath: match[1],
      slot: 0, // Point I/O doesn't have traditional slots
      type: match[2].toUpperCase() === 'I' ? 'input' : 'output',
      tag: fullMatch,
      point: parseInt(match[3], 10)
    })
  }

  return ioTags
}
