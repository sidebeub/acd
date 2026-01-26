import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/projects/[id]/chat/[sessionId] - Get session with messages
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: projectId, sessionId } = await params

    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!session || session.projectId !== projectId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    return NextResponse.json({
      id: session.id,
      title: session.title,
      messages: session.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        metadata: m.metadata,
        createdAt: m.createdAt
      })),
      createdAt: session.createdAt,
      updatedAt: session.updatedAt
    })
  } catch (error) {
    console.error('Failed to get chat session:', error)
    return NextResponse.json({ error: 'Failed to get session' }, { status: 500 })
  }
}

// DELETE /api/projects/[id]/chat/[sessionId] - Delete session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: projectId, sessionId } = await params

    // Verify session belongs to project
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    })

    if (!session || session.projectId !== projectId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Delete session (messages cascade delete)
    await prisma.chatSession.delete({
      where: { id: sessionId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete chat session:', error)
    return NextResponse.json({ error: 'Failed to delete session' }, { status: 500 })
  }
}

// PATCH /api/projects/[id]/chat/[sessionId] - Update session (e.g., rename)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sessionId: string }> }
) {
  try {
    const { id: projectId, sessionId } = await params
    const body = await request.json()
    const { title } = body

    // Verify session belongs to project
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId }
    })

    if (!session || session.projectId !== projectId) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 })
    }

    // Update session
    const updated = await prisma.chatSession.update({
      where: { id: sessionId },
      data: { title }
    })

    return NextResponse.json({
      id: updated.id,
      title: updated.title,
      updatedAt: updated.updatedAt
    })
  } catch (error) {
    console.error('Failed to update chat session:', error)
    return NextResponse.json({ error: 'Failed to update session' }, { status: 500 })
  }
}
