import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Get project details with all data
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      tags: true,
      programs: {
        include: {
          routines: {
            include: {
              rungs: true,
              analysis: true
            }
          },
          localTags: true
        }
      },
      tasks: true,
      modules: true,
      dataTypes: true,
      analysis: true
    }
  })

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }

  return NextResponse.json(project)
}

// DELETE - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  const { id } = await params

  try {
    await prisma.project.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
}
