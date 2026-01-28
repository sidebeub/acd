'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { WatchWindow } from './WatchWindow'

/**
 * GlobalWatchWindow - A global wrapper for the WatchWindow component.
 *
 * This component renders the WatchWindow at a global level so it appears
 * once for the entire application, rather than per-rung. It uses the
 * SimulationContext to determine if simulation is enabled.
 *
 * Features:
 * - Responsive positioning: docked on mobile, floating on desktop
 * - Safe area support for notched devices
 * - Adapts to viewport changes
 */
export function GlobalWatchWindow() {
  const [initialPosition, setInitialPosition] = useState({ x: 20, y: 80 })
  const [isMobile, setIsMobile] = useState(false)

  // Calculate position based on viewport
  const updatePosition = useCallback(() => {
    const mobile = window.innerWidth < 640
    setIsMobile(mobile)

    if (!mobile) {
      // Desktop: position in top-right area with margin
      setInitialPosition({
        x: Math.max(20, window.innerWidth - 400),
        y: 80
      })
    }
  }, [])

  // Update position on mount and resize
  useEffect(() => {
    updatePosition()

    // Debounced resize handler
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
    <WatchWindow
      initialPosition={initialPosition}
    />
  )
}

export default GlobalWatchWindow
