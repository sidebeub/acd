import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import {
  chatWithProject,
  chatWithAnalyzedProject,
  type ProjectContext,
  type AnalyzedProjectContext
} from '@/lib/claude'

// Helper to verify project ownership
async function verifyProjectOwnership(projectId: string, userId: string) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, userId }
  })
  return project !== null
}

// GET /api/projects/[id]/chat - List chat sessions for project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: projectId } = await params

    // Verify project ownership
    if (!await verifyProjectOwnership(projectId, user.id)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const sessions = await prisma.chatSession.findMany({
      where: { projectId, userId: user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: { messages: true }
        }
      }
    })

    return NextResponse.json({
      sessions: sessions.map(s => ({
        id: s.id,
        title: s.title || s.messages[0]?.content.slice(0, 50) || 'New Chat',
        messageCount: s._count.messages,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }))
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Failed to list chat sessions:', error)
    return NextResponse.json({ error: 'Failed to list sessions' }, { status: 500 })
  }
}

// POST /api/projects/[id]/chat - Create session or send message
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id: projectId } = await params
    const body = await request.json()
    const { sessionId, message, stream = false } = body

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Verify project ownership
    if (!await verifyProjectOwnership(projectId, user.id)) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if we have pre-computed analysis (cost optimized path)
    const projectAnalysis = await prisma.projectAnalysis.findUnique({
      where: { projectId },
    })

    // Determine which context to use
    let useAnalyzedContext = false
    let projectContext: ProjectContext | null = null
    let analyzedContext: AnalyzedProjectContext | null = null

    if (projectAnalysis?.status === 'complete') {
      // Use pre-analyzed context WITH full rung content
      // Analysis provides understanding, rungs provide specifics for questions
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          tags: true,
          programs: {
            include: {
              routines: {
                include: {
                  rungs: {
                    select: {
                      number: true,
                      comment: true,
                      rawText: true
                    }
                  },
                  analysis: true
                }
              }
            }
          }
        }
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      useAnalyzedContext = true
      analyzedContext = {
        name: project.name,
        processorType: project.processorType || undefined,
        overview: projectAnalysis.overview,
        architecture: projectAnalysis.architecture,
        safetyNotes: projectAnalysis.safetyNotes,
        concerns: projectAnalysis.concerns,
        patterns: projectAnalysis.patterns,
        keyTags: projectAnalysis.keyTags,
        ioSummary: projectAnalysis.ioSummary,
        routineAnalyses: project.programs.flatMap(p =>
          p.routines
            .filter(r => r.analysis?.status === 'complete')
            .map(r => ({
              programName: p.name,
              routineName: r.name,
              purpose: r.analysis!.purpose,
              sequenceFlow: r.analysis!.sequenceFlow,
              keyLogic: r.analysis!.keyLogic,
              dependencies: r.analysis!.dependencies,
              safetyNotes: r.analysis!.safetyNotes
            }))
        ),
        programs: project.programs.map(p => ({
          name: p.name,
          routines: p.routines.map(r => ({
            name: r.name,
            type: r.type,
            rungCount: r.rungs.length,
            rungs: r.rungs.map(rung => ({
              number: rung.number,
              comment: rung.comment || undefined,
              rawText: rung.rawText
            }))
          }))
        })),
        tags: project.tags.map(t => ({
          name: t.name,
          dataType: t.dataType,
          description: t.description || undefined,
          scope: t.scope
        }))
      }
      console.log('[Chat] Using pre-analyzed context with full rung content')
    } else {
      // Fallback: use raw project data (more expensive per message)
      // Need full rung content since no analysis available
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: {
          tags: true,
          programs: {
            include: {
              routines: {
                include: {
                  rungs: {
                    select: {
                      number: true,
                      comment: true,
                      rawText: true
                    }
                  }
                }
              }
            }
          }
        }
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }

      projectContext = {
        name: project.name,
        processorType: project.processorType || undefined,
        programs: project.programs.map(p => ({
          name: p.name,
          routines: p.routines.map(r => ({
            name: r.name,
            type: r.type,
            rungCount: r.rungs.length,
            rungs: r.rungs.map(rung => ({
              number: rung.number,
              comment: rung.comment || undefined,
              rawText: rung.rawText
            }))
          }))
        })),
        tags: project.tags.map(t => ({
          name: t.name,
          dataType: t.dataType,
          description: t.description || undefined,
          scope: t.scope
        }))
      }
      console.log('[Chat] Using raw project context (analysis not available)')
    }

    // Get or create session
    let session
    if (sessionId) {
      session = await prisma.chatSession.findUnique({
        where: { id: sessionId },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' }
          }
        }
      })
      if (!session) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 })
      }
    } else {
      // Create new session with user association
      session = await prisma.chatSession.create({
        data: {
          projectId,
          userId: user.id,
          title: message.slice(0, 100)
        },
        include: {
          messages: true
        }
      })
    }

    // Save user message
    await prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: 'user',
        content: message
      }
    })

    // Build history from session messages
    const history = session.messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content
    }))

    // Get AI response using the appropriate context type
    let response: string
    if (useAnalyzedContext && analyzedContext) {
      // Cost-optimized path: use pre-analyzed context
      response = await chatWithAnalyzedProject(message, analyzedContext, history)
    } else if (projectContext) {
      // Fallback path: use raw project data
      response = await chatWithProject(message, projectContext, history)
    } else {
      return NextResponse.json({ error: 'No project context available' }, { status: 500 })
    }

    if (stream) {
      // Note: Streaming disabled for now to simplify - response already computed above
      // In production, you might want to implement proper streaming
    }

    // Regular response path
    {

      // Save assistant message
      await prisma.chatMessage.create({
        data: {
          sessionId: session.id,
          role: 'assistant',
          content: response
        }
      })

      // Update session timestamp
      await prisma.chatSession.update({
        where: { id: session.id },
        data: { updatedAt: new Date() }
      })

      return NextResponse.json({
        sessionId: session.id,
        response,
        messageCount: session.messages.length + 2
      })
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Chat error:', error)
    return NextResponse.json({ error: 'Chat failed' }, { status: 500 })
  }
}
