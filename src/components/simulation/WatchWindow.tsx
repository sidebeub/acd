'use client'

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useSimulation, TimerState, CounterState } from '../ladder/SimulationContext'

interface WatchWindowProps {
  /** Initial position for the floating panel */
  initialPosition?: { x: number; y: number }
  /** Map of forced tags - tag name -> 'on' | 'off' */
  forcedTags?: Record<string, 'on' | 'off'>
  /** Callback when a tag is toggled */
  onTagToggle?: (tagName: string) => void
  /** Callback when a timer ACC is edited */
  onTimerAccEdit?: (tagName: string, newAcc: number) => void
  /** Callback when a counter ACC is edited */
  onCounterAccEdit?: (tagName: string, newAcc: number) => void
}

type SectionKey = 'tags' | 'timers' | 'counters'

// Icons
const IconClock = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </svg>
)

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
)

const IconChevron = ({ collapsed }: { collapsed: boolean }) => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{
      transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
      transition: 'transform var(--transition-base)'
    }}
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
)

const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export function WatchWindow({
  initialPosition = { x: 20, y: 80 },
  forcedTags = {},
  onTagToggle,
  onTimerAccEdit,
  onCounterAccEdit
}: WatchWindowProps) {
  const {
    enabled,
    tagStates,
    timerStates,
    counterStates,
    toggleTag,
    updateTimers,
    updateCounters,
    resetTags,
    scanCycle
  } = useSimulation()

  // Panel state
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [position, setPosition] = useState(initialPosition)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [isMobile, setIsMobile] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  // Section collapse state
  const [collapsedSections, setCollapsedSections] = useState<Record<SectionKey, boolean>>({
    tags: false,
    timers: false,
    counters: false
  })

  // Search/filter state
  const [searchTerm, setSearchTerm] = useState('')

  // Editing state for numeric values
  const [editingTimer, setEditingTimer] = useState<string | null>(null)
  const [editingCounter, setEditingCounter] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Toggle section collapse
  const toggleSection = useCallback((section: SectionKey) => {
    setCollapsedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }, [])

  // Filter items by search term
  const filterBySearch = useCallback((name: string) => {
    if (!searchTerm) return true
    return name.toLowerCase().includes(searchTerm.toLowerCase())
  }, [searchTerm])

  // Handle tag toggle
  const handleTagToggle = useCallback((tagName: string) => {
    toggleTag(tagName)
    onTagToggle?.(tagName)
  }, [toggleTag, onTagToggle])

  // Handle timer ACC edit
  const handleTimerAccEdit = useCallback((tagName: string, newAcc: number) => {
    updateTimers({ [tagName]: { ACC: newAcc } })
    onTimerAccEdit?.(tagName, newAcc)
  }, [updateTimers, onTimerAccEdit])

  // Handle counter ACC edit
  const handleCounterAccEdit = useCallback((tagName: string, newAcc: number) => {
    updateCounters({ [tagName]: { ACC: newAcc } })
    onCounterAccEdit?.(tagName, newAcc)
  }, [updateCounters, onCounterAccEdit])

  // Start editing timer ACC
  const startEditingTimer = useCallback((tagName: string, currentAcc: number) => {
    setEditingTimer(tagName)
    setEditValue(String(Math.round(currentAcc / 1000 * 10) / 10))
    setEditingCounter(null)
  }, [])

  // Start editing counter ACC
  const startEditingCounter = useCallback((tagName: string, currentAcc: number) => {
    setEditingCounter(tagName)
    setEditValue(String(currentAcc))
    setEditingTimer(null)
  }, [])

  // Commit timer edit
  const commitTimerEdit = useCallback((tagName: string) => {
    const newValue = parseFloat(editValue)
    if (!isNaN(newValue)) {
      handleTimerAccEdit(tagName, newValue * 1000)
    }
    setEditingTimer(null)
    setEditValue('')
  }, [editValue, handleTimerAccEdit])

  // Commit counter edit
  const commitCounterEdit = useCallback((tagName: string) => {
    const newValue = parseInt(editValue, 10)
    if (!isNaN(newValue)) {
      handleCounterAccEdit(tagName, newValue)
    }
    setEditingCounter(null)
    setEditValue('')
  }, [editValue, handleCounterAccEdit])

  // Clear all - reset everything
  const handleClearAll = useCallback(() => {
    resetTags()
    setSearchTerm('')
  }, [resetTags])

  // Drag handling (desktop only)
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isMobile) return
    if ((e.target as HTMLElement).closest('.watch-window-header')) {
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }, [position, isMobile])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging && !isMobile) {
      const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.x))
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y))
      setPosition({ x: newX, y: newY })
    }
  }, [isDragging, dragOffset, isMobile])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add/remove global mouse listeners for dragging
  useEffect(() => {
    if (isDragging && !isMobile) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp, isMobile])

  // Get filtered data
  const filteredTags = Object.entries(tagStates).filter(([name]) => filterBySearch(name))
  const filteredTimers = Object.entries(timerStates).filter(([name]) => filterBySearch(name))
  const filteredCounters = Object.entries(counterStates).filter(([name]) => filterBySearch(name))

  // Count totals
  const totalTags = Object.keys(tagStates).length
  const totalTimers = Object.keys(timerStates).length
  const totalCounters = Object.keys(counterStates).length

  // Don't render if simulation is not enabled
  if (!enabled) return null

  return (
    <div
      ref={panelRef}
      className="watch-window container-inline"
      style={{
        ...(isMobile ? {} : { left: position.x, top: position.y }),
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="watch-window-header">
        <div className="watch-window-title">
          <IconClock />
          <span>Watch Window</span>
          <span className="watch-window-scan">Scan: {scanCycle}</span>
        </div>
        <div className="watch-window-controls">
          <button
            className="watch-window-btn touch-target"
            onClick={handleClearAll}
            title="Clear All - Reset all tags, timers, and counters"
            aria-label="Clear all values"
          >
            <IconTrash />
          </button>
          <button
            className="watch-window-btn touch-target"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
            aria-expanded={!isCollapsed}
            aria-label={isCollapsed ? 'Expand watch window' : 'Collapse watch window'}
          >
            <IconChevron collapsed={isCollapsed} />
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="watch-window-content">
          {/* Search box */}
          <div className="watch-window-search">
            <IconSearch />
            <input
              type="text"
              placeholder="Filter tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="touch-target-height"
            />
            {searchTerm && (
              <button
                className="watch-window-clear-search touch-target"
                onClick={() => setSearchTerm('')}
                aria-label="Clear search"
              >
                <IconX />
              </button>
            )}
          </div>

          {/* Tags Section */}
          <div className="watch-window-section">
            <button
              className="watch-window-section-header touch-target-height"
              onClick={() => toggleSection('tags')}
              aria-expanded={!collapsedSections.tags}
            >
              <IconChevron collapsed={collapsedSections.tags} />
              <span>Tags</span>
              <span className="watch-window-count">{filteredTags.length}/{totalTags}</span>
            </button>
            {!collapsedSections.tags && (
              <div className="watch-window-table">
                {filteredTags.length === 0 ? (
                  <div className="watch-window-empty">No tags to display</div>
                ) : (
                  <div className="watch-window-list">
                    <div className="watch-window-list-header">
                      <span>Tag</span>
                      <span>Value</span>
                      <span>Force</span>
                    </div>
                    {filteredTags.map(([tagName, value]) => {
                      const isForced = tagName in forcedTags
                      return (
                        <button
                          key={tagName}
                          className="watch-window-list-row touch-target-height"
                          onClick={() => handleTagToggle(tagName)}
                          title={`Toggle ${tagName}`}
                        >
                          <span className="watch-window-tag-name" title={tagName}>{tagName}</span>
                          <span className={`watch-window-value ${value ? 'value-on' : 'value-off'}`}>
                            {value ? 'ON' : 'OFF'}
                          </span>
                          <span>
                            {isForced && (
                              <span className={`watch-window-force force-${forcedTags[tagName]}`}>
                                F
                              </span>
                            )}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Timers Section */}
          <div className="watch-window-section">
            <button
              className="watch-window-section-header touch-target-height"
              onClick={() => toggleSection('timers')}
              aria-expanded={!collapsedSections.timers}
            >
              <IconChevron collapsed={collapsedSections.timers} />
              <span>Timers</span>
              <span className="watch-window-count">{filteredTimers.length}/{totalTimers}</span>
            </button>
            {!collapsedSections.timers && (
              <div className="watch-window-table watch-window-table-wide">
                {filteredTimers.length === 0 ? (
                  <div className="watch-window-empty">No timers to display</div>
                ) : (
                  <div className="watch-window-list watch-window-list-timers">
                    <div className="watch-window-list-header watch-window-timer-header">
                      <span>Timer</span>
                      <span>ACC</span>
                      <span>PRE</span>
                      <span className="watch-window-bits-header">EN</span>
                      <span className="watch-window-bits-header">TT</span>
                      <span className="watch-window-bits-header">DN</span>
                    </div>
                    {filteredTimers.map(([tagName, timer]) => (
                      <div key={tagName} className="watch-window-list-row watch-window-timer-row">
                        <span className="watch-window-tag-name" title={tagName}>{tagName}</span>
                        <button
                          className="watch-window-editable touch-target"
                          onClick={() => startEditingTimer(tagName, timer.ACC)}
                          aria-label={`Edit ${tagName} accumulated value`}
                        >
                          {editingTimer === tagName ? (
                            <input
                              type="number"
                              step="0.1"
                              inputMode="decimal"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitTimerEdit(tagName)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitTimerEdit(tagName)
                                if (e.key === 'Escape') setEditingTimer(null)
                              }}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              className="touch-target-height"
                            />
                          ) : (
                            <span className="watch-window-timer-acc">
                              {(timer.ACC / 1000).toFixed(1)}s
                            </span>
                          )}
                        </button>
                        <span className="watch-window-timer-pre">
                          {(timer.PRE / 1000).toFixed(1)}s
                        </span>
                        <span className={`watch-window-bit ${timer.EN ? 'bit-on' : 'bit-off'}`}>
                          {timer.EN ? '1' : '0'}
                        </span>
                        <span className={`watch-window-bit ${timer.TT ? 'bit-on' : 'bit-off'}`}>
                          {timer.TT ? '1' : '0'}
                        </span>
                        <span className={`watch-window-bit ${timer.DN ? 'bit-on' : 'bit-off'}`}>
                          {timer.DN ? '1' : '0'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Counters Section */}
          <div className="watch-window-section">
            <button
              className="watch-window-section-header touch-target-height"
              onClick={() => toggleSection('counters')}
              aria-expanded={!collapsedSections.counters}
            >
              <IconChevron collapsed={collapsedSections.counters} />
              <span>Counters</span>
              <span className="watch-window-count">{filteredCounters.length}/{totalCounters}</span>
            </button>
            {!collapsedSections.counters && (
              <div className="watch-window-table watch-window-table-wide">
                {filteredCounters.length === 0 ? (
                  <div className="watch-window-empty">No counters to display</div>
                ) : (
                  <div className="watch-window-list watch-window-list-counters">
                    <div className="watch-window-list-header watch-window-counter-header">
                      <span>Counter</span>
                      <span>ACC</span>
                      <span>PRE</span>
                      <span className="watch-window-bits-header">CU</span>
                      <span className="watch-window-bits-header">CD</span>
                      <span className="watch-window-bits-header">DN</span>
                    </div>
                    {filteredCounters.map(([tagName, counter]) => (
                      <div key={tagName} className="watch-window-list-row watch-window-counter-row">
                        <span className="watch-window-tag-name" title={tagName}>{tagName}</span>
                        <button
                          className="watch-window-editable touch-target"
                          onClick={() => startEditingCounter(tagName, counter.ACC)}
                          aria-label={`Edit ${tagName} accumulated value`}
                        >
                          {editingCounter === tagName ? (
                            <input
                              type="number"
                              step="1"
                              inputMode="numeric"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => commitCounterEdit(tagName)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') commitCounterEdit(tagName)
                                if (e.key === 'Escape') setEditingCounter(null)
                              }}
                              autoFocus
                              onClick={(e) => e.stopPropagation()}
                              className="touch-target-height"
                            />
                          ) : (
                            <span className="watch-window-counter-acc">{counter.ACC}</span>
                          )}
                        </button>
                        <span className="watch-window-counter-pre">{counter.PRE}</span>
                        <span className={`watch-window-bit ${counter.CU ? 'bit-on' : 'bit-off'}`}>
                          {counter.CU ? '1' : '0'}
                        </span>
                        <span className={`watch-window-bit ${counter.CD ? 'bit-on' : 'bit-off'}`}>
                          {counter.CD ? '1' : '0'}
                        </span>
                        <span className={`watch-window-bit ${counter.DN ? 'bit-on' : 'bit-off'}`}>
                          {counter.DN ? '1' : '0'}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default WatchWindow
