import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface SearchResult {
  type: 'tag' | 'routine' | 'rung' | 'aoi' | 'udt' | 'module'
  name: string
  description?: string
  location?: string
  match: string
  context?: string
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const query = request.nextUrl.searchParams.get('q')?.toLowerCase() || ''
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50')

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [], query })
  }

  try {
    const results: SearchResult[] = []

    // Search tags
    const tags = await prisma.tag.findMany({
      where: {
        projectId: id,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit
    })

    for (const tag of tags) {
      results.push({
        type: 'tag',
        name: tag.name,
        description: tag.description || undefined,
        match: tag.name.toLowerCase().includes(query) ? tag.name : (tag.description || ''),
        context: `${tag.dataType} - ${tag.scope}`
      })
    }

    // Search routines
    const routines = await prisma.routine.findMany({
      where: {
        program: { projectId: id },
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        program: { select: { name: true } }
      },
      take: limit
    })

    for (const routine of routines) {
      results.push({
        type: 'routine',
        name: routine.name,
        description: routine.description || undefined,
        location: routine.program.name,
        match: routine.name.toLowerCase().includes(query) ? routine.name : (routine.description || ''),
        context: routine.type
      })
    }

    // Search rungs (by comment or raw text)
    const rungs = await prisma.rung.findMany({
      where: {
        routine: { program: { projectId: id } },
        OR: [
          { comment: { contains: query, mode: 'insensitive' } },
          { rawText: { contains: query, mode: 'insensitive' } }
        ]
      },
      include: {
        routine: {
          select: {
            name: true,
            program: { select: { name: true } }
          }
        }
      },
      take: limit
    })

    for (const rung of rungs) {
      results.push({
        type: 'rung',
        name: `Rung ${rung.number}`,
        description: rung.comment || undefined,
        location: `${rung.routine.program.name}/${rung.routine.name}`,
        match: rung.comment?.toLowerCase().includes(query)
          ? rung.comment
          : rung.rawText.substring(0, 100) + (rung.rawText.length > 100 ? '...' : ''),
        context: rung.rawText.substring(0, 60) + '...'
      })
    }

    // Search AOIs
    const aois = await prisma.addOnInstruction.findMany({
      where: {
        projectId: id,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit
    })

    for (const aoi of aois) {
      results.push({
        type: 'aoi',
        name: aoi.name,
        description: aoi.description || undefined,
        match: aoi.name.toLowerCase().includes(query) ? aoi.name : (aoi.description || '')
      })
    }

    // Search UDTs (DataTypes)
    const udts = await prisma.dataType.findMany({
      where: {
        projectId: id,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit
    })

    for (const udt of udts) {
      results.push({
        type: 'udt',
        name: udt.name,
        description: udt.description || undefined,
        match: udt.name.toLowerCase().includes(query) ? udt.name : (udt.description || '')
      })
    }

    // Search Modules
    const modules = await prisma.module.findMany({
      where: {
        projectId: id,
        OR: [
          { name: { contains: query, mode: 'insensitive' } },
          { catalogNumber: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit
    })

    for (const mod of modules) {
      results.push({
        type: 'module',
        name: mod.name,
        description: mod.catalogNumber || undefined,
        match: mod.name.toLowerCase().includes(query) ? mod.name : (mod.catalogNumber || ''),
        context: mod.slot !== null ? `Slot ${mod.slot}` : undefined
      })
    }

    // Sort results: exact name matches first, then partial matches
    results.sort((a, b) => {
      const aExact = a.name.toLowerCase() === query
      const bExact = b.name.toLowerCase() === query
      if (aExact && !bExact) return -1
      if (!aExact && bExact) return 1
      const aStarts = a.name.toLowerCase().startsWith(query)
      const bStarts = b.name.toLowerCase().startsWith(query)
      if (aStarts && !bStarts) return -1
      if (!aStarts && bStarts) return 1
      return 0
    })

    return NextResponse.json({
      results: results.slice(0, limit),
      query,
      total: results.length
    })
  } catch (error) {
    console.error('Error searching project:', error)
    return NextResponse.json({ error: 'Failed to search project' }, { status: 500 })
  }
}
