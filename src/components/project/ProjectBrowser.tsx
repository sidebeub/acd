'use client'

import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { LadderRung } from '../ladder/LadderRung'
import { ChatPanel } from '../chat/ChatPanel'
import { GlobalSearch } from '../search/GlobalSearch'
import { TagSearchBar } from '../search/TagSearchBar'
import { StructuredTextViewer } from '../structured-text/StructuredTextViewer'
import { MiniMap } from '../ladder/MiniMap'
import { IOVisualization } from '../IOVisualization'
import { buildTagExportData, generateTagCSV, downloadCSV, generateCSVFilename } from '@/lib/csv-export'
import { PDFExportModal } from '../export/PDFExportModal'
import { trackEvent } from '@/lib/analytics'
import { ProgramDiff } from '../diff/ProgramDiff'
import { useSimulation } from '../ladder/SimulationContext'
import { Logo } from '../ui/Logo'

interface Tag {
  id: string
  name: string
  dataType: string
  scope: string
  description: string | null
  value: string | null  // Initial/default value from project
}

interface Rung {
  id: string
  number: number
  comment: string | null
  rawText: string
  instructions: string | null
  explanation: string | null
}

interface CrossRef {
  tag: string
  usedIn: Array<{ routine: string; rungNumber: number; usage: 'read' | 'write' }>
}

interface IoMapping {
  tag: string
  type: 'input' | 'output'
  modulePath: string
  slot: number
  point?: number
  fullAddress: string
  module?: {
    name: string
    catalogNumber: string | null
    productType: string | null
  }
}

interface Condition {
  tag: string
  instruction: string
  requirement: string
  type: 'input' | 'output' | 'compare'
}

interface ExplanationResponse {
  explanation: string
  source: 'library' | 'ai' | 'hybrid' | 'learned'
  mode: string
  troubleshooting?: string[]
  deviceTypes?: string[]
  crossRefs?: CrossRef[]
  ioMappings?: IoMapping[]
  conditions?: Condition[]
  smartContext?: {
    purpose?: string
    category?: string
    patterns?: string[]
    safetyRelevant?: boolean
    relatedRungs?: number[]
    inputTags?: string[]
    outputTags?: string[]
  }
  smartExplanation?: string
}

interface RungExplanation {
  text: string
  source: 'library' | 'ai' | 'hybrid' | 'learned'
  troubleshooting?: string[]
  deviceTypes?: string[]
  crossRefs?: CrossRef[]
  ioMappings?: IoMapping[]
  conditions?: Condition[]
  smartContext?: {
    purpose?: string
    category?: string
    patterns?: string[]
    safetyRelevant?: boolean
    relatedRungs?: number[]
    inputTags?: string[]
    outputTags?: string[]
  }
  smartExplanation?: string
}

interface Routine {
  id: string
  name: string
  type: string
  description: string | null
  rungs: Rung[]
}

interface Program {
  id: string
  name: string
  description: string | null
  disabled: boolean
  routines: Routine[]
}

interface Project {
  id: string
  name: string
  processorType: string | null
  tags: Tag[]
  programs: Program[]
}

interface ProjectBrowserProps {
  project: Project
}

// Analysis data types
interface XRefTag {
  tag: string
  reads: number
  writes: number
  total: number
  locations: Array<{
    tagName: string
    programName: string
    routineName: string
    rungNumber: number
    instructionType: string
    context: string
  }>
}

interface CallTreeNode {
  name: string
  fullPath: string
  program: string
  children: CallTreeNode[]
  circular?: boolean
}

interface TimerInfo {
  tagName: string
  type: string
  preset: string
  presetDisplay?: string
  presetValue?: number | null
  accum: string
  locations: Array<{ program: string; routine: string; rungNumber: number }>
  resets: Array<{ program: string; routine: string; rungNumber: number }>
}

interface CounterInfo {
  tagName: string
  type: string
  preset: string
  presetDisplay?: string
  presetValue?: number | null
  accum: string
  locations: Array<{ program: string; routine: string; rungNumber: number }>
  resets: Array<{ program: string; routine: string; rungNumber: number }>
}

interface IOPoint {
  tagName: string
  aliasName?: string
  fullPath: string
  type: 'input' | 'output' | 'unknown'
  description?: string
  usage: Array<{ program: string; routine: string; rungNumber: number; instruction: string }>
}

interface AlarmInfo {
  tagName: string
  type: string
  message?: string
  locations: Array<{ program: string; routine: string; rungNumber: number; instruction: string; context: string }>
}

// Icons as components for cleaner JSX
const IconProgram = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M9 9h6M9 13h6M9 17h4" />
  </svg>
)

const IconRoutine = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M4 6h16M4 12h16M4 18h16" />
  </svg>
)

const IconTag = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5" />
    <path d="M2 12l10 5 10-5" />
  </svg>
)

const IconLadder = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="6" width="4" height="12" rx="1" />
    <rect x="17" y="6" width="4" height="12" rx="1" />
    <path d="M7 9h10M7 13h10M7 17h10" />
  </svg>
)

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
)

const IconChevron = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{
      transition: 'transform 0.15s ease',
      transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)'
    }}
  >
    <path d="M9 18l6-6-6-6" />
  </svg>
)

const IconHome = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
  </svg>
)

const IconXRef = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

const IconTree = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 3v18M3 9h18M8 15l4-6 4 6" />
  </svg>
)

const IconTimer = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)

const IconIO = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M5 9l4-4 4 4M9 5v14M19 15l-4 4-4-4M15 19V5" />
  </svg>
)

const IconAlarm = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M12 22V12M12 17l-5-2.5M12 17l5-2.5" />
  </svg>
)

const IconReport = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
  </svg>
)

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
)

const IconExportCSV = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <path d="M14 2v6h6" />
    <path d="M8 13h3M8 17h3M13 13h3M13 17h3" />
  </svg>
)

const IconPrint = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
)


const IconMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
)

const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconGraphic = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="8" width="7" height="8" rx="1" />
    <rect x="14" y="8" width="7" height="8" rx="1" />
    <line x1="10" y1="12" x2="14" y2="12" />
    <line x1="3" y1="12" x2="1" y2="12" />
    <line x1="23" y1="12" x2="21" y2="12" />
  </svg>
)

const IconText = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="4" y1="6" x2="20" y2="6" />
    <line x1="4" y1="12" x2="16" y2="12" />
    <line x1="4" y1="18" x2="18" y2="18" />
  </svg>
)

const IconChat = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
)

const IconAOI = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <path d="M12 8v8M8 12h8" />
  </svg>
)

const IconUDT = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 2L2 7l10 5 10-5-10-5z" />
    <path d="M2 17l10 5 10-5M2 12l10 5 10-5" />
  </svg>
)

const IconTasks = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="4" width="18" height="4" rx="1" />
    <rect x="3" y="10" width="18" height="4" rx="1" />
    <rect x="3" y="16" width="18" height="4" rx="1" />
  </svg>
)

const IconModule = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M4 9h16M9 4v16" />
  </svg>
)

type TabType = 'ladder' | 'tags' | 'xref' | 'calltree' | 'timers' | 'io' | 'alarms' | 'aoi' | 'udt' | 'tasks' | 'modules' | 'produced' | 'sequences' | 'safety' | 'report' | 'diff'

const IconSafety = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

const IconProduced = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
    <circle cx="12" cy="12" r="3" />
    <path d="M4 4l4 4M20 4l-4 4M4 20l4-4M20 20l-4-4" />
  </svg>
)

const IconSequence = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="6" cy="6" r="2" />
    <circle cx="18" cy="6" r="2" />
    <circle cx="6" cy="18" r="2" />
    <circle cx="18" cy="18" r="2" />
    <path d="M8 6h8M6 8v8M18 8v8M8 18h8" />
    <path d="M12 6v12" strokeDasharray="2 2" />
  </svg>
)

const IconDiff = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="3" width="7" height="18" rx="1" />
    <rect x="14" y="3" width="7" height="18" rx="1" />
    <path d="M5 8h3M5 12h3M5 16h3" />
    <path d="M16 8h3M16 12h3M16 16h3" />
    <path d="M10 12h4" strokeDasharray="2 2" />
  </svg>
)

const IconChevronDown = ({ open }: { open?: boolean }) => (
  <svg
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}
  >
    <path d="M6 9l6 6 6-6" />
  </svg>
)

export function ProjectBrowser({ project }: ProjectBrowserProps) {
  const [selectedProgram, setSelectedProgram] = useState<string | null>(
    project.programs[0]?.id || null
  )
  const [selectedRoutine, setSelectedRoutine] = useState<string | null>(null)
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(
    new Set([project.programs[0]?.id].filter(Boolean))
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<TabType>('ladder')
  const [sidebarWidth, setSidebarWidth] = useState(280)
  const [sidebarOpen, setSidebarOpen] = useState(false) // Closed by default on mobile
  const [chatPanelOpen, setChatPanelOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [rungExplanations, setRungExplanations] = useState<Record<string, RungExplanation>>({})

  // Analysis state
  const [xrefData, setXrefData] = useState<{ tags: XRefTag[]; totalReferences: number } | null>(null)
  const [callTreeData, setCallTreeData] = useState<{ trees: CallTreeNode[]; roots: string[]; orphans: string[]; circular: string[][] } | null>(null)
  const [timerData, setTimerData] = useState<{ timers: TimerInfo[]; counters: CounterInfo[] } | null>(null)
  const [ioData, setIOData] = useState<{ inputs: IOPoint[]; outputs: IOPoint[]; hardwareModules: Array<{ name: string; catalogNumber: string | null; slot: number | null; parent?: string | null }> } | null>(null)
  const [alarmData, setAlarmData] = useState<{ alarms: AlarmInfo[] } | null>(null)
  const [aoiData, setAoiData] = useState<{ aois: Array<{ name: string; description: string | null; parameters: string | null; localTags: string | null; logic: string | null }> } | null>(null)
  const [udtData, setUdtData] = useState<{ udts: Array<{ name: string; description: string | null; members: string | null }> } | null>(null)
  const [taskData, setTaskData] = useState<{ tasks: Array<{ name: string; type: string; period: string | null; priority: number | null; programs: string[] }> } | null>(null)
  const [moduleData, setModuleData] = useState<{ modules: Array<{ name: string; catalogNumber: string | null; vendor: string | null; productType: string | null; slot: number | null; ipAddress: string | null }> } | null>(null)
  const [producedConsumedData, setProducedConsumedData] = useState<{
    produced: Array<{ name: string; dataType: string; description?: string }>
    consumed: Array<{ name: string; dataType: string; description?: string; producer?: string }>
    summary: { producedCount: number; consumedCount: number }
  } | null>(null)
  const [sequenceData, setSequenceData] = useState<{
    sequences: Array<{ tagName: string; type: string; arrayLength?: number; mask?: string; locations: Array<{ program: string; routine: string; rungNumber: number; rungId: string; instruction: string }> }>
    statePatterns: Array<{ tagName: string; pattern: string; stateValues: Array<{ value: number | string; locations: Array<{ program: string; routine: string; rungNumber: number; rungId: string; context: string }> }> }>
    stats: { totalSequencers: number; totalStatePatterns: number }
  } | null>(null)
  const [safetyData, setSafetyData] = useState<{
    summary: { total: number; critical: number; high: number; medium: number; byCategory: Record<string, number> }
    safetyItems: Array<{
      tagName: string
      category: string
      severity: 'critical' | 'high' | 'medium'
      description: string
      locations: Array<{ program: string; routine: string; rungNumber: number; rungId: string; rungComment?: string; instruction: string; context: string }>
    }>
  } | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState<TabType | null>(null)
  const [xrefFilter, setXrefFilter] = useState('')
  const [ladderViewMode, setLadderViewMode] = useState<'graphic' | 'simple'>('graphic')
  const [bookmarkedRungs, setBookmarkedRungs] = useState<Set<string>>(new Set())
  const [showOnlyBookmarked, setShowOnlyBookmarked] = useState(false)
  const [openNavDropdown, setOpenNavDropdown] = useState<'analysis' | 'hardware' | 'structure' | null>(null)

  // Tag search state
  const [tagSearchOpen, setTagSearchOpen] = useState(false)
  const [tagSearchTerm, setTagSearchTerm] = useState('')
  const [currentTagSearchMatchIndex, setCurrentTagSearchMatchIndex] = useState(0)

  // PDF Export modal state
  const [pdfExportModalOpen, setPdfExportModalOpen] = useState(false)

  // Ref for the main content scroll container (for mini-map)
  const ladderScrollRef = useRef<HTMLElement>(null)

  // Simulation context for initializing tag values
  const { enabled: simEnabled, initializeNumericValues, updateTimers, updateCounters } = useSimulation()

  // Initialize numeric values and timer/counter states from project tags when simulation is enabled
  useEffect(() => {
    if (simEnabled) {
      const numericValues: Record<string, number> = {}
      const timerInits: Record<string, { PRE?: number; ACC?: number }> = {}
      const counterInits: Record<string, { PRE?: number; ACC?: number }> = {}

      // Extract initial values from project tags
      for (const tag of project.tags) {
        if (tag.value) {
          // Try to parse the value as a number
          const num = parseFloat(tag.value)
          if (!isNaN(num)) {
            numericValues[tag.name] = num

            // Check if this is a timer/counter synthetic tag (T4:0.PRE, C5:1.ACC, etc.)
            const timerMatch = tag.name.match(/^(T\d+:\d+)\.(PRE|ACC)$/i)
            if (timerMatch) {
              const timerAddr = timerMatch[1]
              const field = timerMatch[2].toUpperCase()
              if (!timerInits[timerAddr]) timerInits[timerAddr] = {}
              if (field === 'PRE') timerInits[timerAddr].PRE = num
              else if (field === 'ACC') timerInits[timerAddr].ACC = num
            }

            const counterMatch = tag.name.match(/^(C\d+:\d+)\.(PRE|ACC)$/i)
            if (counterMatch) {
              const counterAddr = counterMatch[1]
              const field = counterMatch[2].toUpperCase()
              if (!counterInits[counterAddr]) counterInits[counterAddr] = {}
              if (field === 'PRE') counterInits[counterAddr].PRE = num
              else if (field === 'ACC') counterInits[counterAddr].ACC = num
            }
          }
        }
      }

      // Also include local tags from programs
      for (const program of project.programs) {
        const localTags = (program as unknown as { localTags?: Array<{ name: string; value?: string | null }> }).localTags
        if (localTags) {
          for (const tag of localTags) {
            if (tag.value) {
              const num = parseFloat(tag.value)
              if (!isNaN(num)) {
                numericValues[tag.name] = num
              }
            }
          }
        }
      }

      // Initialize the simulation with numeric values
      if (Object.keys(numericValues).length > 0) {
        initializeNumericValues(numericValues)
      }

      // Initialize timer states from synthetic PRE/ACC tags
      if (Object.keys(timerInits).length > 0) {
        const timerUpdates: Record<string, { PRE?: number; ACC?: number; EN?: boolean; TT?: boolean; DN?: boolean }> = {}
        for (const [addr, vals] of Object.entries(timerInits)) {
          timerUpdates[addr] = {
            PRE: vals.PRE ?? 5000,
            ACC: vals.ACC ?? 0,
            EN: false,
            TT: false,
            DN: false
          }
        }
        updateTimers(timerUpdates)
        console.log(`[Simulation] Initialized ${Object.keys(timerUpdates).length} timers from project tags`)
      }

      // Initialize counter states from synthetic PRE/ACC tags
      if (Object.keys(counterInits).length > 0) {
        const counterUpdates: Record<string, { PRE?: number; ACC?: number; CU?: boolean; CD?: boolean; DN?: boolean; UN?: boolean; OV?: boolean }> = {}
        for (const [addr, vals] of Object.entries(counterInits)) {
          const pre = vals.PRE ?? 10
          const acc = vals.ACC ?? 0
          counterUpdates[addr] = {
            PRE: pre,
            ACC: acc,
            CU: false,
            CD: false,
            DN: acc >= pre,
            UN: acc < 0,
            OV: false
          }
        }
        updateCounters(counterUpdates)
        console.log(`[Simulation] Initialized ${Object.keys(counterUpdates).length} counters from project tags`)
      }
    }
  }, [simEnabled, project.tags, project.programs, initializeNumericValues, updateTimers, updateCounters])

  // Load bookmarks from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(`bookmarks_${project.id}`)
    if (stored) {
      try {
        const bookmarks = JSON.parse(stored)
        setBookmarkedRungs(new Set(bookmarks))
      } catch (e) {
        console.error('Failed to load bookmarks:', e)
      }
    }
  }, [project.id])

  // Toggle bookmark handler
  const handleToggleBookmark = useCallback((rungId: string) => {
    setBookmarkedRungs(prev => {
      const next = new Set(prev)
      if (next.has(rungId)) {
        next.delete(rungId)
      } else {
        next.add(rungId)
      }
      // Save to localStorage
      localStorage.setItem(`bookmarks_${project.id}`, JSON.stringify([...next]))
      return next
    })
  }, [project.id])

  // Scroll to a specific rung (for mini-map click)
  const handleMiniMapRungClick = useCallback((rungId: string) => {
    const rungElement = document.getElementById(`rung-${rungId}`)
    if (rungElement) {
      rungElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
      rungElement.style.outline = '2px solid var(--accent-blue)'
      rungElement.style.outlineOffset = '4px'
      setTimeout(() => {
        rungElement.style.outline = ''
        rungElement.style.outlineOffset = ''
      }, 1500)
    }
  }, [])

  const currentProgram = project.programs.find(p => p.id === selectedProgram)
  const currentRoutine = currentProgram?.routines.find(r => r.id === selectedRoutine)

  // Initialize with first routine when program changes
  useEffect(() => {
    if (currentProgram && !selectedRoutine && currentProgram.routines.length > 0) {
      setSelectedRoutine(currentProgram.routines[0].id)
    }
  }, [currentProgram, selectedRoutine])

  // Global search keyboard shortcut (Cmd+K / Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Tag search keyboard shortcut (Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f' && activeTab === 'ladder') {
        e.preventDefault()
        setTagSearchOpen(true)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab])

  // Calculate tag search matches across all visible rungs
  const tagSearchMatches = useMemo(() => {
    if (!tagSearchTerm || !currentRoutine) return []

    const matches: Array<{ rungId: string; rungIndex: number; instructionIndex: number }> = []
    const rungs = currentRoutine.rungs.filter(rung => !showOnlyBookmarked || bookmarkedRungs.has(rung.id))

    rungs.forEach((rung, rungIndex) => {
      const instructions = rung.instructions ? JSON.parse(rung.instructions) : []
      instructions.forEach((inst: { type: string; operands: string[] }, instIndex: number) => {
        const hasMatch = inst.operands?.some((op: string) => {
          const symbol = op.includes('\u00A7') ? op.split('\u00A7')[0] : op
          return symbol.toUpperCase().includes(tagSearchTerm.toUpperCase())
        })
        if (hasMatch) {
          matches.push({ rungId: rung.id, rungIndex, instructionIndex: instIndex })
        }
      })
    })

    return matches
  }, [tagSearchTerm, currentRoutine, showOnlyBookmarked, bookmarkedRungs])

  // Navigate to next/prev tag search match
  const handleTagSearchNext = useCallback(() => {
    if (tagSearchMatches.length === 0) return
    const nextIndex = (currentTagSearchMatchIndex + 1) % tagSearchMatches.length
    setCurrentTagSearchMatchIndex(nextIndex)
    const match = tagSearchMatches[nextIndex]
    const rungElement = document.getElementById(`rung-${match.rungId}`)
    if (rungElement) {
      rungElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [tagSearchMatches, currentTagSearchMatchIndex])

  const handleTagSearchPrev = useCallback(() => {
    if (tagSearchMatches.length === 0) return
    const prevIndex = currentTagSearchMatchIndex === 0 ? tagSearchMatches.length - 1 : currentTagSearchMatchIndex - 1
    setCurrentTagSearchMatchIndex(prevIndex)
    const match = tagSearchMatches[prevIndex]
    const rungElement = document.getElementById(`rung-${match.rungId}`)
    if (rungElement) {
      rungElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [tagSearchMatches, currentTagSearchMatchIndex])

  // Reset match index when search term changes
  useEffect(() => {
    setCurrentTagSearchMatchIndex(0)
  }, [tagSearchTerm])

  // Close tag search when switching tabs
  useEffect(() => {
    if (activeTab !== 'ladder') {
      setTagSearchOpen(false)
    }
  }, [activeTab])

  // Calculate searchMatchStartIndex for each rung
  const getRungSearchStartIndex = useCallback((rungId: string): number => {
    let startIndex = 0
    for (const match of tagSearchMatches) {
      if (match.rungId === rungId) return startIndex
      startIndex++
    }
    return -1
  }, [tagSearchMatches])

  // Fetch analysis data when tab changes
  useEffect(() => {
    const fetchAnalysis = async () => {
      if (activeTab === 'xref' && !xrefData) {
        setAnalysisLoading('xref')
        try {
          const res = await fetch(`/api/projects/${project.id}/xref`)
          const data = await res.json()
          setXrefData({ tags: data.tags, totalReferences: data.totalReferences })
        } catch (e) { console.error('Failed to fetch xref:', e) }
        setAnalysisLoading(null)
      } else if (activeTab === 'calltree' && !callTreeData) {
        setAnalysisLoading('calltree')
        try {
          const res = await fetch(`/api/projects/${project.id}/calltree`)
          const data = await res.json()
          setCallTreeData({ trees: data.trees, roots: data.roots, orphans: data.orphans, circular: data.circular })
        } catch (e) { console.error('Failed to fetch calltree:', e) }
        setAnalysisLoading(null)
      } else if (activeTab === 'timers' && !timerData) {
        setAnalysisLoading('timers')
        try {
          const res = await fetch(`/api/projects/${project.id}/timers`)
          const data = await res.json()
          setTimerData({ timers: data.timers, counters: data.counters })
        } catch (e) { console.error('Failed to fetch timers:', e) }
        setAnalysisLoading(null)
      } else if (activeTab === 'io' && !ioData) {
        setAnalysisLoading('io')
        try {
          const res = await fetch(`/api/projects/${project.id}/io`)
          const data = await res.json()
          setIOData({ inputs: data.inputs, outputs: data.outputs, hardwareModules: data.hardwareModules || [] })
        } catch (e) { console.error('Failed to fetch io:', e) }
        setAnalysisLoading(null)
      } else if (activeTab === 'alarms' && !alarmData) {
        setAnalysisLoading('alarms')
        try {
          const res = await fetch(`/api/projects/${project.id}/alarms`)
          const data = await res.json()
          setAlarmData({ alarms: data.alarms })
        } catch (e) { console.error('Failed to fetch alarms:', e) }
        setAnalysisLoading(null)
      } else if (activeTab === 'aoi' && !aoiData) {
        setAnalysisLoading('aoi')
        try {
          const res = await fetch(`/api/projects/${project.id}/aoi`)
          const data = await res.json()
          setAoiData({ aois: data.aois })
        } catch (e) { console.error('Failed to fetch AOIs:', e) }
        setAnalysisLoading(null)
      } else if (activeTab === 'udt' && !udtData) {
        setAnalysisLoading('udt')
        try {
          const res = await fetch(`/api/projects/${project.id}/udt`)
          const data = await res.json()
          setUdtData({ udts: data.udts })
        } catch (e) { console.error('Failed to fetch UDTs:', e) }
        setAnalysisLoading(null)
      } else if (activeTab === 'tasks' && !taskData) {
        setAnalysisLoading('tasks')
        try {
          const res = await fetch(`/api/projects/${project.id}/tasks`)
          const data = await res.json()
          setTaskData({ tasks: data.tasks })
        } catch (e) { console.error('Failed to fetch tasks:', e) }
        setAnalysisLoading(null)
      } else if (activeTab === 'modules' && !moduleData) {
        setAnalysisLoading('modules')
        try {
          const res = await fetch(`/api/projects/${project.id}/modules`)
          const data = await res.json()
          setModuleData({ modules: data.modules })
        } catch (e) { console.error('Failed to fetch modules:', e) }
        setAnalysisLoading(null)
      } else if (activeTab === 'produced' && !producedConsumedData) {
        setAnalysisLoading('produced')
        try {
          const res = await fetch(`/api/projects/${project.id}/produced-consumed`)
          const data = await res.json()
          setProducedConsumedData({
            produced: data.produced,
            consumed: data.consumed,
            summary: data.summary
          })
        } catch (e) { console.error('Failed to fetch produced/consumed:', e) }
        setAnalysisLoading(null)
      } else if (activeTab === 'sequences' && !sequenceData) {
        setAnalysisLoading('sequences')
        try {
          const res = await fetch(`/api/projects/${project.id}/sequences`)
          const data = await res.json()
          setSequenceData({
            sequences: data.sequences,
            statePatterns: data.statePatterns,
            stats: data.stats
          })
        } catch (e) { console.error('Failed to fetch sequences:', e) }
        setAnalysisLoading(null)
      } else if (activeTab === 'safety' && !safetyData) {
        setAnalysisLoading('safety')
        try {
          const res = await fetch(`/api/projects/${project.id}/safety`)
          const data = await res.json()
          setSafetyData({
            summary: data.summary,
            safetyItems: data.safetyItems
          })
        } catch (e) { console.error('Failed to fetch safety data:', e) }
        setAnalysisLoading(null)
      }
    }
    fetchAnalysis()
  }, [activeTab, project.id, xrefData, callTreeData, timerData, ioData, alarmData, aoiData, udtData, taskData, moduleData, producedConsumedData, sequenceData, safetyData])

  const handleProgramClick = (programId: string) => {
    setSelectedProgram(programId)
    setExpandedPrograms(prev => {
      const next = new Set(prev)
      if (next.has(programId)) {
        next.delete(programId)
      } else {
        next.add(programId)
      }
      return next
    })
    const program = project.programs.find(p => p.id === programId)
    if (program?.routines[0]) {
      setSelectedRoutine(program.routines[0].id)
    }
  }

  const handleExplain = async (rungId: string) => {
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rungId })
      })
      if (!response.ok) throw new Error('Failed to get explanation')

      const data: ExplanationResponse = await response.json()
      setRungExplanations(prev => ({
        ...prev,
        [rungId]: {
          text: data.explanation,
          source: data.source,
          troubleshooting: data.troubleshooting,
          deviceTypes: data.deviceTypes,
          crossRefs: data.crossRefs,
          ioMappings: data.ioMappings,
          conditions: data.conditions,
          smartContext: data.smartContext,
          smartExplanation: data.smartExplanation
        }
      }))

      // Track explain rung event for analytics
      trackEvent('explain_rung')
    } catch (error) {
      console.error('Error explaining rung:', error)
    }
  }

  // Generate explanations for all rungs in current routine
  const handleGenerateAllExplanations = useCallback(async () => {
    if (!currentRoutine) return []

    const rungs = currentRoutine.rungs
    const updatedExplanations: Record<string, RungExplanation> = { ...rungExplanations }

    // Process rungs sequentially to avoid overwhelming the API
    for (const rung of rungs) {
      // Skip if already has explanation
      if (updatedExplanations[rung.id]?.text || rung.explanation) {
        continue
      }

      try {
        const response = await fetch('/api/explain', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ rungId: rung.id })
        })

        if (response.ok) {
          const data: ExplanationResponse = await response.json()
          updatedExplanations[rung.id] = {
            text: data.explanation,
            source: data.source,
            troubleshooting: data.troubleshooting,
            deviceTypes: data.deviceTypes,
            crossRefs: data.crossRefs,
            ioMappings: data.ioMappings,
            conditions: data.conditions,
            smartContext: data.smartContext,
            smartExplanation: data.smartExplanation
          }
        }
      } catch (error) {
        console.error(`Error explaining rung ${rung.id}:`, error)
      }
    }

    // Update state with all new explanations
    setRungExplanations(updatedExplanations)

    // Return rungs with explanations merged in
    return rungs.map(rung => ({
      ...rung,
      explanation: updatedExplanations[rung.id]?.text || rung.explanation
    }))
  }, [currentRoutine, rungExplanations])

  const filteredTags = project.tags.filter(
    tag =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Handle CSV export of tags
  const handleExportCSV = useCallback(() => {
    const tagData = project.tags.map(tag => ({
      name: tag.name,
      dataType: tag.dataType,
      scope: tag.scope,
      description: tag.description
    }))
    const programData = project.programs.map(program => ({
      name: program.name,
      routines: program.routines.map(routine => ({
        name: routine.name,
        rungs: routine.rungs.map(rung => ({
          rawText: rung.rawText,
          instructions: rung.instructions
        }))
      }))
    }))
    const exportData = buildTagExportData(tagData, programData)
    const csvContent = generateTagCSV(exportData)
    const filename = generateCSVFilename(project.name)
    downloadCSV(csvContent, filename)
  }, [project])

  // Handle Export for Diff - exports JSON file for comparison
  const handleExportForDiff = useCallback(() => {
    const exportData = {
      name: project.name,
      processorType: project.processorType,
      exportedAt: new Date().toISOString(),
      programs: project.programs.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        disabled: p.disabled,
        routines: p.routines.map(r => ({
          id: r.id,
          name: r.name,
          type: r.type,
          description: r.description,
          rungs: r.rungs.map(rung => ({
            id: rung.id,
            number: rung.number,
            comment: rung.comment,
            rawText: rung.rawText,
            instructions: rung.instructions ? JSON.parse(rung.instructions) : []
          }))
        }))
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${project.name.replace(/[^a-zA-Z0-9]/g, '_')}_diff_export_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [project])

  // Build tag descriptions map for ladder view
  const tagDescriptions = useMemo(() => {
    const map: Record<string, string> = {}
    for (const tag of project.tags) {
      if (tag.description) {
        map[tag.name] = tag.description
      }
    }
    return map
  }, [project.tags])

  // Compute AOI names for ladder view (enables AOI expansion buttons)
  const aoiNames = useMemo(() => {
    if (!aoiData) return []
    return aoiData.aois.map(aoi => aoi.name)
  }, [aoiData])

  // Fetch AOI data early if on ladder tab (for AOI expansion feature)
  useEffect(() => {
    if (activeTab === 'ladder' && !aoiData) {
      fetch(`/api/projects/${project.id}/aoi`)
        .then(res => res.json())
        .then(data => setAoiData({ aois: data.aois }))
        .catch(e => console.error('Failed to preload AOIs:', e))
    }
  }, [activeTab, aoiData, project.id])

  // Count stats
  const totalRoutines = project.programs.reduce((acc, p) => acc + p.routines.length, 0)
  const totalRungs = project.programs.reduce(
    (acc, p) => acc + p.routines.reduce((a, r) => a + r.rungs.length, 0), 0
  )

  return (
    <div className="flex flex-col" style={{ background: 'var(--surface-0)', height: '100dvh' }}>
      {/* Header bar - responsive with container queries */}
      <header
        className="flex-shrink-0 flex items-center justify-between border-b no-print"
        style={{
          background: 'var(--surface-1)',
          borderColor: 'var(--border-subtle)',
          height: 'var(--header-height)',
          padding: '0 var(--space-3)',
        }}
      >
        <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
          {/* Hamburger menu for mobile - only show on ladder tab */}
          {activeTab === 'ladder' && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center justify-center transition-colors lg:hidden"
              style={{
                color: 'var(--text-secondary)',
                minWidth: 'var(--touch-target-min)',
                minHeight: 'var(--touch-target-min)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.background = 'var(--surface-3)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.background = 'transparent'
              }}
              aria-label={sidebarOpen ? 'Close navigation' : 'Open navigation'}
            >
              {sidebarOpen ? <IconClose /> : <IconMenu />}
            </button>
          )}

          {/* Logo / Back home link */}
          <a
            href="/"
            className="flex items-center"
            aria-label="Back to home"
            style={{ color: 'white', textDecoration: 'none' }}
          >
            <Logo size="sm" />
          </a>

          {/* My Projects link */}
          <a
            href="/dashboard"
            className="text-xs font-medium px-2 py-1 rounded transition-colors hover:bg-white/10"
            style={{ color: 'var(--text-tertiary)' }}
          >
            My Projects
          </a>

          {/* Divider - hidden on small screens */}
          <div className="hidden md:block" style={{ width: '1px', height: '20px', background: 'var(--border-default)' }} />

          {/* Project info */}
          <div className="flex items-center" style={{ gap: 'var(--space-2)' }}>
            <h1
              className="font-semibold truncate"
              style={{
                color: 'var(--text-primary)',
                fontSize: 'var(--text-sm)',
                maxWidth: 'clamp(80px, 20vw, 200px)',
              }}
            >
              {project.name}
            </h1>
            {project.processorType && (
              <span className="tech-badge hidden md:inline">{project.processorType}</span>
            )}
          </div>
        </div>

        {/* Stats and tabs */}
        <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
          {/* Quick stats - only on larger screens */}
          <div className="hidden lg:flex items-center" style={{ gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
            <span>{project.programs.length} programs</span>
            <span>{totalRoutines} routines</span>
            <span>{totalRungs} rungs</span>
            <span>{project.tags.length} tags</span>
          </div>

          {/* Tab switcher - Touch optimized with proper targets */}
          <nav className="tab-nav" role="tablist" aria-label="Project views">
            {/* Primary tabs - icons only on mobile */}
            <button
              onClick={() => setActiveTab('ladder')}
              className={`tab-item ${activeTab === 'ladder' ? 'tab-item-active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'ladder'}
              style={{ minWidth: 'var(--touch-target-min)', minHeight: 'var(--touch-target-min)' }}
            >
              <span className="flex items-center justify-center" style={{ gap: 'var(--space-1)' }}>
                <IconLadder />
                <span className="hidden md:inline">Ladder</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`tab-item ${activeTab === 'tags' ? 'tab-item-active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'tags'}
              style={{ minWidth: 'var(--touch-target-min)', minHeight: 'var(--touch-target-min)' }}
            >
              <span className="flex items-center justify-center" style={{ gap: 'var(--space-1)' }}>
                <IconTag />
                <span className="hidden md:inline">Tags</span>
              </span>
            </button>

            {/* Analysis dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenNavDropdown(openNavDropdown === 'analysis' ? null : 'analysis')}
                className={`tab-item ${['xref', 'calltree', 'timers', 'sequences', 'safety'].includes(activeTab) ? 'tab-item-active' : ''}`}
                aria-expanded={openNavDropdown === 'analysis'}
                aria-haspopup="menu"
                style={{ minWidth: 'var(--touch-target-min)', minHeight: 'var(--touch-target-min)' }}
              >
                <span className="flex items-center justify-center" style={{ gap: 'var(--space-1)' }}>
                  <IconXRef />
                  <span className="hidden md:inline">Analysis</span>
                  <IconChevronDown open={openNavDropdown === 'analysis'} />
                </span>
              </button>
              {openNavDropdown === 'analysis' && (
                <div
                  className="absolute top-full right-0 md:left-0 md:right-auto z-50 shadow-xl overflow-hidden"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-subtle)',
                    marginTop: 'var(--space-1)',
                    minWidth: '160px',
                  }}
                  role="menu"
                >
                  <button onClick={() => { setActiveTab('xref'); setOpenNavDropdown(null) }} className={`w-full flex items-center px-3 transition-colors hover:bg-white/5 ${activeTab === 'xref' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)', gap: 'var(--space-2)', minHeight: 'var(--touch-target-min)', fontSize: 'var(--text-xs)' }} role="menuitem">
                    <IconXRef /> Cross Reference
                  </button>
                  <button onClick={() => { setActiveTab('calltree'); setOpenNavDropdown(null) }} className={`w-full flex items-center px-3 transition-colors hover:bg-white/5 ${activeTab === 'calltree' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)', gap: 'var(--space-2)', minHeight: 'var(--touch-target-min)', fontSize: 'var(--text-xs)' }} role="menuitem">
                    <IconTree /> Call Tree
                  </button>
                  <button onClick={() => { setActiveTab('timers'); setOpenNavDropdown(null) }} className={`w-full flex items-center px-3 transition-colors hover:bg-white/5 ${activeTab === 'timers' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)', gap: 'var(--space-2)', minHeight: 'var(--touch-target-min)', fontSize: 'var(--text-xs)' }} role="menuitem">
                    <IconTimer /> Timers
                  </button>
                  <button onClick={() => { setActiveTab('sequences'); setOpenNavDropdown(null) }} className={`w-full flex items-center px-3 transition-colors hover:bg-white/5 ${activeTab === 'sequences' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)', gap: 'var(--space-2)', minHeight: 'var(--touch-target-min)', fontSize: 'var(--text-xs)' }} role="menuitem">
                    <IconSequence /> Sequences
                  </button>
                  <button onClick={() => { setActiveTab('safety'); setOpenNavDropdown(null) }} className={`w-full flex items-center px-3 transition-colors hover:bg-white/5 ${activeTab === 'safety' ? 'bg-white/10' : ''}`} style={{ color: 'var(--accent-red)', gap: 'var(--space-2)', minHeight: 'var(--touch-target-min)', fontSize: 'var(--text-xs)' }} role="menuitem">
                    <IconSafety /> Safety Scan
                  </button>
                </div>
              )}
            </div>

            {/* Hardware dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenNavDropdown(openNavDropdown === 'hardware' ? null : 'hardware')}
                className={`tab-item ${['io', 'modules', 'alarms'].includes(activeTab) ? 'tab-item-active' : ''}`}
                aria-expanded={openNavDropdown === 'hardware'}
                aria-haspopup="menu"
                style={{ minWidth: 'var(--touch-target-min)', minHeight: 'var(--touch-target-min)' }}
              >
                <span className="flex items-center justify-center" style={{ gap: 'var(--space-1)' }}>
                  <IconIO />
                  <span className="hidden md:inline">Hardware</span>
                  <IconChevronDown open={openNavDropdown === 'hardware'} />
                </span>
              </button>
              {openNavDropdown === 'hardware' && (
                <div
                  className="absolute top-full right-0 md:left-0 md:right-auto z-50 shadow-xl overflow-hidden"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-subtle)',
                    marginTop: 'var(--space-1)',
                    minWidth: '140px',
                  }}
                  role="menu"
                >
                  <button onClick={() => { setActiveTab('io'); setOpenNavDropdown(null) }} className={`w-full flex items-center px-3 transition-colors hover:bg-white/5 ${activeTab === 'io' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)', gap: 'var(--space-2)', minHeight: 'var(--touch-target-min)', fontSize: 'var(--text-xs)' }} role="menuitem">
                    <IconIO /> I/O Points
                  </button>
                  <button onClick={() => { setActiveTab('modules'); setOpenNavDropdown(null) }} className={`w-full flex items-center px-3 transition-colors hover:bg-white/5 ${activeTab === 'modules' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)', gap: 'var(--space-2)', minHeight: 'var(--touch-target-min)', fontSize: 'var(--text-xs)' }} role="menuitem">
                    <IconModule /> Modules
                  </button>
                  <button onClick={() => { setActiveTab('alarms'); setOpenNavDropdown(null) }} className={`w-full flex items-center px-3 transition-colors hover:bg-white/5 ${activeTab === 'alarms' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)', gap: 'var(--space-2)', minHeight: 'var(--touch-target-min)', fontSize: 'var(--text-xs)' }} role="menuitem">
                    <IconAlarm /> Alarms
                  </button>
                </div>
              )}
            </div>

            {/* Structure dropdown - hidden on smallest screens */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => setOpenNavDropdown(openNavDropdown === 'structure' ? null : 'structure')}
                className={`tab-item ${['aoi', 'udt', 'tasks', 'produced'].includes(activeTab) ? 'tab-item-active' : ''}`}
                aria-expanded={openNavDropdown === 'structure'}
                aria-haspopup="menu"
                style={{ minWidth: 'var(--touch-target-min)', minHeight: 'var(--touch-target-min)' }}
              >
                <span className="flex items-center justify-center" style={{ gap: 'var(--space-1)' }}>
                  <IconAOI />
                  <span className="hidden md:inline">Structure</span>
                  <IconChevronDown open={openNavDropdown === 'structure'} />
                </span>
              </button>
              {openNavDropdown === 'structure' && (
                <div
                  className="absolute top-full right-0 md:left-0 md:right-auto z-50 shadow-xl overflow-hidden"
                  style={{
                    background: 'var(--surface-2)',
                    border: '1px solid var(--border-subtle)',
                    marginTop: 'var(--space-1)',
                    minWidth: '180px',
                  }}
                  role="menu"
                >
                  <button onClick={() => { setActiveTab('aoi'); setOpenNavDropdown(null) }} className={`w-full flex items-center px-3 transition-colors hover:bg-white/5 ${activeTab === 'aoi' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)', gap: 'var(--space-2)', minHeight: 'var(--touch-target-min)', fontSize: 'var(--text-xs)' }} role="menuitem">
                    <IconAOI /> Add-On Instructions
                  </button>
                  <button onClick={() => { setActiveTab('udt'); setOpenNavDropdown(null) }} className={`w-full flex items-center px-3 transition-colors hover:bg-white/5 ${activeTab === 'udt' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)', gap: 'var(--space-2)', minHeight: 'var(--touch-target-min)', fontSize: 'var(--text-xs)' }} role="menuitem">
                    <IconUDT /> User Data Types
                  </button>
                  <button onClick={() => { setActiveTab('tasks'); setOpenNavDropdown(null) }} className={`w-full flex items-center px-3 transition-colors hover:bg-white/5 ${activeTab === 'tasks' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)', gap: 'var(--space-2)', minHeight: 'var(--touch-target-min)', fontSize: 'var(--text-xs)' }} role="menuitem">
                    <IconTasks /> Tasks
                  </button>
                  <button onClick={() => { setActiveTab('produced'); setOpenNavDropdown(null) }} className={`w-full flex items-center px-3 transition-colors hover:bg-white/5 ${activeTab === 'produced' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)', gap: 'var(--space-2)', minHeight: 'var(--touch-target-min)', fontSize: 'var(--text-xs)' }} role="menuitem">
                    <IconProduced /> Produced/Consumed
                  </button>
                </div>
              )}
            </div>

            {/* Report tab - hidden on mobile */}
            <button
              onClick={() => setActiveTab('report')}
              className={`tab-item hidden sm:flex ${activeTab === 'report' ? 'tab-item-active' : ''}`}
              role="tab"
              aria-selected={activeTab === 'report'}
              style={{ minWidth: 'var(--touch-target-min)', minHeight: 'var(--touch-target-min)' }}
            >
              <span className="flex items-center justify-center" style={{ gap: 'var(--space-1)' }}>
                <IconReport />
                <span className="hidden md:inline">Report</span>
              </span>
            </button>

            {/* Diff tab - hidden on mobile */}
            <button
              onClick={() => setActiveTab('diff')}
              className={`tab-item hidden sm:flex ${activeTab === 'diff' ? 'tab-item-active' : ''}`}
              title="Compare two versions of your PLC program"
              role="tab"
              aria-selected={activeTab === 'diff'}
              style={{ minWidth: 'var(--touch-target-min)', minHeight: 'var(--touch-target-min)' }}
            >
              <span className="flex items-center justify-center" style={{ gap: 'var(--space-1)' }}>
                <IconDiff />
                <span className="hidden md:inline">Diff</span>
              </span>
            </button>
          </nav>

          {/* Search button - touch optimized */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center justify-center font-medium transition-colors"
            style={{
              background: 'var(--surface-3)',
              color: 'var(--text-secondary)',
              minWidth: 'var(--touch-target-min)',
              minHeight: 'var(--touch-target-min)',
              padding: '0 var(--space-3)',
              fontSize: 'var(--text-xs)',
              gap: 'var(--space-2)',
            }}
            title="Search (Cmd+K)"
            aria-label="Search"
          >
            <IconSearch />
            <span className="hidden md:inline">Search</span>
            <kbd className="hidden lg:inline px-1.5 py-0.5" style={{ background: 'var(--surface-4)', color: 'var(--text-muted)', fontSize: '10px' }}>
              Cmd+K
            </kbd>
          </button>

          {/* Print / Export PDF button - hidden on smallest screens */}
          <button
            onClick={() => {
              setPdfExportModalOpen(true)
              trackEvent('export_pdf')
            }}
            className="hidden sm:flex items-center justify-center font-medium transition-colors no-print"
            style={{
              background: 'var(--surface-3)',
              color: 'var(--text-secondary)',
              minWidth: 'var(--touch-target-min)',
              minHeight: 'var(--touch-target-min)',
              padding: '0 var(--space-3)',
              fontSize: 'var(--text-xs)',
              gap: 'var(--space-2)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--surface-4)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--surface-3)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
            title="Export / Print PDF with options"
            aria-label="Export"
          >
            <IconPrint />
            <span className="hidden md:inline">Export</span>
          </button>

          {/* Chat button - touch optimized */}
          <button
            onClick={() => setChatPanelOpen(!chatPanelOpen)}
            className={`flex items-center justify-center font-medium transition-colors no-print ${
              chatPanelOpen ? 'ring-2 ring-offset-1 ring-offset-transparent' : ''
            }`}
            style={{
              background: chatPanelOpen ? 'var(--accent-blue)' : 'var(--accent-blue-muted)',
              color: chatPanelOpen ? 'white' : 'var(--accent-blue)',
              minWidth: 'var(--touch-target-min)',
              minHeight: 'var(--touch-target-min)',
              padding: '0 var(--space-3)',
              fontSize: 'var(--text-xs)',
              gap: 'var(--space-2)',
              marginLeft: 'var(--space-2)',
            }}
            title="AI Assistant"
            aria-label="AI Assistant"
            aria-pressed={chatPanelOpen}
          >
            <IconChat />
            <span className="hidden md:inline">Chat</span>
          </button>
        </div>
      </header>

      {/* Print Header - Only visible when printing */}
      <div className="print-header" style={{ display: 'none' }}>
        <h1>{project.name}</h1>
        <div className="print-meta">
          {project.processorType && <span>Processor: {project.processorType}</span>}
          <span> | Programs: {project.programs.length}</span>
          <span> | Routines: {totalRoutines}</span>
          <span> | Rungs: {totalRungs}</span>
          <span> | Tags: {project.tags.length}</span>
          <span> | Printed: {new Date().toLocaleDateString()}</span>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        {activeTab === 'ladder' ? (
          <>
            {/* Mobile overlay backdrop with fade animation */}
            <div
              className={`
                fixed inset-0 z-40 lg:hidden no-print
                transition-opacity duration-300
                ${sidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
              `}
              style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
              onClick={() => setSidebarOpen(false)}
              aria-hidden="true"
            />

            {/* Sidebar / Mobile Drawer */}
            <aside
              className={`
                flex-shrink-0 overflow-y-auto overflow-x-hidden border-r z-50 no-print
                fixed lg:relative inset-y-0 left-0
                transition-transform
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
              `}
              style={{
                width: 'clamp(280px, 85vw, 320px)',
                maxWidth: '85vw',
                background: 'var(--surface-1)',
                borderColor: 'var(--border-subtle)',
                top: 'var(--header-height)',
                height: 'calc(100dvh - var(--header-height))',
                transitionDuration: 'var(--transition-drawer)',
                paddingBottom: 'env(safe-area-inset-bottom, 0)',
              }}
              role="navigation"
              aria-label="Program navigation"
            >
              {/* Sidebar header with safe area */}
              <div
                className="sticky top-0 z-10 border-b"
                style={{
                  background: 'var(--surface-1)',
                  borderColor: 'var(--border-subtle)',
                  padding: 'var(--space-3)',
                  paddingTop: 'max(var(--space-3), env(safe-area-inset-top, 0))',
                }}
              >
                <div className="flex items-center justify-between">
                  <h2
                    className="font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)', fontSize: '10px' }}
                  >
                    Programs & Routines
                  </h2>
                  {/* Close button for mobile - touch optimized */}
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden flex items-center justify-center transition-colors"
                    style={{
                      color: 'var(--text-muted)',
                      minWidth: 'var(--touch-target-min)',
                      minHeight: 'var(--touch-target-min)',
                    }}
                    aria-label="Close navigation"
                  >
                    <IconClose />
                  </button>
                </div>
              </div>

              {/* Program tree - touch optimized */}
              <div style={{ padding: 'var(--space-2)' }}>
                {project.programs.map(program => {
                  const isExpanded = expandedPrograms.has(program.id)
                  const isSelected = selectedProgram === program.id

                  return (
                    <div key={program.id} style={{ marginBottom: 'var(--space-1)' }}>
                      {/* Program header - touch target optimized */}
                      <button
                        onClick={() => handleProgramClick(program.id)}
                        className={`w-full flex items-center text-left transition-colors ${
                          program.disabled ? 'opacity-50' : ''
                        }`}
                        style={{
                          background: isSelected ? 'var(--accent-blue-muted)' : 'transparent',
                          color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)',
                          gap: 'var(--space-2)',
                          padding: 'var(--space-2)',
                          minHeight: 'var(--touch-target-min)',
                        }}
                        onMouseEnter={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'var(--surface-3)'
                          }
                        }}
                        onMouseLeave={e => {
                          if (!isSelected) {
                            e.currentTarget.style.background = 'transparent'
                          }
                        }}
                        aria-expanded={isExpanded}
                      >
                        <IconChevron expanded={isExpanded} />
                        <IconProgram />
                        <span className="flex-1 font-medium truncate" style={{ fontSize: '13px' }}>{program.name}</span>
                        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {program.routines.length}
                        </span>
                      </button>

                      {/* Routines list */}
                      {isExpanded && (
                        <div style={{ marginLeft: '20px', marginTop: 'var(--space-1)' }}>
                          {program.routines.map(routine => (
                            <button
                              key={routine.id}
                              onClick={() => {
                                setSelectedProgram(program.id)
                                setSelectedRoutine(routine.id)
                                setSidebarOpen(false)
                              }}
                              className="w-full flex items-center text-left transition-colors"
                              style={{
                                background: selectedRoutine === routine.id ? 'var(--accent-emerald-muted)' : 'transparent',
                                color: selectedRoutine === routine.id ? 'var(--accent-emerald)' : 'var(--text-tertiary)',
                                gap: 'var(--space-2)',
                                padding: 'var(--space-2)',
                                minHeight: 'var(--touch-target-min)',
                              }}
                              onMouseEnter={e => {
                                if (selectedRoutine !== routine.id) {
                                  e.currentTarget.style.background = 'var(--surface-3)'
                                  e.currentTarget.style.color = 'var(--text-secondary)'
                                }
                              }}
                              onMouseLeave={e => {
                                if (selectedRoutine !== routine.id) {
                                  e.currentTarget.style.background = 'transparent'
                                  e.currentTarget.style.color = 'var(--text-tertiary)'
                                }
                              }}
                            >
                              <IconRoutine />
                              <span className="flex-1 truncate" style={{ fontSize: '12px' }}>{routine.name}</span>
                              <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                                {routine.rungs.length}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </aside>

            {/* Main content area - container query enabled */}
            <main
              ref={ladderScrollRef}
              className="flex-1 overflow-y-auto overflow-x-hidden"
              style={{
                background: 'var(--surface-0)',
                containerType: 'inline-size',
              }}
            >
              {currentRoutine ? (
                // Check if this is a Structured Text routine
                currentRoutine.type.toLowerCase().includes('st') ||
                currentRoutine.type.toLowerCase().includes('structured') ? (
                  <StructuredTextViewer
                    routineName={currentRoutine.name}
                    programName={currentProgram?.name || ''}
                    code={currentRoutine.rungs.map(r => r.rawText).join('\n')}
                    description={currentRoutine.description}
                  />
                ) : (
                <div style={{ padding: 'var(--space-4)' }}>
                  {/* Routine header - responsive with fluid spacing */}
                  <div style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="flex items-center flex-wrap" style={{ gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                      <h2 className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-xl)' }}>
                        {currentRoutine.name}
                      </h2>
                      <span
                        className="font-medium"
                        style={{
                          background: 'var(--surface-3)',
                          color: 'var(--text-tertiary)',
                          border: '1px solid var(--border-subtle)',
                          padding: '2px 8px',
                          fontSize: '11px',
                        }}
                      >
                        {currentRoutine.type}
                      </span>
                    </div>
                    {currentRoutine.description && (
                      <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                        {currentRoutine.description}
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between" style={{ gap: 'var(--space-3)' }}>
                      <div className="flex items-center" style={{ gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                        <span>{currentRoutine.rungs.length} rungs</span>
                        <span className="hidden sm:inline">in {currentProgram?.name}</span>
                        {bookmarkedRungs.size > 0 && (
                          <span style={{ color: 'var(--accent-amber)' }}>
                            {bookmarkedRungs.size} bookmarked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center self-start sm:self-auto" style={{ gap: 'var(--space-2)' }}>
                        {/* Bookmarks filter - touch optimized */}
                        {bookmarkedRungs.size > 0 && (
                          <button
                            onClick={() => setShowOnlyBookmarked(!showOnlyBookmarked)}
                            className="flex items-center transition-colors"
                            style={{
                              background: showOnlyBookmarked ? 'var(--accent-amber-muted)' : 'var(--surface-2)',
                              color: showOnlyBookmarked ? 'var(--accent-amber)' : 'var(--text-secondary)',
                              border: '1px solid var(--border-subtle)',
                              gap: 'var(--space-2)',
                              padding: 'var(--space-2) var(--space-3)',
                              fontSize: 'var(--text-xs)',
                              minHeight: 'var(--touch-target-min)',
                            }}
                            title={showOnlyBookmarked ? 'Show all rungs' : 'Show only bookmarked'}
                            aria-pressed={showOnlyBookmarked}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill={showOnlyBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                            </svg>
                            <span className="hidden xs:inline">{showOnlyBookmarked ? 'All' : 'Bookmarks'}</span>
                          </button>
                        )}
                        {/* View mode toggle - touch optimized */}
                        <div
                          className="flex overflow-hidden"
                          style={{ border: '1px solid var(--border-subtle)' }}
                          role="group"
                          aria-label="View mode"
                        >
                          <button
                            onClick={() => setLadderViewMode('graphic')}
                            className="flex items-center transition-colors"
                            style={{
                              background: ladderViewMode === 'graphic' ? 'var(--accent-blue)' : 'var(--surface-2)',
                              color: ladderViewMode === 'graphic' ? 'white' : 'var(--text-secondary)',
                              gap: 'var(--space-2)',
                              padding: 'var(--space-2) var(--space-3)',
                              fontSize: 'var(--text-xs)',
                              minHeight: 'var(--touch-target-min)',
                            }}
                            title="Graphic view"
                            aria-pressed={ladderViewMode === 'graphic'}
                          >
                            <IconGraphic />
                            <span className="hidden xs:inline">Graphic</span>
                          </button>
                          <button
                            onClick={() => setLadderViewMode('simple')}
                            className="flex items-center transition-colors"
                            style={{
                              background: ladderViewMode === 'simple' ? 'var(--accent-blue)' : 'var(--surface-2)',
                              color: ladderViewMode === 'simple' ? 'white' : 'var(--text-secondary)',
                              borderLeft: '1px solid var(--border-subtle)',
                              gap: 'var(--space-2)',
                              padding: 'var(--space-2) var(--space-3)',
                              fontSize: 'var(--text-xs)',
                              minHeight: 'var(--touch-target-min)',
                            }}
                            title="Simple text view"
                            aria-pressed={ladderViewMode === 'simple'}
                          >
                            <IconText />
                            <span className="hidden xs:inline">Simple</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rungs list - fluid spacing */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {currentRoutine.rungs
                      .filter(rung => !showOnlyBookmarked || bookmarkedRungs.has(rung.id))
                      .map((rung, index) => (
                      <div
                        key={rung.id}
                        id={`rung-${rung.id}`}
                        className={`animate-fade-in ${tagSearchMatches.some(m => m.rungId === rung.id) ? 'rung-has-matches' : ''}`}
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        {ladderViewMode === 'graphic' ? (
                          <LadderRung
                            rungId={rung.id}
                            number={rung.number}
                            comment={rung.comment}
                            rawText={rung.rawText}
                            instructions={rung.instructions ? JSON.parse(rung.instructions) : []}
                            explanation={rungExplanations[rung.id]?.text || rung.explanation}
                            explanationSource={rungExplanations[rung.id]?.source || null}
                            troubleshooting={rungExplanations[rung.id]?.troubleshooting}
                            deviceTypes={rungExplanations[rung.id]?.deviceTypes}
                            crossRefs={rungExplanations[rung.id]?.crossRefs}
                            ioMappings={rungExplanations[rung.id]?.ioMappings}
                            conditions={rungExplanations[rung.id]?.conditions}
                            onExplain={handleExplain}
                            tagDescriptions={tagDescriptions}
                            projectId={project.id}
                            aoiNames={aoiNames}
                            isBookmarked={bookmarkedRungs.has(rung.id)}
                            onToggleBookmark={handleToggleBookmark}
                            searchTerm={tagSearchOpen ? tagSearchTerm : undefined}
                            currentSearchMatchIndex={currentTagSearchMatchIndex}
                            searchMatchStartIndex={getRungSearchStartIndex(rung.id)}
                          />
                        ) : (
                          /* Simple text view - square corners */
                          <div
                            className="overflow-hidden"
                            style={{
                              background: 'var(--surface-2)',
                              border: '1px solid var(--border-subtle)',
                            }}
                          >
                            {/* Header - touch optimized */}
                            <div
                              className="flex items-center justify-between border-b"
                              style={{
                                borderColor: 'var(--border-subtle)',
                                padding: 'var(--space-2) var(--space-4)',
                              }}
                            >
                              <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                                <span
                                  className="font-mono font-semibold"
                                  style={{
                                    background: 'var(--surface-4)',
                                    color: 'var(--text-secondary)',
                                    padding: '2px 8px',
                                    fontSize: 'var(--text-xs)',
                                  }}
                                >
                                  {rung.number}
                                </span>
                                {rung.comment && (
                                  <span
                                    className="italic truncate"
                                    style={{
                                      color: 'var(--text-tertiary)',
                                      fontSize: 'var(--text-xs)',
                                      maxWidth: 'clamp(100px, 40vw, 400px)',
                                    }}
                                  >
                                    {rung.comment}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleExplain(rung.id)}
                                className="flex items-center transition-colors"
                                style={{
                                  background: 'var(--accent-blue-muted)',
                                  color: 'var(--accent-blue)',
                                  gap: 'var(--space-2)',
                                  padding: 'var(--space-2)',
                                  fontSize: 'var(--text-xs)',
                                  minWidth: 'var(--touch-target-min)',
                                  minHeight: 'var(--touch-target-min)',
                                  justifyContent: 'center',
                                }}
                              >
                                Explain
                              </button>
                            </div>
                            {/* Raw text */}
                            <div style={{ background: 'var(--surface-1)', padding: 'var(--space-3) var(--space-4)' }}>
                              <pre
                                className="font-mono whitespace-pre-wrap break-all leading-relaxed"
                                style={{ color: 'var(--text-secondary)', fontSize: '12px' }}
                              >
                                {rung.rawText}
                              </pre>
                            </div>
                            {/* Explanation if available */}
                            {(rungExplanations[rung.id]?.text || rung.explanation) && (
                              <div
                                className="border-t"
                                style={{
                                  background: 'var(--accent-emerald-muted)',
                                  borderColor: 'rgba(16, 185, 129, 0.2)',
                                  padding: 'var(--space-3) var(--space-4)',
                                }}
                              >
                                <p
                                  className="leading-relaxed"
                                  style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)' }}
                                >
                                  {rungExplanations[rung.id]?.text || rung.explanation}
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Mini-map for navigation */}
                  {currentRoutine.rungs.length > 5 && ladderViewMode === 'graphic' && (
                    <MiniMap
                      rungs={currentRoutine.rungs}
                      scrollContainerRef={ladderScrollRef}
                      onRungClick={handleMiniMapRungClick}
                      bookmarkedRungs={bookmarkedRungs}
                    />
                  )}
                </div>
                )
              ) : (
                <div
                  className="flex items-center justify-center"
                  style={{ color: 'var(--text-muted)', height: '100%' }}
                >
                  <div className="text-center" style={{ padding: 'var(--space-8)' }}>
                    <IconLadder />
                    <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>Select a routine to view ladder logic</p>
                  </div>
                </div>
              )}
            </main>
          </>
        ) : (
          /* Tags View - container query enabled */
          <main
            className="flex-1 overflow-hidden flex flex-col"
            style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}
          >
            {/* Search header with Export CSV button - responsive */}
            <div
              className="flex-shrink-0 border-b"
              style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-4)' }}
            >
              <div className="flex flex-col sm:flex-row sm:items-center" style={{ gap: 'var(--space-3)' }}>
                <div className="relative flex-1" style={{ maxWidth: '400px' }}>
                  <div
                    className="absolute top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--text-muted)', left: 'var(--space-3)' }}
                  >
                    <IconSearch />
                  </div>
                  <input
                    type="text"
                    placeholder="Search tags by name or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="input-field w-full"
                    style={{ paddingLeft: 'calc(var(--space-3) + 20px)' }}
                  />
                </div>
                <button
                  onClick={handleExportCSV}
                  className="flex items-center font-medium transition-colors self-start sm:self-auto"
                  style={{
                    background: 'var(--accent-emerald-muted)',
                    color: 'var(--accent-emerald)',
                    border: '1px solid rgba(16, 185, 129, 0.3)',
                    gap: 'var(--space-2)',
                    padding: 'var(--space-2) var(--space-3)',
                    fontSize: 'var(--text-xs)',
                    minHeight: 'var(--touch-target-min)',
                  }}
                  title="Export all tags to CSV file"
                >
                  <IconExportCSV />
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>
                {filteredTags.length} of {project.tags.length} tags
              </p>
            </div>

            {/* Tags table - responsive with horizontal scroll on mobile */}
            <div className="flex-1 overflow-auto" style={{ padding: 'var(--space-4)' }}>
              <div style={{ minWidth: '600px' }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th style={{ width: '30%' }}>Name</th>
                      <th style={{ width: '15%' }}>Data Type</th>
                      <th style={{ width: '15%' }}>Scope</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTags.map((tag, index) => (
                      <tr
                        key={tag.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${Math.min(index, 20) * 20}ms` }}
                      >
                        <td>
                          <code
                            className="font-mono"
                            style={{ color: 'var(--accent-emerald)', fontSize: '13px' }}
                          >
                            {tag.name}
                          </code>
                        </td>
                        <td>
                          <span
                            className="font-mono"
                            style={{
                              background: 'var(--accent-blue-muted)',
                              color: 'var(--accent-blue)',
                              padding: '2px 8px',
                              fontSize: 'var(--text-xs)',
                            }}
                          >
                            {tag.dataType}
                          </span>
                        </td>
                        <td style={{ color: 'var(--text-tertiary)' }}>
                          {tag.scope}
                        </td>
                        <td style={{ color: 'var(--text-secondary)' }}>
                          {tag.description || <span style={{ color: 'var(--text-muted)' }}>-</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {filteredTags.length === 0 && (
                <div
                  className="text-center"
                  style={{ color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}
                >
                  <IconTag />
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>No tags found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Cross-Reference View */}
        {activeTab === 'xref' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}>
            <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-4)' }}>
              <div className="flex flex-col sm:flex-row sm:items-center" style={{ gap: 'var(--space-3)' }}>
                <div className="relative flex-1" style={{ maxWidth: '400px' }}>
                  <div className="absolute top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)', left: 'var(--space-3)' }}>
                    <IconSearch />
                  </div>
                  <input
                    type="text"
                    placeholder="Filter tags..."
                    value={xrefFilter}
                    onChange={(e) => setXrefFilter(e.target.value)}
                    className="input-field w-full"
                    style={{ paddingLeft: 'calc(var(--space-3) + 20px)' }}
                  />
                </div>
                {xrefData && (
                  <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                    {xrefData.totalReferences} references across {xrefData.tags.length} tags
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: 'var(--space-4)' }}>
              {analysisLoading === 'xref' ? (
                <div className="flex items-center justify-center" style={{ height: '128px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Loading cross-reference data...</span>
                </div>
              ) : xrefData ? (
                <div style={{ minWidth: '600px' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th style={{ width: '25%' }}>Tag</th>
                        <th style={{ width: '10%' }}>Reads</th>
                        <th style={{ width: '10%' }}>Writes</th>
                        <th style={{ width: '10%' }}>Total</th>
                        <th>Locations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {xrefData.tags
                        .filter(t => !xrefFilter || t.tag.toLowerCase().includes(xrefFilter.toLowerCase()))
                        .slice(0, 200)
                        .map((tag, index) => (
                          <tr key={tag.tag} className="animate-fade-in" style={{ animationDelay: `${Math.min(index, 20) * 10}ms` }}>
                            <td>
                              <code className="font-mono" style={{ color: 'var(--accent-emerald)', fontSize: '13px' }}>
                                {tag.tag}
                              </code>
                            </td>
                            <td style={{ color: 'var(--accent-blue)' }}>{tag.reads}</td>
                            <td style={{ color: 'var(--accent-amber)' }}>{tag.writes}</td>
                            <td style={{ color: 'var(--text-secondary)' }}>{tag.total}</td>
                            <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                              {tag.locations.slice(0, 3).map((loc, i) => (
                                <span key={i}>
                                  {loc.programName}/{loc.routineName}:{loc.rungNumber}
                                  {i < Math.min(tag.locations.length, 3) - 1 && ', '}
                                </span>
                              ))}
                              {tag.locations.length > 3 && ` +${tag.locations.length - 3} more`}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}>
                  <IconXRef />
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>No cross-reference data</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Call Tree View */}
        {activeTab === 'calltree' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}>
            <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-4)' }}>
              {callTreeData && (
                <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>{callTreeData.roots.length} entry points</span>
                  <span>{callTreeData.orphans.length} orphan routines</span>
                  <span>{callTreeData.circular.length} circular references</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: 'var(--space-4)' }}>
              {analysisLoading === 'calltree' ? (
                <div className="flex items-center justify-center" style={{ height: '128px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Analyzing call tree...</span>
                </div>
              ) : callTreeData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {callTreeData.trees.map((tree, i) => (
                    <CallTreeView key={i} node={tree} depth={0} />
                  ))}
                  {callTreeData.orphans.length > 0 && (
                    <div style={{ background: 'var(--surface-2)', padding: 'var(--space-4)', marginTop: 'var(--space-6)' }}>
                      <h3 className="font-semibold" style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                        Orphan Routines (not called by anyone)
                      </h3>
                      <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
                        {callTreeData.orphans.map(orphan => (
                          <span key={orphan} style={{ background: 'var(--surface-3)', color: 'var(--text-tertiary)', padding: '4px 8px', fontSize: 'var(--text-xs)' }}>
                            {orphan}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {callTreeData.circular.length > 0 && (
                    <div style={{ background: 'var(--accent-amber-muted)', padding: 'var(--space-4)', marginTop: 'var(--space-4)' }}>
                      <h3 className="font-semibold" style={{ color: 'var(--accent-amber)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>
                        Circular References Detected
                      </h3>
                      {callTreeData.circular.map((cycle, i) => (
                        <div key={i} style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-xs)' }}>
                          {cycle.join(' -> ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}>
                  <IconTree />
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>No call tree data</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Timers/Counters View */}
        {activeTab === 'timers' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}>
            <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-4)' }}>
              {timerData && (
                <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>{timerData.timers.length} timers</span>
                  <span>{timerData.counters.length} counters</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: 'var(--space-4)' }}>
              {analysisLoading === 'timers' ? (
                <div className="flex items-center justify-center" style={{ height: '128px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Analyzing timers and counters...</span>
                </div>
              ) : timerData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>Timers</h3>
                    <div style={{ minWidth: '500px', overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Tag</th>
                            <th>Type</th>
                            <th>Preset</th>
                            <th>Used In</th>
                            <th>Resets</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timerData.timers.map((timer, i) => (
                            <tr key={timer.tagName} className="animate-fade-in" style={{ animationDelay: `${i * 10}ms` }}>
                              <td><code className="font-mono" style={{ color: 'var(--accent-emerald)', fontSize: '13px' }}>{timer.tagName}</code></td>
                              <td><span style={{ background: 'var(--accent-blue-muted)', color: 'var(--accent-blue)', padding: '2px 8px', fontSize: 'var(--text-xs)' }}>{timer.type}</span></td>
                              <td style={{ color: 'var(--text-secondary)' }}>{timer.presetDisplay || timer.preset || '?'}</td>
                              <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                                {timer.locations.slice(0, 2).map((l, j) => (
                                  <span key={j}>{l.routine}:{l.rungNumber}{j < Math.min(timer.locations.length, 2) - 1 && ', '}</span>
                                ))}
                                {timer.locations.length > 2 && ` +${timer.locations.length - 2}`}
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{timer.resets.length || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-3)' }}>Counters</h3>
                    <div style={{ minWidth: '500px', overflowX: 'auto' }}>
                      <table className="data-table">
                        <thead>
                          <tr>
                            <th>Tag</th>
                            <th>Type</th>
                            <th>Preset</th>
                            <th>Used In</th>
                            <th>Resets</th>
                          </tr>
                        </thead>
                        <tbody>
                          {timerData.counters.map((counter, i) => (
                            <tr key={counter.tagName} className="animate-fade-in" style={{ animationDelay: `${i * 10}ms` }}>
                              <td><code className="font-mono" style={{ color: 'var(--accent-emerald)', fontSize: '13px' }}>{counter.tagName}</code></td>
                              <td><span style={{ background: 'var(--accent-amber-muted)', color: 'var(--accent-amber)', padding: '2px 8px', fontSize: 'var(--text-xs)' }}>{counter.type}</span></td>
                              <td style={{ color: 'var(--text-secondary)' }}>{counter.presetDisplay || counter.preset || '?'}</td>
                              <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                                {counter.locations.slice(0, 2).map((l, j) => (
                                  <span key={j}>{l.routine}:{l.rungNumber}{j < Math.min(counter.locations.length, 2) - 1 && ', '}</span>
                                ))}
                                {counter.locations.length > 2 && ` +${counter.locations.length - 2}`}
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{counter.resets.length || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}>
                  <IconTimer />
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>No timer/counter data</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* I/O View */}
        {activeTab === 'io' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}>
            {analysisLoading === 'io' ? (
              <div className="flex items-center justify-center" style={{ height: '128px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Analyzing I/O points...</span>
              </div>
            ) : ioData ? (
              <IOVisualization
                inputs={ioData.inputs}
                outputs={ioData.outputs}
                hardwareModules={ioData.hardwareModules}
              />
            ) : (
              <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}>
                <IconIO />
                <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>No I/O data</p>
              </div>
            )}
          </main>
        )}

        {/* Alarms View */}
        {activeTab === 'alarms' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}>
            <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-4)' }}>
              {alarmData && (
                <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>{alarmData.alarms.length} alarms/faults detected</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: 'var(--space-4)' }}>
              {analysisLoading === 'alarms' ? (
                <div className="flex items-center justify-center" style={{ height: '128px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Analyzing alarms...</span>
                </div>
              ) : alarmData ? (
                <div style={{ minWidth: '500px', overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Alarm Tag</th>
                        <th>Type</th>
                        <th>Message</th>
                        <th>Locations</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alarmData.alarms.map((alarm, i) => (
                        <tr key={alarm.tagName} className="animate-fade-in" style={{ animationDelay: `${i * 10}ms` }}>
                          <td><code className="font-mono" style={{ color: 'var(--accent-red)', fontSize: '13px' }}>{alarm.tagName}</code></td>
                          <td><span style={{ background: 'var(--surface-3)', color: 'var(--text-tertiary)', padding: '2px 8px', fontSize: 'var(--text-xs)' }}>{alarm.type}</span></td>
                          <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{alarm.message || '-'}</td>
                          <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                            {alarm.locations.slice(0, 2).map((l, j) => (
                              <span key={j}>{l.routine}:{l.rungNumber}{j < Math.min(alarm.locations.length, 2) - 1 && ', '}</span>
                            ))}
                            {alarm.locations.length > 2 && ` +${alarm.locations.length - 2}`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}>
                  <IconAlarm />
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>No alarm data</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* AOI View */}
        {activeTab === 'aoi' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}>
            <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-4)' }}>
              {aoiData && (
                <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>{aoiData.aois.length} Add-On Instructions</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: 'var(--space-4)' }}>
              {analysisLoading === 'aoi' ? (
                <div className="flex items-center justify-center" style={{ height: '128px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Loading Add-On Instructions...</span>
                </div>
              ) : aoiData && aoiData.aois.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {aoiData.aois.map((aoi, i) => {
                    const params = aoi.parameters ? JSON.parse(aoi.parameters) : []
                    const localTags = aoi.localTags ? JSON.parse(aoi.localTags) : []
                    return (
                      <div key={aoi.name} className="overflow-hidden" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
                        <div className="border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-3) var(--space-4)' }}>
                          <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                            <code className="font-mono font-semibold" style={{ color: 'var(--accent-blue)', fontSize: '14px' }}>{aoi.name}</code>
                            <span style={{ background: 'var(--accent-blue-muted)', color: 'var(--accent-blue)', padding: '2px 8px', fontSize: 'var(--text-xs)' }}>AOI</span>
                          </div>
                          {aoi.description && <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>{aoi.description}</p>}
                        </div>
                        <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          {params.length > 0 && (
                            <div style={{ marginBottom: 'var(--space-3)' }}>
                              <h4 className="uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: 'var(--space-2)' }}>Parameters ({params.length})</h4>
                              <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
                                {params.slice(0, 10).map((p: { name: string; dataType?: string; usage?: string }, j: number) => (
                                  <span key={j} style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)', padding: '4px 8px', fontSize: 'var(--text-xs)' }}>
                                    {p.name}: {p.dataType || '?'} {p.usage && <span style={{ color: 'var(--text-muted)' }}>({p.usage})</span>}
                                  </span>
                                ))}
                                {params.length > 10 && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>+{params.length - 10} more</span>}
                              </div>
                            </div>
                          )}
                          {localTags.length > 0 && (
                            <div>
                              <h4 className="uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: 'var(--space-2)' }}>Local Tags ({localTags.length})</h4>
                              <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
                                {localTags.slice(0, 8).map((t: { name: string; dataType?: string }, j: number) => (
                                  <span key={j} className="font-mono" style={{ background: 'var(--surface-3)', color: 'var(--accent-emerald)', padding: '4px 8px', fontSize: 'var(--text-xs)' }}>
                                    {t.name}
                                  </span>
                                ))}
                                {localTags.length > 8 && <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>+{localTags.length - 8} more</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}>
                  <IconAOI />
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>No Add-On Instructions found</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* UDT View */}
        {activeTab === 'udt' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}>
            <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-4)' }}>
              {udtData && (
                <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>{udtData.udts.length} User-Defined Types</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: 'var(--space-4)' }}>
              {analysisLoading === 'udt' ? (
                <div className="flex items-center justify-center" style={{ height: '128px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Loading User-Defined Types...</span>
                </div>
              ) : udtData && udtData.udts.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {udtData.udts.map((udt, i) => {
                    const members = udt.members ? JSON.parse(udt.members) : []
                    return (
                      <div key={udt.name} className="overflow-hidden" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
                        <div className="border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-3) var(--space-4)' }}>
                          <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                            <code className="font-mono font-semibold" style={{ color: 'var(--accent-amber)', fontSize: '14px' }}>{udt.name}</code>
                            <span style={{ background: 'var(--accent-amber-muted)', color: 'var(--accent-amber)', padding: '2px 8px', fontSize: 'var(--text-xs)' }}>UDT</span>
                          </div>
                          {udt.description && <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>{udt.description}</p>}
                        </div>
                        <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          {members.length > 0 && (
                            <div>
                              <h4 className="uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: 'var(--space-2)' }}>Members ({members.length})</h4>
                              <div style={{ overflowX: 'auto' }}>
                                <table className="w-full" style={{ fontSize: 'var(--text-xs)' }}>
                                  <thead>
                                    <tr style={{ color: 'var(--text-muted)' }}>
                                      <th className="text-left" style={{ padding: 'var(--space-1) 0' }}>Name</th>
                                      <th className="text-left" style={{ padding: 'var(--space-1) 0' }}>Type</th>
                                      <th className="text-left" style={{ padding: 'var(--space-1) 0' }}>Description</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {members.slice(0, 15).map((m: { name: string; dataType?: string; description?: string }, j: number) => (
                                      <tr key={j}>
                                        <td className="font-mono" style={{ color: 'var(--accent-emerald)', padding: 'var(--space-1) 0' }}>{m.name}</td>
                                        <td style={{ color: 'var(--text-secondary)', padding: 'var(--space-1) 0' }}>{m.dataType || '?'}</td>
                                        <td style={{ color: 'var(--text-tertiary)', padding: 'var(--space-1) 0' }}>{m.description || '-'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {members.length > 15 && <p style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-2)' }}>+{members.length - 15} more members</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}>
                  <IconUDT />
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>No User-Defined Types found</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Tasks View */}
        {activeTab === 'tasks' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}>
            <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-4)' }}>
              {taskData && (
                <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>{taskData.tasks.length} Tasks</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: 'var(--space-4)' }}>
              {analysisLoading === 'tasks' ? (
                <div className="flex items-center justify-center" style={{ height: '128px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Loading Tasks...</span>
                </div>
              ) : taskData && taskData.tasks.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {taskData.tasks.map((task, i) => (
                    <div key={task.name} className="overflow-hidden" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-3) var(--space-4)', gap: 'var(--space-2)' }}>
                        <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                          <code className="font-mono font-semibold" style={{ color: 'var(--text-primary)', fontSize: '14px' }}>{task.name}</code>
                          <span style={{
                            background: task.type === 'CONTINUOUS' ? 'var(--accent-emerald-muted)' : task.type === 'PERIODIC' ? 'var(--accent-blue-muted)' : 'var(--accent-amber-muted)',
                            color: task.type === 'CONTINUOUS' ? 'var(--accent-emerald)' : task.type === 'PERIODIC' ? 'var(--accent-blue)' : 'var(--accent-amber)',
                            padding: '2px 8px',
                            fontSize: 'var(--text-xs)',
                          }}>{task.type}</span>
                        </div>
                        <div className="flex items-center" style={{ gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                          {task.period && <span>Period: {task.period}</span>}
                          {task.priority !== null && <span>Priority: {task.priority}</span>}
                        </div>
                      </div>
                      {task.programs.length > 0 && (
                        <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                          <h4 className="uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: 'var(--space-2)' }}>Programs ({task.programs.length})</h4>
                          <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
                            {task.programs.map((prog, j) => (
                              <span key={j} className="font-mono" style={{ background: 'var(--surface-3)', color: 'var(--accent-blue)', padding: '4px 8px', fontSize: 'var(--text-xs)' }}>
                                {prog}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}>
                  <IconTasks />
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>No Tasks found</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Modules View */}
        {activeTab === 'modules' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}>
            <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-4)' }}>
              {moduleData && (
                <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-4)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>{moduleData.modules.length} I/O Modules</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: 'var(--space-4)' }}>
              {analysisLoading === 'modules' ? (
                <div className="flex items-center justify-center" style={{ height: '128px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Loading Modules...</span>
                </div>
              ) : moduleData && moduleData.modules.length > 0 ? (
                <div style={{ minWidth: '700px', overflowX: 'auto' }}>
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Catalog Number</th>
                        <th>Vendor</th>
                        <th>Type</th>
                        <th>Slot</th>
                        <th>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {moduleData.modules.map((mod, i) => (
                        <tr key={mod.name} className="animate-fade-in" style={{ animationDelay: `${i * 10}ms` }}>
                          <td><code className="font-mono" style={{ color: 'var(--accent-emerald)', fontSize: '13px' }}>{mod.name}</code></td>
                          <td style={{ color: 'var(--text-secondary)' }}>{mod.catalogNumber || '-'}</td>
                          <td style={{ color: 'var(--text-tertiary)' }}>{mod.vendor || '-'}</td>
                          <td style={{ color: 'var(--text-tertiary)' }}>{mod.productType || '-'}</td>
                          <td style={{ color: 'var(--text-secondary)' }}>{mod.slot !== null ? mod.slot : '-'}</td>
                          <td style={{ color: 'var(--text-tertiary)' }}>{mod.ipAddress || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}>
                  <IconModule />
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>No I/O Modules found</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Sequences View */}
        {activeTab === 'sequences' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}>
            <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-4)' }}>
              {sequenceData && (
                <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-4)', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--accent-blue)' }}>{sequenceData.stats.totalSequencers} Sequencers</span>
                  <span style={{ color: 'var(--accent-amber)' }}>{sequenceData.stats.totalStatePatterns} State Patterns</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: 'var(--space-4)' }}>
              {analysisLoading === 'sequences' ? (
                <div className="flex items-center justify-center" style={{ height: '128px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Analyzing Sequences...</span>
                </div>
              ) : sequenceData ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
                  {/* Sequencer Instructions */}
                  {sequenceData.sequences.length > 0 && (
                    <div>
                      <h3 className="font-semibold flex items-center" style={{ color: 'var(--accent-blue)', fontSize: 'var(--text-sm)', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                        <IconSequence />
                        Sequencer Instructions (SQO/SQI/SQL)
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {sequenceData.sequences.map((seq, i) => (
                          <div
                            key={seq.tagName}
                            className="overflow-hidden animate-fade-in"
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', animationDelay: `${i * 30}ms` }}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-3) var(--space-4)', gap: 'var(--space-2)' }}>
                              <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                                <code className="font-mono font-semibold" style={{ color: 'var(--accent-blue)', fontSize: '14px' }}>{seq.tagName}</code>
                                <span style={{ background: 'var(--accent-blue-muted)', color: 'var(--accent-blue)', padding: '2px 8px', fontSize: 'var(--text-xs)' }}>{seq.type}</span>
                                {seq.arrayLength && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{seq.arrayLength} steps</span>
                                )}
                              </div>
                              {seq.mask && (
                                <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Mask: {seq.mask}</span>
                              )}
                            </div>
                            <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                              <h4 className="uppercase tracking-wider font-semibold" style={{ color: 'var(--text-muted)', fontSize: '10px', marginBottom: 'var(--space-2)' }}>
                                Locations ({seq.locations.length})
                              </h4>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                                {seq.locations.slice(0, 5).map((loc, j) => (
                                  <div key={j} className="flex items-center" style={{ gap: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                                    <span style={{ color: 'var(--text-secondary)' }}>{loc.program}/{loc.routine}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>Rung {loc.rungNumber}</span>
                                  </div>
                                ))}
                                {seq.locations.length > 5 && (
                                  <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>+{seq.locations.length - 5} more...</span>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* State Patterns */}
                  {sequenceData.statePatterns.length > 0 && (
                    <div>
                      <h3 className="font-semibold flex items-center" style={{ color: 'var(--accent-amber)', fontSize: 'var(--text-sm)', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                        <IconSequence />
                        State Machine Patterns
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {sequenceData.statePatterns.map((pattern, i) => (
                          <div
                            key={pattern.tagName}
                            className="overflow-hidden animate-fade-in"
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', animationDelay: `${i * 30}ms` }}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-3) var(--space-4)', gap: 'var(--space-2)' }}>
                              <div className="flex items-center" style={{ gap: 'var(--space-3)' }}>
                                <code className="font-mono font-semibold" style={{ color: 'var(--accent-amber)', fontSize: '14px' }}>{pattern.tagName}</code>
                                <span style={{
                                  background: pattern.pattern === 'phase' ? 'var(--accent-emerald-muted)' : pattern.pattern === 'state_machine' ? 'var(--accent-amber-muted)' : 'var(--accent-blue-muted)',
                                  color: pattern.pattern === 'phase' ? 'var(--accent-emerald)' : pattern.pattern === 'state_machine' ? 'var(--accent-amber)' : 'var(--accent-blue)',
                                  padding: '2px 8px',
                                  fontSize: 'var(--text-xs)',
                                }}>
                                  {pattern.pattern.replace('_', ' ')}
                                </span>
                              </div>
                              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>{pattern.stateValues.length} states detected</span>
                            </div>
                            <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                              <div className="flex flex-wrap" style={{ gap: 'var(--space-2)' }}>
                                {pattern.stateValues.map((state, j) => (
                                  <div
                                    key={j}
                                    className="text-center"
                                    style={{ background: 'var(--surface-3)', padding: 'var(--space-2) var(--space-3)', minWidth: '60px' }}
                                  >
                                    <div className="font-mono font-bold" style={{ color: 'var(--accent-amber)', fontSize: 'var(--text-lg)' }}>
                                      {state.value}
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: '10px' }}>
                                      {state.locations.length} ref{state.locations.length !== 1 ? 's' : ''}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {sequenceData.sequences.length === 0 && sequenceData.statePatterns.length === 0 && (
                    <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}>
                      <IconSequence />
                      <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>No sequences or state patterns detected</p>
                      <p style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)' }}>Tip: Look for SQO/SQI instructions or tags with Step/State/Phase in the name</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}>
                  <IconSequence />
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>Loading sequence data...</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Safety View */}
        {activeTab === 'safety' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}>
            <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-4)' }}>
              {safetyData && (
                <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
                  <span>{safetyData.summary.total} Safety Items</span>
                  {safetyData.summary.critical > 0 && (
                    <span className="font-semibold" style={{ background: 'rgba(239,68,68,0.2)', color: 'rgb(239,68,68)', padding: '2px 8px' }}>
                      {safetyData.summary.critical} Critical
                    </span>
                  )}
                  {safetyData.summary.high > 0 && (
                    <span style={{ background: 'rgba(251,146,60,0.2)', color: 'rgb(251,146,60)', padding: '2px 8px' }}>
                      {safetyData.summary.high} High
                    </span>
                  )}
                  {safetyData.summary.medium > 0 && (
                    <span style={{ background: 'rgba(250,204,21,0.2)', color: 'rgb(202,138,4)', padding: '2px 8px' }}>
                      {safetyData.summary.medium} Medium
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: 'var(--space-4)' }}>
              {analysisLoading === 'safety' ? (
                <div className="flex items-center justify-center" style={{ height: '128px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Scanning for safety-related logic...</span>
                </div>
              ) : safetyData && safetyData.safetyItems.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {/* Category summary - responsive grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4" style={{ gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                    {safetyData.summary.byCategory.estop > 0 && (
                      <div className="text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: 'var(--space-3)' }}>
                        <div className="font-bold" style={{ color: 'rgb(239,68,68)', fontSize: 'var(--text-2xl)' }}>{safetyData.summary.byCategory.estop}</div>
                        <div className="uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>E-Stops</div>
                      </div>
                    )}
                    {safetyData.summary.byCategory.guard > 0 && (
                      <div className="text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: 'var(--space-3)' }}>
                        <div className="font-bold" style={{ color: 'rgb(239,68,68)', fontSize: 'var(--text-2xl)' }}>{safetyData.summary.byCategory.guard}</div>
                        <div className="uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Guards</div>
                      </div>
                    )}
                    {safetyData.summary.byCategory.lightcurtain > 0 && (
                      <div className="text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', padding: 'var(--space-3)' }}>
                        <div className="font-bold" style={{ color: 'rgb(239,68,68)', fontSize: 'var(--text-2xl)' }}>{safetyData.summary.byCategory.lightcurtain}</div>
                        <div className="uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Light Curtains</div>
                      </div>
                    )}
                    {safetyData.summary.byCategory.interlock > 0 && (
                      <div className="text-center" style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', padding: 'var(--space-3)' }}>
                        <div className="font-bold" style={{ color: 'rgb(251,146,60)', fontSize: 'var(--text-2xl)' }}>{safetyData.summary.byCategory.interlock}</div>
                        <div className="uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Interlocks</div>
                      </div>
                    )}
                    {safetyData.summary.byCategory.fault > 0 && (
                      <div className="text-center" style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)', padding: 'var(--space-3)' }}>
                        <div className="font-bold" style={{ color: 'rgb(251,146,60)', fontSize: 'var(--text-2xl)' }}>{safetyData.summary.byCategory.fault}</div>
                        <div className="uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Faults</div>
                      </div>
                    )}
                    {safetyData.summary.byCategory.alarm > 0 && (
                      <div className="text-center" style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', padding: 'var(--space-3)' }}>
                        <div className="font-bold" style={{ color: 'rgb(202,138,4)', fontSize: 'var(--text-2xl)' }}>{safetyData.summary.byCategory.alarm}</div>
                        <div className="uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Alarms</div>
                      </div>
                    )}
                    {safetyData.summary.byCategory.reset > 0 && (
                      <div className="text-center" style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)', padding: 'var(--space-3)' }}>
                        <div className="font-bold" style={{ color: 'rgb(202,138,4)', fontSize: 'var(--text-2xl)' }}>{safetyData.summary.byCategory.reset}</div>
                        <div className="uppercase tracking-wider" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Resets</div>
                      </div>
                    )}
                  </div>

                  {/* Safety items list */}
                  {safetyData.safetyItems.map((item, i) => (
                    <div
                      key={`${item.tagName}-${item.category}`}
                      className="overflow-hidden animate-fade-in"
                      style={{
                        background: 'var(--surface-1)',
                        border: `1px solid ${item.severity === 'critical' ? 'rgba(239,68,68,0.4)' : item.severity === 'high' ? 'rgba(251,146,60,0.4)' : 'var(--border-subtle)'}`,
                        animationDelay: `${i * 20}ms`
                      }}
                    >
                      <div
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
                        style={{
                          background: item.severity === 'critical' ? 'rgba(239,68,68,0.1)' : item.severity === 'high' ? 'rgba(251,146,60,0.1)' : 'var(--surface-3)',
                          padding: 'var(--space-3) var(--space-4)',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-3)' }}>
                          <IconSafety />
                          <code
                            className="font-mono font-semibold"
                            style={{
                              color: item.severity === 'critical' ? 'rgb(239,68,68)' : item.severity === 'high' ? 'rgb(251,146,60)' : 'var(--accent-amber)',
                              fontSize: '14px',
                            }}
                          >
                            {item.tagName}
                          </code>
                          <span
                            className="uppercase font-semibold"
                            style={{
                              background: item.severity === 'critical' ? 'rgb(239,68,68)' : item.severity === 'high' ? 'rgb(251,146,60)' : 'rgb(202,138,4)',
                              color: 'white',
                              padding: '2px 8px',
                              fontSize: '10px',
                            }}
                          >
                            {item.severity}
                          </span>
                          <span style={{ background: 'var(--surface-4)', color: 'var(--text-secondary)', padding: '2px 8px', fontSize: 'var(--text-xs)' }}>
                            {item.category}
                          </span>
                        </div>
                        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                          {item.locations.length} location{item.locations.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="border-t" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-2) var(--space-4)' }}>
                        <p style={{ color: 'var(--text-secondary)', fontSize: 'var(--text-sm)', marginBottom: 'var(--space-2)' }}>{item.description}</p>
                        {item.locations.length > 0 && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
                            {item.locations.slice(0, 5).map((loc, j) => (
                              <div key={j} className="flex flex-wrap items-start" style={{ background: 'var(--surface-0)', padding: 'var(--space-2)', gap: 'var(--space-2)', fontSize: 'var(--text-xs)' }}>
                                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                                  {loc.program}/{loc.routine}:{loc.rungNumber}
                                </span>
                                <span style={{ color: 'var(--text-tertiary)' }}>{loc.context}</span>
                              </div>
                            ))}
                            {item.locations.length > 5 && (
                              <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
                                +{item.locations.length - 5} more locations...
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}>
                  <IconSafety />
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>No safety-related logic detected</p>
                  <p style={{ marginTop: 'var(--space-1)', fontSize: 'var(--text-xs)' }}>This scan looks for E-stops, guards, interlocks, alarms, and fault handling</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Produced/Consumed View */}
        {activeTab === 'produced' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}>
            <div className="flex-shrink-0 border-b" style={{ borderColor: 'var(--border-subtle)', padding: 'var(--space-4)' }}>
              {producedConsumedData && (
                <div className="flex flex-wrap items-center" style={{ gap: 'var(--space-4)', fontSize: 'var(--text-xs)' }}>
                  <span style={{ color: 'var(--accent-emerald)' }}>{producedConsumedData.summary.producedCount} Produced Tags</span>
                  <span style={{ color: 'var(--accent-blue)' }}>{producedConsumedData.summary.consumedCount} Consumed Tags</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto" style={{ padding: 'var(--space-4)' }}>
              {analysisLoading === 'produced' ? (
                <div className="flex items-center justify-center" style={{ height: '128px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Analyzing Produced/Consumed tags...</span>
                </div>
              ) : producedConsumedData ? (
                <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'var(--space-6)' }}>
                  {/* Produced Tags */}
                  <div>
                    <h3 className="font-semibold flex items-center" style={{ color: 'var(--accent-emerald)', fontSize: 'var(--text-sm)', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                      <span style={{ width: '8px', height: '8px', background: 'currentColor' }}></span>
                      Produced Tags (Outgoing)
                    </h3>
                    {producedConsumedData.produced.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {producedConsumedData.produced.map((tag, i) => (
                          <div
                            key={tag.name}
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', padding: 'var(--space-3)' }}
                          >
                            <code className="font-mono" style={{ color: 'var(--accent-emerald)', fontSize: '13px' }}>
                              {tag.name}
                            </code>
                            <div className="flex items-center" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                              <span style={{ background: 'var(--surface-3)', color: 'var(--text-muted)', padding: '2px 6px', fontSize: '10px' }}>
                                {tag.dataType}
                              </span>
                            </div>
                            {tag.description && (
                              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                                {tag.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ background: 'var(--surface-1)', color: 'var(--text-muted)', padding: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                        No produced tags detected
                      </div>
                    )}
                  </div>

                  {/* Consumed Tags */}
                  <div>
                    <h3 className="font-semibold flex items-center" style={{ color: 'var(--accent-blue)', fontSize: 'var(--text-sm)', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                      <span style={{ width: '8px', height: '8px', background: 'currentColor' }}></span>
                      Consumed Tags (Incoming)
                    </h3>
                    {producedConsumedData.consumed.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {producedConsumedData.consumed.map((tag, i) => (
                          <div
                            key={tag.name}
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', padding: 'var(--space-3)' }}
                          >
                            <code className="font-mono" style={{ color: 'var(--accent-blue)', fontSize: '13px' }}>
                              {tag.name}
                            </code>
                            <div className="flex items-center" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-1)' }}>
                              <span style={{ background: 'var(--surface-3)', color: 'var(--text-muted)', padding: '2px 6px', fontSize: '10px' }}>
                                {tag.dataType}
                              </span>
                              {tag.producer && (
                                <span style={{ color: 'var(--text-tertiary)', fontSize: '10px' }}>
                                  from {tag.producer}
                                </span>
                              )}
                            </div>
                            {tag.description && (
                              <p style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                                {tag.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ background: 'var(--surface-1)', color: 'var(--text-muted)', padding: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                        No consumed tags detected
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center" style={{ color: 'var(--text-muted)', padding: 'var(--space-12) 0' }}>
                  <IconProduced />
                  <p style={{ marginTop: 'var(--space-2)', fontSize: 'var(--text-sm)' }}>No Produced/Consumed data</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Report View */}
        {activeTab === 'report' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}>
            <div className="flex-1 overflow-auto" style={{ padding: 'var(--space-6)' }}>
              <div style={{ maxWidth: '640px', margin: '0 auto' }}>
                <h2 className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-xl)', marginBottom: 'var(--space-6)' }}>Generate Project Report</h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
                  Export a comprehensive report of the PLC project including programs, routines, tags, and analysis.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <a
                    href={`/api/projects/${project.id}/report?format=json`}
                    className="flex items-center transition-colors"
                    style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)', border: '1px solid var(--border-default)', padding: 'var(--space-4)', gap: 'var(--space-3)', minHeight: 'var(--touch-target-min)' }}
                    target="_blank"
                  >
                    <IconDownload />
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>JSON Report</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Raw data format for programmatic use</div>
                    </div>
                  </a>
                  <a
                    href={`/api/projects/${project.id}/report?format=markdown`}
                    className="flex items-center transition-colors"
                    style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)', border: '1px solid var(--border-default)', padding: 'var(--space-4)', gap: 'var(--space-3)', minHeight: 'var(--touch-target-min)' }}
                    target="_blank"
                  >
                    <IconDownload />
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Markdown Report</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Human-readable documentation format</div>
                    </div>
                  </a>
                  <a
                    href={`/api/projects/${project.id}/report?format=html`}
                    className="flex items-center transition-colors"
                    style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)', border: '1px solid var(--border-default)', padding: 'var(--space-4)', gap: 'var(--space-3)', minHeight: 'var(--touch-target-min)' }}
                    target="_blank"
                  >
                    <IconDownload />
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>HTML Report</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Printable web page format</div>
                    </div>
                  </a>
                  <button
                    onClick={handleExportCSV}
                    className="w-full flex items-center transition-colors text-left"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--accent-emerald)', padding: 'var(--space-4)', gap: 'var(--space-3)', minHeight: 'var(--touch-target-min)' }}
                  >
                    <IconExportCSV />
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>CSV Tag Export</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>All tags with addresses, types, and usage data</div>
                    </div>
                  </button>
                  <button
                    onClick={handleExportForDiff}
                    className="w-full flex items-center transition-colors text-left"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--accent-blue)', padding: 'var(--space-4)', gap: 'var(--space-3)', minHeight: 'var(--touch-target-min)' }}
                  >
                    <IconDiff />
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Export for Diff</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>JSON snapshot for version comparison in the Diff tool</div>
                    </div>
                  </button>
                </div>

                <h3 className="font-semibold" style={{ color: 'var(--text-primary)', fontSize: 'var(--text-lg)', marginTop: 'var(--space-8)', marginBottom: 'var(--space-4)' }}>Operator Documentation</h3>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                  Generate human-readable documentation explaining the PLC logic in plain language for operators and maintenance personnel.
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  <a
                    href={`/api/projects/${project.id}/report?format=operator`}
                    className="flex items-center transition-colors"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--accent-emerald)', padding: 'var(--space-4)', gap: 'var(--space-3)', minHeight: 'var(--touch-target-min)' }}
                    target="_blank"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--accent-emerald)' }}>
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Operator Guide</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>Plain language explanations of ladder logic for operators</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
          </main>
        )}

        {/* Diff View */}
        {activeTab === 'diff' && (
          <main className="flex-1 overflow-hidden" style={{ background: 'var(--surface-0)', containerType: 'inline-size' }}>
            <ProgramDiff
              currentProject={{
                name: project.name,
                processorType: project.processorType,
                programs: project.programs.map(p => ({
                  id: p.id,
                  name: p.name,
                  description: p.description,
                  disabled: p.disabled,
                  routines: p.routines.map(r => ({
                    id: r.id,
                    name: r.name,
                    type: r.type,
                    description: r.description,
                    rungs: r.rungs.map(rung => ({
                      id: rung.id,
                      number: rung.number,
                      comment: rung.comment,
                      rawText: rung.rawText,
                      instructions: rung.instructions ? JSON.parse(rung.instructions) : []
                    }))
                  }))
                }))
              }}
              onClose={() => setActiveTab('ladder')}
            />
          </main>
        )}

        {/* Chat Panel */}
        <ChatPanel
          projectId={project.id}
          isOpen={chatPanelOpen}
          onClose={() => setChatPanelOpen(false)}
        />
      </div>

      {/* Global Search Modal */}
      <GlobalSearch
        projectId={project.id}
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={(result) => {
          // Handle navigation based on result type
          if (result.type === 'routine' && result.location) {
            // Find the program and routine
            const program = project.programs.find(p => p.name === result.location)
            if (program) {
              const routine = program.routines.find(r => r.name === result.name)
              if (routine) {
                setSelectedProgram(program.id)
                setSelectedRoutine(routine.id)
                setActiveTab('ladder')
                setExpandedPrograms(prev => new Set([...prev, program.id]))
              }
            }
          } else if (result.type === 'rung' && result.location) {
            // Parse "ProgramName/RoutineName"
            const [progName, routName] = result.location.split('/')
            const program = project.programs.find(p => p.name === progName)
            if (program) {
              const routine = program.routines.find(r => r.name === routName)
              if (routine) {
                setSelectedProgram(program.id)
                setSelectedRoutine(routine.id)
                setActiveTab('ladder')
                setExpandedPrograms(prev => new Set([...prev, program.id]))

                // Scroll to the specific rung after a short delay (to let the view render)
                if (result.rungId) {
                  setTimeout(() => {
                    const rungElement = document.getElementById(`rung-${result.rungId}`)
                    if (rungElement) {
                      rungElement.scrollIntoView({ behavior: 'smooth', block: 'center' })
                      // Highlight the rung briefly
                      rungElement.style.outline = '2px solid var(--accent-blue)'
                      rungElement.style.outlineOffset = '4px'
                      setTimeout(() => {
                        rungElement.style.outline = ''
                        rungElement.style.outlineOffset = ''
                      }, 2000)
                    }
                  }, 300)
                }
              }
            }
          } else if (result.type === 'tag') {
            // Open in-ladder tag search to find where this tag is used
            setActiveTab('ladder')
            setTagSearchTerm(result.name)
            setTagSearchOpen(true)
          } else if (result.type === 'aoi') {
            setActiveTab('aoi')
          } else if (result.type === 'udt') {
            setActiveTab('udt')
          } else if (result.type === 'module') {
            setActiveTab('modules')
          }
        }}
      />

      {/* Tag Search Bar - appears when Ctrl+F is pressed in ladder view */}
      <TagSearchBar
        isOpen={tagSearchOpen}
        onClose={() => {
          setTagSearchOpen(false)
          setTagSearchTerm('')
        }}
        searchTerm={tagSearchTerm}
        onSearchChange={setTagSearchTerm}
        matchCount={tagSearchMatches.length}
        currentMatchIndex={currentTagSearchMatchIndex}
        onNavigateNext={handleTagSearchNext}
        onNavigatePrev={handleTagSearchPrev}
      />

      {/* PDF Export Modal */}
      <PDFExportModal
        isOpen={pdfExportModalOpen}
        onClose={() => setPdfExportModalOpen(false)}
        rungs={(currentRoutine?.rungs || []).map(rung => ({
          ...rung,
          explanation: rungExplanations[rung.id]?.text || rung.explanation
        }))}
        projectName={project.name}
        programName={currentProgram?.name}
        routineName={currentRoutine?.name}
        onGenerateAllExplanations={handleGenerateAllExplanations}
      />
    </div>
  )
}

// Call tree visualization component - touch optimized
function CallTreeView({ node, depth }: { node: CallTreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2)

  if (!node) return null

  const hasChildren = node.children && node.children.length > 0

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <button
        className="flex items-center w-full text-left cursor-pointer transition-colors"
        style={{
          background: depth === 0 ? 'var(--surface-2)' : 'transparent',
          gap: 'var(--space-2)',
          padding: 'var(--space-2)',
          minHeight: 'var(--touch-target-min)',
        }}
        onClick={() => hasChildren && setExpanded(!expanded)}
        disabled={!hasChildren}
        aria-expanded={hasChildren ? expanded : undefined}
      >
        {hasChildren ? (
          <IconChevron expanded={expanded} />
        ) : (
          <span style={{ width: '12px' }} />
        )}
        <code
          className="font-mono"
          style={{ color: node.circular ? 'var(--accent-red)' : 'var(--accent-emerald)', fontSize: '13px' }}
        >
          {node.name}
        </code>
        {node.circular && (
          <span style={{ background: 'var(--accent-red-muted)', color: 'var(--accent-red)', padding: '2px 6px', fontSize: '10px' }}>
            circular
          </span>
        )}
        <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
          {node.program}
        </span>
      </button>
      {expanded && hasChildren && (
        <div>
          {node.children.map((child, i) => (
            <CallTreeView key={`${child.fullPath}-${i}`} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  )
}
