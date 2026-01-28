'use client'

import { useRef, useCallback, useEffect, useState } from 'react'

// ================================================
// Touch Gesture Types
// ================================================

export interface TouchGestureHandlers {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  onPinchZoom?: (scale: number, center: { x: number; y: number }) => void
  onDoubleTap?: (position: { x: number; y: number }) => void
  onLongPress?: (position: { x: number; y: number }) => void
  onPullToRefresh?: () => void
}

export interface TouchGestureOptions {
  swipeThreshold?: number  // Min distance for swipe (default: 50px)
  swipeVelocity?: number   // Min velocity for swipe (default: 0.3)
  longPressDelay?: number  // Delay for long press (default: 500ms)
  doubleTapDelay?: number  // Max delay between taps (default: 300ms)
  pullThreshold?: number   // Distance to trigger pull-to-refresh (default: 80px)
  enabled?: boolean        // Whether gestures are enabled
}

interface TouchPoint {
  x: number
  y: number
  time: number
}

// ================================================
// Main Touch Gestures Hook
// ================================================

export function useTouchGestures(
  handlers: TouchGestureHandlers,
  options: TouchGestureOptions = {}
) {
  const {
    swipeThreshold = 50,
    swipeVelocity = 0.3,
    longPressDelay = 500,
    doubleTapDelay = 300,
    pullThreshold = 80,
    enabled = true
  } = options

  const touchStartRef = useRef<TouchPoint | null>(null)
  const touchEndRef = useRef<TouchPoint | null>(null)
  const lastTapRef = useRef<number>(0)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pinchStartDistanceRef = useRef<number>(0)
  const pinchStartScaleRef = useRef<number>(1)
  const isPinchingRef = useRef<boolean>(false)
  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)

  // Calculate distance between two touch points
  const getDistance = useCallback((touch1: Touch, touch2: Touch): number => {
    const dx = touch1.clientX - touch2.clientX
    const dy = touch1.clientY - touch2.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }, [])

  // Get center point between two touches
  const getCenter = useCallback((touch1: Touch, touch2: Touch): { x: number; y: number } => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    }
  }, [])

  // Clear long press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
  }, [])

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (!enabled) return

    const touches = e.touches

    // Single touch
    if (touches.length === 1) {
      const touch = touches[0]
      touchStartRef.current = {
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      }
      isPinchingRef.current = false

      // Start long press timer
      if (handlers.onLongPress) {
        longPressTimerRef.current = setTimeout(() => {
          if (touchStartRef.current && handlers.onLongPress) {
            handlers.onLongPress({
              x: touchStartRef.current.x,
              y: touchStartRef.current.y
            })
          }
        }, longPressDelay)
      }
    }

    // Two finger touch (pinch)
    if (touches.length === 2 && handlers.onPinchZoom) {
      isPinchingRef.current = true
      pinchStartDistanceRef.current = getDistance(touches[0], touches[1])
      pinchStartScaleRef.current = 1
      clearLongPressTimer()
    }
  }, [enabled, handlers, longPressDelay, getDistance, clearLongPressTimer])

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!enabled) return

    const touches = e.touches

    // Single finger move - check for swipe or pull-to-refresh
    if (touches.length === 1 && touchStartRef.current) {
      const touch = touches[0]
      const deltaX = touch.clientX - touchStartRef.current.x
      const deltaY = touch.clientY - touchStartRef.current.y

      // Cancel long press if moved too much
      if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
        clearLongPressTimer()
      }

      // Pull-to-refresh detection (pulling down from top)
      if (handlers.onPullToRefresh && deltaY > 0 && window.scrollY === 0) {
        setIsPulling(true)
        setPullDistance(Math.min(deltaY, pullThreshold * 1.5))

        // Prevent default scroll to allow pull gesture
        if (deltaY > 10) {
          e.preventDefault()
        }
      }
    }

    // Two finger move (pinch zoom)
    if (touches.length === 2 && isPinchingRef.current && handlers.onPinchZoom) {
      const currentDistance = getDistance(touches[0], touches[1])
      const scale = currentDistance / pinchStartDistanceRef.current
      const center = getCenter(touches[0], touches[1])

      handlers.onPinchZoom(scale * pinchStartScaleRef.current, center)

      // Prevent default zoom behavior
      e.preventDefault()
    }
  }, [enabled, handlers, pullThreshold, getDistance, getCenter, clearLongPressTimer])

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!enabled) return

    clearLongPressTimer()

    // Handle pull-to-refresh release
    if (isPulling) {
      if (pullDistance >= pullThreshold && handlers.onPullToRefresh) {
        handlers.onPullToRefresh()
      }
      setIsPulling(false)
      setPullDistance(0)
    }

    // Handle pinch end
    if (isPinchingRef.current) {
      isPinchingRef.current = false
      return
    }

    if (!touchStartRef.current) return

    const touch = e.changedTouches[0]
    touchEndRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    }

    const deltaX = touchEndRef.current.x - touchStartRef.current.x
    const deltaY = touchEndRef.current.y - touchStartRef.current.y
    const deltaTime = touchEndRef.current.time - touchStartRef.current.time

    // Check for swipe
    const absX = Math.abs(deltaX)
    const absY = Math.abs(deltaY)
    const velocity = Math.sqrt(absX * absX + absY * absY) / deltaTime

    if (velocity >= swipeVelocity) {
      // Horizontal swipe
      if (absX > absY && absX >= swipeThreshold) {
        if (deltaX > 0) {
          handlers.onSwipeRight?.()
        } else {
          handlers.onSwipeLeft?.()
        }
        return
      }

      // Vertical swipe
      if (absY > absX && absY >= swipeThreshold) {
        if (deltaY > 0) {
          handlers.onSwipeDown?.()
        } else {
          handlers.onSwipeUp?.()
        }
        return
      }
    }

    // Check for double tap
    if (absX < 10 && absY < 10) {
      const now = Date.now()
      const timeSinceLastTap = now - lastTapRef.current

      if (timeSinceLastTap < doubleTapDelay && handlers.onDoubleTap) {
        handlers.onDoubleTap({
          x: touch.clientX,
          y: touch.clientY
        })
        lastTapRef.current = 0 // Reset to prevent triple-tap
      } else {
        lastTapRef.current = now
      }
    }

    touchStartRef.current = null
    touchEndRef.current = null
  }, [enabled, handlers, swipeThreshold, swipeVelocity, doubleTapDelay, isPulling, pullDistance, pullThreshold, clearLongPressTimer])

  // Clean up on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer()
    }
  }, [clearLongPressTimer])

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },
    isPulling,
    pullDistance
  }
}

// ================================================
// Pull-to-Refresh Indicator Component Hook
// ================================================

export function usePullToRefresh(
  onRefresh: () => Promise<void>,
  options: { threshold?: number; enabled?: boolean } = {}
) {
  const { threshold = 80, enabled = true } = options
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [pullProgress, setPullProgress] = useState(0)

  const handlePullToRefresh = useCallback(async () => {
    if (isRefreshing || !enabled) return

    setIsRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setIsRefreshing(false)
      setPullProgress(0)
    }
  }, [onRefresh, isRefreshing, enabled])

  const gestureResult = useTouchGestures(
    { onPullToRefresh: handlePullToRefresh },
    { pullThreshold: threshold, enabled }
  )

  // Update pull progress based on pull distance
  useEffect(() => {
    if (gestureResult.isPulling) {
      setPullProgress(Math.min(gestureResult.pullDistance / threshold, 1))
    } else if (!isRefreshing) {
      setPullProgress(0)
    }
  }, [gestureResult.isPulling, gestureResult.pullDistance, threshold, isRefreshing])

  return {
    ...gestureResult,
    isRefreshing,
    pullProgress
  }
}

// ================================================
// Pinch-to-Zoom Hook
// ================================================

export function usePinchToZoom(
  initialScale: number = 1,
  options: { minScale?: number; maxScale?: number; enabled?: boolean } = {}
) {
  const { minScale = 0.5, maxScale = 3, enabled = true } = options
  const [scale, setScale] = useState(initialScale)
  const [offset, setOffset] = useState({ x: 0, y: 0 })

  const handlePinchZoom = useCallback((newScale: number, center: { x: number; y: number }) => {
    setScale(Math.min(Math.max(newScale, minScale), maxScale))
    // You could also update offset based on the center point for proper zoom origin
  }, [minScale, maxScale])

  const handleDoubleTap = useCallback((position: { x: number; y: number }) => {
    // Toggle between 1x and 2x on double tap
    setScale(currentScale => currentScale === 1 ? 2 : 1)
    setOffset({ x: 0, y: 0 })
  }, [])

  const gestureResult = useTouchGestures(
    {
      onPinchZoom: handlePinchZoom,
      onDoubleTap: handleDoubleTap
    },
    { enabled }
  )

  const resetZoom = useCallback(() => {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }, [])

  return {
    ...gestureResult,
    scale,
    offset,
    setScale,
    setOffset,
    resetZoom
  }
}

// ================================================
// Swipe Navigation Hook
// ================================================

export function useSwipeNavigation(
  currentIndex: number,
  maxIndex: number,
  onChange: (newIndex: number) => void,
  options: { enabled?: boolean; wrap?: boolean } = {}
) {
  const { enabled = true, wrap = false } = options

  const handleSwipeLeft = useCallback(() => {
    if (currentIndex < maxIndex) {
      onChange(currentIndex + 1)
    } else if (wrap && maxIndex >= 0) {
      onChange(0)
    }
  }, [currentIndex, maxIndex, onChange, wrap])

  const handleSwipeRight = useCallback(() => {
    if (currentIndex > 0) {
      onChange(currentIndex - 1)
    } else if (wrap && maxIndex >= 0) {
      onChange(maxIndex)
    }
  }, [currentIndex, maxIndex, onChange, wrap])

  const gestureResult = useTouchGestures(
    {
      onSwipeLeft: handleSwipeLeft,
      onSwipeRight: handleSwipeRight
    },
    { enabled }
  )

  return gestureResult
}

// ================================================
// Long Press for Context Menu Hook
// ================================================

export interface ContextMenuState {
  isOpen: boolean
  position: { x: number; y: number }
  data?: unknown
}

export function useLongPressContextMenu<T = unknown>(
  options: { enabled?: boolean; delay?: number } = {}
) {
  const { enabled = true, delay = 500 } = options
  const [menuState, setMenuState] = useState<ContextMenuState & { data?: T }>({
    isOpen: false,
    position: { x: 0, y: 0 },
    data: undefined
  })
  const dataRef = useRef<T | undefined>(undefined)

  const openMenu = useCallback((position: { x: number; y: number }, data?: T) => {
    setMenuState({
      isOpen: true,
      position,
      data: data ?? dataRef.current
    })
  }, [])

  const closeMenu = useCallback(() => {
    setMenuState(prev => ({ ...prev, isOpen: false }))
  }, [])

  const setContextData = useCallback((data: T) => {
    dataRef.current = data
  }, [])

  const gestureResult = useTouchGestures(
    {
      onLongPress: (position) => openMenu(position)
    },
    { enabled, longPressDelay: delay }
  )

  return {
    ...gestureResult,
    menuState,
    openMenu,
    closeMenu,
    setContextData
  }
}

// ================================================
// Utility: Detect Touch Device
// ================================================

export function useIsTouchDevice() {
  const [isTouch, setIsTouch] = useState(false)

  useEffect(() => {
    const checkTouch = () => {
      setIsTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-expect-error - msMaxTouchPoints is IE specific
        navigator.msMaxTouchPoints > 0
      )
    }

    checkTouch()

    // Also check on first touch event
    const handleFirstTouch = () => {
      setIsTouch(true)
      window.removeEventListener('touchstart', handleFirstTouch)
    }

    window.addEventListener('touchstart', handleFirstTouch, { passive: true })

    return () => {
      window.removeEventListener('touchstart', handleFirstTouch)
    }
  }, [])

  return isTouch
}

// ================================================
// Utility: Prevent Default Touch Actions
// ================================================

export function usePreventDefaultTouch(
  elementRef: React.RefObject<HTMLElement | null>,
  options: { enabled?: boolean; allowScroll?: boolean } = {}
) {
  const { enabled = true, allowScroll = false } = options

  useEffect(() => {
    const element = elementRef.current
    if (!element || !enabled) return

    const preventDefault = (e: TouchEvent) => {
      if (!allowScroll) {
        e.preventDefault()
      }
    }

    element.addEventListener('touchmove', preventDefault, { passive: false })

    return () => {
      element.removeEventListener('touchmove', preventDefault)
    }
  }, [elementRef, enabled, allowScroll])
}
