'use client'

import { useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { uploadToStorage, PRIMARY, FONT_FAMILY } from '@/lib/helpers'
import { CATEGORIES } from '@/lib/types'
import type { Community } from '@/lib/types'

interface Props {
  community: Community
  onClose: () => void
  onUpdated: (next: Community) => void
  onDeleted: () => void
}

export function CommunitySettingsModal({ community, onClose, onUpdated, onDeleted }: Props) {
  const logoRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(community.name)
  const [description, setDescription] = useState(community.description ?? '')
  const [emoji, setEmoji] = useState(community.emoji ?? '💬')
  const [category, setCategory] = useState(community.category ?? 'general')
  const [logoUrl, setLogoUrl] = useState(community.logo_image_url)
  const [bannerUrl, setBannerUrl] = useState(community.cover_image_url)
  const [isPrivate, setIsPrivate] = useState(!!community.is_private)
  const [postPermission, setPostPermission] = useState(community.post_permission ?? 'everyone')
  const [saving, setSaving] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadingLogo(true)
    const url = await uploadToStorage(f, 'logos')
    if (url) setLogoUrl(url)
    setUploadingLogo(false)
  }

  async function handleBannerUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setUploadingBanner(true)
    const url = await uploadToStorage(f, 'banners')
    if (url) setBannerUrl(url)
    setUploadingBanner(false)
  }

  async function handleSave() {
    setSaving(true)
    const { data, error } = await supabase
      .from('communities')
      .update({
        name: name.trim() || community.name,
        description: description.trim() || null,
        emoji,
        category,
        logo_image_url: logoUrl,
        cover_image_url: bannerUrl,
        is_private: isPrivate,
        post_permission: postPermission,
      })
      .eq('id', community.id)
      .select()
      .single()

    setSaving(false)
    if (error) { alert('Save failed: ' + error.message); return }
    if (data) onUpdated(data as Community)
    onClose()
  }

  async function handleDelete() {
    if (!confirm(`Delete the community "${community.name}"? This cannot be undone.`)) return
    if (!confirm('Are you absolutely sure? All posts, courses, members, and comments will be deleted.')) return
    const { error } = await supabase.from('communities').delete().eq('id', community.id)
    if (error) { alert('Delete failed: ' + error.message); return }
    onDeleted()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 40, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', fontFamily: FONT_FAMILY }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, backgroundColor: '#F2F2F7', borderRadius: '20px 20px 0 0', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ position: 'sticky', top: 0, backgroundColor: '#F2F2F7', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 18px', borderBottom: '1px solid #E5E7EB', zIndex: 1 }}>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: PRIMARY, fontSize: 15, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>Settings</span>
          <button onClick={handleSave} disabled={saving} style={{ background: 'none', border: 'none', color: PRIMARY, fontSize: 15, fontWeight: 700, cursor: saving ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.5 : 1 }}>
            {saving ? '…' : 'Save'}
          </button>
        </div>

        <div style={{ padding: 18 }}>
          {/* Logo */}
          <Section title="Logo">
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 14px' }}>
              <div style={{ width: 50, height: 50, borderRadius: 12, backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {logoUrl ? <img src={logoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 22 }}>{emoji}</span>}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{name || 'Community'}</div>
                <button onClick={() => logoRef.current?.click()} style={{ background: 'none', border: 'none', color: PRIMARY, fontSize: 13, fontWeight: 600, cursor: 'pointer', padding: 0, marginTop: 4, fontFamily: 'inherit' }}>
                  {uploadingLogo ? 'Uploading…' : (logoUrl ? '🖼 Change logo' : '🖼 Add logo')}
                </button>
              </div>
              {logoUrl && (
                <button onClick={() => setLogoUrl(null)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontFamily: 'inherit' }} title="Remove logo">🗑</button>
              )}
              <input ref={logoRef} type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
            </div>
          </Section>

          {/* Banner */}
          <Section title="Cover Image">
            <button onClick={() => bannerRef.current?.click()} style={{ width: '100%', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', color: PRIMARY }}>
              <span style={{ fontSize: 18 }}>🖼</span>
              <span style={{ fontSize: 15, fontWeight: 500, color: '#111' }}>{uploadingBanner ? 'Uploading…' : (bannerUrl ? 'Change banner' : 'Add banner')}</span>
            </button>
            {bannerUrl && <img src={bannerUrl} alt="" style={{ width: '100%', height: 120, objectFit: 'cover' }} />}
            <input ref={bannerRef} type="file" accept="image/*" onChange={handleBannerUpload} style={{ display: 'none' }} />
          </Section>

          {/* General */}
          <Section title="General">
            <Row label="Name"><input value={name} onChange={e => setName(e.target.value)} style={inlineInput} /></Row>
            <Row label="Emoji"><input value={emoji} maxLength={2} onChange={e => setEmoji(e.target.value)} style={{ ...inlineInput, width: 60, textAlign: 'right' }} /></Row>
            <Row last label="Category">
              <select value={category} onChange={e => setCategory(e.target.value)} style={{ ...inlineInput, color: PRIMARY, fontWeight: 600, appearance: 'none', backgroundColor: 'transparent', textAlign: 'right' }}>
                {CATEGORIES.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
            </Row>
          </Section>

          {/* Description */}
          <Section title="Description">
            <textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={500} rows={4} style={{ width: '100%', boxSizing: 'border-box', border: 'none', padding: '12px 14px', fontSize: 15, color: '#111', outline: 'none', resize: 'none', fontFamily: 'inherit', backgroundColor: 'transparent', lineHeight: 1.5 }} />
          </Section>

          {/* Access */}
          <Section title="Access">
            <Row label="Private community">
              <Toggle value={isPrivate} onChange={setIsPrivate} />
            </Row>
            <Row last label="Who can post">
              <select value={postPermission} onChange={e => setPostPermission(e.target.value)} style={{ ...inlineInput, color: PRIMARY, fontWeight: 600, appearance: 'none', backgroundColor: 'transparent', textAlign: 'right' }}>
                <option value="everyone">Everyone</option>
                <option value="moderators_and_admins">Mods &amp; Admins</option>
                <option value="creator_only">Creator only</option>
              </select>
            </Row>
          </Section>

          <button onClick={handleDelete} style={{ width: '100%', padding: 14, backgroundColor: 'white', color: '#EF4444', border: '1px solid #FECACA', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', marginTop: 6 }}>
            Delete Community
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.4, padding: '0 4px' }}>{title}</div>
      <div style={{ backgroundColor: 'white', borderRadius: 14, overflow: 'hidden', border: '1px solid #F3F4F6' }}>{children}</div>
    </div>
  )
}

function Row({ label, children, last }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: last ? 'none' : '1px solid #F3F4F6' }}>
      <span style={{ fontSize: 15, color: '#111', fontWeight: 500 }}>{label}</span>
      {children}
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!value)} style={{ width: 50, height: 30, borderRadius: 15, border: 'none', cursor: 'pointer', backgroundColor: value ? PRIMARY : '#E5E7EB', position: 'relative', transition: 'background 0.2s', padding: 0 }}>
      <div style={{ position: 'absolute', top: 3, left: value ? 23 : 3, width: 24, height: 24, borderRadius: '50%', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.2s' }} />
    </button>
  )
}

const inlineInput: React.CSSProperties = {
  border: 'none',
  padding: 0,
  fontSize: 15,
  outline: 'none',
  fontFamily: 'inherit',
  color: '#111',
  textAlign: 'right',
  backgroundColor: 'transparent',
}
