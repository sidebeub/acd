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
  onGenerateAllExplanations?: () => Promise<Rung[]>
}

export function PDFExportModal({
  isOpen,
  onClose,
  rungs,
  projectName,
  programName,
  routineName,
  watchWindowData,
  onGenerateAllExplanations
}: PDFExportModalProps) {
  const { enabled: simulationEnabled, tagStates, timerStates, counterStates } = useSimulation()

  // Export mode
  const [exportMode, setExportMode] = useState<'simulation' | 'clean'>('clean')

  // Content options
  const [includeComments, setIncludeComments] = useState(true)
  const [includeExplanations, setIncludeExplanations] = useState(true)
  const [includeRawText, setIncludeRawText] = useState(false)
  const [includeLegend, setIncludeLegend] = useState(true)
  const [includePageNumbers, setIncludePageNumbers] = useState(true)

  // Simulation data options
  const [includeWatchWindow, setIncludeWatchWindow] = useState(false)
  const [includeTrendChart, setIncludeTrendChart] = useState(false)

  // Style options
  const [colorMode, setColorMode] = useState<'color' | 'blackWhite'>('color')
  const [pageSize, setPageSize] = useState<'letter' | 'a4' | 'legal'>('letter')
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape')

  // Loading state for generating explanations
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 })

  // Track rungs with explanations
  const rungsWithExplanations = rungs.filter(r => r.explanation).length
  const rungsMissingExplanations = rungs.length - rungsWithExplanations

  // Build export options
  const buildExportOptions = useCallback((): PDFExportOptions => {
    return {
      includeSimulationState: exportMode === 'simulation',
      includeComments,
      includeExplanations,
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
    exportMode, includeComments, includeExplanations, includeRawText, includeLegend, includePageNumbers,
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

  // Handle export with explanation generation
  const handleExport = useCallback(async (type: 'print' | 'download') => {
    let exportRungs = rungs

    // Generate explanations if needed
    if (includeExplanations && rungsMissingExplanations > 0 && onGenerateAllExplanations) {
      setIsGenerating(true)
      setGenerationProgress({ current: 0, total: rungsMissingExplanations })
      try {
        exportRungs = await onGenerateAllExplanations()
      } catch (error) {
        console.error('Failed to generate explanations:', error)
      }
      setIsGenerating(false)
    }

    const options = buildExportOptions()
    const snapshot = buildSimulationSnapshot()

    if (type === 'print') {
      openPDFExportWindow(exportRungs, options, snapshot)
    } else {
      downloadPDFExportHTML(exportRungs, options, snapshot)
    }
    onClose()
  }, [rungs, includeExplanations, rungsMissingExplanations, onGenerateAllExplanations, buildExportOptions, buildSimulationSnapshot, onClose])

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{
        background: 'rgba(0, 0, 0, 0.8)',
        backdropFilter: 'blur(8px)',
      }}
      onClick={onClose}
    >
      <div
        className="relative w-full h-full sm:h-auto overflow-hidden flex flex-col"
        style={{
          background: 'var(--surface-1)',
          maxWidth: '560px',
          maxHeight: '100dvh',
          border: '1px solid var(--border-subtle)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between border-b flex-shrink-0"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--surface-0)',
            padding: 'var(--space-5) var(--space-6)',
          }}
        >
          <div>
            <p style={{
              fontSize: '10px',
              fontWeight: 600,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: '4px'
            }}>
              Export
            </p>
            <h2 style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em'
            }}>
              Generate Report
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            style={{
              color: 'var(--text-muted)',
              padding: 'var(--space-2)',
              transition: 'color 0.2s',
              opacity: isGenerating ? 0.5 : 1,
            }}
            onMouseEnter={e => !isGenerating && (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Loading Overlay */}
        {isGenerating && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.7)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                border: '3px solid var(--surface-3)',
                borderTopColor: 'var(--accent-blue)',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
            <p style={{ color: '#fff', marginTop: 'var(--space-4)', fontSize: '14px', fontWeight: 500 }}>
              Generating AI Explanations...
            </p>
            <p style={{ color: 'var(--text-muted)', marginTop: 'var(--space-2)', fontSize: '12px' }}>
              {generationProgress.current} / {generationProgress.total} rungs
            </p>
            <style>{`
              @keyframes spin {
                to { transform: rotate(360deg); }
              }
            `}</style>
          </div>
        )}

        {/* Content */}
        <div
          className="flex-1 overflow-y-auto"
          style={{ padding: 'var(--space-6)' }}
        >
          {/* Project Info Card */}
          <div
            style={{
              background: 'var(--surface-0)',
              border: '1px solid var(--border-subtle)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Project</p>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{projectName}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Rungs</p>
                <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{rungs.length}</p>
              </div>
              {programName && (
                <div>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Program</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{programName}</p>
                </div>
              )}
              {routineName && (
                <div>
                  <p style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Routine</p>
                  <p style={{ fontSize: '14px', color: 'var(--text-primary)', fontWeight: 500 }}>{routineName}</p>
                </div>
              )}
            </div>
          </div>

          {/* Export Mode */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <p style={{
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 'var(--space-3)'
            }}>
              Export Mode
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1px', background: 'var(--border-subtle)' }}>
              <button
                onClick={() => setExportMode('clean')}
                style={{
                  background: exportMode === 'clean' ? 'var(--surface-0)' : 'var(--surface-2)',
                  padding: 'var(--space-4)',
                  textAlign: 'left',
                  borderLeft: exportMode === 'clean' ? '2px solid var(--accent-blue)' : '2px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <p style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: exportMode === 'clean' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  marginBottom: '4px'
                }}>
                  Clean Export
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Static ladder logic diagram
                </p>
              </button>

              <button
                onClick={() => simulationEnabled && setExportMode('simulation')}
                style={{
                  background: exportMode === 'simulation' ? 'var(--surface-0)' : 'var(--surface-2)',
                  padding: 'var(--space-4)',
                  textAlign: 'left',
                  borderLeft: exportMode === 'simulation' ? '2px solid var(--accent-emerald)' : '2px solid transparent',
                  opacity: simulationEnabled ? 1 : 0.5,
                  cursor: simulationEnabled ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                }}
              >
                <p style={{
                  fontSize: '14px',
                  fontWeight: 600,
                  color: exportMode === 'simulation' ? 'var(--text-primary)' : 'var(--text-secondary)',
                  marginBottom: '4px'
                }}>
                  With Simulation
                </p>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {simulationEnabled ? 'Capture current state' : 'Start simulation first'}
                </p>
              </button>
            </div>
          </div>

          {/* Options Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
            {/* Content Options */}
            <div>
              <p style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 'var(--space-3)'
              }}>
                Content
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                {[
                  { checked: includeComments, onChange: setIncludeComments, label: 'Rung comments' },
                  { checked: includeExplanations, onChange: setIncludeExplanations, label: 'AI explanations' },
                  { checked: includeRawText, onChange: setIncludeRawText, label: 'Raw instruction text' },
                  { checked: includeLegend, onChange: setIncludeLegend, label: 'Legend / key' },
                  { checked: includePageNumbers, onChange: setIncludePageNumbers, label: 'Page numbers' },
                ].map((option, i) => (
                  <label
                    key={i}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      cursor: 'pointer',
                      padding: 'var(--space-1) 0',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={option.checked}
                      onChange={e => option.onChange(e.target.checked)}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: 'var(--accent-blue)',
                      }}
                    />
                    <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {option.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Page Setup */}
            <div>
              <p style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 'var(--space-3)'
              }}>
                Page Setup
              </p>

              {/* Page Size */}
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>Size</p>
                <div style={{ display: 'flex', gap: '1px', background: 'var(--border-subtle)' }}>
                  {(['letter', 'a4', 'legal'] as const).map(size => (
                    <button
                      key={size}
                      onClick={() => setPageSize(size)}
                      style={{
                        flex: 1,
                        padding: 'var(--space-2)',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: pageSize === size ? 'var(--surface-0)' : 'var(--surface-2)',
                        color: pageSize === size ? 'var(--text-primary)' : 'var(--text-muted)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {size.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Orientation */}
              <div style={{ marginBottom: 'var(--space-3)' }}>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>Orientation</p>
                <div style={{ display: 'flex', gap: '1px', background: 'var(--border-subtle)' }}>
                  {(['portrait', 'landscape'] as const).map(orient => (
                    <button
                      key={orient}
                      onClick={() => setOrientation(orient)}
                      style={{
                        flex: 1,
                        padding: 'var(--space-2)',
                        fontSize: '12px',
                        fontWeight: 500,
                        background: orientation === orient ? 'var(--surface-0)' : 'var(--surface-2)',
                        color: orientation === orient ? 'var(--text-primary)' : 'var(--text-muted)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {orient.charAt(0).toUpperCase() + orient.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Mode */}
              <div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: 'var(--space-1)' }}>Color</p>
                <div style={{ display: 'flex', gap: '1px', background: 'var(--border-subtle)' }}>
                  <button
                    onClick={() => setColorMode('color')}
                    style={{
                      flex: 1,
                      padding: 'var(--space-2)',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: colorMode === 'color' ? 'var(--surface-0)' : 'var(--surface-2)',
                      color: colorMode === 'color' ? 'var(--text-primary)' : 'var(--text-muted)',
                      transition: 'all 0.2s',
                    }}
                  >
                    Color
                  </button>
                  <button
                    onClick={() => setColorMode('blackWhite')}
                    style={{
                      flex: 1,
                      padding: 'var(--space-2)',
                      fontSize: '12px',
                      fontWeight: 500,
                      background: colorMode === 'blackWhite' ? 'var(--surface-0)' : 'var(--surface-2)',
                      color: colorMode === 'blackWhite' ? 'var(--text-primary)' : 'var(--text-muted)',
                      transition: 'all 0.2s',
                    }}
                  >
                    B&W
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* AI Explanations Info */}
          {includeExplanations && (
            <div
              style={{
                background: 'rgba(8, 145, 178, 0.05)',
                border: '1px solid rgba(8, 145, 178, 0.2)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <p style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--accent-blue)',
                marginBottom: 'var(--space-2)'
              }}>
                AI Explanations
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                {rungsWithExplanations} of {rungs.length} rungs have explanations.
                {rungsMissingExplanations > 0 && onGenerateAllExplanations && (
                  <> The remaining {rungsMissingExplanations} will be generated when you export.</>
                )}
              </p>
            </div>
          )}

          {/* Simulation Options (only when simulation mode selected) */}
          {exportMode === 'simulation' && (
            <div
              style={{
                background: 'rgba(34, 197, 94, 0.05)',
                border: '1px solid rgba(34, 197, 94, 0.2)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-4)',
              }}
            >
              <p style={{
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                color: 'var(--accent-emerald)',
                marginBottom: 'var(--space-3)'
              }}>
                Simulation Data
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>
                Export will capture current tag states, timer values, and power flow highlighting.
              </p>
              <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={includeWatchWindow}
                  onChange={e => setIncludeWatchWindow(e.target.checked)}
                  disabled={!watchWindowData || watchWindowData.length === 0}
                  style={{ width: '16px', height: '16px', accentColor: 'var(--accent-emerald)' }}
                />
                <span style={{
                  fontSize: '13px',
                  color: (!watchWindowData || watchWindowData.length === 0) ? 'var(--text-muted)' : 'var(--text-secondary)'
                }}>
                  Include watch window data
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between border-t flex-shrink-0"
          style={{
            borderColor: 'var(--border-subtle)',
            background: 'var(--surface-0)',
            padding: 'var(--space-4) var(--space-6)',
          }}
        >
          <button
            onClick={onClose}
            disabled={isGenerating}
            style={{
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-muted)',
              padding: 'var(--space-2) var(--space-3)',
              transition: 'color 0.2s',
              opacity: isGenerating ? 0.5 : 1,
            }}
            onMouseEnter={e => !isGenerating && (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
          >
            Cancel
          </button>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              onClick={() => handleExport('download')}
              disabled={isGenerating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                background: 'var(--surface-2)',
                border: '1px solid var(--border-default)',
                padding: 'var(--space-2) var(--space-4)',
                transition: 'all 0.2s',
                opacity: isGenerating ? 0.5 : 1,
              }}
              onMouseEnter={e => !isGenerating && (e.currentTarget.style.background = 'var(--surface-3)')}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-2)'}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              HTML
            </button>

            <button
              onClick={() => handleExport('print')}
              disabled={isGenerating}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                fontSize: '13px',
                fontWeight: 600,
                letterSpacing: '0.02em',
                textTransform: 'uppercase',
                color: '#000',
                background: '#fff',
                border: '1px solid #fff',
                padding: 'var(--space-2) var(--space-5)',
                transition: 'all 0.2s',
                opacity: isGenerating ? 0.5 : 1,
              }}
              onMouseEnter={e => {
                if (!isGenerating) {
                  e.currentTarget.style.background = 'var(--text-primary)'
                  e.currentTarget.style.borderColor = 'var(--text-primary)'
                }
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = '#fff'
                e.currentTarget.style.borderColor = '#fff'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="6 9 6 2 18 2 18 9" />
                <path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2" />
                <rect x="6" y="14" width="12" height="8" />
              </svg>
              Print
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PDFExportModal
