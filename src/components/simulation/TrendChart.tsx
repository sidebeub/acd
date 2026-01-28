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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconPlay = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <polygon points="5,3 19,12 5,21" />
  </svg>
)

const IconPause = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="none">
    <rect x="6" y="4" width="4" height="16" />
    <rect x="14" y="4" width="4" height="16" />
  </svg>
)

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
)

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconMinus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)

const IconChart = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
  const chartRef = useRef<SVGSVGElement>(null)
  const [chartSize, setChartSize] = useState({ width: 600, height: 300 })

  // Update chart size based on container
  useEffect(() => {
    const updateSize = () => {
      if (chartRef.current?.parentElement) {
        const parent = chartRef.current.parentElement
        setChartSize({
          width: parent.clientWidth - 40,
          height: Math.max(200, parent.clientHeight - 20)
        })
      }
    }
    updateSize()
    window.addEventListener('resize', updateSize)
    return () => window.removeEventListener('resize', updateSize)
  }, [])

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
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.75)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative flex flex-col w-full max-w-4xl max-h-[90vh] rounded-lg overflow-hidden"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3"
          style={{
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          <div className="flex items-center gap-2">
            <IconChart />
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              Trend Chart
            </span>
            {trendRecording && (
              <span
                className="flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                style={{
                  background: 'rgba(34, 197, 94, 0.15)',
                  color: '#22c55e'
                }}
              >
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Recording
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <IconClose />
          </button>
        </div>

        {/* Controls */}
        <div
          className="flex flex-wrap items-center gap-3 px-4 py-2"
          style={{
            background: 'var(--surface-2)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          {/* Recording toggle */}
          <button
            onClick={() => setTrendRecording(!trendRecording)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors"
            style={{
              background: trendRecording ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
              color: trendRecording ? '#ef4444' : '#22c55e',
              border: `1px solid ${trendRecording ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
            }}
          >
            {trendRecording ? <IconPause /> : <IconPlay />}
            {trendRecording ? 'Pause' : 'Record'}
          </button>

          {/* Clear button */}
          <button
            onClick={clearTrendData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors"
            style={{
              background: 'var(--surface-3)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-4)'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-3)'}
          >
            <IconTrash />
            Clear
          </button>

          {/* Time range selector */}
          <div className="flex items-center gap-1 ml-auto">
            <span className="text-xs mr-2" style={{ color: 'var(--text-muted)' }}>Time Range:</span>
            {TIME_RANGES.map((range, idx) => (
              <button
                key={range.label}
                onClick={() => setSelectedTimeRange(idx)}
                className="px-2 py-1 rounded text-xs font-medium transition-colors"
                style={{
                  background: selectedTimeRange === idx ? 'var(--accent-blue)' : 'var(--surface-3)',
                  color: selectedTimeRange === idx ? 'white' : 'var(--text-secondary)',
                  border: `1px solid ${selectedTimeRange === idx ? 'var(--accent-blue)' : 'var(--border-subtle)'}`
                }}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tag selector */}
        <div
          className="flex flex-wrap items-center gap-2 px-4 py-2"
          style={{
            background: 'var(--surface-1)',
            borderBottom: '1px solid var(--border-subtle)'
          }}
        >
          {/* Current tags */}
          {trendTags.map((tagName, idx) => (
            <span
              key={tagName}
              className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-mono"
              style={{
                background: 'var(--surface-3)',
                border: `2px solid ${CHART_COLORS[idx % CHART_COLORS.length]}`,
                color: 'var(--text-primary)'
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: CHART_COLORS[idx % CHART_COLORS.length] }}
              />
              {tagName}
              <button
                onClick={() => handleRemoveTag(tagName)}
                className="ml-1 hover:text-red-400 transition-colors"
                style={{ color: 'var(--text-muted)' }}
              >
                <IconMinus />
              </button>
            </span>
          ))}

          {/* Add tag button */}
          <div className="relative">
            <button
              onClick={() => setShowTagSelector(!showTagSelector)}
              className="flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors"
              style={{
                background: 'var(--surface-3)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-4)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--surface-3)'}
            >
              <IconPlus />
              Add Tag
            </button>

            {/* Tag selector dropdown */}
            {showTagSelector && (
              <div
                className="absolute top-full left-0 mt-1 w-64 max-h-64 overflow-hidden rounded-lg z-10"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-default)',
                  boxShadow: 'var(--shadow-lg)'
                }}
              >
                <div className="p-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <input
                    type="text"
                    value={tagSearchQuery}
                    onChange={e => setTagSearchQuery(e.target.value)}
                    placeholder="Search tags..."
                    autoFocus
                    className="w-full px-2 py-1.5 rounded text-sm"
                    style={{
                      background: 'var(--surface-1)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  />
                </div>
                <div className="overflow-y-auto max-h-48">
                  {filteredTags
                    .filter(tag => !trendTags.includes(tag))
                    .map(tag => (
                      <button
                        key={tag}
                        onClick={() => handleAddTag(tag)}
                        className="w-full text-left px-3 py-2 text-xs font-mono transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-3)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {tag}
                      </button>
                    ))}
                  {filteredTags.filter(tag => !trendTags.includes(tag)).length === 0 && (
                    <div className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                      No matching tags
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Chart area */}
        <div className="flex-1 p-4 overflow-hidden" style={{ minHeight: 300 }}>
          {trendTags.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-full gap-3"
              style={{ color: 'var(--text-muted)' }}
            >
              <IconChart />
              <span className="text-sm">Add tags to start trending</span>
            </div>
          ) : (
            <svg
              ref={chartRef}
              width={chartSize.width}
              height={chartSize.height}
              style={{ display: 'block' }}
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
                    fontSize="10"
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
                    fontSize="10"
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
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ))}

              {/* Axis labels */}
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
            </svg>
          )}
        </div>

        {/* Legend */}
        {trendTags.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-4 px-4 py-2"
            style={{
              background: 'var(--surface-2)',
              borderTop: '1px solid var(--border-subtle)'
            }}
          >
            {processedData.series.map((series) => {
              const lastValue = series.data[series.data.length - 1]?.value
              return (
                <div key={series.tagName} className="flex items-center gap-2">
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ background: series.color }}
                  />
                  <span
                    className="text-xs font-mono"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {series.tagName}
                  </span>
                  {lastValue !== undefined && (
                    <span
                      className="text-xs font-mono font-semibold"
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
        className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors"
        style={{
          background: 'var(--surface-3)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)'
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--surface-4)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--surface-3)'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
        title="Open Trend Chart"
      >
        <IconChart />
        <span>Trend</span>
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
