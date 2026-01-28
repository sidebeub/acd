'use client'

import React, { useState, useCallback } from 'react'
import { useSimulation } from '../ladder/SimulationContext'
import type { PDFExportOptions, SimulationSnapshot, Rung, WatchEntry } from '@/lib/pdf-export'
import { openPDFExportWindow, downloadPDFExportHTML } from '@/lib/pdf-export'

interface PDFExportModalProps {
  isOpen: boolean
  onClose: () => void
  rungs: Rung[]
  projectName: string
  programName?: string
  routineName?: string
  watchWindowData?: WatchEntry[]
}

// Icons
const IconClose = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconPrint = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="6 9 6 2 18 2 18 9" />
    <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
    <rect x="6" y="14" width="12" height="8" />
  </svg>
)

const IconDownload = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
)

const IconSimulation = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
)

const IconDocument = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
    <polyline points="10 9 9 9 8 9" />
  </svg>
)

export function PDFExportModal({
  isOpen,
  onClose,
  rungs,
  projectName,
  programName,
  routineName,
  watchWindowData
}: PDFExportModalProps) {
  const { enabled: simulationEnabled, tagStates, timerStates, counterStates } = useSimulation()

  // Export mode
  const [exportMode, setExportMode] = useState<'simulation' | 'clean'>('clean')

  // Content options
  const [includeComments, setIncludeComments] = useState(true)
  const [includeRawText, setIncludeRawText] = useState(false)
  const [includeLegend, setIncludeLegend] = useState(true)
  const [includePageNumbers, setIncludePageNumbers] = useState(true)

  // Simulation data options
  const [includeWatchWindow, setIncludeWatchWindow] = useState(false)
  const [includeTrendChart, setIncludeTrendChart] = useState(false)

  // Style options
  const [colorMode, setColorMode] = useState<'color' | 'blackWhite'>('color')
  const [pageSize, setPageSize] = useState<'letter' | 'a4' | 'legal'>('letter')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait')

  // Build export options
  const buildExportOptions = useCallback((): PDFExportOptions => {
    return {
      includeSimulationState: exportMode === 'simulation',
      includeComments,
      includeRawText,
      includeLegend,
      includePageNumbers,
      includeWatchWindow: exportMode === 'simulation' && includeWatchWindow,
      includeTrendChart: exportMode === 'simulation' && includeTrendChart,
      watchWindowData: includeWatchWindow ? watchWindowData : undefined,
      colorMode,
      pageSize,
      orientation,
      projectName,
      programName,
      routineName
    }
  }, [
    exportMode, includeComments, includeRawText, includeLegend, includePageNumbers,
    includeWatchWindow, includeTrendChart, watchWindowData, colorMode, pageSize,
    orientation, projectName, programName, routineName
  ])

  // Build simulation snapshot
  const buildSimulationSnapshot = useCallback((): SimulationSnapshot | undefined => {
    if (exportMode !== 'simulation' || !simulationEnabled) return undefined

    return {
      timestamp: new Date(),
      tagStates: { ...tagStates },
      timerStates: { ...timerStates },
      counterStates: { ...counterStates },
      numericValues: {}
    }
  }, [exportMode, simulationEnabled, tagStates, timerStates, counterStates])

  // Handle print action
  const handlePrint = useCallback(() => {
    const options = buildExportOptions()
    const snapshot = buildSimulationSnapshot()
    openPDFExportWindow(rungs, options, snapshot)
    onClose()
  }, [buildExportOptions, buildSimulationSnapshot, rungs, onClose])

  // Handle download action
  const handleDownload = useCallback(() => {
    const options = buildExportOptions()
    const snapshot = buildSimulationSnapshot()
    downloadPDFExportHTML(rungs, options, snapshot)
    onClose()
  }, [buildExportOptions, buildSimulationSnapshot, rungs, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.7)' }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-xl shadow-2xl"
        style={{ background: 'var(--surface-2)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4 border-b"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-3)' }}
        >
          <div className="flex items-center gap-3">
            <IconPrint />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              Export / Print
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-4)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <IconClose />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Export Mode Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Export Mode
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setExportMode('clean')}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  exportMode === 'clean' ? 'ring-2 ring-offset-2' : ''
                }`}
                style={{
                  background: exportMode === 'clean' ? 'var(--accent-blue-muted)' : 'var(--surface-3)',
                  borderColor: exportMode === 'clean' ? 'var(--accent-blue)' : 'var(--border-subtle)',
                  color: exportMode === 'clean' ? 'var(--accent-blue)' : 'var(--text-secondary)'
                }}
              >
                <IconDocument />
                <span className="text-sm font-medium">Export Clean</span>
                <span className="text-xs opacity-70">Static ladder logic</span>
              </button>

              <button
                onClick={() => setExportMode('simulation')}
                disabled={!simulationEnabled}
                className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                  exportMode === 'simulation' ? 'ring-2 ring-offset-2' : ''
                } ${!simulationEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                style={{
                  background: exportMode === 'simulation' ? 'var(--accent-emerald-muted)' : 'var(--surface-3)',
                  borderColor: exportMode === 'simulation' ? 'var(--accent-emerald)' : 'var(--border-subtle)',
                  color: exportMode === 'simulation' ? 'var(--accent-emerald)' : 'var(--text-secondary)'
                }}
              >
                <IconSimulation />
                <span className="text-sm font-medium">Export Current State</span>
                <span className="text-xs opacity-70">
                  {simulationEnabled ? 'With simulation values' : 'Start simulation first'}
                </span>
              </button>
            </div>
          </div>

          {/* Content Options */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Content Options
            </label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeComments}
                  onChange={e => setIncludeComments(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-blue)' }}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Include rung comments
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeRawText}
                  onChange={e => setIncludeRawText(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-blue)' }}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Include raw instruction text
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeLegend}
                  onChange={e => setIncludeLegend(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-blue)' }}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Include legend / key
                </span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includePageNumbers}
                  onChange={e => setIncludePageNumbers(e.target.checked)}
                  className="w-4 h-4 rounded"
                  style={{ accentColor: 'var(--accent-blue)' }}
                />
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                  Include page numbers
                </span>
              </label>
            </div>
          </div>

          {/* Simulation Data Options (only when simulation mode selected) */}
          {exportMode === 'simulation' && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                Simulation Data
              </label>
              <div
                className="p-3 rounded-lg mb-3"
                style={{ background: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)' }}
              >
                <p className="text-xs" style={{ color: 'var(--accent-emerald)' }}>
                  Current simulation state will be captured at the moment of export, including:
                  tag states (ON/OFF), timer values (ACC/PRE), counter values, and power flow highlighting.
                </p>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeWatchWindow}
                    onChange={e => setIncludeWatchWindow(e.target.checked)}
                    disabled={!watchWindowData || watchWindowData.length === 0}
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'var(--accent-blue)' }}
                  />
                  <span
                    className={`text-sm ${(!watchWindowData || watchWindowData.length === 0) ? 'opacity-50' : ''}`}
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Include watch window data
                    {(!watchWindowData || watchWindowData.length === 0) && ' (no data available)'}
                  </span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer opacity-50">
                  <input
                    type="checkbox"
                    checked={includeTrendChart}
                    onChange={e => setIncludeTrendChart(e.target.checked)}
                    disabled
                    className="w-4 h-4 rounded"
                    style={{ accentColor: 'var(--accent-blue)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                    Include trend chart (coming soon)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Style Options */}
          <div className="mb-6">
            <label className="block text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
              Style Options
            </label>

            {/* Color Mode */}
            <div className="mb-4">
              <span className="text-xs mb-2 block" style={{ color: 'var(--text-muted)' }}>Color Mode</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setColorMode('color')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    colorMode === 'color' ? '' : 'opacity-70'
                  }`}
                  style={{
                    background: colorMode === 'color' ? 'var(--accent-blue-muted)' : 'var(--surface-3)',
                    color: colorMode === 'color' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    border: `1px solid ${colorMode === 'color' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`
                  }}
                >
                  Color
                </button>
                <button
                  onClick={() => setColorMode('blackWhite')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    colorMode === 'blackWhite' ? '' : 'opacity-70'
                  }`}
                  style={{
                    background: colorMode === 'blackWhite' ? 'var(--surface-4)' : 'var(--surface-3)',
                    color: colorMode === 'blackWhite' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    border: `1px solid ${colorMode === 'blackWhite' ? 'var(--text-muted)' : 'var(--border-subtle)'}`
                  }}
                >
                  Black & White
                </button>
              </div>
            </div>

            {/* Page Size */}
            <div className="mb-4">
              <span className="text-xs mb-2 block" style={{ color: 'var(--text-muted)' }}>Page Size</span>
              <div className="flex gap-2">
                {(['letter', 'a4', 'legal'] as const).map(size => (
                  <button
                    key={size}
                    onClick={() => setPageSize(size)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors`}
                    style={{
                      background: pageSize === size ? 'var(--accent-blue-muted)' : 'var(--surface-3)',
                      color: pageSize === size ? 'var(--accent-blue)' : 'var(--text-secondary)',
                      border: `1px solid ${pageSize === size ? 'var(--accent-blue)' : 'var(--border-subtle)'}`
                    }}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div>
              <span className="text-xs mb-2 block" style={{ color: 'var(--text-muted)' }}>Orientation</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOrientation('portrait')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors`}
                  style={{
                    background: orientation === 'portrait' ? 'var(--accent-blue-muted)' : 'var(--surface-3)',
                    color: orientation === 'portrait' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    border: `1px solid ${orientation === 'portrait' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`
                  }}
                >
                  Portrait
                </button>
                <button
                  onClick={() => setOrientation('landscape')}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors`}
                  style={{
                    background: orientation === 'landscape' ? 'var(--accent-blue-muted)' : 'var(--surface-3)',
                    color: orientation === 'landscape' ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    border: `1px solid ${orientation === 'landscape' ? 'var(--accent-blue)' : 'var(--border-subtle)'}`
                  }}
                >
                  Landscape
                </button>
              </div>
            </div>
          </div>

          {/* Export Info */}
          <div
            className="p-3 rounded-lg"
            style={{ background: 'var(--surface-3)', border: '1px solid var(--border-subtle)' }}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Export Preview
              </span>
            </div>
            <div className="text-xs space-y-1" style={{ color: 'var(--text-muted)' }}>
              <p><strong>Project:</strong> {projectName}</p>
              {programName && <p><strong>Program:</strong> {programName}</p>}
              {routineName && <p><strong>Routine:</strong> {routineName}</p>}
              <p><strong>Rungs:</strong> {rungs.length}</p>
              <p><strong>Mode:</strong> {exportMode === 'simulation' ? 'With Simulation State' : 'Clean Export'}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-end gap-3 px-6 py-4 border-t"
          style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-3)' }}
        >
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--surface-4)',
              color: 'var(--text-secondary)'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--surface-4)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'var(--surface-4)'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            Cancel
          </button>

          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--surface-4)',
              color: 'var(--text-primary)',
              border: '1px solid var(--border-default)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-4)'}
          >
            <IconDownload />
            Download HTML
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: 'var(--accent-blue)',
              color: 'white'
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--accent-blue)'}
          >
            <IconPrint />
            Print / Export PDF
          </button>
        </div>
      </div>
    </div>
  )
}

export default PDFExportModal
