import { NextRequest, NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

// POST /api/billing/create-checkout-session
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, priceId, successUrl, cancelUrl } = body;

    if (!userId || !priceId) {
      return NextResponse.json(
        { error: 'User ID and price ID are required' },
        { status: 400 }
      );
    }

    // Create Stripe checkout session
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
        userId,
      },
      success_url: successUrl || `${process.env.FRONTEND_URL}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/pricing`,
    });

    return NextResponse.json({ sessionId: session.id, url: session.url });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json(
      { error: 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}

// GET /api/billing - Get subscription and billing data
export async function GET(request: NextRequest) {
  try {
    // TODO: Get user ID from authentication - for now using mock data
    // Since we don't have real billing integration yet, return null so userData credits are used
    return NextResponse.json({ 
      subscription: null,
      invoices: []
    });

  } catch (error) {
    console.error('Error fetching billing data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch billing data' },
      { status: 500 }
    )
  }
}
