'use client'

import { useState, useRef } from 'react'
import { useProfile } from '@/lib/profile-context'
import { supabase } from '@/lib/supabase'
import { uploadToStorage, PRIMARY } from '@/lib/helpers'
import type { Subgroup, PostType } from '@/lib/types'

interface Props {
  communityId: string
  subgroups: Subgroup[]
  isModerator: boolean
  onClose: () => void
  onPosted: () => void
}

export function ComposerModal({ communityId, subgroups, isModerator, onClose, onPosted }: Props) {
  const { profile } = useProfile()
  const fileRef = useRef<HTMLInputElement>(null)
  const [type, setType] = useState<PostType>('text')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [subgroupId, setSubgroupId] = useState<string | null>(null)
  const [eventDate, setEventDate] = useState('')
  const [meetingUrl, setMeetingUrl] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)

  const types: { id: PostType; label: string; icon: string }[] = [
    { id: 'text', label: 'Text', icon: '📝' },
    { id: 'image', label: 'Image', icon: '📷' },
    { id: 'question', label: 'Question', icon: '❓' },
    { id: 'win', label: 'Win', icon: '🎉' },
    { id: 'event', label: 'Event', icon: '📅' },
  ]
  if (isModerator) types.push({ id: 'announcement', label: 'Announcement', icon: '📢' })

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.size > 5 * 1024 * 1024) { alert('Image too large (max 5 MB)'); return }
    setImageFile(f)
    setImagePreview(URL.createObjectURL(f))
    if (type === 'text') setType('image')
  }

  async function submit() {
    if (!profile || !content.trim()) return
    setPosting(true)

    let imageUrl: string | null = null
    if (imageFile) {
      imageUrl = await uploadToStorage(imageFile, 'posts')
      if (!imageUrl) {
        alert('Image upload failed')
        setPosting(false)
        return
      }
    }

    const subgroup = subgroups.find(s => s.id === subgroupId)
    const payload: Record<string, unknown> = {
      community_id: communityId,
      author_id: profile.id,                          // ← profile.id NOT user.id
      author_name: profile.display_name ?? 'Member',
      author_avatar: profile.avatar_emoji ?? '😊',
      author_photo_url: profile.avatar_url,
      author_is_verified: profile.is_verified || profile.is_ceo,
      content: content.trim(),
      title: title.trim() || null,
      post_type: type,
      subgroup_id: subgroupId,
      subgroup_name: subgroup?.name ?? null,
      image_url: imageUrl,
      is_pinned: false,
      is_announcement: type === 'announcement',
      like_count: 0,
      comment_count: 0,
    }
    if (type === 'event') {
      payload.event_date = eventDate || null
      payload.meeting_url = meetingUrl.trim() || null
    }
    if (type === 'live') {
      payload.meeting_url = meetingUrl.trim() || null
    }

    const { error } = await supabase.from('community_posts').insert(payload)
    if (error) {
      alert('Could not post: ' + error.message)
      setPosting(false)
      return
    }

    // Increment post count
    await supabase.rpc('increment_post_count', { p_community_id: communityId }).then(() => {}, () => {
      // RPC may not exist; fall back to manual update
      supabase.from('communities').select('post_count').eq('id', communityId).single().then(({ data }) => {
        if (data) supabase.from('communities').update({ post_count: (data.post_count ?? 0) + 1 }).eq('id', communityId)
      })
    })

    setPosting(false)
    onPosted()
    onClose()
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, backgroundColor: 'white', borderRadius: '20px 20px 0 0', padding: 18, boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>New Post</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1, fontFamily: 'inherit' }}>×</button>
        </div>

        <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
          {types.map(t => (
            <button key={t.id} onClick={() => setType(t.id)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 16, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: type === t.id ? 'none' : '1px solid #E5E7EB', backgroundColor: type === t.id ? PRIMARY : 'white', color: type === t.id ? 'white' : '#374151', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{t.icon}</span><span>{t.label}</span>
            </button>
          ))}
        </div>

        {(type === 'event' || type === 'question' || type === 'announcement') && (
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder={type === 'event' ? 'Event title' : 'Title (optional)'} style={inputStyle} />
        )}

        <textarea value={content} onChange={e => setContent(e.target.value)} placeholder={type === 'event' ? 'Describe your event…' : "Share something with the community…"} rows={4} autoFocus style={{ ...inputStyle, resize: 'none', lineHeight: 1.5 }} />

        {(type === 'image' || imagePreview) && (
          <div style={{ marginTop: 10 }}>
            {imagePreview ? (
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <img src={imagePreview} alt="" style={{ width: '100%', borderRadius: 10, maxHeight: 280, objectFit: 'cover' }} />
                <button onClick={() => { setImageFile(null); setImagePreview(null) }} style={{ position: 'absolute', top: 8, right: 8, width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: 'white', border: 'none', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>×</button>
              </div>
            ) : (
              <button onClick={() => fileRef.current?.click()} style={{ width: '100%', padding: 16, border: '1.5px dashed #C4B5FD', borderRadius: 12, background: '#FAFAFA', cursor: 'pointer', color: PRIMARY, fontWeight: 600, fontFamily: 'inherit', fontSize: 14 }}>
                + Add Image
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImagePick} style={{ display: 'none' }} />
          </div>
        )}

        {type === 'event' && (
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>Date &amp; Time</label>
            <input type="datetime-local" value={eventDate} onChange={e => setEventDate(e.target.value)} style={inputStyle} />
            <label style={{ ...labelStyle, marginTop: 8 }}>Meeting link (optional)</label>
            <input value={meetingUrl} onChange={e => setMeetingUrl(e.target.value)} placeholder="https://zoom.us/…" style={inputStyle} />
          </div>
        )}

        {type !== 'image' && type !== 'event' && (
          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
            <button onClick={() => fileRef.current?.click()} style={{ flex: 1, background: '#F3F4F6', border: 'none', borderRadius: 10, padding: '8px', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              📷 Add Image
            </button>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImagePick} style={{ display: 'none' }} />
          </div>
        )}

        {subgroups.length > 0 && (
          <div style={{ marginTop: 10 }}>
            <label style={labelStyle}>Post in</label>
            <select value={subgroupId ?? ''} onChange={e => setSubgroupId(e.target.value || null)} style={{ ...inputStyle, appearance: 'none' }}>
              <option value="">Main feed</option>
              {subgroups.map(sg => <option key={sg.id} value={sg.id}>{sg.emoji ?? ''} {sg.name}</option>)}
            </select>
          </div>
        )}

        <button onClick={submit} disabled={posting || !content.trim()} style={{ width: '100%', backgroundColor: PRIMARY, color: 'white', border: 'none', borderRadius: 22, padding: '12px', fontSize: 15, fontWeight: 700, cursor: posting ? 'wait' : 'pointer', opacity: (posting || !content.trim()) ? 0.5 : 1, fontFamily: 'inherit', marginTop: 14 }}>
          {posting ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid #E5E7EB',
  borderRadius: 10,
  padding: '10px 12px',
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  backgroundColor: '#FAFAFA',
  marginBottom: 4,
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#6B7280',
  marginBottom: 4,
}
