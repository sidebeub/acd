import { NextRequest, NextResponse } from 'next/server'
import {
  INSTRUCTIONS,
  DEVICE_PATTERNS,
  getInstructionCategories,
  getInstructionsByCategory,
  getInstructionExplanation,
  ExplanationMode
} from '@/lib/instruction-library'

// Extended instruction documentation with examples and notes
const INSTRUCTION_HELP: Record<string, {
  syntax: string
  parameters: Array<{ name: string; type: string; description: string }>
  examples?: string[]
  notes?: string[]
}> = {
  XIC: {
    syntax: 'XIC(bit)',
    parameters: [{ name: 'bit', type: 'BOOL', description: 'The bit to examine' }],
    examples: ['XIC(Input_Start)', 'XIC(Motor_Running.0)'],
    notes: ['Commonly used for examining input contacts', 'Can examine any bit in memory']
  },
  XIO: {
    syntax: 'XIO(bit)',
    parameters: [{ name: 'bit', type: 'BOOL', description: 'The bit to examine' }],
    examples: ['XIO(Emergency_Stop)', 'XIO(Fault_Active)'],
    notes: ['Commonly used for normally closed contacts', 'Inverted logic compared to XIC']
  },
  OTE: {
    syntax: 'OTE(bit)',
    parameters: [{ name: 'bit', type: 'BOOL', description: 'The bit to control' }],
    examples: ['OTE(Output_Lamp)', 'OTE(Motor_Command)'],
    notes: ['Controlled by rung condition every scan', 'Only use once per bit in a program']
  },
  OTL: {
    syntax: 'OTL(bit)',
    parameters: [{ name: 'bit', type: 'BOOL', description: 'The bit to latch' }],
    examples: ['OTL(Alarm_Latch)', 'OTL(Cycle_Started)'],
    notes: ['Bit stays ON even when rung goes false', 'Use OTU to unlatch']
  },
  OTU: {
    syntax: 'OTU(bit)',
    parameters: [{ name: 'bit', type: 'BOOL', description: 'The bit to unlatch' }],
    examples: ['OTU(Alarm_Latch)', 'OTU(Cycle_Started)'],
    notes: ['Used to reset latched bits', 'Typically paired with OTL']
  },
  TON: {
    syntax: 'TON(timer, preset, accum)',
    parameters: [
      { name: 'timer', type: 'TIMER', description: 'Timer tag' },
      { name: 'preset', type: 'DINT', description: 'Time delay in milliseconds' },
      { name: 'accum', type: 'DINT', description: 'Accumulated time (usually 0)' }
    ],
    examples: ['TON(Delay_Timer, 5000, 0)'],
    notes: ['Resets when rung goes false', 'DN bit is timer.DN, TT bit is timer.TT']
  },
  TOF: {
    syntax: 'TOF(timer, preset, accum)',
    parameters: [
      { name: 'timer', type: 'TIMER', description: 'Timer tag' },
      { name: 'preset', type: 'DINT', description: 'Time delay in milliseconds' },
      { name: 'accum', type: 'DINT', description: 'Accumulated time' }
    ],
    examples: ['TOF(Off_Delay, 3000, 0)'],
    notes: ['DN bit is ON while rung is true', 'Timing starts when rung goes false']
  },
  CTU: {
    syntax: 'CTU(counter, preset, accum)',
    parameters: [
      { name: 'counter', type: 'COUNTER', description: 'Counter tag' },
      { name: 'preset', type: 'DINT', description: 'Count target' },
      { name: 'accum', type: 'DINT', description: 'Current count' }
    ],
    examples: ['CTU(Part_Counter, 100, 0)'],
    notes: ['DN bit sets when ACC >= PRE', 'Use RES to reset']
  },
  CTD: {
    syntax: 'CTD(counter, preset, accum)',
    parameters: [
      { name: 'counter', type: 'COUNTER', description: 'Counter tag' },
      { name: 'preset', type: 'DINT', description: 'Count target' },
      { name: 'accum', type: 'DINT', description: 'Current count' }
    ],
    examples: ['CTD(Batch_Remaining, 50, 50)'],
    notes: ['DN bit sets when ACC <= 0', 'Often used with CTU']
  },
  MOV: {
    syntax: 'MOV(source, dest)',
    parameters: [
      { name: 'source', type: 'ANY', description: 'Value to copy' },
      { name: 'dest', type: 'ANY', description: 'Destination tag' }
    ],
    examples: ['MOV(100, Speed_SP)', 'MOV(Analog_In, Process_Value)'],
    notes: ['Types must be compatible', 'Converts between numeric types']
  },
  COP: {
    syntax: 'COP(source, dest, length)',
    parameters: [
      { name: 'source', type: 'ANY', description: 'Source array or structure' },
      { name: 'dest', type: 'ANY', description: 'Destination array or structure' },
      { name: 'length', type: 'DINT', description: 'Number of elements to copy' }
    ],
    examples: ['COP(Recipe_1, Active_Recipe, 1)'],
    notes: ['Copies entire structures', 'Length is in elements, not bytes']
  },
  JSR: {
    syntax: 'JSR(routine, input_params, return_params)',
    parameters: [
      { name: 'routine', type: 'ROUTINE', description: 'Routine name to call' },
      { name: 'input_params', type: 'ANY', description: 'Input parameters (optional)' },
      { name: 'return_params', type: 'ANY', description: 'Return parameters (optional)' }
    ],
    examples: ['JSR(Init_Routine, 0, 0)', 'JSR(Calc_Speed, Input_Val, Output_Val)'],
    notes: ['Called routine executes to completion', 'Use RET to return']
  }
}

// GET - Get all instructions or by category
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const instruction = searchParams.get('instruction')
  const mode = (searchParams.get('mode') || 'friendly') as ExplanationMode

  // Get specific instruction
  if (instruction) {
    const instName = instruction.toUpperCase()
    const inst = INSTRUCTIONS[instName]
    const help = INSTRUCTION_HELP[instName]
    if (!inst) {
      return NextResponse.json({ error: 'Instruction not found' }, { status: 404 })
    }
    return NextResponse.json({
      instruction: instName,
      ...inst,
      ...(help || {})
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
