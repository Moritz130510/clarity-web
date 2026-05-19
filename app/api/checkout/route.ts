import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function POST(req: NextRequest) {
  const formData = await req.formData()
  const communityId = formData.get('communityId') as string
  const communityName = formData.get('communityName') as string
  const priceAmount = parseFloat(formData.get('priceAmount') as string)
  const priceType = formData.get('priceType') as string

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card', 'paypal'],
    line_items: [{
      price_data: {
        currency: 'eur',
        product_data: {
          name: communityName,
          description: `Clarity Community Mitgliedschaft${priceType === 'monthly' ? ' (monatlich)' : ''}`,
        },
        unit_amount: Math.round(priceAmount * 100),
        ...(priceType === 'monthly' ? { recurring: { interval: 'month' } } : {}),
      } as any,
      quantity: 1,
    }],
    mode: priceType === 'monthly' ? 'subscription' : 'payment',
    success_url: `${baseUrl}/success?community=${communityId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/community/${communityId}`,
    metadata: { communityId, priceType },
  })

  return NextResponse.redirect(session.url!, 303)
}
