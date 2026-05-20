'use client'

import { useState } from 'react'
import { copyToClipboard } from '@/lib/helpers'

export function CodeBlock({ code, language }: { code: string; language?: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    const ok = await copyToClipboard(code)
    if (ok) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{ position: 'relative', backgroundColor: '#0F172A', borderRadius: 12, overflow: 'hidden', margin: '10px 0', border: '1px solid #1E293B' }}>
      {language && (
        <div style={{
          padding: '6px 14px',
          fontSize: 11,
          fontWeight: 600,
          color: '#94A3B8',
          backgroundColor: '#1E293B',
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          borderBottom: '1px solid #334155',
        }}>
          {language}
        </div>
      )}
      <button
        onClick={handleCopy}
        title={copied ? 'Copied!' : 'Copy code'}
        style={{
          position: 'absolute',
          top: language ? 38 : 8,
          right: 8,
          background: copied ? '#10B981' : 'rgba(255,255,255,0.1)',
          color: 'white',
          border: 'none',
          borderRadius: 8,
          padding: '6px 10px',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          fontFamily: 'inherit',
          transition: 'background 0.2s',
          zIndex: 1,
        }}
      >
        {copied ? (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M5 12l5 5L20 7" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Copied</span>
          </>
        ) : (
          <>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <rect x="9" y="9" width="11" height="11" rx="2" stroke="white" strokeWidth="2" />
              <path d="M5 15V5a2 2 0 0 1 2-2h10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <span>Copy</span>
          </>
        )}
      </button>
      <pre style={{
        margin: 0,
        padding: 16,
        paddingTop: language ? 48 : 16,
        fontSize: 13,
        lineHeight: 1.55,
        color: '#E2E8F0',
        fontFamily: '"SF Mono", Menlo, Consolas, monospace',
        overflowX: 'auto',
        whiteSpace: 'pre',
      }}>
        <code>{code}</code>
      </pre>
    </div>
  )
}
