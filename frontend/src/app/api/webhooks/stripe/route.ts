import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import Stripe from 'stripe'

const prisma = new PrismaClient()

// Lazy initialization to avoid build-time errors
const getStripe = () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not configured')
  }
  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2025-05-28.basil'
  })
}

const getWebhookSecret = () => {
  if (!process.env.STRIPE_WEBHOOK_SECRET) {
    throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
  }
  return process.env.STRIPE_WEBHOOK_SECRET
}

export async function POST(request: NextRequest) {
  try {
    const stripe = getStripe()
    const webhookSecret = getWebhookSecret()

    const body = await request.text()
    const signature = request.headers.get('stripe-signature')!

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('Stripe webhook event:', event.type)

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session

        console.log('Processing checkout session:', session.id)

        // Get user ID from metadata (preferred) or customer email (fallback)
        let userId = session.metadata?.userId

        if (!userId) {
          // Fallback: find user by customer email
          const customerId = session.customer as string
          if (customerId) {
            const customer = await stripe.customers.retrieve(customerId)
            if (customer && !customer.deleted) {
              const userEmail = (customer as Stripe.Customer).email
              if (userEmail) {
                const user = await prisma.user.findUnique({
                  where: { email: userEmail }
                })
                userId = user?.id
              }
            }
          }
        }

        if (!userId) {
          console.error('Could not determine user for session:', session.id)
          break
        }

        const user = await prisma.user.findUnique({
          where: { id: userId }
        })

        if (!user) {
          console.error('User not found for ID:', userId)
          break
        }

        // Get credits and amount from metadata
        const credits = parseInt(session.metadata?.credits || '0')
        const packageName = session.metadata?.packageName || 'Credit Purchase'
        const amount = session.amount_total! / 100 // Convert from cents to dollars

        if (credits <= 0) {
          console.error('Invalid credits amount in metadata:', session.metadata)
          break
        }

        // Create transaction record
        const transaction = await prisma.transaction.create({
          data: {
            type: 'PURCHASE',
            credits: credits,
            amount: amount,
            description: `${packageName} - ${credits} credits`,
            stripeId: session.id,
            userId: user.id
          }
        })

        // Update user's credits
        await prisma.user.update({
          where: { id: user.id },
          data: {
            credits: {
              increment: credits
            }
          }
        })

        console.log(`✅ Payment processed for user ${user.email}:`, {
          sessionId: session.id,
          amount: amount,
          credits: credits,
          transactionId: transaction.id,
          newBalance: user.credits + credits
        })

        break
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent
        console.error('Payment failed:', paymentIntent.id)

        // You could create a failed transaction record here
        // and notify the user about the failed payment

        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription

        // Handle subscription events if you have subscription-based billing
        console.log(`Subscription ${event.type}:`, subscription.id)

        // You could update user subscription status here

        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice

        // Handle recurring subscription payments
        console.log('Invoice payment succeeded:', invoice.id)

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice

        // Handle failed subscription payments
        console.log('Invoice payment failed:', invoice.id)

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
}
