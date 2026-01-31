import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { getDownloadUrl } from '@/lib/s3'

interface RouteParams {
  params: Promise<{ id: string }>
}

// GET - Get presigned download URL for project file
export async function GET(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    // Get project with file upload info
    const project = await prisma.project.findFirst({
      where: { id, userId: user.id },
      include: { fileUploads: true }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get the first file upload (should only be one per project)
    const fileUpload = project.fileUploads[0]

    if (!fileUpload) {
      return NextResponse.json(
        { error: 'No file available for download. This project may have been uploaded before file storage was enabled.' },
        { status: 404 }
      )
    }

    // Generate presigned URL (valid for 1 hour)
    const downloadUrl = await getDownloadUrl(fileUpload.s3Key, 3600)

    return NextResponse.json({
      url: downloadUrl,
      fileName: fileUpload.fileName,
      fileSize: fileUpload.fileSize,
      fileType: fileUpload.fileType
    })
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Download URL error:', error)
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 })
  }
}
