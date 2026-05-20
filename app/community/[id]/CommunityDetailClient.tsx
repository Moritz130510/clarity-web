'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
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
  content: string
  image_url: string | null
  created_at: string
  author_id: string
  author_name: string
  author_avatar: string | null
  author_photo: string | null
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
}

interface Course {
  id: string
  title: string
  description: string | null
  emoji: string | null
  cover_image_url?: string | null
  lesson_count?: number
}

interface Lesson {
  id: string
  title: string
  content: string | null
  video_url: string | null
  lesson_order: number
}

const VERIFIED_NAMES = ['Clarity']

function VerifiedBadge({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" fill="#1D9BF0"/>
      <path d="M9 12l2 2 4-4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function CommunityDetailClient({ community }: { community: Community }) {
  const [tab, setTab] = useState<Tab>('feed')
  const [user, setUser] = useState<User | null>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [memberCount, setMemberCount] = useState(community.member_count ?? 0)
  const [joining, setJoining] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [descExpanded, setDescExpanded] = useState(false)

  // Feed state
  const [posts, setPosts] = useState<Post[]>([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [newPostContent, setNewPostContent] = useState('')
  const [postingPost, setPostingPost] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({})
  const [comments, setComments] = useState<Record<string, Comment[]>>({})

  // Classroom state
  const [courses, setCourses] = useState<Course[]>([])
  const [coursesLoading, setCoursesLoading] = useState(false)
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [lessonsLoading, setLessonsLoading] = useState(false)

  // Members state
  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<Member[]>([])
  const [leaderboardLoading, setLeaderboardLoading] = useState(false)

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
    if (tab === 'classroom') loadCourses()
    if (tab === 'members') loadMembers()
    if (tab === 'leaderboard') loadLeaderboard()
  }, [tab])

  async function checkMembership(userId: string) {
    const { data } = await supabase
      .from('community_members')
      .select('profile_id, role')
      .eq('community_id', community.id)
      .eq('profile_id', userId)
      .maybeSingle()
    setIsJoined(!!data)
    setUserRole(data?.role ?? null)
  }

  async function handleJoin() {
    if (!user) { window.location.href = '/login'; return }
    setJoining(true)
    if (isJoined) {
      await supabase.from('community_members').delete()
        .eq('community_id', community.id).eq('profile_id', user.id)
      setIsJoined(false)
      setMemberCount(n => Math.max(0, n - 1))
      setUserRole(null)
    } else {
      await supabase.from('community_members').insert({
        community_id: community.id, profile_id: user.id, role: 'member'
      })
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
      .select('*, profiles:author_id(display_name, avatar_emoji, photo_url)')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
    if (data) {
      const enriched = await Promise.all(data.map(async (p: any) => {
        let likeCount = 0, isLiked = false
        const { count } = await supabase.from('post_likes').select('*', { count: 'exact', head: true }).eq('post_id', p.id)
        likeCount = count ?? 0
        if (user) {
          const { data: liked } = await supabase.from('post_likes').select('id').eq('post_id', p.id).eq('profile_id', user.id).maybeSingle()
          isLiked = !!liked
        }
        const { count: cc } = await supabase.from('post_comments').select('*', { count: 'exact', head: true }).eq('post_id', p.id)
        return {
          id: p.id, content: p.content, image_url: p.image_url, created_at: p.created_at,
          author_id: p.author_id,
          author_name: p.profiles?.display_name ?? 'Unknown',
          author_avatar: p.profiles?.avatar_emoji ?? null,
          author_photo: p.profiles?.photo_url ?? null,
          like_count: likeCount, comment_count: cc ?? 0, is_liked: isLiked
        }
      }))
      setPosts(enriched)
    }
    setPostsLoading(false)
  }

  async function loadCourses() {
    setCoursesLoading(true)
    const { data } = await supabase
      .from('courses')
      .select('id, title, description, emoji, cover_image_url')
      .eq('community_id', community.id)
    if (data) {
      const withCounts = await Promise.all(data.map(async (c: any) => {
        const { count } = await supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('course_id', c.id)
        return { ...c, lesson_count: count ?? 0 }
      }))
      setCourses(withCounts)
    }
    setCoursesLoading(false)
  }

  async function loadLessons(courseId: string) {
    setLessonsLoading(true)
    const { data } = await supabase
      .from('lessons')
      .select('id, title, content, video_url, lesson_order')
      .eq('course_id', courseId)
      .order('lesson_order', { ascending: true })
    if (data) setLessons(data)
    setLessonsLoading(false)
  }

  async function loadMembers() {
    setMembersLoading(true)
    const { data } = await supabase
      .from('community_members')
      .select('profile_id, role, profiles:profile_id(display_name, avatar_emoji, photo_url)')
      .eq('community_id', community.id)
    if (data) {
      setMembers(data.map((m: any) => ({
        profile_id: m.profile_id, role: m.role,
        display_name: m.profiles?.display_name ?? 'Member',
        avatar_emoji: m.profiles?.avatar_emoji ?? 'ð¤',
        photo_url: m.profiles?.photo_url ?? null
      })))
    }
    setMembersLoading(false)
  }

  async function loadLeaderboard() {
    setLeaderboardLoading(true)
    const { data } = await supabase
      .from('community_members')
      .select('profile_id, role, profiles:profile_id(display_name, avatar_emoji, photo_url)')
      .eq('community_id', community.id)
    if (data) {
      setLeaderboard(data.map((m: any) => ({
        profile_id: m.profile_id, role: m.role,
        display_name: m.profiles?.display_name ?? 'Member',
        avatar_emoji: m.profiles?.avatar_emoji ?? 'ð¤',
        photo_url: m.profiles?.photo_url ?? null
      })))
    }
    setLeaderboardLoading(false)
  }

  async function handlePostSubmit() {
    if (!user || !newPostContent.trim()) return
    setPostingPost(true)
    await supabase.from('community_posts').insert({
      community_id: community.id, author_id: user.id, content: newPostContent.trim()
    })
    setNewPostContent('')
    await loadPosts()
    setPostingPost(false)
  }

  async function handleLike(postId: string) {
    if (!user) { window.location.href = '/login'; return }
    const post = posts.find(p => p.id === postId)
    if (!post) return
    if (post.is_liked) {
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('profile_id', user.id)
    } else {
      await supabase.from('post_likes').insert({ post_id: postId, profile_id: user.id })
    }
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 } : p))
  }

  async function loadComments(postId: string) {
    const { data } = await supabase
      .from('post_comments')
      .select('*, profiles:author_id(display_name, avatar_emoji)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) {
      setComments(prev => ({
        ...prev, [postId]: data.map((c: any) => ({
          id: c.id, content: c.content, created_at: c.created_at,
          author_id: c.author_id,
          author_name: c.profiles?.display_name ?? 'Member',
          author_avatar: c.profiles?.avatar_emoji ?? null,
          parent_comment_id: c.parent_comment_id ?? null
        }))
      }))
    }
  }

  async function handleComment(postId: string) {
    if (!user || !commentInputs[postId]?.trim()) return
    await supabase.from('post_comments').insert({
      post_id: postId, author_id: user.id, content: commentInputs[postId].trim()
    })
    setCommentInputs(prev => ({ ...prev, [postId]: '' }))
    await loadComments(postId)
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p))
  }

  function toggleComments(postId: string) {
    setExpandedComments(prev => {
      const next = new Set(prev)
      if (next.has(postId)) { next.delete(postId) }
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

  const postCount = posts.length

  // âââ Render âââ
  return (
    <div style={{ backgroundColor: '#F2F2F7', minHeight: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", sans-serif' }}>

      {/* ââ Cover Image Header ââ */}
      <div style={{ position: 'relative', height: 230, overflow: 'hidden' }}>
        {community.cover_image_url ? (
          <img src={community.cover_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, #6D28D9 0%, #4C1D95 100%)' }} />
        )}
        {/* M4 6h16M4 12h10M4 18h7" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </div>
        </div>

        {/* Logo + name at bottom of cover */}
        <div style={{ position: 'absolute', bottom: 14, left: 16, display: 'flex', alignItems: 'flex-end', gap: 10 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, overflow: 'hidden', border: '2.5px solid white', flexShrink: 0, backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
            {community.logo_image_url ? (
              <img src={community.logo_image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span>{community.emoji ?? 'ð'}</span>
            )}
          </div>
          <div style={{ paddingBottom: 2 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: 20, letterSpacing: -0.3, textShadow: '0 1px 4px rgba(0,0,0,0.4)' }}>{community.name}</span>
              {isVerified && <VerifiedBadge size={17} />}
            </div>
          </div>
        </div>
      </div>

      {/* ââ Community Info Card ââ */}
      <div style={{ backgroundColor: 'white', marginBottom: 0 }}>
        {/* Category + Join row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px 10px' }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#F3F4F6', borderRadius: 20, padding: '5px 12px' }}>
              <span style={{ fontSize: 14 }}>ð¬</span>
              <span style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>{community.category || 'General'}</span>
            </div>
            {userRole === 'admin' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, backgroundColor: '#FEF3C7', borderRadius: 20, padding: '5px 12px' }}>
                <span style={{ fontSize: 13 }}>ð</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#92400E' }}>Admin</span>
              </div>
            )}
          </div>
          <button
            onClick={handleJoin}
            disabled={joining}
            style={{
              padding: '7px 20px',
              borderRadius: 20,
              border: isJoined ? '1.5px solid #E5E7EB' : 'none',
              backgroundColor: isJoined ? 'white' : '#7C3AED',
              color: isJoined ? '#374151' : 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: 'pointer',
              opacity: joining ? 0.7 : 1
            }}
          >
            {joining ? 'â¦' : isJoined ? 'Leave' : 'Join'}
          </button>
        </div>

        {/* Description */}
        {community.description && (
          <div style={{ padding: '0 16px 14px' }}>
            <p style={{ fontSize: 14, color: '#4B5563', lineHeight: 1.55, margin: 0 }}>
              {descExpanded ? community.description : community.description.slice(0, 120) + (community.description.length > 120 ? 'â¦' : '')}
              {community.description.length > 120 && (
                <button onClick={() => setDescExpanded(e => !e)} style={{ background: 'none', border: 'none', color: '#7C3AED', fontWeight: 600, fontSize: 13, cursor: 'pointer', padding: 0, marginLeft: 4 }}>
                  {descExpanded ? 'Less' : 'Show more'}
                </button>
              )}
            </p>
          </div>
        )}

        {/* Stats row */}
        <div style={{ display: 'flex', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ color: '#6B7280' }}>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="9" cy="7" r="4" stroke="#6B7280" strokeWidth="2"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="#6B7280" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>{memberCount}</span>
            </div>
            <span style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Members</span>
          </div>
          <div style={{ width: 1, backgroundColor: '#F3F4F6' }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{ fontSize: 17, fontWeight: 700, color: '#111' }}>{postCount}</span>
            </div>
            <span style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>Posts</span>
          </div>
        </div>
      </div>

      {/* ââ Tab Bar ââ */}
      <div style={{ backgroundColor: 'white', display: 'flex', borderBottom: '1px solid #E5E7EB', marginBottom: 0, overflowX: 'auto', scrollbarWidth: 'none' }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              minWidth: 90,
              padding: '13px 4px',
              fontSize: 14,
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? '#111' : '#9CA3AF',
              background: 'none',
              border: 'none',
              borderBottom: tab === t.id ? '2.5px solid #111' : '2.5px solid transparent',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              letterSpacing: -0.1
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ââ Tab Content ââ */}
      <div style={{ padding: '16px', maxWidth: 680, margin: '0 auto' }}>

        {/* FEED */}
        {tab === 'feed' && (
          <div>
            {/* Post composer */}
            {user && isJoined && (
              <div style={{ backgroundColor: 'white', borderRadius: 16, padding: 14, marginBottom: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6' }}>
                <textarea
                  value={newPostContent}
                  onChange={e => setNewPostContent(e.target.value)}
                  placeholder="Share something with the communityâ¦"
                  rows={3}
                  style={{ width: '100%', border: 'none', outline: 'none', fontSize: 14, color: '#111', resize: 'none', backgroundColor: 'transparent', fontFamily: 'inherit', lineHeight: 1.5 }}
                />
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                  <button
                    onClick={handlePostSubmit}
                    disabled={postingPost || !newPostContent.trim()}
                    style={{ backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: 20, padding: '7px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: (!newPostContent.trim() || postingPost) ? 0.5 : 1 }}
                  >
                    Post
                  </button>
                </div>
              </div>
            )}
            {!user && (
              <div style={{ backgroundColor: 'white', borderRadius: 16, padding: 16, marginBottom: 12, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6' }}>
                <p style={{ fontSize: 14, color: '#6B7280', margin: '0 0 10px' }}>Sign in to post and interact</p>
                <Link href="/login" style={{ backgroundColor: '#7C3AED', color: 'white', textDecoration: 'none', borderRadius: 20, padding: '8px 20px', fontSize: 14, fontWeight: 600 }}>Sign In</Link>
              </div>
            )}
            {postsLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : posts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF', fontSize: 14 }}>No posts yet. Be the first! ð</div>
            ) : posts.map(post => (
              <div key={post.id} style={{ backgroundColor: 'white', borderRadius: 16, marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6', overflow: 'hidden' }}>
                <div style={{ padding: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, overflow: 'hidden' }}>
                      {post.author_photo ? <img src={post.author_photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (post.author_avatar ?? 'ð¤')}
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{post.author_name}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF' }}>{timeAgo(post.created_at)}</div>
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.55, margin: 0 }}>{post.content}</p>
                  {post.image_url && <img src={post.image_url} alt="" style={{ width: '100%', borderRadius: 10, marginTop: 10, objectFit: 'cover' }} />}
                  <div style={{ display: 'flex', gap: 20, marginTop: 12 }}>
                    <button onClick={() => handleLike(post.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: post.is_liked ? '#EF4444' : '#9CA3AF', fontWeight: post.is_liked ? 600 : 400, padding: 0 }}>
                      <span style={{ fontSize: 16 }}>{post.is_liked ? 'â¤ï¸' : 'ð¤'}</span> {post.like_count}
                    </button>
                    <button onClick={() => toggleComments(post.id)} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#9CA3AF', padding: 0 }}>
                      <span style={{ fontSize: 16 }}>ð¬</span> {post.comment_count}
                    </button>
                  </div>
                </div>
                {expandedComments.has(post.id) && (
                  <div style={{ borderTop: '1px solid #F3F4F6', padding: '10px 14px' }}>
                    {(comments[post.id] ?? []).map(c => (
                      <div key={c.id} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                          {c.author_avatar ?? 'ð¤'}
                        </div>
                        <div style={{ flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: '8px 10px' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{c.author_name} </span>
                          <span style={{ fontSize: 13, color: '#4B5563' }}>{c.content}</span>
                        </div>
                      </div>
                    ))}
                    {user && (
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <input
                          value={commentInputs[post.id] ?? ''}
                          onChange={e => setCommentInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={e => e.key === 'Enter' && handleComment(post.id)}
                          placeholder="Write a commentâ¦"
                          style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 20, padding: '7px 14px', fontSize: 13, outline: 'none', backgroundColor: '#F9FAFB' }}
                        />
                        <button onClick={() => handleComment(post.id)} style={{ backgroundColor: '#7C3AED', color: 'white', border: 'none', borderRadius: 20, padding: '7px 14px', fontSize: 13, cursor: 'pointer' }}>Send</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* CLASSROOM */}
        {tab === 'classroom' && (
          <div>
            {selectedCourse ? (
              <div>
                <button onClick={() => { setSelectedCourse(null); setLessons([]) }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#7C3AED', fontSize: 14, fontWeight: 600, cursor: 'pointer', padding: '0 0 12px', marginLeft: -4 }}>
                  â Back to Courses
                </button>
                <div style={{ backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6', marginBottom: 12 }}>
                  {selectedCourse.cover_image_url && <img src={selectedCourse.cover_image_url} alt="" style={{ width: '100%', height: 160, objectFit: 'cover' }} />}
                  <div style={{ padding: 14 }}>
                    <h2 style={{ margin: '0 0 4px', fontSize: 18, fontWeight: 700 }}>{selectedCourse.title}</h2>
                    {selectedCourse.description && <p style={{ margin: 0, fontSize: 14, color: '#6B7280' }}>{selectedCourse.description}</p>}
                  </div>
                </div>
                {lessonsLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : lessons.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 30, color: '#9CA3AF', fontSize: 14 }}>No lessons yet</div>
                ) : lessons.map((lesson, i) => (
                  <div key={lesson.id} style={{ backgroundColor: 'white', borderRadius: 14, padding: 14, marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#7C3AED', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 15, flexShrink: 0 }}>
                      {i + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#111' }}>{lesson.title}</div>
                      {lesson.content && <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lesson.content}</div>}
                    </div>
                    {lesson.video_url && <span style={{ fontSize: 12, color: '#7C3AED', backgroundColor: '#EDE9FE', borderRadius: 6, padding: '3px 8px', fontWeight: 600 }}>Video</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {coursesLoading ? (
                  <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                    <div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  </div>
                ) : courses.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF', fontSize: 14 }}>No courses yet</div>
                ) : courses.map(course => (
                  <button key={course.id} onClick={() => { setSelectedCourse(course); loadLessons(course.id) }}
                    style={{ width: '100%', backgroundColor: 'white', borderRadius: 16, overflow: 'hidden', marginBottom: 10, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6', cursor: 'pointer', textAlign: 'left', padding: 0 }}>
                    <div style={{ position: 'relative' }}>
                      {course.cover_image_url ? (
                        <img src={course.cover_image_url} alt="" style={{ width: '100%', height: 170, objectFit: 'cover', display: 'block' }} />
                      ) : (
                        <div style={{ width: '100%', height: 170, backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>
                          {course.emoji ?? 'ð'}
                        </div>
                      )}
                      <div style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.7)', borderRadius: 8, padding: '4px 10px' }}>
                        <span style={{ color: 'white', fontSize: 12, fontWeight: 600 }}>{course.lesson_count} Lesson{course.lesson_count !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div style={{ padding: '12px 14px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#111' }}>{course.title}</h3>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 18l6-6-6-6" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </div>
                      {course.description && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6B7280', lineHeight: 1.4 }}>{course.description}</p>}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 8 }}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none"><polygon points="5 3 19 12 5 21 5 3" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <span style={{ fontSize: 13, color: '#9CA3AF' }}>{course.lesson_count} Lesson{course.lesson_count !== 1 ? 's' : ''}</span>
                      </div>
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
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : members.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 14 }}>No members yet</div>
            ) : members.map(m => (
              <div key={m.profile_id} style={{ backgroundColor: 'white', borderRadius: 14, padding: '12px 14px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0, overflow: 'hidden' }}>
                  {m.photo_url ? <img src={m.photo_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.avatar_emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#111' }}>{m.display_name}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', textTransform: 'capitalize' }}>{m.role}</div>
                </div>
                {m.role === 'admin' && (
                  <div style={{ backgroundColor: '#FEF3C7', borderRadius: 20, padding: '4px 10px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 12 }}>ð</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>Admin</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* LEADERBOARD */}
        {tab === 'leaderboard' && (
          <div>
            {/* Your rank */}
            {user && (
              <div style={{ backgroundColor: 'white', borderRadius: 14, padding: '12px 14px', marginBottom: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                    {community.logo_image_url ? <img src={community.logo_image_url} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : (community.emoji ?? 'ð')}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#9CA3AF' }}>Your rank</div>
                    <div style={{ fontSize: 16, fontWeight: 700 }}>#1 Â· 0 pts</div>
                  </div>
                </div>
                {userRole === 'admin' && (
                  <div style={{ backgroundColor: '#FEF3C7', borderRadius: 20, padding: '5px 12px', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span>ð</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#92400E' }}>Admin</span>
                  </div>
                )}
              </div>
            )}

            {leaderboardLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <div style={{ width: 24, height: 24, border: '2.5px solid #E5E7EB', borderTopColor: '#7C3AED', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
              </div>
            ) : leaderboard.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: '#9CA3AF', fontSize: 14 }}>No leaderboard data yet</div>
            ) : (
              <div>
                {/* Podium for top 3 */}
                {leaderboard.length >= 2 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 12, marginBottom: 20, paddingTop: 10 }}>
                    {/* 2nd place */}
                    {leaderboard[1] && (
                      <div style={{ flex: 1, textAlign: 'center' }}>
                        <div style={{ width: 56, height: 56, borderRadius: '50%', backgroundColor: '#EDE9FE', margin: '0 auto 6px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, overflow: 'hidden', border: '2px solid #E5E7EB' }}>
                          {leaderboard[1].photo_url ? <img src={leaderboard[1].photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : leaderboard[1].avatar_emoji}
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{leaderboard[1].display_name}</div>
                        <div style={{ fontSize: 12, color: '#9CA3AF' }}>0p</div>
                        <div style={{ backgroundColor: '#F3F4F6', borderRadius: '8px 8px 0 0', padding: '10px 0', marginTop: 8 }}>
                          <span style={{ fontSize: 20, fontWeight: 700, color: '#9CA3AF' }}>#3</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {/* Rest of the list */}
                {leaderboard.slice(3).map((m, i) => (
                  <div key={m.profile_id} style={{ backgroundColor: 'white', borderRadius: 14, padding: '12px 14px', marginBottom: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 16, fontWeight: 700, color: '#9CA3AF', width: 28, textAlign: 'center' }}>#{i + 4}</span>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', backgroundColor: '#EDE9FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, overflow: 'hidden' }}>
                      {m.photo_url ? <img src={m.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : m.avatar_emoji}
                    </div>
                    <span style={{ flex: 1, fontSize: 15, fontWeight: 600, color: '#111' }}>{m.display_name}</span>
                    <span style={{ fontSize: 13, color: '#9CA3AF' }}>0 pts</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
