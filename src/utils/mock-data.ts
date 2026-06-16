import prisma from '@/lib/prisma'

export async function generateMockDataForUser(userId: string) {
  // 1. Create standard Categories
  const defaultCategories = [
    {
      name: 'Income',
      color: '#10b981', // Emerald
      icon: 'TrendingUp',
      children: [
        { name: 'Salary', color: '#059669', icon: 'Briefcase' },
        { name: 'Interest/Dividends', color: '#34d399', icon: 'Percent' },
      ],
    },
    {
      name: 'Housing',
      color: '#3b82f6', // Blue
      icon: 'Home',
      children: [
        { name: 'Rent/Mortgage', color: '#1d4ed8', icon: 'Home', monthlyTarget: 1500 },
        { name: 'Utilities', color: '#60a5fa', icon: 'Zap', monthlyTarget: 150 },
      ],
    },
    {
      name: 'Food',
      color: '#f59e0b', // Amber
      icon: 'Utensils',
      children: [
        { name: 'Groceries', color: '#d97706', icon: 'ShoppingCart', monthlyTarget: 450 },
        { name: 'Restaurants', color: '#fbbf24', icon: 'Coffee', monthlyTarget: 200 },
      ],
    },
    {
      name: 'Transport',
      color: '#8b5cf6', // Violet
      icon: 'Car',
      children: [
        { name: 'Gas/Transit', color: '#6d28d9', icon: 'Fuel', monthlyTarget: 120 },
        { name: 'Uber/Lyft', color: '#a78bfa', icon: 'Compass', monthlyTarget: 80 },
      ],
    },
    {
      name: 'Entertainment',
      color: '#ec4899', // Pink
      icon: 'Tv',
      children: [
        { name: 'Subscriptions', color: '#db2777', icon: 'Tv', monthlyTarget: 60 },
        { name: 'Movies/Events', color: '#f472b6', icon: 'Film', monthlyTarget: 100 },
      ],
    },
  ]

  // Insert parents first, then children
  const createdCategories: Record<string, string> = {} // name -> id

  for (const parent of defaultCategories) {
    const parentCat = await prisma.category.create({
      data: {
        userId,
        name: parent.name,
        color: parent.color,
        icon: parent.icon,
      },
    })
    createdCategories[parent.name] = parentCat.id

    for (const child of parent.children) {
      const childCat = await prisma.category.create({
        data: {
          userId,
          parentId: parentCat.id,
          name: child.name,
          color: child.color,
          icon: child.icon,
          monthlyTarget: (child as any).monthlyTarget,
          rolloverEnabled: child.name === 'Groceries' || child.name === 'Restaurants',
        },
      })
      createdCategories[child.name] = childCat.id
    }
  }

  // 2. Create Accounts
  const checking = await prisma.account.create({
    data: {
      userId,
      name: 'Chase Checking',
      type: 'CHECKING',
      balance: 4850.23,
      plaidItemId: 'mock_plaid_checking',
      currency: 'USD',
    },
  })

  const savings = await prisma.account.create({
    data: {
      userId,
      name: 'Ally Savings',
      type: 'SAVINGS',
      balance: 15450.00,
      plaidItemId: 'mock_plaid_savings',
      currency: 'USD',
    },
  })

  const creditCard = await prisma.account.create({
    data: {
      userId,
      name: 'Amex Gold',
      type: 'CREDIT',
      balance: -824.50,
      plaidItemId: 'mock_plaid_credit',
      currency: 'USD',
    },
  })

  const investment = await prisma.account.create({
    data: {
      userId,
      name: 'Vanguard Brokerage',
      type: 'INVESTMENT',
      balance: 28400.00,
      currency: 'USD',
    },
  })

  // 3. Create Recurring Rules (for subscription detection)
  await prisma.recurringRule.createMany({
    data: [
      {
        userId,
        name: 'Netflix Subscription',
        interval: 'MONTHLY',
        amount: -15.49,
        nextExpectedDate: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
        matchingMerchant: 'Netflix.com',
        categoryId: createdCategories['Subscriptions'],
      },
      {
        userId,
        name: 'Spotify Premium',
        interval: 'MONTHLY',
        amount: -10.99,
        nextExpectedDate: new Date(new Date().getFullYear(), new Date().getMonth(), 12),
        matchingMerchant: 'Spotify',
        categoryId: createdCategories['Subscriptions'],
      },
      {
        userId,
        name: 'Bi-weekly Salary',
        interval: 'BIWEEKLY',
        amount: 2500.00,
        nextExpectedDate: new Date(new Date().getFullYear(), new Date().getMonth(), 15),
        matchingMerchant: 'Acme Corp',
        categoryId: createdCategories['Salary'],
      },
    ],
  })

  // 4. Generate Historical Transactions for the past 90 days
  const transactionsData = []
  const today = new Date()

  for (let i = 90; i >= 0; i--) {
    const txDate = new Date()
    txDate.setDate(today.getDate() - i)

    // Paycheck (twice a month, on 1st and 15th)
    const day = txDate.getDate()
    if (day === 1 || day === 15) {
      transactionsData.push({
        userId,
        accountId: checking.id,
        categoryId: createdCategories['Salary'],
        amount: 2500.00,
        date: new Date(txDate),
        description: 'Acme Corp Paycheck Direct Deposit',
        merchant: 'Acme Corp',
        pendingStatus: false,
        tags: ['salary', 'direct-deposit'],
      })
    }

    // Rent (1st of the month)
    if (day === 1) {
      transactionsData.push({
        userId,
        accountId: checking.id,
        categoryId: createdCategories['Rent/Mortgage'],
        amount: -1500.00,
        date: new Date(txDate),
        description: 'Rent Payment for Apartment 4B',
        merchant: 'Avalon Properties',
        pendingStatus: false,
        tags: ['rent', 'fixed-expense'],
      })
    }

    // Utilities (e.g. Electric/Gas/Water bill, 8th of the month)
    if (day === 8) {
      transactionsData.push({
        userId,
        accountId: checking.id,
        categoryId: createdCategories['Utilities'],
        amount: -112.50,
        date: new Date(txDate),
        description: 'Electric and Power Bill',
        merchant: 'ConEd Power',
        pendingStatus: false,
      })
    }

    // Netflix Subscription (15th of the month)
    if (day === 15) {
      transactionsData.push({
        userId,
        accountId: creditCard.id,
        categoryId: createdCategories['Subscriptions'],
        amount: -15.49,
        date: new Date(txDate),
        description: 'Netflix Subscription Monthly Fee',
        merchant: 'Netflix.com',
        pendingStatus: false,
        tags: ['entertainment', 'subscription'],
      })
    }

    // Spotify Subscription (12th of the month)
    if (day === 12) {
      transactionsData.push({
        userId,
        accountId: creditCard.id,
        categoryId: createdCategories['Subscriptions'],
        amount: -10.99,
        date: new Date(txDate),
        description: 'Spotify Premium Family Plan',
        merchant: 'Spotify USA',
        pendingStatus: false,
        tags: ['music', 'subscription'],
      })
    }

    // Savings Interest Credit (28th of the month)
    if (day === 28) {
      transactionsData.push({
        userId,
        accountId: savings.id,
        categoryId: createdCategories['Interest/Dividends'],
        amount: 14.85,
        date: new Date(txDate),
        description: 'High Yield Savings Account Interest Payment',
        merchant: 'Ally Bank',
        pendingStatus: false,
      })
    }

    // Weekly Groceries on Saturdays (Day 6 of week)
    if (txDate.getDay() === 6) {
      const groceryAmount = -(Math.floor(Math.random() * 40) + 70) // $70 to $110
      transactionsData.push({
        userId,
        accountId: checking.id,
        categoryId: createdCategories['Groceries'],
        amount: groceryAmount,
        date: new Date(txDate),
        description: 'Weekly grocery shopping trip',
        merchant: 'Whole Foods Market',
        pendingStatus: false,
        tags: ['food', 'essential'],
      })
    }

    // Gas/Fuel on Tuesdays (Day 2 of week)
    if (txDate.getDay() === 2) {
      transactionsData.push({
        userId,
        accountId: creditCard.id,
        categoryId: createdCategories['Gas/Transit'],
        amount: -45.00,
        date: new Date(txDate),
        description: 'Gas pump station fill-up',
        merchant: 'Chevron Fuel',
        pendingStatus: false,
      })
    }

    // Restaurant Dining / Coffee (Fridays and Saturdays, sometimes Sundays)
    if (txDate.getDay() === 5 || txDate.getDay() === 6) {
      const isDining = Math.random() > 0.3
      if (isDining) {
        const foodAmt = -(Math.floor(Math.random() * 50) + 20) // $20 to $70
        const merchants = ['Trattoria Bella', 'Burgers & Fries LLC', 'Taco Express', 'Siam Palace']
        transactionsData.push({
          userId,
          accountId: creditCard.id,
          categoryId: createdCategories['Restaurants'],
          amount: foodAmt,
          date: new Date(txDate),
          description: 'Weekend Dining out',
          merchant: merchants[Math.floor(Math.random() * merchants.length)],
          pendingStatus: false,
        })
      }
    }

    // Coffee trips (Random days)
    if (Math.random() > 0.75) {
      transactionsData.push({
        userId,
        accountId: creditCard.id,
        categoryId: createdCategories['Restaurants'],
        amount: -5.45,
        date: new Date(txDate),
        description: 'Morning Coffee run',
        merchant: 'Starbucks Coffee',
        pendingStatus: false,
      })
    }

    // Uber/Lyft trips (Random days)
    if (Math.random() > 0.8) {
      const rideAmt = -(Math.floor(Math.random() * 25) + 12)
      transactionsData.push({
        userId,
        accountId: creditCard.id,
        categoryId: createdCategories['Uber/Lyft'],
        amount: rideAmt,
        date: new Date(txDate),
        description: 'Late night taxi ride',
        merchant: 'Uber Inc',
        pendingStatus: false,
      })
    }

    // Movies/Events (Once in 2 weeks on Friday)
    if (txDate.getDay() === 5 && i % 14 === 0) {
      transactionsData.push({
        userId,
        accountId: creditCard.id,
        categoryId: createdCategories['Movies/Events'],
        amount: -32.50,
        date: new Date(txDate),
        description: 'Movie ticket purchase',
        merchant: 'AMC Theatres',
        pendingStatus: false,
        tags: ['entertainment'],
      })
    }
  }

  // Bulk create all mock transactions
  await prisma.transaction.createMany({
    data: transactionsData,
  })

  return {
    accounts: [checking, savings, creditCard, investment],
    categories: Object.keys(createdCategories),
  }
}
