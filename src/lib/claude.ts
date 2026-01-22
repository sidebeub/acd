import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

/**
 * Explain a PLC rung in human-readable terms
 */
export async function explainRung(
  rungText: string,
  tags: Record<string, { dataType: string; description?: string }>
): Promise<string> {
  const tagContext = Object.entries(tags)
    .map(([name, info]) => `- ${name}: ${info.dataType}${info.description ? ` (${info.description})` : ''}`)
    .join('\n')

  const response = await anthropic.messages.create({
    model: 'claude-3-5-haiku-20241022',
    max_tokens: 1024,
    system: `You are an expert PLC programmer explaining ladder logic to maintenance technicians.
Explain what the rung does in plain English, focusing on the real-world effect.
Be concise (2-3 sentences max). Use the tag descriptions when available.
Format: Start with what triggers the action, then what happens.`,
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
