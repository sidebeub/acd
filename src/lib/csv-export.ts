/**
 * CSV Export Utility
 *
 * Generates CSV files for tag/address data from PLC projects
 */

export interface TagExportData {
  tagName: string
  rawAddress: string
  description: string
  dataType: string
  scope: string
  instructionTypes: string[]
  usageCount: number
}

/**
 * Escape a value for CSV (handle commas, quotes, newlines)
 */
function escapeCSV(value: string | number | undefined | null): string {
  if (value === undefined || value === null) {
    return ''
  }
  const str = String(value)
  // If the value contains comma, quote, or newline, wrap in quotes and escape internal quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"'
  }
  return str
}

/**
 * Generate CSV content from tag export data
 */
export function generateTagCSV(tags: TagExportData[]): string {
  const headers = [
    'Tag/Symbol Name',
    'Raw PLC Address',
    'Description',
    'Data Type',
    'Scope',
    'Instruction Types',
    'Usage Count'
  ]

  const rows = tags.map(tag => [
    escapeCSV(tag.tagName),
    escapeCSV(tag.rawAddress),
    escapeCSV(tag.description),
    escapeCSV(tag.dataType),
    escapeCSV(tag.scope),
    escapeCSV(tag.instructionTypes.join('; ')),
    escapeCSV(tag.usageCount)
  ].join(','))

  return [headers.join(','), ...rows].join('\r\n')
}

/**
 * Trigger a file download in the browser
 */
export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Generate a filename with project name and current date
 */
export function generateCSVFilename(projectName: string): string {
  const sanitizedName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_')
  const date = new Date().toISOString().split('T')[0] // YYYY-MM-DD
  return `${sanitizedName}_Tags_${date}.csv`
}

/**
 * Extract tag usage data from parsed rungs
 * Works with both L5X/ACD and RSS file formats
 */
export interface RungData {
  rawText: string
  instructions?: string | null // JSON string of instructions
}

export interface ProgramData {
  name: string
  routines: {
    name: string
    rungs: RungData[]
  }[]
}

export interface TagData {
  name: string
  dataType: string
  scope: string
  description: string | null
}

interface TagUsageMap {
  [tagName: string]: {
    rawAddress: string
    description: string
    dataType: string
    scope: string
    instructionTypes: Set<string>
    usageCount: number
  }
}

/**
 * Build a comprehensive tag export list from project data
 * Combines tag definitions with usage analysis from rungs
 */
export function buildTagExportData(
  tags: TagData[],
  programs: ProgramData[]
): TagExportData[] {
  const tagUsage: TagUsageMap = {}

  // Initialize from tag definitions
  for (const tag of tags) {
    const key = tag.name.toLowerCase()
    tagUsage[key] = {
      rawAddress: tag.name, // For L5X/ACD, the tag name is the address
      description: tag.description || '',
      dataType: tag.dataType || 'Unknown',
      scope: tag.scope || 'controller',
      instructionTypes: new Set(),
      usageCount: 0
    }
  }

  // Analyze rungs for usage data
  const instructionRegex = /([A-Z_][A-Z0-9_]*)\(([^)]*)\)/gi

  for (const program of programs) {
    for (const routine of program.routines) {
      for (const rung of routine.rungs) {
        let match
        const regex = new RegExp(instructionRegex.source, 'gi')

        while ((match = regex.exec(rung.rawText)) !== null) {
          const instructionType = match[1].toUpperCase()
          const operandsStr = match[2]

          // Parse operands
          const operands = parseOperands(operandsStr)

          for (const operand of operands) {
            if (!operand || /^-?\d+(\.\d+)?$/.test(operand)) continue

            // Extract the tag name and raw address
            const { tagName, rawAddress } = extractTagInfo(operand)
            if (!tagName) continue

            const key = tagName.toLowerCase()

            // Create entry if not exists (for tags found in code but not in tag database)
            if (!tagUsage[key]) {
              tagUsage[key] = {
                rawAddress: rawAddress,
                description: '',
                dataType: 'Unknown',
                scope: 'unknown',
                instructionTypes: new Set(),
                usageCount: 0
              }
            }

            // Update raw address if we have a more specific one
            if (rawAddress && rawAddress !== tagName) {
              tagUsage[key].rawAddress = rawAddress
            }

            tagUsage[key].instructionTypes.add(instructionType)
            tagUsage[key].usageCount++
          }
        }
      }
    }
  }

  // Convert to array format
  const result: TagExportData[] = []
  for (const [key, usage] of Object.entries(tagUsage)) {
    // Find the original tag name (preserve case)
    const originalTag = tags.find(t => t.name.toLowerCase() === key)
    result.push({
      tagName: originalTag?.name || key,
      rawAddress: usage.rawAddress,
      description: usage.description,
      dataType: usage.dataType,
      scope: usage.scope,
      instructionTypes: Array.from(usage.instructionTypes).sort(),
      usageCount: usage.usageCount
    })
  }

  // Sort by tag name
  return result.sort((a, b) => a.tagName.localeCompare(b.tagName))
}

/**
 * Parse operands from an instruction string
 */
function parseOperands(operandsStr: string): string[] {
  const operands: string[] = []
  let current = ''
  let depth = 0

  for (const char of operandsStr) {
    if (char === '(' || char === '[') {
      depth++
      current += char
    } else if (char === ')' || char === ']') {
      depth--
      current += char
    } else if (char === ',' && depth === 0) {
      if (current.trim()) operands.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  if (current.trim()) operands.push(current.trim())
  return operands
}

/**
 * Extract tag name and raw address from an operand
 * Handles the special "TagName§RawAddress" format used by the L5X parser
 * Also handles RSS-style addresses like B3:0/5, T4:0, N7:0, etc.
 */
function extractTagInfo(operand: string): { tagName: string | null, rawAddress: string } {
  // Check for the special format with raw address
  if (operand.includes('\u00A7')) { // § character
    const [tagName, rawAddress] = operand.split('\u00A7')
    return {
      tagName: extractBaseTagName(tagName),
      rawAddress: rawAddress || tagName
    }
  }

  // Standard format - extract base tag name
  const tagName = extractBaseTagName(operand)
  return { tagName, rawAddress: operand }
}

/**
 * Extract the base tag name from an operand
 */
function extractBaseTagName(operand: string): string | null {
  // Match tag name patterns:
  // - Standard tags: MyTag, MyTag.Member, MyTag[0], MyTag[0].Member
  // - RSS addresses: B3:0, B3:0/5, T4:0.DN, N7:0
  const match = operand.match(/^([A-Za-z_][A-Za-z0-9_]*|\w\d+:\d+)/)
  return match ? match[1] : null
}
