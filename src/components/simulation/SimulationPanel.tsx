'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useSimulation, SimulationToggleButton } from '../ladder/SimulationContext'
import { WatchWindow } from './WatchWindow'

interface SimulationPanelProps {
  /** Map of forced tags - tag name -> 'on' | 'off' */
  forcedTags?: Record<string, 'on' | 'off'>
  /** Whether to show the watch window by default when simulation starts */
  showWatchWindow?: boolean
  /** Callback when a tag is toggled in the watch window */
  onTagToggle?: (tagName: string) => void
}

// Icons
const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
)

/**
 * SimulationPanel - A wrapper component that provides simulation controls
 * and the Watch Window for debugging PLC simulations.
 *
 * Features:
 * - Responsive design with container queries
 * - Touch-optimized controls (44px min touch targets)
 * - Mobile-friendly layout
 * - Safe area support for notched devices
 */
export function SimulationPanel({
  forcedTags = {},
  showWatchWindow: defaultShowWatchWindow = true,
  onTagToggle
}: SimulationPanelProps) {
  const { enabled } = useSimulation()
  const [showWatchWindow, setShowWatchWindow] = useState(defaultShowWatchWindow)
  const [initialPosition, setInitialPosition] = useState({ x: 20, y: 80 })
  const [isMobile, setIsMobile] = useState(false)

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Calculate position based on viewport
  const updatePosition = useCallback(() => {
    if (!isMobile) {
      setInitialPosition({
        x: Math.max(20, window.innerWidth - 400),
        y: 80
      })
    }
  }, [isMobile])

  // Update position on mount and resize
  useEffect(() => {
    updatePosition()

    let resizeTimeout: ReturnType<typeof setTimeout>
    const handleResize = () => {
      clearTimeout(resizeTimeout)
      resizeTimeout = setTimeout(updatePosition, 100)
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      clearTimeout(resizeTimeout)
    }
  }, [updatePosition])

  return (
    <>
      {/* Simulation Controls Bar */}
      <div className="simulation-panel-controls container-inline">
        <SimulationToggleButton />

        {enabled && (
          <button
            className={`sim-watch-toggle touch-target ${showWatchWindow ? 'active' : ''}`}
            onClick={() => setShowWatchWindow(!showWatchWindow)}
            title={showWatchWindow ? 'Hide Watch Window' : 'Show Watch Window'}
            aria-pressed={showWatchWindow}
            aria-label={showWatchWindow ? 'Hide watch window' : 'Show watch window'}
          >
            <IconEye />
            <span className="sim-watch-label">Watch</span>
          </button>
        )}
      </div>

      {/* Watch Window */}
      {enabled && showWatchWindow && (
        <WatchWindow
          forcedTags={forcedTags}
          onTagToggle={onTagToggle}
          initialPosition={initialPosition}
        />
      )}
    </>
  )
}

export default SimulationPanel
