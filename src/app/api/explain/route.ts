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
  ExplanationMode
} from '@/lib/instruction-library'

// Helper to create a hash of rung text
function hashRung(text: string): string {
  return createHash('sha256').update(text.trim().toLowerCase()).digest('hex').substring(0, 32)
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

    // Get the rung with its context
    const rung = await prisma.rung.findUnique({
      where: { id: rungId },
      include: {
        routine: {
          include: {
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

      return NextResponse.json({
        explanation: cachedRung[modeField],
        source: cachedRung.source,
        mode: explanationMode,
        cached: true
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

        // Get AI explanation
        explanation = await explainRungWithAI(rung.rawText, tags, explanationMode)
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

    return NextResponse.json({
      explanation,
      source,
      mode: explanationMode,
      unknownInstructions: stillUnknown.length > 0 ? stillUnknown : undefined,
      learnedInstructions: Object.keys(learnedExplanations).length > 0 ? Object.keys(learnedExplanations) : undefined
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
