'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'
import { uploadToStorage, FONT_FAMILY, BG_COLOR, PRIMARY, levelFromPoints } from '@/lib/helpers'
import { AVATAR_EMOJIS, CATEGORIES } from '@/lib/types'
import { Avatar } from '../_components/Avatar'
import { VerifiedBadge } from '../_components/VerifiedBadge'

export default function ProfileClient() {
  const router = useRouter()
  const { user, profile, loading, isCEO, refreshProfile, signOut } = useProfile()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [country, setCountry] = useState('')
  const [avatarEmoji, setAvatarEmoji] = useState('😊')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [interests, setInterests] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '')
      setBio(profile.bio || '')
      setCountry(profile.country || '')
      setAvatarEmoji(profile.avatar_emoji || '😊')
      setAvatarUrl(profile.avatar_url || null)
      setInterests(new Set((profile.interests || '').split(',').filter(Boolean)))
    }
  }, [profile])

  useEffect(() => {
    if (!loading && !user) router.push('/login')
  }, [loading, user, router])

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { alert('File too large (max 5 MB)'); return }
    setUploading(true)
    const url = await uploadToStorage(file, 'avatars')
    if (url) setAvatarUrl(url)
    else alert('Upload failed — check Storage permissions in Supabase')
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function removePhoto() {
    setAvatarUrl(null)
  }

  async function handleSave() {
    if (!profile) return
    setSaving(true)
    const { error } = await supabase
      .from('community_profiles')
      .update({
        display_name: displayName.trim() || 'User',
        bio: bio.trim() || null,
        country: country.trim() || null,
        avatar_emoji: avatarEmoji,
        avatar_url: avatarUrl,
        interests: Array.from(interests).join(',') || null,
      })
      .eq('id', profile.id)

    if (error) {
      alert('Save failed: ' + error.message)
    } else {
      await refreshProfile()
      setSaved(true)
      setTimeout(() => setSaved(false), 1800)
    }
    setSaving(false)
  }

  function toggleInterest(id: string) {
    setInterests(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading || !user) {
    return (
      <div style={{ minHeight: '100vh', backgroundColor: BG_COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_FAMILY }}>
        <div style={{ width: 28, height: 28, border: '3px solid #E5E7EB', borderTopColor: PRIMARY, borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  const lv = levelFromPoints(profile?.total_points ?? 0)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG_COLOR, fontFamily: FONT_FAMILY, paddingBottom: 80 }}>
      {/* Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(242,242,247,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 600, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 6, color: PRIMARY, fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke={PRIMARY} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back
          </Link>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Profile</span>
          <button onClick={handleSave} disabled={saving} style={{ background: 'none', border: 'none', color: PRIMARY, fontSize: 15, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.5 : 1 }}>
            {saving ? '…' : saved ? '✓' : 'Save'}
          </button>
        </div>
      </div>

      <div style={{ maxWidth: 600, margin: '0 auto', padding: '20px 16px' }}>
        {/* Avatar section */}
        <div style={{ backgroundColor: 'white', borderRadius: 22, padding: 24, marginBottom: 18, textAlign: 'center', border: '1px solid #F3F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
            <Avatar photoUrl={avatarUrl} emoji={avatarEmoji} size={100} border="3px solid #EDE9FE" />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              title="Upload photo"
              style={{ position: 'absolute', bottom: 0, right: 0, width: 34, height: 34, borderRadius: '50%', backgroundColor: PRIMARY, color: 'white', border: '3px solid white', cursor: uploading ? 'wait' : 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontFamily: 'inherit' }}
            >
              📷
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </div>
          {avatarUrl && (
            <div style={{ marginBottom: 6 }}>
              <button onClick={removePhoto} style={{ background: 'none', border: 'none', color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Remove photo</button>
            </div>
          )}
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 14 }}>
            {uploading ? 'Uploading…' : 'Tap camera to upload, or pick an emoji'}
          </div>

          {/* Emoji picker */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 6, marginBottom: 14 }}>
            {AVATAR_EMOJIS.map(em => (
              <button
                key={em}
                onClick={() => setAvatarEmoji(em)}
                style={{
                  fontSize: 22,
                  padding: '8px 0',
                  borderRadius: 10,
                  border: 'none',
                  cursor: 'pointer',
                  backgroundColor: avatarEmoji === em && !avatarUrl ? '#EDE9FE' : 'transparent',
                  fontFamily: 'inherit',
                }}
              >{em}</button>
            ))}
          </div>

          {(profile?.is_verified || isCEO) && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, backgroundColor: '#EFF6FF', borderRadius: 20, padding: '6px 14px', marginTop: 4 }}>
              <VerifiedBadge size={16} />
              <span style={{ fontSize: 13, color: '#1E40AF', fontWeight: 600 }}>Verified account</span>
            </div>
          )}
        </div>

        {/* Level card */}
        {profile && (
          <div style={{ background: 'linear-gradient(135deg, #7C3AED, #6366F1)', borderRadius: 18, padding: 16, marginBottom: 18, color: 'white' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>{lv.emoji}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{lv.label}</div>
                <div style={{ fontSize: 12, opacity: 0.88 }}>{(profile.total_points ?? 0).toLocaleString()} pts</div>
              </div>
            </div>
            <div style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.22)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(4, lv.progress * 100)}%`, backgroundColor: 'white', borderRadius: 4 }} />
            </div>
          </div>
        )}

        {/* Display name */}
        <Field label="Display name">
          <input value={displayName} onChange={e => setDisplayName(e.target.value)} maxLength={50} placeholder="Your name" style={inputStyle} />
        </Field>

        {/* Bio */}
        <Field label="Bio">
          <textarea value={bio} onChange={e => setBio(e.target.value)} maxLength={160} rows={3} placeholder="Tell people about yourself…" style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />
          <div style={{ textAlign: 'right', fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{bio.length}/160</div>
        </Field>

        {/* Country */}
        <Field label="Country / Region">
          <input value={country} onChange={e => setCountry(e.target.value)} placeholder="e.g. Germany" style={inputStyle} />
        </Field>

        {/* Interests */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Interests</div>
          <div style={{ backgroundColor: 'white', borderRadius: 14, padding: 4, border: '1px solid #F3F4F6' }}>
            {CATEGORIES.map((c, i) => (
              <button
                key={c.id}
                onClick={() => toggleInterest(c.id)}
                style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', borderBottom: i < CATEGORIES.length - 1 ? '1px solid #F3F4F6' : 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}
              >
                <span style={{ fontSize: 18 }}>{c.emoji}</span>
                <span style={{ flex: 1, fontSize: 15, color: '#111' }}>{c.label}</span>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  border: interests.has(c.id) ? `7px solid ${PRIMARY}` : '2px solid #D1D5DB',
                  backgroundColor: interests.has(c.id) ? PRIMARY : 'white',
                  transition: 'all 0.15s',
                }} />
              </button>
            ))}
          </div>
        </div>

        {/* Account info */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>Account</div>
          <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '12px 14px', border: '1px solid #F3F4F6' }}>
            <Row label="Email">{user.email}</Row>
            <Row label="Clarity ID">
              <span style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {profile?.id ? profile.id.slice(0, 8).toUpperCase() + '…' : '—'}
              </span>
            </Row>
            <Row label="Member since" last>
              {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : '—'}
            </Row>
          </div>
        </div>

        <button onClick={signOut} style={{ width: '100%', padding: 14, backgroundColor: 'white', color: '#EF4444', border: '1px solid #FEE2E2', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Sign Out
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #E5E7EB',
  borderRadius: 12,
  padding: '12px 14px',
  fontSize: 15,
  outline: 'none',
  backgroundColor: 'white',
  fontFamily: 'inherit',
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      {children}
    </div>
  )
}

function Row({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: last ? 'none' : '1px solid #F3F4F6' }}>
      <span style={{ fontSize: 14, color: '#6B7280' }}>{label}</span>
      <span style={{ fontSize: 14, color: '#111', fontWeight: 500 }}>{children}</span>
    </div>
  )
}
