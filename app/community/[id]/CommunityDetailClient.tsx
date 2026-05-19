'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { User } from '@supabase/supabase-js'
import Link from 'next/link'

type Tab = 'feed' | 'members' | 'classroom' | 'info'

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
  lesson_count?: number
}

interface Lesson {
  id: string
  title: string
  content: string | null
  video_url: string | null
  lesson_order: number
}

export default function CommunityDetailClient({ community }: { community: Community }) {
  const [tab, setTab] = useState<Tab>('feed')
  const [user, setUser] = useState<User | null>(null)
  const [isJoined, setIsJoined] = useState(false)
  const [memberCount, setMemberCount] = useState(community.member_count ?? 0)
  const [joining, setJoining] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user)
      if (data.user) checkMembership(data.user.id)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
      if (session?.user) checkMembership(session.user.id)
      else setIsJoined(false)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  async function checkMembership(userId: string) {
    const { data } = await supabase
      .from('community_members')
      .select('profile_id')
      .eq('community_id', community.id)
      .eq('profile_id', userId)
      .maybeSingle()
    setIsJoined(!!data)
  }

  async function handleJoin() {
    if (!user) { window.location.href = '/login'; return }
    setJoining(true)
    if (isJoined) {
      await supabase.from('community_members').delete()
        .eq('community_id', community.id).eq('profile_id', user.id)
      setIsJoined(false)
      setMemberCount(n => Math.max(0, n - 1))
    } else {
      await supabase.from('community_members').insert({
        community_id: community.id, profile_id: user.id, role: 'member'
      })
      setIsJoined(true)
      setMemberCount(n => n + 1)
    }
    setJoining(false)
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: 'feed', label: 'Feed' },
    { id: 'members', label: 'Mitglieder' },
    { id: 'classroom', label: 'Classroom' },
    { id: 'info', label: 'Info' },
  ]

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Back nav */}
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-900 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-1 text-sm">
            ← Zurück
          </Link>
          <span className="font-semibold truncate px-4">{community.name}</span>
          <div className="w-16" />
        </div>
      </div>

      {/* Banner */}
      <div className="relative h-40 bg-gradient-to-br from-purple-900 to-indigo-900">
        {community.cover_image_url && (
          <img src={community.cover_image_url} alt="" className="w-full h-full object-cover opacity-60" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 to-transparent" />
      </div>

      <div className="max-w-2xl mx-auto px-4">
        {/* Header */}
        <div className="flex items-end justify-between -mt-8 mb-4">
          <div className="flex items-end gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-800 border-4 border-gray-950 flex items-center justify-center text-3xl overflow-hidden flex-shrink-0">
              {community.logo_image_url
                ? <img src={community.logo_image_url} alt="" className="w-full h-full object-cover" />
                : community.emoji ?? '🌐'}
            </div>
            <div className="pb-1">
              <h1 className="text-xl font-bold leading-tight">{community.name}</h1>
              <p className="text-gray-400 text-sm">{memberCount.toLocaleString('de')} Mitglieder</p>
            </div>
          </div>
          <button
            onClick={handleJoin}
            disabled={joining}
            className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all ${
              isJoined
                ? 'bg-gray-800 text-gray-300 border border-gray-700 hover:bg-gray-700'
                : 'bg-purple-600 hover:bg-purple-500 text-white'
            }`}
          >
            {joining ? '…' : isJoined ? 'Beigetreten' : 'Beitreten'}
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800 mb-4">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-1 py-3 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t.id
                  ? 'text-white border-purple-500'
                  : 'text-gray-500 border-transparent hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="pb-20">
          {tab === 'feed' && <FeedTab community={community} user={user} isJoined={isJoined} />}
          {tab === 'members' && <MembersTab communityId={community.id} />}
          {tab === 'classroom' && <ClassroomTab communityId={community.id} />}
          {tab === 'info' && <InfoTab community={community} />}
        </div>
      </div>
    </div>
  )
}

// ─── Feed Tab ────────────────────────────────────────────────────────────────

function FeedTab({ community, user, isJoined }: { community: Community; user: User | null; isJoined: boolean }) {
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [newContent, setNewContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())

  const loadPosts = useCallback(async () => {
    const { data } = await supabase
      .from('community_posts')
      .select(`
        id, content, image_url, created_at, author_id,
        profiles!community_posts_author_id_fkey(display_name, avatar_emoji, photo_url)
      `)
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!data) { setLoading(false); return }

    const postIds = data.map(p => p.id)

    const [likesRes, commentCountRes, userLikesRes] = await Promise.all([
      supabase.from('community_post_likes').select('post_id').in('post_id', postIds),
      supabase.from('community_comments').select('post_id').in('post_id', postIds).is('parent_comment_id', null),
      user
        ? supabase.from('community_post_likes').select('post_id').in('post_id', postIds).eq('user_id', user.id)
        : Promise.resolve({ data: [] }),
    ])

    const likeCounts: Record<string, number> = {}
    const commentCounts: Record<string, number> = {}
    const likedSet = new Set<string>()

    likesRes.data?.forEach(l => { likeCounts[l.post_id] = (likeCounts[l.post_id] ?? 0) + 1 })
    commentCountRes.data?.forEach(c => { commentCounts[c.post_id] = (commentCounts[c.post_id] ?? 0) + 1 })
    userLikesRes.data?.forEach(l => likedSet.add(l.post_id))

    setPosts(data.map(p => {
      const profile = p.profiles as unknown as { display_name: string; avatar_emoji: string; photo_url: string | null } | null
      return {
        id: p.id,
        content: p.content,
        image_url: p.image_url,
        created_at: p.created_at,
        author_id: p.author_id,
        author_name: profile?.display_name ?? 'Unbekannt',
        author_avatar: profile?.avatar_emoji ?? '😊',
        author_photo: profile?.photo_url ?? null,
        like_count: likeCounts[p.id] ?? 0,
        comment_count: commentCounts[p.id] ?? 0,
        is_liked: likedSet.has(p.id),
      }
    }))
    setLoading(false)
  }, [community.id, user])

  useEffect(() => { loadPosts() }, [loadPosts])

  async function submitPost() {
    if (!user || !newContent.trim()) return
    setPosting(true)
    await supabase.from('community_posts').insert({
      community_id: community.id,
      author_id: user.id,
      content: newContent.trim(),
    })
    setNewContent('')
    await loadPosts()
    setPosting(false)
  }

  async function toggleLike(post: Post) {
    if (!user) { window.location.href = '/login'; return }
    if (post.is_liked) {
      await supabase.from('community_post_likes').delete()
        .eq('post_id', post.id).eq('user_id', user.id)
    } else {
      await supabase.from('community_post_likes').insert({ post_id: post.id, user_id: user.id })
    }
    setPosts(prev => prev.map(p =>
      p.id === post.id
        ? { ...p, is_liked: !p.is_liked, like_count: p.is_liked ? p.like_count - 1 : p.like_count + 1 }
        : p
    ))
  }

  function toggleComments(postId: string) {
    setExpandedComments(prev => {
      const next = new Set(prev)
      if (next.has(postId)) next.delete(postId)
      else next.add(postId)
      return next
    })
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="space-y-4">
      {/* Post composer */}
      {user && isJoined && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4">
          <div className="flex gap-3">
            <Avatar emoji="😊" size={36} />
            <textarea
              value={newContent}
              onChange={e => setNewContent(e.target.value)}
              placeholder="Was möchtest du teilen?"
              rows={3}
              className="flex-1 bg-gray-800 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 resize-none"
            />
          </div>
          {newContent.trim() && (
            <div className="flex justify-end mt-3">
              <button
                onClick={submitPost}
                disabled={posting}
                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
              >
                {posting ? '…' : 'Posten'}
              </button>
            </div>
          )}
        </div>
      )}
      {!user && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center text-sm text-gray-500">
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">Anmelden</Link>
          {' '}um zu posten und zu interagieren
        </div>
      )}
      {user && !isJoined && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 text-center text-sm text-gray-500">
          Tritt der Community bei, um zu posten
        </div>
      )}

      {posts.length === 0 && (
        <div className="text-center text-gray-600 py-12">
          <p className="text-3xl mb-2">📝</p>
          <p>Noch keine Beiträge</p>
        </div>
      )}

      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          user={user}
          onLike={() => toggleLike(post)}
          onComment={() => toggleComments(post.id)}
          showComments={expandedComments.has(post.id)}
        />
      ))}
    </div>
  )
}

function PostCard({
  post, user, onLike, onComment, showComments
}: {
  post: Post; user: User | null; onLike: () => void; onComment: () => void; showComments: boolean
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden">
      <div className="p-4">
        {/* Author */}
        <div className="flex items-center gap-3 mb-3">
          <Avatar emoji={post.author_avatar ?? '😊'} photoUrl={post.author_photo} size={36} />
          <div>
            <p className="font-semibold text-sm">{post.author_name}</p>
            <p className="text-gray-500 text-xs">{formatDate(post.created_at)}</p>
          </div>
        </div>

        {/* Content */}
        <p className="text-sm leading-relaxed whitespace-pre-wrap">{post.content}</p>

        {post.image_url && (
          <div className="mt-3 rounded-xl overflow-hidden">
            <img src={post.image_url} alt="" className="w-full object-cover max-h-64" />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 mt-4 pt-3 border-t border-gray-800">
          <button
            onClick={onLike}
            className={`flex items-center gap-1.5 text-sm transition-colors ${
              post.is_liked ? 'text-red-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span>{post.is_liked ? '❤️' : '🤍'}</span>
            <span>{post.like_count > 0 ? post.like_count : ''}</span>
          </button>
          <button
            onClick={onComment}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            <span>💬</span>
            <span>{post.comment_count > 0 ? post.comment_count : ''}</span>
          </button>
        </div>
      </div>

      {showComments && <CommentsSection postId={post.id} user={user} />}
    </div>
  )
}

function CommentsSection({ postId, user }: { postId: string; user: User | null }) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  useEffect(() => {
    loadComments()
  }, [postId])

  async function loadComments() {
    const { data } = await supabase
      .from('community_comments')
      .select(`
        id, content, created_at, author_id, parent_comment_id,
        profiles!community_comments_author_id_fkey(display_name, avatar_emoji)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
    if (data) {
      setComments(data.map(c => {
        const profile = c.profiles as unknown as { display_name: string; avatar_emoji: string } | null
        return {
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          author_id: c.author_id,
          author_name: profile?.display_name ?? 'Unbekannt',
          author_avatar: profile?.avatar_emoji ?? '😊',
          parent_comment_id: c.parent_comment_id,
        }
      }))
    }
    setLoading(false)
  }

  async function sendComment() {
    if (!user || !newComment.trim()) return
    setSending(true)
    await supabase.from('community_comments').insert({
      post_id: postId,
      author_id: user.id,
      content: newComment.trim(),
    })
    setNewComment('')
    await loadComments()
    setSending(false)
  }

  if (loading) return <div className="px-4 pb-4"><LoadingSpinner /></div>

  return (
    <div className="border-t border-gray-800 px-4 pb-4">
      <div className="space-y-3 pt-3">
        {comments.map(c => (
          <div key={c.id} className={`flex gap-2.5 ${c.parent_comment_id ? 'ml-8' : ''}`}>
            <Avatar emoji={c.author_avatar ?? '😊'} size={28} />
            <div className="flex-1 bg-gray-800 rounded-xl px-3 py-2">
              <p className="text-xs font-semibold text-gray-300 mb-0.5">{c.author_name}</p>
              <p className="text-sm text-gray-200 leading-relaxed">{c.content}</p>
            </div>
          </div>
        ))}
      </div>
      {user && (
        <div className="flex gap-2 mt-3">
          <Avatar emoji="😊" size={28} />
          <input
            value={newComment}
            onChange={e => setNewComment(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendComment() } }}
            placeholder="Kommentar schreiben…"
            className="flex-1 bg-gray-800 rounded-xl px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
          {newComment.trim() && (
            <button
              onClick={sendComment}
              disabled={sending}
              className="text-purple-400 hover:text-purple-300 text-sm font-medium disabled:opacity-50"
            >
              {sending ? '…' : '↑'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Members Tab ──────────────────────────────────────────────────────────────

function MembersTab({ communityId }: { communityId: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('community_members')
      .select(`
        profile_id, role,
        profiles!community_members_profile_id_fkey(display_name, avatar_emoji, photo_url)
      `)
      .eq('community_id', communityId)
      .order('created_at', { ascending: false })
      .limit(100)
      .then(({ data }) => {
        if (data) {
          setMembers(data.map(m => {
            const p = m.profiles as unknown as { display_name: string; avatar_emoji: string; photo_url: string | null } | null
            return {
              profile_id: m.profile_id,
              role: m.role,
              display_name: p?.display_name ?? 'Unbekannt',
              avatar_emoji: p?.avatar_emoji ?? '😊',
              photo_url: p?.photo_url ?? null,
            }
          }))
        }
        setLoading(false)
      })
  }, [communityId])

  if (loading) return <LoadingSpinner />

  const admins = members.filter(m => m.role === 'admin' || m.role === 'owner')
  const regular = members.filter(m => m.role !== 'admin' && m.role !== 'owner')

  return (
    <div className="space-y-6">
      {admins.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Admins</h3>
          <div className="space-y-2">
            {admins.map(m => <MemberRow key={m.profile_id} member={m} />)}
          </div>
        </div>
      )}
      <div>
        {admins.length > 0 && (
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Mitglieder · {regular.length}
          </h3>
        )}
        <div className="space-y-2">
          {regular.map(m => <MemberRow key={m.profile_id} member={m} />)}
        </div>
      </div>
      {members.length === 0 && (
        <div className="text-center text-gray-600 py-12">
          <p className="text-3xl mb-2">👥</p>
          <p>Noch keine Mitglieder</p>
        </div>
      )}
    </div>
  )
}

function MemberRow({ member }: { member: Member }) {
  const roleLabel: Record<string, string> = {
    owner: 'Eigentümer',
    admin: 'Admin',
    member: '',
  }
  return (
    <div className="flex items-center gap-3 p-3 bg-gray-900 rounded-xl">
      <Avatar emoji={member.avatar_emoji} photoUrl={member.photo_url} size={40} />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm truncate">{member.display_name}</p>
      </div>
      {roleLabel[member.role] && (
        <span className="text-xs text-purple-400 font-medium">{roleLabel[member.role]}</span>
      )}
    </div>
  )
}

// ─── Classroom Tab ────────────────────────────────────────────────────────────

function ClassroomTab({ communityId }: { communityId: string }) {
  const [courses, setCourses] = useState<Course[]>([])
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingLessons, setLoadingLessons] = useState(false)

  useEffect(() => {
    supabase
      .from('community_courses')
      .select('id, title, description, emoji')
      .eq('community_id', communityId)
      .order('created_at', { ascending: true })
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return }

        // Get lesson counts
        const counts: Record<string, number> = {}
        for (const c of data) {
          const { count } = await supabase
            .from('course_lessons')
            .select('*', { count: 'exact', head: true })
            .eq('course_id', c.id)
          counts[c.id] = count ?? 0
        }

        setCourses(data.map(c => ({ ...c, lesson_count: counts[c.id] ?? 0 })))
        setLoading(false)
      })
  }, [communityId])

  async function openCourse(course: Course) {
    setSelectedCourse(course)
    setSelectedLesson(null)
    setLoadingLessons(true)
    const { data } = await supabase
      .from('course_lessons')
      .select('id, title, content, video_url, lesson_order')
      .eq('course_id', course.id)
      .order('lesson_order', { ascending: true })
    setLessons(data ?? [])
    setLoadingLessons(false)
  }

  if (loading) return <LoadingSpinner />

  // Lesson detail view
  if (selectedLesson) {
    return (
      <div>
        <button
          onClick={() => setSelectedLesson(null)}
          className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition-colors"
        >
          ← {selectedCourse?.title}
        </button>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h2 className="text-lg font-bold mb-4">{selectedLesson.title}</h2>
          {selectedLesson.video_url && (
            <div className="mb-4 rounded-xl overflow-hidden bg-black aspect-video">
              <video src={selectedLesson.video_url} controls className="w-full h-full" />
            </div>
          )}
          {selectedLesson.content && (
            <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{selectedLesson.content}</p>
          )}
        </div>
      </div>
    )
  }

  // Lessons list view
  if (selectedCourse) {
    return (
      <div>
        <button
          onClick={() => setSelectedCourse(null)}
          className="flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-4 transition-colors"
        >
          ← Alle Kurse
        </button>
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">{selectedCourse.emoji ?? '📚'}</span>
            <div>
              <h2 className="font-bold">{selectedCourse.title}</h2>
              {selectedCourse.description && (
                <p className="text-gray-400 text-sm mt-0.5">{selectedCourse.description}</p>
              )}
            </div>
          </div>
        </div>

        {loadingLessons ? <LoadingSpinner /> : (
          <div className="space-y-2">
            {lessons.length === 0 && (
              <div className="text-center text-gray-600 py-8">Noch keine Lektionen</div>
            )}
            {lessons.map((lesson, idx) => (
              <button
                key={lesson.id}
                onClick={() => setSelectedLesson(lesson)}
                className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-xl p-4 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-900/50 flex items-center justify-center text-purple-400 font-bold text-sm flex-shrink-0">
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{lesson.title}</p>
                    {lesson.video_url && <p className="text-xs text-gray-500 mt-0.5">▶ Video</p>}
                  </div>
                  <span className="text-gray-600 text-sm">›</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Courses list
  return (
    <div className="space-y-3">
      {courses.length === 0 && (
        <div className="text-center text-gray-600 py-12">
          <p className="text-3xl mb-2">🎓</p>
          <p>Noch keine Kurse</p>
        </div>
      )}
      {courses.map(course => (
        <button
          key={course.id}
          onClick={() => openCourse(course)}
          className="w-full bg-gray-900 hover:bg-gray-800 border border-gray-800 rounded-2xl p-4 text-left transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gray-800 flex items-center justify-center text-3xl flex-shrink-0">
              {course.emoji ?? '📚'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{course.title}</p>
              {course.description && (
                <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">{course.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">{course.lesson_count} Lektion{course.lesson_count !== 1 ? 'en' : ''}</p>
            </div>
            <span className="text-gray-600">›</span>
          </div>
        </button>
      ))}
    </div>
  )
}

// ─── Info Tab ─────────────────────────────────────────────────────────────────

function InfoTab({ community }: { community: Community }) {
  return (
    <div className="space-y-4">
      {community.description && (
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Über diese Community</h3>
          <p className="text-gray-300 leading-relaxed">{community.description}</p>
        </div>
      )}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-4">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Details</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">Kategorie</p>
            <p className="font-medium mt-0.5">{community.category ?? '–'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Mitglieder</p>
            <p className="font-medium mt-0.5">{(community.member_count ?? 0).toLocaleString('de')}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Zugang</p>
            <p className="font-medium mt-0.5 text-green-400">Kostenlos</p>
          </div>
        </div>
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
        <p className="text-xs text-gray-500 text-center">
          Diese Community ist auch in der{' '}
          <span className="text-purple-400 font-medium">Clarity App</span>{' '}
          verfügbar
        </p>
      </div>
    </div>
  )
}

// ─── Shared components ────────────────────────────────────────────────────────

function Avatar({ emoji, photoUrl, size }: { emoji: string; photoUrl?: string | null; size: number }) {
  return (
    <div
      style={{ width: size, height: size, minWidth: size }}
      className="rounded-full bg-gray-700 flex items-center justify-center overflow-hidden text-base"
    >
      {photoUrl
        ? <img src={photoUrl} alt="" className="w-full h-full object-cover" />
        : <span style={{ fontSize: size * 0.55 }}>{emoji}</span>}
    </div>
  )
}

function LoadingSpinner() {
  return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = (now.getTime() - d.getTime()) / 1000
  if (diff < 60) return 'Gerade eben'
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`
  if (diff < 86400) return `vor ${Math.floor(diff / 3600)} Std.`
  if (diff < 604800) return `vor ${Math.floor(diff / 86400)} Tagen`
  return d.toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })
}
