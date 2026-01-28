'use client'

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'

interface RungData {
  id: string
  number: number
  comment: string | null
  instructions: string | null
}

interface MiniMapProps {
  rungs: RungData[]
  scrollContainerRef: React.RefObject<HTMLElement | null>
  onRungClick: (rungId: string, rungIndex: number) => void
  bookmarkedRungs?: Set<string>
}

// Get instruction count from parsed instructions JSON string
function getInstructionCount(instructionsJson: string | null): number {
  if (!instructionsJson) return 0
  try {
    const instructions = JSON.parse(instructionsJson)
    return Array.isArray(instructions) ? instructions.length : 0
  } catch {
    return 0
  }
}

// Check if rung has special instructions (JSR, JMP, timers, counters, etc.)
function hasSpecialInstructions(instructionsJson: string | null): boolean {
  if (!instructionsJson) return false
  try {
    const instructions = JSON.parse(instructionsJson)
    if (!Array.isArray(instructions)) return false
    const specialTypes = ['JSR', 'JMP', 'LBL', 'TON', 'TOF', 'RTO', 'CTU', 'CTD', 'CTUD', 'FOR', 'NXT']
    return instructions.some((inst: { type?: string }) =>
      inst.type && specialTypes.includes(inst.type.toUpperCase())
    )
  } catch {
    return false
  }
}

// Get color based on instruction count (complexity)
function getComplexityColor(count: number): string {
  if (count === 0) return 'var(--surface-4)'
  if (count <= 2) return 'var(--inst-input)' // Green - simple
  if (count <= 5) return 'var(--accent-blue)' // Blue - moderate
  if (count <= 8) return 'var(--accent-amber)' // Amber - complex
  return 'var(--accent-red)' // Red - very complex
}

// Icons
const IconChevronDown = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const IconChevronUp = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 15l-6-6-6 6" />
  </svg>
)

const IconMap = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
    <line x1="8" y1="2" x2="8" y2="18" />
    <line x1="16" y1="6" x2="16" y2="22" />
  </svg>
)

export function MiniMap({ rungs, scrollContainerRef, onRungClick, bookmarkedRungs }: MiniMapProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [viewportTop, setViewportTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  const [hoveredRung, setHoveredRung] = useState<number | null>(null)
  const miniMapRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)

  // Calculate dimensions
  const rungCount = rungs.length
  const minHeight = 100
  const maxHeight = 400
  const rungBarHeight = 3 // Height of each rung bar in pixels
  const rungGap = 1 // Gap between rungs
  const totalContentHeight = rungCount * (rungBarHeight + rungGap)
  const miniMapHeight = Math.min(Math.max(totalContentHeight, minHeight), maxHeight)
  const scaleFactor = miniMapHeight / Math.max(totalContentHeight, 1)

  // Pre-compute rung data for better performance
  const rungMetadata = useMemo(() => {
    return rungs.map(rung => ({
      id: rung.id,
      number: rung.number,
      instructionCount: getInstructionCount(rung.instructions),
      hasComment: !!rung.comment,
      hasSpecial: hasSpecialInstructions(rung.instructions),
      isBookmarked: bookmarkedRungs?.has(rung.id) || false
    }))
  }, [rungs, bookmarkedRungs])

  // Update viewport position based on scroll
  const updateViewport = useCallback(() => {
    const container = scrollContainerRef.current
    if (!container || rungCount === 0) return

    const scrollTop = container.scrollTop
    const scrollHeight = container.scrollHeight
    const clientHeight = container.clientHeight

    // Calculate viewport position in mini-map coordinates
    const viewportTopPercent = scrollTop / scrollHeight
    const viewportHeightPercent = clientHeight / scrollHeight

    setViewportTop(viewportTopPercent * miniMapHeight)
    setViewportHeight(Math.max(viewportHeightPercent * miniMapHeight, 20)) // Min 20px height
  }, [scrollContainerRef, rungCount, miniMapHeight])

  // Set up scroll listener
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    updateViewport()
    container.addEventListener('scroll', updateViewport)
    window.addEventListener('resize', updateViewport)

    return () => {
      container.removeEventListener('scroll', updateViewport)
      window.removeEventListener('resize', updateViewport)
    }
  }, [scrollContainerRef, updateViewport])

  // Handle click on mini-map to jump to rung
  const handleMiniMapClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const clickY = e.clientY - rect.top
    const clickPercent = clickY / miniMapHeight

    // Find which rung was clicked
    const rungIndex = Math.min(
      Math.floor(clickPercent * rungCount),
      rungCount - 1
    )

    if (rungIndex >= 0 && rungIndex < rungs.length) {
      onRungClick(rungs[rungIndex].id, rungIndex)
    }
  }, [miniMapHeight, rungCount, rungs, onRungClick])

  // Handle drag on viewport indicator
  const handleViewportMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    isDragging.current = true

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging.current || !miniMapRef.current) return

      const rect = miniMapRef.current.getBoundingClientRect()
      const mouseY = moveEvent.clientY - rect.top
      const scrollPercent = Math.max(0, Math.min(1, mouseY / miniMapHeight))

      const container = scrollContainerRef.current
      if (container) {
        const maxScroll = container.scrollHeight - container.clientHeight
        container.scrollTop = scrollPercent * maxScroll
      }
    }

    const handleMouseUp = () => {
      isDragging.current = false
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [miniMapHeight, scrollContainerRef])

  if (rungCount === 0) return null

  return (
    <div
      className="fixed bottom-4 right-4 z-40 transition-all duration-200"
      style={{
        width: isCollapsed ? 'auto' : '150px',
        opacity: 0.9
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-2 py-1.5 rounded-t cursor-pointer select-none"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border-subtle)',
          borderBottom: isCollapsed ? '1px solid var(--border-subtle)' : 'none',
          borderRadius: isCollapsed ? '6px' : '6px 6px 0 0'
        }}
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
          <IconMap />
          <span className="text-[10px] font-medium">
            {isCollapsed ? 'Map' : `${rungCount} rungs`}
          </span>
        </div>
        <div style={{ color: 'var(--text-muted)' }}>
          {isCollapsed ? <IconChevronUp /> : <IconChevronDown />}
        </div>
      </div>

      {/* Mini-map content */}
      {!isCollapsed && (
        <div
          ref={miniMapRef}
          className="relative cursor-pointer"
          style={{
            height: miniMapHeight,
            background: 'var(--surface-1)',
            border: '1px solid var(--border-subtle)',
            borderTop: 'none',
            borderRadius: '0 0 6px 6px',
            overflow: 'hidden'
          }}
          onClick={handleMiniMapClick}
        >
          {/* Rung bars */}
          <div className="absolute inset-0 px-1 py-1">
            {rungMetadata.map((rung, index) => {
              const yPosition = (index / rungCount) * miniMapHeight
              const barWidth = Math.min(100, 40 + rung.instructionCount * 8) // Dynamic width based on complexity

              return (
                <div
                  key={rung.id}
                  className="absolute transition-all duration-100"
                  style={{
                    top: `${yPosition}px`,
                    left: '4px',
                    right: '4px',
                    height: `${Math.max(rungBarHeight * scaleFactor, 2)}px`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '2px'
                  }}
                  onMouseEnter={() => setHoveredRung(index)}
                  onMouseLeave={() => setHoveredRung(null)}
                >
                  {/* Main rung bar */}
                  <div
                    style={{
                      width: `${barWidth}%`,
                      height: '100%',
                      background: getComplexityColor(rung.instructionCount),
                      borderRadius: '1px',
                      opacity: hoveredRung === index ? 1 : 0.7,
                      transition: 'opacity 0.1s ease'
                    }}
                  />

                  {/* Markers */}
                  <div className="flex items-center gap-0.5" style={{ marginLeft: 'auto' }}>
                    {/* Comment marker */}
                    {rung.hasComment && (
                      <div
                        style={{
                          width: '3px',
                          height: '3px',
                          background: 'var(--accent-emerald)',
                          borderRadius: '50%'
                        }}
                        title="Has comment"
                      />
                    )}

                    {/* Special instruction marker */}
                    {rung.hasSpecial && (
                      <div
                        style={{
                          width: '3px',
                          height: '3px',
                          background: 'var(--inst-jump)',
                          borderRadius: '50%'
                        }}
                        title="Has special instruction (JSR/Timer/Counter)"
                      />
                    )}

                    {/* Bookmark marker */}
                    {rung.isBookmarked && (
                      <div
                        style={{
                          width: '3px',
                          height: '3px',
                          background: 'var(--accent-amber)',
                          borderRadius: '50%'
                        }}
                        title="Bookmarked"
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Viewport indicator */}
          <div
            className="absolute left-0 right-0 cursor-grab active:cursor-grabbing"
            style={{
              top: `${viewportTop}px`,
              height: `${viewportHeight}px`,
              background: 'rgba(59, 130, 246, 0.2)',
              border: '1px solid var(--accent-blue)',
              borderRadius: '2px',
              transition: isDragging.current ? 'none' : 'top 0.1s ease'
            }}
            onMouseDown={handleViewportMouseDown}
          />

          {/* Hover tooltip */}
          {hoveredRung !== null && rungMetadata[hoveredRung] && (
            <div
              className="absolute left-0 right-0 px-2 py-1 text-[9px] font-mono pointer-events-none"
              style={{
                top: Math.min(
                  (hoveredRung / rungCount) * miniMapHeight,
                  miniMapHeight - 24
                ),
                background: 'var(--surface-3)',
                borderTop: '1px solid var(--border-default)',
                borderBottom: '1px solid var(--border-default)',
                color: 'var(--text-secondary)',
                zIndex: 10
              }}
            >
              Rung {rungMetadata[hoveredRung].number}
              {rungMetadata[hoveredRung].instructionCount > 0 && (
                <span style={{ color: 'var(--text-muted)', marginLeft: '4px' }}>
                  ({rungMetadata[hoveredRung].instructionCount} inst)
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Legend (only show when expanded) */}
      {!isCollapsed && (
        <div
          className="flex items-center gap-2 px-2 py-1 text-[8px]"
          style={{
            background: 'var(--surface-2)',
            borderLeft: '1px solid var(--border-subtle)',
            borderRight: '1px solid var(--border-subtle)',
            borderBottom: '1px solid var(--border-subtle)',
            borderRadius: '0 0 6px 6px',
            marginTop: '-1px'
          }}
        >
          <div className="flex items-center gap-1">
            <div style={{ width: '6px', height: '6px', background: 'var(--inst-input)', borderRadius: '1px' }} />
            <span style={{ color: 'var(--text-muted)' }}>Simple</span>
          </div>
          <div className="flex items-center gap-1">
            <div style={{ width: '6px', height: '6px', background: 'var(--accent-amber)', borderRadius: '1px' }} />
            <span style={{ color: 'var(--text-muted)' }}>Complex</span>
          </div>
          <div className="flex items-center gap-1">
            <div style={{ width: '4px', height: '4px', background: 'var(--accent-emerald)', borderRadius: '50%' }} />
            <span style={{ color: 'var(--text-muted)' }}>Comment</span>
          </div>
        </div>
      )}
    </div>
  )
}
