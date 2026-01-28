'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { LadderRung } from './LadderRung'

interface Instruction {
  type: string
  operands: string[]
  branch_level?: number
  parallel_index?: number
  branchLeg?: number
  branchLevel?: number
  branchStart?: boolean
  is_input?: boolean
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

interface RungExplanation {
  text: string
  source: 'library' | 'ai' | 'hybrid' | 'learned'
  troubleshooting?: string[]
  deviceTypes?: string[]
  crossRefs?: CrossRef[]
  ioMappings?: IoMapping[]
  conditions?: Condition[]
}

interface Rung {
  id: string
  number: number
  comment: string | null
  rawText: string
  instructions: string | null
  explanation: string | null
}

interface LadderViewerProps {
  rungs: Rung[]
  rungExplanations: Record<string, RungExplanation>
  tagDescriptions: Record<string, string>
  projectId: string
  aoiNames: string[]
  bookmarkedRungs: Set<string>
  showOnlyBookmarked: boolean
  onExplain: (rungId: string) => Promise<void>
  onToggleBookmark: (rungId: string) => void
}

export function LadderViewer({
  rungs,
  rungExplanations,
  tagDescriptions,
  projectId,
  aoiNames,
  bookmarkedRungs,
  showOnlyBookmarked,
  onExplain,
  onToggleBookmark
}: LadderViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedRungIndex, setSelectedRungIndex] = useState<number | null>(null)
  const [selectedInstructionIndex, setSelectedInstructionIndex] = useState<number | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  // Filter rungs based on bookmark filter
  const filteredRungs = rungs.filter(rung => !showOnlyBookmarked || bookmarkedRungs.has(rung.id))

  // Get instruction count for a rung
  const getInstructionCount = useCallback((rung: Rung): number => {
    if (!rung.instructions) return 0
    try {
      const instructions: Instruction[] = JSON.parse(rung.instructions)
      return instructions.length
    } catch {
      return 0
    }
  }, [])

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isFocused || filteredRungs.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedRungIndex(prev => {
          if (prev === null) return 0
          return Math.min(prev + 1, filteredRungs.length - 1)
        })
        setSelectedInstructionIndex(null)
        break

      case 'ArrowUp':
        e.preventDefault()
        setSelectedRungIndex(prev => {
          if (prev === null) return filteredRungs.length - 1
          return Math.max(prev - 1, 0)
        })
        setSelectedInstructionIndex(null)
        break

      case 'ArrowRight':
        e.preventDefault()
        if (selectedRungIndex !== null) {
          const instructionCount = getInstructionCount(filteredRungs[selectedRungIndex])
          if (instructionCount > 0) {
            setSelectedInstructionIndex(prev => {
              if (prev === null) return 0
              return Math.min(prev + 1, instructionCount - 1)
            })
          }
        }
        break

      case 'ArrowLeft':
        e.preventDefault()
        if (selectedRungIndex !== null && selectedInstructionIndex !== null) {
          if (selectedInstructionIndex > 0) {
            setSelectedInstructionIndex(prev => (prev !== null ? prev - 1 : null))
          } else {
            setSelectedInstructionIndex(null)
          }
        }
        break

      case 'Enter':
        e.preventDefault()
        if (selectedRungIndex !== null) {
          const rung = filteredRungs[selectedRungIndex]
          if (selectedInstructionIndex !== null) {
            // Trigger explain for the selected rung when Enter is pressed on an instruction
            onExplain(rung.id)
          } else {
            // If no instruction selected, explain the whole rung
            onExplain(rung.id)
          }
        }
        break

      case 'Escape':
        e.preventDefault()
        if (selectedInstructionIndex !== null) {
          setSelectedInstructionIndex(null)
        } else if (selectedRungIndex !== null) {
          setSelectedRungIndex(null)
        }
        break

      case 'Home':
        e.preventDefault()
        if (selectedRungIndex !== null && selectedInstructionIndex !== null) {
          setSelectedInstructionIndex(0)
        } else {
          setSelectedRungIndex(0)
          setSelectedInstructionIndex(null)
        }
        break

      case 'End':
        e.preventDefault()
        if (selectedRungIndex !== null && selectedInstructionIndex !== null) {
          const instructionCount = getInstructionCount(filteredRungs[selectedRungIndex])
          setSelectedInstructionIndex(instructionCount - 1)
        } else {
          setSelectedRungIndex(filteredRungs.length - 1)
          setSelectedInstructionIndex(null)
        }
        break

      case 'b':
      case 'B':
        // Toggle bookmark with 'b' key
        if (selectedRungIndex !== null) {
          e.preventDefault()
          const rung = filteredRungs[selectedRungIndex]
          onToggleBookmark(rung.id)
        }
        break
    }
  }, [isFocused, filteredRungs, selectedRungIndex, selectedInstructionIndex, getInstructionCount, onExplain, onToggleBookmark])

  // Attach keyboard event listener
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('keydown', handleKeyDown as EventListener)
    return () => container.removeEventListener('keydown', handleKeyDown as EventListener)
  }, [handleKeyDown])

  // Scroll selected rung into view
  useEffect(() => {
    if (selectedRungIndex === null) return

    const rungElements = containerRef.current?.querySelectorAll('[data-rung-index]')
    if (!rungElements) return

    const selectedElement = rungElements[selectedRungIndex] as HTMLElement
    if (selectedElement) {
      selectedElement.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
      })
    }
  }, [selectedRungIndex])

  // Handle focus
  const handleFocus = useCallback(() => {
    setIsFocused(true)
    // Auto-select first rung if none selected
    if (selectedRungIndex === null && filteredRungs.length > 0) {
      setSelectedRungIndex(0)
    }
  }, [selectedRungIndex, filteredRungs.length])

  const handleBlur = useCallback((e: React.FocusEvent) => {
    // Only blur if focus is leaving the container entirely
    if (!containerRef.current?.contains(e.relatedTarget as Node)) {
      setIsFocused(false)
    }
  }, [])

  // Handle rung click to select
  const handleRungClick = useCallback((index: number) => {
    setSelectedRungIndex(index)
    setSelectedInstructionIndex(null)
    containerRef.current?.focus()
  }, [])

  // Handle instruction selection from within a rung
  const handleInstructionSelect = useCallback((instructionIndex: number) => {
    setSelectedInstructionIndex(instructionIndex)
  }, [])

  return (
    <div
      ref={containerRef}
      className="ladder-viewer space-y-3 outline-none"
      tabIndex={0}
      onFocus={handleFocus}
      onBlur={handleBlur}
      role="listbox"
      aria-label="Ladder logic rungs"
      aria-activedescendant={selectedRungIndex !== null ? `rung-${filteredRungs[selectedRungIndex]?.id}` : undefined}
    >
      {/* Keyboard hint */}
      {isFocused && (
        <div
          className="sticky top-0 z-10 px-3 py-2 rounded-lg text-xs flex items-center gap-4 flex-wrap"
          style={{
            background: 'var(--surface-3)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-muted)'
          }}
        >
          <span className="font-medium" style={{ color: 'var(--text-secondary)' }}>Keyboard Navigation:</span>
          <span><kbd className="kbd">Up/Down</kbd> Navigate rungs</span>
          <span><kbd className="kbd">Left/Right</kbd> Navigate instructions</span>
          <span><kbd className="kbd">Enter</kbd> Explain</span>
          <span><kbd className="kbd">B</kbd> Toggle bookmark</span>
          <span><kbd className="kbd">Esc</kbd> Clear selection</span>
        </div>
      )}

      {filteredRungs.map((rung, index) => (
        <div
          key={rung.id}
          data-rung-index={index}
          id={`rung-${rung.id}`}
          className="animate-fade-in"
          style={{ animationDelay: `${index * 30}ms` }}
          onClick={() => handleRungClick(index)}
          role="option"
          aria-selected={selectedRungIndex === index}
        >
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
            onExplain={onExplain}
            tagDescriptions={tagDescriptions}
            projectId={projectId}
            aoiNames={aoiNames}
            isBookmarked={bookmarkedRungs.has(rung.id)}
            onToggleBookmark={onToggleBookmark}
            isSelected={selectedRungIndex === index}
            selectedInstructionIndex={selectedRungIndex === index ? selectedInstructionIndex : null}
            onInstructionSelect={selectedRungIndex === index ? handleInstructionSelect : undefined}
          />
        </div>
      ))}
    </div>
  )
}
