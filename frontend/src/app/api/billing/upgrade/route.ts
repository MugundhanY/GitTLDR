import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'

// Lazy initialization to avoid build-time errors when STRIPE_SECRET_KEY is not set
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-05-28.basil',
  })
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe()
    const { plan } = await request.json()

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan is required' },
        { status: 400 }
      )
    }

    // Define price IDs for different plans
    const priceIds: Record<string, string> = {
      pro: 'price_pro_monthly', // Replace with actual Stripe price IDs
      enterprise: 'price_enterprise_monthly',
    }

    const priceId = priceIds[plan]
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan' },
        { status: 400 }
      )
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata: {
        userId: '1', // TODO: Get actual user ID from auth
        plan,
      },
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/billing`,
      allow_promotion_codes: true,
    })

    return NextResponse.json({ checkoutUrl: session.url })
  } catch (error) {
    console.error('Error creating upgrade session:', error)
    return NextResponse.json(
      { error: 'Failed to create upgrade session' },
      { status: 500 }
    )
  }
}
