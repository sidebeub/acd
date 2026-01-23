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
