import { NextRequest, NextResponse } from 'next/server'
import {
  INSTRUCTIONS,
  DEVICE_PATTERNS,
  getInstructionCategories,
  getInstructionsByCategory,
  getInstructionExplanation,
  ExplanationMode
} from '@/lib/instruction-library'

// GET - Get all instructions or by category
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const instruction = searchParams.get('instruction')
  const mode = (searchParams.get('mode') || 'friendly') as ExplanationMode

  // Get specific instruction
  if (instruction) {
    const inst = INSTRUCTIONS[instruction.toUpperCase()]
    if (!inst) {
      return NextResponse.json({ error: 'Instruction not found' }, { status: 404 })
    }
    return NextResponse.json({
      instruction: instruction.toUpperCase(),
      ...inst
    })
  }

  // Get instructions by category
  if (category) {
    const instructions = getInstructionsByCategory(category)
    const details = instructions.map(name => ({
      name,
      ...INSTRUCTIONS[name]
    }))
    return NextResponse.json({
      category,
      count: instructions.length,
      instructions: details
    })
  }

  // Get overview
  const categories = getInstructionCategories()
  const totalInstructions = Object.keys(INSTRUCTIONS).length
  const totalDevicePatterns = DEVICE_PATTERNS.length

  return NextResponse.json({
    totalInstructions,
    totalDevicePatterns,
    categories: categories.map(cat => ({
      name: cat,
      count: getInstructionsByCategory(cat).length
    })),
    deviceTypes: DEVICE_PATTERNS.map(p => ({
      type: p.deviceType,
      friendlyName: p.friendlyName,
      hasTroubleshooting: !!p.troubleshooting
    }))
  })
}

// POST - Explain raw instruction(s)
export async function POST(request: NextRequest) {
  try {
    const { instruction, operands = [], mode = 'friendly' } = await request.json()

    if (!instruction) {
      return NextResponse.json({ error: 'instruction is required' }, { status: 400 })
    }

    const explanationMode: ExplanationMode = ['friendly', 'technical', 'operator'].includes(mode)
      ? mode as ExplanationMode
      : 'friendly'

    const explanation = getInstructionExplanation(instruction, operands, explanationMode)

    if (!explanation) {
      return NextResponse.json({
        instruction: instruction.toUpperCase(),
        operands,
        explanation: null,
        found: false,
        message: `Instruction "${instruction}" not found in library`
      })
    }

    const inst = INSTRUCTIONS[instruction.toUpperCase()]

    return NextResponse.json({
      instruction: instruction.toUpperCase(),
      operands,
      explanation,
      found: true,
      category: inst?.category,
      icon: inst?.icon
    })
  } catch (error) {
    console.error('Error explaining instruction:', error)
    return NextResponse.json(
      { error: 'Failed to explain instruction' },
      { status: 500 }
    )
  }
}
