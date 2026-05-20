import { supabase } from '@/lib/supabase'
import CommunityListClient from './CommunityListClient'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
    const { data: communities } = await supabase
      .from('communities')
      .select('id, name, description, category, emoji, cover_image_url, logo_image_url, member_count, price_type, is_private, created_by')
      .eq('is_private', false)
      .eq('is_banned', false)
      .order('member_count', { ascending: false })

  return <CommunityListClient communities={communities ?? []} />
}
