import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const udts = await prisma.dataType.findMany({
      where: { projectId: id },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      udts: udts.map(udt => ({
        name: udt.name,
        description: udt.description,
        members: udt.members
      }))
    })
  } catch (error) {
    console.error('Error fetching UDTs:', error)
    return NextResponse.json({ error: 'Failed to fetch UDTs' }, { status: 500 })
  }
}
