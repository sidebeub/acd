import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const tasks = await prisma.plcTask.findMany({
      where: { projectId: id },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json({
      tasks: tasks.map(task => ({
        name: task.name,
        type: task.type,
        period: task.rate,
        priority: task.priority,
        programs: task.scheduledPrograms ? JSON.parse(task.scheduledPrograms) : []
      }))
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 })
  }
}
