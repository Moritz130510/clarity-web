'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

type Tab = 'feed' | 'classroom' | 'members' | 'leaderboard'

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
  created_by: string | null
}

interface Post {
  id: string
  content: string | null
  title: string | null
  image_url: string | null
  created_at: string
  author_id: string
  author_name: string
  author_avatar: string | null
  author_photo: string | null
  author_verified: boolean
  post_type: string | null
  event_date: string | null
  meeting_url: string | null
  is_pinned: boolean
  like_count: number
  comment_count: number
  is_liked: boolean
}

interface Comment {
  id: string
  content: string
  created_at: string
  author_id: string
  author_name: string
  author_avatar: string | null
  parent_comment_id: string | null
}

interface Member {
  profile_id: string
  role: string
  display_name: string
  avatar_emoji: string
  photo_url: string | null
  total_points: number
  is_verified: boolean
}

interface Course {
  id: string
  title: string
  description: string | null
  cover_emoji: string | null
  cover_image_url: string | null
  lesson_count: number
  avg_rating: number
  review_count: number
}

interface Lesson {
  id: string
  title: string
  content: string | null
  video_url: string | null
  image_url: string | null
  meeting_url: string | null
  is_free_preview: boolean
  duration_minutes: number | null
  order_index: number
}

const VERIFIED_NAMES = ['Clarity']
const ICON_CHAT = '\u{1F4AC}'
const ICON_CROWN = '\u{1F451}'
const ICON_USER = '\u{1F464}'
const ICON_BOOK = '\u{1F4DA}'
const ICON_PIN = '\u{1F4CC}'
const ICON_HEART = '\u2764'
const ICON_HEART_OUT = '\u{1F90D}'
const ICON_NOTE = '\u{1F4DD}'
const ICON_PARTY = '\u{1F389}'
const ICON_CALENDAR = '\u{1F4C5}'
const ICON_GLOBE = '\u{1F30D}'

function VerifiedBadge({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" style={{ display: 'inline-block', flexShrink: 0 }}>
      <circle cx="12" cy="12" r="11" fill="#1D9BF0" />
      <path d="M7.5 12.5 10.5 15.5 16.5 9" stroke="white" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d`
  return new Date(dateStr).toLocaleDateString()
}

export default function CommunityDetailClient({ community }: { community: Community }) {
  const [tab, setTab] = useState<Tab>('feed')
  const [user, setUser] = useState<User | null>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [memberCount, setMemberCount] = useState(community.member_count ?? 0)
  const [joining, setJoining] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)

  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [postingPost, setPostingPost] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [showComposer, setShowComposer] = useState(false)

  const [courses, setCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [lessonsLoading, setLessonsLoading] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const isVerified = VERIFIED_NAMES.includes(community.name)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) checkMembership(data.user.id)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) checkMembership(session.user.id)
      else { setIsJoined(false); setUserRole(null) }
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (tab === 'feed') loadPosts()
    else if (tab === 'classroom') { setSelectedCourse(null); setSelectedLesson(null); loadCourses() }
    else if (tab === 'members' || tab === 'leaderboard') loadMembers()
  }, [tab, user])

  async function checkMembership(uid: string) {
    const { data } = await supabase
      .from('community_members')
      .select('profile_id, role')
      .eq('community_id', community.id)
      .eq('profile_id', uid)
      .maybeSingle()
    setIsJoined(!!data)
    setUserRole(data?.role ?? null)
  }

  async function handleJoinLeave() {
    if (!user) { window.location.href = '/login'; return }
    setJoining(true)
    if (isJoined) {
      await supabase.from('community_members').delete().eq('community_id', community.id).eq('profile_id', user.id)
      setIsJoined(false)
      setMemberCount(n => Math.max(0, n - 1))
      setUserRole(null)
    } else {
      await supabase.from('community_members').insert({ community_id: community.id, profile_id: user.id, role: 'member' })
      setIsJoined(true)
      setMemberCount(n => n + 1)
      setUserRole('member')
    }
    setJoining(false)
  }

  async function loadPosts() {
    setPostsLoading(true)
    const { data } = await supabase
      .from('community_posts')
      .select('*')
      .eq('community_id', community.id)
      .order('is_pinned', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false })
    if (data) {
      const likeTables = ['community_post_likes', 'post_likes']
      const commentTables = ['community_comments', 'post_comments']
      const enriched: Post[] = await Promise.all(data.map(async (p: any) => {
        let likeCount = 0, isLiked = false, cc = 0
        for (const t of likeTables) {
          const r = await supabase.from(t).select('*', { count: 'exact', head: true }).eq('post_id', p.id)
          if (!r.error) { likeCount = r.count ?? 0; break }
        }
        if (user) {
          for (const t of likeTables) {
            const r = await supabase.from(t).select('id').eq('post_id', p.id).eq('profile_id', user.id).maybeSingle()
            if (!r.error) { isLiked = !!r.data; break }
          }
        }
        for (const t of commentTables) {
          const r = await supabase.from(t).select('*', { count: 'exact', head: true }).eq('post_id', p.id)
          if (!r.error) { cc = r.count ?? 0; break }
        }
        // Author info: denormalized first, then profile lookup
        let authorName = p.author_display_name ?? null
        let authorAvatar = p.author_avatar_emoji ?? null
        let authorPhoto = p.author_photo_url ?? null
        let authorVerified = p.author_is_verified ?? false
        if (!authorName && p.author_id) {
          for (const t of ['community_profiles', 'profiles']) {
            const r = await supabase.from(t).select('display_name, avatar_emoji, photo_url, is_verified').eq('id', p.author_id).maybeSingle()
            if (!r.error && r.data) {
              authorName = r.data.display_name
              authorAvatar = r.data.avatar_emoji
              authorPhoto = r.data.photo_url
              authorVerified = r.data.is_verified ?? false
              break
            }
          }
        }
        return {
          id: p.id, content: p.content ?? null, title: p.title ?? null, image_url: p.image_url ?? null,
          created_at: p.created_at, author_id: p.author_id,
          author_name: authorName ?? 'Member',
          author_avatar: authorAvatar, author_photo: authorPhoto, author_verified: !!authorVerified,
          post_type: p.post_type ?? 'text', event_date: p.event_date ?? null, meeting_url: p.meeting_url ?? null,
          is_pinned: !!p.is_pinned, like_count: likeCount, comment_count: cc, is_liked: isLiked,
        }
      }))
      setPosts(enriched)
    }
    setPostsLoading(false)
  }

  async function loadCourses() {
    setCoursesLoading(true)
    let data: any[] = []
    const r1 = await supabase.from('community_courses').select('id, title, description, cover_emoji, cover_image_url, lesson_count, avg_rating, review_count').eq('community_id', community.id).order('order_index', { ascending: true, nullsFirst: false })
    if (!r1.error && r1.data) data = r1.data
    else {
      const r2 = await supabase.from('courses').select('id, title, description, emoji, cover_image_url').eq('community_id', community.id)
      if (!r2.error && r2.data) data = r2.data.map((c: any) => ({ ...c, cover_emoji: c.emoji, lesson_count: 0, avg_rating: 0, review_count: 0 }))
    }
    setCourses(data as Course[])
    setCoursesLoading(false)
  }

  async function loadLessons(courseId: string) {
    setLessonsLoading(true)
    let data: any[] = []
    const r1 = await supabase.from('community_lessons').select('id, title, content, video_url, image_url, meeting_url, is_free_preview, duration_minutes, order_index').eq('course_id', courseId).order('order_index', { ascending: true, nullsFirst: false })
    if (!r1.error && r1.data) data = r1.data
    else {
      const r2 = await supabase.from('lessons').select('id, title, content, video_url, lesson_order').eq('course_id', courseId).order('lesson_order', { ascending: true })
      if (!r2.error && r2.data) data = r2.data.map((l: any) => ({ ...l, image_url: null, meeting_url: null, is_free_preview: true, duration_minutes: null, order_index: l.lesson_order }))
    }
    setLessons(data as Lesson[])
    setLessonsLoading(false)
  }

  async function loadMembers() {
    setMembersLoading(true)
    const { data: rels } = await supabase.from('community_members').select('profile_id, role, points, level').eq('community_id', community.id)
    if (rels && rels.length > 0) {
      const ids = rels.map((r: any) => r.profile_id)
      let profiles: any[] = []
      for (const t of ['community_profiles', 'profiles']) {
        const r = await supabase.from(t).select('id, display_name, avatar_emoji, photo_url, total_points, is_verified').in('id', ids)
        if (!r.error && r.data) { profiles = r.data; break }
      }
      const pMap = new Map(profiles.map(p => [p.id, p]))
      const combined: Member[] = rels.map((r: any) => {
        const p = pMap.get(r.profile_id) ?? {}
        return {
          profile_id: r.profile_id, role: r.role,
          display_name: p.display_name ?? 'Member',
          avatar_emoji: p.avatar_emoji ?? ICON_USER,
          photo_url: p.photo_url ?? null,
          total_points: p.total_points ?? r.points ?? 0,
          is_verified: p.is_verified ?? false,
        }
      })
      combined.sort((a, b) => {
        if (a.role === 'admin' && b.role !== 'admin') return -1
        if (b.role === 'admin' && a.role !== 'admin') return 1
        return (b.total_points ?? 0) - (a.total_points ?? 0)
      })
      setMembers(combined)
    } else setMembers([])
    setMembersLoading(false)
  }

  async function handlePostSubmit() {
    if (!user || !newPostContent.trim()) return
    setPostingPost(true)
    let info: any = {}
    for (const t of ['community_profiles', 'profiles']) {
      const r = await supabase.from(t).select('display_name, avatar_emoji, photo_url, is_verified').eq('id', user.id).maybeSingle()
      if (!r.error && r.data) { info = r.data; break }
    }
    await supabase.from('community_posts').insert({
      community_id: community.id, author_id: user.id, content: newPostContent.trim(), post_type: 'text',
      author_display_name: info.display_name ?? user.email?.split('@')[0] ?? 'Member',
      author_avatar_emoji: info.avatar_emoji ?? ICON_USER,
      author_photo_url: info.photo_url ?? null,
      author_is_verified: info.is_verified ?? false,
    })
    setNewPostContent('')
    setShowComposer(false)
    await loadPosts()
    setPostingPost(false)
  }

  async function handleLike(postId: string) {
    if (!user) { window.location.href = '/login'; return }
    const post = posts.find(p => p.id === postId)
    if (!post) return
    if (post.is_liked) {
      for (const t of ['community_post_likes', 'post_likes']) {
        const r = await supabase.from(t).delete().eq('post_id', postId).eq('profile_id', user.id)
        if (!r.error) break
      }
    } else {
      for (const t of ['community_post_likes', 'post_likes']) {
        const r = await supabase.from(t).insert({ post_id: postId, profile_id: user.id })
        if (!r.error) break
      }
    }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? Math.max(0, p.like_count - 1) : p.like_count + 1 } : p))
  }

  async function loadComments(postId: string) {
    let data: any[] = []
    for (const t of ['community_comments', 'post_comments']) {
      const r = await supabase.from(t).select('*').eq('post_id', postId).order('created_at', { ascending: true })
      if (!r.error && r.data) { data = r.data; break }
    }
    if (!data.length) return setComments(p => ({ ...p, [postId]: [] }))
    const authorIds = Array.from(new Set(data.map((c: any) => c.author_id).filter(Boolean)))
    let pMap = new Map<string, any>()
    if (authorIds.length > 0) {
      for (const t of ['community_profiles', 'profiles']) {
        const r = await supabase.from(t).select('id, display_name, avatar_emoji').in('id', authorIds)
        if (!r.error && r.data) { pMap = new Map(r.data.map((p: any) => [p.id, p])); break }
      }
    }
    const enriched: Comment[] = data.map((c: any) => {
      const prof = pMap.get(c.author_id) ?? {}
      return {
        id: c.id, content: c.content, created_at: c.created_at, author_id: c.author_id,
        author_name: c.author_display_name ?? prof.display_name ?? 'Member',
        author_avatar: c.author_avatar_emoji ?? prof.avatar_emoji ?? null,
        parent_comment_id: c.parent_comment_id ?? null,
      }
    })
    setComments(prev => ({ ...prev, [postId]: enriched }))
  }

  async function handleComment(postId: string) {
    if (!user || !commentInputs[postId]?.trim()) return
    let info: any = {}
    for (const t of ['community_profiles', 'profiles']) {
      const r = await supabase.from(t).select('display_name, avatar_emoji').eq('id', user.id).maybeSingle()
      if (!r.error && r.data) { info = r.data; break }
    }
    for (const t of ['community_comments', 'post_comments']) {
      const r = await supabase.from(t).insert({
        post_id: postId, author_id: user.id, content: commentInputs[postId].trim(),
        author_display_name: info.display_name ?? user.email?.split('@')[0] ?? 'Member',
        author_avatar_emoji: info.avatar_emoji ?? ICON_USER,
      })
      if (!r.error) break
    }
    setCommentInputs(prev => ({ ...prev, [postId]: '' }))
    await loadComments(postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
  }

  function toggleComments(postId: string) {
    setExpandedComments(prev => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId)
      else { next.add(postId); loadComments(postId) }
      return next
    })
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'feed', label: 'Feed' },
    { id: 'classroom', label: 'Classroom' },
    { id: 'members', label: 'Members' },
    { id: 'leaderboard', label: 'Leaderboard' },
  ]

  return (
    <div style={{ backgroundColor: '#F2F2F7', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
      {/* Cover */}
      <div style={{ position: 'relative', height: 230, overflow: 'hidden' }}>
        {community.cover_image_url ? (
          <img src={community.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)' }} />
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.55) 100%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>{community.name}</span>
            {isVerified && <VerifiedBadge size={18} />}
          </div>
          <div style={{ width: 36, height: 36 }} />
        </div>
        <div style={{ position: 'absolute', bottom: 14, left: 16, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', border: '2.5px solid white', flexShrink: 0, backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
            {community.logo_image_url ? (
              <img src={community.logo_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span>{community.emoji ?? ICON_GLOBE}</span>
            )}
          </div>
        </div>
      </div>

      {/* Info card */}
      <div style={{ backgroundColor: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#F3F4F6', borderRadius: 20, padding: '5px 12px' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{community.category ?? 'general'}</span>
            </div>
            {userRole === 'admin' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#FEF3C7', borderRadius: 20, padding: '5px 12px' }}>
                <span style={{ fontSize: 13 }}>{ICON_CROWN}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>Admin</span>
              </div>
            )}
          </div>
          <button onClick={handleJoinLeave} disabled={joining} style={{ padding: '8px 22px', borderRadius: 22, border: isJoined ? '1.5px solid #E5E7EB' : 'none', backgroundColor: isJoined ? 'white' : '#7C3AED', color: isJoined ? '#374151' : 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: joining ? 0.7 : 1, fontFamily: 'inherit' }}>
            {joining ? '...' : isJoined ? 'Joined' : (user ? 'Join' : 'Sign in to Join')}
          </button>
        </div>
        {community.description && (
          <div style={{ padding: '0 16px 14px' }}>
            <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.55, margin: 0 }}>
              {descExpanded ? community.description : community.description.slice(0, 140) + (community.description.length > 140 ? '...' : '')}
              {community.description.length > 140 && (
                <button onClick={() => setDescExpanded(e => !e)} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0, marginLeft: 4, fontFamily: 'inherit' }}>
                  {descExpanded ? 'Less' : 'Show more'}
                </button>
              )}
            </p>
          </div>
        )}
        <div style={{ display: 'flex', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" /><circle cx="9" cy="7" r="4" stroke="#6B7280" strokeWidth="2" /></svg>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>{memberCount}</span>
            </div>
            <span style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Members</span>
          </div>
          <div style={{ width: 1, backgroundColor: '#F3F4F6' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>{posts.length}</span>
            </div>
            <span style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Posts</span>
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ backgroundColor: 'white', display: 'flex', borderBottom: '1px solid #E5E7EB', overflowX: 'auto', scrollbarWidth: 'none', position: 'sticky', top: 0, zIndex: 5 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, minWidth: 100, padding: '14px 4px', fontSize: 14, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? '#111' : '#9CA3AF', background: 'none', border: 'none', borderBottom: tab === t.id ? '2.5px solid #7C3AED' : '2.5px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ padding: 16, maxWidth: 720, margin: '0 auto', paddingBottom: 100 }}>

        {/* FEED */}
        {tab === 'feed' && (
          <div>
            {!user && (
              <div style={{ backgroundColor: 'white', borderRadius: 16, padding: 18, marginBottom: 14, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 12px' }}>Sign in to post, like, and comment</p>
                <Link href="/login" style={{ display: 'inline-block', backgroundColor: '#7C3AED', color: 'white', textDecoration: 'none', borderRadius: 22, padding: '9px 22px', fontSize: 14, fontWeight: 700 }}>Sign In</Link>
              </div>
            )}
            {postsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF', fontSize: 14 }}>
                <div style={{ fontSize: 42, marginBottom: 10 }}>{ICON_NOTE}</div>
                <p style={{ margin: 0, fontSize: 15 }}>No posts yet</p>
              </div>
            ) : posts.map(post => (
              <div key={post.id} style={{ backgroundColor: 'white', borderRadius: 16, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6', overflow: 'hidden' }}>
                {post.is_pinned && (
                  <div style={{ backgroundColor: '#FEF3C7', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12 }}>{ICON_PIN}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>Pinned</span>
                  </div>
                )}
                {post.post_type === 'announcement' && <div style={{ backgroundColor: '#FFEDD5', padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#9A3412' }}>Announcement</div>}
                {post.post_type === 'question' && <div style={{ backgroundColor: '#DBEAFE', padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#1E40AF' }}>Question</div>}
                {post.post_type === 'win' && <div style={{ backgroundColor: '#FEF3C7', padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#92400E' }}>Win {ICON_PARTY}</div>}
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
                      {post.author_photo ? <img src={post.author_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (post.author_avatar ?? ICON_USER)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{post.author_name}</div>
                        {post.author_verified && <VerifiedBadge size={13} />}
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{timeAgo(post.created_at)}</div>
                    </div>
                  </div>
                  {post.title && <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#111' }}>{post.title}</h3>}
                  {post.content && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' }}>{post.content}</p>}
                  {post.image_url && <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 10, marginTop: 10, objectFit: 'cover' }} />}
                  {post.event_date && (
                    <div style={{ marginTop: 10, padding: 10, backgroundColor: '#F3F4F6', borderRadius: 10, fontSize: 13, color: '#374151' }}>
                      {ICON_CALENDAR} {new Date(post.event_date).toLocaleString()}
                    </div>
                  )}
                  {post.meeting_url && (
                    <a href={post.meeting_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 10, padding: '8px 16px', backgroundColor: '#10B981', color: 'white', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Join Now {'\u2192'}</a>
                  )}
                  <div style={{ display: 'flex', gap: 18, marginTop: 12 }}>
                    <button onClick={() => handleLike(post.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: post.is_liked ? '#EF4444' : '#9CA3AF', fontWeight: post.is_liked ? 700 : 500, padding: 0, fontFamily: 'inherit' }}>
                      <span style={{ fontSize: 17 }}>{post.is_liked ? ICON_HEART : ICON_HEART_OUT}</span> {post.like_count}
                    </button>
                    <button onClick={() => toggleComments(post.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', padding: 0, fontFamily: 'inherit' }}>
                      <span style={{ fontSize: 16 }}>{ICON_CHAT}</span> {post.comment_count}
                    </button>
                  </div>
                </div>
                {expandedComments.has(post.id) && (
                  <div style={{ borderTop: '1px solid #F3F4F6', padding: '12px 14px', backgroundColor: '#FAFAFA' }}>
                    {(comments[post.id] ?? []).map(c => (
                      <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{c.author_avatar ?? ICON_USER}</div>
                        <div style={{ flex: 1, backgroundColor: 'white', borderRadius: 10, padding: '8px 12px', border: '1px solid #F3F4F6' }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 2 }}>{c.author_name}</div>
                          <div style={{ fontSize: 13, color: '#4B5563' }}>{c.content}</div>
                          <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>{timeAgo(c.created_at)}</div>
                        </div>
                      </div>
                    ))}
                    {user && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                        <input value={commentInputs[post.id] ?? ''} onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleComment(post.id)} placeholder="Write a comment..." style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 22, padding: '8px 14px', fontSize: 13, outline: 'none', backgroundColor: 'white', fontFamily: 'inherit' }} />
                        <button onClick={() => handleComment(post.id)} style={{ backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: 22, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Send</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            {user && isJoined && (
              <>
                <button onClick={() => setShowComposer(true)} style={{ position: 'fixed', right: 20, bottom: 24, width: 56, height: 56, borderRadius: '50%', backgroundColor: '#7C3AED', color: 'white', border: 'none', boxShadow: '0 4px 16px rgba(124,58,237,0.4)', fontSize: 28, fontWeight: 300, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 20, fontFamily: 'inherit', lineHeight: 1 }}>+</button>
                {showComposer && (
                  <div onClick={() => setShowComposer(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                    <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, backgroundColor: 'white', borderRadius: '20px 20px 0 0', padding: 18, boxSizing: 'border-box' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>New Post</span>
                        <button onClick={() => setShowComposer(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1, fontFamily: 'inherit' }}>{'\u00D7'}</button>
                      </div>
                      <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)} placeholder="Share something with the community..." rows={4} autoFocus style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: 12, padding: 12, fontSize: 14, outline: 'none', resize: 'none', backgroundColor: '#FAFAFA', fontFamily: 'inherit', lineHeight: 1.5, marginBottom: 12 }} />
                      <button onClick={handlePostSubmit} disabled={postingPost || !newPostContent.trim()} style={{ width: '100%', backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: 22, padding: '12px', fontSize: 15, fontWeight: 700, cursor: postingPost ? 'wait' : 'pointer', opacity: (postingPost || !newPostContent.trim()) ? 0.5 : 1, fontFamily: 'inherit' }}>{postingPost ? 'Posting...' : 'Post'}</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* CLASSROOM */}
        {tab === 'classroom' && (
          <div>
            {selectedLesson ? (
              <div>
                <button onClick={() => setSelectedLesson(null)} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#7C3AED', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '0 0 14px', marginLeft: -4, fontFamily: 'inherit' }}>{'\u2190'} Back to lessons</button>
                <div style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6' }}>
                  {selectedLesson.image_url ? <img src={selectedLesson.image_url} alt="" style={{ width: '100%', height: 220, objectFit: 'cover' }} /> : <div style={{ height: 8, background: 'linear-gradient(90deg, #7C3AED, #6366F1)' }} />}
                  <div style={{ padding: 18 }}>
                    <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 800, color: '#111', letterSpacing: -0.4 }}>{selectedLesson.title}</h1>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
                      {selectedLesson.duration_minutes && <span style={{ fontSize: 12, backgroundColor: '#F3F4F6', borderRadius: 6, padding: '4px 10px', fontWeight: 600, color: '#4B5563' }}>{selectedLesson.duration_minutes} min</span>}
                      {selectedLesson.is_free_preview && <span style={{ fontSize: 12, backgroundColor: '#D1FAE5', color: '#065F46', borderRadius: 6, padding: '4px 10px', fontWeight: 700 }}>Free Preview</span>}
                    </div>
                    {selectedLesson.meeting_url && <a href={selectedLesson.meeting_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', backgroundColor: '#10B981', color: 'white', textDecoration: 'none', borderRadius: 22, padding: '10px 22px', fontSize: 14, fontWeight: 700, marginBottom: 14 }}>Join Live Class {'\u2192'}</a>}
                    {selectedLesson.video_url && (() => {
                      const m = selectedLesson.video_url!.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{11})/)
                      if (m) return (
                        <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, marginBottom: 14, borderRadius: 10, overflow: 'hidden' }}>
                          <iframe src={`https://www.youtube.com/embed/${m[1]}`} title={selectedLesson.title} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }} allowFullScreen />
                        </div>
                      )
                      return <a href={selectedLesson.video_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', backgroundColor: '#7C3AED', color: 'white', borderRadius: 22, padding: '10px 22px', fontSize: 14, fontWeight: 700, textDecoration: 'none', marginBottom: 14 }}>Watch video {'\u2192'}</a>
                    })()}
                    {selectedLesson.content && <div style={{ fontSize: 15, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{selectedLesson.content}</div>}
                  </div>
                </div>
              </div>
            ) : selectedCourse ? (
              <div>
                <button onClick={() => { setSelectedCourse(null); setLessons([]) }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#7C3AED', fontSize: 14, fontWeight: 700, cursor: 'pointer', padding: '0 0 14px', marginLeft: -4, fontFamily: 'inherit' }}>{'\u2190'} Back to Courses</button>
                <div style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6', marginBottom: 14 }}>
                  {selectedCourse.cover_image_url && <img src={selectedCourse.cover_image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }} />}
                  <div style={{ padding: 16 }}>
                    <h2 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 800, color: '#111' }}>{selectedCourse.title}</h2>
                    {selectedCourse.description && <p style={{ margin: 0, fontSize: 14, color: '#6B7280', lineHeight: 1.5 }}>{selectedCourse.description}</p>}
                  </div>
                </div>
                {lessonsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
                ) : lessons.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: '#9CA3AF', fontSize: 14 }}>No lessons yet</div>
                ) : lessons.map((lesson, i) => (
                  <button key={lesson.id} onClick={() => setSelectedLesson(lesson)} style={{ width: '100%', backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#7C3AED', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{i + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{lesson.title}</div>
                      {lesson.duration_minutes && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{lesson.duration_minutes} min</div>}
                    </div>
                    {lesson.video_url && <span style={{ fontSize: 12, color: '#7C3AED', backgroundColor: '#EDE9FE', borderRadius: 6, padding: '3px 9px', fontWeight: 700 }}>Video</span>}
                    {lesson.is_free_preview && <span style={{ fontSize: 11, color: '#065F46', backgroundColor: '#D1FAE5', borderRadius: 6, padding: '3px 9px', fontWeight: 700 }}>Free</span>}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                {coursesLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
                ) : courses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '50px 20px', color: '#9CA3AF', fontSize: 14 }}>
                    <div style={{ fontSize: 42, marginBottom: 10 }}>{ICON_BOOK}</div>
                    <p style={{ margin: 0, fontSize: 15 }}>No courses yet</p>
                  </div>
                ) : courses.map(course => (
                  <button key={course.id} onClick={() => { setSelectedCourse(course); loadLessons(course.id) }} style={{ width: '100%', backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6', cursor: 'pointer', textAlign: 'left', padding: 0, fontFamily: 'inherit' }}>
                    <div style={{ position: 'relative' }}>
                      {course.cover_image_url ? <img src={course.cover_image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: 160, background: 'linear-gradient(135deg, #A78BFA, #818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>{course.cover_emoji ?? ICON_BOOK}</div>}
                      <div style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '4px 10px' }}>
                        <span style={{ color: 'white', fontSize: 12, fontWeight: 700 }}>{course.lesson_count} {course.lesson_count === 1 ? 'Lesson' : 'Lessons'}</span>
                      </div>
                    </div>
                    <div style={{ padding: '12px 14px 14px' }}>
                      <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#111' }}>{course.title}</h3>
                      {course.description && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280', lineHeight: 1.4 }}>{course.description}</p>}
                      {course.avg_rating > 0 && <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8, fontSize: 12, color: '#F59E0B', fontWeight: 700 }}>{'\u2605'} {course.avg_rating.toFixed(1)} <span style={{ color: '#9CA3AF', fontWeight: 500 }}>({course.review_count})</span></div>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MEMBERS */}
        {tab === 'members' && (
          <div>
            {membersLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
            ) : members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 14 }}>No members yet</div>
            ) : members.map(m => (
              <div key={m.profile_id} style={{ backgroundColor: 'white', borderRadius: 14, padding: '12px 14px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, overflow: 'hidden' }}>
                  {m.photo_url ? <img src={m.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.avatar_emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{m.display_name}</span>
                    {m.is_verified && <VerifiedBadge size={13} />}
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', textTransform: 'capitalize' }}>{m.role}{m.total_points > 0 ? ` \u00B7 ${m.total_points} pts` : ''}</div>
                </div>
                {m.role === 'admin' && (
                  <div style={{ backgroundColor: '#FEF3C7', borderRadius: 20, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12 }}>{ICON_CROWN}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>Admin</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* LEADERBOARD */}
        {tab === 'leaderboard' && (
          <div>
            {membersLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
            ) : members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 14 }}>No leaderboard data yet</div>
            ) : (
              <div>
                {members.length >= 3 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 20, paddingTop: 14 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#EDE9FE', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden', border: '2px solid #9CA3AF' }}>{members[1].photo_url ? <img src={members[1].photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : members[1].avatar_emoji}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{members[1].display_name}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{members[1].total_points} pts</div>
                      <div style={{ backgroundColor: '#E5E7EB', borderRadius: '8px 8px 0 0', padding: '14px 0', marginTop: 8 }}><span style={{ fontSize: 22, fontWeight: 800, color: '#9CA3AF' }}>#2</span></div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ width: 70, height: 70, borderRadius: '50%', backgroundColor: '#EDE9FE', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, overflow: 'hidden', border: '3px solid #F59E0B' }}>{members[0].photo_url ? <img src={members[0].photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : members[0].avatar_emoji}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>{members[0].display_name}</span>
                        {members[0].is_verified && <VerifiedBadge size={13} />}
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{members[0].total_points} pts</div>
                      <div style={{ backgroundColor: '#FEF3C7', borderRadius: '8px 8px 0 0', padding: '20px 0', marginTop: 8 }}><span style={{ fontSize: 26, fontWeight: 800, color: '#F59E0B' }}>#1</span></div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#EDE9FE', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden', border: '2px solid #FB923C' }}>{members[2].photo_url ? <img src={members[2].photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : members[2].avatar_emoji}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{members[2].display_name}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{members[2].total_points} pts</div>
                      <div style={{ backgroundColor: '#FED7AA', borderRadius: '8px 8px 0 0', padding: '10px 0', marginTop: 8 }}><span style={{ fontSize: 20, fontWeight: 800, color: '#C2410C' }}>#3</span></div>
                    </div>
                  </div>
                )}
                {members.slice(3).map((m, i) => (
                  <div key={m.profile_id} style={{ backgroundColor: 'white', borderRadius: 14, padding: '12px 14px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: '#9CA3AF', width: 30, textAlign: 'center' }}>#{i + 4}</span>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden' }}>{m.photo_url ? <img src={m.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.avatar_emoji}</div>
                    <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#111' }}>{m.display_name}</span>
                    <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>{m.total_points} pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
