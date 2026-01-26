'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { LadderRung } from '../ladder/LadderRung'
import { ChatPanel } from '../chat/ChatPanel'
import { GlobalSearch } from '../search/GlobalSearch'
import { StructuredTextViewer } from '../structured-text/StructuredTextViewer'

interface Tag {
  id: string
  name: string
  dataType: string
  scope: string
  description: string | null
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
}

interface RungExplanation {
  text: string
  source: 'library' | 'ai' | 'hybrid' | 'learned'
  troubleshooting?: string[]
  deviceTypes?: string[]
  crossRefs?: CrossRef[]
  ioMappings?: IoMapping[]
  conditions?: Condition[]
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

type TabType = 'ladder' | 'tags' | 'xref' | 'calltree' | 'timers' | 'io' | 'alarms' | 'aoi' | 'udt' | 'tasks' | 'modules' | 'produced' | 'sequences' | 'safety' | 'report'

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
  const [ioData, setIOData] = useState<{ inputs: IOPoint[]; outputs: IOPoint[] } | null>(null)
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
          setIOData({ inputs: data.inputs, outputs: data.outputs })
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
          conditions: data.conditions
        }
      }))
    } catch (error) {
      console.error('Error explaining rung:', error)
    }
  }

  const filteredTags = project.tags.filter(
    tag =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
    <div className="h-screen flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* Header bar */}
      <header
        className="flex-shrink-0 h-12 flex items-center justify-between px-2 sm:px-4 border-b"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Hamburger menu for mobile - only show on ladder tab */}
          {activeTab === 'ladder' && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center justify-center w-8 h-8 rounded transition-colors lg:hidden"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={e => {
                e.currentTarget.style.color = 'var(--text-primary)'
                e.currentTarget.style.background = 'var(--surface-3)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.color = 'var(--text-secondary)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              {sidebarOpen ? <IconClose /> : <IconMenu />}
            </button>
          )}

          {/* Back home link */}
          <a
            href="/"
            className="flex items-center gap-2 px-2 py-1 rounded transition-colors"
            style={{ color: 'var(--text-tertiary)' }}
            onMouseEnter={e => {
              e.currentTarget.style.color = 'var(--text-primary)'
              e.currentTarget.style.background = 'var(--surface-3)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.color = 'var(--text-tertiary)'
              e.currentTarget.style.background = 'transparent'
            }}
          >
            <IconHome />
          </a>

          {/* Divider */}
          <div className="w-px h-5 hidden sm:block" style={{ background: 'var(--border-default)' }} />

          {/* Project info */}
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="font-semibold text-xs sm:text-sm truncate max-w-32 sm:max-w-none" style={{ color: 'var(--text-primary)' }}>
              {project.name}
            </h1>
            {project.processorType && (
              <span className="tech-badge hidden sm:inline">{project.processorType}</span>
            )}
          </div>
        </div>

        {/* Stats and tabs */}
        <div className="flex items-center gap-4">
          {/* Quick stats */}
          <div className="hidden sm:flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>{project.programs.length} programs</span>
            <span>{totalRoutines} routines</span>
            <span>{totalRungs} rungs</span>
            <span>{project.tags.length} tags</span>
          </div>

          {/* Tab switcher - Grouped */}
          <div className="tab-nav">
            {/* Primary tabs */}
            <button
              onClick={() => setActiveTab('ladder')}
              className={`tab-item ${activeTab === 'ladder' ? 'tab-item-active' : ''}`}
            >
              <span className="flex items-center gap-1">
                <IconLadder />
                <span className="hidden sm:inline">Ladder</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`tab-item ${activeTab === 'tags' ? 'tab-item-active' : ''}`}
            >
              <span className="flex items-center gap-1">
                <IconTag />
                <span className="hidden sm:inline">Tags</span>
              </span>
            </button>

            {/* Analysis dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenNavDropdown(openNavDropdown === 'analysis' ? null : 'analysis')}
                className={`tab-item ${['xref', 'calltree', 'timers', 'sequences', 'safety'].includes(activeTab) ? 'tab-item-active' : ''}`}
              >
                <span className="flex items-center gap-1">
                  <IconXRef />
                  <span className="hidden sm:inline">Analysis</span>
                  <IconChevronDown open={openNavDropdown === 'analysis'} />
                </span>
              </button>
              {openNavDropdown === 'analysis' && (
                <div
                  className="absolute top-full left-0 mt-1 z-50 min-w-[140px] rounded-lg shadow-xl overflow-hidden"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
                >
                  <button onClick={() => { setActiveTab('xref'); setOpenNavDropdown(null) }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5 ${activeTab === 'xref' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)' }}>
                    <IconXRef /> Cross Reference
                  </button>
                  <button onClick={() => { setActiveTab('calltree'); setOpenNavDropdown(null) }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5 ${activeTab === 'calltree' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)' }}>
                    <IconTree /> Call Tree
                  </button>
                  <button onClick={() => { setActiveTab('timers'); setOpenNavDropdown(null) }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5 ${activeTab === 'timers' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)' }}>
                    <IconTimer /> Timers
                  </button>
                  <button onClick={() => { setActiveTab('sequences'); setOpenNavDropdown(null) }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5 ${activeTab === 'sequences' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)' }}>
                    <IconSequence /> Sequences
                  </button>
                  <button onClick={() => { setActiveTab('safety'); setOpenNavDropdown(null) }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5 ${activeTab === 'safety' ? 'bg-white/10' : ''}`} style={{ color: 'var(--accent-red)' }}>
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
              >
                <span className="flex items-center gap-1">
                  <IconIO />
                  <span className="hidden sm:inline">Hardware</span>
                  <IconChevronDown open={openNavDropdown === 'hardware'} />
                </span>
              </button>
              {openNavDropdown === 'hardware' && (
                <div
                  className="absolute top-full left-0 mt-1 z-50 min-w-[140px] rounded-lg shadow-xl overflow-hidden"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
                >
                  <button onClick={() => { setActiveTab('io'); setOpenNavDropdown(null) }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5 ${activeTab === 'io' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)' }}>
                    <IconIO /> I/O Points
                  </button>
                  <button onClick={() => { setActiveTab('modules'); setOpenNavDropdown(null) }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5 ${activeTab === 'modules' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)' }}>
                    <IconModule /> Modules
                  </button>
                  <button onClick={() => { setActiveTab('alarms'); setOpenNavDropdown(null) }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5 ${activeTab === 'alarms' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)' }}>
                    <IconAlarm /> Alarms
                  </button>
                </div>
              )}
            </div>

            {/* Structure dropdown */}
            <div className="relative">
              <button
                onClick={() => setOpenNavDropdown(openNavDropdown === 'structure' ? null : 'structure')}
                className={`tab-item ${['aoi', 'udt', 'tasks', 'produced'].includes(activeTab) ? 'tab-item-active' : ''}`}
              >
                <span className="flex items-center gap-1">
                  <IconAOI />
                  <span className="hidden sm:inline">Structure</span>
                  <IconChevronDown open={openNavDropdown === 'structure'} />
                </span>
              </button>
              {openNavDropdown === 'structure' && (
                <div
                  className="absolute top-full left-0 mt-1 z-50 min-w-[160px] rounded-lg shadow-xl overflow-hidden"
                  style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
                >
                  <button onClick={() => { setActiveTab('aoi'); setOpenNavDropdown(null) }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5 ${activeTab === 'aoi' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)' }}>
                    <IconAOI /> Add-On Instructions
                  </button>
                  <button onClick={() => { setActiveTab('udt'); setOpenNavDropdown(null) }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5 ${activeTab === 'udt' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)' }}>
                    <IconUDT /> User Data Types
                  </button>
                  <button onClick={() => { setActiveTab('tasks'); setOpenNavDropdown(null) }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5 ${activeTab === 'tasks' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)' }}>
                    <IconTasks /> Tasks
                  </button>
                  <button onClick={() => { setActiveTab('produced'); setOpenNavDropdown(null) }} className={`w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5 ${activeTab === 'produced' ? 'bg-white/10' : ''}`} style={{ color: 'var(--text-secondary)' }}>
                    <IconProduced /> Produced/Consumed
                  </button>
                </div>
              )}
            </div>

            {/* Report tab */}
            <button
              onClick={() => setActiveTab('report')}
              className={`tab-item ${activeTab === 'report' ? 'tab-item-active' : ''}`}
            >
              <span className="flex items-center gap-1">
                <IconReport />
                <span className="hidden sm:inline">Report</span>
              </span>
            </button>
          </div>

          {/* Search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            style={{
              background: 'var(--surface-3)',
              color: 'var(--text-secondary)'
            }}
            title="Search (Cmd+K)"
          >
            <IconSearch />
            <span className="hidden sm:inline">Search</span>
            <kbd className="hidden md:inline ml-1 px-1.5 py-0.5 rounded text-[10px]" style={{ background: 'var(--surface-4)', color: 'var(--text-muted)' }}>
              ⌘K
            </kbd>
          </button>

          {/* Chat button */}
          <button
            onClick={() => setChatPanelOpen(!chatPanelOpen)}
            className={`ml-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              chatPanelOpen ? 'ring-2 ring-blue-500 ring-offset-1 ring-offset-transparent' : ''
            }`}
            style={{
              background: chatPanelOpen ? 'var(--accent-blue)' : 'var(--accent-blue-muted)',
              color: chatPanelOpen ? 'white' : 'var(--accent-blue)'
            }}
            title="AI Assistant"
          >
            <IconChat />
            <span className="hidden sm:inline">Chat</span>
          </button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {activeTab === 'ladder' ? (
          <>
            {/* Mobile overlay backdrop */}
            {sidebarOpen && (
              <div
                className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
            )}

            {/* Sidebar */}
            <aside
              className={`
                flex-shrink-0 overflow-y-auto border-r z-50
                fixed lg:relative inset-y-0 left-0 top-12
                transform transition-transform duration-200 ease-in-out
                ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
              `}
              style={{
                width: sidebarWidth,
                background: 'var(--surface-1)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              {/* Sidebar header */}
              <div
                className="sticky top-0 z-10 p-3 border-b"
                style={{ background: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
              >
                <div className="flex items-center justify-between">
                  <h2
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Programs & Routines
                  </h2>
                  {/* Close button for mobile */}
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden p-1 rounded transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    <IconClose />
                  </button>
                </div>
              </div>

              {/* Program tree */}
              <div className="p-2">
                {project.programs.map(program => {
                  const isExpanded = expandedPrograms.has(program.id)
                  const isSelected = selectedProgram === program.id

                  return (
                    <div key={program.id} className="mb-1">
                      {/* Program header */}
                      <button
                        onClick={() => handleProgramClick(program.id)}
                        className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                          program.disabled ? 'opacity-50' : ''
                        }`}
                        style={{
                          background: isSelected ? 'var(--accent-blue-muted)' : 'transparent',
                          color: isSelected ? 'var(--accent-blue)' : 'var(--text-secondary)'
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
                      >
                        <IconChevron expanded={isExpanded} />
                        <IconProgram />
                        <span className="flex-1 text-[13px] font-medium truncate">{program.name}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {program.routines.length}
                        </span>
                      </button>

                      {/* Routines list */}
                      {isExpanded && (
                        <div className="ml-5 mt-1 space-y-0.5">
                          {program.routines.map(routine => (
                            <button
                              key={routine.id}
                              onClick={() => {
                                setSelectedProgram(program.id) // Ensure correct program is selected
                                setSelectedRoutine(routine.id)
                                setSidebarOpen(false) // Close sidebar on mobile after selection
                              }}
                              className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors"
                              style={{
                                background: selectedRoutine === routine.id ? 'var(--accent-emerald-muted)' : 'transparent',
                                color: selectedRoutine === routine.id ? 'var(--accent-emerald)' : 'var(--text-tertiary)'
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
                              <span className="flex-1 text-[12px] truncate">{routine.name}</span>
                              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
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

            {/* Main content area */}
            <main className="flex-1 overflow-y-auto overflow-x-hidden" style={{ background: 'var(--surface-0)' }}>
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
                <div className="p-3 sm:p-6">
                  {/* Routine header */}
                  <div className="mb-4 sm:mb-6">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 flex-wrap">
                      <h2 className="text-lg sm:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {currentRoutine.name}
                      </h2>
                      <span
                        className="px-2 py-0.5 rounded text-[11px] font-medium"
                        style={{
                          background: 'var(--surface-3)',
                          color: 'var(--text-tertiary)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        {currentRoutine.type}
                      </span>
                    </div>
                    {currentRoutine.description && (
                      <p className="text-sm mb-2" style={{ color: 'var(--text-tertiary)' }}>
                        {currentRoutine.description}
                      </p>
                    )}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
                      <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                        <span>{currentRoutine.rungs.length} rungs</span>
                        <span className="hidden sm:inline">in {currentProgram?.name}</span>
                        {bookmarkedRungs.size > 0 && (
                          <span style={{ color: 'var(--accent-amber)' }}>
                            {bookmarkedRungs.size} bookmarked
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {/* Bookmarks filter */}
                        {bookmarkedRungs.size > 0 && (
                          <button
                            onClick={() => setShowOnlyBookmarked(!showOnlyBookmarked)}
                            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs rounded-md transition-colors"
                            style={{
                              background: showOnlyBookmarked ? 'var(--accent-amber-muted)' : 'var(--surface-2)',
                              color: showOnlyBookmarked ? 'var(--accent-amber)' : 'var(--text-secondary)',
                              border: '1px solid var(--border-subtle)'
                            }}
                            title={showOnlyBookmarked ? 'Show all rungs' : 'Show only bookmarked'}
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill={showOnlyBookmarked ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                            </svg>
                            <span className="hidden xs:inline">{showOnlyBookmarked ? 'All' : 'Bookmarks'}</span>
                          </button>
                        )}
                        {/* View mode toggle */}
                        <div
                          className="flex rounded-md overflow-hidden"
                          style={{ border: '1px solid var(--border-subtle)' }}
                        >
                          <button
                            onClick={() => setLadderViewMode('graphic')}
                            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs transition-colors"
                            style={{
                              background: ladderViewMode === 'graphic' ? 'var(--accent-blue)' : 'var(--surface-2)',
                              color: ladderViewMode === 'graphic' ? 'white' : 'var(--text-secondary)'
                            }}
                            title="Graphic view"
                          >
                            <IconGraphic />
                            <span className="hidden xs:inline">Graphic</span>
                          </button>
                          <button
                            onClick={() => setLadderViewMode('simple')}
                            className="flex items-center gap-1.5 px-2 sm:px-3 py-1.5 text-xs transition-colors"
                            style={{
                              background: ladderViewMode === 'simple' ? 'var(--accent-blue)' : 'var(--surface-2)',
                              color: ladderViewMode === 'simple' ? 'white' : 'var(--text-secondary)',
                              borderLeft: '1px solid var(--border-subtle)'
                            }}
                            title="Simple text view"
                          >
                            <IconText />
                            <span className="hidden xs:inline">Simple</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rungs list */}
                  <div className="space-y-3">
                    {currentRoutine.rungs
                      .filter(rung => !showOnlyBookmarked || bookmarkedRungs.has(rung.id))
                      .map((rung, index) => (
                      <div
                        key={rung.id}
                        className="animate-fade-in"
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
                          />
                        ) : (
                          /* Simple text view */
                          <div
                            className="rounded-lg overflow-hidden"
                            style={{
                              background: 'var(--surface-2)',
                              border: '1px solid var(--border-subtle)'
                            }}
                          >
                            {/* Header */}
                            <div
                              className="flex items-center justify-between px-4 py-2 border-b"
                              style={{ borderColor: 'var(--border-subtle)' }}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
                                  style={{
                                    background: 'var(--surface-4)',
                                    color: 'var(--text-secondary)'
                                  }}
                                >
                                  {rung.number}
                                </span>
                                {rung.comment && (
                                  <span
                                    className="text-xs italic truncate max-w-md"
                                    style={{ color: 'var(--text-tertiary)' }}
                                  >
                                    {rung.comment}
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleExplain(rung.id)}
                                className="flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors"
                                style={{
                                  background: 'var(--accent-blue-muted)',
                                  color: 'var(--accent-blue)'
                                }}
                              >
                                Explain
                              </button>
                            </div>
                            {/* Raw text */}
                            <div
                              className="px-4 py-3"
                              style={{ background: 'var(--surface-1)' }}
                            >
                              <pre
                                className="text-[12px] font-mono whitespace-pre-wrap break-all leading-relaxed"
                                style={{ color: 'var(--text-secondary)' }}
                              >
                                {rung.rawText}
                              </pre>
                            </div>
                            {/* Explanation if available */}
                            {(rungExplanations[rung.id]?.text || rung.explanation) && (
                              <div
                                className="px-4 py-3 border-t"
                                style={{
                                  background: 'var(--accent-emerald-muted)',
                                  borderColor: 'rgba(16, 185, 129, 0.2)'
                                }}
                              >
                                <p
                                  className="text-sm leading-relaxed"
                                  style={{ color: 'var(--text-secondary)' }}
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
                </div>
                )
              ) : (
                <div
                  className="flex items-center justify-center h-full"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <div className="text-center">
                    <IconLadder />
                    <p className="mt-2 text-sm">Select a routine to view ladder logic</p>
                  </div>
                </div>
              )}
            </main>
          </>
        ) : (
          /* Tags View */
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
            {/* Search header */}
            <div
              className="flex-shrink-0 p-4 border-b"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="relative max-w-md">
                <div
                  className="absolute left-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <IconSearch />
                </div>
                <input
                  type="text"
                  placeholder="Search tags by name or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="input-field w-full pl-9"
                />
              </div>
              <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>
                {filteredTags.length} of {project.tags.length} tags
              </p>
            </div>

            {/* Tags table */}
            <div className="flex-1 overflow-auto p-4">
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
                          className="text-[13px] font-mono"
                          style={{ color: 'var(--accent-emerald)' }}
                        >
                          {tag.name}
                        </code>
                      </td>
                      <td>
                        <span
                          className="px-2 py-0.5 rounded text-xs font-mono"
                          style={{
                            background: 'var(--accent-blue-muted)',
                            color: 'var(--accent-blue)'
                          }}
                        >
                          {tag.dataType}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-tertiary)' }}>
                        {tag.scope}
                      </td>
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {tag.description || <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {filteredTags.length === 0 && (
                <div
                  className="text-center py-12"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <IconTag />
                  <p className="mt-2 text-sm">No tags found matching "{searchQuery}"</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Cross-Reference View */}
        {activeTab === 'xref' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
            <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-4">
                <div className="relative max-w-md flex-1">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }}>
                    <IconSearch />
                  </div>
                  <input
                    type="text"
                    placeholder="Filter tags..."
                    value={xrefFilter}
                    onChange={(e) => setXrefFilter(e.target.value)}
                    className="input-field w-full pl-9"
                  />
                </div>
                {xrefData && (
                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    {xrefData.totalReferences} references across {xrefData.tags.length} tags
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 overflow-auto p-4">
              {analysisLoading === 'xref' ? (
                <div className="flex items-center justify-center h-32">
                  <span style={{ color: 'var(--text-muted)' }}>Loading cross-reference data...</span>
                </div>
              ) : xrefData ? (
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
                            <code className="text-[13px] font-mono" style={{ color: 'var(--accent-emerald)' }}>
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
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <IconXRef />
                  <p className="mt-2 text-sm">No cross-reference data</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Call Tree View */}
        {activeTab === 'calltree' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
            <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              {callTreeData && (
                <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{callTreeData.roots.length} entry points</span>
                  <span>{callTreeData.orphans.length} orphan routines</span>
                  <span>{callTreeData.circular.length} circular references</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {analysisLoading === 'calltree' ? (
                <div className="flex items-center justify-center h-32">
                  <span style={{ color: 'var(--text-muted)' }}>Analyzing call tree...</span>
                </div>
              ) : callTreeData ? (
                <div className="space-y-4">
                  {callTreeData.trees.map((tree, i) => (
                    <CallTreeView key={i} node={tree} depth={0} />
                  ))}
                  {callTreeData.orphans.length > 0 && (
                    <div className="mt-6 p-4 rounded" style={{ background: 'var(--surface-2)' }}>
                      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                        Orphan Routines (not called by anyone)
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {callTreeData.orphans.map(orphan => (
                          <span key={orphan} className="px-2 py-1 rounded text-xs" style={{ background: 'var(--surface-3)', color: 'var(--text-tertiary)' }}>
                            {orphan}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {callTreeData.circular.length > 0 && (
                    <div className="mt-4 p-4 rounded" style={{ background: 'var(--accent-amber-muted)' }}>
                      <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--accent-amber)' }}>
                        Circular References Detected
                      </h3>
                      {callTreeData.circular.map((cycle, i) => (
                        <div key={i} className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                          {cycle.join(' → ')}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <IconTree />
                  <p className="mt-2 text-sm">No call tree data</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Timers/Counters View */}
        {activeTab === 'timers' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
            <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              {timerData && (
                <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{timerData.timers.length} timers</span>
                  <span>{timerData.counters.length} counters</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {analysisLoading === 'timers' ? (
                <div className="flex items-center justify-center h-32">
                  <span style={{ color: 'var(--text-muted)' }}>Analyzing timers and counters...</span>
                </div>
              ) : timerData ? (
                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Timers</h3>
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
                            <td><code className="text-[13px] font-mono" style={{ color: 'var(--accent-emerald)' }}>{timer.tagName}</code></td>
                            <td><span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--accent-blue-muted)', color: 'var(--accent-blue)' }}>{timer.type}</span></td>
                            <td style={{ color: 'var(--text-secondary)' }}>{timer.presetDisplay || timer.preset || '?'}</td>
                            <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                              {timer.locations.slice(0, 2).map((l, j) => (
                                <span key={j}>{l.routine}:{l.rungNumber}{j < Math.min(timer.locations.length, 2) - 1 && ', '}</span>
                              ))}
                              {timer.locations.length > 2 && ` +${timer.locations.length - 2}`}
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{timer.resets.length || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-primary)' }}>Counters</h3>
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
                            <td><code className="text-[13px] font-mono" style={{ color: 'var(--accent-emerald)' }}>{counter.tagName}</code></td>
                            <td><span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--accent-amber-muted)', color: 'var(--accent-amber)' }}>{counter.type}</span></td>
                            <td style={{ color: 'var(--text-secondary)' }}>{counter.presetDisplay || counter.preset || '?'}</td>
                            <td style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>
                              {counter.locations.slice(0, 2).map((l, j) => (
                                <span key={j}>{l.routine}:{l.rungNumber}{j < Math.min(counter.locations.length, 2) - 1 && ', '}</span>
                              ))}
                              {counter.locations.length > 2 && ` +${counter.locations.length - 2}`}
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{counter.resets.length || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <IconTimer />
                  <p className="mt-2 text-sm">No timer/counter data</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* I/O View */}
        {activeTab === 'io' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
            <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              {ioData && (
                <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--accent-emerald)' }}>{ioData.inputs.length} inputs</span>
                  <span style={{ color: 'var(--accent-amber)' }}>{ioData.outputs.length} outputs</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {analysisLoading === 'io' ? (
                <div className="flex items-center justify-center h-32">
                  <span style={{ color: 'var(--text-muted)' }}>Analyzing I/O points...</span>
                </div>
              ) : ioData ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-emerald)' }}>
                      <span className="w-2 h-2 rounded-full bg-current"></span> Inputs
                    </h3>
                    <div className="space-y-2">
                      {ioData.inputs.map((io, i) => (
                        <div key={io.tagName} className="p-3 rounded" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
                          {io.aliasName ? (
                            <>
                              <code className="text-[13px] font-mono font-semibold" style={{ color: 'var(--accent-emerald)' }}>{io.aliasName}</code>
                              <div className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>{io.tagName}</div>
                            </>
                          ) : (
                            <code className="text-[13px] font-mono" style={{ color: 'var(--accent-emerald)' }}>{io.tagName}</code>
                          )}
                          {io.description && <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{io.description}</div>}
                          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Used {io.usage.length} times</div>
                        </div>
                      ))}
                      {ioData.inputs.length === 0 && (
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No inputs found</div>
                      )}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-amber)' }}>
                      <span className="w-2 h-2 rounded-full bg-current"></span> Outputs
                    </h3>
                    <div className="space-y-2">
                      {ioData.outputs.map((io, i) => (
                        <div key={io.tagName} className="p-3 rounded" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
                          {io.aliasName ? (
                            <>
                              <code className="text-[13px] font-mono font-semibold" style={{ color: 'var(--accent-amber)' }}>{io.aliasName}</code>
                              <div className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>{io.tagName}</div>
                            </>
                          ) : (
                            <code className="text-[13px] font-mono" style={{ color: 'var(--accent-amber)' }}>{io.tagName}</code>
                          )}
                          {io.description && <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{io.description}</div>}
                          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Used {io.usage.length} times</div>
                        </div>
                      ))}
                      {ioData.outputs.length === 0 && (
                        <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No outputs found</div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <IconIO />
                  <p className="mt-2 text-sm">No I/O data</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Alarms View */}
        {activeTab === 'alarms' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
            <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              {alarmData && (
                <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{alarmData.alarms.length} alarms/faults detected</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {analysisLoading === 'alarms' ? (
                <div className="flex items-center justify-center h-32">
                  <span style={{ color: 'var(--text-muted)' }}>Analyzing alarms...</span>
                </div>
              ) : alarmData ? (
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
                        <td><code className="text-[13px] font-mono" style={{ color: 'var(--accent-rose)' }}>{alarm.tagName}</code></td>
                        <td><span className="px-2 py-0.5 rounded text-xs" style={{ background: 'var(--surface-3)', color: 'var(--text-tertiary)' }}>{alarm.type}</span></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>{alarm.message || '—'}</td>
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
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <IconAlarm />
                  <p className="mt-2 text-sm">No alarm data</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* AOI View */}
        {activeTab === 'aoi' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
            <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              {aoiData && (
                <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{aoiData.aois.length} Add-On Instructions</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {analysisLoading === 'aoi' ? (
                <div className="flex items-center justify-center h-32">
                  <span style={{ color: 'var(--text-muted)' }}>Loading Add-On Instructions...</span>
                </div>
              ) : aoiData && aoiData.aois.length > 0 ? (
                <div className="space-y-4">
                  {aoiData.aois.map((aoi, i) => {
                    const params = aoi.parameters ? JSON.parse(aoi.parameters) : []
                    const localTags = aoi.localTags ? JSON.parse(aoi.localTags) : []
                    return (
                      <div key={aoi.name} className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
                        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                          <div className="flex items-center gap-3">
                            <code className="text-[14px] font-mono font-semibold" style={{ color: 'var(--accent-blue)' }}>{aoi.name}</code>
                            <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--accent-blue-muted)', color: 'var(--accent-blue)' }}>AOI</span>
                          </div>
                          {aoi.description && <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{aoi.description}</p>}
                        </div>
                        <div className="px-4 py-3">
                          {params.length > 0 && (
                            <div className="mb-3">
                              <h4 className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Parameters ({params.length})</h4>
                              <div className="flex flex-wrap gap-2">
                                {params.slice(0, 10).map((p: { name: string; dataType?: string; usage?: string }, j: number) => (
                                  <span key={j} className="text-xs px-2 py-1 rounded" style={{ background: 'var(--surface-3)', color: 'var(--text-secondary)' }}>
                                    {p.name}: {p.dataType || '?'} {p.usage && <span style={{ color: 'var(--text-muted)' }}>({p.usage})</span>}
                                  </span>
                                ))}
                                {params.length > 10 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{params.length - 10} more</span>}
                              </div>
                            </div>
                          )}
                          {localTags.length > 0 && (
                            <div>
                              <h4 className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Local Tags ({localTags.length})</h4>
                              <div className="flex flex-wrap gap-2">
                                {localTags.slice(0, 8).map((t: { name: string; dataType?: string }, j: number) => (
                                  <span key={j} className="text-xs px-2 py-1 rounded font-mono" style={{ background: 'var(--surface-3)', color: 'var(--accent-emerald)' }}>
                                    {t.name}
                                  </span>
                                ))}
                                {localTags.length > 8 && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>+{localTags.length - 8} more</span>}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <IconAOI />
                  <p className="mt-2 text-sm">No Add-On Instructions found</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* UDT View */}
        {activeTab === 'udt' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
            <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              {udtData && (
                <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{udtData.udts.length} User-Defined Types</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {analysisLoading === 'udt' ? (
                <div className="flex items-center justify-center h-32">
                  <span style={{ color: 'var(--text-muted)' }}>Loading User-Defined Types...</span>
                </div>
              ) : udtData && udtData.udts.length > 0 ? (
                <div className="space-y-4">
                  {udtData.udts.map((udt, i) => {
                    const members = udt.members ? JSON.parse(udt.members) : []
                    return (
                      <div key={udt.name} className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
                        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                          <div className="flex items-center gap-3">
                            <code className="text-[14px] font-mono font-semibold" style={{ color: 'var(--accent-amber)' }}>{udt.name}</code>
                            <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--accent-amber-muted)', color: 'var(--accent-amber)' }}>UDT</span>
                          </div>
                          {udt.description && <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{udt.description}</p>}
                        </div>
                        <div className="px-4 py-3">
                          {members.length > 0 && (
                            <div>
                              <h4 className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Members ({members.length})</h4>
                              <table className="w-full text-xs">
                                <thead>
                                  <tr style={{ color: 'var(--text-muted)' }}>
                                    <th className="text-left py-1">Name</th>
                                    <th className="text-left py-1">Type</th>
                                    <th className="text-left py-1">Description</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {members.slice(0, 15).map((m: { name: string; dataType?: string; description?: string }, j: number) => (
                                    <tr key={j}>
                                      <td className="py-1 font-mono" style={{ color: 'var(--accent-emerald)' }}>{m.name}</td>
                                      <td className="py-1" style={{ color: 'var(--text-secondary)' }}>{m.dataType || '?'}</td>
                                      <td className="py-1" style={{ color: 'var(--text-tertiary)' }}>{m.description || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                              {members.length > 15 && <p className="text-xs mt-2" style={{ color: 'var(--text-muted)' }}>+{members.length - 15} more members</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <IconUDT />
                  <p className="mt-2 text-sm">No User-Defined Types found</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Tasks View */}
        {activeTab === 'tasks' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
            <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              {taskData && (
                <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{taskData.tasks.length} Tasks</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {analysisLoading === 'tasks' ? (
                <div className="flex items-center justify-center h-32">
                  <span style={{ color: 'var(--text-muted)' }}>Loading Tasks...</span>
                </div>
              ) : taskData && taskData.tasks.length > 0 ? (
                <div className="space-y-4">
                  {taskData.tasks.map((task, i) => (
                    <div key={task.name} className="rounded-lg overflow-hidden" style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}>
                      <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                        <div className="flex items-center gap-3">
                          <code className="text-[14px] font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>{task.name}</code>
                          <span className="text-xs px-2 py-0.5 rounded" style={{
                            background: task.type === 'CONTINUOUS' ? 'var(--accent-emerald-muted)' : task.type === 'PERIODIC' ? 'var(--accent-blue-muted)' : 'var(--accent-amber-muted)',
                            color: task.type === 'CONTINUOUS' ? 'var(--accent-emerald)' : task.type === 'PERIODIC' ? 'var(--accent-blue)' : 'var(--accent-amber)'
                          }}>{task.type}</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                          {task.period && <span>Period: {task.period}</span>}
                          {task.priority !== null && <span>Priority: {task.priority}</span>}
                        </div>
                      </div>
                      {task.programs.length > 0 && (
                        <div className="px-4 py-3">
                          <h4 className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>Programs ({task.programs.length})</h4>
                          <div className="flex flex-wrap gap-2">
                            {task.programs.map((prog, j) => (
                              <span key={j} className="text-xs px-2 py-1 rounded font-mono" style={{ background: 'var(--surface-3)', color: 'var(--accent-blue)' }}>
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
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <IconTasks />
                  <p className="mt-2 text-sm">No Tasks found</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Modules View */}
        {activeTab === 'modules' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
            <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              {moduleData && (
                <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{moduleData.modules.length} I/O Modules</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {analysisLoading === 'modules' ? (
                <div className="flex items-center justify-center h-32">
                  <span style={{ color: 'var(--text-muted)' }}>Loading Modules...</span>
                </div>
              ) : moduleData && moduleData.modules.length > 0 ? (
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
                        <td><code className="text-[13px] font-mono" style={{ color: 'var(--accent-emerald)' }}>{mod.name}</code></td>
                        <td style={{ color: 'var(--text-secondary)' }}>{mod.catalogNumber || '—'}</td>
                        <td style={{ color: 'var(--text-tertiary)' }}>{mod.vendor || '—'}</td>
                        <td style={{ color: 'var(--text-tertiary)' }}>{mod.productType || '—'}</td>
                        <td style={{ color: 'var(--text-secondary)' }}>{mod.slot !== null ? mod.slot : '—'}</td>
                        <td style={{ color: 'var(--text-tertiary)' }}>{mod.ipAddress || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <IconModule />
                  <p className="mt-2 text-sm">No I/O Modules found</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Sequences View */}
        {activeTab === 'sequences' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
            <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              {sequenceData && (
                <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--accent-blue)' }}>{sequenceData.stats.totalSequencers} Sequencers</span>
                  <span style={{ color: 'var(--accent-amber)' }}>{sequenceData.stats.totalStatePatterns} State Patterns</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {analysisLoading === 'sequences' ? (
                <div className="flex items-center justify-center h-32">
                  <span style={{ color: 'var(--text-muted)' }}>Analyzing Sequences...</span>
                </div>
              ) : sequenceData ? (
                <div className="space-y-6">
                  {/* Sequencer Instructions */}
                  {sequenceData.sequences.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-blue)' }}>
                        <IconSequence />
                        Sequencer Instructions (SQO/SQI/SQL)
                      </h3>
                      <div className="space-y-3">
                        {sequenceData.sequences.map((seq, i) => (
                          <div
                            key={seq.tagName}
                            className="rounded-lg overflow-hidden animate-fade-in"
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', animationDelay: `${i * 30}ms` }}
                          >
                            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                              <div className="flex items-center gap-3">
                                <code className="text-[14px] font-mono font-semibold" style={{ color: 'var(--accent-blue)' }}>{seq.tagName}</code>
                                <span className="text-xs px-2 py-0.5 rounded" style={{
                                  background: 'var(--accent-blue-muted)',
                                  color: 'var(--accent-blue)'
                                }}>{seq.type}</span>
                                {seq.arrayLength && (
                                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    {seq.arrayLength} steps
                                  </span>
                                )}
                              </div>
                              {seq.mask && (
                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                  Mask: {seq.mask}
                                </span>
                              )}
                            </div>
                            <div className="px-4 py-3">
                              <h4 className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--text-muted)' }}>
                                Locations ({seq.locations.length})
                              </h4>
                              <div className="space-y-1">
                                {seq.locations.slice(0, 5).map((loc, j) => (
                                  <div key={j} className="flex items-center gap-2 text-xs">
                                    <span style={{ color: 'var(--text-secondary)' }}>{loc.program}/{loc.routine}</span>
                                    <span style={{ color: 'var(--text-muted)' }}>Rung {loc.rungNumber}</span>
                                  </div>
                                ))}
                                {seq.locations.length > 5 && (
                                  <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                    +{seq.locations.length - 5} more...
                                  </span>
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
                      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-amber)' }}>
                        <IconSequence />
                        State Machine Patterns
                      </h3>
                      <div className="space-y-3">
                        {sequenceData.statePatterns.map((pattern, i) => (
                          <div
                            key={pattern.tagName}
                            className="rounded-lg overflow-hidden animate-fade-in"
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)', animationDelay: `${i * 30}ms` }}
                          >
                            <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                              <div className="flex items-center gap-3">
                                <code className="text-[14px] font-mono font-semibold" style={{ color: 'var(--accent-amber)' }}>{pattern.tagName}</code>
                                <span className="text-xs px-2 py-0.5 rounded" style={{
                                  background: pattern.pattern === 'phase' ? 'var(--accent-emerald-muted)' : pattern.pattern === 'state_machine' ? 'var(--accent-amber-muted)' : 'var(--accent-blue-muted)',
                                  color: pattern.pattern === 'phase' ? 'var(--accent-emerald)' : pattern.pattern === 'state_machine' ? 'var(--accent-amber)' : 'var(--accent-blue)'
                                }}>
                                  {pattern.pattern.replace('_', ' ')}
                                </span>
                              </div>
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                {pattern.stateValues.length} states detected
                              </span>
                            </div>
                            <div className="px-4 py-3">
                              <div className="flex flex-wrap gap-2">
                                {pattern.stateValues.map((state, j) => (
                                  <div
                                    key={j}
                                    className="px-3 py-2 rounded text-center"
                                    style={{ background: 'var(--surface-3)', minWidth: '60px' }}
                                  >
                                    <div className="text-lg font-mono font-bold" style={{ color: 'var(--accent-amber)' }}>
                                      {state.value}
                                    </div>
                                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
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
                    <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                      <IconSequence />
                      <p className="mt-2 text-sm">No sequences or state patterns detected</p>
                      <p className="text-xs mt-1">Tip: Look for SQO/SQI instructions or tags with Step/State/Phase in the name</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <IconSequence />
                  <p className="mt-2 text-sm">Loading sequence data...</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Safety View */}
        {activeTab === 'safety' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
            <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              {safetyData && (
                <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span>{safetyData.summary.total} Safety Items</span>
                  {safetyData.summary.critical > 0 && (
                    <span className="px-2 py-0.5 rounded font-semibold" style={{ background: 'rgba(239,68,68,0.2)', color: 'rgb(239,68,68)' }}>
                      {safetyData.summary.critical} Critical
                    </span>
                  )}
                  {safetyData.summary.high > 0 && (
                    <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(251,146,60,0.2)', color: 'rgb(251,146,60)' }}>
                      {safetyData.summary.high} High
                    </span>
                  )}
                  {safetyData.summary.medium > 0 && (
                    <span className="px-2 py-0.5 rounded" style={{ background: 'rgba(250,204,21,0.2)', color: 'rgb(202,138,4)' }}>
                      {safetyData.summary.medium} Medium
                    </span>
                  )}
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {analysisLoading === 'safety' ? (
                <div className="flex items-center justify-center h-32">
                  <span style={{ color: 'var(--text-muted)' }}>Scanning for safety-related logic...</span>
                </div>
              ) : safetyData && safetyData.safetyItems.length > 0 ? (
                <div className="space-y-4">
                  {/* Category summary */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {safetyData.summary.byCategory.estop > 0 && (
                      <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <div className="text-2xl font-bold" style={{ color: 'rgb(239,68,68)' }}>{safetyData.summary.byCategory.estop}</div>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>E-Stops</div>
                      </div>
                    )}
                    {safetyData.summary.byCategory.guard > 0 && (
                      <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <div className="text-2xl font-bold" style={{ color: 'rgb(239,68,68)' }}>{safetyData.summary.byCategory.guard}</div>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Guards</div>
                      </div>
                    )}
                    {safetyData.summary.byCategory.lightcurtain > 0 && (
                      <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
                        <div className="text-2xl font-bold" style={{ color: 'rgb(239,68,68)' }}>{safetyData.summary.byCategory.lightcurtain}</div>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Light Curtains</div>
                      </div>
                    )}
                    {safetyData.summary.byCategory.interlock > 0 && (
                      <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)' }}>
                        <div className="text-2xl font-bold" style={{ color: 'rgb(251,146,60)' }}>{safetyData.summary.byCategory.interlock}</div>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Interlocks</div>
                      </div>
                    )}
                    {safetyData.summary.byCategory.fault > 0 && (
                      <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(251,146,60,0.1)', border: '1px solid rgba(251,146,60,0.3)' }}>
                        <div className="text-2xl font-bold" style={{ color: 'rgb(251,146,60)' }}>{safetyData.summary.byCategory.fault}</div>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Faults</div>
                      </div>
                    )}
                    {safetyData.summary.byCategory.alarm > 0 && (
                      <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)' }}>
                        <div className="text-2xl font-bold" style={{ color: 'rgb(202,138,4)' }}>{safetyData.summary.byCategory.alarm}</div>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Alarms</div>
                      </div>
                    )}
                    {safetyData.summary.byCategory.reset > 0 && (
                      <div className="p-3 rounded-lg text-center" style={{ background: 'rgba(250,204,21,0.1)', border: '1px solid rgba(250,204,21,0.3)' }}>
                        <div className="text-2xl font-bold" style={{ color: 'rgb(202,138,4)' }}>{safetyData.summary.byCategory.reset}</div>
                        <div className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Resets</div>
                      </div>
                    )}
                  </div>

                  {/* Safety items list */}
                  {safetyData.safetyItems.map((item, i) => (
                    <div
                      key={`${item.tagName}-${item.category}`}
                      className="rounded-lg overflow-hidden animate-fade-in"
                      style={{
                        background: 'var(--surface-1)',
                        border: `1px solid ${item.severity === 'critical' ? 'rgba(239,68,68,0.4)' : item.severity === 'high' ? 'rgba(251,146,60,0.4)' : 'var(--border-subtle)'}`,
                        animationDelay: `${i * 20}ms`
                      }}
                    >
                      <div
                        className="px-4 py-3 flex items-center justify-between"
                        style={{
                          background: item.severity === 'critical' ? 'rgba(239,68,68,0.1)' : item.severity === 'high' ? 'rgba(251,146,60,0.1)' : 'var(--surface-3)'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <IconSafety />
                          <code
                            className="text-[14px] font-mono font-semibold"
                            style={{
                              color: item.severity === 'critical' ? 'rgb(239,68,68)' : item.severity === 'high' ? 'rgb(251,146,60)' : 'var(--accent-amber)'
                            }}
                          >
                            {item.tagName}
                          </code>
                          <span
                            className="text-[10px] uppercase px-2 py-0.5 rounded font-semibold"
                            style={{
                              background: item.severity === 'critical' ? 'rgb(239,68,68)' : item.severity === 'high' ? 'rgb(251,146,60)' : 'rgb(202,138,4)',
                              color: 'white'
                            }}
                          >
                            {item.severity}
                          </span>
                          <span
                            className="text-xs px-2 py-0.5 rounded"
                            style={{ background: 'var(--surface-4)', color: 'var(--text-secondary)' }}
                          >
                            {item.category}
                          </span>
                        </div>
                        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {item.locations.length} location{item.locations.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="px-4 py-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                        <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>{item.description}</p>
                        {item.locations.length > 0 && (
                          <div className="space-y-1">
                            {item.locations.slice(0, 5).map((loc, j) => (
                              <div key={j} className="flex items-start gap-2 text-xs p-2 rounded" style={{ background: 'var(--surface-0)' }}>
                                <span className="font-mono" style={{ color: 'var(--text-muted)' }}>
                                  {loc.program}/{loc.routine}:{loc.rungNumber}
                                </span>
                                <span style={{ color: 'var(--text-tertiary)' }}>{loc.context}</span>
                              </div>
                            ))}
                            {item.locations.length > 5 && (
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
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
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <IconSafety />
                  <p className="mt-2 text-sm">No safety-related logic detected</p>
                  <p className="text-xs mt-1">This scan looks for E-stops, guards, interlocks, alarms, and fault handling</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Produced/Consumed View */}
        {activeTab === 'produced' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
            <div className="flex-shrink-0 p-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              {producedConsumedData && (
                <div className="flex items-center gap-6 text-xs" style={{ color: 'var(--text-muted)' }}>
                  <span style={{ color: 'var(--accent-emerald)' }}>{producedConsumedData.summary.producedCount} Produced Tags</span>
                  <span style={{ color: 'var(--accent-blue)' }}>{producedConsumedData.summary.consumedCount} Consumed Tags</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-auto p-4">
              {analysisLoading === 'produced' ? (
                <div className="flex items-center justify-center h-32">
                  <span style={{ color: 'var(--text-muted)' }}>Analyzing Produced/Consumed tags...</span>
                </div>
              ) : producedConsumedData ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Produced Tags */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-emerald)' }}>
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      Produced Tags (Outgoing)
                    </h3>
                    {producedConsumedData.produced.length > 0 ? (
                      <div className="space-y-2">
                        {producedConsumedData.produced.map((tag, i) => (
                          <div
                            key={tag.name}
                            className="p-3 rounded"
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
                          >
                            <code className="text-[13px] font-mono" style={{ color: 'var(--accent-emerald)' }}>
                              {tag.name}
                            </code>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                              >
                                {tag.dataType}
                              </span>
                            </div>
                            {tag.description && (
                              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                                {tag.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm p-4 rounded" style={{ background: 'var(--surface-1)', color: 'var(--text-muted)' }}>
                        No produced tags detected
                      </div>
                    )}
                  </div>

                  {/* Consumed Tags */}
                  <div>
                    <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-blue)' }}>
                      <span className="w-2 h-2 rounded-full bg-current"></span>
                      Consumed Tags (Incoming)
                    </h3>
                    {producedConsumedData.consumed.length > 0 ? (
                      <div className="space-y-2">
                        {producedConsumedData.consumed.map((tag, i) => (
                          <div
                            key={tag.name}
                            className="p-3 rounded"
                            style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
                          >
                            <code className="text-[13px] font-mono" style={{ color: 'var(--accent-blue)' }}>
                              {tag.name}
                            </code>
                            <div className="flex items-center gap-2 mt-1">
                              <span
                                className="text-[10px] px-1.5 py-0.5 rounded"
                                style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}
                              >
                                {tag.dataType}
                              </span>
                              {tag.producer && (
                                <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>
                                  from {tag.producer}
                                </span>
                              )}
                            </div>
                            {tag.description && (
                              <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>
                                {tag.description}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm p-4 rounded" style={{ background: 'var(--surface-1)', color: 'var(--text-muted)' }}>
                        No consumed tags detected
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <IconProduced />
                  <p className="mt-2 text-sm">No Produced/Consumed data</p>
                </div>
              )}
            </div>
          </main>
        )}

        {/* Report View */}
        {activeTab === 'report' && (
          <main className="flex-1 overflow-hidden flex flex-col" style={{ background: 'var(--surface-0)' }}>
            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-2xl mx-auto">
                <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>Generate Project Report</h2>
                <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
                  Export a comprehensive report of the PLC project including programs, routines, tags, and analysis.
                </p>
                <div className="space-y-4">
                  <a
                    href={`/api/projects/${project.id}/report?format=json`}
                    className="flex items-center gap-3 p-4 rounded border transition-colors"
                    style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}
                    target="_blank"
                  >
                    <IconDownload />
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>JSON Report</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Raw data format for programmatic use</div>
                    </div>
                  </a>
                  <a
                    href={`/api/projects/${project.id}/report?format=markdown`}
                    className="flex items-center gap-3 p-4 rounded border transition-colors"
                    style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}
                    target="_blank"
                  >
                    <IconDownload />
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Markdown Report</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Human-readable documentation format</div>
                    </div>
                  </a>
                  <a
                    href={`/api/projects/${project.id}/report?format=html`}
                    className="flex items-center gap-3 p-4 rounded border transition-colors"
                    style={{ background: 'var(--surface-1)', borderColor: 'var(--border-default)' }}
                    target="_blank"
                  >
                    <IconDownload />
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>HTML Report</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Printable web page format</div>
                    </div>
                  </a>
                </div>

                <h3 className="text-lg font-semibold mt-8 mb-4" style={{ color: 'var(--text-primary)' }}>Operator Documentation</h3>
                <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Generate human-readable documentation explaining the PLC logic in plain language for operators and maintenance personnel.
                </p>
                <div className="space-y-4">
                  <a
                    href={`/api/projects/${project.id}/report?format=operator`}
                    className="flex items-center gap-3 p-4 rounded border transition-colors"
                    style={{ background: 'var(--surface-1)', borderColor: 'var(--accent-emerald)' }}
                    target="_blank"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor" style={{ color: 'var(--accent-emerald)' }}>
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <div className="font-medium" style={{ color: 'var(--text-primary)' }}>Operator Guide</div>
                      <div className="text-xs" style={{ color: 'var(--text-muted)' }}>Plain language explanations of ladder logic for operators</div>
                    </div>
                  </a>
                </div>
              </div>
            </div>
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
              }
            }
          } else if (result.type === 'tag') {
            setActiveTab('tags')
            setSearchQuery(result.name)
          } else if (result.type === 'aoi') {
            setActiveTab('aoi')
          } else if (result.type === 'udt') {
            setActiveTab('udt')
          } else if (result.type === 'module') {
            setActiveTab('modules')
          }
        }}
      />
    </div>
  )
}

// Call tree visualization component
function CallTreeView({ node, depth }: { node: CallTreeNode; depth: number }) {
  const [expanded, setExpanded] = useState(depth < 2)

  if (!node) return null

  const hasChildren = node.children && node.children.length > 0

  return (
    <div style={{ marginLeft: depth * 20 }}>
      <div
        className="flex items-center gap-2 py-1 px-2 rounded cursor-pointer transition-colors"
        style={{ background: depth === 0 ? 'var(--surface-2)' : 'transparent' }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {hasChildren ? (
          <IconChevron expanded={expanded} />
        ) : (
          <span className="w-3" />
        )}
        <code
          className="text-[13px] font-mono"
          style={{ color: node.circular ? 'var(--accent-rose)' : 'var(--accent-emerald)' }}
        >
          {node.name}
        </code>
        {node.circular && (
          <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--accent-rose-muted)', color: 'var(--accent-rose)' }}>
            circular
          </span>
        )}
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
          {node.program}
        </span>
      </div>
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
