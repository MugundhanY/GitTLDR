// Script to add sample transaction data for testing
// Run this with: npx ts-node add-sample-transactions.ts

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  try {
    // Get the first user
    const user = await prisma.user.findFirst()
    
    if (!user) {
      console.log('No user found. Please create a user first.')
      return
    }

    console.log(`Adding sample transactions for user: ${user.name} (${user.email})`)

    // Add some sample transactions
    const transactions = await Promise.all([
      // Initial credit purchase
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'PURCHASE',
          credits: 150,
          amount: 15.00,
          description: 'Initial credit pack - 150 credits',
          createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        }
      }),
      
      // Repository creation usage
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'USAGE',
          credits: -15,
          amount: 0,
          description: 'Repository creation - GitTLDR/frontend',
          createdAt: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) // 25 days ago
        }
      }),
      
      // Another credit purchase
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'PURCHASE',
          credits: 100,
          amount: 10.00,
          description: 'Credit pack - 100 credits',
          createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000) // 20 days ago
        }
      }),
      
      // More repository usage
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'USAGE',
          credits: -10,
          amount: 0,
          description: 'Repository creation - example/project',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
        }
      }),
      
      // Recent usage
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'USAGE',
          credits: -8,
          amount: 0,
          description: 'Repository creation - nodejs/express-app',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        }
      }),
      
      // Another recent usage
      prisma.transaction.create({
        data: {
          userId: user.id,
          type: 'USAGE',
          credits: -12,
          amount: 0,
          description: 'Repository creation - react/component-library',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) // 2 days ago
        }
      })
    ])

    console.log(`Created ${transactions.length} sample transactions`)

    // Calculate new user credit balance
    const totalPurchased = 150 + 100 // 250 credits purchased
    const totalUsed = 15 + 10 + 8 + 12 // 45 credits used
    const newBalance = totalPurchased - totalUsed // 205 credits remaining

    // Update user credits
    await prisma.user.update({
      where: { id: user.id },
      data: { credits: newBalance }
    })

    console.log(`Updated user credit balance to: ${newBalance}`)
    console.log('Sample transactions added successfully!')

  } catch (error) {
    console.error('Error adding sample transactions:', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
