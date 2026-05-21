'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/profile-context'
import { Avatar } from './_components/Avatar'
import { VerifiedBadge } from './_components/VerifiedBadge'
import { FONT_FAMILY, BG_COLOR, PRIMARY, levelFromPoints } from '@/lib/helpers'
import { CATEGORIES } from '@/lib/types'
import type { Community } from '@/lib/types'

interface HomeProps {
  allCommunities: Community[]
  verifiedCreatorIds: Set<string>
}

const CATS = [{ id: 'all', label: 'All', emoji: '✨' }, ...CATEGORIES.map(c => ({ id: c.id, label: c.label, emoji: c.emoji }))]

export default function HomeClient({ allCommunities, verifiedCreatorIds }: { allCommunities: Community[]; verifiedCreatorIds: string[] }) {
  const { user, profile, signOut } = useProfile()
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [showMenu, setShowMenu] = useState(false)

  const verifiedSet = new Set(verifiedCreatorIds)

  useEffect(() => {
    if (!profile) { setJoinedIds(new Set()); return }
    supabase.from('community_members').select('community_id').eq('profile_id', profile.id).then(({ data }) => {
      if (data) setJoinedIds(new Set(data.map(r => r.community_id)))
    })
  }, [profile])

  const publicCommunities = allCommunities.filter(c => !c.is_private)
  const filtered = publicCommunities.filter(c => {
    const ms = search === '' || c.name.toLowerCase().includes(search.toLowerCase()) || (c.description ?? '').toLowerCase().includes(search.toLowerCase())
    const mc = activeCategory === 'all' || (c.category ?? '').toLowerCase() === activeCategory
    return ms && mc
  })
  const myComms = filtered.filter(c => joinedIds.has(c.id))
  const discover = filtered.filter(c => !joinedIds.has(c.id))
  const points = profile?.total_points ?? 0
  const lv = levelFromPoints(points)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: BG_COLOR, fontFamily: FONT_FAMILY }}>
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(242,242,247,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.6, color: '#111' }}>Community</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {user ? (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowMenu(v => !v)} style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: 'transparent', cursor: 'pointer', padding: 0 }}>
                  <Avatar photoUrl={profile?.avatar_url} emoji={profile?.avatar_emoji} size={38} />
                </button>
                {showMenu && (
                  <>
                    <div onClick={() => setShowMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 11 }} />
                    <div style={{ position: 'absolute', right: 0, top: 46, backgroundColor: 'white', borderRadius: 14, boxShadow: '0 8px 28px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: 200, border: '1px solid #F3F4F6', zIndex: 12 }}>
                      <Link href="/profile" style={{ display: 'block', padding: '12px 16px', color: '#111', textDecoration: 'none', fontSize: 14, fontWeight: 500, borderBottom: '1px solid #F3F4F6' }}>
                        Profile &amp; Settings
                      </Link>
                      <button onClick={signOut} style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#EF4444', fontSize: 14, fontWeight: 500, fontFamily: 'inherit' }}>
                        Sign Out
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link href="/login" style={{ color: PRIMARY, fontWeight: 700, fontSize: 14, textDecoration: 'none', padding: '7px 14px', borderRadius: 18, backgroundColor: 'rgba(124,58,237,0.1)' }}>Sign In</Link>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 40px' }}>
        {user && profile && (
          <div style={{ background: 'linear-gradient(135deg, #7C3AED, #6366F1)', borderRadius: 22, padding: 18, marginBottom: 18, color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 20px rgba(124,58,237,0.22)' }}>
            <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, position: 'relative' }}>
              <Avatar photoUrl={profile.avatar_url} emoji={profile.avatar_emoji} size={60} border="2px solid rgba(255,255,255,0.3)" bgColor="rgba(255,255,255,0.18)" />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>{profile.display_name ?? 'User'}</span>
                  {profile.is_verified && <VerifiedBadge size={16} />}
                </div>
                <div style={{ fontSize: 13, opacity: 0.86, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{lv.emoji}</span>
                  <span>{lv.label}</span>
                  <span style={{ opacity: 0.6 }}>·</span>
                  <span>{points.toLocaleString()} pts</span>
                </div>
              </div>
            </div>
            <div style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(4, lv.progress * 100)}%`, backgroundColor: 'white', borderRadius: 4 }} />
            </div>
          </div>
        )}

        {/* Search */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#9CA3AF" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search communities…" style={{ width: '100%', borderRadius: 14, paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, border: '1px solid #E5E7EB', backgroundColor: 'white', outline: 'none', boxSizing: 'border-box', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', fontFamily: 'inherit' }} />
        </div>

        {/* Categories */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 22, scrollbarWidth: 'none' }}>
          {CATS.map(cat => (
            <button key={cat.id} onClick={() => setActiveCategory(cat.id)} style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 22, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: activeCategory === cat.id ? 'none' : '1.5px solid #E5E7EB', backgroundColor: activeCategory === cat.id ? PRIMARY : 'white', color: activeCategory === cat.id ? 'white' : '#374151', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', fontFamily: 'inherit' }}>
              <span style={{ fontSize: 14 }}>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {user && myComms.length > 0 && (
          <section style={{ marginBottom: 26 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#9CA3AF', margin: '0 0 12px' }}>My Communities</h2>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {myComms.map(c => <CarouselCard key={c.id} community={c} verified={verifiedSet.has(c.created_by ?? '')} />)}
            </div>
          </section>
        )}

        {discover.length > 0 && (
          <section style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#9CA3AF', margin: '0 0 12px' }}>
              {user && myComms.length > 0 ? 'Discover' : 'Communities'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {discover.map(c => <Card key={c.id} community={c} verified={verifiedSet.has(c.created_by ?? '')} />)}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9CA3AF' }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>🔍</div>
            <p style={{ fontSize: 15, margin: 0 }}>
              {search !== '' ? `No results for "${search}"` : 'No communities yet'}
            </p>
          </div>
        )}

        {!user && (
          <div style={{ marginTop: 30, padding: 20, backgroundColor: 'white', borderRadius: 16, textAlign: 'center', border: '1px solid #F3F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 12px' }}>Sign in to see your posts, classes and progress</p>
            <Link href="/login" style={{ display: 'inline-block', backgroundColor: PRIMARY, color: 'white', textDecoration: 'none', borderRadius: 22, padding: '10px 24px', fontSize: 14, fontWeight: 700 }}>Sign In</Link>
          </div>
        )}
      </div>
    </div>
  )
}

function CarouselCard({ community: c, verified }: { community: Community; verified: boolean }) {
  return (
    <Link href={`/community/${c.id}`} style={{ flexShrink: 0, width: 160, textDecoration: 'none' }}>
      <div style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: 'white', border: '1px solid #F3F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ height: 100, position: 'relative', background: c.cover_image_url ? `url(${c.cover_image_url}) center/cover` : 'linear-gradient(135deg, #C4B5FD, #818CF8)' }}>
          {c.logo_image_url && (
            <div style={{ position: 'absolute', bottom: 8, left: 8, width: 30, height: 30, borderRadius: 8, overflow: 'hidden', border: '1.5px solid white' }}>
              <img src={c.logo_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
        </div>
        <div style={{ padding: '10px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
            {verified && <VerifiedBadge size={12} />}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>👥</span>
            <span>{c.member_count ?? 0}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function Card({ community: c, verified }: { community: Community; verified: boolean }) {
  const isFree = !c.price_type || c.price_type === 'free'
  return (
    <Link href={`/community/${c.id}`} style={{ textDecoration: 'none' }}>
      <div style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #F3F4F6' }}>
        <div style={{ position: 'relative', width: '100%', paddingTop: '65%' }}>
          {c.cover_image_url ? (
            <img src={c.cover_image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #C4B5FD, #818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>
              {c.emoji ?? '🌍'}
            </div>
          )}
          {c.logo_image_url && (
            <div style={{ position: 'absolute', bottom: 8, left: 8, width: 30, height: 30, borderRadius: 8, overflow: 'hidden', border: '1.5px solid white' }}>
              <img src={c.logo_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          {isFree && (
            <div style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#22C55E', borderRadius: 7, padding: '3px 9px' }}>
              <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>Free</span>
            </div>
          )}
        </div>
        <div style={{ padding: '10px 12px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
            {verified && <VerifiedBadge size={13} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9CA3AF' }}>
            <span>👥 {c.member_count ?? 0}</span>
            {c.category && <span>· {c.category}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}
