'use client'

import React, { useState, useCallback } from 'react'
import { useSimulation, FaultConfig, FaultType } from '../ladder/SimulationContext'

// ================================================
// Fault Injector Panel Component
// ================================================

interface FaultInjectorProps {
  availableTags?: string[]  // List of available tags to select from
  className?: string
}

// Icons
const IconWarning = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconPlus = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconTrash = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
)

const IconZap = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

// Fault type display configuration
const FAULT_TYPE_CONFIG: Record<FaultType, { label: string; description: string; color: string; icon: string }> = {
  stuck_on: {
    label: 'Stuck ON',
    description: 'Tag always reads as true',
    color: '#ef4444',
    icon: '1'
  },
  stuck_off: {
    label: 'Stuck OFF',
    description: 'Tag always reads as false',
    color: '#3b82f6',
    icon: '0'
  },
  intermittent: {
    label: 'Intermittent',
    description: 'Tag randomly toggles',
    color: '#f59e0b',
    icon: '~'
  },
  delayed: {
    label: 'Delayed',
    description: 'Tag changes are delayed',
    color: '#8b5cf6',
    icon: 'D'
  },
  inverted: {
    label: 'Inverted',
    description: 'Tag reads opposite of actual value',
    color: '#ec4899',
    icon: '!'
  }
}

// Individual fault item display
function FaultItem({
  tagName,
  config,
  onRemove
}: {
  tagName: string
  config: FaultConfig
  onRemove: () => void
}) {
  const faultInfo = FAULT_TYPE_CONFIG[config.type]

  return (
    <div
      className="fault-item flex items-center justify-between gap-2 px-3 py-2 rounded-md"
      style={{
        background: 'var(--surface-2)',
        border: `1px solid ${faultInfo.color}40`
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {/* Fault type indicator */}
        <span
          className="fault-type-badge flex items-center justify-center w-6 h-6 rounded text-xs font-bold flex-shrink-0"
          style={{
            background: `${faultInfo.color}20`,
            color: faultInfo.color,
            border: `1px solid ${faultInfo.color}50`
          }}
          title={faultInfo.description}
        >
          {faultInfo.icon}
        </span>

        {/* Tag name and fault type */}
        <div className="min-w-0">
          <div
            className="font-mono text-sm font-medium truncate"
            style={{ color: 'var(--text-primary)' }}
          >
            {tagName}
          </div>
          <div
            className="text-xs"
            style={{ color: faultInfo.color }}
          >
            {faultInfo.label}
            {config.params?.delay && ` (${config.params.delay}ms)`}
            {config.params?.probability && ` (${Math.round(config.params.probability * 100)}%)`}
          </div>
        </div>
      </div>

      {/* Remove button */}
      <button
        onClick={onRemove}
        className="p-1.5 rounded transition-colors flex-shrink-0"
        style={{
          color: 'var(--text-muted)',
          background: 'transparent'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--surface-4)'
          e.currentTarget.style.color = 'var(--accent-red)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-muted)'
        }}
        title="Remove fault"
      >
        <IconX />
      </button>
    </div>
  )
}

// Add fault form
function AddFaultForm({
  availableTags,
  onAdd,
  onCancel
}: {
  availableTags: string[]
  onAdd: (tagName: string, config: FaultConfig) => void
  onCancel: () => void
}) {
  const [tagName, setTagName] = useState('')
  const [faultType, setFaultType] = useState<FaultType>('stuck_on')
  const [delay, setDelay] = useState(500)
  const [probability, setProbability] = useState(50)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!tagName.trim()) return

    const config: FaultConfig = { type: faultType }

    if (faultType === 'delayed') {
      config.params = { delay }
    } else if (faultType === 'intermittent') {
      config.params = { probability: probability / 100 }
    }

    onAdd(tagName.trim(), config)
    setTagName('')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Tag name input */}
      <div>
        <label
          className="block text-xs font-medium mb-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Tag Name
        </label>
        <input
          type="text"
          value={tagName}
          onChange={e => setTagName(e.target.value)}
          list="available-tags"
          placeholder="Enter tag name..."
          className="w-full px-3 py-2 rounded-md text-sm font-mono"
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)'
          }}
          autoFocus
        />
        {availableTags.length > 0 && (
          <datalist id="available-tags">
            {availableTags.map(tag => (
              <option key={tag} value={tag} />
            ))}
          </datalist>
        )}
      </div>

      {/* Fault type selection */}
      <div>
        <label
          className="block text-xs font-medium mb-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          Fault Type
        </label>
        <select
          value={faultType}
          onChange={e => setFaultType(e.target.value as FaultType)}
          className="w-full px-3 py-2 rounded-md text-sm"
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--border-default)',
            color: 'var(--text-primary)'
          }}
        >
          {Object.entries(FAULT_TYPE_CONFIG).map(([type, info]) => (
            <option key={type} value={type}>
              {info.label} - {info.description}
            </option>
          ))}
        </select>
      </div>

      {/* Fault type specific parameters */}
      {faultType === 'delayed' && (
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Delay (ms)
          </label>
          <input
            type="number"
            value={delay}
            onChange={e => setDelay(parseInt(e.target.value) || 0)}
            min={100}
            max={10000}
            step={100}
            className="w-full px-3 py-2 rounded-md text-sm"
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border-default)',
              color: 'var(--text-primary)'
            }}
          />
        </div>
      )}

      {faultType === 'intermittent' && (
        <div>
          <label
            className="block text-xs font-medium mb-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            Toggle Probability (%)
          </label>
          <input
            type="range"
            value={probability}
            onChange={e => setProbability(parseInt(e.target.value))}
            min={1}
            max={100}
            className="w-full"
          />
          <div className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
            {probability}% chance to toggle each scan
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={!tagName.trim()}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors"
          style={{
            background: tagName.trim() ? 'var(--accent-amber)' : 'var(--surface-3)',
            color: tagName.trim() ? 'black' : 'var(--text-muted)',
            cursor: tagName.trim() ? 'pointer' : 'not-allowed'
          }}
        >
          <IconPlus />
          Add Fault
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-md text-sm transition-colors"
          style={{
            background: 'var(--surface-3)',
            color: 'var(--text-secondary)'
          }}
        >
          Cancel
        </button>
      </div>
    </form>
  )
}

// Quick actions section
function QuickActions({
  availableTags,
  onInjectFault
}: {
  availableTags: string[]
  onInjectFault: (tagName: string, config: FaultConfig) => void
}) {
  const { faults, clearAllFaults } = useSimulation()

  // Find input tags (typically tags with Local:X:I or similar patterns)
  const inputTags = availableTags.filter(tag =>
    tag.includes(':I') || tag.toLowerCase().includes('input') || tag.toLowerCase().includes('sensor')
  )

  const handleFailAllInputs = () => {
    inputTags.forEach(tag => {
      onInjectFault(tag, { type: 'stuck_off' })
    })
  }

  const hasFaults = Object.keys(faults).length > 0

  return (
    <div className="space-y-2">
      <div
        className="text-xs font-medium uppercase tracking-wider"
        style={{ color: 'var(--text-muted)' }}
      >
        Quick Actions
      </div>

      <div className="flex flex-wrap gap-2">
        {inputTags.length > 0 && (
          <button
            onClick={handleFailAllInputs}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
            style={{
              background: 'var(--accent-red-muted)',
              color: 'var(--accent-red)',
              border: '1px solid rgba(239, 68, 68, 0.3)'
            }}
            title={`Fail ${inputTags.length} input tags`}
          >
            <IconZap />
            Fail All Inputs ({inputTags.length})
          </button>
        )}

        {hasFaults && (
          <button
            onClick={clearAllFaults}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-colors"
            style={{
              background: 'var(--surface-3)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <IconTrash />
            Clear All Faults
          </button>
        )}
      </div>
    </div>
  )
}

// Main Fault Injector Panel
export function FaultInjector({ availableTags = [], className = '' }: FaultInjectorProps) {
  const { enabled, faults, injectFault, clearFault } = useSimulation()
  const [showAddForm, setShowAddForm] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  const faultCount = Object.keys(faults).length

  const handleAddFault = useCallback((tagName: string, config: FaultConfig) => {
    injectFault(tagName, config)
    setShowAddForm(false)
  }, [injectFault])

  if (!enabled) {
    return null
  }

  return (
    <div
      className={`fault-injector-panel rounded-lg overflow-hidden ${className}`}
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-default)'
      }}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 transition-colors"
        style={{
          background: faultCount > 0 ? 'rgba(245, 158, 11, 0.1)' : 'var(--surface-3)',
          borderBottom: isExpanded ? '1px solid var(--border-subtle)' : 'none'
        }}
      >
        <div className="flex items-center gap-2">
          <span style={{ color: faultCount > 0 ? 'var(--accent-amber)' : 'var(--text-muted)' }}>
            <IconWarning />
          </span>
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text-primary)' }}
          >
            Fault Injection
          </span>
          {faultCount > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                background: 'var(--accent-amber)',
                color: 'black'
              }}
            >
              {faultCount} active
            </span>
          )}
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          style={{
            color: 'var(--text-muted)',
            transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Active faults list */}
          {faultCount > 0 && (
            <div className="space-y-2">
              <div
                className="text-xs font-medium uppercase tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                Active Faults
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {Object.entries(faults).map(([tagName, config]) => (
                  <FaultItem
                    key={tagName}
                    tagName={tagName}
                    config={config}
                    onRemove={() => clearFault(tagName)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Add fault form or button */}
          {showAddForm ? (
            <AddFaultForm
              availableTags={availableTags}
              onAdd={handleAddFault}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              style={{
                background: 'var(--surface-3)',
                color: 'var(--text-secondary)',
                border: '1px dashed var(--border-default)'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'var(--surface-4)'
                e.currentTarget.style.borderStyle = 'solid'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'var(--surface-3)'
                e.currentTarget.style.borderStyle = 'dashed'
              }}
            >
              <IconPlus />
              Add Fault
            </button>
          )}

          {/* Quick actions */}
          <QuickActions
            availableTags={availableTags}
            onInjectFault={injectFault}
          />

          {/* Help text */}
          {faultCount === 0 && !showAddForm && (
            <div
              className="text-xs p-3 rounded-md"
              style={{
                background: 'var(--surface-1)',
                color: 'var(--text-muted)'
              }}
            >
              <strong>Use cases:</strong>
              <ul className="mt-1 space-y-1 pl-4 list-disc">
                <li>Simulate a proximity sensor stuck ON</li>
                <li>Test intermittent connection failures</li>
                <li>Verify program handles sensor failures</li>
                <li>Test delayed responses from field devices</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Fault indicator badge for instructions
export function FaultIndicator({ tagName }: { tagName: string }) {
  const { faults } = useSimulation()
  const fault = faults[tagName]

  if (!fault) return null

  const faultInfo = FAULT_TYPE_CONFIG[fault.type]

  return (
    <span
      className="fault-indicator absolute -top-2 -left-2 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold z-10"
      style={{
        background: faultInfo.color,
        color: 'white',
        boxShadow: `0 0 8px ${faultInfo.color}80`,
        animation: 'fault-pulse 1s ease-in-out infinite'
      }}
      title={`Fault: ${faultInfo.label} - ${faultInfo.description}`}
    >
      {faultInfo.icon}
    </span>
  )
}

// Hook to check if a tag has an active fault
export function useTagFault(tagName: string): FaultConfig | null {
  const { faults } = useSimulation()
  return faults[tagName] || null
}

export default FaultInjector
