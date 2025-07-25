import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getUserFromRequest } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    // Get authenticated user
    const authUser = await getUserFromRequest(request)
    
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { transactionId } = params

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

    // Generate simple HTML invoice (in production, you might use a PDF library)
    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice - ${transaction.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; }
          .header { text-align: center; margin-bottom: 30px; }
          .company { font-size: 24px; font-weight: bold; color: #059669; }
          .invoice-details { margin: 30px 0; }
          .table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .table th, .table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          .table th { background-color: #f8f9fa; }
          .total { font-weight: bold; background-color: #f0f9ff; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="company">GitTLDR</div>
          <div>Invoice</div>
        </div>
        
        <div class="invoice-details">
          <p><strong>Invoice ID:</strong> ${transaction.id}</p>
          <p><strong>Date:</strong> ${transaction.createdAt.toLocaleDateString()}</p>
          <p><strong>Customer:</strong> ${transaction.user.name} (${transaction.user.email})</p>
          <p><strong>Status:</strong> Paid</p>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th>Credits</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${transaction.description}</td>
              <td>${transaction.credits > 0 ? transaction.credits : 'N/A'}</td>
              <td>$${(transaction.amount || 0).toFixed(2)}</td>
            </tr>
            <tr class="total">
              <td colspan="2"><strong>Total</strong></td>
              <td><strong>$${(transaction.amount || 0).toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>

        <div style="margin-top: 40px; font-size: 12px; color: #666;">
          <p>Thank you for your business!</p>
          <p>GitTLDR - AI-Powered Code and Meeting Analysis</p>
        </div>
      </body>
      </html>
    `

    // Set headers for HTML download (you could convert to PDF using a library like puppeteer)
    const headers = new Headers()
    headers.set('Content-Type', 'text/html')
    headers.set('Content-Disposition', `attachment; filename="invoice-${transaction.id}.html"`)

    return new NextResponse(invoiceHtml, { headers })

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
