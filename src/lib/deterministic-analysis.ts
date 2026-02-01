/**
 * Deterministic Analysis Bridge
 *
 * Connects the program-analyzer to the database.
 * Runs on every upload to provide instant smart explanations without AI.
 */

import { prisma } from './prisma'
import { analyzeProgram, type ProgramAnalysis, type RungContext } from './program-analyzer'
import type { PlcProject, PlcProgram, PlcRoutine, PlcRung, PlcInstruction } from './l5x-parser'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ParsedProject = any // The raw parser output format

/**
 * Run deterministic analysis on a newly uploaded project
 * This is fast (no AI) and provides context for smart explanations
 */
export async function runDeterministicAnalysis(
  projectId: string,
  parsedProject: ParsedProject
): Promise<void> {
  console.log(`[DeterministicAnalysis] Starting for project ${projectId}`)
  const startTime = Date.now()

  // Convert parsed project to PlcProject format
  const plcProject = convertToPlcProject(parsedProject)

  // Run the analyzer
  const analysis = analyzeProgram(plcProject)

  console.log(`[DeterministicAnalysis] Analysis complete in ${Date.now() - startTime}ms`)
  console.log(`[DeterministicAnalysis] Tags analyzed: ${analysis.tagUsage.size}`)
  console.log(`[DeterministicAnalysis] Patterns found: ${analysis.patterns.length}`)
  console.log(`[DeterministicAnalysis] Rungs with context: ${analysis.rungContexts.size}`)

  // Store project-level analysis
  await storeProjectAnalysis(projectId, analysis)

  // Update rungs with their context
  await updateRungContexts(projectId, analysis)

  console.log(`[DeterministicAnalysis] Database updated in ${Date.now() - startTime}ms total`)
}

/**
 * Convert parser output to PlcProject format
 */
function convertToPlcProject(parsed: ParsedProject): PlcProject {
  const programs: PlcProgram[] = (parsed.programs || []).map((prog: {
    name: string
    description?: string
    main_routine_name?: string
    disabled?: boolean
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
          branch_leg?: number
          branch_level?: number
          branch_start?: boolean
        }>
      }>
    }>
    local_tags?: Array<{
      name: string
      data_type: string
      description?: string
    }>
  }) => ({
    name: prog.name,
    description: prog.description,
    mainRoutineName: prog.main_routine_name,
    disabled: prog.disabled || false,
    routines: (prog.routines || []).map(routine => ({
      name: routine.name,
      type: routine.type || 'Ladder',
      description: routine.description,
      rungs: (routine.rungs || []).map(rung => ({
        number: rung.number,
        comment: rung.comment,
        rawText: rung.raw_text || '',
        instructions: (rung.instructions || []).map(inst => ({
          type: inst.type,
          operands: inst.operands || [],
          branchLeg: inst.branch_leg,
          branchLevel: inst.branch_level,
          branchStart: inst.branch_start
        }))
      }))
    })),
    localTags: (prog.local_tags || []).map(tag => ({
      name: tag.name,
      dataType: tag.data_type,
      scope: prog.name,
      description: tag.description
    }))
  }))

  return {
    name: parsed.controller?.name || 'Unknown',
    processorType: parsed.controller?.processor_type,
    softwareVersion: parsed.controller?.software_version,
    tags: (parsed.tags || []).map((tag: {
      name: string
      data_type: string
      scope: string
      description?: string
    }) => ({
      name: tag.name,
      dataType: tag.data_type,
      scope: tag.scope || 'controller',
      description: tag.description
    })),
    programs,
    tasks: [],
    modules: [],
    dataTypes: []
  }
}

/**
 * Store project-level analysis in the database
 */
async function storeProjectAnalysis(projectId: string, analysis: ProgramAnalysis): Promise<void> {
  // Convert tag usage map to serializable format
  const tagUsageObj: Record<string, {
    name: string
    semanticType: string
    readerCount: number
    writerCount: number
    readers: Array<{ program: string; routine: string; rungNumber: number }>
    writers: Array<{ program: string; routine: string; rungNumber: number }>
  }> = {}

  for (const [name, info] of analysis.tagUsage) {
    tagUsageObj[name] = {
      name: info.name,
      semanticType: info.semanticType,
      readerCount: info.readers.length,
      writerCount: info.writers.length,
      readers: info.readers.slice(0, 10).map(r => ({
        program: r.program,
        routine: r.routine,
        rungNumber: r.rungNumber
      })),
      writers: info.writers.slice(0, 10).map(w => ({
        program: w.program,
        routine: w.routine,
        rungNumber: w.rungNumber
      }))
    }
  }

  // Update project with analysis data
  await prisma.project.update({
    where: { id: projectId },
    data: {
      tagUsageJson: JSON.stringify(tagUsageObj),
      patternsJson: JSON.stringify(analysis.patterns.slice(0, 100)), // Limit for storage
      summaryJson: JSON.stringify(analysis.summary)
    }
  })
}

/**
 * Update rungs with their computed context
 */
async function updateRungContexts(projectId: string, analysis: ProgramAnalysis): Promise<void> {
  // Get all rungs for this project
  const rungs = await prisma.rung.findMany({
    where: {
      routine: {
        program: {
          projectId
        }
      }
    },
    select: {
      id: true,
      number: true,
      routine: {
        select: {
          name: true,
          program: {
            select: {
              name: true
            }
          }
        }
      }
    }
  })

  // Build update operations
  const updates: Promise<unknown>[] = []

  for (const rung of rungs) {
    const key = `${rung.routine.program.name}/${rung.routine.name}:${rung.number}`
    const context = analysis.rungContexts.get(key)

    if (context) {
      updates.push(
        prisma.rung.update({
          where: { id: rung.id },
          data: {
            purpose: context.purpose || null,
            category: context.category,
            patternsJson: JSON.stringify(context.patterns),
            inputTagsJson: JSON.stringify(context.inputTags),
            outputTagsJson: JSON.stringify(context.outputTags),
            relatedRungs: JSON.stringify(context.relatedRungs),
            safetyRelevant: context.safetyRelevant,
            concernsJson: context.concerns ? JSON.stringify(context.concerns) : null,
            subsystemsJson: context.subsystems ? JSON.stringify(context.subsystems) : null
          }
        })
      )
    }
  }

  // Execute updates in batches
  const batchSize = 100
  for (let i = 0; i < updates.length; i += batchSize) {
    await Promise.all(updates.slice(i, i + batchSize))
  }

  console.log(`[DeterministicAnalysis] Updated ${updates.length} rungs with context`)
}

/**
 * Get pre-computed rung context from database
 * Used by the explain API
 */
export async function getRungContext(rungId: string): Promise<RungContext | null> {
  const rung = await prisma.rung.findUnique({
    where: { id: rungId },
    select: {
      number: true,
      purpose: true,
      category: true,
      patternsJson: true,
      inputTagsJson: true,
      outputTagsJson: true,
      relatedRungs: true,
      safetyRelevant: true,
      concernsJson: true,
      subsystemsJson: true,
      routine: {
        select: {
          name: true,
          program: {
            select: {
              name: true
            }
          }
        }
      }
    }
  })

  console.log(`[getRungContext] rungId: ${rungId}, found: ${!!rung}, category: ${rung?.category || 'null'}`)

  if (!rung || !rung.category) {
    return null // Not analyzed yet
  }

  return {
    rungNumber: rung.number,
    program: rung.routine.program.name,
    routine: rung.routine.name,
    purpose: rung.purpose || undefined,
    patterns: rung.patternsJson ? JSON.parse(rung.patternsJson) : [],
    relatedRungs: rung.relatedRungs ? JSON.parse(rung.relatedRungs) : [],
    safetyRelevant: rung.safetyRelevant,
    category: rung.category as RungContext['category'],
    inputTags: rung.inputTagsJson ? JSON.parse(rung.inputTagsJson) : [],
    outputTags: rung.outputTagsJson ? JSON.parse(rung.outputTagsJson) : [],
    concerns: rung.concernsJson ? JSON.parse(rung.concernsJson) : undefined,
    subsystems: rung.subsystemsJson ? JSON.parse(rung.subsystemsJson) : undefined
  }
}

/**
 * Get tag usage info from project
 * Used by the explain API
 */
export async function getTagUsage(projectId: string, tagName: string): Promise<{
  name: string
  semanticType: string
  readers: Array<{ program: string; routine: string; rungNumber: number }>
  writers: Array<{ program: string; routine: string; rungNumber: number }>
} | null> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { tagUsageJson: true }
  })

  if (!project?.tagUsageJson) {
    return null
  }

  const tagUsage = JSON.parse(project.tagUsageJson)
  return tagUsage[tagName] || null
}

/**
 * Get all tag usage for a project (for the explain panel)
 */
export async function getAllTagUsage(projectId: string): Promise<Map<string, {
  name: string
  semanticType: string
  readerCount: number
  writerCount: number
  readers: Array<{ program: string; routine: string; rungNumber: number }>
  writers: Array<{ program: string; routine: string; rungNumber: number }>
}>> {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    select: { tagUsageJson: true }
  })

  if (!project?.tagUsageJson) {
    return new Map()
  }

  const tagUsage = JSON.parse(project.tagUsageJson)
  return new Map(Object.entries(tagUsage))
}
