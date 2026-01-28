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
    setEditValue(String(Math.round(currentAcc / 1000 * 10) / 10)) // Convert ms to seconds with 1 decimal
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
      handleTimerAccEdit(tagName, newValue * 1000) // Convert seconds to ms
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

  // Drag handling
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.watch-window-header')) {
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      })
    }
  }, [position])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDragging) {
      const newX = Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragOffset.x))
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.y))
      setPosition({ x: newX, y: newY })
    }
  }, [isDragging, dragOffset])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Add/remove global mouse listeners for dragging
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove)
      window.addEventListener('mouseup', handleMouseUp)
      return () => {
        window.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isDragging, handleMouseMove, handleMouseUp])

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
      className="watch-window"
      style={{
        left: position.x,
        top: position.y,
        cursor: isDragging ? 'grabbing' : 'auto'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Header */}
      <div className="watch-window-header">
        <div className="watch-window-title">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 6v6l4 2" />
          </svg>
          <span>Watch Window</span>
          <span className="watch-window-scan">Scan: {scanCycle}</span>
        </div>
        <div className="watch-window-controls">
          <button
            className="watch-window-btn"
            onClick={handleClearAll}
            title="Clear All - Reset all tags, timers, and counters"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
          <button
            className="watch-window-btn"
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              style={{ transform: isCollapsed ? 'rotate(180deg)' : 'none' }}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div className="watch-window-content">
          {/* Search box */}
          <div className="watch-window-search">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Filter tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {searchTerm && (
              <button
                className="watch-window-clear-search"
                onClick={() => setSearchTerm('')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>

          {/* Tags Section */}
          <div className="watch-window-section">
            <div
              className="watch-window-section-header"
              onClick={() => toggleSection('tags')}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ transform: collapsedSections.tags ? 'rotate(-90deg)' : 'none' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span>Tags</span>
              <span className="watch-window-count">{filteredTags.length}/{totalTags}</span>
            </div>
            {!collapsedSections.tags && (
              <div className="watch-window-table">
                {filteredTags.length === 0 ? (
                  <div className="watch-window-empty">No tags to display</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Tag</th>
                        <th>Value</th>
                        <th>Force</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTags.map(([tagName, value]) => {
                        const isForced = tagName in forcedTags
                        return (
                          <tr
                            key={tagName}
                            className="watch-window-row watch-window-row-clickable"
                            onClick={() => handleTagToggle(tagName)}
                          >
                            <td className="watch-window-tag-name" title={tagName}>{tagName}</td>
                            <td>
                              <span className={`watch-window-value ${value ? 'value-on' : 'value-off'}`}>
                                {value ? 'ON' : 'OFF'}
                              </span>
                            </td>
                            <td>
                              {isForced && (
                                <span className={`watch-window-force force-${forcedTags[tagName]}`}>
                                  F
                                </span>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Timers Section */}
          <div className="watch-window-section">
            <div
              className="watch-window-section-header"
              onClick={() => toggleSection('timers')}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ transform: collapsedSections.timers ? 'rotate(-90deg)' : 'none' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span>Timers</span>
              <span className="watch-window-count">{filteredTimers.length}/{totalTimers}</span>
            </div>
            {!collapsedSections.timers && (
              <div className="watch-window-table">
                {filteredTimers.length === 0 ? (
                  <div className="watch-window-empty">No timers to display</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Timer</th>
                        <th>ACC</th>
                        <th>PRE</th>
                        <th>EN</th>
                        <th>TT</th>
                        <th>DN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTimers.map(([tagName, timer]) => (
                        <tr key={tagName} className="watch-window-row">
                          <td className="watch-window-tag-name" title={tagName}>{tagName}</td>
                          <td
                            className="watch-window-editable"
                            onClick={() => startEditingTimer(tagName, timer.ACC)}
                          >
                            {editingTimer === tagName ? (
                              <input
                                type="number"
                                step="0.1"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => commitTimerEdit(tagName)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitTimerEdit(tagName)
                                  if (e.key === 'Escape') setEditingTimer(null)
                                }}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span className="watch-window-timer-acc">
                                {(timer.ACC / 1000).toFixed(1)}s
                              </span>
                            )}
                          </td>
                          <td className="watch-window-timer-pre">
                            {(timer.PRE / 1000).toFixed(1)}s
                          </td>
                          <td>
                            <span className={`watch-window-bit ${timer.EN ? 'bit-on' : 'bit-off'}`}>
                              {timer.EN ? '1' : '0'}
                            </span>
                          </td>
                          <td>
                            <span className={`watch-window-bit ${timer.TT ? 'bit-on' : 'bit-off'}`}>
                              {timer.TT ? '1' : '0'}
                            </span>
                          </td>
                          <td>
                            <span className={`watch-window-bit ${timer.DN ? 'bit-on' : 'bit-off'}`}>
                              {timer.DN ? '1' : '0'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>

          {/* Counters Section */}
          <div className="watch-window-section">
            <div
              className="watch-window-section-header"
              onClick={() => toggleSection('counters')}
            >
              <svg
                width="10"
                height="10"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                style={{ transform: collapsedSections.counters ? 'rotate(-90deg)' : 'none' }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
              <span>Counters</span>
              <span className="watch-window-count">{filteredCounters.length}/{totalCounters}</span>
            </div>
            {!collapsedSections.counters && (
              <div className="watch-window-table">
                {filteredCounters.length === 0 ? (
                  <div className="watch-window-empty">No counters to display</div>
                ) : (
                  <table>
                    <thead>
                      <tr>
                        <th>Counter</th>
                        <th>ACC</th>
                        <th>PRE</th>
                        <th>CU</th>
                        <th>CD</th>
                        <th>DN</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCounters.map(([tagName, counter]) => (
                        <tr key={tagName} className="watch-window-row">
                          <td className="watch-window-tag-name" title={tagName}>{tagName}</td>
                          <td
                            className="watch-window-editable"
                            onClick={() => startEditingCounter(tagName, counter.ACC)}
                          >
                            {editingCounter === tagName ? (
                              <input
                                type="number"
                                step="1"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                onBlur={() => commitCounterEdit(tagName)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') commitCounterEdit(tagName)
                                  if (e.key === 'Escape') setEditingCounter(null)
                                }}
                                autoFocus
                                onClick={(e) => e.stopPropagation()}
                              />
                            ) : (
                              <span className="watch-window-counter-acc">{counter.ACC}</span>
                            )}
                          </td>
                          <td className="watch-window-counter-pre">{counter.PRE}</td>
                          <td>
                            <span className={`watch-window-bit ${counter.CU ? 'bit-on' : 'bit-off'}`}>
                              {counter.CU ? '1' : '0'}
                            </span>
                          </td>
                          <td>
                            <span className={`watch-window-bit ${counter.CD ? 'bit-on' : 'bit-off'}`}>
                              {counter.CD ? '1' : '0'}
                            </span>
                          </td>
                          <td>
                            <span className={`watch-window-bit ${counter.DN ? 'bit-on' : 'bit-off'}`}>
                              {counter.DN ? '1' : '0'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
