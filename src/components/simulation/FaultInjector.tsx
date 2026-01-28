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

// Icons with larger touch-friendly sizes
const IconWarning = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    <line x1="12" y1="9" x2="12" y2="13" />
    <line x1="12" y1="17" x2="12.01" y2="17" />
  </svg>
)

const IconX = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
)

const IconZap = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
)

const IconChevron = ({ expanded }: { expanded: boolean }) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    style={{
      transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
      transition: 'transform var(--transition-base)'
    }}
  >
    <polyline points="6 9 12 15 18 9" />
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
      className="fault-item"
      style={{
        borderColor: `${faultInfo.color}40`
      }}
    >
      <div className="fault-item-content">
        {/* Fault type indicator */}
        <span
          className="fault-type-badge"
          style={{
            background: `${faultInfo.color}20`,
            color: faultInfo.color,
            borderColor: `${faultInfo.color}50`
          }}
          title={faultInfo.description}
        >
          {faultInfo.icon}
        </span>

        {/* Tag name and fault type */}
        <div className="fault-item-info">
          <div className="fault-item-tag">
            {tagName}
          </div>
          <div
            className="fault-item-type"
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
        className="fault-item-remove touch-target"
        title="Remove fault"
        aria-label={`Remove fault from ${tagName}`}
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
    <form onSubmit={handleSubmit} className="fault-form">
      {/* Tag name input */}
      <div className="fault-form-field">
        <label
          htmlFor="fault-tag-name"
          className="fault-form-label"
        >
          Tag Name
        </label>
        <input
          id="fault-tag-name"
          type="text"
          value={tagName}
          onChange={e => setTagName(e.target.value)}
          list="available-tags"
          placeholder="Enter tag name..."
          className="fault-form-input touch-target-height"
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
      <div className="fault-form-field">
        <label
          htmlFor="fault-type"
          className="fault-form-label"
        >
          Fault Type
        </label>
        <select
          id="fault-type"
          value={faultType}
          onChange={e => setFaultType(e.target.value as FaultType)}
          className="fault-form-select touch-target-height"
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
        <div className="fault-form-field">
          <label
            htmlFor="fault-delay"
            className="fault-form-label"
          >
            Delay (ms)
          </label>
          <input
            id="fault-delay"
            type="number"
            inputMode="numeric"
            value={delay}
            onChange={e => setDelay(parseInt(e.target.value) || 0)}
            min={100}
            max={10000}
            step={100}
            className="fault-form-input touch-target-height"
          />
        </div>
      )}

      {faultType === 'intermittent' && (
        <div className="fault-form-field">
          <label
            htmlFor="fault-probability"
            className="fault-form-label"
          >
            Toggle Probability (%)
          </label>
          <input
            id="fault-probability"
            type="range"
            value={probability}
            onChange={e => setProbability(parseInt(e.target.value))}
            min={1}
            max={100}
            className="fault-form-slider"
          />
          <div className="fault-form-hint">
            {probability}% chance to toggle each scan
          </div>
        </div>
      )}

      {/* Buttons */}
      <div className="fault-form-actions">
        <button
          type="submit"
          disabled={!tagName.trim()}
          className="fault-form-submit touch-target"
        >
          <IconPlus />
          Add Fault
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="fault-form-cancel touch-target"
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
    <div className="fault-quick-actions">
      <div className="fault-quick-actions-label">
        Quick Actions
      </div>

      <div className="fault-quick-actions-buttons">
        {inputTags.length > 0 && (
          <button
            onClick={handleFailAllInputs}
            className="fault-quick-btn fault-quick-btn-danger touch-target"
            title={`Fail ${inputTags.length} input tags`}
          >
            <IconZap />
            <span>Fail All Inputs ({inputTags.length})</span>
          </button>
        )}

        {hasFaults && (
          <button
            onClick={clearAllFaults}
            className="fault-quick-btn fault-quick-btn-secondary touch-target"
          >
            <IconTrash />
            <span>Clear All Faults</span>
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
      className={`fault-injector-panel container-inline ${faultCount > 0 ? 'has-faults' : ''} ${className}`}
    >
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`fault-injector-header touch-target-height ${faultCount > 0 ? 'has-faults' : ''}`}
        aria-expanded={isExpanded}
      >
        <div className="fault-injector-title-group">
          <span className={`fault-injector-icon ${faultCount > 0 ? 'active' : ''}`}>
            <IconWarning />
          </span>
          <span className="fault-injector-title">
            Fault Injection
          </span>
          {faultCount > 0 && (
            <span className="fault-count-badge">
              {faultCount} active
            </span>
          )}
        </div>
        <IconChevron expanded={isExpanded} />
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="fault-injector-content">
          {/* Active faults list */}
          {faultCount > 0 && (
            <div className="fault-list-section">
              <div className="fault-list-label">
                Active Faults
              </div>
              <div className="fault-list">
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
              className="fault-add-btn touch-target"
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
            <div className="fault-help-text">
              <strong>Use cases:</strong>
              <ul>
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
