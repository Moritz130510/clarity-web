import { supabase } from '@/lib/supabase'
import CommunityListClient from './CommunityListClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  // Defensive query - some columns may not exist on all schema versions
  let { data: communities, error } = await supabase
    .from('communities')
    .select('id, name, description, category, emoji, cover_image_url, logo_image_url, member_count, price_type, is_private, created_by')
    .eq('is_private', false)
    .order('member_count', { ascending: false })

  // If is_private column doesn't exist, fall back
  if (error) {
    const fallback = await supabase
      .from('communities')
      .select('id, name, description, category, emoji, cover_image_url, logo_image_url, member_count, price_type, created_by')
      .order('member_count', { ascending: false })
    communities = (fallback.data ?? []).map((c) => ({ ...c, is_private: false }))
  }

  return <CommunityListClient communities={communities ?? []} />
}
