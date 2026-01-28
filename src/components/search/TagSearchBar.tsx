'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

interface TagSearchBarProps {
  isOpen: boolean
  onClose: () => void
  searchTerm: string
  onSearchChange: (term: string) => void
  matchCount: number
  currentMatchIndex: number
  onNavigateNext: () => void
  onNavigatePrev: () => void
}

// Icons
const IconSearch = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
)

const IconChevronUp = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 15l-6-6-6 6" />
  </svg>
)

const IconChevronDown = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9l6 6 6-6" />
  </svg>
)

const IconClose = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export function TagSearchBar({
  isOpen,
  onClose,
  searchTerm,
  onSearchChange,
  matchCount,
  currentMatchIndex,
  onNavigateNext,
  onNavigatePrev
}: TagSearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  // Handle keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (e.shiftKey) {
          onNavigatePrev()
        } else {
          onNavigateNext()
        }
      } else if (e.key === 'F3') {
        e.preventDefault()
        if (e.shiftKey) {
          onNavigatePrev()
        } else {
          onNavigateNext()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, onNavigateNext, onNavigatePrev])

  if (!isOpen) return null

  const hasMatches = matchCount > 0

  return (
    <div className="tag-search-bar">
      {/* Search icon */}
      <div style={{ color: 'var(--text-muted)' }}>
        <IconSearch />
      </div>

      {/* Input field */}
      <input
        ref={inputRef}
        type="text"
        placeholder="Search tags... (partial match)"
        value={searchTerm}
        onChange={(e) => onSearchChange(e.target.value)}
        autoFocus
      />

      {/* Match count */}
      {searchTerm.length > 0 && (
        <div className={`match-count ${hasMatches ? 'has-matches' : ''}`}>
          {hasMatches
            ? `${currentMatchIndex + 1} of ${matchCount}`
            : 'No matches'}
        </div>
      )}

      {/* Navigation buttons */}
      <button
        className="nav-btn"
        onClick={onNavigatePrev}
        disabled={!hasMatches}
        title="Previous match (Shift+Enter)"
      >
        <IconChevronUp />
      </button>
      <button
        className="nav-btn"
        onClick={onNavigateNext}
        disabled={!hasMatches}
        title="Next match (Enter)"
      >
        <IconChevronDown />
      </button>

      {/* Close button */}
      <button
        className="close-btn"
        onClick={onClose}
        title="Close (Esc)"
      >
        <IconClose />
      </button>
    </div>
  )
}
