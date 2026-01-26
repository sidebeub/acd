import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface ProducedTag {
  name: string
  dataType: string
  description?: string
  rpi?: number // Requested Packet Interval
  consumers?: string[]
}

interface ConsumedTag {
  name: string
  dataType: string
  description?: string
  producer?: string
  rpi?: number
  producerPath?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Get all tags for the project
    const tags = await prisma.tag.findMany({
      where: { projectId: id },
      select: {
        name: true,
        dataType: true,
        description: true,
        value: true,
        scope: true
      }
    })

    // Analyze tags for produced/consumed patterns
    // In Rockwell, produced tags often have specific naming or are part of MODULE connections
    const produced: ProducedTag[] = []
    const consumed: ConsumedTag[] = []

    for (const tag of tags) {
      const nameLower = tag.name.toLowerCase()
      const descLower = (tag.description || '').toLowerCase()

      // Check for produced tag patterns
      if (
        nameLower.includes('produce') ||
        nameLower.includes('_out') ||
        descLower.includes('produced') ||
        descLower.includes('producing') ||
        tag.dataType.includes('PRODUCED') ||
        // Check for common output/broadcast patterns
        nameLower.endsWith('_tx') ||
        nameLower.includes('broadcast')
      ) {
        produced.push({
          name: tag.name,
          dataType: tag.dataType,
          description: tag.description || undefined
        })
      }

      // Check for consumed tag patterns
      if (
        nameLower.includes('consume') ||
        nameLower.includes('_in') ||
        descLower.includes('consumed') ||
        descLower.includes('consuming') ||
        tag.dataType.includes('CONSUMED') ||
        nameLower.endsWith('_rx') ||
        nameLower.includes('received')
      ) {
        // Try to extract producer info from description
        let producer: string | undefined
        let producerPath: string | undefined

        if (tag.description) {
          // Look for producer reference in description
          const producerMatch = tag.description.match(/from\s+([A-Za-z0-9_]+)/i)
          if (producerMatch) {
            producer = producerMatch[1]
          }
          // Look for path reference
          const pathMatch = tag.description.match(/path:\s*([^\s,]+)/i)
          if (pathMatch) {
            producerPath = pathMatch[1]
          }
        }

        consumed.push({
          name: tag.name,
          dataType: tag.dataType,
          description: tag.description || undefined,
          producer,
          producerPath
        })
      }
    }

    // Also check modules for produced/consumed connections
    const modules = await prisma.module.findMany({
      where: { projectId: id },
      select: {
        name: true,
        catalogNumber: true
      }
    })

    // Look for Ethernet/IP connections that might indicate P/C tags
    const connections: Array<{
      moduleName: string
      type: 'produced' | 'consumed'
      catalogNumber?: string
    }> = []

    for (const mod of modules) {
      // Check for common connection module patterns (Ethernet modules)
      if (mod.catalogNumber?.includes('EN')) {
        connections.push({
          moduleName: mod.name,
          type: 'produced',
          catalogNumber: mod.catalogNumber || undefined
        })
      }
    }

    return NextResponse.json({
      produced,
      consumed,
      connections,
      summary: {
        producedCount: produced.length,
        consumedCount: consumed.length,
        connectionCount: connections.length
      }
    })
  } catch (error) {
    console.error('Error fetching produced/consumed tags:', error)
    return NextResponse.json({ error: 'Failed to fetch produced/consumed tags' }, { status: 500 })
  }
}
