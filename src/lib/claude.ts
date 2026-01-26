import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

type ExplanationMode = 'friendly' | 'technical' | 'operator'

const MODE_PROMPTS: Record<ExplanationMode, string> = {
  friendly: `You are explaining PLC ladder logic to someone new to automation.
Use real-world analogies and simple language. Avoid technical jargon.
Example: "When the start button is pressed AND the safety guard is closed, the motor turns ON - like how a microwave only runs when the door is shut."
Be concise (2-3 sentences). Make it relatable.`,

  technical: `You are a senior controls engineer explaining ladder logic to another engineer.
Use proper technical terminology: examine if closed (XIC), output energize (OTE), etc.
Include bit states, timing values, and register operations.
Be precise and complete but concise (2-4 sentences).`,

  operator: `You are explaining PLC ladder logic to a machine operator or maintenance technician.
Focus on: what conditions must be met, what happens as a result, and troubleshooting hints.
Use clear operational language. Name the devices by their function.
Be concise (2-3 sentences). Include any safety-relevant information.`
}

/**
 * Explain a PLC rung in human-readable terms
 */
export async function explainRung(
  rungText: string,
  tags: Record<string, { dataType: string; description?: string }>,
  mode: ExplanationMode = 'friendly'
): Promise<string> {
  const tagContext = Object.entries(tags)
    .map(([name, info]) => `- ${name}: ${info.dataType}${info.description ? ` (${info.description})` : ''}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    system: MODE_PROMPTS[mode],
    messages: [{
      role: 'user',
      content: `Explain this ladder logic rung:
${rungText}

Available tags:
${tagContext || 'No tag descriptions available'}`
    }]
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

/**
 * Analyze program structure and provide insights
 */
export async function analyzeProgram(
  programName: string,
  routines: Array<{ name: string; rungCount: number }>,
  tagUsage: Record<string, number>
): Promise<string> {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2048,
    system: `You are an expert PLC programmer providing code review insights.
Analyze the program structure and tag usage patterns.
Focus on: organization quality, potential issues, and suggestions for improvement.`,
    messages: [{
      role: 'user',
      content: `Analyze this PLC program:

Program: ${programName}

Routines:
${routines.map(r => `- ${r.name}: ${r.rungCount} rungs`).join('\n')}

Top 20 most-used tags:
${Object.entries(tagUsage)
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)
  .map(([tag, count]) => `- ${tag}: ${count} uses`)
  .join('\n')}`
    }]
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

/**
 * Stream explanation for complex analysis
 */
export async function streamExplanation(query: string, context: string) {
  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 4096,
    system: `You are an expert PLC programmer and industrial automation specialist.
Provide detailed, technical explanations that are still accessible to maintenance technicians.
Context:\n${context}`,
    messages: [{ role: 'user', content: query }]
  })

  return new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta') {
          controller.enqueue(new TextEncoder().encode(event.delta.text))
        }
      }
      controller.close()
    }
  })
}

// ============================================
// Chat with Project Context
// ============================================

export interface ProjectContext {
  name: string
  processorType?: string
  programs: Array<{
    name: string
    routines: Array<{
      name: string
      type: string
      rungCount: number
      rungs?: Array<{
        number: number
        comment?: string
        rawText: string
      }>
    }>
  }>
  tags: Array<{
    name: string
    dataType: string
    description?: string
    scope: string
  }>
  io?: {
    inputs: Array<{ tagName: string; description?: string }>
    outputs: Array<{ tagName: string; description?: string }>
  }
}

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

const CHAT_SYSTEM_PROMPT = `You are an expert Rockwell/Allen-Bradley PLC programmer and industrial automation specialist integrated into an ACD file viewer application.

## Your Capabilities:
1. **Review & Explain**: Analyze ladder logic, explain what rungs do, identify potential issues
2. **Troubleshoot**: Help diagnose problems by tracing tag usage and logic flow
3. **Generate Code**: Write new ladder logic rungs when requested
4. **Optimize**: Suggest improvements to existing logic

## Code Generation Format:
When generating ladder logic code, use this format so it can be parsed:

\`\`\`ladder
ROUTINE: ProgramName/RoutineName
RUNG: NEW (or a number to replace existing)
COMMENT: Optional rung comment
---
XIC(Tag1)XIC(Tag2)[OTE(Output1),TON(Timer1,?,?)];
\`\`\`

## Instruction Reference:
- Contacts: XIC (examine if closed), XIO (examine if open)
- Coils: OTE (output energize), OTL (output latch), OTU (output unlatch)
- Timers: TON (on-delay), TOF (off-delay), RTO (retentive)
- Counters: CTU (count up), CTD (count down), RES (reset)
- Compare: EQU, NEQ, GRT, GEQ, LES, LEQ, LIM, CMP
- Math: ADD, SUB, MUL, DIV, MOD, NEG, ABS, CPT
- Move: MOV, COP, FLL, CLR
- Program: JSR (jump to subroutine), RET (return), JMP, LBL

## Guidelines:
- Be concise but thorough
- Reference specific rungs by Program/Routine:RungNumber format
- When explaining, include both what the logic does and why it matters
- For troubleshooting, trace the logic flow step by step
- Always consider safety implications of any code changes
- Use proper Allen-Bradley terminology`

/**
 * Chat with full project context
 */
export async function chatWithProject(
  message: string,
  projectContext: ProjectContext,
  history: ChatMessage[] = []
): Promise<string> {
  // Build project context summary
  const contextSummary = buildProjectContextSummary(projectContext)

  // Build messages array with history
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: `${CHAT_SYSTEM_PROMPT}

## Current Project Context:
${contextSummary}`,
    messages
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

/**
 * Build a summary of the project for the system prompt
 */
function buildProjectContextSummary(ctx: ProjectContext): string {
  const lines: string[] = []

  lines.push(`**Project**: ${ctx.name}`)
  if (ctx.processorType) {
    lines.push(`**Processor**: ${ctx.processorType}`)
  }

  // Programs and routines with FULL rung content
  lines.push('')
  lines.push('## Programs, Routines, and Ladder Logic:')

  for (const program of ctx.programs) {
    lines.push('')
    lines.push(`### Program: ${program.name}`)

    for (const routine of program.routines) {
      lines.push('')
      lines.push(`#### ${program.name}/${routine.name} (${routine.type}, ${routine.rungCount} rungs)`)

      // Include all rungs with their content
      if (routine.rungs && routine.rungs.length > 0) {
        for (const rung of routine.rungs) {
          lines.push('')
          lines.push(`**Rung ${rung.number}**${rung.comment ? ` // ${rung.comment}` : ''}`)
          lines.push('```')
          lines.push(rung.rawText)
          lines.push('```')
        }
      } else {
        lines.push('(No rungs or empty routine)')
      }
    }
  }

  // Tags summary
  const controllerTags = ctx.tags.filter(t => t.scope === 'controller')
  const programTags = ctx.tags.filter(t => t.scope !== 'controller')
  lines.push('')
  lines.push(`## Tags: ${controllerTags.length} controller-scope, ${programTags.length} program-scope`)

  // Show tags with descriptions (most useful for context)
  const describedTags = ctx.tags.filter(t => t.description).slice(0, 50)
  if (describedTags.length > 0) {
    lines.push('')
    lines.push('### Key Tags with Descriptions:')
    for (const tag of describedTags) {
      lines.push(`- ${tag.name} (${tag.dataType}): ${tag.description}`)
    }
  }

  // I/O summary
  if (ctx.io) {
    lines.push('')
    lines.push(`## I/O: ${ctx.io.inputs.length} inputs, ${ctx.io.outputs.length} outputs`)
  }

  return lines.join('\n')
}

/**
 * Stream chat response for real-time display
 */
export async function streamChatWithProject(
  message: string,
  projectContext: ProjectContext,
  history: ChatMessage[] = []
) {
  const contextSummary = buildProjectContextSummary(projectContext)

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ]

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: `${CHAT_SYSTEM_PROMPT}

## Current Project Context:
${contextSummary}`,
    messages
  })

  return new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta') {
          controller.enqueue(new TextEncoder().encode(event.delta.text))
        }
      }
      controller.close()
    }
  })
}

// ============================================
// Chat with Pre-Analyzed Project (Cost Optimized)
// ============================================

export interface AnalyzedProjectContext {
  name: string
  processorType?: string
  // Pre-computed analysis (from ProjectAnalysis table)
  overview: string
  architecture: string
  safetyNotes?: string | null
  concerns?: string | null
  patterns?: string | null
  keyTags?: string | null
  ioSummary?: string | null
  // Routine analyses (from RoutineAnalysis table)
  routineAnalyses?: Array<{
    programName: string
    routineName: string
    purpose: string
    sequenceFlow?: string | null
    keyLogic?: string | null
    dependencies?: string | null
    safetyNotes?: string | null
  }>
  // Basic structure info (lightweight)
  programs: Array<{
    name: string
    routines: Array<{
      name: string
      type: string
      rungCount: number
    }>
  }>
  tags: Array<{
    name: string
    dataType: string
    description?: string
    scope: string
  }>
}

/**
 * Chat using pre-analyzed project context (much cheaper per message)
 */
export async function chatWithAnalyzedProject(
  message: string,
  analysisContext: AnalyzedProjectContext,
  history: ChatMessage[] = []
): Promise<string> {
  const contextSummary = buildAnalyzedContextSummary(analysisContext)

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ]

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: `${CHAT_SYSTEM_PROMPT}

## Current Project Context (Pre-Analyzed):
${contextSummary}

Note: This context is from a pre-computed analysis. If you need to see the actual raw ladder logic for specific rungs, tell the user which routine/rung you need and they can provide it.`,
    messages
  })

  return response.content[0].type === 'text' ? response.content[0].text : ''
}

/**
 * Build context summary from pre-analyzed data
 */
function buildAnalyzedContextSummary(ctx: AnalyzedProjectContext): string {
  const lines: string[] = []

  lines.push(`**Project**: ${ctx.name}`)
  if (ctx.processorType) {
    lines.push(`**Processor**: ${ctx.processorType}`)
  }

  // Pre-computed overview
  lines.push('')
  lines.push('## Project Overview')
  lines.push(ctx.overview)

  // Architecture
  lines.push('')
  lines.push('## Architecture')
  lines.push(ctx.architecture)

  // Safety notes
  if (ctx.safetyNotes) {
    lines.push('')
    lines.push('## Safety Notes')
    lines.push(ctx.safetyNotes)
  }

  // Concerns/Issues
  if (ctx.concerns) {
    lines.push('')
    lines.push('## Potential Concerns')
    lines.push(ctx.concerns)
  }

  // Patterns
  if (ctx.patterns) {
    lines.push('')
    lines.push('## Patterns')
    lines.push(ctx.patterns)
  }

  // Key tags
  if (ctx.keyTags) {
    lines.push('')
    lines.push('## Key Tags')
    lines.push(ctx.keyTags)
  }

  // I/O Summary
  if (ctx.ioSummary) {
    lines.push('')
    lines.push('## I/O Summary')
    lines.push(ctx.ioSummary)
  }

  // Routine analyses
  if (ctx.routineAnalyses && ctx.routineAnalyses.length > 0) {
    lines.push('')
    lines.push('## Routine Analysis')
    for (const r of ctx.routineAnalyses) {
      lines.push('')
      lines.push(`### ${r.programName}/${r.routineName}`)
      lines.push(`**Purpose**: ${r.purpose}`)
      if (r.sequenceFlow) {
        lines.push(`**Sequence**: ${r.sequenceFlow}`)
      }
      if (r.keyLogic) {
        lines.push(`**Key Logic**: ${r.keyLogic}`)
      }
      if (r.dependencies) {
        lines.push(`**Dependencies**: ${r.dependencies}`)
      }
      if (r.safetyNotes) {
        lines.push(`**Safety**: ${r.safetyNotes}`)
      }
    }
  }

  // Program structure (lightweight)
  lines.push('')
  lines.push('## Program Structure')
  for (const program of ctx.programs) {
    lines.push(`- **${program.name}**: ${program.routines.map(r => `${r.name} (${r.rungCount} rungs)`).join(', ')}`)
  }

  // Tags summary
  const controllerTags = ctx.tags.filter(t => t.scope === 'controller')
  const describedTags = ctx.tags.filter(t => t.description).slice(0, 30)
  lines.push('')
  lines.push(`## Tags: ${controllerTags.length} controller-scope, ${ctx.tags.length - controllerTags.length} program-scope`)

  if (describedTags.length > 0) {
    lines.push('')
    lines.push('### Key Tags with Descriptions:')
    for (const tag of describedTags) {
      lines.push(`- ${tag.name} (${tag.dataType}): ${tag.description}`)
    }
  }

  return lines.join('\n')
}

/**
 * Stream chat with pre-analyzed project context
 */
export async function streamChatWithAnalyzedProject(
  message: string,
  analysisContext: AnalyzedProjectContext,
  history: ChatMessage[] = []
) {
  const contextSummary = buildAnalyzedContextSummary(analysisContext)

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...history.map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message }
  ]

  const stream = await anthropic.messages.stream({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 8192,
    system: `${CHAT_SYSTEM_PROMPT}

## Current Project Context (Pre-Analyzed):
${contextSummary}

Note: This context is from a pre-computed analysis. If you need to see the actual raw ladder logic for specific rungs, tell the user which routine/rung you need and they can provide it.`,
    messages
  })

  return new ReadableStream({
    async start(controller) {
      for await (const event of stream) {
        if (event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta') {
          controller.enqueue(new TextEncoder().encode(event.delta.text))
        }
      }
      controller.close()
    }
  })
}
