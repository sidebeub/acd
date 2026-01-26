import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

interface SimilarRung {
  rungId: string
  program: string
  routine: string
  rungNumber: number
  rungText: string
  rungComment?: string
  similarity: number
  matchType: 'exact' | 'structure' | 'pattern' | 'partial'
  matchDetails: string
}

// Extract instruction pattern from rung text
function extractInstructionPattern(text: string): string[] {
  const instructionRegex = /([A-Z_][A-Z0-9_]*)\(/gi
  const instructions: string[] = []
  let match
  while ((match = instructionRegex.exec(text)) !== null) {
    instructions.push(match[1].toUpperCase())
  }
  return instructions
}

// Extract tag base names (strip array indices and member access)
function extractTagBases(text: string): string[] {
  const tagRegex = /\(([^,\)]+)/g
  const bases: string[] = []
  let match
  while ((match = tagRegex.exec(text)) !== null) {
    // Get base tag name (before . or [)
    const tag = match[1].trim()
    const base = tag.split(/[\.\[]/)[0]
    if (base && !bases.includes(base) && !/^\d+$/.test(base)) {
      bases.push(base)
    }
  }
  return bases
}

// Calculate similarity between two instruction patterns
function patternSimilarity(pattern1: string[], pattern2: string[]): number {
  if (pattern1.length === 0 || pattern2.length === 0) return 0
  if (pattern1.join(',') === pattern2.join(',')) return 1

  // LCS-based similarity
  const longer = pattern1.length >= pattern2.length ? pattern1 : pattern2
  const shorter = pattern1.length < pattern2.length ? pattern1 : pattern2

  let matches = 0
  let lastMatchIndex = -1

  for (const inst of shorter) {
    const idx = longer.indexOf(inst, lastMatchIndex + 1)
    if (idx !== -1) {
      matches++
      lastMatchIndex = idx
    }
  }

  return matches / Math.max(pattern1.length, pattern2.length)
}

// Calculate tag base similarity
function tagSimilarity(tags1: string[], tags2: string[]): number {
  if (tags1.length === 0 || tags2.length === 0) return 0

  const set1 = new Set(tags1.map(t => t.toLowerCase()))
  const set2 = new Set(tags2.map(t => t.toLowerCase()))

  let intersection = 0
  for (const tag of set1) {
    if (set2.has(tag)) intersection++
  }

  return intersection / Math.max(set1.size, set2.size)
}

// Normalize rung text for exact match comparison
function normalizeRung(text: string): string {
  return text
    .replace(/\s+/g, '')
    .replace(/\[\d+\]/g, '[*]') // Replace array indices
    .toLowerCase()
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const searchParams = request.nextUrl.searchParams
  const rungText = searchParams.get('rungText')
  const excludeRungId = searchParams.get('excludeRungId')
  const limit = parseInt(searchParams.get('limit') || '20')

  if (!rungText) {
    return NextResponse.json({ error: 'rungText parameter required' }, { status: 400 })
  }

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

    const sourcePattern = extractInstructionPattern(rungText)
    const sourceTagBases = extractTagBases(rungText)
    const sourceNormalized = normalizeRung(rungText)

    const similarRungs: SimilarRung[] = []

    for (const program of project.programs) {
      for (const routine of program.routines) {
        for (const rung of routine.rungs) {
          // Skip the source rung if provided
          if (excludeRungId && rung.id === excludeRungId) continue

          const targetPattern = extractInstructionPattern(rung.rawText)
          const targetTagBases = extractTagBases(rung.rawText)
          const targetNormalized = normalizeRung(rung.rawText)

          // Check for exact structural match (same logic, different indices)
          if (sourceNormalized === targetNormalized) {
            similarRungs.push({
              rungId: rung.id,
              program: program.name,
              routine: routine.name,
              rungNumber: rung.number,
              rungText: rung.rawText,
              rungComment: rung.comment || undefined,
              similarity: 1.0,
              matchType: 'exact',
              matchDetails: 'Identical logic structure'
            })
            continue
          }

          // Calculate pattern similarity
          const patternSim = patternSimilarity(sourcePattern, targetPattern)
          const tagSim = tagSimilarity(sourceTagBases, targetTagBases)

          // Weighted similarity score
          const similarity = (patternSim * 0.7) + (tagSim * 0.3)

          if (similarity >= 0.5) {
            let matchType: 'structure' | 'pattern' | 'partial' = 'partial'
            let matchDetails = ''

            if (patternSim === 1.0) {
              matchType = 'structure'
              matchDetails = `Same instruction sequence (${sourcePattern.length} instructions)`
            } else if (patternSim >= 0.8) {
              matchType = 'pattern'
              matchDetails = `Similar pattern: ${Math.round(patternSim * 100)}% instruction match`
            } else {
              matchDetails = `Partial match: ${Math.round(similarity * 100)}% overall similarity`
            }

            // Add tag overlap info
            const commonTags = sourceTagBases.filter(t =>
              targetTagBases.some(tt => tt.toLowerCase() === t.toLowerCase())
            )
            if (commonTags.length > 0) {
              matchDetails += ` | Shared tags: ${commonTags.slice(0, 3).join(', ')}${commonTags.length > 3 ? '...' : ''}`
            }

            similarRungs.push({
              rungId: rung.id,
              program: program.name,
              routine: routine.name,
              rungNumber: rung.number,
              rungText: rung.rawText,
              rungComment: rung.comment || undefined,
              similarity,
              matchType,
              matchDetails
            })
          }
        }
      }
    }

    // Sort by similarity (descending) and limit results
    similarRungs.sort((a, b) => b.similarity - a.similarity)
    const results = similarRungs.slice(0, limit)

    // Group by match type for summary
    const summary = {
      exact: results.filter(r => r.matchType === 'exact').length,
      structure: results.filter(r => r.matchType === 'structure').length,
      pattern: results.filter(r => r.matchType === 'pattern').length,
      partial: results.filter(r => r.matchType === 'partial').length,
      total: results.length
    }

    return NextResponse.json({
      sourcePattern,
      sourceTagBases,
      summary,
      similarRungs: results
    })

  } catch (error) {
    console.error('Error finding similar rungs:', error)
    return NextResponse.json(
      { error: 'Failed to find similar rungs' },
      { status: 500 }
    )
  }
}
