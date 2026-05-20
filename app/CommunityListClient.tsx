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
        if (data) setJoinedIds(new Set(data.map(r => r.community_id)))
  }

  async function signOut() {
        await supabase.auth.signOut()
        router.refresh()
  }

  const filtered = communities.filter(c => {
        const matchesSearch = search === '' || c.name.toLowerCase().includes(search.toLowerCase()) || (c.description ?? '').toLowerCase().includes(search.toLowerCase())
        const matchesCategory = activeCategory === 'All' || (c.category ?? '').toLowerCase() === activeCategory.toLowerCase()
        return matchesSearch && matchesCategory
  })

  const joined = filtered.filter(c => joinedIds.has(c.id))
    const discover = filtered.filter(c => !joinedIds.has(c.id))
    const availableCategories = CATEGORIES.filter(cat => cat === 'All' || communities.some(c => (c.category ?? '').toLowerCase() === cat.toLowerCase()))

  return (
        <div className="min-h-screen" style={{ backgroundColor: '#F2F2F7' }}>
                <div className="sticky top-0 z-10 border-b" style={{ backgroundColor: 'rgba(242,242,247,0.92)', backdropFilter: 'blur(12px)', borderColor: '#E5E7EB' }}>
                          <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
                                    <span className="text-lg font-bold">Community</span>span>
                            {user ? (
                      <button onClick={signOut} className="text-sm font-medium" style={{ color: '#7C3AED' }}>Sign Out</button>button>
                    ) : (
                      <Link href="/login" className="text-sm font-semibold" style={{ color: '#7C3AED' }}>Sign In</Link>Link>
                                    )}
                          </div>div>
                </div>div>
              <div className="max-w-2xl mx-auto px-4 py-5">
                      <div className="relative mb-4">
                                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>svg>
                                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search communities…" className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm border focus:outline-none" style={{ backgroundColor: 'white', borderColor: '#E5E7EB' }} />
                      </div>div>
                      <div className="flex gap-2 overflow-x-auto pb-3 mb-5" style={{ scrollbarWidth: 'none' }}>
                        {availableCategories.map(cat => (
                      <button key={cat} onClick={() => setActiveCategory(cat)} className="flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium" style={{ backgroundColor: activeCategory === cat ? '#7C3AED' : 'white', color: activeCategory === cat ? 'white' : '#111827', border: activeCategory === cat ? 'none' : '1.5px solid #E5E7EB' }}>{cat}</button>button>
                    ))}
                      </div>div>
                {joined.length > 0 && (
                    <section className="mb-6">
                                <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-gray-400">My Communities</p>p>
                                <div className="grid grid-cols-2 gap-3">{joined.map(c => <CommunityCard key={c.id} community={c} isJoined />)}</div>div>
                    </section>section>
                      )}
                {user && discover.length === 0 && joined.length > 0 && search === '' && activeCategory === 'All' && (
                    <p className="text-center text-sm text-gray-400 py-4">You've joined all available communities 🎉</p>p>
                      )}
                {discover.length > 0 && (
                    <section>
                                <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-gray-400">{user && joined.length > 0 ? 'Discover' : 'Communities'}</p>p>
                                <div className="grid grid-cols-2 gap-3">{discover.map(c => <CommunityCard key={c.id} community={c} />)}</div>div>
                    </section>section>
                      )}
                {filtered.length === 0 && search !== '' && <p className="text-sm text-center text-gray-400 py-8">No results for “{search}”</p>p>}
              </div>div>
        </div>div>
      )
}

function CommunityCard({ community: c, isJoined }: { community: Community; isJoined?: boolean }) {
    const isVerified = VERIFIED_NAMES.includes(c.name)
        const isFree = !c.price_type || c.price_type === 'free'
            return (
                  <Link href={`/community/${c.id}`}>
                        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', border: '1px solid #E5E7EB' }}>
                                <div className="relative w-full" style={{ paddingTop: '65%' }}>
                                  {c.cover_image_url ? (
                                <img src={c.cover_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-4xl" style={{ backgroundColor: '#EDE9FE' }}>{c.emoji ?? '🌐'}</div>div>
                                          )}
                                  {isFree && <span className="absolute top-2 right-2 text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#22C55E', color: 'white' }}>Free</span>span>}
                                  {c.logo_image_url && <div className="absolute bottom-2 left-2 w-8 h-8 rounded-lg overflow-hidden" style={{ border: '2px solid white' }}><img src={c.logo_image_url} alt="" className="w-full h-full object-cover" /></div>div>}
                                </div>div>
                                <div className="px-3 pt-2 pb-3">
                                          <div className="flex items-center gap-1">
                                                      <span className="font-semibold text-sm truncate">{c.name}</span>span>
                                            {isVerified && <VerifiedBadge />}
                                          </div>div>
                                  {isJoined ? (
                                <div className="flex items-center gap-1 mt-0.5">
                                              <svg className="w-3.5 h-3.5" style={{ color: '#22C55E' }} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>svg>
                                              <span className="text-xs font-medium" style={{ color: '#22C55E' }}>Member</span>span>
                                </div>div>
                              ) : (
                                <p className="text-xs mt-0.5 text-gray-400 truncate">{(c.member_count ?? 0).toLocaleString()} members</p>p>
                                          )}
                                </div>div>
                        </div>div>
                  </Link>Link>
                )
}

function VerifiedBadge() {
    return (
          <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="12" fill="#3B82F6" />
                <path d="M8 12l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>svg>
        )
}</div>
