'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

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

interface Course {
  id: string
  community_id: string
  title: string
  description: string | null
  cover_emoji: string | null
  cover_image_url: string | null
  lesson_count: number | null
  avg_rating: number | null
  review_count: number | null
  community?: Community
}

interface Profile {
  id: string
  display_name: string | null
  avatar_emoji: string | null
  photo_url: string | null
  bio: string | null
  total_points: number | null
  level: string | null
  is_verified: boolean | null
}

const VERIFIED_NAMES = ['Clarity']
const CATEGORIES = [
  { id: 'all', label: 'All', emoji: '\u2728' },
  { id: 'study', label: 'Study', emoji: '\u{1F4DA}' },
  { id: 'programming', label: 'Programming', emoji: '\u{1F4BB}' },
  { id: 'languages', label: 'Languages', emoji: '\u{1F30D}' },
  { id: 'science', label: 'Science', emoji: '\u{1F52C}' },
  { id: 'arts', label: 'Arts', emoji: '\u{1F3A8}' },
  { id: 'sports', label: 'Sports', emoji: '\u26BD' },
  { id: 'music', label: 'Music', emoji: '\u{1F3B5}' },
  { id: 'gaming', label: 'Gaming', emoji: '\u{1F3AE}' },
  { id: 'general', label: 'General', emoji: '\u{1F4AC}' },
]

function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill="#1D9BF0" />
      <path d="M7.5 12.5 10.5 15.5 16.5 9" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function levelFromPoints(pts: number): { emoji: string; label: string; progress: number } {
  if (pts >= 5000) return { emoji: '\u{1F451}', label: 'Legend', progress: 1 }
  if (pts >= 2000) return { emoji: '\u{1F3C6}', label: 'Expert', progress: (pts - 2000) / 3000 }
  if (pts >= 500) return { emoji: '\u{1F393}', label: 'Scholar', progress: (pts - 500) / 1500 }
  if (pts >= 100) return { emoji: '\u{1F30D}', label: 'Explorer', progress: (pts - 100) / 400 }
  return { emoji: '\u{1F331}', label: 'Newcomer', progress: pts / 100 }
}

export default function HomeClient({ allCommunities }: { allCommunities: Community[] }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [featuredCourses, setFeaturedCourses] = useState<Course[]>([])
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('all')
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) {
        loadProfile(data.user.id)
        loadJoined(data.user.id)
      }
    })
    loadCourses()
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) { loadProfile(session.user.id); loadJoined(session.user.id) }
      else { setProfile(null); setJoinedIds(new Set()) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function loadProfile(uid: string) {
    const tryTables = ['community_profiles', 'profiles']
    for (const table of tryTables) {
      const { data, error } = await supabase.from(table).select('id, display_name, avatar_emoji, photo_url, bio, total_points, level, is_verified').eq('id', uid).maybeSingle()
      if (!error && data) { setProfile(data as Profile); return }
    }
  }

  async function loadJoined(uid: string) {
    const { data } = await supabase.from('community_members').select('community_id').eq('profile_id', uid)
    if (data) setJoinedIds(new Set(data.map((r: any) => r.community_id)))
  }

  async function loadCourses() {
    // Try community_courses first, then courses
    let { data } = await supabase.from('community_courses').select('id, community_id, title, description, cover_emoji, cover_image_url, lesson_count, avg_rating, review_count').limit(30)
    if (!data || data.length === 0) {
      const fb = await supabase.from('courses').select('id, community_id, title, description, emoji, cover_image_url').limit(30)
      data = (fb.data ?? []).map((c: any) => ({ ...c, cover_emoji: c.emoji, lesson_count: 0, avg_rating: 0, review_count: 0 }))
    }
    if (data && data.length > 0) {
      const ids = Array.from(new Set(data.map((c: any) => c.community_id)))
      const { data: comms } = await supabase.from('communities').select('id, name, logo_image_url').in('id', ids)
      const commMap = new Map((comms ?? []).map((c: any) => [c.id, c]))
      setFeaturedCourses(data.map((c: any) => ({ ...c, community: commMap.get(c.community_id) })))
    }
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.refresh()
  }

  const publicCommunities = allCommunities.filter(c => !c.is_private)
  const filtered = publicCommunities.filter(c => {
    const matchSearch = search === '' || c.name.toLowerCase().includes(search.toLowerCase()) || (c.description ?? '').toLowerCase().includes(search.toLowerCase())
    const matchCat = activeCategory === 'all' || (c.category ?? '').toLowerCase() === activeCategory
    return matchSearch && matchCat
  })
  const myComms = filtered.filter(c => joinedIds.has(c.id))
  const discover = filtered.filter(c => !joinedIds.has(c.id))

  const points = profile?.total_points ?? 0
  const lv = levelFromPoints(points)

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#F2F2F7', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>

      {/* Sticky Header */}
      <div style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: 'rgba(242,242,247,0.92)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
        <div style={{ maxWidth: 720, margin: '0 auto', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.6, color: '#111' }}>Community</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {user ? (
              <div style={{ position: 'relative' }}>
                <button onClick={() => setShowMenu(v => !v)} style={{ width: 38, height: 38, borderRadius: '50%', border: 'none', background: profile?.photo_url ? `url(${profile.photo_url}) center/cover` : '#EDE9FE', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden' }}>
                  {!profile?.photo_url && (profile?.avatar_emoji ?? '\u{1F464}')}
                </button>
                {showMenu && (
                  <div style={{ position: 'absolute', right: 0, top: 46, backgroundColor: 'white', borderRadius: 14, boxShadow: '0 8px 28px rgba(0,0,0,0.12)', overflow: 'hidden', minWidth: 180, border: '1px solid #F3F4F6' }}>
                    <Link href="/profile" style={{ display: 'block', padding: '12px 16px', color: '#111', textDecoration: 'none', fontSize: 14, fontWeight: 500, borderBottom: '1px solid #F3F4F6' }}>Profile &amp; Settings</Link>
                    <button onClick={signOut} style={{ width: '100%', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', color: '#EF4444', fontSize: 14, fontWeight: 500, fontFamily: 'inherit' }}>Sign Out</button>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" style={{ color: '#7C3AED', fontWeight: 700, fontSize: 14, textDecoration: 'none', padding: '7px 14px', borderRadius: 18, backgroundColor: 'rgba(124,58,237,0.1)' }}>Sign In</Link>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '16px 16px 40px' }}>

        {/* Profile card (logged in) */}
        {user && profile && (
          <div style={{ background: 'linear-gradient(135deg, #7C3AED, #6366F1)', borderRadius: 22, padding: 18, marginBottom: 18, color: 'white', position: 'relative', overflow: 'hidden', boxShadow: '0 4px 20px rgba(124,58,237,0.22)' }}>
            <div style={{ position: 'absolute', right: -40, top: -40, width: 160, height: 160, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.08)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 12, position: 'relative' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: profile.photo_url ? `url(${profile.photo_url}) center/cover` : 'rgba(255,255,255,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, flexShrink: 0, border: '2px solid rgba(255,255,255,0.3)' }}>
                {!profile.photo_url && (profile.avatar_emoji ?? '\u{1F464}')}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2 }}>
                  <span style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.3 }}>{profile.display_name ?? 'User'}</span>
                  {profile.is_verified && <VerifiedBadge size={16} />}
                </div>
                <div style={{ fontSize: 13, opacity: 0.86, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>{lv.emoji}</span>
                  <span>{lv.label}</span>
                  <span style={{ opacity: 0.6 }}>&middot;</span>
                  <span>{points.toLocaleString()} pts</span>
                </div>
              </div>
            </div>
            <div style={{ height: 5, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.max(4, lv.progress * 100)}%`, backgroundColor: 'white', borderRadius: 4 }} />
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div style={{ position: 'relative', marginBottom: 14 }}>
          <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)' }} width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke="#9CA3AF" strokeWidth="2" />
            <path d="M21 21l-4.35-4.35" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search communities..."
            style={{ width: '100%', borderRadius: 14, paddingLeft: 40, paddingRight: 16, paddingTop: 12, paddingBottom: 12, fontSize: 15, border: '1px solid #E5E7EB', backgroundColor: 'white', outline: 'none', boxSizing: 'border-box', boxShadow: '0 1px 2px rgba(0,0,0,0.04)', fontFamily: 'inherit' }}
          />
        </div>

        {/* Category Pills */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 6, marginBottom: 22, scrollbarWidth: 'none' }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              style={{ flexShrink: 0, padding: '8px 14px', borderRadius: 22, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: activeCategory === cat.id ? 'none' : '1.5px solid #E5E7EB', backgroundColor: activeCategory === cat.id ? '#7C3AED' : 'white', color: activeCategory === cat.id ? 'white' : '#374151', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s', fontFamily: 'inherit' }}
            >
              <span style={{ fontSize: 14 }}>{cat.emoji}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* My Communities */}
        {user && myComms.length > 0 && (
          <section style={{ marginBottom: 26 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#9CA3AF', margin: '0 0 12px' }}>My Communities</h2>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {myComms.map(c => <CommunityCarouselCard key={c.id} community={c} />)}
            </div>
          </section>
        )}

        {/* Featured Classes */}
        {featuredCourses.length > 0 && (
          <section style={{ marginBottom: 26 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#9CA3AF', margin: '0 0 12px' }}>Classes</h2>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
              {featuredCourses.map(course => (
                <Link key={course.id} href={`/community/${course.community_id}`} style={{ flexShrink: 0, width: 220, textDecoration: 'none' }}>
                  <div style={{ borderRadius: 16, overflow: 'hidden', backgroundColor: 'white', border: '1px solid #F3F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
                    <div style={{ height: 100, background: course.cover_image_url ? `url(${course.cover_image_url}) center/cover` : 'linear-gradient(135deg, #A78BFA, #818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>
                      {!course.cover_image_url && (course.cover_emoji ?? '\u{1F4DA}')}
                    </div>
                    <div style={{ padding: 12 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111', marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{course.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#9CA3AF' }}>
                        <span>{course.lesson_count ?? 0} {(course.lesson_count ?? 0) === 1 ? 'lesson' : 'lessons'}</span>
                        {(course.avg_rating ?? 0) > 0 && (
                          <>
                            <span style={{ color: '#D1D5DB' }}>&middot;</span>
                            <span style={{ color: '#F59E0B' }}>{'\u2605'} {(course.avg_rating ?? 0).toFixed(1)}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Discover */}
        {discover.length > 0 && (
          <section style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: '#9CA3AF', margin: '0 0 12px' }}>
              {user && myComms.length > 0 ? 'Discover' : 'Communities'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {discover.map(c => <CommunityCard key={c.id} community={c} />)}
            </div>
          </section>
        )}

        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 20px', color: '#9CA3AF' }}>
            <div style={{ fontSize: 38, marginBottom: 10 }}>{'\u{1F50D}'}</div>
            <p style={{ fontSize: 15, margin: 0 }}>
              {search !== '' ? `No results for "${search}"` : 'No communities yet'}
            </p>
          </div>
        )}

        {!user && (
          <div style={{ marginTop: 30, padding: 20, backgroundColor: 'white', borderRadius: 16, textAlign: 'center', border: '1px solid #F3F4F6', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
            <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 12px' }}>Sign in to see your posts, classes and progress</p>
            <Link href="/login" style={{ display: 'inline-block', backgroundColor: '#7C3AED', color: 'white', textDecoration: 'none', borderRadius: 22, padding: '10px 24px', fontSize: 14, fontWeight: 700 }}>Sign In</Link>
          </div>
        )}
      </div>
    </div>
  )
}

function CommunityCarouselCard({ community: c }: { community: Community }) {
  const isVerified = VERIFIED_NAMES.includes(c.name)
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
            {isVerified && <VerifiedBadge size={12} />}
          </div>
          <div style={{ fontSize: 11, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="#9CA3AF" strokeWidth="2.5" /></svg>
            <span>{c.member_count ?? 0}</span>
          </div>
        </div>
      </div>
    </Link>
  )
}

function CommunityCard({ community: c }: { community: Community }) {
  const isVerified = VERIFIED_NAMES.includes(c.name)
  const isFree = !c.price_type || c.price_type === 'free'
  return (
    <Link href={`/community/${c.id}`} style={{ textDecoration: 'none' }}>
      <div style={{ borderRadius: 18, overflow: 'hidden', backgroundColor: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid #F3F4F6' }}>
        <div style={{ position: 'relative', width: '100%', paddingTop: '65%' }}>
          {c.cover_image_url ? (
            <img src={c.cover_image_url} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, #C4B5FD, #818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 }}>
              {c.emoji ?? '\u{1F30D}'}
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
            {isVerified && <VerifiedBadge size={13} />}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: '#9CA3AF' }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="#9CA3AF" strokeWidth="2.5" /></svg>
            <span>{c.member_count ?? 0}</span>
            {c.category && <span>&middot; {c.category}</span>}
          </div>
        </div>
      </div>
    </Link>
  )
}
