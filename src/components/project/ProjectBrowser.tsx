'use client'

import { useState } from 'react'
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

export function ProjectBrowser({ project }: ProjectBrowserProps) {
  const [selectedProgram, setSelectedProgram] = useState<string | null>(
    project.programs[0]?.id || null
  )
  const [selectedRoutine, setSelectedRoutine] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState<'ladder' | 'tags'>('ladder')

  const currentProgram = project.programs.find(p => p.id === selectedProgram)
  const currentRoutine = currentProgram?.routines.find(r => r.id === selectedRoutine)

  // Initialize with first routine when program changes
  if (currentProgram && !selectedRoutine && currentProgram.routines.length > 0) {
    setSelectedRoutine(currentProgram.routines[0].id)
  }

  const handleExplain = async (rungId: string) => {
    try {
      const response = await fetch('/api/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rungId })
      })
      if (!response.ok) throw new Error('Failed to get explanation')
      // Explanation will be cached, could refresh here
    } catch (error) {
      console.error('Error explaining rung:', error)
    }
  }

  const filteredTags = project.tags.filter(
    tag =>
      tag.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tag.description?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">{project.name}</h1>
            {project.processorType && (
              <p className="text-sm text-gray-400">{project.processorType}</p>
            )}
          </div>
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('ladder')}
              className={`px-4 py-2 rounded ${
                activeTab === 'ladder'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Ladder Logic
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`px-4 py-2 rounded ${
                activeTab === 'tags'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              Tags ({project.tags.length})
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        {activeTab === 'ladder' ? (
          <>
            {/* Sidebar - Programs & Routines */}
            <aside className="w-64 bg-gray-900 border-r border-gray-800 overflow-y-auto">
              <div className="p-4">
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  Programs
                </h2>
                {project.programs.map(program => (
                  <div key={program.id} className="mb-2">
                    <button
                      onClick={() => {
                        setSelectedProgram(program.id)
                        setSelectedRoutine(program.routines[0]?.id || null)
                      }}
                      className={`w-full text-left px-3 py-2 rounded ${
                        selectedProgram === program.id
                          ? 'bg-blue-900/50 text-blue-400'
                          : 'text-gray-300 hover:bg-gray-800'
                      } ${program.disabled ? 'opacity-50' : ''}`}
                    >
                      <div className="font-medium">{program.name}</div>
                      <div className="text-xs text-gray-500">
                        {program.routines.length} routines
                      </div>
                    </button>

                    {selectedProgram === program.id && (
                      <div className="ml-4 mt-1 space-y-1">
                        {program.routines.map(routine => (
                          <button
                            key={routine.id}
                            onClick={() => setSelectedRoutine(routine.id)}
                            className={`w-full text-left px-3 py-1.5 rounded text-sm ${
                              selectedRoutine === routine.id
                                ? 'bg-emerald-900/50 text-emerald-400'
                                : 'text-gray-400 hover:bg-gray-800'
                            }`}
                          >
                            {routine.name}
                            <span className="text-gray-500 text-xs ml-2">
                              ({routine.rungs.length})
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </aside>

            {/* Main Content - Ladder View */}
            <main className="flex-1 overflow-y-auto p-6">
              {currentRoutine ? (
                <div>
                  <div className="mb-6">
                    <h2 className="text-2xl font-bold text-white">
                      {currentRoutine.name}
                    </h2>
                    {currentRoutine.description && (
                      <p className="text-gray-400 mt-1">{currentRoutine.description}</p>
                    )}
                    <p className="text-sm text-gray-500 mt-2">
                      {currentRoutine.rungs.length} rungs • {currentRoutine.type} routine
                    </p>
                  </div>

                  <div className="space-y-4">
                    {currentRoutine.rungs.map(rung => (
                      <LadderRung
                        key={rung.id}
                        rungId={rung.id}
                        number={rung.number}
                        comment={rung.comment}
                        rawText={rung.rawText}
                        instructions={rung.instructions ? JSON.parse(rung.instructions) : []}
                        explanation={rung.explanation}
                        onExplain={handleExplain}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full text-gray-500">
                  Select a routine to view ladder logic
                </div>
              )}
            </main>
          </>
        ) : (
          /* Tags View */
          <main className="flex-1 overflow-y-auto p-6">
            <div className="mb-6">
              <input
                type="text"
                placeholder="Search tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full max-w-md px-4 py-2 bg-gray-900 border border-gray-700 rounded text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Name</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Data Type</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Scope</th>
                    <th className="text-left py-3 px-4 text-gray-400 font-medium">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTags.map(tag => (
                    <tr key={tag.id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
                      <td className="py-3 px-4 font-mono text-emerald-400">{tag.name}</td>
                      <td className="py-3 px-4 text-blue-400">{tag.dataType}</td>
                      <td className="py-3 px-4 text-gray-400">{tag.scope}</td>
                      <td className="py-3 px-4 text-gray-300">{tag.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </main>
        )}
      </div>
    </div>
  )
}
