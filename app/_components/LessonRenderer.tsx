'use client'

import { CodeBlock } from './CodeBlock'
import type { LessonBlock } from '@/lib/types'

const ACCENT_COLORS: Record<string, string> = {
  purple: '#7C3AED',
  blue: '#3B82F6',
  green: '#10B981',
  orange: '#F97316',
  red: '#EF4444',
  yellow: '#F59E0B',
  pink: '#EC4899',
}

function parseBlocks(content: string | null): LessonBlock[] | null {
  if (!content) return null
  const trimmed = content.trim()
  if (!trimmed.startsWith('[')) return null
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed)) return parsed as LessonBlock[]
    return null
  } catch {
    return null
  }
}

export function LessonContent({ content }: { content: string | null }) {
  if (!content) return null
  const blocks = parseBlocks(content)

  // Plain text fallback
  if (!blocks) {
    return (
      <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>
        {content}
      </div>
    )
  }

  return (
    <div>
      {blocks.map(block => <Block key={block.id} block={block} />)}
    </div>
  )
}

function Block({ block }: { block: LessonBlock }) {
  const accent = ACCENT_COLORS[block.accentColor || 'purple'] || '#7C3AED'
  const highlightStyle: React.CSSProperties = block.isHighlighted ? {
    backgroundColor: accent + '12',
    borderLeft: `3px solid ${accent}`,
    padding: '12px 14px',
    borderRadius: 8,
    margin: '12px 0',
  } : {}

  switch (block.type) {
    case 'text':
      return (
        <div style={{ ...highlightStyle, fontSize: 15, color: '#374151', lineHeight: 1.65, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
          {block.content}
        </div>
      )

    case 'code':
      return <CodeBlock code={block.content} />

    case 'image':
      const imgSrc = block.imageURLOrBase64 || block.content
      if (!imgSrc) return null
      return (
        <div style={{ margin: '12px 0', borderRadius: 12, overflow: 'hidden', border: '1px solid #F3F4F6' }}>
          <img src={imgSrc} alt="" style={{ width: '100%', display: 'block' }} />
        </div>
      )

    case 'formula':
      return (
        <div style={{
          ...highlightStyle,
          fontFamily: '"Times New Roman", serif',
          fontStyle: 'italic',
          fontSize: 18,
          color: '#111',
          textAlign: 'center',
          padding: '14px',
          backgroundColor: highlightStyle.backgroundColor || '#F9FAFB',
          borderRadius: 10,
          margin: '12px 0',
          border: highlightStyle.borderLeft ? undefined : '1px solid #F3F4F6',
        }}>
          {block.content}
        </div>
      )

    case 'graph':
    case 'cellDiagram':
    case 'supplyDemand':
      return (
        <div style={{
          margin: '12px 0',
          padding: 16,
          backgroundColor: '#F9FAFB',
          borderRadius: 12,
          border: `1px dashed ${accent}`,
          textAlign: 'center',
          color: '#6B7280',
          fontSize: 13,
        }}>
          <div style={{ fontSize: 24, marginBottom: 6 }}>
            {block.type === 'graph' ? '📈' : block.type === 'cellDiagram' ? '🔬' : '📊'}
          </div>
          <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>
            {block.type === 'graph' ? 'Graph' : block.type === 'cellDiagram' ? 'Cell diagram' : 'Supply & Demand'}
          </div>
          {block.content && <div style={{ fontSize: 13 }}>{block.content}</div>}
        </div>
      )

    default:
      return null
  }
}
