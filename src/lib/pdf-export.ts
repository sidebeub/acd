/**
 * PDF Export Utility
 *
 * Generates print-ready HTML content for ladder logic with simulation state
 */

import type { TimerState, CounterState } from '@/components/ladder/SimulationContext'

// Types
export interface Instruction {
  type: string
  operands: string[]
  branch_level?: number
  parallel_index?: number
  branchLeg?: number
  branchLevel?: number
  branchStart?: boolean
  is_input?: boolean
}

export interface Rung {
  id: string
  number: number
  comment: string | null
  rawText: string
  instructions: string | null
  explanation: string | null
}

export interface WatchEntry {
  tagName: string
  value: boolean | number | string
  description?: string
}

export interface TrendDataPoint {
  timestamp: number
  tagName: string
  value: number | boolean
}

export interface PDFExportOptions {
  // Export mode
  includeSimulationState: boolean

  // Content options
  includeComments: boolean
  includeRawText: boolean
  includeExplanations: boolean
  includeLegend: boolean
  includePageNumbers: boolean

  // Simulation data
  includeWatchWindow: boolean
  includeTrendChart: boolean
  watchWindowData?: WatchEntry[]
  trendData?: TrendDataPoint[]

  // Style options
  colorMode: 'color' | 'blackWhite'
  pageSize: 'letter' | 'a4' | 'legal'
  orientation: 'portrait' | 'landscape'

  // Metadata
  projectName: string
  routineName?: string
  programName?: string
  exportedBy?: string
}

export interface SimulationSnapshot {
  timestamp: Date
  tagStates: Record<string, boolean>
  timerStates: Record<string, TimerState>
  counterStates: Record<string, CounterState>
  numericValues: Record<string, number>
}

// Instruction styling configuration for print (exported for future black/white text mode)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const INSTRUCTION_PRINT_COLORS: Record<string, { color: string; bwSymbol: string }> = {
  // Input/Contacts
  XIC: { color: '#16a34a', bwSymbol: '[ ]' },
  XIO: { color: '#16a34a', bwSymbol: '[/]' },
  ONS: { color: '#16a34a', bwSymbol: '[OS]' },
  OSR: { color: '#16a34a', bwSymbol: '[OSR]' },
  OSF: { color: '#16a34a', bwSymbol: '[OSF]' },

  // Comparison
  EQU: { color: '#16a34a', bwSymbol: '[=]' },
  NEQ: { color: '#16a34a', bwSymbol: '[<>]' },
  LES: { color: '#16a34a', bwSymbol: '[<]' },
  LEQ: { color: '#16a34a', bwSymbol: '[<=]' },
  GRT: { color: '#16a34a', bwSymbol: '[>]' },
  GEQ: { color: '#16a34a', bwSymbol: '[>=]' },
  LIM: { color: '#16a34a', bwSymbol: '[LIM]' },
  CMP: { color: '#16a34a', bwSymbol: '[CMP]' },

  // Output/Coils
  OTE: { color: '#ca8a04', bwSymbol: '( )' },
  OTL: { color: '#ca8a04', bwSymbol: '(L)' },
  OTU: { color: '#ca8a04', bwSymbol: '(U)' },

  // Timers
  TON: { color: '#0891b2', bwSymbol: '[TON]' },
  TOF: { color: '#0891b2', bwSymbol: '[TOF]' },
  RTO: { color: '#0891b2', bwSymbol: '[RTO]' },

  // Counters
  CTU: { color: '#9333ea', bwSymbol: '[CTU]' },
  CTD: { color: '#9333ea', bwSymbol: '[CTD]' },
  RES: { color: '#9333ea', bwSymbol: '[RES]' },

  // Math
  ADD: { color: '#db2777', bwSymbol: '[ADD]' },
  SUB: { color: '#db2777', bwSymbol: '[SUB]' },
  MUL: { color: '#db2777', bwSymbol: '[MUL]' },
  DIV: { color: '#db2777', bwSymbol: '[DIV]' },
  MOV: { color: '#4f46e5', bwSymbol: '[MOV]' },

  // Program control
  JSR: { color: '#ea580c', bwSymbol: '[JSR]' },
  JMP: { color: '#ea580c', bwSymbol: '[JMP]' },
  LBL: { color: '#ea580c', bwSymbol: '[LBL]' },
}

/**
 * Get the display state for a tag
 */
export function getTagDisplayState(
  tagName: string,
  tagStates: Record<string, boolean>,
  timerStates: Record<string, TimerState>,
  counterStates: Record<string, CounterState>
): { state: 'on' | 'off' | 'unknown'; displayValue?: string } {
  // Handle timer/counter bits (e.g., Timer1.DN)
  const dotIndex = tagName.lastIndexOf('.')
  if (dotIndex > 0) {
    const baseTag = tagName.substring(0, dotIndex)
    const bit = tagName.substring(dotIndex + 1).toUpperCase()

    // Check timer bits
    if (timerStates[baseTag]) {
      const timer = timerStates[baseTag]
      if (bit === 'DN') return { state: timer.DN ? 'on' : 'off' }
      if (bit === 'EN') return { state: timer.EN ? 'on' : 'off' }
      if (bit === 'TT') return { state: timer.TT ? 'on' : 'off' }
    }

    // Check counter bits
    if (counterStates[baseTag]) {
      const counter = counterStates[baseTag]
      if (bit === 'DN') return { state: counter.DN ? 'on' : 'off' }
      if (bit === 'CU') return { state: counter.CU ? 'on' : 'off' }
      if (bit === 'CD') return { state: counter.CD ? 'on' : 'off' }
      if (bit === 'UN') return { state: counter.UN ? 'on' : 'off' }
      if (bit === 'OV') return { state: counter.OV ? 'on' : 'off' }
      if (bit === 'ACC') return { state: 'on', displayValue: String(counter.ACC) }
      if (bit === 'PRE') return { state: 'on', displayValue: String(counter.PRE) }
    }
  }

  // Check timer states for ACC/PRE
  if (timerStates[tagName]) {
    return { state: 'on', displayValue: `${(timerStates[tagName].ACC / 1000).toFixed(1)}s / ${(timerStates[tagName].PRE / 1000).toFixed(1)}s` }
  }

  // Check counter states
  if (counterStates[tagName]) {
    return { state: 'on', displayValue: `${counterStates[tagName].ACC} / ${counterStates[tagName].PRE}` }
  }

  // Check boolean tag state
  if (tagStates[tagName] !== undefined) {
    return { state: tagStates[tagName] ? 'on' : 'off' }
  }

  return { state: 'unknown' }
}

/**
 * Check if power flows through an instruction based on simulation state
 */
export function doesInstructionHavePower(
  inst: Instruction,
  tagStates: Record<string, boolean>,
  timerStates: Record<string, TimerState>,
  counterStates: Record<string, CounterState>,
  rungHasPower: boolean
): boolean {
  if (!rungHasPower) return false

  const type = inst.type.toUpperCase()
  const tagName = inst.operands[0]?.split('\u00A7')[0] || ''

  // XIC - passes when tag is ON
  if (type === 'XIC') {
    const state = getTagDisplayState(tagName, tagStates, timerStates, counterStates)
    return state.state === 'on'
  }

  // XIO - passes when tag is OFF
  if (type === 'XIO') {
    const state = getTagDisplayState(tagName, tagStates, timerStates, counterStates)
    return state.state === 'off' || state.state === 'unknown'
  }

  // Comparison and output instructions pass power through
  return true
}

/**
 * Generate a timestamp string for the export
 */
export function generateTimestamp(): string {
  const now = new Date()
  return now.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })
}

/**
 * Generate legend HTML for the PDF
 */
export function generateLegendHTML(options: PDFExportOptions): string {
  const isColor = options.colorMode === 'color'

  return `
    <div class="pdf-legend">
      <h3>Legend</h3>
      <div class="legend-grid">
        <div class="legend-section">
          <h4>Instruction Types</h4>
          <div class="legend-item">
            <span class="legend-color" style="background: ${isColor ? '#16a34a' : '#4b5563'}"></span>
            <span>Input / Contact (XIC, XIO, Compare)</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: ${isColor ? '#ca8a04' : '#6b7280'}"></span>
            <span>Output / Coil (OTE, OTL, OTU)</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: ${isColor ? '#0891b2' : '#9ca3af'}"></span>
            <span>Timer (TON, TOF, RTO)</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: ${isColor ? '#9333ea' : '#d1d5db'}"></span>
            <span>Counter (CTU, CTD, RES)</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: ${isColor ? '#db2777' : '#e5e7eb'}"></span>
            <span>Math (ADD, SUB, MUL, DIV, MOV)</span>
          </div>
          <div class="legend-item">
            <span class="legend-color" style="background: ${isColor ? '#ea580c' : '#f3f4f6'}"></span>
            <span>Program Control (JSR, JMP, LBL)</span>
          </div>
        </div>
        ${options.includeSimulationState ? `
        <div class="legend-section">
          <h4>Simulation State</h4>
          <div class="legend-item">
            <span class="legend-indicator state-on">1</span>
            <span>Tag is ON / Energized</span>
          </div>
          <div class="legend-item">
            <span class="legend-indicator state-off">0</span>
            <span>Tag is OFF / De-energized</span>
          </div>
          <div class="legend-item">
            <span class="legend-wire wire-energized"></span>
            <span>Power Flow (Wire Energized)</span>
          </div>
          <div class="legend-item">
            <span class="legend-wire wire-off"></span>
            <span>No Power Flow</span>
          </div>
        </div>
        ` : ''}
      </div>
    </div>
  `
}

/**
 * Generate watch window HTML for the PDF
 */
export function generateWatchWindowHTML(watchData: WatchEntry[]): string {
  if (!watchData || watchData.length === 0) return ''

  return `
    <div class="pdf-watch-window">
      <h3>Watch Window</h3>
      <table class="watch-table">
        <thead>
          <tr>
            <th>Tag Name</th>
            <th>Value</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          ${watchData.map(entry => `
            <tr>
              <td class="tag-name">${escapeHtml(entry.tagName)}</td>
              <td class="tag-value ${typeof entry.value === 'boolean' ? (entry.value ? 'value-on' : 'value-off') : ''}">${
                typeof entry.value === 'boolean'
                  ? (entry.value ? 'ON (1)' : 'OFF (0)')
                  : entry.value
              }</td>
              <td class="tag-desc">${escapeHtml(entry.description || '')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `
}

/**
 * Generate the simulation snapshot header
 */
export function generateSimulationSnapshotHeader(snapshot: SimulationSnapshot): string {
  const timestamp = snapshot.timestamp.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  })

  const onCount = Object.values(snapshot.tagStates).filter(v => v).length
  const totalTags = Object.keys(snapshot.tagStates).length
  const activeTimers = Object.values(snapshot.timerStates).filter(t => t.EN || t.TT).length
  const activeCounters = Object.values(snapshot.counterStates).filter(c => c.CU || c.CD).length

  return `
    <div class="simulation-snapshot-header">
      <div class="snapshot-banner">
        <span class="snapshot-icon">&#9889;</span>
        <span class="snapshot-title">SIMULATION SNAPSHOT</span>
      </div>
      <div class="snapshot-meta">
        <span class="snapshot-timestamp">Captured: ${timestamp}</span>
        <span class="snapshot-stats">
          Tags: ${onCount}/${totalTags} ON |
          Timers Active: ${activeTimers} |
          Counters Active: ${activeCounters}
        </span>
      </div>
    </div>
  `
}

/**
 * Generate CSS for PDF export
 */
export function generatePDFStyles(options: PDFExportOptions): string {
  const isColor = options.colorMode === 'color'
  const pageSize = options.pageSize
  const orientation = options.orientation

  return `
    @page {
      size: ${pageSize} ${orientation};
      margin: 0.75in;
    }

    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    body {
      font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #111827;
      background: white;
      margin: 0;
      padding: 0;
    }

    .pdf-container {
      width: 100%;
    }

    /* Header */
    .pdf-header {
      padding: 16pt 0;
      border-bottom: 2pt solid #111827;
      margin-bottom: 16pt;
    }

    .pdf-header h1 {
      font-size: 18pt;
      font-weight: 700;
      margin: 0 0 8pt 0;
      color: #111827;
    }

    .pdf-header-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8pt 16pt;
      font-size: 9pt;
      color: #6b7280;
    }

    .pdf-header-meta span {
      white-space: nowrap;
    }

    /* Simulation Snapshot Header */
    .simulation-snapshot-header {
      background: ${isColor ? '#fef3c7' : '#f3f4f6'};
      border: 2pt solid ${isColor ? '#f59e0b' : '#9ca3af'};
      border-radius: 4pt;
      padding: 12pt;
      margin-bottom: 16pt;
    }

    .snapshot-banner {
      display: flex;
      align-items: center;
      gap: 8pt;
      font-size: 14pt;
      font-weight: 700;
      color: ${isColor ? '#b45309' : '#374151'};
      margin-bottom: 8pt;
    }

    .snapshot-icon {
      font-size: 16pt;
    }

    .snapshot-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8pt 24pt;
      font-size: 9pt;
      color: #6b7280;
    }

    /* Rung styles */
    .pdf-rung {
      page-break-inside: avoid;
      margin-bottom: 12pt;
      border: 1pt solid #d1d5db;
      border-radius: 4pt;
      background: white;
    }

    .pdf-rung.rung-energized {
      border-color: ${isColor ? '#16a34a' : '#6b7280'};
      border-width: 2pt;
    }

    .rung-header {
      display: flex;
      align-items: center;
      gap: 8pt;
      padding: 6pt 10pt;
      background: #f9fafb;
      border-bottom: 1pt solid #e5e7eb;
      border-radius: 4pt 4pt 0 0;
    }

    .rung-number {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 10pt;
      font-weight: 700;
      color: #374151;
      background: white;
      padding: 2pt 6pt;
      border-radius: 2pt;
      border: 1pt solid #d1d5db;
    }

    .rung-number.energized {
      background: ${isColor ? '#dcfce7' : '#f3f4f6'};
      border-color: ${isColor ? '#16a34a' : '#9ca3af'};
      color: ${isColor ? '#166534' : '#374151'};
    }

    .rung-comment {
      flex: 1;
      font-size: 9pt;
      color: #6b7280;
      font-style: italic;
    }

    .rung-content {
      padding: 10pt;
    }

    /* Ladder diagram */
    .ladder-diagram {
      display: flex;
      align-items: stretch;
      gap: 0;
      min-height: 40pt;
    }

    .power-rail {
      width: 3pt;
      background: ${isColor ? '#6b7280' : '#374151'};
      flex-shrink: 0;
    }

    .power-rail.energized {
      background: ${isColor ? '#16a34a' : '#374151'};
    }

    .ladder-path {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      flex: 1;
      padding: 8pt 4pt;
      gap: 4pt;
    }

    .wire {
      width: 12pt;
      height: 2pt;
      background: #9ca3af;
      flex-shrink: 0;
    }

    .wire.energized {
      background: ${isColor ? '#16a34a' : '#374151'};
      height: 3pt;
    }

    /* Instructions */
    .instruction {
      display: inline-flex;
      flex-direction: column;
      align-items: center;
      padding: 4pt 8pt;
      border: 1pt solid #d1d5db;
      border-radius: 3pt;
      background: white;
      position: relative;
      min-width: 60pt;
    }

    .instruction.energized {
      border-width: 2pt;
    }

    .instruction.input {
      border-color: ${isColor ? '#16a34a' : '#6b7280'};
      background: ${isColor ? '#f0fdf4' : '#f9fafb'};
    }

    .instruction.output {
      border-color: ${isColor ? '#ca8a04' : '#6b7280'};
      background: ${isColor ? '#fefce8' : '#f9fafb'};
    }

    .instruction.timer {
      border-color: ${isColor ? '#0891b2' : '#6b7280'};
      background: ${isColor ? '#ecfeff' : '#f9fafb'};
    }

    .instruction.counter {
      border-color: ${isColor ? '#9333ea' : '#6b7280'};
      background: ${isColor ? '#faf5ff' : '#f9fafb'};
    }

    .instruction.math {
      border-color: ${isColor ? '#db2777' : '#6b7280'};
      background: ${isColor ? '#fdf2f8' : '#f9fafb'};
    }

    .instruction.jump {
      border-color: ${isColor ? '#ea580c' : '#6b7280'};
      background: ${isColor ? '#fff7ed' : '#f9fafb'};
    }

    .inst-type {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 9pt;
      font-weight: 700;
    }

    .inst-operand {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 8pt;
      color: #374151;
      max-width: 80pt;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    /* State badge */
    .state-badge {
      position: absolute;
      top: -8pt;
      right: -8pt;
      width: 16pt;
      height: 16pt;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 10pt;
      font-weight: 700;
      color: white;
      border: 1pt solid white;
    }

    .state-badge.on {
      background: ${isColor ? '#16a34a' : '#374151'};
    }

    .state-badge.off {
      background: ${isColor ? '#dc2626' : '#9ca3af'};
    }

    /* Timer/Counter values */
    .timer-values, .counter-values {
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 8pt;
      color: #6b7280;
      margin-top: 2pt;
      padding: 2pt 4pt;
      background: #f3f4f6;
      border-radius: 2pt;
    }

    .timer-bits, .counter-bits {
      display: flex;
      gap: 4pt;
      font-size: 7pt;
      margin-top: 2pt;
    }

    .bit-on {
      color: ${isColor ? '#16a34a' : '#374151'};
      font-weight: 700;
    }

    .bit-off {
      color: #9ca3af;
    }

    /* Raw text */
    .rung-raw-text {
      margin-top: 8pt;
      padding: 6pt;
      background: #f9fafb;
      border: 1pt solid #e5e7eb;
      border-radius: 2pt;
      font-family: 'Consolas', 'Monaco', monospace;
      font-size: 8pt;
      color: #374151;
      white-space: pre-wrap;
      word-wrap: break-word;
    }

    /* AI Explanation */
    .rung-explanation {
      margin-top: 10pt;
      padding: 10pt 12pt;
      background: ${isColor ? '#f0f9ff' : '#f9fafb'};
      border-left: 3pt solid ${isColor ? '#0891b2' : '#6b7280'};
      font-size: 9pt;
      line-height: 1.5;
      color: #374151;
    }

    .rung-explanation-label {
      display: block;
      font-size: 8pt;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${isColor ? '#0891b2' : '#6b7280'};
      margin-bottom: 4pt;
    }

    .rung-explanation p {
      margin: 0;
    }

    /* Legend */
    .pdf-legend {
      page-break-inside: avoid;
      margin-top: 24pt;
      padding: 12pt;
      border: 1pt solid #d1d5db;
      border-radius: 4pt;
      background: #f9fafb;
    }

    .pdf-legend h3 {
      font-size: 11pt;
      font-weight: 700;
      margin: 0 0 12pt 0;
      color: #111827;
      border-bottom: 1pt solid #e5e7eb;
      padding-bottom: 6pt;
    }

    .legend-grid {
      display: flex;
      gap: 24pt;
      flex-wrap: wrap;
    }

    .legend-section {
      flex: 1;
      min-width: 200pt;
    }

    .legend-section h4 {
      font-size: 9pt;
      font-weight: 600;
      color: #374151;
      margin: 0 0 8pt 0;
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 8pt;
      font-size: 8pt;
      color: #6b7280;
      margin-bottom: 4pt;
    }

    .legend-color {
      width: 12pt;
      height: 12pt;
      border-radius: 2pt;
      flex-shrink: 0;
    }

    .legend-indicator {
      width: 14pt;
      height: 14pt;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8pt;
      font-weight: 700;
      color: white;
      flex-shrink: 0;
    }

    .legend-indicator.state-on {
      background: ${isColor ? '#16a34a' : '#374151'};
    }

    .legend-indicator.state-off {
      background: ${isColor ? '#dc2626' : '#9ca3af'};
    }

    .legend-wire {
      width: 20pt;
      height: 3pt;
      flex-shrink: 0;
    }

    .legend-wire.wire-energized {
      background: ${isColor ? '#16a34a' : '#374151'};
    }

    .legend-wire.wire-off {
      background: #9ca3af;
    }

    /* Watch Window */
    .pdf-watch-window {
      page-break-inside: avoid;
      margin-top: 16pt;
      padding: 12pt;
      border: 1pt solid #d1d5db;
      border-radius: 4pt;
      background: white;
    }

    .pdf-watch-window h3 {
      font-size: 11pt;
      font-weight: 700;
      margin: 0 0 12pt 0;
      color: #111827;
    }

    .watch-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 9pt;
    }

    .watch-table th {
      text-align: left;
      padding: 6pt 8pt;
      background: #f3f4f6;
      border: 1pt solid #e5e7eb;
      font-weight: 600;
      color: #374151;
    }

    .watch-table td {
      padding: 4pt 8pt;
      border: 1pt solid #e5e7eb;
    }

    .watch-table .tag-name {
      font-family: 'Consolas', 'Monaco', monospace;
      font-weight: 500;
    }

    .watch-table .tag-value {
      font-family: 'Consolas', 'Monaco', monospace;
    }

    .watch-table .value-on {
      color: ${isColor ? '#16a34a' : '#374151'};
      font-weight: 700;
    }

    .watch-table .value-off {
      color: ${isColor ? '#dc2626' : '#6b7280'};
    }

    .watch-table .tag-desc {
      color: #6b7280;
      font-style: italic;
    }

    /* Page numbers */
    .pdf-footer {
      position: fixed;
      bottom: 0.5in;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 8pt;
      color: #9ca3af;
    }

    @page {
      @bottom-center {
        content: counter(page) " of " counter(pages);
      }
    }
  `
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

/**
 * Get instruction category for styling
 */
function getInstructionCategory(type: string): string {
  const upperType = type.toUpperCase()
  if (['XIC', 'XIO', 'ONS', 'OSR', 'OSF', 'EQU', 'NEQ', 'LES', 'LEQ', 'GRT', 'GEQ', 'LIM', 'CMP'].includes(upperType)) {
    return 'input'
  }
  if (['OTE', 'OTL', 'OTU'].includes(upperType)) {
    return 'output'
  }
  if (['TON', 'TOF', 'RTO', 'TONR', 'TOFR'].includes(upperType)) {
    return 'timer'
  }
  if (['CTU', 'CTD', 'CTUD', 'RES'].includes(upperType)) {
    return 'counter'
  }
  if (['ADD', 'SUB', 'MUL', 'DIV', 'MOD', 'MOV', 'CPT', 'NEG', 'ABS'].includes(upperType)) {
    return 'math'
  }
  if (['JSR', 'JMP', 'LBL', 'RET', 'SBR', 'FOR', 'NXT', 'BRK'].includes(upperType)) {
    return 'jump'
  }
  return 'other'
}

/**
 * Generate HTML for a single instruction with simulation state
 */
export function generateInstructionHTML(
  inst: Instruction,
  options: PDFExportOptions,
  simulationSnapshot?: SimulationSnapshot
): string {
  const type = inst.type.toUpperCase()
  const category = getInstructionCategory(type)
  const tagName = inst.operands[0]?.split('\u00A7')[0] || ''

  let stateHtml = ''
  let timerCounterHtml = ''
  let isEnergized = false

  if (options.includeSimulationState && simulationSnapshot) {
    const { tagStates, timerStates, counterStates } = simulationSnapshot

    // Get tag state
    const tagState = getTagDisplayState(tagName, tagStates, timerStates, counterStates)

    // Determine if contact/coil instructions should show state badge
    if (['XIC', 'XIO', 'OTE', 'OTL', 'OTU'].includes(type)) {
      const stateLabel = tagState.state === 'on' ? '1' : '0'
      const stateClass = tagState.state === 'on' ? 'on' : 'off'
      stateHtml = `<span class="state-badge ${stateClass}">${stateLabel}</span>`

      // XIC energized when ON, XIO energized when OFF
      if (type === 'XIC') isEnergized = tagState.state === 'on'
      else if (type === 'XIO') isEnergized = tagState.state === 'off'
      else isEnergized = tagState.state === 'on' // Coils
    }

    // Timer display
    if (['TON', 'TOF', 'RTO'].includes(type) && timerStates[tagName]) {
      const timer = timerStates[tagName]
      timerCounterHtml = `
        <div class="timer-values">${(timer.ACC / 1000).toFixed(1)}s / ${(timer.PRE / 1000).toFixed(1)}s</div>
        <div class="timer-bits">
          <span class="${timer.EN ? 'bit-on' : 'bit-off'}">EN</span>
          <span class="${timer.TT ? 'bit-on' : 'bit-off'}">TT</span>
          <span class="${timer.DN ? 'bit-on' : 'bit-off'}">DN</span>
        </div>
      `
      isEnergized = timer.EN
    }

    // Counter display
    if (['CTU', 'CTD', 'CTUD'].includes(type) && counterStates[tagName]) {
      const counter = counterStates[tagName]
      timerCounterHtml = `
        <div class="counter-values">${counter.ACC} / ${counter.PRE}</div>
        <div class="counter-bits">
          <span class="${counter.CU ? 'bit-on' : 'bit-off'}">CU</span>
          <span class="${counter.CD ? 'bit-on' : 'bit-off'}">CD</span>
          <span class="${counter.DN ? 'bit-on' : 'bit-off'}">DN</span>
        </div>
      `
      isEnergized = counter.CU || counter.CD
    }
  }

  const operandsHtml = inst.operands.map(op => {
    const cleanOp = op.includes('\u00A7') ? op.split('\u00A7')[0] : op
    return `<span class="inst-operand">${escapeHtml(cleanOp)}</span>`
  }).join('')

  return `
    <div class="instruction ${category}${isEnergized ? ' energized' : ''}">
      ${stateHtml}
      <span class="inst-type">${type}</span>
      ${operandsHtml}
      ${timerCounterHtml}
    </div>
  `
}

/**
 * Generate HTML for a complete rung with simulation state
 */
export function generateRungHTML(
  rung: Rung,
  options: PDFExportOptions,
  simulationSnapshot?: SimulationSnapshot
): string {
  let instructions: Instruction[] = []
  try {
    if (rung.instructions) {
      instructions = JSON.parse(rung.instructions)
    }
  } catch (e) {
    console.error('Failed to parse instructions:', e)
  }

  // Determine if rung has power (simplified: check if all input conditions pass)
  let rungEnergized = false
  if (options.includeSimulationState && simulationSnapshot && instructions.length > 0) {
    // Simplified: assume rung is energized if it has instructions
    // In a real implementation, this would calculate full power flow
    rungEnergized = true
    for (const inst of instructions) {
      const type = inst.type.toUpperCase()
      if (['XIC', 'XIO'].includes(type)) {
        const tagName = inst.operands[0]?.split('\u00A7')[0] || ''
        const state = getTagDisplayState(
          tagName,
          simulationSnapshot.tagStates,
          simulationSnapshot.timerStates,
          simulationSnapshot.counterStates
        )
        if (type === 'XIC' && state.state !== 'on') rungEnergized = false
        if (type === 'XIO' && state.state !== 'off' && state.state !== 'unknown') rungEnergized = false
      }
    }
  }

  // Generate instruction HTML
  const instructionsHtml = instructions.map(inst =>
    `<span class="wire${rungEnergized ? ' energized' : ''}"></span>` +
    generateInstructionHTML(inst, options, simulationSnapshot)
  ).join('')

  return `
    <div class="pdf-rung${rungEnergized ? ' rung-energized' : ''}">
      <div class="rung-header">
        <span class="rung-number${rungEnergized ? ' energized' : ''}">${rung.number}</span>
        ${options.includeComments && rung.comment ? `<span class="rung-comment">${escapeHtml(rung.comment)}</span>` : ''}
      </div>
      <div class="rung-content">
        <div class="ladder-diagram">
          <div class="power-rail${rungEnergized ? ' energized' : ''}"></div>
          <div class="ladder-path">
            ${instructionsHtml}
            <span class="wire${rungEnergized ? ' energized' : ''}"></span>
          </div>
          <div class="power-rail${rungEnergized ? ' energized' : ''}"></div>
        </div>
        ${options.includeRawText ? `<div class="rung-raw-text">${escapeHtml(rung.rawText)}</div>` : ''}
        ${options.includeExplanations && rung.explanation ? `
          <div class="rung-explanation">
            <span class="rung-explanation-label">AI Explanation</span>
            <p>${escapeHtml(rung.explanation)}</p>
          </div>
        ` : ''}
      </div>
    </div>
  `
}

/**
 * Generate full PDF HTML document
 */
export function generatePDFDocument(
  rungs: Rung[],
  options: PDFExportOptions,
  simulationSnapshot?: SimulationSnapshot
): string {
  const styles = generatePDFStyles(options)
  const timestamp = generateTimestamp()

  // Header
  const headerHtml = `
    <div class="pdf-header">
      <h1>${escapeHtml(options.projectName)}</h1>
      <div class="pdf-header-meta">
        ${options.programName ? `<span>Program: ${escapeHtml(options.programName)}</span>` : ''}
        ${options.routineName ? `<span>Routine: ${escapeHtml(options.routineName)}</span>` : ''}
        <span>Rungs: ${rungs.length}</span>
        <span>Generated: ${timestamp}</span>
        ${options.exportedBy ? `<span>By: ${escapeHtml(options.exportedBy)}</span>` : ''}
      </div>
    </div>
  `

  // Simulation snapshot header
  const snapshotHeaderHtml = options.includeSimulationState && simulationSnapshot
    ? generateSimulationSnapshotHeader(simulationSnapshot)
    : ''

  // Rungs
  const rungsHtml = rungs.map(rung =>
    generateRungHTML(rung, options, simulationSnapshot)
  ).join('')

  // Watch window
  const watchWindowHtml = options.includeWatchWindow && options.watchWindowData
    ? generateWatchWindowHTML(options.watchWindowData)
    : ''

  // Legend
  const legendHtml = options.includeLegend
    ? generateLegendHTML(options)
    : ''

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${escapeHtml(options.projectName)} - Ladder Logic Export</title>
      <style>${styles}</style>
    </head>
    <body>
      <div class="pdf-container">
        ${headerHtml}
        ${snapshotHeaderHtml}
        ${rungsHtml}
        ${watchWindowHtml}
        ${legendHtml}
      </div>
    </body>
    </html>
  `
}

/**
 * Open PDF export in a new window for printing
 */
export function openPDFExportWindow(
  rungs: Rung[],
  options: PDFExportOptions,
  simulationSnapshot?: SimulationSnapshot
): void {
  const html = generatePDFDocument(rungs, options, simulationSnapshot)

  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()

    // Wait for content to load then trigger print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print()
      }, 250)
    }
  }
}

/**
 * Download PDF export as HTML file (for later PDF conversion)
 */
export function downloadPDFExportHTML(
  rungs: Rung[],
  options: PDFExportOptions,
  simulationSnapshot?: SimulationSnapshot
): void {
  const html = generatePDFDocument(rungs, options, simulationSnapshot)

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  const filename = `${options.projectName.replace(/[^a-zA-Z0-9_-]/g, '_')}_${
    options.routineName ? options.routineName.replace(/[^a-zA-Z0-9_-]/g, '_') + '_' : ''
  }${options.includeSimulationState ? 'SimSnapshot_' : ''}${
    new Date().toISOString().split('T')[0]
  }.html`

  link.href = url
  link.download = filename
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
