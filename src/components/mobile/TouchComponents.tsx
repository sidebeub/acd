'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useIsTouchDevice, useTouchGestures, useLongPressContextMenu } from '@/hooks/useTouchGestures'

// ================================================
// Bottom Sheet Component
// ================================================

interface BottomSheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

export function BottomSheet({ isOpen, onClose, title, children }: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const startYRef = useRef<number>(0)
  const currentYRef = useRef<number>(0)

  // Handle swipe down to dismiss
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY
    const deltaY = currentY - startYRef.current
    currentYRef.current = deltaY

    if (deltaY > 0 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`
    }
  }, [])

  const handleTouchEnd = useCallback(() => {
    if (currentYRef.current > 100) {
      onClose()
    }
    if (sheetRef.current) {
      sheetRef.current.style.transform = ''
    }
    currentYRef.current = 0
  }, [onClose])

  return (
    <>
      {/* Overlay */}
      <div
        className={`bottom-sheet-overlay ${isOpen ? 'open' : ''}`}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        className={`bottom-sheet ${isOpen ? 'open' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag handle */}
        <div className="bottom-sheet-handle" />

        {/* Title */}
        {title && (
          <div
            className="px-4 pb-3 text-base font-semibold border-b"
            style={{ color: 'var(--text-primary)', borderColor: 'var(--border-subtle)' }}
          >
            {title}
          </div>
        )}

        {/* Content */}
        <div className="bottom-sheet-content">
          {children}
        </div>
      </div>
    </>
  )
}

// ================================================
// Floating Action Button (FAB)
// ================================================

interface FABAction {
  icon: React.ReactNode
  label: string
  onClick: () => void
  color?: string
}

interface FloatingActionButtonProps {
  icon: React.ReactNode
  actions?: FABAction[]
  onClick?: () => void
  color?: string
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center'
}

export function FloatingActionButton({
  icon,
  actions,
  onClick,
  color = 'var(--accent-blue)',
  position = 'bottom-right'
}: FloatingActionButtonProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const handleClick = useCallback(() => {
    if (actions && actions.length > 0) {
      setIsMenuOpen(prev => !prev)
    } else if (onClick) {
      onClick()
    }
  }, [actions, onClick])

  const handleActionClick = useCallback((action: FABAction) => {
    action.onClick()
    setIsMenuOpen(false)
  }, [])

  const positionClass = {
    'bottom-right': 'right-5',
    'bottom-left': 'left-5',
    'bottom-center': 'left-1/2 -translate-x-1/2'
  }[position]

  return (
    <>
      {/* Action menu */}
      {actions && actions.length > 0 && (
        <div className={`fab-menu ${isMenuOpen ? 'open' : ''}`}>
          {actions.map((action, index) => (
            <button
              key={index}
              className="fab-menu-item touch-ripple"
              onClick={() => handleActionClick(action)}
            >
              <div
                className="fab-menu-item-icon"
                style={{ background: action.color || 'var(--surface-4)' }}
              >
                {action.icon}
              </div>
              <span className="fab-menu-item-label">{action.label}</span>
            </button>
          ))}
        </div>
      )}

      {/* Main FAB */}
      <button
        className={`fab touch-ripple ${positionClass}`}
        style={{ background: color }}
        onClick={handleClick}
      >
        <span
          className="transition-transform duration-200"
          style={{ transform: isMenuOpen ? 'rotate(45deg)' : 'none' }}
        >
          {icon}
        </span>
      </button>

      {/* Backdrop for menu */}
      {isMenuOpen && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  )
}

// ================================================
// Collapsible Panel
// ================================================

interface CollapsiblePanelProps {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}

export function CollapsiblePanel({ title, defaultOpen = false, children }: CollapsiblePanelProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <div className={`collapsible-panel ${isOpen ? 'open' : ''}`}>
      <div
        className="collapsible-panel-header touch-ripple"
        onClick={() => setIsOpen(prev => !prev)}
      >
        <span className="collapsible-panel-title">{title}</span>
        <div className="collapsible-panel-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>
      <div className="collapsible-panel-content">
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  )
}

// ================================================
// Context Menu (for Long Press)
// ================================================

interface ContextMenuItem {
  icon?: React.ReactNode
  label: string
  onClick: () => void
  destructive?: boolean
}

interface TouchContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  items: ContextMenuItem[]
  onClose: () => void
}

export function TouchContextMenu({ isOpen, position, items, onClose }: TouchContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [isOpen, onClose])

  // Adjust position to stay within viewport
  const adjustedPosition = React.useMemo(() => {
    const menuWidth = 180
    const menuHeight = items.length * 48 + 16

    let x = position.x
    let y = position.y

    // Keep within horizontal bounds
    if (x + menuWidth > window.innerWidth - 16) {
      x = window.innerWidth - menuWidth - 16
    }
    if (x < 16) x = 16

    // Keep within vertical bounds
    if (y + menuHeight > window.innerHeight - 16) {
      y = position.y - menuHeight
    }
    if (y < 16) y = 16

    return { x, y }
  }, [position, items.length])

  if (!isOpen) return null

  return (
    <div
      ref={menuRef}
      className="touch-context-menu"
      style={{
        left: adjustedPosition.x,
        top: adjustedPosition.y
      }}
    >
      {items.map((item, index) => (
        <button
          key={index}
          className={`touch-context-menu-item touch-ripple ${item.destructive ? 'destructive' : ''}`}
          onClick={() => {
            item.onClick()
            onClose()
          }}
        >
          {item.icon && (
            <span className="touch-context-menu-item-icon">{item.icon}</span>
          )}
          <span>{item.label}</span>
        </button>
      ))}
    </div>
  )
}

// ================================================
// Pull-to-Refresh Indicator
// ================================================

interface PullToRefreshProps {
  isPulling: boolean
  isRefreshing: boolean
  pullProgress: number
}

export function PullToRefreshIndicator({ isPulling, isRefreshing, pullProgress }: PullToRefreshProps) {
  const translateY = isPulling
    ? Math.min(pullProgress * 70, 70)
    : isRefreshing
      ? 20
      : -100

  return (
    <div
      className={`pull-refresh-indicator ${isPulling ? 'pulling' : ''} ${isRefreshing ? 'refreshing' : ''}`}
      style={{
        transform: `translateX(-50%) translateY(${translateY}px)`
      }}
    >
      <div
        className="pull-refresh-spinner"
        style={{
          transform: isPulling ? `rotate(${pullProgress * 360}deg)` : 'none'
        }}
      />
    </div>
  )
}

// ================================================
// Zoom Controls
// ================================================

interface ZoomControlsProps {
  scale: number
  onZoomIn: () => void
  onZoomOut: () => void
  onReset: () => void
  minScale?: number
  maxScale?: number
}

export function ZoomControls({
  scale,
  onZoomIn,
  onZoomOut,
  onReset,
  minScale = 0.5,
  maxScale = 3
}: ZoomControlsProps) {
  return (
    <div className="zoom-controls">
      <button
        className="zoom-btn touch-ripple"
        onClick={onZoomIn}
        disabled={scale >= maxScale}
        title="Zoom in"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      <button
        className="zoom-btn touch-ripple"
        onClick={onReset}
        title="Reset zoom"
      >
        <span className="zoom-level">{Math.round(scale * 100)}%</span>
      </button>

      <button
        className="zoom-btn touch-ripple"
        onClick={onZoomOut}
        disabled={scale <= minScale}
        title="Zoom out"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>
    </div>
  )
}

// ================================================
// Swipe-to-Dismiss Container
// ================================================

interface SwipeToDismissProps {
  children: React.ReactNode
  onDismiss: () => void
  direction?: 'left' | 'right' | 'both'
  threshold?: number
}

export function SwipeToDismiss({
  children,
  onDismiss,
  direction = 'right',
  threshold = 100
}: SwipeToDismissProps) {
  const [isDismissing, setIsDismissing] = useState(false)
  const [dismissDirection, setDismissDirection] = useState<'left' | 'right'>('right')
  const containerRef = useRef<HTMLDivElement>(null)
  const startXRef = useRef<number>(0)
  const currentXRef = useRef<number>(0)

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX
    const deltaX = currentX - startXRef.current
    currentXRef.current = deltaX

    if (containerRef.current) {
      // Only allow swipe in the permitted direction(s)
      if (direction === 'right' && deltaX < 0) return
      if (direction === 'left' && deltaX > 0) return

      containerRef.current.style.transform = `translateX(${deltaX}px)`
      containerRef.current.style.opacity = String(1 - Math.abs(deltaX) / threshold / 2)
    }
  }, [direction, threshold])

  const handleTouchEnd = useCallback(() => {
    const deltaX = currentXRef.current

    if (Math.abs(deltaX) > threshold) {
      setDismissDirection(deltaX > 0 ? 'right' : 'left')
      setIsDismissing(true)
      setTimeout(onDismiss, 200)
    } else if (containerRef.current) {
      containerRef.current.style.transform = ''
      containerRef.current.style.opacity = ''
    }

    currentXRef.current = 0
  }, [threshold, onDismiss])

  return (
    <div
      ref={containerRef}
      className={`swipe-dismiss ${isDismissing ? (dismissDirection === 'left' ? 'dismissing-left' : 'dismissing') : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  )
}

// ================================================
// Navigation Dots (for paginated content)
// ================================================

interface NavigationDotsProps {
  total: number
  current: number
  onSelect: (index: number) => void
  maxVisible?: number
}

export function NavigationDots({
  total,
  current,
  onSelect,
  maxVisible = 7
}: NavigationDotsProps) {
  // Calculate which dots to show
  const visibleDots = React.useMemo(() => {
    if (total <= maxVisible) {
      return Array.from({ length: total }, (_, i) => i)
    }

    const half = Math.floor(maxVisible / 2)
    let start = Math.max(0, current - half)
    let end = Math.min(total, start + maxVisible)

    if (end - start < maxVisible) {
      start = Math.max(0, end - maxVisible)
    }

    return Array.from({ length: end - start }, (_, i) => start + i)
  }, [total, current, maxVisible])

  return (
    <div className="rung-nav-dots">
      {visibleDots[0] > 0 && (
        <button
          className="rung-nav-dot"
          onClick={() => onSelect(0)}
          style={{ opacity: 0.5 }}
        />
      )}

      {visibleDots.map(index => (
        <button
          key={index}
          className={`rung-nav-dot ${index === current ? 'active' : ''}`}
          onClick={() => onSelect(index)}
        />
      ))}

      {visibleDots[visibleDots.length - 1] < total - 1 && (
        <button
          className="rung-nav-dot"
          onClick={() => onSelect(total - 1)}
          style={{ opacity: 0.5 }}
        />
      )}
    </div>
  )
}

// ================================================
// Touch Indicator (shows where user touched)
// ================================================

export function TouchIndicator() {
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      setPosition({ x: touch.clientX, y: touch.clientY })
      setIsVisible(true)
    }

    const handleTouchEnd = () => {
      setTimeout(() => setIsVisible(false), 150)
    }

    document.addEventListener('touchstart', handleTouchStart)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [])

  if (!position || !isVisible) return null

  return (
    <div
      className="fixed pointer-events-none z-[9999] w-12 h-12 rounded-full transition-opacity duration-150"
      style={{
        left: position.x - 24,
        top: position.y - 24,
        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)',
        opacity: isVisible ? 1 : 0
      }}
    />
  )
}

// ================================================
// Mobile Simulation Controls Bottom Sheet
// ================================================

interface SimulationBottomSheetProps {
  isOpen: boolean
  onClose: () => void
  tags: string[]
  tagStates: Record<string, boolean>
  onToggleTag: (tag: string) => void
}

export function SimulationBottomSheet({
  isOpen,
  onClose,
  tags,
  tagStates,
  onToggleTag
}: SimulationBottomSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Simulation Controls">
      <div className="sim-bottom-sheet">
        <div className="sim-bottom-sheet-title">
          <span className="status-dot" />
          Tag States
        </div>

        {tags.length > 0 ? (
          <div className="sim-tag-grid">
            {tags.map(tag => (
              <div key={tag} className="sim-tag-item">
                <span className="sim-tag-name" title={tag}>
                  {tag}
                </span>
                <button
                  className={`sim-tag-toggle ${tagStates[tag] ? 'on' : ''}`}
                  onClick={() => onToggleTag(tag)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div
            className="text-center py-8 text-sm"
            style={{ color: 'var(--text-muted)' }}
          >
            No input tags found. Click on contacts in the ladder to toggle their state.
          </div>
        )}
      </div>
    </BottomSheet>
  )
}

// ================================================
// Use Mobile Detection Hook Re-export
// ================================================

export { useIsTouchDevice }
