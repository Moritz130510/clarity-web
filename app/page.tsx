import { createClient } from '@supabase/supabase-js'
import HomeClient from './HomeClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: communities } = await supabase
    .from('communities')
    .select('id, name, description, category, emoji, cover_image_url, logo_image_url, member_count, price_type, is_private, created_by, created_at, post_count, cover_color, price_amount, post_permission, is_banned, community_type, invite_code')
    .order('member_count', { ascending: false, nullsFirst: false })
    .limit(100)

  const list = (communities ?? []) as any[]
  const creatorIds = Array.from(new Set(list.map(c => c.created_by).filter(Boolean)))

  let verifiedCreatorIds: string[] = []
  if (creatorIds.length > 0) {
    const { data: verifiedProfiles } = await supabase
      .from('community_profiles')
      .select('id')
      .in('id', creatorIds)
      .or('is_verified.eq.true,is_ceo.eq.true')
    verifiedCreatorIds = (verifiedProfiles ?? []).map(p => p.id)
  }

  return <HomeClient allCommunities={list} verifiedCreatorIds={verifiedCreatorIds} />
}
