import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { supabaseAdmin } from '@/lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')!

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session
    const { communityId, priceType } = session.metadata ?? {}
    const clarityId = session.customer_email ?? session.customer_details?.email ?? ''

    if (communityId && clarityId) {
      const db = supabaseAdmin()

      // Find the profile by email/clarityId
      const { data: profile } = await db
        .from('community_profiles')
        .select('id')
        .eq('clarity_id', clarityId)
        .single()

      if (profile?.id) {
        // Add to community_members
        await db.from('community_members').upsert({
          community_id: communityId,
          profile_id: profile.id,
          role: 'member',
          joined_at: new Date().toISOString(),
        }, { onConflict: 'community_id,profile_id' })

        // Record purchase
        await db.from('community_purchases').insert({
          community_id: communityId,
          profile_id: profile.id,
          purchase_type: priceType ?? 'once',
          amount: session.amount_total ? session.amount_total / 100 : null,
          stripe_payment_intent_id: session.payment_intent as string ?? session.id,
          status: 'completed',
        })
      }
    }
  }

  return NextResponse.json({ received: true })
}
