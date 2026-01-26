import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const aois = await prisma.addOnInstruction.findMany({
      where: { projectId: id },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      aois: aois.map(aoi => ({
        name: aoi.name,
        description: aoi.description,
        parameters: aoi.parameters,
        localTags: aoi.localTags,
        logic: aoi.logic
      }))
    })
  } catch (error) {
    console.error('Error fetching AOIs:', error)
    return NextResponse.json({ error: 'Failed to fetch AOIs' }, { status: 500 })
  }
}
