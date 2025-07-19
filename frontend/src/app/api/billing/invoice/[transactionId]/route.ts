import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: { transactionId: string } }
) {
  try {
    const { transactionId } = params

    if (!transactionId) {
      return NextResponse.json(
        { error: 'Transaction ID is required' },
        { status: 400 }
      )
    }

    // For now, return a mock PDF - in production, generate actual invoice PDF
    // You would typically use a PDF generation library like PDFKit or puppeteer
    const mockPdfContent = `Invoice for transaction ${transactionId}`
    
    // Create a simple text file as a placeholder
    const blob = new Blob([mockPdfContent], { type: 'application/pdf' })
    
    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${transactionId}.pdf"`,
      },
    })
  } catch (error) {
    console.error('Error generating invoice:', error)
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    )
  }
}
