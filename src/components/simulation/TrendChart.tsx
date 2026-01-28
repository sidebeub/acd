'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { useSimulation, TrendPoint } from '../ladder/SimulationContext'

// ================================================
// Types
// ================================================

interface TrendChartProps {
  availableTags: string[]
  onClose: () => void
}

// Chart colors for different tags
const CHART_COLORS = [
  '#22c55e', // green
  '#3b82f6', // blue
  '#f59e0b', // amber
  '#ef4444', // red
  '#a855f7', // purple
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#f97316', // orange
  '#84cc16', // lime
  '#6366f1', // indigo
]

// Time range options
const TIME_RANGES = [
  { label: '10s', seconds: 10 },
  { label: '30s', seconds: 30 },
  { label: '1min', seconds: 60 },
  { label: 'All', seconds: -1 },
]

// ================================================
// Icons
// ================================================

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconPlay = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5,3 19,12 5,21" />
  </svg>
)

const IconPause = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
)

const IconTrash = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
)

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconMinus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconChart = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 3v18h18" />
    <path d="M18 9l-5 5-4-4-6 6" />
  </svg>
)

// ================================================
// TrendChart Component
// ================================================

export function TrendChart({ availableTags, onClose }: TrendChartProps) {
  const { trendData, trendTags, addTrendTag, removeTrendTag, clearTrendData, trendRecording, setTrendRecording } = useSimulation()

  const [selectedTimeRange, setSelectedTimeRange] = useState(1) // Default to 30s
  const [tagSearchQuery, setTagSearchQuery] = useState('')
  const [showTagSelector, setShowTagSelector] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const chartRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [chartSize, setChartSize] = useState({ width: 600, height: 300 })

  // Check for mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 640)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Update chart size based on container with ResizeObserver
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setChartSize({
          width: Math.max(280, rect.width - 32),
          height: Math.max(200, isMobile ? 240 : Math.min(400, rect.height - 20))
        })
      }
    }

    // Initial size
    updateSize()

    // Use ResizeObserver for container queries
    const observer = new ResizeObserver(updateSize)
    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [isMobile])

  // Filter available tags based on search
  const filteredTags = useMemo(() => {
    if (!tagSearchQuery) return availableTags.slice(0, 50) // Limit initial display
    const query = tagSearchQuery.toLowerCase()
    return availableTags
      .filter(tag => tag.toLowerCase().includes(query))
      .slice(0, 50)
  }, [availableTags, tagSearchQuery])

  // Get current time range in seconds
  const timeRangeSeconds = TIME_RANGES[selectedTimeRange].seconds

  // Calculate chart bounds
  const chartBounds = useMemo(() => {
    const padding = { top: 20, right: 20, bottom: 40, left: 60 }
    return {
      ...padding,
      chartWidth: chartSize.width - padding.left - padding.right,
      chartHeight: chartSize.height - padding.top - padding.bottom
    }
  }, [chartSize])

  // Process trend data for visualization
  const processedData = useMemo(() => {
    if (trendTags.length === 0) return { series: [], timeMin: 0, timeMax: 10, valueMin: 0, valueMax: 1 }

    const now = trendData && Object.values(trendData)[0]?.length > 0
      ? Math.max(...Object.values(trendData).flatMap(d => d.map(p => p.time)))
      : 0

    let timeMin = 0
    let timeMax = now || 10

    if (timeRangeSeconds > 0 && now > 0) {
      timeMin = Math.max(0, now - timeRangeSeconds)
      timeMax = now
    }

    // Find value range across all visible data
    let valueMin = 0
    let valueMax = 1 // Default for boolean

    const series = trendTags.map((tagName, idx) => {
      const data = trendData[tagName] || []
      const visibleData = timeRangeSeconds > 0
        ? data.filter(p => p.time >= timeMin && p.time <= timeMax)
        : data

      visibleData.forEach(p => {
        valueMin = Math.min(valueMin, p.value)
        valueMax = Math.max(valueMax, p.value)
      })

      return {
        tagName,
        color: CHART_COLORS[idx % CHART_COLORS.length],
        data: visibleData
      }
    })

    // Add some padding to value range
    const valueRange = valueMax - valueMin
    if (valueRange > 0) {
      valueMin = valueMin - valueRange * 0.1
      valueMax = valueMax + valueRange * 0.1
    } else {
      valueMin = -0.5
      valueMax = 1.5
    }

    return { series, timeMin, timeMax, valueMin, valueMax }
  }, [trendData, trendTags, timeRangeSeconds])

  // Convert data point to SVG coordinates
  const toSvgCoords = useCallback((time: number, value: number) => {
    const { timeMin, timeMax, valueMin, valueMax } = processedData
    const { left, top, chartWidth, chartHeight } = chartBounds

    const x = left + ((time - timeMin) / (timeMax - timeMin || 1)) * chartWidth
    const y = top + chartHeight - ((value - valueMin) / (valueMax - valueMin || 1)) * chartHeight

    return { x, y }
  }, [processedData, chartBounds])

  // Generate SVG path for a data series
  const generatePath = useCallback((data: TrendPoint[]) => {
    if (data.length === 0) return ''
    if (data.length === 1) {
      const { x, y } = toSvgCoords(data[0].time, data[0].value)
      return `M ${x} ${y} L ${x + 1} ${y}`
    }

    return data.map((point, idx) => {
      const { x, y } = toSvgCoords(point.time, point.value)
      return idx === 0 ? `M ${x} ${y}` : `L ${x} ${y}`
    }).join(' ')
  }, [toSvgCoords])

  // Generate grid lines
  const gridLines = useMemo(() => {
    const { left, top, chartWidth, chartHeight } = chartBounds
    const { timeMin, timeMax, valueMin, valueMax } = processedData

    const horizontalLines: { y: number; label: string }[] = []
    const verticalLines: { x: number; label: string }[] = []

    // Horizontal grid lines (value axis)
    const valueStep = (valueMax - valueMin) / 5
    for (let i = 0; i <= 5; i++) {
      const value = valueMin + i * valueStep
      const y = top + chartHeight - (i / 5) * chartHeight
      horizontalLines.push({ y, label: value.toFixed(1) })
    }

    // Vertical grid lines (time axis)
    const timeStep = (timeMax - timeMin) / 5
    for (let i = 0; i <= 5; i++) {
      const time = timeMin + i * timeStep
      const x = left + (i / 5) * chartWidth
      verticalLines.push({ x, label: time.toFixed(1) + 's' })
    }

    return { horizontalLines, verticalLines }
  }, [chartBounds, processedData])

  // Handle tag selection
  const handleAddTag = useCallback((tagName: string) => {
    addTrendTag(tagName)
    setShowTagSelector(false)
    setTagSearchQuery('')
  }, [addTrendTag])

  const handleRemoveTag = useCallback((tagName: string) => {
    removeTrendTag(tagName)
  }, [removeTrendTag])

  return (
    <div
      className="trend-chart-overlay safe-area-inset"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="trend-chart-title"
    >
      <div className="trend-chart-container container-inline">
        {/* Header */}
        <div className="trend-chart-header">
          <div className="trend-chart-title-group">
            <IconChart />
            <span id="trend-chart-title" className="trend-chart-title">
              Trend Chart
            </span>
            {trendRecording && (
              <span className="trend-recording-badge">
                <span className="trend-recording-dot" />
                Recording
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="trend-chart-close touch-target"
            aria-label="Close trend chart"
          >
            <IconClose />
          </button>
        </div>

        {/* Controls - responsive layout */}
        <div className="trend-chart-controls">
          {/* Recording toggle */}
          <button
            onClick={() => setTrendRecording(!trendRecording)}
            className={`trend-control-btn touch-target ${trendRecording ? 'recording' : 'paused'}`}
            aria-pressed={trendRecording}
          >
            {trendRecording ? <IconPause /> : <IconPlay />}
            <span className="hide-mobile">{trendRecording ? 'Pause' : 'Record'}</span>
          </button>

          {/* Clear button */}
          <button
            onClick={clearTrendData}
            className="trend-control-btn trend-control-secondary touch-target"
            aria-label="Clear trend data"
          >
            <IconTrash />
            <span className="hide-mobile">Clear</span>
          </button>

          {/* Time range selector */}
          <div className="trend-time-range">
            <span className="trend-time-label hide-mobile">Range:</span>
            <div className="trend-time-buttons">
              {TIME_RANGES.map((range, idx) => (
                <button
                  key={range.label}
                  onClick={() => setSelectedTimeRange(idx)}
                  className={`trend-time-btn touch-target ${selectedTimeRange === idx ? 'active' : ''}`}
                  aria-pressed={selectedTimeRange === idx}
                >
                  {range.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tag selector - responsive */}
        <div className="trend-tag-bar">
          {/* Current tags - scrollable on mobile */}
          <div className="trend-tag-list">
            {trendTags.map((tagName, idx) => (
              <span
                key={tagName}
                className="trend-tag-pill"
                style={{
                  borderColor: CHART_COLORS[idx % CHART_COLORS.length]
                }}
              >
                <span
                  className="trend-tag-dot"
                  style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
                />
                <span className="trend-tag-name">{tagName}</span>
                <button
                  onClick={() => handleRemoveTag(tagName)}
                  className="trend-tag-remove touch-target"
                  aria-label={`Remove ${tagName}`}
                >
                  <IconMinus />
                </button>
              </span>
            ))}
          </div>

          {/* Add tag button */}
          <div className="trend-add-tag-container">
            <button
              onClick={() => setShowTagSelector(!showTagSelector)}
              className="trend-add-tag-btn touch-target"
              aria-expanded={showTagSelector}
              aria-haspopup="listbox"
            >
              <IconPlus />
              <span>Add Tag</span>
            </button>

            {/* Tag selector dropdown */}
            {showTagSelector && (
              <div className="trend-tag-dropdown" role="listbox">
                <div className="trend-tag-search">
                  <input
                    type="text"
                    value={tagSearchQuery}
                    onChange={e => setTagSearchQuery(e.target.value)}
                    placeholder="Search tags..."
                    autoFocus
                    className="trend-tag-search-input touch-target-height"
                  />
                </div>
                <div className="trend-tag-options">
                  {filteredTags
                    .filter(tag => !trendTags.includes(tag))
                    .map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleAddTag(tag)}
                        className="trend-tag-option touch-target-height"
                        role="option"
                      >
                        {tag}
                      </button>
                    ))}
                  {filteredTags.filter(tag => !trendTags.includes(tag)).length === 0 && (
                    <div className="trend-tag-empty">
                      No matching tags
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart area - responsive */}
        <div ref={containerRef} className="trend-chart-area">
          {trendTags.length === 0 ? (
            <div className="trend-chart-empty">
              <IconChart />
              <span>Add tags to start trending</span>
            </div>
          ) : (
            <svg
              ref={chartRef}
              width={chartSize.width}
              height={chartSize.height}
              className="trend-chart-svg"
              role="img"
              aria-label="Trend chart visualization"
            >
              {/* Background */}
              <rect
                x={chartBounds.left}
                y={chartBounds.top}
                width={chartBounds.chartWidth}
                height={chartBounds.chartHeight}
                fill="var(--surface-0)"
                stroke="var(--border-subtle)"
                strokeWidth="1"
              />

              {/* Horizontal grid lines */}
              {gridLines.horizontalLines.map((line, idx) => (
                <g key={`h-${idx}`}>
                  <line
                    x1={chartBounds.left}
                    y1={line.y}
                    x2={chartBounds.left + chartBounds.chartWidth}
                    y2={line.y}
                    stroke="var(--border-subtle)"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={chartBounds.left - 8}
                    y={line.y}
                    textAnchor="end"
                    alignmentBaseline="middle"
                    fontSize={isMobile ? '9' : '10'}
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                  >
                    {line.label}
                  </text>
                </g>
              ))}

              {/* Vertical grid lines */}
              {gridLines.verticalLines.map((line, idx) => (
                <g key={`v-${idx}`}>
                  <line
                    x1={line.x}
                    y1={chartBounds.top}
                    x2={line.x}
                    y2={chartBounds.top + chartBounds.chartHeight}
                    stroke="var(--border-subtle)"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                  />
                  <text
                    x={line.x}
                    y={chartBounds.top + chartBounds.chartHeight + 16}
                    textAnchor="middle"
                    fontSize={isMobile ? '9' : '10'}
                    fill="var(--text-muted)"
                    fontFamily="var(--font-mono)"
                  >
                    {line.label}
                  </text>
                </g>
              ))}

              {/* Data lines */}
              {processedData.series.map((series) => (
                <path
                  key={series.tagName}
                  d={generatePath(series.data)}
                  fill="none"
                  stroke={series.color}
                  strokeWidth={isMobile ? 1.5 : 2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Axis labels - hide on very small screens */}
              {!isMobile && (
                <>
                  <text
                    x={chartBounds.left + chartBounds.chartWidth / 2}
                    y={chartSize.height - 5}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--text-secondary)"
                  >
                    Time (seconds)
                  </text>
                  <text
                    x={15}
                    y={chartBounds.top + chartBounds.chartHeight / 2}
                    textAnchor="middle"
                    fontSize="11"
                    fill="var(--text-secondary)"
                    transform={`rotate(-90, 15, ${chartBounds.top + chartBounds.chartHeight / 2})`}
                  >
                    Value
                  </text>
                </>
              )}
            </svg>
          )}
        </div>

        {/* Legend - responsive */}
        {trendTags.length > 0 && (
          <div className="trend-chart-legend">
            {processedData.series.map((series) => {
              const lastValue = series.data[series.data.length - 1]?.value
              return (
                <div key={series.tagName} className="trend-legend-item">
                  <span
                    className="trend-legend-dot"
                    style={{ background: series.color }}
                  />
                  <span className="trend-legend-name">
                    {series.tagName}
                  </span>
                  {lastValue !== undefined && (
                    <span
                      className="trend-legend-value"
                      style={{ color: series.color }}
                    >
                      = {lastValue.toFixed(2)}
                    </span>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ================================================
// Trend Chart Button (for use in simulation controls)
// ================================================

export function TrendChartButton({ availableTags }: { availableTags: string[] }) {
  const [isOpen, setIsOpen] = useState(false)
  const { enabled } = useSimulation()

  if (!enabled) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="trend-chart-btn touch-target"
        title="Open Trend Chart"
        aria-label="Open trend chart"
      >
        <IconChart />
        <span className="hide-mobile">Trend</span>
      </button>

      {isOpen && (
        <TrendChart
          availableTags={availableTags}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  )
}

export default TrendChart
