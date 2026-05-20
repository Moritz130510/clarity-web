import { createClient } from '@supabase/supabase-js'
import HomeClient from './HomeClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function Home() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // Defensive: select only columns guaranteed to exist
  const { data: communities } = await supabase
    .from('communities')
    .select('id, name, description, category, emoji, cover_image_url, logo_image_url, member_count, price_type, is_private, created_by')
    .order('member_count', { ascending: false, nullsFirst: false })
    .limit(100)

  return <HomeClient allCommunities={communities ?? []} />
}
