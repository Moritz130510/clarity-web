'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Profile } from './types'
import { CEO_EMAIL } from './types'

interface ProfileContextValue {
  user: User | null
  profile: Profile | null
  loading: boolean
  isCEO: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const ProfileContext = createContext<ProfileContextValue | null>(null)

export function ProfileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  // SCHEMA (verified against migration.sql + live DB):
  //   community_profiles.id        = own UUID, used as FK target
  //                                  (communities.created_by, community_members.profile_id,
  //                                   community_posts.author_id, etc. all point here)
  //   community_profiles.clarity_id = auth.users.id (stored UPPERCASE by iOS app)
  // Lookup must be case-insensitive because iOS writes uppercase while the
  // Supabase JS client returns auth.uid() lowercase.
  const loadProfile = useCallback(async (authUser: User): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('community_profiles')
      .select('*')
      .ilike('clarity_id', authUser.id)
      .maybeSingle()

    if (error) {
      console.warn('[profile-context] loadProfile error:', error)
      return null
    }

    if (data) {
      // Promote CEO automatically (iOS app may not set this flag)
      if (authUser.email === CEO_EMAIL && (!data.is_ceo || !data.is_verified)) {
        const { data: upd } = await supabase
          .from('community_profiles')
          .update({ is_ceo: true, is_verified: true })
          .eq('id', data.id)
          .select()
          .single()
        return (upd as Profile) ?? (data as Profile)
      }
      return data as Profile
    }

    // No row yet (user signed up via web, never used iOS) — create one.
    // clarity_id stored UPPERCASE to match iOS convention.
    const defaultName = authUser.email?.split('@')[0] || 'User'
    const { data: created, error: createErr } = await supabase
      .from('community_profiles')
      .insert({
        clarity_id: authUser.id.toUpperCase(),
        display_name: defaultName,
        avatar_emoji: '😊',
        total_points: 0,
        level: 1,
        is_verified: authUser.email === CEO_EMAIL,
        is_ceo: authUser.email === CEO_EMAIL,
        is_banned: false,
      })
      .select()
      .single()

    if (createErr) {
      console.error('[profile-context] could not create profile:', createErr)
      return null
    }
    return created as Profile
  }, [])

  const refreshProfile = useCallback(async () => {
    if (!user) return
    const p = await loadProfile(user)
    setProfile(p)
  }, [user, loadProfile])

  useEffect(() => {
    let mounted = true

    supabase.auth.getUser().then(async ({ data }) => {
      if (!mounted) return
      const u = data.user
      setUser(u)
      if (u) {
        const p = await loadProfile(u)
        if (mounted) setProfile(p)
      }
      if (mounted) setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        const p = await loadProfile(u)
        if (mounted) setProfile(p)
      } else {
        setProfile(null)
      }
    })

    return () => {
      mounted = false
      sub.subscription.unsubscribe()
    }
  }, [loadProfile])

  const signOut = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }, [])

  const isCEO = profile?.is_ceo === true || user?.email === CEO_EMAIL

  return (
    <ProfileContext.Provider value={{ user, profile, loading, isCEO, refreshProfile, signOut }}>
      {children}
    </ProfileContext.Provider>
  )
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile must be used inside ProfileProvider')
  return ctx
}
