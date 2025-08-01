const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addSampleTransactions() {
  try {
    // Get a user to associate transactions with (use the first user)
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.log('No user found. Please create a user first.');
      return;
    }

    console.log(`Adding sample transactions for user: ${user.email}`);

    const now = new Date();
    
    // Add transactions for the last 35 days to ensure they show up in 30d range
    const transactions = [
      // Recent transactions (within 30 days)
      {
        userId: user.id,
        type: 'PURCHASE',
        amount: 29.99,
        credits: 1000,
        description: 'Pro Plan - 1000 Credits',
        stripeId: 'cs_test_recent_' + Date.now(),
        createdAt: new Date(now.getTime() - (2 * 24 * 60 * 60 * 1000)), // 2 days ago
      },
      {
        userId: user.id,
        type: 'USAGE',
        amount: 0,
        credits: -150,
        description: 'Repository analysis',
        createdAt: new Date(now.getTime() - (1 * 24 * 60 * 60 * 1000)), // 1 day ago
      },
      {
        userId: user.id,
        type: 'USAGE',
        amount: 0,
        credits: -75,
        description: 'Meeting summarization',
        createdAt: new Date(now.getTime() - (5 * 60 * 60 * 1000)), // 5 hours ago
      },
      {
        userId: user.id,
        type: 'PURCHASE',
        amount: 9.99,
        credits: 300,
        description: 'Starter Plan - 300 Credits',
        stripeId: 'cs_test_starter_' + Date.now(),
        createdAt: new Date(now.getTime() - (10 * 24 * 60 * 60 * 1000)), // 10 days ago
      },
      {
        userId: user.id,
        type: 'USAGE',
        amount: 0,
        credits: -50,
        description: 'Code analysis',
        createdAt: new Date(now.getTime() - (15 * 24 * 60 * 60 * 1000)), // 15 days ago
      },
      {
        userId: user.id,
        type: 'USAGE',
        amount: 0,
        credits: -25,
        description: 'Q&A query',
        createdAt: new Date(now.getTime() - (20 * 24 * 60 * 60 * 1000)), // 20 days ago
      },
      {
        userId: user.id,
        type: 'PURCHASE',
        amount: 49.99,
        credits: 2000,
        description: 'Enterprise Plan - 2000 Credits',
        stripeId: 'cs_test_enterprise_' + Date.now(),
        createdAt: new Date(now.getTime() - (25 * 24 * 60 * 60 * 1000)), // 25 days ago
      },
      
      // Older transactions (for 90d and 1y ranges)
      {
        userId: user.id,
        type: 'PURCHASE',
        amount: 19.99,
        credits: 600,
        description: 'Standard Plan - 600 Credits',
        stripeId: 'cs_test_standard_' + Date.now(),
        createdAt: new Date(now.getTime() - (45 * 24 * 60 * 60 * 1000)), // 45 days ago
      },
      {
        userId: user.id,
        type: 'USAGE',
        amount: 0,
        credits: -100,
        description: 'Large repository analysis',
        createdAt: new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000)), // 60 days ago
      },
      {
        userId: user.id,
        type: 'PURCHASE',
        amount: 99.99,
        credits: 5000,
        description: 'Annual Plan - 5000 Credits',
        stripeId: 'cs_test_annual_' + Date.now(),
        createdAt: new Date(now.getTime() - (120 * 24 * 60 * 60 * 1000)), // 120 days ago
      }
    ];

    // Delete existing transactions for this user first
    await prisma.transaction.deleteMany({
      where: { userId: user.id }
    });

    // Add all sample transactions
    for (const transaction of transactions) {
      const created = await prisma.transaction.create({
        data: transaction
      });
      console.log(`Created transaction: ${created.description} (${created.createdAt.toISOString()})`);
    }

    // Update user's current credits to reflect the balance
    const totalPurchased = transactions
      .filter(t => t.type === 'PURCHASE')
      .reduce((sum, t) => sum + t.credits, 0);
    
    const totalUsed = Math.abs(transactions
      .filter(t => t.type === 'USAGE')
      .reduce((sum, t) => sum + t.credits, 0));

    const finalCredits = totalPurchased - totalUsed;

    await prisma.user.update({
      where: { id: user.id },
      data: { credits: finalCredits }
    });

    console.log(`\\nSample transactions added successfully!`);
    console.log(`Total purchased: ${totalPurchased} credits`);
    console.log(`Total used: ${totalUsed} credits`);
    console.log(`Final balance: ${finalCredits} credits`);
    
  } catch (error) {
    console.error('Error adding sample transactions:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleTransactions();
