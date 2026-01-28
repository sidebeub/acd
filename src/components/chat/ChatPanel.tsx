'use client'

import { useState, useEffect, useRef } from 'react'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

interface ChatSession {
  id: string
  title: string
  messageCount: number
  updatedAt: string
}

interface ChatPanelProps {
  projectId: string
  isOpen: boolean
  onClose: () => void
}

// Icons
const IconSend = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
)

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 5v14M5 12h14" />
  </svg>
)

const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
  </svg>
)

const IconChat = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
  </svg>
)

const IconClose = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

const IconCopy = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" />
    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
  </svg>
)

const IconCheck = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)

const IconDownload = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
  </svg>
)

// Code block component for ladder logic
function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className="mt-2 rounded-lg overflow-hidden"
      style={{ background: 'var(--surface-0)', border: '1px solid var(--border-default)' }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5"
        style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="text-[10px] font-mono uppercase" style={{ color: 'var(--text-muted)' }}>
          {language}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] transition-colors"
          style={{ color: copied ? 'var(--accent-emerald)' : 'var(--text-muted)' }}
        >
          {copied ? <IconCheck /> : <IconCopy />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre
        className="p-3 text-xs font-mono overflow-x-auto"
        style={{ color: 'var(--text-secondary)' }}
      >
        {code}
      </pre>
    </div>
  )
}

// Parse message content for code blocks
function MessageContent({ content }: { content: string }) {
  // Split by code blocks
  const parts = content.split(/(```[\s\S]*?```)/g)

  return (
    <div className="text-sm leading-relaxed">
      {parts.map((part, i) => {
        if (part.startsWith('```')) {
          // Extract language and code
          const match = part.match(/```(\w*)\n?([\s\S]*?)```/)
          if (match) {
            const language = match[1] || 'text'
            const code = match[2].trim()
            return <CodeBlock key={i} language={language} code={code} />
          }
        }
        // Regular text - render with basic markdown-like formatting
        return (
          <span key={i} className="whitespace-pre-wrap">
            {part.split('\n').map((line, j) => (
              <span key={j}>
                {line.startsWith('**') && line.endsWith('**') ? (
                  <strong>{line.slice(2, -2)}</strong>
                ) : line.startsWith('- ') ? (
                  <span className="block ml-2">{line}</span>
                ) : (
                  line
                )}
                {j < part.split('\n').length - 1 && <br />}
              </span>
            ))}
          </span>
        )
      })}
    </div>
  )
}

// Single message component
function ChatMessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-lg px-3 py-2 ${isUser ? 'rounded-br-sm' : 'rounded-bl-sm'}`}
        style={{
          background: isUser ? 'var(--accent-blue)' : 'var(--surface-2)',
          color: isUser ? 'white' : 'var(--text-secondary)'
        }}
      >
        <MessageContent content={message.content} />
        <div
          className="text-[10px] mt-1 opacity-60"
          style={{ textAlign: isUser ? 'right' : 'left' }}
        >
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

interface AnalysisStatus {
  status: 'not_started' | 'analyzing' | 'complete' | 'failed'
  tokensUsed?: number
}

export function ChatPanel({ projectId, isOpen, onClose }: ChatPanelProps) {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showSessions, setShowSessions] = useState(false)
  const [analysisStatus, setAnalysisStatus] = useState<AnalysisStatus>({ status: 'not_started' })
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Load analysis status and sessions on mount
  useEffect(() => {
    if (isOpen) {
      loadSessions()
      loadAnalysisStatus()
    }
  }, [isOpen, projectId])

  // Poll analysis status if analyzing
  useEffect(() => {
    if (analysisStatus.status === 'analyzing') {
      const interval = setInterval(loadAnalysisStatus, 5000)
      return () => clearInterval(interval)
    }
  }, [analysisStatus.status])

  const loadAnalysisStatus = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/analyze`)
      const data = await res.json()
      setAnalysisStatus({
        status: data.project?.status || 'not_started',
        tokensUsed: data.project?.tokensUsed
      })
    } catch (e) {
      console.error('Failed to load analysis status:', e)
    }
  }

  const triggerAnalysis = async () => {
    try {
      setAnalysisStatus({ status: 'analyzing' })
      await fetch(`/api/projects/${projectId}/analyze`, { method: 'POST' })
      // Status will be updated by polling
    } catch (e) {
      console.error('Failed to trigger analysis:', e)
      setAnalysisStatus({ status: 'failed' })
    }
  }

  // Load messages when session changes
  useEffect(() => {
    if (currentSessionId) {
      loadMessages(currentSessionId)
    }
  }, [currentSessionId])

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadSessions = async () => {
    try {
      const res = await fetch(`/api/projects/${projectId}/chat`)
      const data = await res.json()
      setSessions(data.sessions || [])
      // Auto-select most recent session or create new
      if (data.sessions?.length > 0 && !currentSessionId) {
        setCurrentSessionId(data.sessions[0].id)
      }
    } catch (e) {
      console.error('Failed to load sessions:', e)
    }
  }

  const loadMessages = async (sessionId: string) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/chat/${sessionId}`)
      const data = await res.json()
      setMessages(data.messages || [])
    } catch (e) {
      console.error('Failed to load messages:', e)
    }
  }

  const startNewChat = () => {
    setCurrentSessionId(null)
    setMessages([])
    setShowSessions(false)
  }

  const exportChat = () => {
    if (messages.length === 0) return

    // Build markdown content
    const lines: string[] = [
      '# PLC Chat Export',
      '',
      `**Date**: ${new Date().toLocaleString()}`,
      `**Project**: ${projectId}`,
      '',
      '---',
      ''
    ]

    for (const msg of messages) {
      const timestamp = new Date(msg.createdAt).toLocaleString()
      if (msg.role === 'user') {
        lines.push(`## User (${timestamp})`)
      } else {
        lines.push(`## AI Assistant (${timestamp})`)
      }
      lines.push('')
      lines.push(msg.content)
      lines.push('')
      lines.push('---')
      lines.push('')
    }

    // Create and download file
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `plc-chat-${new Date().toISOString().split('T')[0]}.md`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const deleteSession = async (sessionId: string) => {
    try {
      await fetch(`/api/projects/${projectId}/chat/${sessionId}`, {
        method: 'DELETE'
      })
      setSessions(prev => prev.filter(s => s.id !== sessionId))
      if (currentSessionId === sessionId) {
        setCurrentSessionId(null)
        setMessages([])
      }
    } catch (e) {
      console.error('Failed to delete session:', e)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')
    setIsLoading(true)

    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'user',
      content: userMessage,
      createdAt: new Date().toISOString()
    }
    setMessages(prev => [...prev, tempUserMsg])

    try {
      const res = await fetch(`/api/projects/${projectId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: currentSessionId,
          message: userMessage
        })
      })

      const data = await res.json()

      if (data.error) {
        throw new Error(data.error)
      }

      // Update session ID if new
      if (!currentSessionId && data.sessionId) {
        setCurrentSessionId(data.sessionId)
        loadSessions() // Refresh session list
      }

      // Add assistant response
      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: data.response,
        createdAt: new Date().toISOString()
      }
      setMessages(prev => [...prev, assistantMsg])
    } catch (e) {
      console.error('Chat error:', e)
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMsg.id))
      // Show error in chat
      setMessages(prev => [...prev, {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        createdAt: new Date().toISOString()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="no-print">
      {/* Mobile backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
        onClick={onClose}
      />

      {/* Chat panel */}
      <aside
        className="fixed lg:relative inset-y-0 right-0 top-12 lg:top-0 z-50 flex flex-col border-l"
        style={{
          width: '360px',
          maxWidth: '100vw',
          background: 'var(--surface-1)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        {/* Header */}
        <div
          className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2">
            <IconChat />
            <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              AI Assistant
            </h3>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowSessions(!showSessions)}
              className="p-1.5 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}
              title="Chat history"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
            <button
              onClick={startNewChat}
              className="p-1.5 rounded transition-colors"
              style={{ color: 'var(--text-muted)' }}
              title="New chat"
            >
              <IconPlus />
            </button>
            <button
              onClick={() => exportChat()}
              className="p-1.5 rounded transition-colors"
              style={{ color: messages.length > 0 ? 'var(--text-muted)' : 'var(--text-muted)', opacity: messages.length > 0 ? 1 : 0.5 }}
              title="Export chat"
              disabled={messages.length === 0}
            >
              <IconDownload />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded transition-colors lg:hidden"
              style={{ color: 'var(--text-muted)' }}
            >
              <IconClose />
            </button>
          </div>
        </div>

        {/* Analysis status banner */}
        {analysisStatus.status !== 'complete' && (
          <div
            className="px-3 py-2 text-xs border-b flex items-center gap-2"
            style={{
              background: analysisStatus.status === 'analyzing' ? 'var(--accent-amber-muted)' :
                         analysisStatus.status === 'failed' ? 'var(--accent-rose-muted)' :
                         'var(--surface-2)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)'
            }}
          >
            {analysisStatus.status === 'analyzing' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Analyzing project for optimized chat...</span>
              </>
            ) : analysisStatus.status === 'failed' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span>Analysis failed</span>
                <button
                  onClick={triggerAnalysis}
                  className="ml-auto text-xs underline"
                  style={{ color: 'var(--accent-blue)' }}
                >
                  Retry
                </button>
              </>
            ) : (
              <>
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <span>Project not analyzed</span>
                <button
                  onClick={triggerAnalysis}
                  className="ml-auto text-xs underline"
                  style={{ color: 'var(--accent-blue)' }}
                >
                  Analyze now
                </button>
              </>
            )}
          </div>
        )}
        {analysisStatus.status === 'complete' && (
          <div
            className="px-3 py-1.5 text-[10px] border-b flex items-center gap-2"
            style={{
              background: 'var(--accent-emerald-muted)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)'
            }}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Analysis ready - optimized for cost</span>
            {analysisStatus.tokensUsed && (
              <span className="ml-auto opacity-70">
                {(analysisStatus.tokensUsed / 1000).toFixed(1)}k tokens used
              </span>
            )}
          </div>
        )}

        {/* Session list dropdown */}
        {showSessions && (
          <div
            className="absolute top-14 left-0 right-0 z-10 max-h-64 overflow-y-auto border-b"
            style={{ background: 'var(--surface-2)', borderColor: 'var(--border-subtle)' }}
          >
            {sessions.length === 0 ? (
              <div className="p-4 text-center text-xs" style={{ color: 'var(--text-muted)' }}>
                No chat history yet
              </div>
            ) : (
              sessions.map(session => (
                <div
                  key={session.id}
                  className="flex items-center justify-between px-3 py-2 cursor-pointer transition-colors"
                  style={{
                    background: session.id === currentSessionId ? 'var(--accent-blue-muted)' : 'transparent'
                  }}
                  onClick={() => {
                    setCurrentSessionId(session.id)
                    setShowSessions(false)
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs font-medium truncate"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {session.title}
                    </div>
                    <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      {session.messageCount} messages
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteSession(session.id)
                    }}
                    className="p-1 rounded transition-colors opacity-50 hover:opacity-100"
                    style={{ color: 'var(--accent-rose)' }}
                  >
                    <IconTrash />
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                style={{ background: 'var(--accent-blue-muted)' }}
              >
                <IconChat />
              </div>
              <h4 className="font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                PLC Assistant
              </h4>
              <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
                I can help you review, explain, and generate ladder logic code for this project.
              </p>
              <div className="space-y-2 w-full max-w-xs">
                {[
                  'Explain the MainProgram routine',
                  'Find all uses of Motor_Start tag',
                  'Generate a rung for motor start logic'
                ].map((suggestion, i) => (
                  <button
                    key={i}
                    onClick={() => setInput(suggestion)}
                    className="w-full px-3 py-2 rounded text-xs text-left transition-colors"
                    style={{
                      background: 'var(--surface-2)',
                      color: 'var(--text-secondary)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {messages.map(message => (
                <ChatMessageBubble key={message.id} message={message} />
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{ background: 'var(--surface-2)' }}
                  >
                    <div className="flex items-center gap-1">
                      <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: 'var(--text-muted)', animationDelay: '0ms' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: 'var(--text-muted)', animationDelay: '150ms' }}
                      />
                      <span
                        className="w-2 h-2 rounded-full animate-pulse"
                        style={{ background: 'var(--text-muted)', animationDelay: '300ms' }}
                      />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <form
          onSubmit={sendMessage}
          className="flex-shrink-0 p-3 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about your project..."
              disabled={isLoading}
              className="input-field flex-1 text-sm"
              style={{ minHeight: '40px' }}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-3 rounded-lg transition-colors flex items-center justify-center"
              style={{
                background: input.trim() ? 'var(--accent-blue)' : 'var(--surface-3)',
                color: input.trim() ? 'white' : 'var(--text-muted)',
                opacity: isLoading ? 0.5 : 1
              }}
            >
              <IconSend />
            </button>
          </div>
        </form>
      </aside>
    </div>
  )
}
