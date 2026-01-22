import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { explainRung } from '@/lib/claude'

// POST - Get explanation for a rung
export async function POST(request: NextRequest) {
  try {
    const { rungId } = await request.json()

    if (!rungId) {
      return NextResponse.json({ error: 'rungId is required' }, { status: 400 })
    }

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

    // Check if we already have an explanation cached
    if (rung.explanation) {
      return NextResponse.json({ explanation: rung.explanation })
    }

    // Build tag context from controller and local tags
    const tags: Record<string, { dataType: string; description?: string }> = {}

    // Add controller-scoped tags
    for (const tag of rung.routine.program.project.tags) {
      tags[tag.name] = {
        dataType: tag.dataType,
        description: tag.description || undefined
      }
    }

    // Add program-scoped local tags
    for (const tag of rung.routine.program.localTags) {
      tags[tag.name] = {
        dataType: tag.dataType,
        description: tag.description || undefined
      }
    }

    // Get explanation from Claude
    const explanation = await explainRung(rung.rawText, tags)

    // Cache the explanation
    await prisma.rung.update({
      where: { id: rungId },
      data: { explanation }
    })

    return NextResponse.json({ explanation })

  } catch (error) {
    console.error('Error explaining rung:', error)
    return NextResponse.json(
      { error: 'Failed to generate explanation', details: String(error) },
      { status: 500 }
    )
  }
}
