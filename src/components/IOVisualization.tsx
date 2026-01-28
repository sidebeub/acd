'use client'

import { useState, useMemo } from 'react'

// I/O Point interface matching the API response
interface IOPoint {
  tagName: string
  aliasName?: string
  fullPath: string
  type: 'input' | 'output' | 'unknown'
  description?: string
  slot?: number
  channel?: number
  usage: Array<{ program: string; routine: string; rungNumber: number; instruction: string }>
}

// Module interface for hardware modules
interface HardwareModule {
  name: string
  catalogNumber: string | null
  slot: number | null
  parent?: string | null
  productType?: string | null
  vendor?: string | null
}

// Organized module with I/O points
interface IOModule {
  name: string
  catalogNumber: string
  slot: number
  inputs: IOPoint[]
  outputs: IOPoint[]
  moduleType: 'input' | 'output' | 'combo' | 'unknown'
  pointCount: number
}

interface IOVisualizationProps {
  inputs: IOPoint[]
  outputs: IOPoint[]
  hardwareModules?: HardwareModule[]
  onPointClick?: (point: IOPoint) => void
}

// Determine module type from catalog number
function getModuleType(catalogNumber: string): { type: 'input' | 'output' | 'combo' | 'unknown'; pointCount: number } {
  const cat = catalogNumber.toUpperCase()

  // Allen-Bradley 1746 series (SLC 500)
  if (cat.includes('1746-IB') || cat.includes('1746-IA') || cat.includes('1746-IV')) {
    const match = cat.match(/1746-I[ABV](\d+)/i)
    return { type: 'input', pointCount: match ? parseInt(match[1]) : 16 }
  }
  if (cat.includes('1746-OB') || cat.includes('1746-OA') || cat.includes('1746-OV') || cat.includes('1746-OW')) {
    const match = cat.match(/1746-O[ABVW](\d+)/i)
    return { type: 'output', pointCount: match ? parseInt(match[1]) : 16 }
  }

  // Allen-Bradley 1769 series (CompactLogix)
  if (cat.includes('1769-IQ') || cat.includes('1769-IA') || cat.includes('1769-IF') || cat.includes('1769-IR')) {
    const match = cat.match(/1769-I[QAFR](\d+)/i)
    return { type: 'input', pointCount: match ? parseInt(match[1]) : 16 }
  }
  if (cat.includes('1769-OB') || cat.includes('1769-OA') || cat.includes('1769-OW') || cat.includes('1769-OF')) {
    const match = cat.match(/1769-O[BAWF](\d+)/i)
    return { type: 'output', pointCount: match ? parseInt(match[1]) : 16 }
  }
  if (cat.includes('1769-IQ6XOW4')) {
    return { type: 'combo', pointCount: 10 } // 6 inputs, 4 outputs
  }

  // Allen-Bradley 1756 series (ControlLogix)
  if (cat.includes('1756-IB') || cat.includes('1756-IA') || cat.includes('1756-IF') || cat.includes('1756-IR')) {
    const match = cat.match(/1756-I[ABFR](\d+)/i)
    return { type: 'input', pointCount: match ? parseInt(match[1]) : 16 }
  }
  if (cat.includes('1756-OB') || cat.includes('1756-OA') || cat.includes('1756-OW') || cat.includes('1756-OF')) {
    const match = cat.match(/1756-O[BAWF](\d+)/i)
    return { type: 'output', pointCount: match ? parseInt(match[1]) : 16 }
  }

  // Point I/O 1734 series
  if (cat.includes('1734-IB') || cat.includes('1734-IE') || cat.includes('1734-IV')) {
    const match = cat.match(/1734-I[BEV](\d+)/i)
    return { type: 'input', pointCount: match ? parseInt(match[1]) : 8 }
  }
  if (cat.includes('1734-OB') || cat.includes('1734-OE') || cat.includes('1734-OW')) {
    const match = cat.match(/1734-O[BEW](\d+)/i)
    return { type: 'output', pointCount: match ? parseInt(match[1]) : 8 }
  }

  // Generic patterns
  if (cat.match(/[-_]I[BQAF]?\d/i)) return { type: 'input', pointCount: 16 }
  if (cat.match(/[-_]O[BWAF]?\d/i)) return { type: 'output', pointCount: 16 }

  return { type: 'unknown', pointCount: 16 }
}

// Extract slot number from I/O address
function extractSlot(tagName: string): number | undefined {
  // Pattern: &hexid:slot:I/O.bit or Local:slot:I/O.Data.bit
  const match = tagName.match(/:(\d+):[IO]\./)
  return match ? parseInt(match[1]) : undefined
}

// Extract channel/bit from I/O address
function extractChannel(tagName: string): number | undefined {
  // Pattern: ends with .Data.XX or .XX or /XX
  const dataMatch = tagName.match(/\.Data\.(\d+)$/)
  if (dataMatch) return parseInt(dataMatch[1])

  const dotMatch = tagName.match(/\.(\d+)$/)
  if (dotMatch) return parseInt(dotMatch[1])

  const slashMatch = tagName.match(/\/(\d+)$/)
  if (slashMatch) return parseInt(slashMatch[1])

  return undefined
}

// I/O Point LED component
function IOPointLED({
  point,
  index,
  onClick
}: {
  point?: IOPoint
  index: number
  onClick?: (point: IOPoint) => void
}) {
  const [showTooltip, setShowTooltip] = useState(false)

  // Determine color based on type and state
  // In a real system, we'd get the actual state; here we show based on usage
  const hasUsage = point && point.usage.length > 0
  const isInput = point?.type === 'input'
  const isOutput = point?.type === 'output'

  let bgColor = 'var(--surface-4)' // Unused/empty
  let glowColor = 'transparent'

  if (point) {
    if (hasUsage) {
      // Show as "potentially on" (green for inputs, amber for outputs)
      bgColor = isInput ? 'var(--accent-emerald)' : 'var(--accent-amber)'
      glowColor = isInput ? 'rgba(16, 185, 129, 0.4)' : 'rgba(245, 158, 11, 0.4)'
    } else {
      // Defined but unused - dimmer version
      bgColor = isInput ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'
    }
  }

  return (
    <div
      className="relative"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => point && onClick?.(point)}
    >
      <div
        className="w-4 h-4 rounded-sm cursor-pointer transition-all duration-150 hover:scale-110"
        style={{
          background: bgColor,
          boxShadow: point && hasUsage ? `0 0 6px ${glowColor}` : 'none',
          border: '1px solid rgba(255,255,255,0.1)'
        }}
      >
        {/* Terminal number */}
        <span
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px]"
          style={{ color: 'var(--text-muted)' }}
        >
          {index}
        </span>
      </div>

      {/* Tooltip */}
      {showTooltip && point && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded text-xs whitespace-nowrap z-50"
          style={{
            background: 'var(--surface-4)',
            border: '1px solid var(--border-default)',
            boxShadow: 'var(--shadow-md)'
          }}
        >
          <div className="font-mono font-semibold" style={{ color: isInput ? 'var(--accent-emerald)' : 'var(--accent-amber)' }}>
            {point.aliasName || point.tagName}
          </div>
          {point.aliasName && (
            <div className="font-mono text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {point.tagName}
            </div>
          )}
          {point.description && (
            <div className="mt-1" style={{ color: 'var(--text-tertiary)' }}>
              {point.description}
            </div>
          )}
          <div className="mt-1" style={{ color: 'var(--text-muted)' }}>
            {point.usage.length} reference{point.usage.length !== 1 ? 's' : ''}
          </div>
        </div>
      )}
    </div>
  )
}

// Single I/O Module Card component
function IOModuleCard({
  module,
  onPointClick
}: {
  module: IOModule
  onPointClick?: (point: IOPoint) => void
}) {
  const [expanded, setExpanded] = useState(false)

  // Create point array with correct positioning
  const inputPoints = useMemo(() => {
    const points: (IOPoint | undefined)[] = new Array(module.pointCount).fill(undefined)
    module.inputs.forEach(input => {
      const channel = input.channel ?? extractChannel(input.tagName)
      if (channel !== undefined && channel < module.pointCount) {
        points[channel] = input
      }
    })
    return points
  }, [module])

  const outputPoints = useMemo(() => {
    const points: (IOPoint | undefined)[] = new Array(module.pointCount).fill(undefined)
    module.outputs.forEach(output => {
      const channel = output.channel ?? extractChannel(output.tagName)
      if (channel !== undefined && channel < module.pointCount) {
        points[channel] = output
      }
    })
    return points
  }, [module])

  const hasInputs = module.moduleType === 'input' || module.moduleType === 'combo'
  const hasOutputs = module.moduleType === 'output' || module.moduleType === 'combo'

  return (
    <div
      className="flex flex-col rounded-lg overflow-hidden"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border-default)',
        minWidth: '120px',
        maxWidth: '160px'
      }}
    >
      {/* Module header */}
      <div
        className="px-3 py-2 cursor-pointer"
        style={{
          background: 'var(--surface-3)',
          borderBottom: '1px solid var(--border-subtle)'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-mono font-semibold" style={{ color: 'var(--text-primary)' }}>
            Slot {module.slot}
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{
              color: 'var(--text-muted)',
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s ease'
            }}
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
        <div className="text-[10px] font-mono mt-1" style={{ color: 'var(--accent-blue)' }}>
          {module.catalogNumber}
        </div>
        <div className="text-[10px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
          {module.name}
        </div>
      </div>

      {/* LED indicators */}
      <div className="p-3">
        {/* Input section */}
        {hasInputs && (
          <div className="mb-3">
            <div className="text-[9px] uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'var(--accent-emerald)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Inputs
            </div>
            <div className="grid grid-cols-4 gap-2 pb-2">
              {inputPoints.slice(0, expanded ? undefined : 8).map((point, i) => (
                <IOPointLED
                  key={i}
                  point={point}
                  index={i}
                  onClick={onPointClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Output section */}
        {hasOutputs && (
          <div>
            <div className="text-[9px] uppercase tracking-wider mb-2 flex items-center gap-1" style={{ color: 'var(--accent-amber)' }}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              Outputs
            </div>
            <div className="grid grid-cols-4 gap-2 pb-2">
              {outputPoints.slice(0, expanded ? undefined : 8).map((point, i) => (
                <IOPointLED
                  key={i}
                  point={point}
                  index={i}
                  onClick={onPointClick}
                />
              ))}
            </div>
          </div>
        )}

        {/* Unknown type - show all points */}
        {module.moduleType === 'unknown' && (
          <div>
            <div className="text-[9px] uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
              I/O Points
            </div>
            <div className="grid grid-cols-4 gap-2 pb-2">
              {[...module.inputs, ...module.outputs].slice(0, expanded ? undefined : 8).map((point, i) => (
                <IOPointLED
                  key={i}
                  point={point}
                  index={i}
                  onClick={onPointClick}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div
        className="px-3 py-1.5 text-[10px] flex justify-between"
        style={{
          background: 'var(--surface-1)',
          borderTop: '1px solid var(--border-subtle)',
          color: 'var(--text-muted)'
        }}
      >
        <span>{module.inputs.length}I</span>
        <span>{module.outputs.length}O</span>
      </div>
    </div>
  )
}

// Legend component
function IOLegend() {
  return (
    <div className="flex flex-wrap items-center gap-4 px-4 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--accent-emerald)' }} />
        <span>Input (used)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(16, 185, 129, 0.3)' }} />
        <span>Input (unused)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--accent-amber)' }} />
        <span>Output (used)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm" style={{ background: 'rgba(245, 158, 11, 0.3)' }} />
        <span>Output (unused)</span>
      </div>
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--surface-4)', border: '1px solid rgba(255,255,255,0.1)' }} />
        <span>Empty</span>
      </div>
    </div>
  )
}

// Main IOVisualization component
export function IOVisualization({
  inputs,
  outputs,
  hardwareModules = [],
  onPointClick
}: IOVisualizationProps) {
  const [viewMode, setViewMode] = useState<'rack' | 'list'>('rack')
  const [selectedPoint, setSelectedPoint] = useState<IOPoint | null>(null)

  // Organize I/O points into modules
  const organizedModules = useMemo(() => {
    const moduleMap = new Map<string, IOModule>()

    // First, create modules from hardware module data
    hardwareModules.forEach(hw => {
      if (hw.slot !== null && hw.catalogNumber) {
        const key = `slot-${hw.slot}`
        const typeInfo = getModuleType(hw.catalogNumber)
        moduleMap.set(key, {
          name: hw.name,
          catalogNumber: hw.catalogNumber,
          slot: hw.slot,
          inputs: [],
          outputs: [],
          moduleType: typeInfo.type,
          pointCount: typeInfo.pointCount
        })
      }
    })

    // Process inputs
    inputs.forEach(input => {
      const slot = input.slot ?? extractSlot(input.tagName)
      if (slot !== undefined) {
        const key = `slot-${slot}`
        if (!moduleMap.has(key)) {
          moduleMap.set(key, {
            name: `Module ${slot}`,
            catalogNumber: 'Unknown',
            slot,
            inputs: [],
            outputs: [],
            moduleType: 'input',
            pointCount: 16
          })
        }
        moduleMap.get(key)!.inputs.push({
          ...input,
          slot,
          channel: input.channel ?? extractChannel(input.tagName)
        })
      }
    })

    // Process outputs
    outputs.forEach(output => {
      const slot = output.slot ?? extractSlot(output.tagName)
      if (slot !== undefined) {
        const key = `slot-${slot}`
        if (!moduleMap.has(key)) {
          moduleMap.set(key, {
            name: `Module ${slot}`,
            catalogNumber: 'Unknown',
            slot,
            inputs: [],
            outputs: [],
            moduleType: 'output',
            pointCount: 16
          })
        }
        const mod = moduleMap.get(key)!
        mod.outputs.push({
          ...output,
          slot,
          channel: output.channel ?? extractChannel(output.tagName)
        })
        // Update module type if it has both
        if (mod.inputs.length > 0 && mod.moduleType === 'output') {
          mod.moduleType = 'combo'
        }
      }
    })

    // Sort by slot number
    return [...moduleMap.values()].sort((a, b) => a.slot - b.slot)
  }, [inputs, outputs, hardwareModules])

  // Points without slot assignment
  const unassignedPoints = useMemo(() => {
    const allAssignedTags = new Set<string>()
    organizedModules.forEach(mod => {
      mod.inputs.forEach(i => allAssignedTags.add(i.tagName))
      mod.outputs.forEach(o => allAssignedTags.add(o.tagName))
    })

    return {
      inputs: inputs.filter(i => !allAssignedTags.has(i.tagName)),
      outputs: outputs.filter(o => !allAssignedTags.has(o.tagName))
    }
  }, [inputs, outputs, organizedModules])

  const handlePointClick = (point: IOPoint) => {
    setSelectedPoint(point)
    onPointClick?.(point)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header with view toggle */}
      <div
        className="flex items-center justify-between px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
            I/O Rack Visualization
          </h2>
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <span style={{ color: 'var(--accent-emerald)' }}>{inputs.length} inputs</span>
            <span>|</span>
            <span style={{ color: 'var(--accent-amber)' }}>{outputs.length} outputs</span>
            <span>|</span>
            <span>{organizedModules.length} modules</span>
          </div>
        </div>

        {/* View mode toggle */}
        <div
          className="flex rounded-md overflow-hidden"
          style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
        >
          <button
            className="px-3 py-1.5 text-xs transition-colors"
            style={{
              background: viewMode === 'rack' ? 'var(--surface-3)' : 'transparent',
              color: viewMode === 'rack' ? 'var(--text-primary)' : 'var(--text-muted)'
            }}
            onClick={() => setViewMode('rack')}
          >
            Rack View
          </button>
          <button
            className="px-3 py-1.5 text-xs transition-colors"
            style={{
              background: viewMode === 'list' ? 'var(--surface-3)' : 'transparent',
              color: viewMode === 'list' ? 'var(--text-primary)' : 'var(--text-muted)'
            }}
            onClick={() => setViewMode('list')}
          >
            List View
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <IOLegend />
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'rack' ? (
          <div>
            {/* Rack visualization */}
            {organizedModules.length > 0 ? (
              <div
                className="p-4 rounded-lg"
                style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
              >
                {/* Rack rail top */}
                <div
                  className="h-2 rounded-t mb-1"
                  style={{ background: 'linear-gradient(to bottom, #4b5563, #374151)' }}
                />

                {/* Modules container */}
                <div
                  className="flex gap-1 overflow-x-auto pb-2"
                  style={{
                    background: 'linear-gradient(to bottom, var(--surface-0), var(--surface-1))',
                    padding: '12px 8px'
                  }}
                >
                  {organizedModules.map((module) => (
                    <IOModuleCard
                      key={`${module.slot}-${module.name}`}
                      module={module}
                      onPointClick={handlePointClick}
                    />
                  ))}
                </div>

                {/* Rack rail bottom */}
                <div
                  className="h-2 rounded-b mt-1"
                  style={{ background: 'linear-gradient(to top, #4b5563, #374151)' }}
                />
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--text-muted)' }}>
                <p>No I/O modules with slot information found</p>
                <p className="text-xs mt-1">Switch to List View to see all I/O points</p>
              </div>
            )}

            {/* Unassigned I/O points */}
            {(unassignedPoints.inputs.length > 0 || unassignedPoints.outputs.length > 0) && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Unassigned I/O Points
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unassignedPoints.inputs.length > 0 && (
                    <div
                      className="p-3 rounded-lg"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
                    >
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--accent-emerald)' }}>
                        <span className="w-2 h-2 rounded-full bg-current" />
                        Inputs ({unassignedPoints.inputs.length})
                      </h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {unassignedPoints.inputs.map((input) => (
                          <div
                            key={input.tagName}
                            className="px-2 py-1 rounded text-xs font-mono cursor-pointer hover:bg-white/5"
                            style={{ color: 'var(--accent-emerald)' }}
                            onClick={() => handlePointClick(input)}
                          >
                            {input.aliasName || input.tagName}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {unassignedPoints.outputs.length > 0 && (
                    <div
                      className="p-3 rounded-lg"
                      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-subtle)' }}
                    >
                      <h4 className="text-xs font-semibold mb-2 flex items-center gap-2" style={{ color: 'var(--accent-amber)' }}>
                        <span className="w-2 h-2 rounded-full bg-current" />
                        Outputs ({unassignedPoints.outputs.length})
                      </h4>
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {unassignedPoints.outputs.map((output) => (
                          <div
                            key={output.tagName}
                            className="px-2 py-1 rounded text-xs font-mono cursor-pointer hover:bg-white/5"
                            style={{ color: 'var(--accent-amber)' }}
                            onClick={() => handlePointClick(output)}
                          >
                            {output.aliasName || output.tagName}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          // List view
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Inputs list */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-emerald)' }}>
                <span className="w-2 h-2 rounded-full bg-current" />
                Inputs ({inputs.length})
              </h3>
              <div className="space-y-2">
                {inputs.map((io) => (
                  <div
                    key={io.tagName}
                    className="p-3 rounded cursor-pointer transition-colors hover:bg-white/5"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
                    onClick={() => handlePointClick(io)}
                  >
                    {io.aliasName ? (
                      <>
                        <code className="text-[13px] font-mono font-semibold" style={{ color: 'var(--accent-emerald)' }}>{io.aliasName}</code>
                        <div className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>{io.tagName}</div>
                      </>
                    ) : (
                      <code className="text-[13px] font-mono" style={{ color: 'var(--accent-emerald)' }}>{io.tagName}</code>
                    )}
                    {io.description && <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{io.description}</div>}
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Used {io.usage.length} times</div>
                  </div>
                ))}
                {inputs.length === 0 && (
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No inputs found</div>
                )}
              </div>
            </div>

            {/* Outputs list */}
            <div>
              <h3 className="text-sm font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--accent-amber)' }}>
                <span className="w-2 h-2 rounded-full bg-current" />
                Outputs ({outputs.length})
              </h3>
              <div className="space-y-2">
                {outputs.map((io) => (
                  <div
                    key={io.tagName}
                    className="p-3 rounded cursor-pointer transition-colors hover:bg-white/5"
                    style={{ background: 'var(--surface-1)', border: '1px solid var(--border-subtle)' }}
                    onClick={() => handlePointClick(io)}
                  >
                    {io.aliasName ? (
                      <>
                        <code className="text-[13px] font-mono font-semibold" style={{ color: 'var(--accent-amber)' }}>{io.aliasName}</code>
                        <div className="text-xs mt-1 font-mono" style={{ color: 'var(--text-muted)' }}>{io.tagName}</div>
                      </>
                    ) : (
                      <code className="text-[13px] font-mono" style={{ color: 'var(--accent-amber)' }}>{io.tagName}</code>
                    )}
                    {io.description && <div className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{io.description}</div>}
                    <div className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Used {io.usage.length} times</div>
                  </div>
                ))}
                {outputs.length === 0 && (
                  <div className="text-sm" style={{ color: 'var(--text-muted)' }}>No outputs found</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Selected point detail panel */}
      {selectedPoint && (
        <div
          className="flex-shrink-0 p-4"
          style={{
            background: 'var(--surface-2)',
            borderTop: '1px solid var(--border-default)'
          }}
        >
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    background: selectedPoint.type === 'input' ? 'var(--accent-emerald)' : 'var(--accent-amber)'
                  }}
                />
                <code
                  className="text-sm font-mono font-semibold"
                  style={{
                    color: selectedPoint.type === 'input' ? 'var(--accent-emerald)' : 'var(--accent-amber)'
                  }}
                >
                  {selectedPoint.aliasName || selectedPoint.tagName}
                </code>
                <span className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--surface-4)', color: 'var(--text-tertiary)' }}>
                  {selectedPoint.type}
                </span>
              </div>
              {selectedPoint.aliasName && (
                <code className="text-xs font-mono mt-1 block" style={{ color: 'var(--text-muted)' }}>
                  {selectedPoint.tagName}
                </code>
              )}
              {selectedPoint.description && (
                <p className="text-xs mt-2" style={{ color: 'var(--text-secondary)' }}>
                  {selectedPoint.description}
                </p>
              )}
            </div>
            <button
              className="p-1 rounded hover:bg-white/10"
              onClick={() => setSelectedPoint(null)}
              style={{ color: 'var(--text-muted)' }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Usage locations */}
          {selectedPoint.usage.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-semibold mb-2" style={{ color: 'var(--text-secondary)' }}>
                Used in {selectedPoint.usage.length} location{selectedPoint.usage.length !== 1 ? 's' : ''}:
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedPoint.usage.slice(0, 10).map((loc, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-1 rounded font-mono"
                    style={{ background: 'var(--surface-3)', color: 'var(--text-tertiary)' }}
                  >
                    {loc.routine}:{loc.rungNumber}
                  </span>
                ))}
                {selectedPoint.usage.length > 10 && (
                  <span className="text-xs px-2 py-1" style={{ color: 'var(--text-muted)' }}>
                    +{selectedPoint.usage.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
