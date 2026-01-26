import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeProject } from '@/lib/project-analysis'

// GET - Check analysis status
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  const analysis = await prisma.projectAnalysis.findUnique({
    where: { projectId },
    select: {
      status: true,
      tokensUsed: true,
      createdAt: true,
      updatedAt: true
    }
  })

  // Also get routine analysis stats
  const routineStats = await prisma.routineAnalysis.groupBy({
    by: ['status'],
    where: {
      routine: {
        program: {
          projectId
        }
      }
    },
    _count: true
  })

  return NextResponse.json({
    project: analysis || { status: 'not_started' },
    routines: routineStats.reduce((acc, r) => {
      acc[r.status] = r._count
      return acc
    }, {} as Record<string, number>)
  })
}

// POST - Trigger analysis
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: projectId } = await params

  // Check if project exists
  const project = await prisma.project.findUnique({
    where: { id: projectId }
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  // Check if already analyzing
  const existing = await prisma.projectAnalysis.findUnique({
    where: { projectId }
  })

  if (existing?.status === 'analyzing') {
    return NextResponse.json({
      message: 'Analysis already in progress',
      status: 'analyzing'
    })
  }

  // Start analysis in background
  // Note: In production, you'd want to use a job queue
  analyzeProject(projectId).catch(err => {
    console.error('Background analysis failed:', err)
  })

  return NextResponse.json({
    message: 'Analysis started',
    status: 'analyzing'
  })
}
