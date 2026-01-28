'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

interface NumericEditorProps {
  /** Current value to display/edit */
  value: number
  /** Callback when value is confirmed */
  onConfirm: (value: number) => void
  /** Callback when editing is cancelled */
  onCancel: () => void
  /** Label to show above the input */
  label?: string
  /** Tag name being edited */
  tagName?: string
  /** Minimum allowed value */
  min?: number
  /** Maximum allowed value */
  max?: number
  /** Step for increment/decrement buttons (default 1) */
  step?: number
  /** Whether to allow floating point numbers */
  allowFloat?: boolean
  /** Whether this value has been edited (show differently) */
  isEdited?: boolean
  /** Callback to reset to original value */
  onReset?: () => void
  /** Position hint for popup placement */
  position?: 'above' | 'below' | 'inline'
}

// Icons
const IconMinus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconEdit = () => (
  <svg
    className="numeric-edit-icon"
    width="10"
    height="10"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
)

export function NumericEditor({
  value,
  onConfirm,
  onCancel,
  label,
  tagName,
  min = -2147483648,  // INT32 min
  max = 2147483647,   // INT32 max
  step = 1,
  allowFloat = true,
  isEdited = false,
  onReset,
  position = 'below'
}: NumericEditorProps) {
  const [inputValue, setInputValue] = useState(value.toString())
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [])

  // Handle click outside to cancel
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        onCancel()
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [onCancel])

  // Validate and parse the input
  const validateAndParse = useCallback((val: string): { valid: boolean; parsed: number; error?: string } => {
    const trimmed = val.trim()
    if (trimmed === '') {
      return { valid: false, parsed: 0, error: 'Value required' }
    }

    const parsed = allowFloat ? parseFloat(trimmed) : parseInt(trimmed, 10)
    if (isNaN(parsed)) {
      return { valid: false, parsed: 0, error: 'Invalid number' }
    }

    if (parsed < min) {
      return { valid: false, parsed, error: `Min: ${min}` }
    }

    if (parsed > max) {
      return { valid: false, parsed, error: `Max: ${max}` }
    }

    return { valid: true, parsed }
  }, [allowFloat, min, max])

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value
    setInputValue(newValue)

    const { error: validationError } = validateAndParse(newValue)
    setError(validationError || null)
  }

  // Handle form submit (Enter key)
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const { valid, parsed } = validateAndParse(inputValue)
    if (valid) {
      onConfirm(parsed)
    }
  }

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const { valid, parsed } = validateAndParse(inputValue)
      if (valid) {
        const newVal = Math.min(parsed + step, max)
        setInputValue(allowFloat ? newVal.toString() : Math.round(newVal).toString())
        setError(null)
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const { valid, parsed } = validateAndParse(inputValue)
      if (valid) {
        const newVal = Math.max(parsed - step, min)
        setInputValue(allowFloat ? newVal.toString() : Math.round(newVal).toString())
        setError(null)
      }
    }
  }

  // Increment/Decrement button handlers
  const handleIncrement = () => {
    const { valid, parsed } = validateAndParse(inputValue)
    if (valid) {
      const newVal = Math.min(parsed + step, max)
      setInputValue(allowFloat ? newVal.toString() : Math.round(newVal).toString())
      setError(null)
    }
  }

  const handleDecrement = () => {
    const { valid, parsed } = validateAndParse(inputValue)
    if (valid) {
      const newVal = Math.max(parsed - step, min)
      setInputValue(allowFloat ? newVal.toString() : Math.round(newVal).toString())
      setError(null)
    }
  }

  // Confirm button handler
  const handleConfirmClick = () => {
    const { valid, parsed } = validateAndParse(inputValue)
    if (valid) {
      onConfirm(parsed)
    }
  }

  const positionClasses = position === 'above'
    ? 'numeric-editor-above'
    : position === 'below'
      ? 'numeric-editor-below'
      : 'numeric-editor-inline'

  return (
    <div
      ref={containerRef}
      className={`numeric-editor ${positionClasses}`}
      role="dialog"
      aria-label={label ? `Edit ${label}` : 'Edit value'}
    >
      {/* Header with label and reset */}
      {(label || tagName || isEdited) && (
        <div className="numeric-editor-header">
          <div className="numeric-editor-labels">
            {label && (
              <div className="numeric-editor-label">
                {label}
              </div>
            )}
            {tagName && (
              <div className="numeric-editor-tagname">
                {tagName}
              </div>
            )}
          </div>
          {isEdited && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="numeric-editor-reset touch-target"
              title="Reset to original value"
            >
              Reset
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Input with increment/decrement buttons */}
        <div className="numeric-editor-controls">
          <button
            type="button"
            onClick={handleDecrement}
            className="numeric-editor-btn touch-target"
            title={`Decrease by ${step}`}
            aria-label="Decrease value"
          >
            <IconMinus />
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className={`numeric-editor-input touch-target-height ${error ? 'has-error' : ''}`}
            inputMode={allowFloat ? 'decimal' : 'numeric'}
            aria-invalid={!!error}
            aria-describedby={error ? 'numeric-editor-error' : undefined}
          />

          <button
            type="button"
            onClick={handleIncrement}
            className="numeric-editor-btn touch-target"
            title={`Increase by ${step}`}
            aria-label="Increase value"
          >
            <IconPlus />
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div id="numeric-editor-error" className="numeric-editor-error" role="alert">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="numeric-editor-actions">
          <button
            type="button"
            onClick={onCancel}
            className="numeric-editor-cancel touch-target"
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleConfirmClick}
            disabled={!!error}
            className="numeric-editor-submit touch-target"
          >
            Apply
          </button>
        </div>

        {/* Hint text - hide on mobile */}
        <div className="numeric-editor-hint hide-mobile">
          Enter to apply, Esc to cancel, Up/Down to adjust
        </div>
      </form>
    </div>
  )
}

// ================================================
// Editable Numeric Operand Component
// ================================================

interface EditableNumericOperandProps {
  /** The operand value/tag name to display */
  operand: string
  /** Current numeric value (from simulation state) */
  value: number
  /** Parameter label (e.g., "Source A", "Preset") */
  paramLabel?: string
  /** Whether this operand can be edited */
  editable?: boolean
  /** Callback when value changes */
  onValueChange?: (value: number) => void
  /** Whether this value has been edited */
  isEdited?: boolean
  /** Callback to reset to original */
  onReset?: () => void
  /** Whether simulation is enabled */
  simEnabled?: boolean
  /** Validation constraints */
  min?: number
  max?: number
  step?: number
  allowFloat?: boolean
}

export function EditableNumericOperand({
  operand,
  value,
  paramLabel,
  editable = true,
  onValueChange,
  isEdited = false,
  onReset,
  simEnabled = false,
  min,
  max,
  step = 1,
  allowFloat = true
}: EditableNumericOperandProps) {
  const [isEditing, setIsEditing] = useState(false)

  // Don't allow editing if simulation is disabled
  const canEdit = simEnabled && editable && onValueChange

  const handleClick = () => {
    if (canEdit) {
      setIsEditing(true)
    }
  }

  const handleConfirm = (newValue: number) => {
    onValueChange?.(newValue)
    setIsEditing(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
  }

  const handleReset = () => {
    onReset?.()
    setIsEditing(false)
  }

  // Parse display value - could be a tag name or direct number
  const displayValue = simEnabled ? value : operand

  return (
    <div className="editable-operand-container">
      <button
        type="button"
        className={`editable-numeric-operand ${canEdit ? 'editable' : ''} ${isEdited ? 'edited' : ''}`}
        onClick={handleClick}
        disabled={!canEdit}
        title={canEdit ? 'Click to edit value' : undefined}
        aria-label={canEdit ? `Edit ${paramLabel || operand}` : undefined}
      >
        {paramLabel && (
          <span className="editable-operand-label">
            {paramLabel}:
          </span>
        )}
        <span className={`editable-operand-value ${isEdited ? 'edited' : ''}`}>
          {simEnabled ? (
            <>
              {typeof displayValue === 'number' ? displayValue.toFixed(allowFloat && displayValue % 1 !== 0 ? 2 : 0) : displayValue}
              {canEdit && <IconEdit />}
            </>
          ) : (
            operand
          )}
        </span>
      </button>

      {isEditing && (
        <NumericEditor
          value={value}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
          label={paramLabel}
          tagName={operand}
          min={min}
          max={max}
          step={step}
          allowFloat={allowFloat}
          isEdited={isEdited}
          onReset={onReset ? handleReset : undefined}
          position="below"
        />
      )}
    </div>
  )
}

// ================================================
// Timer/Counter Value Editor
// ================================================

interface TimerCounterEditorProps {
  type: 'timer' | 'counter'
  tagName: string
  accValue: number
  preValue: number
  onAccChange: (value: number) => void
  onPreChange: (value: number) => void
  isAccEdited?: boolean
  isPreEdited?: boolean
  onAccReset?: () => void
  onPreReset?: () => void
  simEnabled?: boolean
}

export function TimerCounterEditor({
  type,
  tagName,
  accValue,
  preValue,
  onAccChange,
  onPreChange,
  isAccEdited = false,
  isPreEdited = false,
  onAccReset,
  onPreReset,
  simEnabled = false
}: TimerCounterEditorProps) {
  const [editingField, setEditingField] = useState<'acc' | 'pre' | null>(null)

  if (!simEnabled) return null

  const isTimer = type === 'timer'
  const accLabel = 'ACC'
  const preLabel = 'PRE'

  // Timer ACC is in milliseconds, display as seconds
  const displayAcc = isTimer ? accValue / 1000 : accValue
  const displayPre = isTimer ? preValue / 1000 : preValue

  return (
    <div className="timer-counter-editor">
      {/* ACC Value */}
      <div className="timer-counter-field">
        <button
          type="button"
          className={`editable-numeric-operand editable ${isAccEdited ? 'edited' : ''}`}
          onClick={() => setEditingField('acc')}
          title="Click to edit accumulator value"
          aria-label={`Edit ${tagName} accumulator value`}
        >
          <span className="editable-operand-label">
            {accLabel}:
          </span>
          <span className={`editable-operand-value ${isAccEdited ? 'edited' : ''}`}>
            {isTimer ? `${displayAcc.toFixed(1)}s` : displayAcc}
            <IconEdit />
          </span>
        </button>
        {editingField === 'acc' && (
          <NumericEditor
            value={isTimer ? displayAcc : accValue}
            onConfirm={(val) => {
              onAccChange(isTimer ? val * 1000 : val)
              setEditingField(null)
            }}
            onCancel={() => setEditingField(null)}
            label={`${tagName}.${accLabel}`}
            min={0}
            max={isTimer ? 86400 : 32767}
            step={isTimer ? 0.1 : 1}
            allowFloat={isTimer}
            isEdited={isAccEdited}
            onReset={onAccReset ? () => {
              onAccReset()
              setEditingField(null)
            } : undefined}
            position="below"
          />
        )}
      </div>

      {/* PRE Value */}
      <div className="timer-counter-field">
        <button
          type="button"
          className={`editable-numeric-operand editable ${isPreEdited ? 'edited' : ''}`}
          onClick={() => setEditingField('pre')}
          title="Click to edit preset value (affects logic!)"
          aria-label={`Edit ${tagName} preset value`}
        >
          <span className="editable-operand-label">
            {preLabel}:
          </span>
          <span className={`editable-operand-value ${isPreEdited ? 'edited' : ''}`}>
            {isTimer ? `${displayPre.toFixed(1)}s` : displayPre}
            <IconEdit />
          </span>
        </button>
        {editingField === 'pre' && (
          <NumericEditor
            value={isTimer ? displayPre : preValue}
            onConfirm={(val) => {
              onPreChange(isTimer ? val * 1000 : val)
              setEditingField(null)
            }}
            onCancel={() => setEditingField(null)}
            label={`${tagName}.${preLabel}`}
            min={isTimer ? 0.1 : 1}
            max={isTimer ? 86400 : 32767}
            step={isTimer ? 0.5 : 1}
            allowFloat={isTimer}
            isEdited={isPreEdited}
            onReset={onPreReset ? () => {
              onPreReset()
              setEditingField(null)
            } : undefined}
            position="below"
          />
        )}
      </div>
    </div>
  )
}

export default NumericEditor
