import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { parseL5X, parseACD } from '@/lib/l5x-parser'

// GET - List all projects
export async function GET() {
  // TODO: Add authentication
  const projects = await prisma.project.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      name: true,
      fileName: true,
      processorType: true,
      createdAt: true,
      _count: {
        select: {
          tags: true,
          programs: true
        }
      }
    }
  })

  return NextResponse.json(projects)
}

// POST - Upload and parse a new project
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()
    let project

    if (fileName.endsWith('.l5x')) {
      // Parse L5X directly
      const content = await file.text()
      project = await parseL5X(content)
    } else if (fileName.endsWith('.acd')) {
      // Parse ACD (ZIP containing L5X)
      const buffer = await file.arrayBuffer()
      project = await parseACD(buffer)
    } else {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an .L5X or .ACD file.' },
        { status: 400 }
      )
    }

    // Store in database
    // TODO: Add userId from session
    const dbProject = await prisma.project.create({
      data: {
        userId: 'demo-user', // Replace with actual auth
        name: project.name,
        fileName: file.name,
        processorType: project.processorType,
        softwareVersion: project.softwareVersion,
        tags: {
          create: project.tags.map(tag => ({
            name: tag.name,
            dataType: tag.dataType,
            scope: tag.scope,
            description: tag.description,
            value: tag.value,
            externalAccess: tag.externalAccess,
            dimensions: tag.dimensions ? JSON.stringify(tag.dimensions) : null,
            aliasFor: tag.aliasFor
          }))
        },
        programs: {
          create: project.programs.map(prog => ({
            name: prog.name,
            description: prog.description,
            mainRoutineName: prog.mainRoutineName,
            disabled: prog.disabled,
            localTags: {
              create: prog.localTags.map(tag => ({
                name: tag.name,
                dataType: tag.dataType,
                description: tag.description,
                value: tag.value
              }))
            },
            routines: {
              create: prog.routines.map(routine => ({
                name: routine.name,
                type: routine.type,
                description: routine.description,
                rungs: {
                  create: routine.rungs.map(rung => ({
                    number: rung.number,
                    comment: rung.comment,
                    rawText: rung.rawText,
                    instructions: JSON.stringify(rung.instructions)
                  }))
                }
              }))
            }
          }))
        },
        tasks: {
          create: project.tasks.map(task => ({
            name: task.name,
            type: task.type,
            rate: task.rate,
            priority: task.priority,
            watchdog: task.watchdog,
            inhibitTask: task.inhibitTask,
            scheduledPrograms: JSON.stringify(task.scheduledPrograms)
          }))
        },
        modules: {
          create: project.modules.map(mod => ({
            name: mod.name,
            catalogNumber: mod.catalogNumber,
            vendor: mod.vendor,
            productType: mod.productType,
            revision: mod.revision,
            slot: mod.slot,
            parentModule: mod.parentModule
          }))
        },
        dataTypes: {
          create: project.dataTypes.map(dt => ({
            name: dt.name,
            family: dt.family,
            description: dt.description,
            members: JSON.stringify(dt.members)
          }))
        }
      }
    })

    return NextResponse.json({
      id: dbProject.id,
      name: dbProject.name,
      tagCount: project.tags.length,
      programCount: project.programs.length
    }, { status: 201 })

  } catch (error) {
    console.error('Error parsing file:', error)
    return NextResponse.json(
      { error: 'Failed to parse file', details: String(error) },
      { status: 500 }
    )
  }
}
