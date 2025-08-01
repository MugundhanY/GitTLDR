import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserFromRequest } from '@/lib/auth'
import puppeteer from 'puppeteer'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ transactionId: string }> }
) {
  try {
    // Get authenticated user
    const authUser = await getUserFromRequest(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { transactionId } = await params

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    // Find the transaction and verify it belongs to the user
    const transaction = await prisma.transaction.findFirst({
      where: {
        id: transactionId,
        userId: authUser.id
      },
      include: {
        user: true
      }
    })

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 })
    }

    // If transaction has a Stripe ID, fetch the actual Stripe invoice
    if (transaction.stripeId) {
      try {
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)
        
        // Check if stripeId is a payment intent or checkout session
        let paymentIntent
        
        if (transaction.stripeId.startsWith('cs_')) {
          // It's a checkout session, get the payment intent from it
          const session = await stripe.checkout.sessions.retrieve(transaction.stripeId)
          if (session.payment_intent) {
            paymentIntent = await stripe.paymentIntents.retrieve(session.payment_intent)
          }
        } else if (transaction.stripeId.startsWith('pi_')) {
          // It's a payment intent directly
          paymentIntent = await stripe.paymentIntents.retrieve(transaction.stripeId)
        }
        
        if (paymentIntent) {
          // Try to find invoice associated with this payment
          if (paymentIntent.invoice) {
            const invoice = await stripe.invoices.retrieve(paymentIntent.invoice)
            if (invoice.invoice_pdf) {
              return NextResponse.redirect(invoice.invoice_pdf)
            }
          }
          
          // If no direct invoice, search for invoices by customer
          if (paymentIntent.customer) {
            const invoices = await stripe.invoices.list({
              customer: paymentIntent.customer,
              limit: 10
            })
            
            const relatedInvoice = invoices.data.find((inv: any) => 
              inv.payment_intent === paymentIntent.id
            )
            
            if (relatedInvoice && relatedInvoice.hosted_invoice_url) {
              return NextResponse.redirect(relatedInvoice.hosted_invoice_url)
            }
          }
        }
        
      } catch (stripeError) {
        console.error('Error fetching Stripe invoice:', stripeError)
        // Fall through to generate custom invoice if Stripe fails
      }
    }

    // Fallback: Generate custom invoice for transactions without Stripe invoice
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${transaction.id}</title>
        <style>
          @page { margin: 20mm; }
          body { font-family: Arial, sans-serif; margin: 0; color: #333; }
          .container { max-width: 100%; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #059669; padding-bottom: 20px; }
          .company { font-size: 28px; font-weight: bold; color: #059669; margin-bottom: 5px; }
          .subtitle { color: #64748b; font-size: 16px; }
          .receipt-details { margin: 30px 0; }
          .detail-row { display: flex; justify-content: space-between; margin: 15px 0; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
          .detail-label { font-weight: 600; color: #374151; }
          .detail-value { color: #6b7280; }
          .amount-section { background: #f0f9ff; padding: 20px; border-radius: 6px; margin: 20px 0; text-align: center; }
          .total-amount { font-size: 24px; font-weight: bold; color: #059669; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
          .status { display: inline-block; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
          .status-paid { background: #dcfce7; color: #166534; }
          .status-pending { background: #fef3c7; color: #92400e; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="company">GitTLDR</div>
            <div class="subtitle">Transaction Receipt</div>
          </div>
          
          <div class="receipt-details">
            <div class="detail-row">
              <span class="detail-label">Receipt Number:</span>
              <span class="detail-value">#${transaction.id.slice(-8).toUpperCase()}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Transaction ID:</span>
              <span class="detail-value">${transaction.id}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Date:</span>
              <span class="detail-value">${transaction.createdAt.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Customer:</span>
              <span class="detail-value">${transaction.user.name}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Email:</span>
              <span class="detail-value">${transaction.user.email}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Description:</span>
              <span class="detail-value">${transaction.description}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Type:</span>
              <span class="detail-value">${transaction.type === 'PURCHASE' ? 'Credit Purchase' : 'Credit Usage'}</span>
            </div>
            ${transaction.credits > 0 ? `
            <div class="detail-row">
              <span class="detail-label">Credits:</span>
              <span class="detail-value">${transaction.type === 'PURCHASE' ? '+' : ''}${transaction.credits}</span>
            </div>
            ` : ''}
            ${transaction.stripeId ? `
            <div class="detail-row">
              <span class="detail-label">Payment Method:</span>
              <span class="detail-value">Stripe (${transaction.stripeId.slice(0, 15)}...)</span>
            </div>
            ` : ''}
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="detail-value">
                <span class="status status-paid">Completed</span>
              </span>
            </div>
          </div>

          <div class="amount-section">
            <div style="margin-bottom: 10px; color: #6b7280;">Total Amount</div>
            <div class="total-amount">
              ${transaction.amount ? `$${transaction.amount.toFixed(2)} USD` : 'Free'}
            </div>
          </div>

          <div class="footer">
            <p><strong>Thank you for choosing GitTLDR!</strong></p>
            <p>AI-Powered Code and Meeting Analysis</p>
            <p>support@gittldr.com | www.gittldr.com</p>
            ${!transaction.stripeId ? '<p><em>Note: This is a receipt for platform activity. For official invoices from paid purchases, please check your email for Stripe receipts.</em></p>' : ''}
          </div>
        </div>
      </body>
      </html>
    `

    // Generate PDF using Puppeteer
    let browser
    try {
      browser = await puppeteer.launch({ 
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      const page = await browser.newPage()
      await page.setContent(invoiceHtml, { waitUntil: 'networkidle0' })
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm'
        },
        printBackground: true
      })

      await browser.close()

      return new Response(Buffer.from(pdfBuffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="GitTLDR-Receipt-${transaction.id.slice(-8)}.pdf"`,
          'Cache-Control': 'no-cache'
        }
      })
    } catch (pdfError) {
      console.error('Error generating PDF:', pdfError)
      if (browser) await browser.close()
      
      // Fallback to HTML
      return new Response(invoiceHtml, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Content-Disposition': `inline; filename="GitTLDR-Receipt-${transaction.id.slice(-8)}.html"`
        }
      })
    }

  } catch (error) {
    console.error('Error generating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
