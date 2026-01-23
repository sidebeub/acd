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
