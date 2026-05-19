import { supabase } from '@/lib/supabase'
import CommunityListClient from './CommunityListClient'

export const revalidate = 60

export default async function HomePage() {
  const { data: communities } = await supabase
    .from('communities')
    .select('id, name, description, category, emoji, cover_image_url, logo_image_url, member_count, price_type')
    .order('member_count', { ascending: false })

  return <CommunityListClient communities={communities ?? []} />
}
