import Anthropic from '@anthropic-ai/sdk'
import { prisma } from './prisma'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

interface RoutineData {
  id: string
  name: string
  type: string
  programName: string
  rungs: Array<{
    number: number
    comment: string | null
    rawText: string
  }>
}

interface ProjectData {
  id: string
  name: string
  processorType: string | null
  programs: Array<{
    name: string
    routines: Array<{
      id: string
      name: string
      type: string
      rungs: Array<{
        number: number
        comment: string | null
        rawText: string
      }>
    }>
  }>
  tags: Array<{
    name: string
    dataType: string
    description: string | null
    scope: string
  }>
}

/**
 * Analyze an entire project and store results
 * This is called ONCE when a project is uploaded
 * Uses optimistic locking to prevent duplicate analysis runs
 */
export async function analyzeProject(projectId: string): Promise<void> {
  console.log(`[Analysis] Starting project analysis for ${projectId}`)

  // Check if already analyzing or complete (prevent duplicate runs)
  const existing = await prisma.projectAnalysis.findUnique({
    where: { projectId }
  })

  if (existing?.status === 'analyzing') {
    console.log(`[Analysis] Project ${projectId} already being analyzed, skipping`)
    return
  }

  if (existing?.status === 'complete') {
    console.log(`[Analysis] Project ${projectId} already analyzed, skipping`)
    return
  }

  // Mark as analyzing with atomic upsert
  await prisma.projectAnalysis.upsert({
    where: { projectId },
    create: { projectId, status: 'analyzing', overview: '', architecture: '' },
    update: { status: 'analyzing' }
  })

  try {
    // Fetch full project data
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: {
        tags: true,
        programs: {
          include: {
            routines: {
              include: {
                rungs: {
                  orderBy: { number: 'asc' }
                }
              }
            }
          }
        }
      }
    })

    if (!project) {
      throw new Error('Project not found')
    }

    // Build the full project context for analysis
    const projectContext = buildFullProjectContext(project as unknown as ProjectData)

    // Analyze the entire project at once
    const analysisPrompt = `You are an expert Rockwell/Allen-Bradley PLC programmer performing a comprehensive code review.

Analyze this PLC project and provide a detailed analysis. Be thorough and specific.

${projectContext}

Provide your analysis in the following JSON format (respond ONLY with valid JSON, no markdown):
{
  "overview": "2-3 paragraph comprehensive overview of what this project does, its purpose, and how it operates",
  "architecture": "Detailed explanation of the program structure - how programs relate to each other, main execution flow, what each major program handles",
  "safetyNotes": "Any safety-related observations - interlocks, E-stop handling, guard monitoring, fault conditions",
  "concerns": "Potential issues, code smells, areas that could cause problems, missing error handling, race conditions",
  "patterns": "Common programming patterns used - state machines, one-shots, handshaking, etc.",
  "keyTags": "The most important tags in the system and what they control/monitor",
  "ioSummary": "Summary of the I/O organization - what inputs/outputs exist and how they're organized"
}`

    console.log(`[Analysis] Sending project analysis request to Claude...`)

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      messages: [{ role: 'user', content: analysisPrompt }]
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse the JSON response
    let analysis
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found in response')
      }
    } catch (parseError) {
      console.error('[Analysis] Failed to parse JSON response:', parseError)
      // Fall back to storing raw response
      analysis = {
        overview: responseText,
        architecture: 'Analysis parsing failed - see overview',
        safetyNotes: null,
        concerns: null,
        patterns: null,
        keyTags: null,
        ioSummary: null
      }
    }

    // Calculate tokens used
    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)

    // Helper to ensure values are strings (Claude sometimes returns arrays)
    const toStringOrNull = (val: unknown): string | null => {
      if (val === null || val === undefined) return null
      if (typeof val === 'string') return val
      if (Array.isArray(val)) return val.join('\n• ')
      return String(val)
    }

    // Store the analysis
    await prisma.projectAnalysis.upsert({
      where: { projectId },
      create: {
        projectId,
        status: 'complete',
        overview: toStringOrNull(analysis.overview) || '',
        architecture: toStringOrNull(analysis.architecture) || '',
        safetyNotes: toStringOrNull(analysis.safetyNotes),
        concerns: toStringOrNull(analysis.concerns),
        patterns: toStringOrNull(analysis.patterns),
        keyTags: toStringOrNull(analysis.keyTags),
        ioSummary: toStringOrNull(analysis.ioSummary),
        tokensUsed
      },
      update: {
        status: 'complete',
        overview: toStringOrNull(analysis.overview) || '',
        architecture: toStringOrNull(analysis.architecture) || '',
        safetyNotes: toStringOrNull(analysis.safetyNotes),
        concerns: toStringOrNull(analysis.concerns),
        patterns: toStringOrNull(analysis.patterns),
        keyTags: toStringOrNull(analysis.keyTags),
        ioSummary: toStringOrNull(analysis.ioSummary),
        tokensUsed
      }
    })

    console.log(`[Analysis] Project analysis complete. Tokens used: ${tokensUsed}`)

    // Now analyze each routine
    await analyzeAllRoutines(project as unknown as ProjectData)

  } catch (error) {
    console.error('[Analysis] Project analysis failed:', error)
    await prisma.projectAnalysis.update({
      where: { projectId },
      data: { status: 'failed' }
    })
    throw error
  }
}

/**
 * Analyze all routines in a project
 */
async function analyzeAllRoutines(project: ProjectData): Promise<void> {
  const routines: RoutineData[] = []

  for (const program of project.programs) {
    for (const routine of program.routines) {
      if (routine.rungs.length > 0) {
        routines.push({
          id: routine.id,
          name: routine.name,
          type: routine.type,
          programName: program.name,
          rungs: routine.rungs
        })
      }
    }
  }

  console.log(`[Analysis] Analyzing ${routines.length} routines...`)

  // Analyze routines in batches to avoid rate limits
  const batchSize = 5
  for (let i = 0; i < routines.length; i += batchSize) {
    const batch = routines.slice(i, i + batchSize)
    await Promise.all(batch.map(routine => analyzeRoutine(routine, project.tags)))
    console.log(`[Analysis] Completed ${Math.min(i + batchSize, routines.length)}/${routines.length} routines`)
  }
}

/**
 * Analyze a single routine
 * Thread-safe with optimistic locking
 */
async function analyzeRoutine(
  routine: RoutineData,
  tags: Array<{ name: string; dataType: string; description: string | null }>
): Promise<void> {
  // Check if already analyzing or complete
  const existing = await prisma.routineAnalysis.findUnique({
    where: { routineId: routine.id }
  })

  if (existing?.status === 'analyzing' || existing?.status === 'complete') {
    return // Skip if already processing
  }

  // Mark as analyzing
  await prisma.routineAnalysis.upsert({
    where: { routineId: routine.id },
    create: { routineId: routine.id, status: 'analyzing', purpose: '' },
    update: { status: 'analyzing' }
  })

  try {
    // Build routine context
    const rungText = routine.rungs
      .map(r => `Rung ${r.number}${r.comment ? ` // ${r.comment}` : ''}:\n${r.rawText}`)
      .join('\n\n')

    // Get relevant tags (ones used in this routine)
    const routineText = routine.rungs.map(r => r.rawText).join(' ')
    const relevantTags = tags
      .filter(t => routineText.includes(t.name))
      .slice(0, 50)
      .map(t => `${t.name} (${t.dataType})${t.description ? `: ${t.description}` : ''}`)
      .join('\n')

    const prompt = `Analyze this PLC routine and provide a detailed explanation.

Routine: ${routine.programName}/${routine.name}
Type: ${routine.type}
Rungs: ${routine.rungs.length}

Ladder Logic:
${rungText}

Relevant Tags:
${relevantTags || 'No tag descriptions available'}

Provide analysis in JSON format (respond ONLY with valid JSON):
{
  "purpose": "Clear explanation of what this routine does and its role in the system",
  "sequenceFlow": "Step-by-step explanation of the sequence/logic flow (if applicable)",
  "keyLogic": "Important logic patterns, conditions, or operations in this routine",
  "dependencies": "Other routines this calls (JSR) or depends on",
  "safetyNotes": "Any safety-related logic or concerns"
}`

    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Use Haiku for routine analysis (cheaper)
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }]
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Parse JSON
    let analysis
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0])
      } else {
        throw new Error('No JSON found')
      }
    } catch {
      analysis = {
        purpose: responseText,
        sequenceFlow: null,
        keyLogic: null,
        dependencies: null,
        safetyNotes: null
      }
    }

    // Helper to ensure values are strings (Claude sometimes returns arrays)
    const toStringOrNull = (val: unknown): string | null => {
      if (val === null || val === undefined) return null
      if (typeof val === 'string') return val
      if (Array.isArray(val)) return val.join('\n• ')
      return String(val)
    }

    const tokensUsed = (response.usage?.input_tokens || 0) + (response.usage?.output_tokens || 0)

    await prisma.routineAnalysis.upsert({
      where: { routineId: routine.id },
      create: {
        routineId: routine.id,
        status: 'complete',
        purpose: toStringOrNull(analysis.purpose) || '',
        sequenceFlow: toStringOrNull(analysis.sequenceFlow),
        keyLogic: toStringOrNull(analysis.keyLogic),
        dependencies: toStringOrNull(analysis.dependencies),
        safetyNotes: toStringOrNull(analysis.safetyNotes),
        tokensUsed
      },
      update: {
        status: 'complete',
        purpose: toStringOrNull(analysis.purpose) || '',
        sequenceFlow: toStringOrNull(analysis.sequenceFlow),
        keyLogic: toStringOrNull(analysis.keyLogic),
        dependencies: toStringOrNull(analysis.dependencies),
        safetyNotes: toStringOrNull(analysis.safetyNotes),
        tokensUsed
      }
    })

  } catch (error) {
    console.error(`[Analysis] Failed to analyze routine ${routine.programName}/${routine.name}:`, error)
    await prisma.routineAnalysis.update({
      where: { routineId: routine.id },
      data: { status: 'failed' }
    })
  }
}

/**
 * Build full project context for initial analysis
 */
function buildFullProjectContext(project: ProjectData): string {
  const lines: string[] = []

  lines.push(`# Project: ${project.name}`)
  if (project.processorType) {
    lines.push(`Processor: ${project.processorType}`)
  }
  lines.push('')

  // Programs and routines with full code
  lines.push('## Programs and Ladder Logic')
  for (const program of project.programs) {
    lines.push(`\n### Program: ${program.name}`)

    for (const routine of program.routines) {
      lines.push(`\n#### ${routine.name} (${routine.type}, ${routine.rungs.length} rungs)`)

      for (const rung of routine.rungs) {
        lines.push(`\nRung ${rung.number}${rung.comment ? ` // ${rung.comment}` : ''}:`)
        lines.push(rung.rawText)
      }
    }
  }

  // Tags with descriptions
  lines.push('\n## Tags')
  const describedTags = project.tags.filter(t => t.description)
  if (describedTags.length > 0) {
    lines.push('\nTags with descriptions:')
    for (const tag of describedTags.slice(0, 100)) {
      lines.push(`- ${tag.name} (${tag.dataType}): ${tag.description}`)
    }
  }

  lines.push(`\nTotal tags: ${project.tags.length}`)

  return lines.join('\n')
}

/**
 * Get stored analysis for chat context (much smaller than raw code)
 */
export async function getProjectAnalysisForChat(projectId: string): Promise<string | null> {
  const analysis = await prisma.projectAnalysis.findUnique({
    where: { projectId }
  })

  if (!analysis || analysis.status !== 'complete') {
    return null
  }

  const lines: string[] = [
    '## Project Analysis (Pre-computed)',
    '',
    '### Overview',
    analysis.overview,
    '',
    '### Architecture',
    analysis.architecture
  ]

  if (analysis.safetyNotes) {
    lines.push('', '### Safety Notes', analysis.safetyNotes)
  }
  if (analysis.concerns) {
    lines.push('', '### Potential Concerns', analysis.concerns)
  }
  if (analysis.patterns) {
    lines.push('', '### Patterns', analysis.patterns)
  }
  if (analysis.keyTags) {
    lines.push('', '### Key Tags', analysis.keyTags)
  }
  if (analysis.ioSummary) {
    lines.push('', '### I/O Summary', analysis.ioSummary)
  }

  return lines.join('\n')
}

/**
 * Get routine analyses for specific routines
 */
export async function getRoutineAnalyses(routineIds: string[]): Promise<Map<string, string>> {
  const analyses = await prisma.routineAnalysis.findMany({
    where: {
      routineId: { in: routineIds },
      status: 'complete'
    },
    include: {
      routine: {
        include: {
          program: true
        }
      }
    }
  })

  const result = new Map<string, string>()

  for (const a of analyses) {
    const key = `${a.routine.program.name}/${a.routine.name}`
    const lines = [
      `### ${key}`,
      '',
      '**Purpose:** ' + a.purpose
    ]

    if (a.sequenceFlow) {
      lines.push('', '**Sequence Flow:** ' + a.sequenceFlow)
    }
    if (a.keyLogic) {
      lines.push('', '**Key Logic:** ' + a.keyLogic)
    }
    if (a.dependencies) {
      lines.push('', '**Dependencies:** ' + a.dependencies)
    }
    if (a.safetyNotes) {
      lines.push('', '**Safety:** ' + a.safetyNotes)
    }

    result.set(key, lines.join('\n'))
  }

  return result
}
