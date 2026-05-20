'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Community {
  id: string
  name: string
  description: string | null
  category: string | null
  emoji: string | null
  cover_image_url: string | null
  logo_image_url: string | null
  member_count: number | null
  price_type: string | null
  is_private: boolean | null
  created_by: string | null
}

const VERIFIED_NAMES = ['Clarity']
const CATEGORIES = ['All', 'Study', 'Programming', 'Languages', 'Science', 'Arts', 'Sports', 'Music', 'Gaming', 'General']

function VerifiedBadge({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#1D9BF0"/>
      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export default function CommunityListClient({ communities }: { communities: Community[] }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) loadJoined(data.user.id)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) loadJoined(session.user.id)
      else setJoinedIds(new Set())
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function loadJoined(userId: string) {
    const { data } = await supabase.from('community_members').select('community_id').eq('profile_id', userId)
    if (data) setJoinedIds(new Set(data.map((r: any) => r.community_id)))
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.refresh()
  }

  const publicCommunities = communities.filter(c => !c.is_private)

  const filtered = publicCommunities.filter(c => {
    const matchesSearch = search === '' || c.name.toLowerCase().includes(search.toLowerCase()) || (c.description ?? '').toLowerCase().includes(search.toLowerCase())
    const matchesCategory = activeCategory === 'All' || (c.category ?? '').toLowerCase() === activeCategory.toLowerCase()
    return matchesSearch && matchesCategory
  })

  const joined = filtered.filter(c => joinedIds.has(c.id))
  const discover = filtered.filter(c => !joinedIds.has(c.id))
  const availableCategories = CATEGORIES.filter(cat => cat === 'All' || publicCommunities.some(c => (c.category ?? '').toLowerCase() === cat.toLowerCase()))

  return (
    <div style={{ backgroundColor: '#F2F2F7', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>

      {/* ââ Header ââ */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(242,242,247,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 22, fontWeight: 700, letterSpacing: -0.5, color: '#111' }}>Community</span>
          {user ? (
            <button onClick={signOut} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 600, fontSize: 15, cursor: 'pointer' }}>Sign Out</button>
          ) : (
            <Link href="/login" style={{ color: '#7C3AED', fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>Sign In</Link>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: '0 auto', padding: '16px 16px 40px' }}>

        {/* ââ Search Bar ââ */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <svg style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#9CA3AF" strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search communitiesâ¦"
            style={{ width: '100%', borderRadius: 12, paddingLeft: 38, paddingRight: 16, paddingTop: 11, paddingBottom: 11, fontSize: 15, border: '1px solid #E5E7EB', backgroundColor: 'white', outline: 'none', boxSizing: 'border-box', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}
          />
        </div>

        {/* ââ Category Pills ââ */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 20, scrollbarWidth: 'none' }}>
          {availableCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              style={{
                flexShrink: 0,
                padding: '7px 16px',
                borderRadius: 20,
                fontSize: 14,
                fontWeight: 500,
                cursor: 'pointer',
                border: activeCategory === cat ? 'none' : '1.5px solid #E5E7EB',
                backgroundColor: activeCategory === cat ? '#7C3AED' : 'white',
                color: activeCategory === cat ? 'white' : '#374151',
                transition: 'all 0.15s'
              }}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ââ My Communities ââ */}
        {joined.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: '#9CA3AF', marginBottom: 12 }}>My Communities</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {joined.map(c => <CommunityCard key={c.id} community={c} isJoined />)}
            </div>
          </section>
        )}

        {/* ââ Discover ââ */}
        {discover.length > 0 && (
          <section style={{ marginBottom: 24 }}>
            <p style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.6, color: '#9CA3AF', marginBottom: 12 }}>
              {user && joined.length > 0 ? 'Discover' : 'Communities'}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {discover.map(c => <CommunityCard key={c.id} community={c} />)}
            </div>
          </section>
        )}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9CA3AF' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>ð</div>
            <p style={{ fontSize: 15, margin: 0 }}>
              {search !== '' ? `No results for "${search}"` : 'No communities yet'}
            </p>
          </div>
        )}

        {user && discover.length === 0 && joined.length > 0 && search === '' && activeCategory === 'All' && (
          <p style={{ textAlign: 'center', fontSize: 14, color: '#9CA3AF', padding: '16px 0' }}>You've joined all available communities ð</p>
        )}
      </div>
    </div>
  )
}

function CommunityCard({ community: c, isJoined }: { community: Community; isJoined?: boolean }) {
  const isVerified = VERIFIED_NAMES.includes(c.name)
  const isFree = !c.price_type || c.price_type === 'free'

  return (
    <Link href={`/community/${c.id}`} style={{ textDecoration: 'none' }}>
      <div style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #F3F4F6', cursor: 'pointer' }}>
        {/* Cover image */}
        <div style={{ position: 'relative', width: '100%', paddingTop: '65%' }}>
          {c.cover_image_url ? (
            <img src={c.cover_image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 }}>
              {c.emoji ?? 'ð'}
            </div>
          )}
          {/* Logo in bottom-left */}
          {c.logo_image_url && (
            <div style={{ position: 'absolute', bottom: 8, left: 8, width: 28, height: 28, borderRadius: 7, overflow: 'hidden', border: '1.5px solid white' }}>
              <img src={c.logo_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          {/* Price badge */}
          {isFree && (
            <div style={{ position: 'absolute', top: 8, right: 8, backgroundColor: '#22C55E', borderRadius: 7, padding: '3px 8px' }}>
              <span style={{ color: 'white', fontSize: 11, fontWeight: 700 }}>Free</span>
            </div>
          )}
        </div>
        {/* Card body */}
        <div style={{ padding: '10px 12px 12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</span>
            {isVerified && <VerifiedBadge size={14} />}
          </div>
          {isJoined ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#22C55E"/>
                <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 12, color: '#22C55E', fontWeight: 600 }}>Member</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="9" cy="7" r="4" stroke="#9CA3AF" strokeWidth="2"/>
              </svg>
              <span style={{ fontSize: 12, color: '#9CA3AF' }}>{c.member_count ?? 0}</span>
              {c.category && <span style={{ fontSize: 12, color: '#9CA3AF' }}>Â· {c.category}</span>}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
