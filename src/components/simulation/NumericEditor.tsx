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
    ? 'bottom-full mb-2'
    : position === 'below'
      ? 'top-full mt-2'
      : ''

  return (
    <div
      ref={containerRef}
      className={`numeric-editor ${position !== 'inline' ? 'absolute z-50 ' + positionClasses : ''}`}
      style={{
        background: 'var(--surface-3)',
        border: '1px solid var(--border-strong)',
        borderRadius: '8px',
        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.5)',
        padding: '12px',
        minWidth: '180px'
      }}
    >
      {/* Header with label and reset */}
      {(label || tagName || isEdited) && (
        <div className="flex items-center justify-between mb-2">
          <div>
            {label && (
              <div className="text-[10px] uppercase font-semibold" style={{ color: 'var(--text-muted)' }}>
                {label}
              </div>
            )}
            {tagName && (
              <div className="text-xs font-mono truncate max-w-32" style={{ color: 'var(--text-secondary)' }}>
                {tagName}
              </div>
            )}
          </div>
          {isEdited && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="text-[10px] px-2 py-0.5 rounded transition-colors"
              style={{
                background: 'var(--accent-amber-muted)',
                color: 'var(--accent-amber)'
              }}
              title="Reset to original value"
            >
              Reset
            </button>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Input with increment/decrement buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleDecrement}
            className="numeric-editor-btn"
            title={`Decrease by ${step}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            className="numeric-editor-input"
            style={{
              borderColor: error ? 'var(--accent-red)' : 'var(--border-default)'
            }}
            inputMode={allowFloat ? 'decimal' : 'numeric'}
          />

          <button
            type="button"
            onClick={handleIncrement}
            className="numeric-editor-btn"
            title={`Increase by ${step}`}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <div className="text-[10px] mt-1 px-1" style={{ color: 'var(--accent-red)' }}>
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between mt-3 gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-3 py-1.5 text-xs rounded transition-colors"
            style={{
              background: 'var(--surface-4)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            onClick={handleConfirmClick}
            disabled={!!error}
            className="flex-1 px-3 py-1.5 text-xs rounded transition-colors font-semibold"
            style={{
              background: error ? 'var(--surface-4)' : 'var(--accent-emerald)',
              color: error ? 'var(--text-muted)' : 'white',
              opacity: error ? 0.5 : 1
            }}
          >
            Apply
          </button>
        </div>

        {/* Hint text */}
        <div className="text-[9px] mt-2 text-center" style={{ color: 'var(--text-muted)' }}>
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
    <div className="relative inline-block">
      <div
        className={`editable-numeric-operand ${canEdit ? 'editable' : ''} ${isEdited ? 'edited' : ''}`}
        onClick={handleClick}
        title={canEdit ? 'Click to edit value' : undefined}
      >
        {paramLabel && (
          <span className="text-[9px] uppercase mr-1" style={{ color: 'var(--text-muted)' }}>
            {paramLabel}:
          </span>
        )}
        <span className={`font-mono text-[10px] ${isEdited ? 'text-amber-400' : ''}`}>
          {simEnabled ? (
            <>
              {typeof displayValue === 'number' ? displayValue.toFixed(allowFloat && displayValue % 1 !== 0 ? 2 : 0) : displayValue}
              {canEdit && (
                <svg
                  className="inline-block ml-1 opacity-50"
                  width="8"
                  height="8"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              )}
            </>
          ) : (
            operand
          )}
        </span>
      </div>

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
    <div className="timer-counter-editor flex flex-col gap-1 mt-1">
      {/* ACC Value */}
      <div className="relative">
        <div
          className={`editable-numeric-operand editable ${isAccEdited ? 'edited' : ''}`}
          onClick={() => setEditingField('acc')}
          title="Click to edit accumulator value"
        >
          <span className="text-[9px] uppercase mr-1" style={{ color: 'var(--text-muted)' }}>
            {accLabel}:
          </span>
          <span className={`font-mono text-[10px] ${isAccEdited ? 'text-amber-400' : ''}`}>
            {isTimer ? `${displayAcc.toFixed(1)}s` : displayAcc}
            <svg
              className="inline-block ml-1 opacity-50"
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </span>
        </div>
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
            max={isTimer ? 86400 : 32767}  // 24 hours for timer, INT16 for counter
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
      <div className="relative">
        <div
          className={`editable-numeric-operand editable ${isPreEdited ? 'edited' : ''}`}
          onClick={() => setEditingField('pre')}
          title="Click to edit preset value (affects logic!)"
        >
          <span className="text-[9px] uppercase mr-1" style={{ color: 'var(--text-muted)' }}>
            {preLabel}:
          </span>
          <span className={`font-mono text-[10px] ${isPreEdited ? 'text-amber-400' : ''}`}>
            {isTimer ? `${displayPre.toFixed(1)}s` : displayPre}
            <svg
              className="inline-block ml-1 opacity-50"
              width="8"
              height="8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
          </span>
        </div>
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
