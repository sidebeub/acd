import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET - Generate comprehensive project report
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const { searchParams } = new URL(request.url)
  const format = searchParams.get('format') || 'json'

  try {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        programs: {
          include: {
            routines: {
              include: {
                rungs: true
              }
            },
            localTags: true
          }
        },
        tags: true,
        tasks: true,
        modules: true,
        dataTypes: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Calculate statistics
    const totalRoutines = project.programs.reduce((sum, p) => sum + p.routines.length, 0)
    const totalRungs = project.programs.reduce((sum, p) =>
      sum + p.routines.reduce((rSum, r) => rSum + r.rungs.length, 0), 0)
    const totalLocalTags = project.programs.reduce((sum, p) => sum + p.localTags.length, 0)

    // Analyze instruction usage
    const instructionCounts: Record<string, number> = {}
    const instructionRegex = /([A-Z_][A-Z0-9_]*)\(/gi

    for (const program of project.programs) {
      for (const routine of program.routines) {
        for (const rung of routine.rungs) {
          let match
          while ((match = instructionRegex.exec(rung.rawText)) !== null) {
            const instr = match[1].toUpperCase()
            instructionCounts[instr] = (instructionCounts[instr] || 0) + 1
          }
        }
      }
    }

    // Sort instructions by usage
    const topInstructions = Object.entries(instructionCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([name, count]) => ({ name, count }))

    // Analyze tag usage by data type
    const tagsByType: Record<string, number> = {}
    for (const tag of project.tags) {
      const type = tag.dataType || 'Unknown'
      tagsByType[type] = (tagsByType[type] || 0) + 1
    }

    // Build report data
    const reportData = {
      project: {
        id: project.id,
        name: project.name,
        fileName: project.fileName,
        processorType: project.processorType,
        softwareVersion: project.softwareVersion,
        createdAt: project.createdAt
      },
      summary: {
        programs: project.programs.length,
        routines: totalRoutines,
        rungs: totalRungs,
        controllerTags: project.tags.length,
        localTags: totalLocalTags,
        tasks: project.tasks.length,
        modules: project.modules.length,
        dataTypes: project.dataTypes.length
      },
      programs: project.programs.map(p => ({
        name: p.name,
        description: p.description,
        mainRoutine: p.mainRoutineName,
        disabled: p.disabled,
        routineCount: p.routines.length,
        rungCount: p.routines.reduce((sum, r) => sum + r.rungs.length, 0),
        localTagCount: p.localTags.length,
        routines: p.routines.map(r => ({
          name: r.name,
          type: r.type,
          description: r.description,
          rungCount: r.rungs.length
        }))
      })),
      tasks: project.tasks.map(t => ({
        name: t.name,
        type: t.type,
        rate: t.rate,
        priority: t.priority,
        watchdog: t.watchdog,
        inhibited: t.inhibitTask,
        programs: JSON.parse(t.scheduledPrograms || '[]')
      })),
      modules: project.modules.map(m => ({
        name: m.name,
        catalogNumber: m.catalogNumber,
        vendor: m.vendor,
        slot: m.slot,
        parent: m.parentModule
      })),
      tagAnalysis: {
        totalTags: project.tags.length,
        byDataType: Object.entries(tagsByType)
          .sort((a, b) => b[1] - a[1])
          .map(([type, count]) => ({ type, count })),
        topInstructions
      },
      dataTypes: project.dataTypes.map(dt => ({
        name: dt.name,
        family: dt.family,
        description: dt.description,
        memberCount: JSON.parse(dt.members || '[]').length
      }))
    }

    if (format === 'markdown') {
      return generateMarkdownReport(reportData)
    } else if (format === 'html') {
      return generateHtmlReport(reportData)
    } else if (format === 'operator') {
      return generateOperatorGuide(project)
    }

    return NextResponse.json(reportData)

  } catch (error) {
    console.error('Error generating report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}

function generateMarkdownReport(data: any): NextResponse {
  const lines: string[] = []

  lines.push(`# PLC Project Report: ${data.project.name}`)
  lines.push('')
  lines.push(`**File:** ${data.project.fileName}`)
  lines.push(`**Processor:** ${data.project.processorType || 'N/A'}`)
  lines.push(`**Software Version:** ${data.project.softwareVersion || 'N/A'}`)
  lines.push(`**Generated:** ${new Date().toISOString()}`)
  lines.push('')

  lines.push('## Summary')
  lines.push('')
  lines.push(`| Metric | Count |`)
  lines.push(`|--------|-------|`)
  lines.push(`| Programs | ${data.summary.programs} |`)
  lines.push(`| Routines | ${data.summary.routines} |`)
  lines.push(`| Rungs | ${data.summary.rungs} |`)
  lines.push(`| Controller Tags | ${data.summary.controllerTags} |`)
  lines.push(`| Local Tags | ${data.summary.localTags} |`)
  lines.push(`| Tasks | ${data.summary.tasks} |`)
  lines.push(`| Modules | ${data.summary.modules} |`)
  lines.push(`| Data Types | ${data.summary.dataTypes} |`)
  lines.push('')

  lines.push('## Programs')
  lines.push('')
  for (const prog of data.programs) {
    lines.push(`### ${prog.name}`)
    if (prog.description) lines.push(`*${prog.description}*`)
    lines.push('')
    lines.push(`- **Main Routine:** ${prog.mainRoutine || 'N/A'}`)
    lines.push(`- **Status:** ${prog.disabled ? 'Disabled' : 'Enabled'}`)
    lines.push(`- **Routines:** ${prog.routineCount}`)
    lines.push(`- **Rungs:** ${prog.rungCount}`)
    lines.push(`- **Local Tags:** ${prog.localTagCount}`)
    lines.push('')

    if (prog.routines.length > 0) {
      lines.push('| Routine | Type | Rungs |')
      lines.push('|---------|------|-------|')
      for (const r of prog.routines) {
        lines.push(`| ${r.name} | ${r.type} | ${r.rungCount} |`)
      }
      lines.push('')
    }
  }

  lines.push('## Tasks')
  lines.push('')
  if (data.tasks.length > 0) {
    lines.push('| Name | Type | Rate (ms) | Priority |')
    lines.push('|------|------|-----------|----------|')
    for (const task of data.tasks) {
      lines.push(`| ${task.name} | ${task.type} | ${task.rate || 'N/A'} | ${task.priority || 'N/A'} |`)
    }
  } else {
    lines.push('No tasks defined.')
  }
  lines.push('')

  lines.push('## Modules')
  lines.push('')
  if (data.modules.length > 0) {
    lines.push('| Name | Catalog Number | Slot |')
    lines.push('|------|----------------|------|')
    for (const mod of data.modules) {
      lines.push(`| ${mod.name} | ${mod.catalogNumber || 'N/A'} | ${mod.slot ?? 'N/A'} |`)
    }
  } else {
    lines.push('No modules defined.')
  }
  lines.push('')

  lines.push('## Tag Analysis')
  lines.push('')
  lines.push('### Tags by Data Type')
  lines.push('| Data Type | Count |')
  lines.push('|-----------|-------|')
  for (const entry of data.tagAnalysis.byDataType.slice(0, 15)) {
    lines.push(`| ${entry.type} | ${entry.count} |`)
  }
  lines.push('')

  lines.push('### Top Instructions')
  lines.push('| Instruction | Count |')
  lines.push('|-------------|-------|')
  for (const entry of data.tagAnalysis.topInstructions) {
    lines.push(`| ${entry.name} | ${entry.count} |`)
  }
  lines.push('')

  lines.push('## User-Defined Data Types')
  lines.push('')
  if (data.dataTypes.length > 0) {
    lines.push('| Name | Family | Members |')
    lines.push('|------|--------|---------|')
    for (const dt of data.dataTypes) {
      lines.push(`| ${dt.name} | ${dt.family || 'N/A'} | ${dt.memberCount} |`)
    }
  } else {
    lines.push('No user-defined data types.')
  }
  lines.push('')

  const markdown = lines.join('\n')

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown',
      'Content-Disposition': `attachment; filename="${data.project.name}-report.md"`
    }
  })
}

function generateHtmlReport(data: any): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>PLC Report: ${data.project.name}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }
    h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
    h2 { color: #374151; margin-top: 30px; }
    h3 { color: #4b5563; }
    table { border-collapse: collapse; width: 100%; margin: 15px 0; }
    th, td { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
    th { background: #f3f4f6; font-weight: 600; }
    tr:nth-child(even) { background: #f9fafb; }
    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
    .summary-card { background: #f3f4f6; padding: 15px; border-radius: 8px; text-align: center; }
    .summary-card .value { font-size: 24px; font-weight: bold; color: #3b82f6; }
    .summary-card .label { color: #6b7280; font-size: 14px; }
    .meta { color: #6b7280; margin-bottom: 20px; }
    @media print { body { max-width: none; } }
  </style>
</head>
<body>
  <h1>PLC Project Report: ${data.project.name}</h1>
  <div class="meta">
    <p><strong>File:</strong> ${data.project.fileName}</p>
    <p><strong>Processor:</strong> ${data.project.processorType || 'N/A'}</p>
    <p><strong>Software Version:</strong> ${data.project.softwareVersion || 'N/A'}</p>
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
  </div>

  <h2>Summary</h2>
  <div class="summary-grid">
    <div class="summary-card"><div class="value">${data.summary.programs}</div><div class="label">Programs</div></div>
    <div class="summary-card"><div class="value">${data.summary.routines}</div><div class="label">Routines</div></div>
    <div class="summary-card"><div class="value">${data.summary.rungs}</div><div class="label">Rungs</div></div>
    <div class="summary-card"><div class="value">${data.summary.controllerTags}</div><div class="label">Tags</div></div>
  </div>

  <h2>Programs</h2>
  <table>
    <tr><th>Name</th><th>Main Routine</th><th>Routines</th><th>Rungs</th><th>Local Tags</th></tr>
    ${data.programs.map((p: any) => `<tr><td>${p.name}</td><td>${p.mainRoutine || 'N/A'}</td><td>${p.routineCount}</td><td>${p.rungCount}</td><td>${p.localTagCount}</td></tr>`).join('')}
  </table>

  <h2>Tasks</h2>
  <table>
    <tr><th>Name</th><th>Type</th><th>Rate (ms)</th><th>Priority</th></tr>
    ${data.tasks.map((t: any) => `<tr><td>${t.name}</td><td>${t.type}</td><td>${t.rate || 'N/A'}</td><td>${t.priority || 'N/A'}</td></tr>`).join('')}
  </table>

  <h2>Modules</h2>
  <table>
    <tr><th>Name</th><th>Catalog Number</th><th>Slot</th></tr>
    ${data.modules.map((m: any) => `<tr><td>${m.name}</td><td>${m.catalogNumber || 'N/A'}</td><td>${m.slot ?? 'N/A'}</td></tr>`).join('')}
  </table>

  <h2>Tag Analysis</h2>
  <h3>Tags by Data Type</h3>
  <table>
    <tr><th>Data Type</th><th>Count</th></tr>
    ${data.tagAnalysis.byDataType.slice(0, 15).map((e: any) => `<tr><td>${e.type}</td><td>${e.count}</td></tr>`).join('')}
  </table>

  <h3>Top Instructions</h3>
  <table>
    <tr><th>Instruction</th><th>Count</th></tr>
    ${data.tagAnalysis.topInstructions.map((e: any) => `<tr><td>${e.name}</td><td>${e.count}</td></tr>`).join('')}
  </table>
</body>
</html>`

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Content-Disposition': `attachment; filename="${data.project.name}-report.html"`
    }
  })
}

// Instruction explanations for operators
const INSTRUCTION_EXPLANATIONS: Record<string, (args: string[]) => string> = {
  'XIC': (args) => `When "${args[0]}" is ON`,
  'XIO': (args) => `When "${args[0]}" is OFF`,
  'OTE': (args) => `Turn ON "${args[0]}"`,
  'OTL': (args) => `Latch ON "${args[0]}" (stays ON until unlatched)`,
  'OTU': (args) => `Unlatch "${args[0]}" (turn OFF latched output)`,
  'TON': (args) => `Start timer "${args[0]}" (delays turning ON)`,
  'TOF': (args) => `Start timer "${args[0]}" (delays turning OFF)`,
  'RTO': (args) => `Start retentive timer "${args[0]}" (accumulates time)`,
  'CTU': (args) => `Count UP on "${args[0]}"`,
  'CTD': (args) => `Count DOWN on "${args[0]}"`,
  'RES': (args) => `Reset "${args[0]}" to zero`,
  'MOV': (args) => `Move value ${args[0]} to "${args[1]}"`,
  'ADD': (args) => `Add ${args[0]} + ${args[1]}, store in "${args[2]}"`,
  'SUB': (args) => `Subtract ${args[0]} - ${args[1]}, store in "${args[2]}"`,
  'MUL': (args) => `Multiply ${args[0]} × ${args[1]}, store in "${args[2]}"`,
  'DIV': (args) => `Divide ${args[0]} ÷ ${args[1]}, store in "${args[2]}"`,
  'EQU': (args) => `When ${args[0]} equals ${args[1]}`,
  'NEQ': (args) => `When ${args[0]} does NOT equal ${args[1]}`,
  'GRT': (args) => `When ${args[0]} is greater than ${args[1]}`,
  'GEQ': (args) => `When ${args[0]} is greater than or equal to ${args[1]}`,
  'LES': (args) => `When ${args[0]} is less than ${args[1]}`,
  'LEQ': (args) => `When ${args[0]} is less than or equal to ${args[1]}`,
  'JSR': (args) => `Jump to subroutine "${args[0]}"`,
  'JMP': (args) => `Jump to label "${args[0]}"`,
  'LBL': (args) => `Label "${args[0]}"`,
  'ONS': (args) => `One-shot using "${args[0]}" (triggers once per ON)`,
  'AFI': () => `Always False (disabled/bypassed)`,
  'NOP': () => `No operation (placeholder)`,
  'BST': () => `Branch start`,
  'BND': () => `Branch end`,
  'COP': (args) => `Copy from "${args[0]}" to "${args[1]}"`,
  'CLR': (args) => `Clear/zero "${args[0]}"`,
  'SQO': (args) => `Sequencer output using "${args[0]}"`,
  'SQI': (args) => `Sequencer input compare using "${args[0]}"`,
  'SQL': (args) => `Sequencer load using "${args[0]}"`,
}

// Parse a rung and extract instructions with their arguments
function parseRungInstructions(rungText: string): { instruction: string; args: string[] }[] {
  const results: { instruction: string; args: string[] }[] = []
  const instructionRegex = /([A-Z_][A-Z0-9_]*)\(([^)]*)\)/gi
  let match

  while ((match = instructionRegex.exec(rungText)) !== null) {
    const instruction = match[1].toUpperCase()
    const argsStr = match[2]

    // Parse arguments (handle nested parentheses and array brackets)
    const args: string[] = []
    let current = ''
    let depth = 0

    for (const char of argsStr) {
      if ((char === '(' || char === '[') && depth >= 0) {
        depth++
        current += char
      } else if ((char === ')' || char === ']') && depth > 0) {
        depth--
        current += char
      } else if (char === ',' && depth === 0) {
        if (current.trim()) args.push(current.trim())
        current = ''
      } else {
        current += char
      }
    }
    if (current.trim()) args.push(current.trim())

    results.push({ instruction, args })
  }

  return results
}

// Generate human-readable explanation for a rung
function explainRung(rungText: string, rungComment?: string | null): string {
  const instructions = parseRungInstructions(rungText)
  if (instructions.length === 0) return 'Empty rung'

  const conditions: string[] = []
  const actions: string[] = []

  for (const { instruction, args } of instructions) {
    const explainer = INSTRUCTION_EXPLANATIONS[instruction]
    if (!explainer) continue

    const explanation = explainer(args)

    // Categorize as condition or action
    if (['XIC', 'XIO', 'EQU', 'NEQ', 'GRT', 'GEQ', 'LES', 'LEQ', 'ONS', 'LIM'].includes(instruction)) {
      conditions.push(explanation)
    } else if (!['BST', 'BND', 'NOP'].includes(instruction)) {
      actions.push(explanation)
    }
  }

  let explanation = ''

  if (conditions.length > 0 && actions.length > 0) {
    explanation = `${conditions.join(' AND ')} → ${actions.join(', ')}`
  } else if (actions.length > 0) {
    explanation = `Always: ${actions.join(', ')}`
  } else if (conditions.length > 0) {
    explanation = `Condition check: ${conditions.join(' AND ')}`
  } else {
    explanation = 'Control flow instruction'
  }

  return explanation
}

// Detect safety-related tags
function isSafetyRelated(text: string): boolean {
  const safetyPatterns = [
    /e[-_]?stop|estop|emergency/i,
    /guard|door[-_]?sw|gate[-_]?sw/i,
    /light[-_]?curtain|lc[-_]/i,
    /safety|interlock|intlk/i,
    /fault|alarm|error/i,
    /overload|over[-_]?temp/i,
  ]
  return safetyPatterns.some(p => p.test(text))
}

function generateOperatorGuide(project: any): NextResponse {
  const lines: string[] = []

  lines.push(`# Operator Guide: ${project.name}`)
  lines.push('')
  lines.push(`This guide explains the PLC program in plain language for operators and maintenance personnel.`)
  lines.push('')
  lines.push(`**System:** ${project.processorType || 'PLC Controller'}`)
  lines.push(`**Generated:** ${new Date().toLocaleString()}`)
  lines.push('')
  lines.push('---')
  lines.push('')

  // Table of Contents
  lines.push('## Table of Contents')
  lines.push('')
  for (const program of project.programs) {
    lines.push(`- [${program.name}](#${program.name.toLowerCase().replace(/[^a-z0-9]/g, '-')})`)
  }
  lines.push('')
  lines.push('---')
  lines.push('')

  // Process each program
  for (const program of project.programs) {
    lines.push(`## ${program.name}`)
    lines.push('')

    if (program.description) {
      lines.push(`**Purpose:** ${program.description}`)
      lines.push('')
    }

    if (program.disabled) {
      lines.push('> ⚠️ **Note:** This program is currently DISABLED')
      lines.push('')
    }

    // Process each routine
    for (const routine of program.routines) {
      if (routine.rungs.length === 0) continue

      lines.push(`### ${routine.name}`)
      lines.push('')

      if (routine.description) {
        lines.push(`*${routine.description}*`)
        lines.push('')
      }

      // Group rungs by their comments (sections)
      let currentSection = ''
      let rungExplanations: { number: number; comment?: string; explanation: string; isSafety: boolean }[] = []

      for (const rung of routine.rungs.sort((a: any, b: any) => a.number - b.number)) {
        const explanation = explainRung(rung.rawText, rung.comment)
        const isSafety = isSafetyRelated(rung.rawText) || isSafetyRelated(rung.comment || '')

        rungExplanations.push({
          number: rung.number,
          comment: rung.comment || undefined,
          explanation,
          isSafety
        })
      }

      // Output explanations, grouping by comments
      for (const rung of rungExplanations) {
        if (rung.comment && rung.comment !== currentSection) {
          currentSection = rung.comment
          lines.push('')
          lines.push(`#### ${rung.comment}`)
          lines.push('')
        }

        const safetyMarker = rung.isSafety ? ' 🛡️' : ''
        lines.push(`- **Rung ${rung.number}${safetyMarker}:** ${rung.explanation}`)
      }

      lines.push('')
    }

    lines.push('---')
    lines.push('')
  }

  // Safety Summary Section
  lines.push('## Safety Summary')
  lines.push('')
  lines.push('The following tags and logic are related to safety systems. **Do not bypass or modify without proper authorization.**')
  lines.push('')

  const safetyTags = new Set<string>()
  const safetyPatterns = [
    { regex: /e[-_]?stop|estop|emergency/i, label: 'Emergency Stop' },
    { regex: /guard|door[-_]?sw|gate[-_]?sw/i, label: 'Guard/Door' },
    { regex: /light[-_]?curtain|lc[-_]/i, label: 'Light Curtain' },
    { regex: /interlock|intlk/i, label: 'Interlock' },
  ]

  for (const program of project.programs) {
    for (const routine of program.routines) {
      for (const rung of routine.rungs) {
        const tagRegex = /([A-Za-z_][A-Za-z0-9_]*(?:\.[A-Za-z_][A-Za-z0-9_]*)*)/g
        let match
        while ((match = tagRegex.exec(rung.rawText)) !== null) {
          const tag = match[1]
          for (const pattern of safetyPatterns) {
            if (pattern.regex.test(tag)) {
              safetyTags.add(`${tag} (${pattern.label})`)
            }
          }
        }
      }
    }
  }

  if (safetyTags.size > 0) {
    for (const tag of Array.from(safetyTags).sort()) {
      lines.push(`- 🛡️ ${tag}`)
    }
  } else {
    lines.push('No safety-related tags detected by pattern matching.')
  }

  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push('## Legend')
  lines.push('')
  lines.push('- **→** means "causes" or "results in"')
  lines.push('- **AND** means all conditions must be true')
  lines.push('- **ON/OFF** refers to the state of a bit or signal')
  lines.push('- **Latch** stays ON until explicitly unlatched')
  lines.push('- **Timer** delays an action by a set time')
  lines.push('- **Counter** tracks the number of occurrences')
  lines.push('- 🛡️ indicates safety-critical logic')
  lines.push('')

  const markdown = lines.join('\n')

  return new NextResponse(markdown, {
    headers: {
      'Content-Type': 'text/markdown',
      'Content-Disposition': `attachment; filename="${project.name}-operator-guide.md"`
    }
  })
}
