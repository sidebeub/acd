import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - List learned instructions
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const verified = searchParams.get('verified')
  const sortBy = searchParams.get('sort') || 'usageCount'

  const where = verified !== null ? { verified: verified === 'true' } : {}

  const orderBy = sortBy === 'recent'
    ? { createdAt: 'desc' as const }
    : sortBy === 'alpha'
    ? { instruction: 'asc' as const }
    : { usageCount: 'desc' as const }

  const learned = await prisma.learnedInstruction.findMany({
    where,
    orderBy
  })

  // Get stats
  const stats = {
    total: learned.length,
    verified: learned.filter(l => l.verified).length,
    unverified: learned.filter(l => !l.verified).length,
    fromAI: learned.filter(l => l.source === 'ai').length,
    manual: learned.filter(l => l.source === 'manual').length
  }

  return NextResponse.json({
    stats,
    instructions: learned.map(l => ({
      id: l.id,
      instruction: l.instruction,
      category: l.category,
      friendly: l.friendlyExpl,
      technical: l.technicalExpl,
      operator: l.operatorExpl,
      source: l.source,
      usageCount: l.usageCount,
      verified: l.verified,
      createdAt: l.createdAt,
      updatedAt: l.updatedAt
    }))
  })
}

// POST - Add or update a learned instruction manually
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { instruction, category, friendly, technical, operator, verified } = body

    if (!instruction) {
      return NextResponse.json({ error: 'instruction is required' }, { status: 400 })
    }

    const data = {
      instruction: instruction.toUpperCase(),
      category: category || null,
      friendlyExpl: friendly || null,
      technicalExpl: technical || null,
      operatorExpl: operator || null,
      source: 'manual',
      verified: verified ?? true // Manual entries are considered verified
    }

    const result = await prisma.learnedInstruction.upsert({
      where: { instruction: instruction.toUpperCase() },
      create: {
        ...data,
        usageCount: 0
      },
      update: {
        ...data,
        updatedAt: new Date()
      }
    })

    return NextResponse.json({
      success: true,
      instruction: result
    })
  } catch (error) {
    console.error('Error saving learned instruction:', error)
    return NextResponse.json(
      { error: 'Failed to save instruction' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a learned instruction
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const instruction = searchParams.get('instruction')
    const id = searchParams.get('id')

    if (!instruction && !id) {
      return NextResponse.json(
        { error: 'instruction or id is required' },
        { status: 400 }
      )
    }

    if (id) {
      await prisma.learnedInstruction.delete({ where: { id } })
    } else if (instruction) {
      await prisma.learnedInstruction.delete({
        where: { instruction: instruction.toUpperCase() }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting learned instruction:', error)
    return NextResponse.json(
      { error: 'Failed to delete instruction' },
      { status: 500 }
    )
  }
}

// PATCH - Verify or update specific fields
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, instruction, verified, category, friendly, technical, operator } = body

    if (!id && !instruction) {
      return NextResponse.json(
        { error: 'id or instruction is required' },
        { status: 400 }
      )
    }

    const where = id ? { id } : { instruction: instruction.toUpperCase() }

    const updateData: Record<string, unknown> = {}
    if (verified !== undefined) updateData.verified = verified
    if (category !== undefined) updateData.category = category
    if (friendly !== undefined) updateData.friendlyExpl = friendly
    if (technical !== undefined) updateData.technicalExpl = technical
    if (operator !== undefined) updateData.operatorExpl = operator

    const result = await prisma.learnedInstruction.update({
      where,
      data: updateData
    })

    return NextResponse.json({
      success: true,
      instruction: result
    })
  } catch (error) {
    console.error('Error updating learned instruction:', error)
    return NextResponse.json(
      { error: 'Failed to update instruction' },
      { status: 500 }
    )
  }
}
