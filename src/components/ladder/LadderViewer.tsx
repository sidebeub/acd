'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { LadderRung } from './LadderRung'
import { TagXRefPopup, TagXRefData, buildTagCrossRefs } from '../simulation/TagXRefPopup'
import { useSwipeNavigation, usePinchToZoom, useIsTouchDevice, usePullToRefresh } from '@/hooks/useTouchGestures'
import {
  BottomSheet,
  FloatingActionButton,
  ZoomControls,
  NavigationDots,
  PullToRefreshIndicator,
  TouchContextMenu
} from '@/components/mobile/TouchComponents'
import { useSimulation } from './SimulationContext'

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
  routineName?: string  // Current routine name for display
  programName?: string  // Current program name for display
  onExpandAoi?: (aoiName: string) => void  // Callback for AOI definition navigation
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
  onToggleBookmark,
  routineName = 'Unknown',
  programName,
  onExpandAoi
}: LadderViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selectedRungIndex, setSelectedRungIndex] = useState<number | null>(null)
  const [selectedInstructionIndex, setSelectedInstructionIndex] = useState<number | null>(null)
  const [isFocused, setIsFocused] = useState(false)

  // Cross-reference popup state
  const [xrefData, setXrefData] = useState<TagXRefData | null>(null)
  const [highlightedRungId, setHighlightedRungId] = useState<string | null>(null)

  // Mobile/Touch state
  const isTouchDevice = useIsTouchDevice()
  const [isSimBottomSheetOpen, setIsSimBottomSheetOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean
    position: { x: number; y: number }
    rungIndex: number | null
  }>({ isOpen: false, position: { x: 0, y: 0 }, rungIndex: null })
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Simulation state for mobile controls
  const { enabled: simEnabled, tagStates, toggleTag, toggleSimulation, resetTags } = useSimulation()

  // Filter rungs based on bookmark filter
  const filteredRungs = rungs.filter(rung => !showOnlyBookmarked || bookmarkedRungs.has(rung.id))

  // Pinch-to-zoom for ladder
  const { scale, resetZoom, setScale } = usePinchToZoom(1, {
    minScale: 0.5,
    maxScale: 3,
    enabled: isTouchDevice
  })

  // Swipe navigation for rungs
  const handleRungChange = useCallback((newIndex: number) => {
    setSelectedRungIndex(newIndex)
    setSelectedInstructionIndex(null)

    // Scroll the rung into view
    const rungElements = containerRef.current?.querySelectorAll('[data-rung-index]')
    if (rungElements && rungElements[newIndex]) {
      (rungElements[newIndex] as HTMLElement).scrollIntoView({
        behavior: 'smooth',
        block: 'center'
      })
    }
  }, [])

  const { handlers: swipeHandlers } = useSwipeNavigation(
    selectedRungIndex ?? 0,
    filteredRungs.length - 1,
    handleRungChange,
    { enabled: isTouchDevice && filteredRungs.length > 0 }
  )

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true)
    // Trigger a reload of the data (you could pass this as a prop)
    await new Promise(resolve => setTimeout(resolve, 1000))
    setIsRefreshing(false)
  }, [])

  const { isPulling, pullDistance } = usePullToRefresh(handleRefresh, {
    threshold: 80,
    enabled: isTouchDevice
  })

  // Long press handler for context menu on rungs
  const handleLongPress = useCallback((position: { x: number; y: number }, rungIndex: number) => {
    setContextMenu({
      isOpen: true,
      position,
      rungIndex
    })
  }, [])

  // Collect all input tags for the mobile simulation controls
  const inputTags = React.useMemo(() => {
    const tags = new Set<string>()
    filteredRungs.forEach(rung => {
      if (rung.instructions) {
        try {
          const instructions: Instruction[] = JSON.parse(rung.instructions)
          instructions.forEach(inst => {
            if (['XIC', 'XIO'].includes(inst.type.toUpperCase())) {
              const tagName = inst.operands[0]?.split('\u00A7')[0]
              if (tagName) tags.add(tagName)
            }
          })
        } catch {
          // Ignore parse errors
        }
      }
    })
    return Array.from(tags).sort()
  }, [filteredRungs])

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

  // Handle tag cross-reference click
  const handleTagXRef = useCallback((tagName: string) => {
    // Build cross-reference data from all rungs
    const allRungsData = rungs.map(rung => ({
      id: rung.id,
      number: rung.number,
      instructions: rung.instructions ? JSON.parse(rung.instructions) as Instruction[] : [],
      routineName: routineName,
      programName: programName
    }))

    const xrefData = buildTagCrossRefs(tagName, allRungsData)

    // Check if this is an AOI instance
    const baseTag = tagName.split('.')[0].split('[')[0]
    const isAoi = aoiNames.some(aoi =>
      baseTag.toUpperCase() === aoi.toUpperCase() ||
      baseTag.toUpperCase().startsWith(aoi.toUpperCase() + '_')
    )
    if (isAoi) {
      xrefData.isAoi = true
      // Find the AOI name
      xrefData.aoiName = aoiNames.find(aoi =>
        baseTag.toUpperCase() === aoi.toUpperCase() ||
        baseTag.toUpperCase().startsWith(aoi.toUpperCase() + '_')
      )
    }

    setXrefData(xrefData)
  }, [rungs, routineName, programName, aoiNames])

  // Handle jump to rung from cross-reference popup
  const handleJumpToRung = useCallback((rungId: string, rungNumber: number, _routine: string) => {
    // Find the rung element
    const rungElement = document.getElementById(`rung-${rungId}`)
    if (rungElement) {
      // Scroll to the rung
      rungElement.scrollIntoView({ behavior: 'smooth', block: 'center' })

      // Add highlight animation
      setHighlightedRungId(rungId)
      setTimeout(() => {
        setHighlightedRungId(null)
      }, 1500)

      // Select the rung
      const rungIndex = filteredRungs.findIndex(r => r.id === rungId)
      if (rungIndex >= 0) {
        setSelectedRungIndex(rungIndex)
        setSelectedInstructionIndex(null)
      }
    }
  }, [filteredRungs])

  // Handle go to AOI definition
  const handleGoToAoiDefinition = useCallback((aoiName: string) => {
    if (onExpandAoi) {
      onExpandAoi(aoiName)
    }
  }, [onExpandAoi])

  // Clear highlight when rung changes
  useEffect(() => {
    if (highlightedRungId) {
      const timer = setTimeout(() => {
        setHighlightedRungId(null)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [highlightedRungId])

  return (
    <>
      {/* Pull-to-Refresh Indicator */}
      {isTouchDevice && (
        <PullToRefreshIndicator
          isPulling={isPulling}
          isRefreshing={isRefreshing}
          pullProgress={pullDistance / 80}
        />
      )}

      <div
        ref={containerRef}
        className={`ladder-viewer space-y-3 outline-none ${isTouchDevice ? 'touch-scroll-only' : ''}`}
        tabIndex={0}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onTouchStart={swipeHandlers.onTouchStart as unknown as React.TouchEventHandler}
        onTouchMove={swipeHandlers.onTouchMove as unknown as React.TouchEventHandler}
        onTouchEnd={swipeHandlers.onTouchEnd as unknown as React.TouchEventHandler}
        role="listbox"
        aria-label="Ladder logic rungs"
        aria-activedescendant={selectedRungIndex !== null ? `rung-${filteredRungs[selectedRungIndex]?.id}` : undefined}
        style={{
          transform: isTouchDevice && scale !== 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'top left',
          transition: 'transform 0.1s ease'
        }}
      >
        {/* Keyboard hint - only show on non-touch devices */}
        {isFocused && !isTouchDevice && (
          <div
            className="sticky top-0 z-10 px-3 py-2 rounded-lg text-xs flex items-center gap-4 flex-wrap keyboard-hint"
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

        {/* Touch gesture hint - only show on touch devices when first loaded */}
        {isTouchDevice && selectedRungIndex === null && filteredRungs.length > 0 && (
          <div
            className="sticky top-0 z-10 px-3 py-2 rounded-lg text-xs text-center"
            style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-muted)'
            }}
          >
            <span style={{ color: 'var(--text-secondary)' }}>Swipe left/right to navigate rungs. Pinch to zoom. Long-press for options.</span>
          </div>
        )}

      {filteredRungs.map((rung, index) => {
          // Long press timer for mobile context menu
          let longPressTimer: NodeJS.Timeout | null = null

          const handleTouchStartRung = (e: React.TouchEvent) => {
            if (!isTouchDevice) return
            const touch = e.touches[0]
            longPressTimer = setTimeout(() => {
              handleLongPress({ x: touch.clientX, y: touch.clientY }, index)
            }, 500)
          }

          const handleTouchEndRung = () => {
            if (longPressTimer) {
              clearTimeout(longPressTimer)
              longPressTimer = null
            }
          }

          const handleTouchMoveRung = () => {
            // Cancel long press if user moves
            if (longPressTimer) {
              clearTimeout(longPressTimer)
              longPressTimer = null
            }
          }

          return (
        <div
          key={rung.id}
          data-rung-index={index}
          id={`rung-${rung.id}`}
          className={`animate-fade-in touch-ripple ${highlightedRungId === rung.id ? 'rung-highlight-target' : ''}`}
          style={{ animationDelay: `${index * 30}ms` }}
          onClick={() => handleRungClick(index)}
          onTouchStart={handleTouchStartRung}
          onTouchEnd={handleTouchEndRung}
          onTouchMove={handleTouchMoveRung}
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
            onTagXRef={handleTagXRef}
            routineName={routineName}
          />
        </div>
          )
        })}

      {/* Cross-Reference Popup */}
      {xrefData && (
        <TagXRefPopup
          data={xrefData}
          onClose={() => setXrefData(null)}
          onJumpToRung={handleJumpToRung}
          onGoToAoiDefinition={onExpandAoi ? handleGoToAoiDefinition : undefined}
        />
      )}
    </div>

      {/* Mobile Navigation Dots */}
      {isTouchDevice && filteredRungs.length > 1 && selectedRungIndex !== null && (
        <NavigationDots
          total={filteredRungs.length}
          current={selectedRungIndex}
          onSelect={handleRungChange}
          maxVisible={7}
        />
      )}

      {/* Mobile Zoom Controls */}
      {isTouchDevice && (
        <ZoomControls
          scale={scale}
          onZoomIn={() => setScale(prev => Math.min(prev + 0.25, 3))}
          onZoomOut={() => setScale(prev => Math.max(prev - 0.25, 0.5))}
          onReset={resetZoom}
          minScale={0.5}
          maxScale={3}
        />
      )}

      {/* Floating Action Button for quick actions */}
      {isTouchDevice && (
        <FloatingActionButton
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          }
          actions={[
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5,3 19,12 5,21" />
                </svg>
              ),
              label: simEnabled ? 'Stop Simulation' : 'Start Simulation',
              onClick: toggleSimulation,
              color: simEnabled ? 'rgba(34, 197, 94, 0.2)' : undefined
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9" />
                  <path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                </svg>
              ),
              label: 'Tag Controls',
              onClick: () => setIsSimBottomSheetOpen(true)
            },
            {
              icon: (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                  <path d="M3 3v5h5" />
                </svg>
              ),
              label: 'Reset Tags',
              onClick: resetTags
            }
          ]}
        />
      )}

      {/* Mobile Simulation Bottom Sheet */}
      <BottomSheet
        isOpen={isSimBottomSheetOpen}
        onClose={() => setIsSimBottomSheetOpen(false)}
        title="Simulation Controls"
      >
        <div className="sim-bottom-sheet">
          <div className="sim-bottom-sheet-title">
            {simEnabled && <span className="status-dot" />}
            Input Tags
          </div>

          {inputTags.length > 0 ? (
            <div className="sim-tag-grid">
              {inputTags.map(tag => (
                <div key={tag} className="sim-tag-item">
                  <span className="sim-tag-name" title={tag}>
                    {tag}
                  </span>
                  <button
                    className={`sim-tag-toggle ${tagStates[tag] ? 'on' : ''}`}
                    onClick={() => toggleTag(tag)}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div
              className="text-center py-8 text-sm"
              style={{ color: 'var(--text-muted)' }}
            >
              No input tags found. Tap on contacts in the ladder to toggle their state.
            </div>
          )}
        </div>
      </BottomSheet>

      {/* Context Menu (Long Press) */}
      <TouchContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
        items={[
          {
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
              </svg>
            ),
            label: contextMenu.rungIndex !== null && filteredRungs[contextMenu.rungIndex]
              ? bookmarkedRungs.has(filteredRungs[contextMenu.rungIndex].id)
                ? 'Remove Bookmark'
                : 'Add Bookmark'
              : 'Toggle Bookmark',
            onClick: () => {
              if (contextMenu.rungIndex !== null && filteredRungs[contextMenu.rungIndex]) {
                onToggleBookmark(filteredRungs[contextMenu.rungIndex].id)
              }
            }
          },
          {
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="4" />
                <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
              </svg>
            ),
            label: 'Explain Rung',
            onClick: () => {
              if (contextMenu.rungIndex !== null && filteredRungs[contextMenu.rungIndex]) {
                onExplain(filteredRungs[contextMenu.rungIndex].id)
              }
            }
          },
          {
            icon: (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
              </svg>
            ),
            label: 'Copy Rung',
            onClick: async () => {
              if (contextMenu.rungIndex !== null && filteredRungs[contextMenu.rungIndex]) {
                const rung = filteredRungs[contextMenu.rungIndex]
                await navigator.clipboard.writeText(`Rung ${rung.number}: ${rung.rawText}`)
              }
            }
          }
        ]}
      />
    </>
  )
}
