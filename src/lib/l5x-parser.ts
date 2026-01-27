import { XMLParser } from 'fast-xml-parser'
import JSZip from 'jszip'

// Re-export RSS parser
export { parseRSS, isRSSFile, parseRss500Address, formatRss500Address } from './rss-parser'

// Types for parsed PLC data
export interface PlcProject {
  name: string
  processorType?: string
  softwareVersion?: string
  tags: PlcTag[]
  programs: PlcProgram[]
  tasks: PlcTask[]
  modules: PlcModule[]
  dataTypes: PlcDataType[]
}

export interface PlcTag {
  name: string
  dataType: string
  scope: string
  description?: string
  value?: string
  externalAccess?: string
  dimensions?: number[]
  aliasFor?: string
}

export interface PlcProgram {
  name: string
  description?: string
  mainRoutineName?: string
  disabled: boolean
  routines: PlcRoutine[]
  localTags: PlcTag[]
}

export interface PlcRoutine {
  name: string
  type: string
  description?: string
  rungs: PlcRung[]
}

export interface PlcRung {
  number: number
  comment?: string
  rawText: string
  instructions: PlcInstruction[]
}

export interface PlcInstruction {
  type: string
  operands: string[]
  branchLeg?: number      // For parallel branches: which leg (0=main, 1+=branches)
  branchLevel?: number    // Nesting depth (0=main, 1=first nest, 2=nested within nest, etc.)
  branchStart?: boolean   // True if this instruction starts a new branch group
}

export interface PlcTask {
  name: string
  type: string
  rate?: number
  priority?: number
  watchdog?: number
  inhibitTask: boolean
  scheduledPrograms: string[]
}

export interface PlcModule {
  name: string
  catalogNumber?: string
  vendor?: string
  productType?: string
  revision?: string
  slot?: number
  parentModule?: string
}

export interface PlcDataType {
  name: string
  family?: string
  description?: string
  members: Array<{ name: string; dataType: string; dimension?: number }>
}

/**
 * Parse an L5X file (XML format)
 */
export async function parseL5X(content: string): Promise<PlcProject> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    parseAttributeValue: true
  })

  const xml = parser.parse(content)
  const root = xml.RSLogix5000Content || xml

  // Get controller info
  const controller = root.Controller || {}
  const project: PlcProject = {
    name: controller['@_Name'] || 'Unknown',
    processorType: controller['@_ProcessorType'],
    softwareVersion: controller['@_SoftwareRevision'],
    tags: [],
    programs: [],
    tasks: [],
    modules: [],
    dataTypes: []
  }

  // Parse controller-scoped tags
  if (controller.Tags?.Tag) {
    const tags = Array.isArray(controller.Tags.Tag) ? controller.Tags.Tag : [controller.Tags.Tag]
    project.tags = tags.map((tag: Record<string, unknown>) => parseTag(tag, 'controller'))
  }

  // Parse programs
  if (controller.Programs?.Program) {
    const programs = Array.isArray(controller.Programs.Program)
      ? controller.Programs.Program
      : [controller.Programs.Program]
    project.programs = programs.map(parseProgram)
  }

  // Parse tasks
  if (controller.Tasks?.Task) {
    const tasks = Array.isArray(controller.Tasks.Task) ? controller.Tasks.Task : [controller.Tasks.Task]
    project.tasks = tasks.map(parseTask)
  }

  // Parse modules
  if (controller.Modules?.Module) {
    const modules = Array.isArray(controller.Modules.Module) ? controller.Modules.Module : [controller.Modules.Module]
    project.modules = modules.map(parseModule)
  }

  // Parse data types
  if (controller.DataTypes?.DataType) {
    const dataTypes = Array.isArray(controller.DataTypes.DataType)
      ? controller.DataTypes.DataType
      : [controller.DataTypes.DataType]
    project.dataTypes = dataTypes.map(parseDataType)
  }

  return project
}

/**
 * Parse an ACD file (ZIP containing L5X or XML controller data)
 */
export async function parseACD(buffer: ArrayBuffer): Promise<PlcProject> {
  const zip = await JSZip.loadAsync(buffer)
  const allFiles = Object.keys(zip.files)

  console.log('ACD file contents:', allFiles)

  // Find the L5X/XML file inside the ACD
  // ACD files can have different structures depending on Studio 5000 version
  let l5xContent: string | null = null
  let foundFile: string | null = null

  // Priority 1: Look for .L5X files
  for (const filename of allFiles) {
    if (filename.toLowerCase().endsWith('.l5x')) {
      const file = zip.files[filename]
      if (!file.dir) {
        l5xContent = await file.async('string')
        foundFile = filename
        console.log('Found L5X file:', filename)
        break
      }
    }
  }

  // Priority 2: Look for controller XML files (common in newer ACD formats)
  if (!l5xContent) {
    const controllerPatterns = [
      /controller.*\.xml$/i,
      /^[^/]+\.xml$/i,  // XML files at root level
      /content\.xml$/i,
      /project\.xml$/i
    ]

    for (const pattern of controllerPatterns) {
      for (const filename of allFiles) {
        if (pattern.test(filename)) {
          const file = zip.files[filename]
          if (!file.dir) {
            const content = await file.async('string')
            // Check if it looks like L5X content
            if (content.includes('RSLogix5000Content') || content.includes('Controller')) {
              l5xContent = content
              foundFile = filename
              console.log('Found controller XML:', filename)
              break
            }
          }
        }
      }
      if (l5xContent) break
    }
  }

  // Priority 3: Try any XML file that contains RSLogix5000Content or Controller
  if (!l5xContent) {
    for (const filename of allFiles) {
      if (filename.toLowerCase().endsWith('.xml')) {
        const file = zip.files[filename]
        if (!file.dir) {
          try {
            const content = await file.async('string')
            if (content.includes('RSLogix5000Content') ||
                content.includes('<Controller') ||
                content.includes('Controller Name=')) {
              l5xContent = content
              foundFile = filename
              console.log('Found XML with controller data:', filename)
              break
            }
          } catch (e) {
            console.log('Could not read file:', filename, e)
          }
        }
      }
    }
  }

  // Priority 4: Some ACD files store data in a binary format with embedded XML
  // Try to find any file that might contain XML data
  if (!l5xContent) {
    for (const filename of allFiles) {
      const file = zip.files[filename]
      if (!file.dir && !filename.includes('__MACOSX')) {
        try {
          const content = await file.async('string')
          // Look for XML declaration or RSLogix content
          if (content.includes('<?xml') &&
              (content.includes('RSLogix') || content.includes('Controller'))) {
            l5xContent = content
            foundFile = filename
            console.log('Found potential controller file:', filename)
            break
          }
        } catch (e) {
          // File might be binary, skip it
        }
      }
    }
  }

  if (!l5xContent) {
    const fileList = allFiles.filter(f => !zip.files[f].dir).join(', ')
    throw new Error(`No L5X or XML controller content found in ACD file. Files in archive: ${fileList || 'none'}`)
  }

  console.log('Parsing content from:', foundFile)
  return parseL5X(l5xContent)
}

function parseTag(tag: Record<string, unknown>, scope: string): PlcTag {
  const result: PlcTag = {
    name: String(tag['@_Name'] || ''),
    dataType: String(tag['@_DataType'] || 'Unknown'),
    scope,
    description: tag.Description ? String((tag.Description as Record<string, unknown>)['#text'] || tag.Description) : undefined,
    externalAccess: tag['@_ExternalAccess'] ? String(tag['@_ExternalAccess']) : undefined,
    aliasFor: tag['@_AliasFor'] ? String(tag['@_AliasFor']) : undefined
  }

  // Parse dimensions
  const dims = tag['@_Dimensions']
  if (dims) {
    if (typeof dims === 'string') {
      result.dimensions = dims.split(' ').map(Number)
    } else if (typeof dims === 'number') {
      result.dimensions = [dims]
    }
  }

  // Parse initial value
  if (tag.Data) {
    const data = tag.Data as Record<string, unknown>
    if (data['@_Value'] !== undefined) {
      result.value = String(data['@_Value'])
    }
  }

  return result
}

function parseProgram(program: Record<string, unknown>): PlcProgram {
  const result: PlcProgram = {
    name: String(program['@_Name'] || ''),
    description: program.Description ? String((program.Description as Record<string, unknown>)['#text'] || program.Description) : undefined,
    mainRoutineName: program['@_MainRoutineName'] ? String(program['@_MainRoutineName']) : undefined,
    disabled: program['@_Disabled'] === true || program['@_Disabled'] === 'true',
    routines: [],
    localTags: []
  }

  // Parse local tags
  const tagsContainer = program.Tags as Record<string, unknown> | undefined
  if (tagsContainer?.Tag) {
    const tags = Array.isArray(tagsContainer.Tag) ? tagsContainer.Tag : [tagsContainer.Tag]
    result.localTags = tags.map((tag: Record<string, unknown>) => parseTag(tag, result.name))
  }

  // Parse routines
  const routinesContainer = program.Routines as Record<string, unknown> | undefined
  if (routinesContainer?.Routine) {
    const routines = Array.isArray(routinesContainer.Routine) ? routinesContainer.Routine : [routinesContainer.Routine]
    result.routines = routines.map(parseRoutine)
  }

  return result
}

function parseRoutine(routine: Record<string, unknown>): PlcRoutine {
  const result: PlcRoutine = {
    name: String(routine['@_Name'] || ''),
    type: String(routine['@_Type'] || 'Ladder'),
    description: routine.Description ? String((routine.Description as Record<string, unknown>)['#text'] || routine.Description) : undefined,
    rungs: []
  }

  // Parse rungs (for ladder logic)
  const rllContent = routine.RLLContent as Record<string, unknown> | undefined
  if (rllContent?.Rung) {
    const rungs = Array.isArray(rllContent.Rung) ? rllContent.Rung : [rllContent.Rung]
    result.rungs = rungs.map((rung: Record<string, unknown>, index: number) => parseRung(rung, index))
  }

  return result
}

function parseRung(rung: Record<string, unknown>, index: number): PlcRung {
  const text = rung.Text
  let rawText = ''

  if (typeof text === 'string') {
    rawText = text
  } else if (text && typeof text === 'object') {
    rawText = String((text as Record<string, unknown>)['#text'] || '')
  }

  // Get rung comment
  let comment: string | undefined
  if (rung.Comment) {
    const commentObj = rung.Comment as Record<string, unknown>
    comment = String(commentObj['#text'] || commentObj)
  }

  return {
    number: rung['@_Number'] !== undefined ? Number(rung['@_Number']) : index,
    comment,
    rawText,
    instructions: parseInstructions(rawText)
  }
}

function parseInstructions(rungText: string): PlcInstruction[] {
  const instructions: PlcInstruction[] = []

  // Match instruction patterns: INSTRUCTION(operand1,operand2,...)
  const regex = /([A-Z_][A-Z0-9_]*)\(([^)]*)\)/gi
  let match

  while ((match = regex.exec(rungText)) !== null) {
    const type = match[1].toUpperCase()
    const operandsStr = match[2]

    // Parse operands (handle nested parentheses and commas)
    const operands = parseOperands(operandsStr)

    instructions.push({ type, operands })
  }

  return instructions
}

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
      operands.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) {
    operands.push(current.trim())
  }

  return operands
}

function parseTask(task: Record<string, unknown>): PlcTask {
  const result: PlcTask = {
    name: String(task['@_Name'] || ''),
    type: String(task['@_Type'] || 'Periodic'),
    rate: task['@_Rate'] !== undefined ? Number(task['@_Rate']) : undefined,
    priority: task['@_Priority'] !== undefined ? Number(task['@_Priority']) : undefined,
    watchdog: task['@_Watchdog'] !== undefined ? Number(task['@_Watchdog']) : undefined,
    inhibitTask: task['@_InhibitTask'] === true || task['@_InhibitTask'] === 'true',
    scheduledPrograms: []
  }

  // Parse scheduled programs
  const scheduledContainer = task.ScheduledPrograms as Record<string, unknown> | undefined
  if (scheduledContainer?.ScheduledProgram) {
    const programs = Array.isArray(scheduledContainer.ScheduledProgram)
      ? scheduledContainer.ScheduledProgram
      : [scheduledContainer.ScheduledProgram]
    result.scheduledPrograms = programs.map((p: Record<string, unknown>) => String(p['@_Name'] || ''))
  }

  return result
}

function parseModule(module: Record<string, unknown>): PlcModule {
  return {
    name: String(module['@_Name'] || ''),
    catalogNumber: module['@_CatalogNumber'] ? String(module['@_CatalogNumber']) : undefined,
    vendor: module['@_Vendor'] ? String(module['@_Vendor']) : undefined,
    productType: module['@_ProductType'] ? String(module['@_ProductType']) : undefined,
    revision: module['@_Revision'] ? String(module['@_Revision']) : undefined,
    slot: module['@_Slot'] !== undefined ? Number(module['@_Slot']) : undefined,
    parentModule: module['@_ParentModule'] ? String(module['@_ParentModule']) : undefined
  }
}

function parseDataType(dataType: Record<string, unknown>): PlcDataType {
  const result: PlcDataType = {
    name: String(dataType['@_Name'] || ''),
    family: dataType['@_Family'] ? String(dataType['@_Family']) : undefined,
    description: dataType.Description ? String((dataType.Description as Record<string, unknown>)['#text'] || dataType.Description) : undefined,
    members: []
  }

  // Parse members
  const membersContainer = dataType.Members as Record<string, unknown> | undefined
  if (membersContainer?.Member) {
    const members = Array.isArray(membersContainer.Member) ? membersContainer.Member : [membersContainer.Member]
    result.members = members.map((m: Record<string, unknown>) => ({
      name: String(m['@_Name'] || ''),
      dataType: String(m['@_DataType'] || 'Unknown'),
      dimension: m['@_Dimension'] !== undefined ? Number(m['@_Dimension']) : undefined
    }))
  }

  return result
}

/**
 * Detect file type from buffer contents
 */
export function detectFileType(buffer: ArrayBuffer): 'l5x' | 'acd' | 'rss' | 'unknown' {
  const header = new Uint8Array(buffer.slice(0, 8))

  // OLE Compound Document signature: D0 CF 11 E0 A1 B1 1A E1
  // This is used by RSS (RSLogix 500) files
  if (header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0) {
    return 'rss'
  }

  // ZIP signature: PK (0x50 0x4B)
  // This is used by ACD files
  if (header[0] === 0x50 && header[1] === 0x4B) {
    return 'acd'
  }

  // Check for XML (L5X)
  try {
    const textCheck = new TextDecoder().decode(new Uint8Array(buffer.slice(0, 100)))
    if (textCheck.includes('<?xml') || textCheck.includes('<RSLogix')) {
      return 'l5x'
    }
  } catch {
    // Not text, continue
  }

  return 'unknown'
}
