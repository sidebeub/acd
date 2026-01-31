import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { deleteFile } from '@/lib/s3'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Get project details with all data
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
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
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }
}

// DELETE - Delete a project
export async function DELETE(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Verify ownership and get file info before deleting
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
      include: { fileUploads: true }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Delete S3 files first (if any)
    for (const upload of project.fileUploads) {
      try {
        await deleteFile(upload.s3Key)
        console.log(`[S3] Deleted file: ${upload.s3Key}`)
      } catch (s3Error) {
        console.error(`[S3] Failed to delete file ${upload.s3Key}:`, s3Error)
        // Continue with database deletion even if S3 fails
      }
    }

    // Delete from database (cascades to FileUpload records)
    await prisma.project.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: 'Project not found' }, { status: 404 })
  }
}
