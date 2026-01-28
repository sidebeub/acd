'use client'

import React, { useState, useEffect } from 'react'
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

/**
 * SimulationPanel - A wrapper component that provides simulation controls
 * and the Watch Window for debugging PLC simulations.
 *
 * Place this component in your layout or page where you want simulation
 * controls to appear. It will render:
 * - The simulation toggle button (always visible)
 * - The Watch Window (visible when simulation is active and watch window is enabled)
 */
export function SimulationPanel({
  forcedTags = {},
  showWatchWindow: defaultShowWatchWindow = true,
  onTagToggle
}: SimulationPanelProps) {
  const { enabled } = useSimulation()
  const [showWatchWindow, setShowWatchWindow] = useState(defaultShowWatchWindow)
  const [initialPosition, setInitialPosition] = useState({ x: 20, y: 80 })

  // Update position once the component mounts on the client
  useEffect(() => {
    setInitialPosition({
      x: window.innerWidth - 400,
      y: 80
    })
  }, [])

  return (
    <>
      {/* Simulation Controls Bar */}
      <div className="simulation-panel-controls">
        <SimulationToggleButton />

        {enabled && (
          <button
            className={`sim-watch-toggle ${showWatchWindow ? 'active' : ''}`}
            onClick={() => setShowWatchWindow(!showWatchWindow)}
            title={showWatchWindow ? 'Hide Watch Window' : 'Show Watch Window'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>Watch</span>
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
