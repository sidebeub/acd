'use client'

import { useState } from 'react'

interface StructuredTextViewerProps {
  routineName: string
  programName: string
  code: string
  description?: string | null
}

// ST keywords for syntax highlighting
const ST_KEYWORDS = [
  'IF', 'THEN', 'ELSE', 'ELSIF', 'END_IF',
  'CASE', 'OF', 'END_CASE',
  'FOR', 'TO', 'BY', 'DO', 'END_FOR',
  'WHILE', 'END_WHILE',
  'REPEAT', 'UNTIL', 'END_REPEAT',
  'EXIT', 'RETURN',
  'VAR', 'VAR_INPUT', 'VAR_OUTPUT', 'VAR_IN_OUT', 'VAR_TEMP', 'VAR_GLOBAL', 'END_VAR',
  'TYPE', 'END_TYPE', 'STRUCT', 'END_STRUCT',
  'PROGRAM', 'END_PROGRAM', 'FUNCTION', 'END_FUNCTION', 'FUNCTION_BLOCK', 'END_FUNCTION_BLOCK',
  'TRUE', 'FALSE',
  'AND', 'OR', 'XOR', 'NOT', 'MOD',
  'BOOL', 'BYTE', 'WORD', 'DWORD', 'LWORD',
  'SINT', 'INT', 'DINT', 'LINT',
  'USINT', 'UINT', 'UDINT', 'ULINT',
  'REAL', 'LREAL',
  'STRING', 'WSTRING', 'TIME', 'DATE', 'TOD', 'DT'
]

// Highlight ST code
function highlightCode(code: string): string {
  // Escape HTML
  let html = code
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Comments (// and (* *))
  html = html.replace(/(\/\/[^\n]*)/g, '<span class="st-comment">$1</span>')
  html = html.replace(/(\(\*[\s\S]*?\*\))/g, '<span class="st-comment">$1</span>')

  // Strings
  html = html.replace(/("(?:[^"\\]|\\.)*")/g, '<span class="st-string">$1</span>')
  html = html.replace(/('(?:[^'\\]|\\.)*')/g, '<span class="st-string">$1</span>')

  // Numbers
  html = html.replace(/\b(\d+\.?\d*(?:e[+-]?\d+)?)\b/gi, '<span class="st-number">$1</span>')

  // Keywords (case insensitive)
  for (const keyword of ST_KEYWORDS) {
    const regex = new RegExp(`\\b(${keyword})\\b`, 'gi')
    html = html.replace(regex, '<span class="st-keyword">$1</span>')
  }

  // Operators
  html = html.replace(/(:=|&lt;=|&gt;=|&lt;&gt;|&lt;|&gt;)/g, '<span class="st-operator">$1</span>')

  return html
}

export function StructuredTextViewer({ routineName, programName, code, description }: StructuredTextViewerProps) {
  const [showLineNumbers, setShowLineNumbers] = useState(true)
  const [wordWrap, setWordWrap] = useState(false)

  const lines = code.split('\n')
  const highlightedCode = highlightCode(code)
  const highlightedLines = highlightedCode.split('\n')

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div
        className="flex-shrink-0 px-4 py-3 border-b flex items-center justify-between"
        style={{ borderColor: 'var(--border-subtle)', background: 'var(--surface-1)' }}
      >
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
              {routineName}
            </h2>
            <span
              className="px-2 py-0.5 rounded text-[11px] font-medium"
              style={{
                background: 'var(--accent-amber-muted)',
                color: 'var(--accent-amber)'
              }}
            >
              Structured Text
            </span>
          </div>
          {description && (
            <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>{description}</p>
          )}
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            {lines.length} lines in {programName}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowLineNumbers(!showLineNumbers)}
            className="px-3 py-1.5 rounded text-xs transition-colors"
            style={{
              background: showLineNumbers ? 'var(--accent-blue-muted)' : 'var(--surface-3)',
              color: showLineNumbers ? 'var(--accent-blue)' : 'var(--text-secondary)'
            }}
          >
            Line #
          </button>
          <button
            onClick={() => setWordWrap(!wordWrap)}
            className="px-3 py-1.5 rounded text-xs transition-colors"
            style={{
              background: wordWrap ? 'var(--accent-blue-muted)' : 'var(--surface-3)',
              color: wordWrap ? 'var(--accent-blue)' : 'var(--text-secondary)'
            }}
          >
            Wrap
          </button>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="px-3 py-1.5 rounded text-xs transition-colors"
            style={{
              background: 'var(--surface-3)',
              color: 'var(--text-secondary)'
            }}
          >
            Copy
          </button>
        </div>
      </div>

      {/* Code view */}
      <div className="flex-1 overflow-auto" style={{ background: 'var(--surface-0)' }}>
        <div className="flex" style={{ minHeight: '100%' }}>
          {/* Line numbers */}
          {showLineNumbers && (
            <div
              className="flex-shrink-0 text-right pr-3 py-4 select-none border-r"
              style={{
                background: 'var(--surface-1)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)'
              }}
            >
              {lines.map((_, i) => (
                <div key={i} className="font-mono text-xs leading-6 px-3">
                  {i + 1}
                </div>
              ))}
            </div>
          )}

          {/* Code content */}
          <pre
            className="flex-1 p-4 font-mono text-sm leading-6 overflow-x-auto"
            style={{
              whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
              wordBreak: wordWrap ? 'break-all' : 'normal'
            }}
          >
            {highlightedLines.map((line, i) => (
              <div
                key={i}
                className="st-line hover:bg-opacity-50"
                style={{ minHeight: '1.5rem' }}
                dangerouslySetInnerHTML={{ __html: line || ' ' }}
              />
            ))}
          </pre>
        </div>
      </div>

      {/* Syntax highlighting styles */}
      <style jsx global>{`
        .st-keyword {
          color: var(--accent-blue);
          font-weight: 600;
        }
        .st-comment {
          color: var(--text-muted);
          font-style: italic;
        }
        .st-string {
          color: var(--accent-amber);
        }
        .st-number {
          color: var(--accent-emerald);
        }
        .st-operator {
          color: var(--accent-rose);
        }
        .st-line:hover {
          background: var(--surface-2);
        }
      `}</style>
    </div>
  )
}
