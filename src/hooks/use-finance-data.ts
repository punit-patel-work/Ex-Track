'use client'

import { useEffect, useState, useCallback } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { localDb, MockAccount, MockCategory, MockTransaction, MockRecurringRule } from '@/utils/local-storage-db'
import * as actions from '@/app/actions/finance'

export function useFinanceData() {
  const { user, isMock, loading: authLoading } = useAuth()
  const userId = user?.id
  
  const [accounts, setAccounts] = useState<MockAccount[]>([])
  const [categories, setCategories] = useState<MockCategory[]>([])
  const [transactions, setTransactions] = useState<MockTransaction[]>([])
  const [recurringRules, setRecurringRules] = useState<MockRecurringRule[]>([])
  
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    if (authLoading || !userId) return
    
    setLoading(true)
    setError(null)
    
    try {
      if (isMock) {
        // Load from Local Storage
        setAccounts(localDb.getAccounts())
        setCategories(localDb.getCategories())
        setTransactions(localDb.getTransactions())
        setRecurringRules(localDb.getRecurringRules())
      } else {
        // Load from server database (via Server Actions)
        const [accs, cats, txs, rules] = await Promise.all([
          actions.getAccounts(),
          actions.getCategories(),
          actions.getTransactions(),
          actions.getRecurringRules(),
        ])
        
        // Map decimal type values to standard numbers for simple layout consumption
        const mappedAccs = accs.map((a: any) => ({
          id: a.id,
          name: a.name,
          type: a.type as any,
          balance: Number(a.balance),
          currency: a.currency,
          plaidItemId: a.plaidItemId || undefined,
        }))
        
        const mappedCats = cats.map((c: any) => ({
          id: c.id,
          parentId: c.parentId,
          name: c.name,
          color: c.color,
          icon: c.icon,
          monthlyTarget: c.monthlyTarget ? Number(c.monthlyTarget) : null,
          rolloverEnabled: c.rolloverEnabled,
          rolloverAmount: Number(c.rolloverAmount),
        }))
        
        const mappedTxs = txs.map((t: any) => ({
          id: t.id,
          accountId: t.accountId,
          categoryId: t.categoryId,
          amount: Number(t.amount),
          date: new Date(t.date).toISOString().split('T')[0],
          description: t.description,
          merchant: t.merchant,
          pendingStatus: t.pendingStatus,
          splitParentId: t.splitParentId,
          tags: t.tags,
          receiptUrl: t.receiptUrl,
          accountName: t.account?.name || 'Unknown',
          accountType: t.account?.type || 'CHECKING',
          categoryName: t.category?.name || 'Uncategorized',
          categoryColor: t.category?.color || '#9ca3af',
          categoryIcon: t.category?.icon || 'HelpCircle',
        }))
        
        const mappedRules = rules.map((r: any) => ({
          id: r.id,
          name: r.name,
          interval: r.interval as any,
          amount: Number(r.amount),
          nextExpectedDate: new Date(r.nextExpectedDate).toISOString().split('T')[0],
          matchingMerchant: r.matchingMerchant,
          categoryId: r.categoryId,
          categoryName: r.category?.name || 'Uncategorized',
          categoryColor: r.category?.color || '#9ca3af',
        }))
        
        setAccounts(mappedAccs)
        setCategories(mappedCats)
        setTransactions(mappedTxs)
        setRecurringRules(mappedRules)
      }
    } catch (err: any) {
      console.error('Failed to load finance tracker data:', err)
      setError(err?.message || 'Failed to fetch financial data.')
    } finally {
      setLoading(false)
    }
  }, [userId, isMock, authLoading])

  useEffect(() => {
    fetchData()
  }, [userId, isMock, authLoading])

  const addAccount = async (name: string, type: MockAccount['type'], balance: number, currency: string = 'USD') => {
    try {
      let createdAcc = null
      if (isMock) {
        createdAcc = localDb.createAccount({ name, type, balance, currency })
      } else {
        createdAcc = await actions.createAccount({ name, type, balance, currency })
      }
      await fetchData()
      return { success: true, account: createdAcc }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const removeAccount = async (id: string) => {
    try {
      if (isMock) {
        localDb.deleteAccount(id)
      } else {
        await actions.deleteAccount(id)
      }
      await fetchData()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const addTransaction = async (data: Omit<MockTransaction, 'id' | 'accountName' | 'accountType' | 'categoryName' | 'categoryColor' | 'categoryIcon'>) => {
    try {
      if (isMock) {
        localDb.createTransaction({ ...data, pendingStatus: data.pendingStatus ?? false, tags: data.tags ?? [] })
      } else {
        await actions.createTransaction({
          accountId: data.accountId,
          categoryId: data.categoryId || undefined,
          amount: data.amount,
          date: new Date(data.date),
          description: data.description,
          merchant: data.merchant,
          pendingStatus: data.pendingStatus,
          tags: data.tags,
        })
      }
      await fetchData()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const editTransaction = async (id: string, data: Partial<MockTransaction>) => {
    try {
      if (isMock) {
        localDb.updateTransaction(id, data)
      } else {
        await actions.updateTransaction(id, {
          accountId: data.accountId,
          categoryId: data.categoryId || undefined,
          amount: data.amount,
          date: data.date ? new Date(data.date) : undefined,
          description: data.description,
          merchant: data.merchant,
          pendingStatus: data.pendingStatus,
          tags: data.tags,
        })
      }
      await fetchData()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const removeTransaction = async (id: string) => {
    try {
      if (isMock) {
        localDb.deleteTransaction(id)
      } else {
        await actions.deleteTransaction(id)
      }
      await fetchData()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const splitTransaction = async (parentId: string, splits: Array<{ categoryId: string; amount: number; description: string }>) => {
    try {
      if (isMock) {
        localDb.splitTransaction(parentId, splits)
      } else {
        await actions.splitTransaction(parentId, splits)
      }
      await fetchData()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const addCategory = async (data: { name: string; color?: string; icon?: string; parentId?: string; monthlyTarget?: number; rolloverEnabled?: boolean }) => {
    try {
      if (isMock) {
        localDb.createCategory({
          name: data.name,
          color: data.color ?? null,
          icon: data.icon ?? null,
          parentId: data.parentId ?? null,
          monthlyTarget: data.monthlyTarget ?? null,
          rolloverEnabled: data.rolloverEnabled ?? false,
        })
      } else {
        await actions.createCategory(data)
      }
      await fetchData()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const editCategory = async (id: string, data: Partial<MockCategory>) => {
    try {
      if (isMock) {
        localDb.updateCategory(id, data)
      } else {
        await actions.updateCategory(id, {
          name: data.name ?? '',
          color: data.color ?? undefined,
          icon: data.icon ?? undefined,
          monthlyTarget: data.monthlyTarget ?? undefined,
          rolloverEnabled: data.rolloverEnabled,
        })
      }
      await fetchData()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const removeCategory = async (id: string) => {
    try {
      if (isMock) {
        localDb.deleteCategory(id)
      } else {
        await actions.deleteCategory(id)
      }
      await fetchData()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const addRecurringRule = async (data: { name: string; interval: string; amount: number; nextExpectedDate: string; matchingMerchant: string; categoryId?: string }) => {
    try {
      if (isMock) {
        localDb.createRecurringRule({ ...data, interval: data.interval as any })
      } else {
        await actions.createRecurringRule({
          name: data.name,
          interval: data.interval as any,
          amount: data.amount,
          nextExpectedDate: new Date(data.nextExpectedDate),
          matchingMerchant: data.matchingMerchant,
          categoryId: data.categoryId,
        })
      }
      await fetchData()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  const removeRecurringRule = async (id: string) => {
    try {
      if (isMock) {
        localDb.deleteRecurringRule(id)
      } else {
        await actions.deleteRecurringRule(id)
      }
      await fetchData()
      return { success: true }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }

  return {
    accounts,
    categories,
    transactions,
    recurringRules,
    loading: authLoading || loading,
    error,
    addAccount,
    removeAccount,
    addTransaction,
    editTransaction,
    removeTransaction,
    splitTransaction,
    addCategory,
    editCategory,
    removeCategory,
    addRecurringRule,
    removeRecurringRule,
    refresh: fetchData,
  }
}
