'use client'

import { useState, useEffect } from 'react'
import { LadderRung } from '../ladder/LadderRung'

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

interface ExplanationResponse {
  explanation: string
  source: 'library' | 'ai' | 'hybrid' | 'learned'
  mode: string
}

interface RungExplanation {
  text: string
  source: 'library' | 'ai' | 'hybrid' | 'learned'
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
  accum: string
  locations: Array<{ program: string; routine: string; rungNumber: number }>
  resets: Array<{ program: string; routine: string; rungNumber: number }>
}

interface CounterInfo {
  tagName: string
  type: string
  preset: string
  accum: string
  locations: Array<{ program: string; routine: string; rungNumber: number }>
  resets: Array<{ program: string; routine: string; rungNumber: number }>
}

interface IOPoint {
  tagName: string
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

type TabType = 'ladder' | 'tags' | 'xref' | 'calltree' | 'timers' | 'io' | 'alarms' | 'report'

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
  const [rungExplanations, setRungExplanations] = useState<Record<string, RungExplanation>>({})

  // Analysis state
  const [xrefData, setXrefData] = useState<{ tags: XRefTag[]; totalReferences: number } | null>(null)
  const [callTreeData, setCallTreeData] = useState<{ trees: CallTreeNode[]; roots: string[]; orphans: string[]; circular: string[][] } | null>(null)
  const [timerData, setTimerData] = useState<{ timers: TimerInfo[]; counters: CounterInfo[] } | null>(null)
  const [ioData, setIOData] = useState<{ inputs: IOPoint[]; outputs: IOPoint[] } | null>(null)
  const [alarmData, setAlarmData] = useState<{ alarms: AlarmInfo[] } | null>(null)
  const [analysisLoading, setAnalysisLoading] = useState<TabType | null>(null)
  const [xrefFilter, setXrefFilter] = useState('')

  const currentProgram = project.programs.find(p => p.id === selectedProgram)
  const currentRoutine = currentProgram?.routines.find(r => r.id === selectedRoutine)

  // Initialize with first routine when program changes
  useEffect(() => {
    if (currentProgram && !selectedRoutine && currentProgram.routines.length > 0) {
      setSelectedRoutine(currentProgram.routines[0].id)
    }
  }, [currentProgram, selectedRoutine])

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
      }
    }
    fetchAnalysis()
  }, [activeTab, project.id, xrefData, callTreeData, timerData, ioData, alarmData])

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
          source: data.source
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

  // Count stats
  const totalRoutines = project.programs.reduce((acc, p) => acc + p.routines.length, 0)
  const totalRungs = project.programs.reduce(
    (acc, p) => acc + p.routines.reduce((a, r) => a + r.rungs.length, 0), 0
  )

  return (
    <div className="h-screen flex flex-col" style={{ background: 'var(--surface-0)' }}>
      {/* Header bar */}
      <header
        className="flex-shrink-0 h-12 flex items-center justify-between px-4 border-b"
        style={{ background: 'var(--surface-1)', borderColor: 'var(--border-subtle)' }}
      >
        <div className="flex items-center gap-4">
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
          <div className="w-px h-5" style={{ background: 'var(--border-default)' }} />

          {/* Project info */}
          <div className="flex items-center gap-3">
            <h1 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              {project.name}
            </h1>
            {project.processorType && (
              <span className="tech-badge">{project.processorType}</span>
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

          {/* Tab switcher */}
          <div className="tab-nav flex-wrap">
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
            <button
              onClick={() => setActiveTab('xref')}
              className={`tab-item ${activeTab === 'xref' ? 'tab-item-active' : ''}`}
            >
              <span className="flex items-center gap-1">
                <IconXRef />
                <span className="hidden sm:inline">X-Ref</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('calltree')}
              className={`tab-item ${activeTab === 'calltree' ? 'tab-item-active' : ''}`}
            >
              <span className="flex items-center gap-1">
                <IconTree />
                <span className="hidden sm:inline">Calls</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('timers')}
              className={`tab-item ${activeTab === 'timers' ? 'tab-item-active' : ''}`}
            >
              <span className="flex items-center gap-1">
                <IconTimer />
                <span className="hidden sm:inline">Timers</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('io')}
              className={`tab-item ${activeTab === 'io' ? 'tab-item-active' : ''}`}
            >
              <span className="flex items-center gap-1">
                <IconIO />
                <span className="hidden sm:inline">I/O</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('alarms')}
              className={`tab-item ${activeTab === 'alarms' ? 'tab-item-active' : ''}`}
            >
              <span className="flex items-center gap-1">
                <IconAlarm />
                <span className="hidden sm:inline">Alarms</span>
              </span>
            </button>
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
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'ladder' ? (
          <>
            {/* Sidebar */}
            <aside
              className="flex-shrink-0 overflow-y-auto border-r"
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
                <h2
                  className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Programs & Routines
                </h2>
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
                              onClick={() => setSelectedRoutine(routine.id)}
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
            <main className="flex-1 overflow-y-auto" style={{ background: 'var(--surface-0)' }}>
              {currentRoutine ? (
                <div className="p-6">
                  {/* Routine header */}
                  <div className="mb-6">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
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
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <span>{currentRoutine.rungs.length} rungs</span>
                      <span>in {currentProgram?.name}</span>
                    </div>
                  </div>

                  {/* Rungs list */}
                  <div className="space-y-3">
                    {currentRoutine.rungs.map((rung, index) => (
                      <div
                        key={rung.id}
                        className="animate-fade-in"
                        style={{ animationDelay: `${index * 30}ms` }}
                      >
                        <LadderRung
                          rungId={rung.id}
                          number={rung.number}
                          comment={rung.comment}
                          rawText={rung.rawText}
                          instructions={rung.instructions ? JSON.parse(rung.instructions) : []}
                          explanation={rungExplanations[rung.id]?.text || rung.explanation}
                          explanationSource={rungExplanations[rung.id]?.source || null}
                          onExplain={handleExplain}
                        />
                      </div>
                    ))}
                  </div>
                </div>
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
                            <td style={{ color: 'var(--text-secondary)' }}>{timer.preset}</td>
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
                            <td style={{ color: 'var(--text-secondary)' }}>{counter.preset}</td>
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
                          <code className="text-[13px] font-mono" style={{ color: 'var(--accent-emerald)' }}>{io.tagName}</code>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{io.fullPath}</div>
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
                          <code className="text-[13px] font-mono" style={{ color: 'var(--accent-amber)' }}>{io.tagName}</code>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{io.fullPath}</div>
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
              </div>
            </div>
          </main>
        )}
      </div>
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
