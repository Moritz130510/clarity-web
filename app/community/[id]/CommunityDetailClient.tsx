'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'
import Link from 'next/link'

type Tab = 'feed' | 'classroom' | 'members' | 'leaderboard'
type PostType = 'text' | 'question' | 'win' | 'event' | 'announcement'

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
  is_private: boolean | null
}

interface Subgroup {
  id: string
  community_id: string
  name: string
  emoji: string | null
  created_by: string | null
  post_count: number | null
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
  author_photo_url: string | null
  author_is_verified: boolean
  post_type: string | null
  event_date: string | null
  meeting_url: string | null
  subgroup_id: string | null
  subgroup_name: string | null
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
  points: number
  level: number | null
  display_name: string
  avatar_emoji: string
  avatar_url: string | null
  is_verified: boolean
}

interface Course {
  id: string
  title: string
  description: string | null
  cover_emoji: string | null
  cover_color: string | null
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
const ICON_GEAR = '\u2699'
const ICON_TRASH = '\u{1F5D1}'
const ICON_QUESTION = '\u2753'

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

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function CommunityDetailClient({ community }: { community: Community }) {
  const [tab, setTab] = useState<Tab>('feed')
  const [user, setUser] = useState<User | null>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [memberCount, setMemberCount] = useState(community.member_count ?? 0)
  const [joining, setJoining] = useState(false)
  const [descExpanded, setDescExpanded] = useState(false)

  const [subgroups, setSubgroups] = useState<Subgroup[]>([])
  const [activeSubgroupId, setActiveSubgroupId] = useState<string | null>(null)
  const [showNewSubgroup, setShowNewSubgroup] = useState(false)
  const [newSubgroupName, setNewSubgroupName] = useState('')
  const [newSubgroupEmoji, setNewSubgroupEmoji] = useState('\u{1F4AC}')

  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [showComposer, setShowComposer] = useState(false)
  const [newPostType, setNewPostType] = useState<PostType>('text')
  const [newPostTitle, setNewPostTitle] = useState('')
  const [newPostContent, setNewPostContent] = useState('')
  const [newPostSubgroupId, setNewPostSubgroupId] = useState<string | null>(null)
  const [newPostEventDate, setNewPostEventDate] = useState('')
  const [newPostMeetingUrl, setNewPostMeetingUrl] = useState('')
  const [postingPost, setPostingPost] = useState(false)

  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [comments, setComments] = useState<Record<string, Comment[]>>({})
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})

  const [courses, setCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [lessonsLoading, setLessonsLoading] = useState(false)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  const isVerified = VERIFIED_NAMES.includes(community.name)
  const isCreator = !!user && community.created_by === user.id
  const isAdmin = userRole === 'admin' || isCreator
  const isModerator = userRole === 'moderator' || isAdmin

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
    loadSubgroups()
    return () => sub.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (tab === 'feed') loadPosts()
    else if (tab === 'classroom') { setSelectedCourse(null); setSelectedLesson(null); loadCourses() }
    else if (tab === 'members' || tab === 'leaderboard') loadMembers()
  }, [tab, user, activeSubgroupId])

  async function checkMembership(uid: string) {
    const { data } = await supabase.from('community_members').select('profile_id, role').eq('community_id', community.id).eq('profile_id', uid).maybeSingle()
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
      const role = isCreator ? 'admin' : 'member'
      await supabase.from('community_members').insert({ community_id: community.id, profile_id: user.id, role, points: 0, level: 1 })
      setIsJoined(true)
      setMemberCount(n => n + 1)
      setUserRole(role)
    }
    setJoining(false)
  }

  async function loadSubgroups() {
    const { data } = await supabase.from('community_subgroups').select('*').eq('community_id', community.id).order('created_at', { ascending: true })
    if (data) setSubgroups(data as Subgroup[])
  }

  async function createSubgroup() {
    if (!user || !newSubgroupName.trim()) return
    const { data } = await supabase.from('community_subgroups').insert({ community_id: community.id, name: newSubgroupName.trim(), emoji: newSubgroupEmoji, created_by: user.id, post_count: 0 }).select().single()
    if (data) setSubgroups(prev => [...prev, data as Subgroup])
    setNewSubgroupName('')
    setNewSubgroupEmoji('\u{1F4AC}')
    setShowNewSubgroup(false)
  }

  async function deleteSubgroup(id: string) {
    if (!isAdmin) return
    if (!confirm('Delete this subgroup?')) return
    await supabase.from('community_subgroups').delete().eq('id', id)
    setSubgroups(prev => prev.filter(s => s.id !== id))
    if (activeSubgroupId === id) setActiveSubgroupId(null)
  }

  async function loadPosts() {
    setPostsLoading(true)
    let query = supabase.from('community_posts').select('*').eq('community_id', community.id).order('is_pinned', { ascending: false, nullsFirst: false }).order('created_at', { ascending: false })
    if (activeSubgroupId) query = query.eq('subgroup_id', activeSubgroupId)
    const { data } = await query
    if (data) {
      const enriched: Post[] = await Promise.all(data.map(async (p: any) => {
        let likeCount = 0, isLiked = false, cc = 0
        const lr = await supabase.from('community_post_likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id)
        if (!lr.error) likeCount = lr.count ?? 0
        if (user) {
          const ur = await supabase.from('community_post_likes').select('id').eq('post_id', p.id).eq('profile_id', user.id).maybeSingle()
          isLiked = !!ur.data
        }
        const cr = await supabase.from('community_comments').select('*', { count: 'exact', head: true }).eq('post_id', p.id)
        if (!cr.error) cc = cr.count ?? 0
        let authorName = p.author_name ?? p.author_display_name ?? null
        let authorAvatar = p.author_avatar ?? p.author_avatar_emoji ?? null
        let authorPhoto = p.author_photo_url ?? null
        let authorVerified = p.author_is_verified ?? false
        if (!authorName && p.author_id) {
          const pr = await supabase.from('community_profiles').select('display_name, avatar_emoji, avatar_url, is_verified').eq('id', p.author_id).maybeSingle()
          if (!pr.error && pr.data) {
            authorName = pr.data.display_name
            authorAvatar = pr.data.avatar_emoji
            authorPhoto = pr.data.avatar_url
            authorVerified = pr.data.is_verified ?? false
          }
        }
        return {
          id: p.id, content: p.content ?? null, title: p.title ?? null, image_url: p.image_url ?? null,
          created_at: p.created_at, author_id: p.author_id,
          author_name: authorName ?? 'Member', author_avatar: authorAvatar, author_photo_url: authorPhoto, author_is_verified: !!authorVerified,
          post_type: p.post_type ?? 'text', event_date: p.event_date ?? null, meeting_url: p.meeting_url ?? null,
          subgroup_id: p.subgroup_id ?? null, subgroup_name: p.subgroup_name ?? null,
          is_pinned: !!p.is_pinned, like_count: likeCount, comment_count: cc, is_liked: isLiked,
        }
      }))
      setPosts(enriched)
    }
    setPostsLoading(false)
  }

  async function getCurrentProfile() {
    if (!user) return null
    const { data } = await supabase.from('community_profiles').select('display_name, avatar_emoji, avatar_url, is_verified').eq('id', user.id).maybeSingle()
    return data
  }

  async function handlePostSubmit() {
    if (!user || !newPostContent.trim()) return
    setPostingPost(true)
    const profile = await getCurrentProfile()
    const subgroup = subgroups.find(s => s.id === newPostSubgroupId)
    const payload: any = {
      community_id: community.id,
      author_id: user.id,
      author_name: profile?.display_name ?? user.email?.split('@')[0] ?? 'Member',
      author_avatar: profile?.avatar_emoji ?? ICON_USER,
      author_photo_url: profile?.avatar_url ?? null,
      author_is_verified: profile?.is_verified ?? false,
      content: newPostContent.trim(),
      title: newPostTitle.trim() || null,
      post_type: newPostType,
      subgroup_id: newPostSubgroupId,
      subgroup_name: subgroup?.name ?? null,
    }
    if (newPostType === 'event') {
      payload.event_date = newPostEventDate || null
      payload.meeting_url = newPostMeetingUrl.trim() || null
    }
    await supabase.from('community_posts').insert(payload)
    setNewPostContent('')
    setNewPostTitle('')
    setNewPostType('text')
    setNewPostSubgroupId(null)
    setNewPostEventDate('')
    setNewPostMeetingUrl('')
    setShowComposer(false)
    await loadPosts()
    setPostingPost(false)
  }

  async function handleLike(postId: string) {
    if (!user) { window.location.href = '/login'; return }
    const post = posts.find(p => p.id === postId)
    if (!post) return
    if (post.is_liked) await supabase.from('community_post_likes').delete().eq('post_id', postId).eq('profile_id', user.id)
    else await supabase.from('community_post_likes').insert({ post_id: postId, profile_id: user.id })
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? Math.max(0, p.like_count - 1) : p.like_count + 1 } : p))
  }

  async function togglePin(postId: string, currentlyPinned: boolean) {
    if (!isModerator) return
    await supabase.from('community_posts').update({ is_pinned: !currentlyPinned }).eq('id', postId)
    await loadPosts()
  }

  async function deletePost(postId: string) {
    if (!isModerator) return
    if (!confirm('Delete this post?')) return
    await supabase.from('community_posts').delete().eq('id', postId)
    setPosts(prev => prev.filter(p => p.id !== postId))
  }

  async function loadComments(postId: string) {
    const { data } = await supabase.from('community_comments').select('*').eq('post_id', postId).order('created_at', { ascending: true })
    if (!data?.length) return setComments(p => ({ ...p, [postId]: [] }))
    const authorIds = Array.from(new Set(data.map((c: any) => c.author_id).filter(Boolean)))
    let pMap = new Map<string, any>()
    if (authorIds.length) {
      const { data: profs } = await supabase.from('community_profiles').select('id, display_name, avatar_emoji, avatar_url').in('id', authorIds)
      if (profs) pMap = new Map(profs.map((p: any) => [p.id, p]))
    }
    const enriched: Comment[] = data.map((c: any) => {
      const prof = pMap.get(c.author_id) ?? {}
      return {
        id: c.id, content: c.content, created_at: c.created_at, author_id: c.author_id,
        author_name: c.author_name ?? c.author_display_name ?? prof.display_name ?? 'Member',
        author_avatar: c.author_avatar ?? c.author_avatar_emoji ?? prof.avatar_emoji ?? null,
        parent_comment_id: c.parent_comment_id ?? null,
      }
    })
    setComments(p => ({ ...p, [postId]: enriched }))
  }

  async function handleComment(postId: string) {
    if (!user || !commentInputs[postId]?.trim()) return
    const profile = await getCurrentProfile()
    await supabase.from('community_comments').insert({
      post_id: postId, author_id: user.id, content: commentInputs[postId].trim(),
      author_name: profile?.display_name ?? user.email?.split('@')[0] ?? 'Member',
      author_avatar: profile?.avatar_emoji ?? ICON_USER,
    })
    setCommentInputs(p => ({ ...p, [postId]: '' }))
    await loadComments(postId)
    setPosts(p => p.map(x => x.id === postId ? { ...x, comment_count: x.comment_count + 1 } : x))
  }

  function toggleComments(postId: string) {
    setExpandedComments(prev => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId)
      else { next.add(postId); loadComments(postId) }
      return next
    })
  }

  async function loadCourses() {
    setCoursesLoading(true)
    const { data } = await supabase.from('community_courses').select('id, title, description, cover_emoji, cover_color, cover_image_url, lesson_count, avg_rating, review_count, order_index').eq('community_id', community.id).order('order_index', { ascending: true, nullsFirst: false })
    setCourses((data ?? []) as Course[])
    setCoursesLoading(false)
  }

  async function loadLessons(courseId: string) {
    setLessonsLoading(true)
    const { data } = await supabase.from('community_lessons').select('id, title, content, video_url, image_url, meeting_url, is_free_preview, duration_minutes, order_index').eq('course_id', courseId).order('order_index', { ascending: true, nullsFirst: false })
    setLessons((data ?? []) as Lesson[])
    setLessonsLoading(false)
  }

  async function loadMembers() {
    setMembersLoading(true)
    const { data: rels } = await supabase.from('community_members').select('profile_id, role, points, level').eq('community_id', community.id).order('points', { ascending: false })
    if (!rels || rels.length === 0) { setMembers([]); setMembersLoading(false); return }
    const ids = rels.map((r: any) => r.profile_id)
    const { data: profs } = await supabase.from('community_profiles').select('id, display_name, avatar_emoji, avatar_url, is_verified').in('id', ids)
    const pMap = new Map((profs ?? []).map((p: any) => [p.id, p]))
    const combined: Member[] = rels.map((r: any) => {
      const p = pMap.get(r.profile_id) ?? {}
      return {
        profile_id: r.profile_id, role: r.role, points: r.points ?? 0, level: r.level ?? null,
        display_name: p.display_name ?? 'Member',
        avatar_emoji: p.avatar_emoji ?? ICON_USER,
        avatar_url: p.avatar_url ?? null,
        is_verified: p.is_verified ?? false,
      }
    })
    combined.sort((a, b) => {
      if (a.role === 'admin' && b.role !== 'admin') return -1
      if (b.role === 'admin' && a.role !== 'admin') return 1
      return (b.points ?? 0) - (a.points ?? 0)
    })
    setMembers(combined)
    setMembersLoading(false)
  }

  async function changeMemberRole(profileId: string, newRole: string) {
    if (!isAdmin) return
    await supabase.from('community_members').update({ role: newRole }).eq('community_id', community.id).eq('profile_id', profileId)
    await loadMembers()
  }

  async function kickMember(profileId: string) {
    if (!isAdmin) return
    if (!confirm('Remove this member from the community?')) return
    await supabase.from('community_members').delete().eq('community_id', community.id).eq('profile_id', profileId)
    setMembers(prev => prev.filter(m => m.profile_id !== profileId))
    setMemberCount(n => Math.max(0, n - 1))
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'feed', label: 'Feed' },
    { id: 'classroom', label: 'Classroom' },
    { id: 'members', label: 'Members' },
    { id: 'leaderboard', label: 'Leaderboard' },
  ]

  const leaderboardSorted = [...members].sort((a, b) => (b.points ?? 0) - (a.points ?? 0))

  return (
    <div style={{ backgroundColor: '#F2F2F7', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>
      <div style={{ position: 'relative', height: 230, overflow: 'hidden' }}>
        {community.cover_image_url ? <img src={community.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)' }} />}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.1) 50%, rgba(0,0,0,0.55) 100%)' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px' }}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
          </Link>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: 17, letterSpacing: -0.3 }}>{community.name}</span>
            {isVerified && <VerifiedBadge size={18} />}
          </div>
          {isAdmin ? (
            <button onClick={() => alert('Community settings: coming next deploy')} style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.22)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 18, fontFamily: 'inherit' }} title="Community settings">{ICON_GEAR}</button>
          ) : <div style={{ width: 36, height: 36 }} />}
        </div>
        <div style={{ position: 'absolute', bottom: 14, left: 16, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <div style={{ width: 56, height: 56, borderRadius: 14, overflow: 'hidden', border: '2.5px solid white', flexShrink: 0, backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
            {community.logo_image_url ? <img src={community.logo_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span>{community.emoji ?? ICON_GLOBE}</span>}
          </div>
        </div>
      </div>

      <div style={{ backgroundColor: 'white' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#F3F4F6', borderRadius: 20, padding: '5px 12px' }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{community.category ?? 'general'}</span>
            </div>
            {isAdmin && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#FEF3C7', borderRadius: 20, padding: '5px 12px' }}>
                <span style={{ fontSize: 13 }}>{ICON_CROWN}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>Admin</span>
              </div>
            )}
            {!isAdmin && userRole === 'moderator' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#DBEAFE', borderRadius: 20, padding: '5px 12px' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#1E40AF' }}>Mod</span>
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
                <button onClick={() => setDescExpanded(e => !e)} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0, marginLeft: 4, fontFamily: 'inherit' }}>{descExpanded ? 'Less' : 'Show more'}</button>
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

      <div style={{ backgroundColor: 'white', display: 'flex', borderBottom: '1px solid #E5E7EB', overflowX: 'auto', scrollbarWidth: 'none', position: 'sticky', top: 0, zIndex: 5 }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, minWidth: 100, padding: '14px 4px', fontSize: 14, fontWeight: tab === t.id ? 700 : 500, color: tab === t.id ? '#111' : '#9CA3AF', background: 'none', border: 'none', borderBottom: tab === t.id ? '2.5px solid #7C3AED' : '2.5px solid transparent', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>{t.label}</button>
        ))}
      </div>

      {tab === 'feed' && (subgroups.length > 0 || isModerator) && (
        <div style={{ backgroundColor: 'white', borderBottom: '1px solid #F3F4F6', padding: '10px 12px', display: 'flex', gap: 6, overflowX: 'auto', scrollbarWidth: 'none', alignItems: 'center' }}>
          <button onClick={() => setActiveSubgroupId(null)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 16, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: activeSubgroupId === null ? 'none' : '1px solid #E5E7EB', backgroundColor: activeSubgroupId === null ? '#7C3AED' : 'white', color: activeSubgroupId === null ? 'white' : '#374151', fontFamily: 'inherit' }}>All</button>
          {subgroups.map(sg => (
            <button key={sg.id} onClick={() => setActiveSubgroupId(sg.id)} onContextMenu={e => { if (isAdmin) { e.preventDefault(); deleteSubgroup(sg.id) } }} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 16, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: activeSubgroupId === sg.id ? 'none' : '1px solid #E5E7EB', backgroundColor: activeSubgroupId === sg.id ? '#7C3AED' : 'white', color: activeSubgroupId === sg.id ? 'white' : '#374151', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span>{sg.emoji ?? '\u{1F4AC}'}</span>
              <span>{sg.name}</span>
            </button>
          ))}
          {isModerator && (
            <button onClick={() => setShowNewSubgroup(true)} style={{ flexShrink: 0, padding: '6px 10px', borderRadius: 16, fontSize: 16, fontWeight: 700, cursor: 'pointer', border: '1px dashed #C4B5FD', backgroundColor: 'white', color: '#7C3AED', fontFamily: 'inherit', lineHeight: 1 }} title="New subgroup">+</button>
          )}
        </div>
      )}

      <div style={{ padding: 16, maxWidth: 720, margin: '0 auto', paddingBottom: 100 }}>
        {tab === 'feed' && (
          <div>
            {!user && (
              <div style={{ backgroundColor: 'white', borderRadius: 16, padding: 18, marginBottom: 14, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 12px' }}>Sign in to post, like, and comment</p>
                <Link href="/login" style={{ display: 'inline-block', backgroundColor: '#7C3AED', color: 'white', textDecoration: 'none', borderRadius: 22, padding: '9px 22px', fontSize: 14, fontWeight: 700 }}>Sign In</Link>
              </div>
            )}
            {user && isJoined && (
              <div onClick={() => setShowComposer(true)} style={{ backgroundColor: 'white', borderRadius: 22, padding: '12px 16px', marginBottom: 14, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>{ICON_USER}</div>
                <span style={{ flex: 1, color: '#9CA3AF', fontSize: 14 }}>What's on your mind?</span>
                <span style={{ color: '#7C3AED', fontSize: 22, fontWeight: 300, lineHeight: 1 }}>+</span>
              </div>
            )}
            {user && !isJoined && (
              <div style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 14, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 10px' }}>Join the community to post</p>
                <button onClick={handleJoinLeave} style={{ backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: 22, padding: '8px 20px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Join</button>
              </div>
            )}

            {postsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 20px', color: '#9CA3AF', fontSize: 14 }}>
                <div style={{ fontSize: 42, marginBottom: 10 }}>{ICON_NOTE}</div>
                <p style={{ margin: 0, fontSize: 15 }}>{activeSubgroupId ? 'No posts in this subgroup yet' : 'No posts yet'}</p>
              </div>
            ) : posts.map(post => (
              <div key={post.id} style={{ backgroundColor: 'white', borderRadius: 16, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden', borderLeft: post.post_type === 'event' ? '4px solid #10B981' : post.post_type === 'announcement' ? '4px solid #F97316' : post.post_type === 'question' ? '4px solid #3B82F6' : post.post_type === 'win' ? '4px solid #F59E0B' : '1px solid #F3F4F6', borderTop: '1px solid #F3F4F6', borderRight: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
                {post.is_pinned && (
                  <div style={{ backgroundColor: '#FEF3C7', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12 }}>{ICON_PIN}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>Pinned</span>
                  </div>
                )}
                {post.post_type === 'announcement' && <div style={{ backgroundColor: '#FFEDD5', padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#9A3412' }}>Announcement</div>}
                {post.post_type === 'question' && <div style={{ backgroundColor: '#DBEAFE', padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#1E40AF' }}>{ICON_QUESTION} Question</div>}
                {post.post_type === 'win' && <div style={{ backgroundColor: '#FEF3C7', padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#92400E' }}>Win {ICON_PARTY}</div>}
                {post.post_type === 'event' && <div style={{ backgroundColor: '#D1FAE5', padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#065F46', display: 'flex', alignItems: 'center', gap: 6 }}><span>{ICON_CALENDAR}</span> Event</div>}
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
                      {post.author_photo_url ? <img src={post.author_photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (post.author_avatar ?? ICON_USER)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{post.author_name}</div>
                        {post.author_is_verified && <VerifiedBadge size={13} />}
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>{timeAgo(post.created_at)}</span>
                        {post.subgroup_name && <><span>{'\u00B7'}</span><span style={{ color: '#7C3AED', fontWeight: 600 }}>#{post.subgroup_name}</span></>}
                      </div>
                    </div>
                    {(isModerator || (user && post.author_id === user.id)) && (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {isModerator && (
                          <button onClick={() => togglePin(post.id, post.is_pinned)} title={post.is_pinned ? 'Unpin' : 'Pin'} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, fontSize: 16, fontFamily: 'inherit', opacity: post.is_pinned ? 1 : 0.5 }}>{ICON_PIN}</button>
                        )}
                        <button onClick={() => deletePost(post.id)} title="Delete" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#EF4444', fontSize: 14, fontFamily: 'inherit' }}>{ICON_TRASH}</button>
                      </div>
                    )}
                  </div>
                  {post.title && <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: '#111' }}>{post.title}</h3>}
                  {post.content && <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.55, margin: 0, whiteSpace: 'pre-wrap' }}>{post.content}</p>}
                  {post.image_url && <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 10, marginTop: 10, objectFit: 'cover' }} />}
                  {post.event_date && (
                    <div style={{ marginTop: 10, padding: 12, backgroundColor: '#F0FDF4', borderRadius: 10, fontSize: 13, color: '#065F46', display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #BBF7D0' }}>
                      <span style={{ fontSize: 18 }}>{ICON_CALENDAR}</span>
                      <span style={{ fontWeight: 600 }}>{formatEventDate(post.event_date)}</span>
                    </div>
                  )}
                  {post.meeting_url && (
                    <a href={post.meeting_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', marginTop: 10, padding: '8px 16px', backgroundColor: '#10B981', color: 'white', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>Join {'\u2192'}</a>
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
                        <input value={commentInputs[post.id] ?? ''} onChange={e => setCommentInputs(p => ({ ...p, [post.id]: e.target.value }))} onKeyDown={e => e.key === 'Enter' && handleComment(post.id)} placeholder="Write a comment..." style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 22, padding: '8px 14px', fontSize: 13, outline: 'none', backgroundColor: 'white', fontFamily: 'inherit' }} />
                        <button onClick={() => handleComment(post.id)} style={{ backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: 22, padding: '8px 16px', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Send</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

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
                  {selectedCourse.cover_image_url ? <img src={selectedCourse.cover_image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }} /> : <div style={{ width: '100%', height: 160, background: selectedCourse.cover_color ? selectedCourse.cover_color : 'linear-gradient(135deg, #A78BFA, #818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>{selectedCourse.cover_emoji ?? ICON_BOOK}</div>}
                  <div style={{ padding: 16 }}>
                    <h2 style={{ margin: '0 0 4px', fontSize: 19, fontWeight: 800, color: '#111' }}>{selectedCourse.title}</h2>
                    {selectedCourse.description && <p style={{ margin: 0, fontSize: 14, color: '#6B7280', lineHeight: 1.5 }}>{selectedCourse.description}</p>}
                  </div>
                </div>
                {lessonsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
                ) : lessons.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: '#9CA3AF', fontSize: 14 }}>No lessons yet</div>
                ) : lessons.map((lesson, i) => {
                  const locked = !lesson.is_free_preview && !isJoined
                  return (
                    <button key={lesson.id} onClick={() => locked ? alert('Join the community to access this lesson') : setSelectedLesson(lesson)} style={{ width: '100%', backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', opacity: locked ? 0.6 : 1 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#7C3AED', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>{i + 1}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111' }}>{lesson.title}</div>
                        {lesson.duration_minutes && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>{lesson.duration_minutes} min</div>}
                      </div>
                      {locked && <span style={{ fontSize: 16 }}>{'\u{1F512}'}</span>}
                      {lesson.video_url && !locked && <span style={{ fontSize: 12, color: '#7C3AED', backgroundColor: '#EDE9FE', borderRadius: 6, padding: '3px 9px', fontWeight: 700 }}>Video</span>}
                      {lesson.is_free_preview && <span style={{ fontSize: 11, color: '#065F46', backgroundColor: '#D1FAE5', borderRadius: 6, padding: '3px 9px', fontWeight: 700 }}>Free</span>}
                    </button>
                  )
                })}
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
                      {course.cover_image_url ? <img src={course.cover_image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover', display: 'block' }} /> : <div style={{ width: '100%', height: 160, background: course.cover_color ? course.cover_color : 'linear-gradient(135deg, #A78BFA, #818CF8)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>{course.cover_emoji ?? ICON_BOOK}</div>}
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

        {tab === 'members' && (
          <div>
            {membersLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
            ) : members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 14 }}>No members yet</div>
            ) : members.map(m => (
              <div key={m.profile_id} style={{ backgroundColor: 'white', borderRadius: 14, padding: '12px 14px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 44, height: 44, flexShrink: 0 }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden' }}>
                    {m.avatar_url ? <img src={m.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.avatar_emoji}
                  </div>
                  {m.is_verified && <div style={{ position: 'absolute', bottom: -2, right: -2 }}><VerifiedBadge size={14} /></div>}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: '#111' }}>{m.display_name}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', textTransform: 'capitalize' }}>{m.role}{m.points > 0 ? ` ${'\u00B7'} ${m.points} pts` : ''}</div>
                </div>
                {m.role === 'admin' && (
                  <div style={{ backgroundColor: '#FEF3C7', borderRadius: 20, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12 }}>{ICON_CROWN}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#92400E' }}>Admin</span>
                  </div>
                )}
                {m.role === 'moderator' && (
                  <div style={{ backgroundColor: '#DBEAFE', borderRadius: 20, padding: '4px 10px' }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1E40AF' }}>Mod</span>
                  </div>
                )}
                {isAdmin && user && m.profile_id !== user.id && (
                  <div style={{ display: 'flex', gap: 4 }}>
                    {m.role !== 'admin' && <button onClick={() => changeMemberRole(m.profile_id, m.role === 'moderator' ? 'member' : 'moderator')} style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 14, padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#374151', fontFamily: 'inherit' }}>{m.role === 'moderator' ? 'Remove mod' : 'Make mod'}</button>}
                    <button onClick={() => kickMember(m.profile_id)} style={{ background: 'none', border: '1px solid #FCA5A5', borderRadius: 14, padding: '4px 10px', fontSize: 11, cursor: 'pointer', color: '#DC2626', fontFamily: 'inherit' }}>Kick</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {tab === 'leaderboard' && (
          <div>
            {membersLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} /></div>
            ) : leaderboardSorted.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 14 }}>No leaderboard data yet</div>
            ) : (
              <div>
                {leaderboardSorted.length >= 3 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 20, paddingTop: 14 }}>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#EDE9FE', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden', border: '2px solid #9CA3AF' }}>{leaderboardSorted[1].avatar_url ? <img src={leaderboardSorted[1].avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : leaderboardSorted[1].avatar_emoji}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{leaderboardSorted[1].display_name}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{leaderboardSorted[1].points} pts</div>
                      <div style={{ backgroundColor: '#E5E7EB', borderRadius: '8px 8px 0 0', padding: '14px 0', marginTop: 8 }}><span style={{ fontSize: 22, fontWeight: 800, color: '#9CA3AF' }}>#2</span></div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ width: 70, height: 70, borderRadius: '50%', backgroundColor: '#EDE9FE', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, overflow: 'hidden', border: '3px solid #F59E0B' }}>{leaderboardSorted[0].avatar_url ? <img src={leaderboardSorted[0].avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : leaderboardSorted[0].avatar_emoji}</div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: '#111' }}>{leaderboardSorted[0].display_name}</span>
                        {leaderboardSorted[0].is_verified && <VerifiedBadge size={13} />}
                      </div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{leaderboardSorted[0].points} pts</div>
                      <div style={{ backgroundColor: '#FEF3C7', borderRadius: '8px 8px 0 0', padding: '20px 0', marginTop: 8 }}><span style={{ fontSize: 26, fontWeight: 800, color: '#F59E0B' }}>#1</span></div>
                    </div>
                    <div style={{ flex: 1, textAlign: 'center' }}>
                      <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#EDE9FE', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden', border: '2px solid #FB923C' }}>{leaderboardSorted[2].avatar_url ? <img src={leaderboardSorted[2].avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : leaderboardSorted[2].avatar_emoji}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#374151' }}>{leaderboardSorted[2].display_name}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{leaderboardSorted[2].points} pts</div>
                      <div style={{ backgroundColor: '#FED7AA', borderRadius: '8px 8px 0 0', padding: '10px 0', marginTop: 8 }}><span style={{ fontSize: 20, fontWeight: 800, color: '#C2410C' }}>#3</span></div>
                    </div>
                  </div>
                )}
                {leaderboardSorted.slice(3).map((m, i) => {
                  const isCurrentUser = user && m.profile_id === user.id
                  return (
                    <div key={m.profile_id} style={{ backgroundColor: isCurrentUser ? '#EDE9FE' : 'white', borderRadius: 14, padding: '12px 14px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: isCurrentUser ? '1.5px solid #7C3AED' : '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: '#9CA3AF', width: 30, textAlign: 'center' }}>#{i + 4}</span>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, overflow: 'hidden' }}>{m.avatar_url ? <img src={m.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.avatar_emoji}</div>
                      <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: '#111' }}>{m.display_name}</span>
                      <span style={{ fontSize: 13, color: '#9CA3AF', fontWeight: 600 }}>{m.points} pts</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {showComposer && (
        <div onClick={() => setShowComposer(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 30, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 600, backgroundColor: 'white', borderRadius: '20px 20px 0 0', padding: 18, boxSizing: 'border-box', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>New Post</span>
              <button onClick={() => setShowComposer(false)} style={{ background: 'none', border: 'none', color: '#9CA3AF', fontSize: 22, cursor: 'pointer', padding: 0, lineHeight: 1, fontFamily: 'inherit' }}>{'\u00D7'}</button>
            </div>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12, overflowX: 'auto', scrollbarWidth: 'none' }}>
              {([
                { id: 'text', label: 'Text', icon: ICON_NOTE },
                { id: 'question', label: 'Question', icon: ICON_QUESTION },
                { id: 'win', label: 'Win', icon: ICON_PARTY },
                { id: 'event', label: 'Event', icon: ICON_CALENDAR },
                ...(isModerator ? [{ id: 'announcement' as PostType, label: 'Announcement', icon: '\u{1F4E2}' }] : []),
              ] as { id: PostType; label: string; icon: string }[]).map(t => (
                <button key={t.id} onClick={() => setNewPostType(t.id)} style={{ flexShrink: 0, padding: '6px 12px', borderRadius: 16, fontSize: 13, fontWeight: 600, cursor: 'pointer', border: newPostType === t.id ? 'none' : '1px solid #E5E7EB', backgroundColor: newPostType === t.id ? '#7C3AED' : 'white', color: newPostType === t.id ? 'white' : '#374151', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{t.icon}</span><span>{t.label}</span>
                </button>
              ))}
            </div>
            {(newPostType === 'event' || newPostType === 'question' || newPostType === 'announcement') && (
              <input value={newPostTitle} onChange={e => setNewPostTitle(e.target.value)} placeholder={newPostType === 'event' ? 'Event title' : 'Title (optional)'} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', marginBottom: 10, fontFamily: 'inherit', backgroundColor: '#FAFAFA' }} />
            )}
            <textarea value={newPostContent} onChange={e => setNewPostContent(e.target.value)} placeholder={newPostType === 'event' ? 'Describe your event...' : 'Share something with the community...'} rows={4} autoFocus style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: 10, padding: 12, fontSize: 14, outline: 'none', resize: 'none', backgroundColor: '#FAFAFA', fontFamily: 'inherit', lineHeight: 1.5, marginBottom: 10 }} />
            {newPostType === 'event' && (
              <div style={{ marginBottom: 10 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>Date & Time</label>
                <input type="datetime-local" value={newPostEventDate} onChange={e => setNewPostEventDate(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', backgroundColor: '#FAFAFA' }} />
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginTop: 8, marginBottom: 4 }}>Meeting link (optional)</label>
                <input value={newPostMeetingUrl} onChange={e => setNewPostMeetingUrl(e.target.value)} placeholder="https://zoom.us/..." style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', backgroundColor: '#FAFAFA' }} />
              </div>
            )}
            {subgroups.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>Post in</label>
                <select value={newPostSubgroupId ?? ''} onChange={e => setNewPostSubgroupId(e.target.value || null)} style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', fontFamily: 'inherit', backgroundColor: '#FAFAFA' }}>
                  <option value="">Main feed</option>
                  {subgroups.map(sg => <option key={sg.id} value={sg.id}>{sg.emoji ?? ''} {sg.name}</option>)}
                </select>
              </div>
            )}
            <button onClick={handlePostSubmit} disabled={postingPost || !newPostContent.trim()} style={{ width: '100%', backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: 22, padding: '12px', fontSize: 15, fontWeight: 700, cursor: postingPost ? 'wait' : 'pointer', opacity: (postingPost || !newPostContent.trim()) ? 0.5 : 1, fontFamily: 'inherit' }}>{postingPost ? 'Posting...' : 'Post'}</button>
          </div>
        </div>
      )}

      {showNewSubgroup && (
        <div onClick={() => setShowNewSubgroup(false)} style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 360, backgroundColor: 'white', borderRadius: 18, padding: 20, boxSizing: 'border-box' }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#111', marginBottom: 14 }}>New Subgroup</div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>Emoji</label>
            <input value={newSubgroupEmoji} onChange={e => setNewSubgroupEmoji(e.target.value)} maxLength={2} style={{ width: 60, boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 20, outline: 'none', textAlign: 'center', fontFamily: 'inherit', backgroundColor: '#FAFAFA', marginBottom: 10 }} />
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7280', marginBottom: 4 }}>Name</label>
            <input value={newSubgroupName} onChange={e => setNewSubgroupName(e.target.value)} placeholder="e.g. Resources, Homework" autoFocus style={{ width: '100%', boxSizing: 'border-box', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px', fontSize: 14, outline: 'none', marginBottom: 14, fontFamily: 'inherit', backgroundColor: '#FAFAFA' }} />
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setShowNewSubgroup(false)} style={{ flex: 1, backgroundColor: '#F3F4F6', color: '#374151', border: 'none', borderRadius: 22, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Cancel</button>
              <button onClick={createSubgroup} disabled={!newSubgroupName.trim()} style={{ flex: 1, backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: 22, padding: '10px', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: !newSubgroupName.trim() ? 0.5 : 1, fontFamily: 'inherit' }}>Create</button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
