export interface MockAccount {
  id: string
  name: string
  type: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | 'MANUAL_ASSET' | 'MANUAL_LIABILITY'
  balance: number
  plaidItemId?: string
  currency: string
}

export interface MockCategory {
  id: string
  parentId?: string | null
  name: string
  color?: string | null
  icon?: string | null
  monthlyTarget?: number | null
  rolloverEnabled: boolean
  rolloverAmount: number
  children?: MockCategory[]
}

export interface MockTransaction {
  id: string
  accountId: string
  categoryId?: string | null
  amount: number
  date: string
  description: string
  merchant: string
  pendingStatus: boolean
  splitParentId?: string | null
  tags: string[]
  receiptUrl?: string | null
  accountName?: string
  accountType?: string
  categoryName?: string
  categoryColor?: string | null
  categoryIcon?: string | null
}

export interface MockRecurringRule {
  id: string
  name: string
  interval: 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'YEARLY'
  amount: number
  nextExpectedDate: string
  matchingMerchant: string
  categoryId?: string | null
  categoryName?: string
  categoryColor?: string | null
}

export function initializeLocalStorageDb() {
  if (typeof window === 'undefined') return

  if (localStorage.getItem('ex_track_db_initialized')) return

  // 1. Categories
  const categories: MockCategory[] = []
  
  // Parents
  const incomeParent = { id: 'c-income', name: 'Income', color: '#10b981', icon: 'TrendingUp', rolloverEnabled: false, rolloverAmount: 0 }
  const housingParent = { id: 'c-housing', name: 'Housing', color: '#3b82f6', icon: 'Home', rolloverEnabled: false, rolloverAmount: 0 }
  const foodParent = { id: 'c-food', name: 'Food', color: '#f59e0b', icon: 'Utensils', rolloverEnabled: false, rolloverAmount: 0 }
  const transportParent = { id: 'c-trans', name: 'Transport', color: '#8b5cf6', icon: 'Car', rolloverEnabled: false, rolloverAmount: 0 }
  const entParent = { id: 'c-ent', name: 'Entertainment', color: '#ec4899', icon: 'Tv', rolloverEnabled: false, rolloverAmount: 0 }
  
  categories.push(incomeParent, housingParent, foodParent, transportParent, entParent)
  
  // Children
  const catMap = {
    Salary: { id: 'c-salary', parentId: 'c-income', name: 'Salary', color: '#059669', icon: 'Briefcase', rolloverEnabled: false, rolloverAmount: 0 },
    Interest: { id: 'c-interest', parentId: 'c-income', name: 'Interest/Dividends', color: '#34d399', icon: 'Percent', rolloverEnabled: false, rolloverAmount: 0 },
    Rent: { id: 'c-rent', parentId: 'c-housing', name: 'Rent/Mortgage', color: '#1d4ed8', icon: 'Home', monthlyTarget: 1500, rolloverEnabled: false, rolloverAmount: 0 },
    Utilities: { id: 'c-util', parentId: 'c-housing', name: 'Utilities', color: '#60a5fa', icon: 'Zap', monthlyTarget: 150, rolloverEnabled: false, rolloverAmount: 0 },
    Groceries: { id: 'c-groc', parentId: 'c-food', name: 'Groceries', color: '#d97706', icon: 'ShoppingCart', monthlyTarget: 450, rolloverEnabled: true, rolloverAmount: 0 },
    Restaurants: { id: 'c-rest', parentId: 'c-food', name: 'Restaurants', color: '#fbbf24', icon: 'Coffee', monthlyTarget: 200, rolloverEnabled: true, rolloverAmount: 0 },
    Gas: { id: 'c-gas', parentId: 'c-trans', name: 'Gas/Transit', color: '#6d28d9', icon: 'Fuel', monthlyTarget: 120, rolloverEnabled: false, rolloverAmount: 0 },
    Uber: { id: 'c-uber', parentId: 'c-trans', name: 'Uber/Lyft', color: '#a78bfa', icon: 'Compass', monthlyTarget: 80, rolloverEnabled: false, rolloverAmount: 0 },
    Subs: { id: 'c-subs', parentId: 'c-ent', name: 'Subscriptions', color: '#db2777', icon: 'Tv', monthlyTarget: 60, rolloverEnabled: false, rolloverAmount: 0 },
    Movies: { id: 'c-movies', parentId: 'c-ent', name: 'Movies/Events', color: '#f472b6', icon: 'Film', monthlyTarget: 100, rolloverEnabled: false, rolloverAmount: 0 },
  }
  
  Object.values(catMap).forEach(child => categories.push(child))
  localStorage.setItem('ex_track_categories', JSON.stringify(categories))

  // 2. Accounts
  const accounts: MockAccount[] = [
    { id: 'a-checking', name: 'Chase Checking', type: 'CHECKING', balance: 4850.23, plaidItemId: 'mock_plaid_checking', currency: 'USD' },
    { id: 'a-savings', name: 'Ally Savings', type: 'SAVINGS', balance: 15450.00, plaidItemId: 'mock_plaid_savings', currency: 'USD' },
    { id: 'a-credit', name: 'Amex Gold', type: 'CREDIT', balance: -824.50, plaidItemId: 'mock_plaid_credit', currency: 'USD' },
    { id: 'a-invest', name: 'Vanguard Brokerage', type: 'INVESTMENT', balance: 28400.00, currency: 'USD' },
  ]
  localStorage.setItem('ex_track_accounts', JSON.stringify(accounts))

  // 3. Recurring Rules
  const recurringRules: MockRecurringRule[] = [
    { id: 'r-netflix', name: 'Netflix Subscription', interval: 'MONTHLY', amount: -15.49, nextExpectedDate: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split('T')[0], matchingMerchant: 'Netflix.com', categoryId: 'c-subs' },
    { id: 'r-spotify', name: 'Spotify Premium', interval: 'MONTHLY', amount: -10.99, nextExpectedDate: new Date(new Date().getFullYear(), new Date().getMonth(), 12).toISOString().split('T')[0], matchingMerchant: 'Spotify', categoryId: 'c-subs' },
    { id: 'r-salary', name: 'Bi-weekly Salary', interval: 'BIWEEKLY', amount: 2500.00, nextExpectedDate: new Date(new Date().getFullYear(), new Date().getMonth(), 15).toISOString().split('T')[0], matchingMerchant: 'Acme Corp', categoryId: 'c-salary' },
  ]
  localStorage.setItem('ex_track_recurring_rules', JSON.stringify(recurringRules))

  // 4. Historical Transactions (Past 90 days)
  const transactions: MockTransaction[] = []
  const today = new Date()

  for (let i = 90; i >= 0; i--) {
    const txDate = new Date()
    txDate.setDate(today.getDate() - i)
    const dateStr = txDate.toISOString().split('T')[0]
    const day = txDate.getDate()

    if (day === 1 || day === 15) {
      transactions.push({
        id: `t-paycheck-${i}`,
        accountId: 'a-checking',
        categoryId: 'c-salary',
        amount: 2500.00,
        date: dateStr,
        description: 'Acme Corp Paycheck Direct Deposit',
        merchant: 'Acme Corp',
        pendingStatus: false,
        tags: ['salary', 'direct-deposit'],
      })
    }

    if (day === 1) {
      transactions.push({
        id: `t-rent-${i}`,
        accountId: 'a-checking',
        categoryId: 'c-rent',
        amount: -1500.00,
        date: dateStr,
        description: 'Rent Payment for Apartment 4B',
        merchant: 'Avalon Properties',
        pendingStatus: false,
        tags: ['rent', 'fixed-expense'],
      })
    }

    if (day === 8) {
      transactions.push({
        id: `t-util-${i}`,
        accountId: 'a-checking',
        categoryId: 'c-util',
        amount: -112.50,
        date: dateStr,
        description: 'Electric and Power Bill',
        merchant: 'ConEd Power',
        pendingStatus: false,
        tags: [],
      })
    }

    if (day === 15) {
      transactions.push({
        id: `t-netflix-${i}`,
        accountId: 'a-credit',
        categoryId: 'c-subs',
        amount: -15.49,
        date: dateStr,
        description: 'Netflix Subscription Monthly Fee',
        merchant: 'Netflix.com',
        pendingStatus: false,
        tags: ['entertainment', 'subscription'],
      })
    }

    if (day === 12) {
      transactions.push({
        id: `t-spotify-${i}`,
        accountId: 'a-credit',
        categoryId: 'c-subs',
        amount: -10.99,
        date: dateStr,
        description: 'Spotify Premium Family Plan',
        merchant: 'Spotify USA',
        pendingStatus: false,
        tags: ['music', 'subscription'],
      })
    }

    if (day === 28) {
      transactions.push({
        id: `t-interest-${i}`,
        accountId: 'a-savings',
        categoryId: 'c-interest',
        amount: 14.85,
        date: dateStr,
        description: 'High Yield Savings Account Interest Payment',
        merchant: 'Ally Bank',
        pendingStatus: false,
        tags: [],
      })
    }

    if (txDate.getDay() === 6) {
      const groceryAmount = -(Math.floor(Math.random() * 40) + 70)
      transactions.push({
        id: `t-groc-${i}`,
        accountId: 'a-checking',
        categoryId: 'c-groc',
        amount: groceryAmount,
        date: dateStr,
        description: 'Weekly grocery shopping trip',
        merchant: 'Whole Foods Market',
        pendingStatus: false,
        tags: ['food', 'essential'],
      })
    }

    if (txDate.getDay() === 2) {
      transactions.push({
        id: `t-gas-${i}`,
        accountId: 'a-credit',
        categoryId: 'c-gas',
        amount: -45.00,
        date: dateStr,
        description: 'Gas pump station fill-up',
        merchant: 'Chevron Fuel',
        pendingStatus: false,
        tags: [],
      })
    }

    if (txDate.getDay() === 5 || txDate.getDay() === 6) {
      if (Math.random() > 0.3) {
        const foodAmt = -(Math.floor(Math.random() * 50) + 20)
        const merchants = ['Trattoria Bella', 'Burgers & Fries LLC', 'Taco Express', 'Siam Palace']
        transactions.push({
          id: `t-rest-${i}`,
          accountId: 'a-credit',
          categoryId: 'c-rest',
          amount: foodAmt,
          date: dateStr,
          description: 'Weekend Dining out',
          merchant: merchants[Math.floor(Math.random() * merchants.length)],
          pendingStatus: false,
        tags: [],
        })
      }
    }

    if (Math.random() > 0.75) {
      transactions.push({
        id: `t-coffee-${i}`,
        accountId: 'a-credit',
        categoryId: 'c-rest',
        amount: -5.45,
        date: dateStr,
        description: 'Morning Coffee run',
        merchant: 'Starbucks Coffee',
        pendingStatus: false,
        tags: [],
      })
    }

    if (Math.random() > 0.8) {
      transactions.push({
        id: `t-uber-${i}`,
        accountId: 'a-credit',
        categoryId: 'c-uber',
        amount: -(Math.floor(Math.random() * 25) + 12),
        date: dateStr,
        description: 'Late night taxi ride',
        merchant: 'Uber Inc',
        pendingStatus: false,
        tags: [],
      })
    }

    if (txDate.getDay() === 5 && i % 14 === 0) {
      transactions.push({
        id: `t-movie-${i}`,
        accountId: 'a-credit',
        categoryId: 'c-movies',
        amount: -32.50,
        date: dateStr,
        description: 'Movie ticket purchase',
        merchant: 'AMC Theatres',
        pendingStatus: false,
        tags: ['entertainment'],
      })
    }
  }

  localStorage.setItem('ex_track_transactions', JSON.stringify(transactions))
  localStorage.setItem('ex_track_db_initialized', 'true')
}

// Emulate database operations on localStorage
export const localDb = {
  getAccounts: (): MockAccount[] => {
    initializeLocalStorageDb()
    return JSON.parse(localStorage.getItem('ex_track_accounts') || '[]')
  },
  
  createAccount: (data: Omit<MockAccount, 'id'>): MockAccount => {
    const accounts = localDb.getAccounts()
    const newAccount: MockAccount = {
      ...data,
      id: 'a-' + Math.random().toString(36).substring(2, 9),
    }
    accounts.push(newAccount)
    localStorage.setItem('ex_track_accounts', JSON.stringify(accounts))
    return newAccount
  },

  deleteAccount: (id: string) => {
    const accounts = localDb.getAccounts().filter(a => a.id !== id)
    const transactions = JSON.parse(localStorage.getItem('ex_track_transactions') || '[]').filter((t: any) => t.accountId !== id)
    localStorage.setItem('ex_track_accounts', JSON.stringify(accounts))
    localStorage.setItem('ex_track_transactions', JSON.stringify(transactions))
  },

  getCategories: (): MockCategory[] => {
    initializeLocalStorageDb()
    return JSON.parse(localStorage.getItem('ex_track_categories') || '[]')
  },

  createCategory: (data: Omit<MockCategory, 'id' | 'rolloverAmount'>): MockCategory => {
    const categories = localDb.getCategories()
    const newCategory: MockCategory = {
      ...data,
      id: 'c-' + Math.random().toString(36).substring(2, 9),
      rolloverEnabled: data.rolloverEnabled ?? false,
      rolloverAmount: 0,
    }
    categories.push(newCategory)
    localStorage.setItem('ex_track_categories', JSON.stringify(categories))
    return newCategory
  },

  updateCategory: (id: string, data: Partial<MockCategory>): MockCategory => {
    const categories = localDb.getCategories()
    const idx = categories.findIndex(c => c.id === id)
    if (idx === -1) throw new Error('Category not found')
    
    categories[idx] = { ...categories[idx], ...data }
    localStorage.setItem('ex_track_categories', JSON.stringify(categories))
    return categories[idx]
  },

  getTransactions: (): MockTransaction[] => {
    initializeLocalStorageDb()
    const txs: MockTransaction[] = JSON.parse(localStorage.getItem('ex_track_transactions') || '[]')
    const accounts = localDb.getAccounts()
    const categories = localDb.getCategories()

    return txs.map(t => {
      const acc = accounts.find(a => a.id === t.accountId)
      const cat = categories.find(c => c.id === t.categoryId)
      return {
        ...t,
        accountName: acc?.name || 'Unknown',
        accountType: acc?.type || 'CHECKING',
        categoryName: cat?.name || 'Uncategorized',
        categoryColor: cat?.color || '#9ca3af',
        categoryIcon: cat?.icon || 'HelpCircle',
      }
    })
  },

  createTransaction: (data: Omit<MockTransaction, 'id'>): MockTransaction => {
    const txs = JSON.parse(localStorage.getItem('ex_track_transactions') || '[]')
    const newTx: MockTransaction = {
      ...data,
      id: 't-' + Math.random().toString(36).substring(2, 9),
    }
    txs.push(newTx)
    localStorage.setItem('ex_track_transactions', JSON.stringify(txs))

    // Update account balance
    const accounts = localDb.getAccounts()
    const accIdx = accounts.findIndex(a => a.id === data.accountId)
    if (accIdx !== -1) {
      accounts[accIdx].balance = Number(accounts[accIdx].balance) + Number(data.amount)
      localStorage.setItem('ex_track_accounts', JSON.stringify(accounts))
    }

    return newTx
  },

  updateTransaction: (id: string, data: Partial<MockTransaction>): MockTransaction => {
    const txs = JSON.parse(localStorage.getItem('ex_track_transactions') || '[]')
    const idx = txs.findIndex((t: any) => t.id === id)
    if (idx === -1) throw new Error('Transaction not found')

    const oldTx = txs[idx]
    const updatedTx = { ...oldTx, ...data }
    txs[idx] = updatedTx
    localStorage.setItem('ex_track_transactions', JSON.stringify(txs))

    // Update account balances
    const amountDiff = Number(updatedTx.amount) - Number(oldTx.amount)
    if (amountDiff !== 0 || data.accountId) {
      const accounts = localDb.getAccounts()
      if (data.accountId && data.accountId !== oldTx.accountId) {
        // Transfer balance between accounts
        const oldAccIdx = accounts.findIndex(a => a.id === oldTx.accountId)
        const newAccIdx = accounts.findIndex(a => a.id === data.accountId)
        if (oldAccIdx !== -1) accounts[oldAccIdx].balance = Number(accounts[oldAccIdx].balance) - Number(oldTx.amount)
        if (newAccIdx !== -1) accounts[newAccIdx].balance = Number(accounts[newAccIdx].balance) + Number(updatedTx.amount)
      } else {
        const accIdx = accounts.findIndex(a => a.id === oldTx.accountId)
        if (accIdx !== -1) accounts[accIdx].balance = Number(accounts[accIdx].balance) + amountDiff
      }
      localStorage.setItem('ex_track_accounts', JSON.stringify(accounts))
    }

    return updatedTx
  },

  deleteTransaction: (id: string) => {
    const txs = JSON.parse(localStorage.getItem('ex_track_transactions') || '[]')
    const idx = txs.findIndex((t: any) => t.id === id)
    if (idx === -1) return

    const oldTx = txs[idx]
    txs.splice(idx, 1)
    localStorage.setItem('ex_track_transactions', JSON.stringify(txs))

    // Revert account balance
    const accounts = localDb.getAccounts()
    const accIdx = accounts.findIndex(a => a.id === oldTx.accountId)
    if (accIdx !== -1) {
      accounts[accIdx].balance = Number(accounts[accIdx].balance) - Number(oldTx.amount)
      localStorage.setItem('ex_track_accounts', JSON.stringify(accounts))
    }
  },

  splitTransaction: (parentId: string, splits: Array<{ categoryId: string; amount: number; description: string }>) => {
    const txs = JSON.parse(localStorage.getItem('ex_track_transactions') || '[]')
    const parent = txs.find((t: any) => t.id === parentId)
    if (!parent) throw new Error('Parent transaction not found')

    const childTransactions = splits.map(split => {
      const child: MockTransaction = {
        id: 't-' + Math.random().toString(36).substring(2, 9),
        accountId: parent.accountId,
        categoryId: split.categoryId,
        amount: split.amount,
        date: parent.date,
        description: split.description,
        merchant: parent.merchant,
        splitParentId: parentId,
        pendingStatus: false,
        tags: parent.tags,
      }
      txs.push(child)
      return child
    })

    localStorage.setItem('ex_track_transactions', JSON.stringify(txs))
    return childTransactions
  },

  getRecurringRules: (): MockRecurringRule[] => {
    initializeLocalStorageDb()
    const rules: MockRecurringRule[] = JSON.parse(localStorage.getItem('ex_track_recurring_rules') || '[]')
    const categories = localDb.getCategories()
    return rules.map(r => {
      const cat = categories.find(c => c.id === r.categoryId)
      return {
        ...r,
        categoryName: cat?.name || 'Uncategorized',
        categoryColor: cat?.color || '#9ca3af',
      }
    })
  },

  createRecurringRule: (data: Omit<MockRecurringRule, 'id'>): MockRecurringRule => {
    const rules = JSON.parse(localStorage.getItem('ex_track_recurring_rules') || '[]')
    const newRule: MockRecurringRule = {
      ...data,
      id: 'r-' + Math.random().toString(36).substring(2, 9),
    }
    rules.push(newRule)
    localStorage.setItem('ex_track_recurring_rules', JSON.stringify(rules))
    return newRule
  },

  deleteRecurringRule: (id: string) => {
    const rules = JSON.parse(localStorage.getItem('ex_track_recurring_rules') || '[]')
    const idx = rules.findIndex((r: any) => r.id === id)
    if (idx !== -1) {
      rules.splice(idx, 1)
      localStorage.setItem('ex_track_recurring_rules', JSON.stringify(rules))
    }
  },

  deleteCategory: (id: string) => {
    const cats: MockCategory[] = JSON.parse(localStorage.getItem('ex_track_categories') || '[]')
    // Move children to no parent
    cats.forEach(c => {
      if (c.parentId === id) c.parentId = null
    })
    const idx = cats.findIndex(c => c.id === id)
    if (idx !== -1) {
      cats.splice(idx, 1)
      localStorage.setItem('ex_track_categories', JSON.stringify(cats))
    }
    // Nullify category on transactions
    const txs: MockTransaction[] = JSON.parse(localStorage.getItem('ex_track_transactions') || '[]')
    txs.forEach(t => {
      if (t.categoryId === id) t.categoryId = null
    })
    localStorage.setItem('ex_track_transactions', JSON.stringify(txs))
  },
}
