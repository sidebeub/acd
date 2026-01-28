'use client'

import React, { useState, useEffect } from 'react'
import { WatchWindow } from './WatchWindow'

/**
 * GlobalWatchWindow - A global wrapper for the WatchWindow component.
 *
 * This component renders the WatchWindow at a global level so it appears
 * once for the entire application, rather than per-rung. It uses the
 * SimulationContext to determine if simulation is enabled.
 */
export function GlobalWatchWindow() {
  const [initialPosition, setInitialPosition] = useState({ x: 20, y: 80 })

  // Update position once the component mounts on the client
  useEffect(() => {
    setInitialPosition({
      x: window.innerWidth - 400,
      y: 80
    })
  }, [])

  return <WatchWindow initialPosition={initialPosition} />
}

export default GlobalWatchWindow
