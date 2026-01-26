import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { analyzeProject } from '@/lib/project-analysis'

// Parser API URL - set in environment
const PARSER_API_URL = process.env.PARSER_API_URL || 'http://localhost:8000'

// PostgreSQL INT4 max value (signed 32-bit)
const MAX_INT4 = 2147483647

// Sanitize integer values that might overflow PostgreSQL INT4
// Values like 4294967295 (0xFFFFFFFF) are often used as "not set" sentinels
function safeInt(value: number | undefined | null): number | null {
  if (value === undefined || value === null) return null
  if (value > MAX_INT4 || value < -MAX_INT4) return null
  return value
}

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

    // ACD files take longer to parse (binary extraction), so use a 10 minute timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10 * 60 * 1000)

    const parserResponse = await fetch(`${PARSER_API_URL}/parse`, {
      method: 'POST',
      body: parserFormData,
      signal: controller.signal
    })

    clearTimeout(timeoutId)

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

    // Debug: Log what we received from the parser
    console.log('[DEBUG] Programs received:', project.programs?.length || 0)
    let totalRungs = 0
    for (const prog of project.programs || []) {
      const progRungs = (prog.routines || []).reduce((sum: number, r: { rungs?: unknown[] }) => sum + (r.rungs?.length || 0), 0)
      totalRungs += progRungs
      console.log(`[DEBUG] Program '${prog.name}': ${prog.routines?.length || 0} routines, ${progRungs} rungs`)
      for (const routine of prog.routines || []) {
        console.log(`[DEBUG]   ${prog.name}/${routine.name}: ${routine.rungs?.length || 0} rungs`)
        if (routine.rungs?.length > 0) {
          console.log(`[DEBUG]     First rung: number=${routine.rungs[0].number}, raw_text_len=${routine.rungs[0].raw_text?.length || 0}`)
        }
      }
    }
    console.log(`[DEBUG] Total rungs received: ${totalRungs}`)

    // Store in database
    // TODO: Add userId from session when auth is implemented
    const dbProject = await prisma.project.create({
      data: {
        name: project.controller?.name || project.file_name || 'Unknown Project',
        fileName: file.name,
        processorType: project.controller?.processor_type || null,
        softwareVersion: project.controller?.software_version || null,
        tags: {
          create: (() => {
            // Deduplicate tags by name+scope
            const seen = new Set<string>()
            return (project.tags || [])
              .filter((tag: { name: string; scope: string; scope_name?: string }) => {
                const scope = tag.scope === 'program' ? (tag.scope_name || 'program') : 'controller'
                const key = `${tag.name}::${scope}`
                if (seen.has(key)) return false
                seen.add(key)
                return true
              })
              .map((tag: {
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
          })()
        },
        programs: {
          create: (() => {
            // Deduplicate programs by name
            const seenPrograms = new Set<string>()
            return (project.programs || [])
              .filter((prog: { name: string }) => {
                if (seenPrograms.has(prog.name)) return false
                seenPrograms.add(prog.name)
                return true
              })
              .map((prog: {
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
              }) => {
                // Deduplicate routines within program
                const seenRoutines = new Set<string>()
                const uniqueRoutines = (prog.routines || []).filter((r: { name: string }) => {
                  if (seenRoutines.has(r.name)) return false
                  seenRoutines.add(r.name)
                  return true
                })

                // Deduplicate local tags
                const seenLocalTags = new Set<string>()
                const uniqueLocalTags = (prog.tags || []).filter((t: { name: string }) => {
                  if (seenLocalTags.has(t.name)) return false
                  seenLocalTags.add(t.name)
                  return true
                })

                return {
                  name: prog.name,
                  description: prog.description || null,
                  mainRoutineName: prog.main_routine || null,
                  disabled: prog.disabled || false,
                  localTags: {
                    create: uniqueLocalTags.map((tag: {
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
                    create: uniqueRoutines.map((routine: {
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
                        create: (() => {
                          // Deduplicate rungs and assign valid numbers
                          const seenRungs = new Set<number>()
                          let nextAutoNumber = 0

                          return (routine.rungs || [])
                            .map((rung: {
                              number: number
                              comment?: string
                              raw_text: string
                              instructions?: Array<{
                                type: string
                                operands?: string[]
                              }>
                            }, index: number) => {
                              // Get a valid rung number
                              let rungNumber = safeInt(rung.number)

                              // If number is invalid or already used, assign next available
                              if (rungNumber === null || seenRungs.has(rungNumber)) {
                                // Find next available number
                                while (seenRungs.has(nextAutoNumber)) {
                                  nextAutoNumber++
                                }
                                rungNumber = nextAutoNumber
                                nextAutoNumber++
                              }

                              seenRungs.add(rungNumber)

                              return {
                                number: rungNumber,
                                comment: rung.comment || null,
                                rawText: rung.raw_text || '',
                                instructions: JSON.stringify(rung.instructions || [])
                              }
                            })
                        })()
                      }
                    }))
                  }
                }
              })
          })()
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
            rate: safeInt(task.rate_ms),
            priority: safeInt(task.priority),
            watchdog: safeInt(task.watchdog_ms),
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
            slot: safeInt(mod.slot),
            parentModule: mod.parent_module || null
          }))
        },
        dataTypes: {
          create: (() => {
            const seen = new Set<string>()
            return (project.data_types || [])
              .filter((dt: { name: string }) => {
                if (!dt.name || seen.has(dt.name)) return false
                seen.add(dt.name)
                return true
              })
              .map((dt: {
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
          })()
        },
        // Add-On Instructions (deduplicated)
        addOnInstructions: {
          create: (() => {
            const seen = new Set<string>()
            return (project.add_on_instructions || [])
              .filter((aoi: { name: string }) => {
                if (!aoi.name || seen.has(aoi.name)) return false
                seen.add(aoi.name)
                return true
              })
              .map((aoi: {
                name: string
                description?: string
                revision?: string
                vendor?: string
                parameters?: Array<{
                  name: string
                  data_type: string
                  usage?: string
                  required?: boolean
                  visible?: boolean
                  description?: string
                }>
                local_tags?: Array<{
                  name: string
                  data_type: string
                  description?: string
                }>
              }) => ({
                name: aoi.name,
                description: aoi.description || null,
                revision: aoi.revision || null,
                vendor: aoi.vendor || null,
                parameters: JSON.stringify(aoi.parameters || []),
                localTags: JSON.stringify(aoi.local_tags || [])
              }))
          })()
        },
        // Alarms (no unique constraint, just filter empty names)
        alarms: {
          create: (project.alarms || [])
            .filter((alarm: { name: string }) => alarm.name)
            .map((alarm: {
              name: string
              alarm_type?: string
              input_tag?: string
              message?: string
              severity?: string
              high_high_limit?: number
              high_limit?: number
              low_limit?: number
              low_low_limit?: number
              deadband?: number
              enabled?: boolean
            }) => ({
              name: alarm.name,
              alarmType: alarm.alarm_type || 'digital',
              inputTag: alarm.input_tag || null,
              message: alarm.message || null,
              severity: alarm.severity || null,
              highHighLimit: alarm.high_high_limit || null,
              highLimit: alarm.high_limit || null,
              lowLimit: alarm.low_limit || null,
              lowLowLimit: alarm.low_low_limit || null,
              deadband: alarm.deadband || null,
              enabled: alarm.enabled !== false
            }))
        },
        // Message configs (deduplicated)
        messages: {
          create: (() => {
            const seen = new Set<string>()
            return (project.messages || [])
              .filter((msg: { name: string }) => {
                if (!msg.name || seen.has(msg.name)) return false
                seen.add(msg.name)
                return true
              })
              .map((msg: {
                name: string
                message_type?: string
                path?: string
                source_tag?: string
                destination_tag?: string
                description?: string
              }) => ({
                name: msg.name,
                messageType: msg.message_type || null,
                path: msg.path || null,
                sourceTag: msg.source_tag || null,
                destinationTag: msg.destination_tag || null,
                description: msg.description || null
              }))
          })()
        },
        // Trends (deduplicated)
        trends: {
          create: (() => {
            const seen = new Set<string>()
            return (project.trends || [])
              .filter((trend: { name: string }) => {
                if (!trend.name || seen.has(trend.name)) return false
                seen.add(trend.name)
                return true
              })
              .map((trend: {
                name: string
                description?: string
                sample_period_ms?: number
                tags?: string[]
              }) => ({
                name: trend.name,
                description: trend.description || null,
                samplePeriodMs: trend.sample_period_ms || null,
                tags: JSON.stringify(trend.tags || [])
              }))
          })()
        }
      }
    })

    // Log any warnings from parsing
    if (parseResult.warnings?.length > 0) {
      console.log('Parse warnings:', parseResult.warnings)
    }

    // Start project analysis in background (for cost-optimized chat)
    // This runs asynchronously - we don't wait for it
    console.log(`[Analysis] Starting background analysis for project ${dbProject.id}`)
    analyzeProject(dbProject.id).catch(err => {
      console.error('[Analysis] Background analysis failed:', err)
    })

    return NextResponse.json({
      id: dbProject.id,
      name: dbProject.name,
      tagCount: project.tags?.length || 0,
      programCount: project.programs?.length || 0,
      moduleCount: project.modules?.length || 0,
      aoiCount: project.add_on_instructions?.length || 0,
      dataTypeCount: project.data_types?.length || 0,
      warnings: parseResult.warnings || [],
      analysisStarted: true
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
