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

export function ProjectBrowser({ project }: ProjectBrowserProps) {
  const [selectedProgram, setSelectedProgram] = useState<string | null>(
    project.programs[0]?.id || null
  )
  const [selectedRoutine, setSelectedRoutine] = useState<string | null>(null)
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(
    new Set([project.programs[0]?.id].filter(Boolean))
  )
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'ladder' | 'tags'>('ladder')
  const [sidebarWidth, setSidebarWidth] = useState(280)

  const currentProgram = project.programs.find(p => p.id === selectedProgram)
  const currentRoutine = currentProgram?.routines.find(r => r.id === selectedRoutine)

  // Initialize with first routine when program changes
  useEffect(() => {
    if (currentProgram && !selectedRoutine && currentProgram.routines.length > 0) {
      setSelectedRoutine(currentProgram.routines[0].id)
    }
  }, [currentProgram, selectedRoutine])

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
          <div className="tab-nav">
            <button
              onClick={() => setActiveTab('ladder')}
              className={`tab-item ${activeTab === 'ladder' ? 'tab-item-active' : ''}`}
            >
              <span className="flex items-center gap-2">
                <IconLadder />
                Ladder
              </span>
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`tab-item ${activeTab === 'tags' ? 'tab-item-active' : ''}`}
            >
              <span className="flex items-center gap-2">
                <IconTag />
                Tags
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
                          explanation={rung.explanation}
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
      </div>
    </div>
  )
}
