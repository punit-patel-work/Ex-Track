'use server'

import prisma from '@/lib/prisma'
import { createClient } from '@/utils/supabase/server'
import { AccountType, RuleInterval } from '@prisma/client'
import * as schema from './schema'

// Helper to get authenticated user
async function getUserId() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    throw new Error('Unauthorized')
  }
  return user.id
}

// Serialization Helpers to convert Decimal and Date objects into plain JSON-safe values
function serializeAccount(a: any) {
  if (!a) return null
  return {
    ...a,
    balance: Number(a.balance),
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  }
}

function serializeCategory(c: any): any {
  if (!c) return null
  return {
    ...c,
    monthlyTarget: c.monthlyTarget ? Number(c.monthlyTarget) : null,
    rolloverAmount: Number(c.rolloverAmount),
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    children: c.children ? c.children.map(serializeCategory) : undefined,
  }
}

function serializeTransaction(t: any): any {
  if (!t) return null
  return {
    ...t,
    amount: Number(t.amount),
    date: t.date.toISOString(),
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    account: t.account ? { 
      ...t.account, 
      balance: t.account.balance ? Number(t.account.balance) : undefined,
      createdAt: t.account.createdAt ? t.account.createdAt.toISOString() : undefined,
      updatedAt: t.account.updatedAt ? t.account.updatedAt.toISOString() : undefined,
    } : undefined,
    category: t.category ? serializeCategory(t.category) : undefined,
    splits: t.splits ? t.splits.map(serializeTransaction) : undefined,
  }
}

function serializeRecurringRule(r: any) {
  if (!r) return null
  return {
    ...r,
    amount: Number(r.amount),
    nextExpectedDate: r.nextExpectedDate.toISOString(),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    category: r.category ? { 
      ...r.category, 
      monthlyTarget: r.category.monthlyTarget ? Number(r.category.monthlyTarget) : undefined,
      createdAt: r.category.createdAt ? r.category.createdAt.toISOString() : undefined,
      updatedAt: r.category.updatedAt ? r.category.updatedAt.toISOString() : undefined,
    } : undefined,
  }
}

export async function getAccounts() {
  try {
    const userId = await getUserId()
    const accounts = await prisma.account.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    })
    return accounts.map(serializeAccount)
  } catch (error) {
    console.error('getAccounts action failed:', error)
    throw error;
  }
}

export async function createAccount(data: { name: string; type: AccountType; balance: number; currency: string }) {
  const parsed = schema.CreateAccountSchema.parse(data)
  const userId = await getUserId()
  const account = await prisma.account.create({
    data: {
      userId,
      name: parsed.name,
      type: parsed.type,
      balance: parsed.balance,
      currency: parsed.currency,
    },
  })
  return serializeAccount(account)
}

export async function deleteAccount(id: string) {
  const parsedId = schema.DeleteAccountSchema.parse(id)
  const userId = await getUserId()
  const account = await prisma.account.delete({
    where: { id: parsedId, userId },
  })
  return serializeAccount(account)
}

export async function getCategories() {
  const userId = await getUserId()
  const categories = await prisma.category.findMany({
    where: { userId },
    include: { children: true },
    orderBy: { name: 'asc' },
  })
  return categories.map(serializeCategory)
}

export async function createCategory(data: { name: string; color?: string; icon?: string; parentId?: string; monthlyTarget?: number; rolloverEnabled?: boolean }) {
  const parsed = schema.CreateCategorySchema.parse(data)
  const userId = await getUserId()

  if (parsed.parentId) {
    const parent = await prisma.category.findFirst({
      where: { id: parsed.parentId, userId }
    })
    if (!parent) throw new Error("Unauthorized parent category access")
  }

  const category = await prisma.category.create({
    data: {
      userId,
      name: parsed.name,
      color: parsed.color,
      icon: parsed.icon,
      parentId: parsed.parentId,
      monthlyTarget: parsed.monthlyTarget,
      rolloverEnabled: parsed.rolloverEnabled ?? false,
    },
  })
  return serializeCategory(category)
}

export async function updateCategory(id: string, data: { name: string; color?: string; icon?: string; monthlyTarget?: number; rolloverEnabled?: boolean }) {
  const parsedId = schema.DeleteAccountSchema.parse(id)
  const parsed = schema.UpdateCategorySchema.parse(data)
  const userId = await getUserId()
  const category = await prisma.category.update({
    where: { id: parsedId, userId },
    data: {
      name: parsed.name,
      color: parsed.color,
      icon: parsed.icon,
      monthlyTarget: parsed.monthlyTarget,
      rolloverEnabled: parsed.rolloverEnabled,
    },
  })
  return serializeCategory(category)
}

export async function getTransactions() {
  const userId = await getUserId()
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    orderBy: { date: 'desc' },
    include: {
      account: { select: { name: true, type: true, createdAt: true, updatedAt: true } },
      category: { select: { name: true, color: true, icon: true, monthlyTarget: true, rolloverAmount: true, createdAt: true, updatedAt: true } },
    },
  })
  return transactions.map(serializeTransaction)
}

export async function createTransaction(data: {
  accountId: string
  categoryId?: string
  amount: number
  date: Date
  description: string
  merchant: string
  pendingStatus?: boolean
  tags?: string[]
}) {
  const parsed = schema.CreateTransactionSchema.parse(data)
  const userId = await getUserId()
  
  const transaction = await prisma.$transaction(async (tx: any) => {
    const account = await tx.account.findFirst({
      where: { id: parsed.accountId, userId }
    })
    if (!account) throw new Error("Unauthorized account access")

    if (parsed.categoryId) {
      const category = await tx.category.findFirst({
        where: { id: parsed.categoryId, userId }
      })
      if (!category) throw new Error("Unauthorized category access")
    }

    const txRecord = await tx.transaction.create({
      data: {
        userId,
        accountId: parsed.accountId,
        categoryId: parsed.categoryId,
        amount: parsed.amount,
        date: parsed.date,
        description: parsed.description,
        merchant: parsed.merchant,
        pendingStatus: parsed.pendingStatus ?? false,
        tags: parsed.tags ?? [],
      },
    })

    // Update the account balance
    await tx.account.update({
      where: { id: data.accountId },
      data: {
        balance: {
          increment: data.amount,
        },
      },
    })

    return txRecord
  })
  
  return serializeTransaction(transaction)
}

export async function updateTransaction(
  id: string,
  data: {
    accountId?: string
    categoryId?: string
    amount?: number
    date?: Date
    description?: string
    merchant?: string
    pendingStatus?: boolean
    tags?: string[]
  }
) {
  const parsedId = schema.DeleteAccountSchema.parse(id)
  const parsed = schema.UpdateTransactionSchema.parse(data)
  const userId = await getUserId()
  
  const transaction = await prisma.$transaction(async (tx: any) => {
    // Get old transaction to calculate balance diff
    const oldTx = await tx.transaction.findUnique({
      where: { id: parsedId, userId },
    })
    
    if (!oldTx) throw new Error('Transaction not found')

    if (parsed.accountId && parsed.accountId !== oldTx.accountId) {
      const account = await tx.account.findFirst({
        where: { id: parsed.accountId, userId }
      })
      if (!account) throw new Error("Unauthorized account access")
    }

    if (parsed.categoryId && parsed.categoryId !== oldTx.categoryId) {
      const category = await tx.category.findFirst({
        where: { id: parsed.categoryId, userId }
      })
      if (!category) throw new Error("Unauthorized category access")
    }

    const txRecord = await tx.transaction.update({
      where: { id: parsedId, userId },
      data: {
        accountId: parsed.accountId,
        categoryId: parsed.categoryId,
        amount: parsed.amount,
        date: parsed.date,
        description: parsed.description,
        merchant: parsed.merchant,
        pendingStatus: parsed.pendingStatus,
        tags: parsed.tags,
      },
    })

    // If account changed, transfer balance between accounts
    if (data.accountId && data.accountId !== oldTx.accountId) {
      // Remove old amount from old account
      await tx.account.update({
        where: { id: oldTx.accountId },
        data: {
          balance: { decrement: oldTx.amount },
        },
      })
      // Add new amount to new account
      const newAmount = data.amount !== undefined ? data.amount : Number(oldTx.amount)
      await tx.account.update({
        where: { id: data.accountId },
        data: {
          balance: { increment: newAmount },
        },
      })
    } else if (data.amount !== undefined && data.amount !== Number(oldTx.amount)) {
      // Same account, but amount changed — adjust the diff
      const diff = data.amount - Number(oldTx.amount)
      await tx.account.update({
        where: { id: oldTx.accountId },
        data: {
          balance: { increment: diff },
        },
      })
    }

    return txRecord
  })
  
  return serializeTransaction(transaction)
}

export async function deleteTransaction(id: string) {
  const parsedId = schema.DeleteAccountSchema.parse(id)
  const userId = await getUserId()

  const transaction = await prisma.$transaction(async (tx: any) => {
    const oldTx = await tx.transaction.findUnique({
      where: { id: parsedId, userId },
    })

    if (!oldTx) throw new Error('Transaction not found')

    // Decrement the transaction amount from the account balance
    await tx.account.update({
      where: { id: oldTx.accountId },
      data: {
        balance: { decrement: oldTx.amount },
      },
    })

    return await tx.transaction.delete({
      where: { id: parsedId, userId },
    })
  })
  
  return serializeTransaction(transaction)
}

export async function splitTransaction(
  parentId: string,
  splits: Array<{ categoryId: string | null; amount: number; description: string }>
) {
  const parsedParentId = schema.DeleteAccountSchema.parse(parentId)
  const parsedSplits = schema.SplitTransactionSchema.parse(splits)
  const userId = await getUserId()

  const childTransactions = await prisma.$transaction(async (tx: any) => {
    const parentTx = await tx.transaction.findUnique({
      where: { id: parsedParentId, userId },
    })

    if (!parentTx) throw new Error('Parent transaction not found')

    // Verify category ownership for splits
    for (const split of parsedSplits) {
      if (split.categoryId) {
        const category = await tx.category.findFirst({
          where: { id: split.categoryId, userId }
        })
        if (!category) throw new Error("Unauthorized category access")
      }
    }

    // Create split children
    const list = []
    for (const split of parsedSplits) {
      const child = await tx.transaction.create({
        data: {
          userId,
          accountId: parentTx.accountId,
          categoryId: split.categoryId,
          amount: split.amount,
          date: parentTx.date,
          description: split.description,
          merchant: parentTx.merchant,
          splitParentId: parsedParentId,
          pendingStatus: false,
        },
      })
      list.push(child)
    }

    return list
  })
  
  return childTransactions.map(serializeTransaction)
}

export async function getRecurringRules() {
  const userId = await getUserId()
  const rules = await prisma.recurringRule.findMany({
    where: { userId },
    orderBy: { name: 'asc' },
    include: {
      category: { select: { name: true, color: true, createdAt: true, updatedAt: true, monthlyTarget: true } },
    },
  })
  return rules.map(serializeRecurringRule)
}

export async function createRecurringRule(data: {
  name: string
  interval: RuleInterval
  amount: number
  nextExpectedDate: Date
  matchingMerchant: string
  categoryId?: string
}) {
  const parsed = schema.CreateRecurringRuleSchema.parse(data)
  const userId = await getUserId()

  if (parsed.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: parsed.categoryId, userId }
    })
    if (!category) throw new Error("Unauthorized category access")
  }

  const rule = await prisma.recurringRule.create({
    data: {
      userId,
      name: parsed.name,
      interval: parsed.interval,
      amount: parsed.amount,
      nextExpectedDate: parsed.nextExpectedDate,
      matchingMerchant: parsed.matchingMerchant,
      categoryId: parsed.categoryId,
    },
  })
  return serializeRecurringRule(rule)
}

export async function deleteCategory(id: string) {
  const parsedId = schema.DeleteAccountSchema.parse(id)
  const userId = await getUserId()
  // Verify ownership before deleting
  const category = await prisma.category.findFirst({
    where: { id: parsedId, userId },
  })
  if (!category) {
    throw new Error('Category not found or unauthorized')
  }
  // Move child categories to no parent before deleting
  await prisma.category.updateMany({
    where: { parentId: parsedId, userId },
    data: { parentId: null },
  })
  // Nullify category on transactions
  await prisma.transaction.updateMany({
    where: { categoryId: parsedId, userId },
    data: { categoryId: null },
  })
  await prisma.category.delete({ where: { id: parsedId } })
  return { success: true }
}

export async function deleteRecurringRule(id: string) {
  const parsedId = schema.DeleteAccountSchema.parse(id)
  const userId = await getUserId()
  const rule = await prisma.recurringRule.findFirst({
    where: { id: parsedId, userId },
  })
  if (!rule) {
    throw new Error('Recurring rule not found or unauthorized')
  }
  await prisma.recurringRule.delete({ where: { id: parsedId } })
  return { success: true }
}
