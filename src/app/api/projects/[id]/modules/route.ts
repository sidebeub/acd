import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const modules = await prisma.module.findMany({
      where: { projectId: id },
      orderBy: [
        { slot: 'asc' },
        { name: 'asc' }
      ]
    })

    return NextResponse.json({
      modules: modules.map(mod => ({
        name: mod.name,
        catalogNumber: mod.catalogNumber,
        vendor: mod.vendor,
        productType: mod.productType,
        slot: mod.slot,
        parentModule: mod.parentModule
      }))
    })
  } catch (error) {
    console.error('Error fetching modules:', error)
    return NextResponse.json({ error: 'Failed to fetch modules' }, { status: 500 })
  }
}
