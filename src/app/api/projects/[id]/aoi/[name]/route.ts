import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const { id, name } = await params

  try {
    const aoi = await prisma.addOnInstruction.findFirst({
      where: {
        projectId: id,
        name: name
      }
    })

    if (!aoi) {
      return NextResponse.json({ error: 'AOI not found' }, { status: 404 })
    }

    // Parse JSON fields
    let parameters = []
    let localTags = []
    let logic = null

    try {
      if (aoi.parameters) {
        parameters = JSON.parse(aoi.parameters)
      }
    } catch (e) {
      console.warn('Failed to parse AOI parameters:', e)
    }

    try {
      if (aoi.localTags) {
        localTags = JSON.parse(aoi.localTags)
      }
    } catch (e) {
      console.warn('Failed to parse AOI localTags:', e)
    }

    try {
      if (aoi.logic) {
        logic = JSON.parse(aoi.logic)
      }
    } catch (e) {
      console.warn('Failed to parse AOI logic:', e)
    }

    return NextResponse.json({
      name: aoi.name,
      description: aoi.description,
      revision: aoi.revision,
      vendor: aoi.vendor,
      parameters,
      localTags,
      logic
    })
  } catch (error) {
    console.error('Error fetching AOI:', error)
    return NextResponse.json({ error: 'Failed to fetch AOI' }, { status: 500 })
  }
}
