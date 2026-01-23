import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface CallNode {
  routine: string
  program: string
  calls: string[]
  calledBy: string[]
  depth: number
}

interface CallTree {
  nodes: Record<string, CallNode>
  roots: string[] // routines that are entry points (Main or not called by anyone)
  orphans: string[] // routines never called
  circular: string[][] // circular reference chains
}

// GET - Get call tree for a project
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

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
            }
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Build call tree
    const nodes: Record<string, CallNode> = {}
    const jsrCalls: { from: string; to: string; program: string }[] = []

    // First pass: create nodes for all routines
    for (const program of project.programs) {
      for (const routine of program.routines) {
        const key = `${program.name}/${routine.name}`
        nodes[key] = {
          routine: routine.name,
          program: program.name,
          calls: [],
          calledBy: [],
          depth: 0
        }

        // Find JSR calls in this routine
        for (const rung of routine.rungs) {
          const jsrRegex = /JSR\(([^,)]+)/gi
          let match

          while ((match = jsrRegex.exec(rung.rawText)) !== null) {
            const calledRoutine = match[1].trim()
            jsrCalls.push({
              from: key,
              to: calledRoutine,
              program: program.name
            })
          }
        }
      }
    }

    // Second pass: resolve JSR calls
    for (const call of jsrCalls) {
      // JSR can call routine by name (same program) or full path
      let targetKey = call.to.includes('/') ? call.to : `${call.program}/${call.to}`

      // If not found, try to find routine with that name in any program
      if (!nodes[targetKey]) {
        const found = Object.keys(nodes).find(k => k.endsWith(`/${call.to}`))
        if (found) targetKey = found
      }

      if (nodes[call.from] && nodes[targetKey]) {
        if (!nodes[call.from].calls.includes(targetKey)) {
          nodes[call.from].calls.push(targetKey)
        }
        if (!nodes[targetKey].calledBy.includes(call.from)) {
          nodes[targetKey].calledBy.push(call.from)
        }
      }
    }

    // Find roots (Main routines or routines not called by anyone)
    const roots: string[] = []
    const orphans: string[] = []

    for (const [key, node] of Object.entries(nodes)) {
      if (node.routine.toLowerCase() === 'main') {
        roots.push(key)
      } else if (node.calledBy.length === 0 && node.calls.length > 0) {
        roots.push(key)
      } else if (node.calledBy.length === 0 && node.calls.length === 0) {
        // Only consider it orphan if it's not Main and has no calls
        if (node.routine.toLowerCase() !== 'main') {
          orphans.push(key)
        }
      }
    }

    // Calculate depths from roots
    function calculateDepth(key: string, visited: Set<string>, depth: number) {
      if (visited.has(key)) return
      visited.add(key)

      const node = nodes[key]
      if (node) {
        node.depth = Math.max(node.depth, depth)
        for (const called of node.calls) {
          calculateDepth(called, visited, depth + 1)
        }
      }
    }

    for (const root of roots) {
      calculateDepth(root, new Set(), 0)
    }

    // Detect circular references
    const circular: string[][] = []
    function detectCircular(key: string, path: string[]): void {
      if (path.includes(key)) {
        const cycleStart = path.indexOf(key)
        const cycle = [...path.slice(cycleStart), key]
        // Check if we already have this cycle
        const cycleStr = cycle.sort().join(',')
        if (!circular.some(c => c.sort().join(',') === cycleStr)) {
          circular.push(cycle)
        }
        return
      }

      const node = nodes[key]
      if (node) {
        for (const called of node.calls) {
          detectCircular(called, [...path, key])
        }
      }
    }

    for (const root of Object.keys(nodes)) {
      detectCircular(root, [])
    }

    // Build hierarchical tree for visualization
    function buildTree(key: string, visited: Set<string>): object | null {
      if (visited.has(key)) {
        return { name: key, circular: true }
      }
      visited.add(key)

      const node = nodes[key]
      if (!node) return null

      return {
        name: node.routine,
        fullPath: key,
        program: node.program,
        children: node.calls.map(c => buildTree(c, new Set(visited))).filter(Boolean)
      }
    }

    const trees = roots.map(r => buildTree(r, new Set()))

    return NextResponse.json({
      projectId: id,
      projectName: project.name,
      stats: {
        totalRoutines: Object.keys(nodes).length,
        totalCalls: jsrCalls.length,
        entryPoints: roots.length,
        orphanRoutines: orphans.length,
        circularReferences: circular.length
      },
      roots,
      orphans,
      circular,
      nodes,
      trees
    })

  } catch (error) {
    console.error('Error building call tree:', error)
    return NextResponse.json(
      { error: 'Failed to build call tree' },
      { status: 500 }
    )
  }
}
