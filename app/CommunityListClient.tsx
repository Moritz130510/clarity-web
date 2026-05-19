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
}

export default function CommunityListClient({ communities }: { communities: Community[] }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

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
    const { data } = await supabase
      .from('community_members')
      .select('community_id')
      .eq('profile_id', userId)
    if (data) setJoinedIds(new Set(data.map(r => r.community_id)))
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.refresh()
  }

  const filtered = communities.filter(c =>
    search === '' ||
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.description ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const joined = filtered.filter(c => joinedIds.has(c.id))
  const discover = filtered.filter(c => !joinedIds.has(c.id))

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-gray-950/90 backdrop-blur-sm border-b border-gray-900 px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold">✦ Clarity</span>
          </div>
          {user ? (
            <button onClick={signOut} className="text-sm text-gray-400 hover:text-white transition-colors">
              Abmelden
            </button>
          ) : (
            <Link href="/login" className="text-sm text-purple-400 font-medium hover:text-purple-300 transition-colors">
              Anmelden
            </Link>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Search */}
        <div className="relative mb-6">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">🔍</span>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Communities suchen…"
            className="w-full bg-gray-900 border border-gray-800 rounded-xl pl-11 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Meine Communities */}
        {joined.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
              Meine Communities
            </h2>
            <div className="space-y-3">
              {joined.map(c => <CommunityCard key={c.id} community={c} isJoined />)}
            </div>
          </section>
        )}

        {/* Entdecken */}
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            {user && joined.length > 0 ? 'Entdecken' : 'Communities'}
          </h2>
          {discover.length === 0 && search !== '' ? (
            <p className="text-gray-600 text-sm text-center py-8">Keine Ergebnisse</p>
          ) : (
            <div className="space-y-3">
              {discover.map(c => <CommunityCard key={c.id} community={c} />)}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function CommunityCard({ community: c, isJoined }: { community: Community; isJoined?: boolean }) {
  return (
    <Link href={`/community/${c.id}`}>
      <div className="bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-700 rounded-2xl overflow-hidden transition-all cursor-pointer">
        {c.cover_image_url && (
          <div className="h-24 relative">
            <img src={c.cover_image_url} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 to-transparent" />
          </div>
        )}
        <div className="p-4 flex gap-3">
          <div className="w-12 h-12 rounded-xl bg-gray-800 flex items-center justify-center text-2xl flex-shrink-0 overflow-hidden">
            {c.logo_image_url
              ? <img src={c.logo_image_url} alt="" className="w-full h-full object-cover" />
              : c.emoji ?? '🌐'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold truncate">{c.name}</span>
              {isJoined && <span className="text-xs text-purple-400 flex-shrink-0">Mitglied</span>}
            </div>
            {c.description && (
              <p className="text-gray-400 text-sm mt-0.5 line-clamp-2">{c.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
              <span>{(c.member_count ?? 0).toLocaleString('de')} Mitglieder</span>
              {c.category && <span>· {c.category}</span>}
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}
