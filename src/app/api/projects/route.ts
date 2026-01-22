import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Parser API URL - set in environment
const PARSER_API_URL = process.env.PARSER_API_URL || 'http://localhost:8000'

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

    // Validate file type
    if (!fileName.endsWith('.l5x') && !fileName.endsWith('.acd')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an .L5X or .ACD file.' },
        { status: 400 }
      )
    }

    // Send file to Parser API
    const parserFormData = new FormData()
    parserFormData.append('file', file)

    console.log(`Sending ${file.name} to parser API at ${PARSER_API_URL}`)

    const parserResponse = await fetch(`${PARSER_API_URL}/parse`, {
      method: 'POST',
      body: parserFormData
    })

    if (!parserResponse.ok) {
      const errorText = await parserResponse.text()
      console.error('Parser API error:', errorText)
      throw new Error(`Parser API returned ${parserResponse.status}: ${errorText}`)
    }

    const parseResult = await parserResponse.json()

    if (!parseResult.success) {
      throw new Error(parseResult.error || 'Failed to parse file')
    }

    const project = parseResult.project

    // Store in database
    // TODO: Add userId from session
    const dbProject = await prisma.project.create({
      data: {
        userId: 'demo-user', // Replace with actual auth
        name: project.controller?.name || project.file_name || 'Unknown Project',
        fileName: file.name,
        processorType: project.controller?.processor_type || null,
        softwareVersion: project.controller?.software_version || null,
        tags: {
          create: (project.tags || []).map((tag: {
            name: string
            data_type: string
            scope: string
            scope_name?: string
            description?: string
            value?: string
            external_access?: string
            dimensions?: number[]
            alias_for?: string
          }) => ({
            name: tag.name,
            dataType: tag.data_type,
            scope: tag.scope === 'program' ? (tag.scope_name || 'program') : 'controller',
            description: tag.description || null,
            value: tag.value || null,
            externalAccess: tag.external_access || null,
            dimensions: tag.dimensions ? JSON.stringify(tag.dimensions) : null,
            aliasFor: tag.alias_for || null
          }))
        },
        programs: {
          create: (project.programs || []).map((prog: {
            name: string
            description?: string
            main_routine?: string
            disabled?: boolean
            tags?: Array<{
              name: string
              data_type: string
              description?: string
              value?: string
            }>
            routines?: Array<{
              name: string
              type?: string
              description?: string
              rungs?: Array<{
                number: number
                comment?: string
                raw_text: string
                instructions?: Array<{
                  type: string
                  operands?: string[]
                }>
              }>
            }>
          }) => ({
            name: prog.name,
            description: prog.description || null,
            mainRoutineName: prog.main_routine || null,
            disabled: prog.disabled || false,
            localTags: {
              create: (prog.tags || []).map((tag: {
                name: string
                data_type: string
                description?: string
                value?: string
              }) => ({
                name: tag.name,
                dataType: tag.data_type,
                description: tag.description || null,
                value: tag.value || null
              }))
            },
            routines: {
              create: (prog.routines || []).map((routine: {
                name: string
                type?: string
                description?: string
                rungs?: Array<{
                  number: number
                  comment?: string
                  raw_text: string
                  instructions?: Array<{
                    type: string
                    operands?: string[]
                  }>
                }>
              }) => ({
                name: routine.name,
                type: routine.type || 'Ladder',
                description: routine.description || null,
                rungs: {
                  create: (routine.rungs || []).map((rung: {
                    number: number
                    comment?: string
                    raw_text: string
                    instructions?: Array<{
                      type: string
                      operands?: string[]
                    }>
                  }) => ({
                    number: rung.number,
                    comment: rung.comment || null,
                    rawText: rung.raw_text || '',
                    instructions: JSON.stringify(rung.instructions || [])
                  }))
                }
              }))
            }
          }))
        },
        tasks: {
          create: (project.tasks || []).map((task: {
            name: string
            type?: string
            rate_ms?: number
            priority?: number
            watchdog_ms?: number
            inhibited?: boolean
            programs?: string[]
          }) => ({
            name: task.name,
            type: task.type || 'Periodic',
            rate: task.rate_ms || null,
            priority: task.priority || null,
            watchdog: task.watchdog_ms || null,
            inhibitTask: task.inhibited || false,
            scheduledPrograms: JSON.stringify(task.programs || [])
          }))
        },
        modules: {
          create: (project.modules || []).map((mod: {
            name: string
            catalog_number?: string
            vendor?: string
            slot?: number
            parent_module?: string
          }) => ({
            name: mod.name,
            catalogNumber: mod.catalog_number || null,
            vendor: mod.vendor || null,
            slot: mod.slot || null,
            parentModule: mod.parent_module || null
          }))
        },
        dataTypes: {
          create: (project.data_types || []).map((dt: {
            name: string
            family?: string
            description?: string
            members?: Array<{
              name: string
              data_type: string
              dimension?: number
            }>
          }) => ({
            name: dt.name,
            family: dt.family || null,
            description: dt.description || null,
            members: JSON.stringify(dt.members || [])
          }))
        }
      }
    })

    // Log any warnings from parsing
    if (parseResult.warnings?.length > 0) {
      console.log('Parse warnings:', parseResult.warnings)
    }

    return NextResponse.json({
      id: dbProject.id,
      name: dbProject.name,
      tagCount: project.tags?.length || 0,
      programCount: project.programs?.length || 0,
      warnings: parseResult.warnings || []
    }, { status: 201 })

  } catch (error) {
    console.error('Error processing file:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Failed to process file: ${errorMessage}` },
      { status: 500 }
    )
  }
}
