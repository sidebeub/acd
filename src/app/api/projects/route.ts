import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { prisma } from '@/lib/prisma'
import { analyzeProject } from '@/lib/project-analysis'
import { runDeterministicAnalysis } from '@/lib/deterministic-analysis'
import { requireAuth } from '@/lib/auth'
import { parseRSS } from '@/lib/rss-parser'
import { uploadFile } from '@/lib/s3'
import { getClientIp, rateLimiters, rateLimitResponse } from '@/lib/rate-limit'

// Parser API URL - set in environment
const PARSER_API_URL = process.env.PARSER_API_URL || 'http://localhost:8000'

// Calculate SHA256 hash of file contents
async function calculateFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer()
  const hash = createHash('sha256')
  hash.update(Buffer.from(buffer))
  return hash.digest('hex')
}

// PostgreSQL INT4 max value (signed 32-bit)
const MAX_INT4 = 2147483647

// Sanitize integer values that might overflow PostgreSQL INT4
// Values like 4294967295 (0xFFFFFFFF) are often used as "not set" sentinels
function safeInt(value: number | undefined | null): number | null {
  if (value === undefined || value === null) return null
  if (value > MAX_INT4 || value < -MAX_INT4) return null
  return value
}

// GET - List all projects for authenticated user
export async function GET() {
  try {
    const user = await requireAuth()

    const projects = await prisma.project.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        fileName: true,
        fileSize: true,
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
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    throw error
  }
}

// POST - Upload and parse a new project
export async function POST(request: NextRequest) {
  try {
    // Rate limit check (10 per hour)
    const clientIp = getClientIp(request)
    const rateLimitResult = rateLimiters.fileUpload(clientIp)
    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult)
    }

    // Require authentication
    const user = await requireAuth()

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const fileName = file.name.toLowerCase()

    // Validate file type
    if (!fileName.endsWith('.l5x') && !fileName.endsWith('.acd') && !fileName.endsWith('.rss')) {
      return NextResponse.json(
        { error: 'Invalid file type. Please upload an .L5X, .ACD, or .RSS file.' },
        { status: 400 }
      )
    }

    // Calculate file hash to check for duplicates
    const fileHash = await calculateFileHash(file)
    const fileSize = file.size

    console.log(`[Upload] File: ${file.name}, Size: ${fileSize}, Hash: ${fileHash.substring(0, 16)}...`)

    // Check if this exact file has been uploaded before by this user
    const existingProject = await prisma.project.findFirst({
      where: { fileHash, userId: user.id },
      select: {
        id: true,
        name: true,
        fileName: true,
        createdAt: true,
        _count: {
          select: {
            tags: true,
            programs: true,
            modules: true,
            addOnInstructions: true,
            dataTypes: true
          }
        }
      }
    })

    if (existingProject) {
      // For RSS files, delete the old project and re-parse (RSS parser is being improved)
      if (fileName.toLowerCase().endsWith('.rss')) {
        console.log(`[Upload] Deleting cached RSS project ${existingProject.id} to re-parse`)
        await prisma.project.delete({ where: { id: existingProject.id } })
      } else {
        console.log(`[Upload] Found existing project ${existingProject.id} for file hash`)
        return NextResponse.json({
          id: existingProject.id,
          name: existingProject.name,
          tagCount: existingProject._count.tags,
          programCount: existingProject._count.programs,
          moduleCount: existingProject._count.modules,
          aoiCount: existingProject._count.addOnInstructions,
          dataTypeCount: existingProject._count.dataTypes,
          warnings: [],
          cached: true,
          message: 'This file was previously uploaded. Using cached data to save processing time.'
        }, { status: 200 })
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let project: any
    const warnings: string[] = []

    // Handle RSS files locally (RSLogix 500 / SLC 500 / MicroLogix)
    if (fileName.endsWith('.rss')) {
      console.log(`[Upload] Parsing RSS file locally: ${file.name}`)
      try {
        const buffer = await file.arrayBuffer()
        const parsedProject = await parseRSS(buffer)

        // Convert to parser API format
        project = {
          controller: {
            name: parsedProject.name,
            processor_type: parsedProject.processorType,
            software_version: parsedProject.softwareVersion
          },
          tags: parsedProject.tags.map(t => ({
            name: t.name,
            data_type: t.dataType,
            scope: t.scope === 'controller' ? 'controller' : 'program',
            scope_name: t.scope === 'controller' ? undefined : t.scope,
            description: t.description,
            value: t.value  // Include initial value for simulation
          })),
          programs: parsedProject.programs.map(p => ({
            name: p.name,
            description: p.description,
            main_routine: p.mainRoutineName,
            disabled: p.disabled,
            tags: p.localTags.map(t => ({
              name: t.name,
              data_type: t.dataType,
              description: t.description,
              value: t.value  // Include initial value for simulation
            })),
            routines: p.routines.map(r => ({
              name: r.name,
              type: r.type,
              description: r.description,
              rungs: r.rungs.map(rung => ({
                number: rung.number,
                comment: rung.comment,
                raw_text: rung.rawText,
                instructions: rung.instructions.map(inst => ({
                  type: inst.type,
                  operands: inst.operands,
                  branchLeg: inst.branchLeg,
                  branchLevel: inst.branchLevel,
                  branchStart: inst.branchStart
                }))
              }))
            }))
          })),
          tasks: parsedProject.tasks.map(t => ({
            name: t.name,
            type: t.type,
            rate_ms: t.rate,
            priority: t.priority,
            watchdog_ms: t.watchdog,
            inhibited: t.inhibitTask,
            programs: t.scheduledPrograms
          })),
          modules: parsedProject.modules.map(m => ({
            name: m.name,
            catalog_number: m.catalogNumber,
            vendor: m.vendor,
            slot: m.slot,
            parent_module: m.parentModule
          })),
          data_types: parsedProject.dataTypes.map(dt => ({
            name: dt.name,
            family: dt.family,
            description: dt.description,
            members: dt.members
          })),
          add_on_instructions: [],
          alarms: [],
          messages: [],
          trends: [],
          // RSS timer/counter programmed values for simulation initialization
          timer_program_values: parsedProject.timerProgramValues?.map(t => ({
            address: t.address,
            time_base: t.timeBase,
            preset: t.preset,
            accum: t.accum
          })) || [],
          counter_program_values: parsedProject.counterProgramValues?.map(c => ({
            address: c.address,
            preset: c.preset,
            accum: c.accum
          })) || []
        }

        // Create synthetic tags for timer/counter program values from RSS files
        // This ensures simulation initialization works the same way as L5X/ACD files
        const rssSyntheticTags: Array<{
          name: string
          data_type: string
          scope: string
          scope_name?: string
          description?: string
          value?: string
        }> = []

        // Process timer program values for RSS
        if (project.timer_program_values && Array.isArray(project.timer_program_values)) {
          for (const timer of project.timer_program_values) {
            if (timer.address) {
              // Create .PRE tag (preset in milliseconds)
              if (timer.preset !== undefined && timer.preset !== null) {
                rssSyntheticTags.push({
                  name: `${timer.address}.PRE`,
                  data_type: 'INT',
                  scope: 'controller',
                  description: `Timer preset value (synthetic from program)`,
                  value: String(timer.preset)
                })
              }
              // Create .ACC tag (accumulated value)
              if (timer.accum !== undefined && timer.accum !== null) {
                rssSyntheticTags.push({
                  name: `${timer.address}.ACC`,
                  data_type: 'INT',
                  scope: 'controller',
                  description: `Timer accumulated value (synthetic from program)`,
                  value: String(timer.accum)
                })
              }
              // Create .TB tag (time base)
              if (timer.time_base !== undefined && timer.time_base !== null) {
                rssSyntheticTags.push({
                  name: `${timer.address}.TB`,
                  data_type: 'REAL',
                  scope: 'controller',
                  description: `Timer time base (synthetic from program)`,
                  value: String(timer.time_base)
                })
              }
            }
          }
          console.log(`[Upload] Created ${rssSyntheticTags.length} synthetic timer tags from RSS`)
        }

        // Process counter program values for RSS
        if (project.counter_program_values && Array.isArray(project.counter_program_values)) {
          const counterTagCount = rssSyntheticTags.length
          for (const counter of project.counter_program_values) {
            if (counter.address) {
              // Create .PRE tag (preset)
              if (counter.preset !== undefined && counter.preset !== null) {
                rssSyntheticTags.push({
                  name: `${counter.address}.PRE`,
                  data_type: 'INT',
                  scope: 'controller',
                  description: `Counter preset value (synthetic from program)`,
                  value: String(counter.preset)
                })
              }
              // Create .ACC tag (accumulated value)
              if (counter.accum !== undefined && counter.accum !== null) {
                rssSyntheticTags.push({
                  name: `${counter.address}.ACC`,
                  data_type: 'INT',
                  scope: 'controller',
                  description: `Counter accumulated value (synthetic from program)`,
                  value: String(counter.accum)
                })
              }
            }
          }
          console.log(`[Upload] Created ${rssSyntheticTags.length - counterTagCount} synthetic counter tags from RSS`)
        }

        // Add synthetic tags to the project tags array
        if (rssSyntheticTags.length > 0) {
          project.tags.push(...rssSyntheticTags)
          console.log(`[Upload] Total RSS tags after adding synthetic timer/counter tags: ${project.tags.length}`)
        }

        // Detailed logging for RSS parsing debug
        console.log(`[Upload] RSS parsing complete:`)
        console.log(`  - Programs: ${parsedProject.programs.length}`)
        console.log(`  - Tags: ${parsedProject.tags.length}`)
        for (const prog of parsedProject.programs) {
          console.log(`  - Program "${prog.name}": ${prog.routines.length} routines`)
          for (const routine of prog.routines) {
            console.log(`    - Routine "${routine.name}": ${routine.rungs.length} rungs`)
            if (routine.rungs.length > 0) {
              console.log(`      First rung: ${JSON.stringify(routine.rungs[0]).slice(0, 200)}`)
            }
          }
        }
        warnings.push('RSLogix 500 (.RSS) support is experimental - some features may be limited')
      } catch (rssError) {
        console.error('[Upload] RSS parsing failed:', rssError)
        throw new Error(`Failed to parse RSS file: ${rssError instanceof Error ? rssError.message : String(rssError)}`)
      }
    } else {
      // Send L5X/ACD files to Parser API
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

      project = parseResult.project
      if (parseResult.warnings) {
        warnings.push(...parseResult.warnings)
      }

      // Create synthetic tags for timer/counter program values from L5X/ACD files
      // This mirrors what we do for RSS files so simulation initialization works the same way
      const syntheticTags: Array<{
        name: string
        data_type: string
        scope: string
        description?: string
        value?: string
      }> = []

      // Process timer program values
      if (project.timer_program_values && Array.isArray(project.timer_program_values)) {
        for (const timer of project.timer_program_values) {
          if (timer.address) {
            // Create .PRE tag (preset in milliseconds)
            if (timer.preset !== undefined && timer.preset !== null) {
              syntheticTags.push({
                name: `${timer.address}.PRE`,
                data_type: 'DINT',
                scope: 'controller',
                description: `Timer preset value (synthetic from program)`,
                value: String(timer.preset)
              })
            }
            // Create .ACC tag (accumulated value)
            if (timer.accum !== undefined && timer.accum !== null) {
              syntheticTags.push({
                name: `${timer.address}.ACC`,
                data_type: 'DINT',
                scope: 'controller',
                description: `Timer accumulated value (synthetic from program)`,
                value: String(timer.accum)
              })
            }
            // Create .TB tag (time base)
            if (timer.time_base !== undefined && timer.time_base !== null) {
              syntheticTags.push({
                name: `${timer.address}.TB`,
                data_type: 'REAL',
                scope: 'controller',
                description: `Timer time base (synthetic from program)`,
                value: String(timer.time_base)
              })
            }
          }
        }
        console.log(`[Upload] Created ${syntheticTags.length} synthetic timer tags from L5X/ACD`)
      }

      // Process counter program values
      if (project.counter_program_values && Array.isArray(project.counter_program_values)) {
        const counterTagCount = syntheticTags.length
        for (const counter of project.counter_program_values) {
          if (counter.address) {
            // Create .PRE tag (preset)
            if (counter.preset !== undefined && counter.preset !== null) {
              syntheticTags.push({
                name: `${counter.address}.PRE`,
                data_type: 'DINT',
                scope: 'controller',
                description: `Counter preset value (synthetic from program)`,
                value: String(counter.preset)
              })
            }
            // Create .ACC tag (accumulated value)
            if (counter.accum !== undefined && counter.accum !== null) {
              syntheticTags.push({
                name: `${counter.address}.ACC`,
                data_type: 'DINT',
                scope: 'controller',
                description: `Counter accumulated value (synthetic from program)`,
                value: String(counter.accum)
              })
            }
          }
        }
        console.log(`[Upload] Created ${syntheticTags.length - counterTagCount} synthetic counter tags from L5X/ACD`)
      }

      // Add synthetic tags to the project tags array
      if (syntheticTags.length > 0) {
        if (!project.tags) {
          project.tags = []
        }
        project.tags.push(...syntheticTags)
        console.log(`[Upload] Total tags after adding synthetic timer/counter tags: ${project.tags.length}`)
      }
    }

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

    // Store in database with user association
    const dbProject = await prisma.project.create({
      data: {
        userId: user.id,
        name: project.controller?.name || project.file_name || 'Unknown Project',
        fileName: file.name,
        fileHash: fileHash,
        fileSize: fileSize,
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
    if (warnings.length > 0) {
      console.log('Parse warnings:', warnings)
    }

    // Upload raw file to S3 for potential ML training (if S3 is configured)
    if (process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID) {
      try {
        const fileBuffer = Buffer.from(await file.arrayBuffer())
        const fileType = fileName.endsWith('.l5x') ? 'l5x' : fileName.endsWith('.acd') ? 'acd' : 'rss'

        const { key } = await uploadFile(
          dbProject.id,
          file.name,
          fileBuffer,
          'application/octet-stream'
        )

        // Create FileUpload record
        await prisma.fileUpload.create({
          data: {
            projectId: dbProject.id,
            s3Key: key,
            fileHash: fileHash,
            fileName: file.name,
            fileType: fileType,
            fileSize: fileSize,
            allowTraining: false, // User must explicitly opt-in later
          }
        })

        console.log(`[S3] Uploaded file for project ${dbProject.id}: ${key}`)
      } catch (s3Error) {
        // Log but don't fail the upload - S3 is optional for ML training
        console.error('[S3] Failed to upload file for ML training:', s3Error)
      }
    }

    // Run DETERMINISTIC analysis first (instant, no AI, updates rungs with context)
    console.log(`[Analysis] Running deterministic pre-analysis for project ${dbProject.id}`)
    try {
      await runDeterministicAnalysis(dbProject.id, project)
      console.log(`[Analysis] Deterministic analysis complete for project ${dbProject.id}`)
    } catch (analysisErr) {
      console.error('[Analysis] Deterministic analysis failed (non-fatal):', analysisErr)
    }

    // Start AI-powered project analysis in background (for cost-optimized chat)
    // This runs asynchronously - we don't wait for it
    console.log(`[Analysis] Starting background AI analysis for project ${dbProject.id}`)
    analyzeProject(dbProject.id).catch(err => {
      console.error('[Analysis] Background AI analysis failed:', err)
    })

    return NextResponse.json({
      id: dbProject.id,
      name: dbProject.name,
      tagCount: project.tags?.length || 0,
      programCount: project.programs?.length || 0,
      moduleCount: project.modules?.length || 0,
      aoiCount: project.add_on_instructions?.length || 0,
      dataTypeCount: project.data_types?.length || 0,
      warnings,
      analysisStarted: true
    }, { status: 201 })

  } catch (error) {
    // Handle auth errors
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.error('Error processing file:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return NextResponse.json(
      { error: `Failed to process file: ${errorMessage}` },
      { status: 500 }
    )
  }
}
