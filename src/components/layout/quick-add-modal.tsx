'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useDashboard } from '@/contexts/dashboard-context'
import { useFinanceData } from '@/hooks/use-finance-data'
import { formatCurrency, getCurrencySymbol } from '@/utils/currency'
import { X, Calendar as CalendarIcon, ArrowDownLeft, ArrowUpRight, Check, Tag } from 'lucide-react'

export default function QuickAddModal() {
  const { isQuickAddOpen, closeQuickAdd, currency } = useDashboard()
  const { accounts, categories, addTransaction } = useFinanceData()

  const [type, setType] = useState<'expense' | 'income'>('expense')
  const [amountStr, setAmountStr] = useState('0.00')
  const [merchant, setMerchant] = useState('')
  const [description, setDescription] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0])
  const [tagsInput, setTagsInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const modalRef = useRef<HTMLDivElement>(null)

  // Set default account on load
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id)
    }
  }, [accounts, accountId])

  // Virtual numpad key handler
  const handleNumpadClick = (key: string) => {
    setAmountStr(prev => {
      // Strip formatting and dec
      const digits = prev.replace('.', '').replace(/^0+/, '')
      
      if (key === 'backspace') {
        if (digits.length <= 1) return '0.00'
        const nextDigits = digits.slice(0, -1)
        const padded = nextDigits.padStart(3, '0')
        return padded.slice(0, -2) + '.' + padded.slice(-2)
      }
      
      const nextDigits = digits + key
      if (nextDigits.length > 9) return prev // Limit to $9,999,999.99
      const padded = nextDigits.padStart(3, '0')
      return padded.slice(0, -2) + '.' + padded.slice(-2)
    })
  }

  // Monitor hardware keyboard entries
  useEffect(() => {
    if (!isQuickAddOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeQuickAdd()
      } else if (e.key >= '0' && e.key <= '9') {
        handleNumpadClick(e.key)
      } else if (e.key === 'Backspace') {
        handleNumpadClick('backspace')
      } else if (e.key === 'Enter') {
        // Submit if forms are filled
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isQuickAddOpen, closeQuickAdd])

  // Auto-suggest category based on merchant name
  const handleMerchantChange = (val: string) => {
    setMerchant(val)
    const normalized = val.toLowerCase()
    
    // Simple merchant rule matcher
    if (normalized.includes('uber') || normalized.includes('lyft') || normalized.includes('cab')) {
      const uberCat = categories.find(c => c.name.toLowerCase() === 'uber/lyft' || c.name.toLowerCase() === 'gas/transit')
      if (uberCat) setCategoryId(uberCat.id)
    } else if (normalized.includes('whole foods') || normalized.includes('grocer') || normalized.includes('walmart') || normalized.includes('target')) {
      const grocCat = categories.find(c => c.name.toLowerCase() === 'groceries')
      if (grocCat) setCategoryId(grocCat.id)
    } else if (normalized.includes('netflix') || normalized.includes('spotify') || normalized.includes('hulu') || normalized.includes('gym')) {
      const subCat = categories.find(c => c.name.toLowerCase() === 'subscriptions')
      if (subCat) setCategoryId(subCat.id)
    } else if (normalized.includes('cafe') || normalized.includes('starbucks') || normalized.includes('restaurant') || normalized.includes('pizza')) {
      const restCat = categories.find(c => c.name.toLowerCase() === 'restaurants')
      if (restCat) setCategoryId(restCat.id)
    } else if (normalized.includes('rent') || normalized.includes('landlord')) {
      const rentCat = categories.find(c => c.name.toLowerCase().includes('rent'))
      if (rentCat) setCategoryId(rentCat.id)
    } else if (normalized.includes('power') || normalized.includes('gas bill') || normalized.includes('comcast') || normalized.includes('utility')) {
      const utilCat = categories.find(c => c.name.toLowerCase().includes('utility'))
      if (utilCat) setCategoryId(utilCat.id)
    }
  }

  const handleSubmit = async () => {
    const numericAmount = parseFloat(amountStr)
    if (numericAmount <= 0) {
      setErrorMessage('Amount must be greater than 0.')
      return
    }
    if (!accountId) {
      setErrorMessage('Please select an account.')
      return
    }
    if (!merchant) {
      setErrorMessage('Please enter a merchant or description.')
      return
    }

    setIsSubmitting(true)
    setErrorMessage(null)

    // Expense = negative amount, Income = positive
    const finalAmount = type === 'expense' ? -numericAmount : numericAmount
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim().replace('#', '')).filter(Boolean) : []

    const res = await addTransaction({
      accountId,
      categoryId: categoryId || null,
      amount: finalAmount,
      date,
      description: description || merchant,
      merchant,
      pendingStatus: false,
      tags,
    })

    setIsSubmitting(false)
    if (res.success) {
      // Reset form
      setAmountStr('0.00')
      setMerchant('')
      setDescription('')
      setTagsInput('')
      closeQuickAdd()
    } else {
      setErrorMessage(res.error || 'Failed to create transaction.')
    }
  }

  if (!isQuickAddOpen) return null

  // Filter child categories for selectors
  const childCategories = categories.filter(c => c.parentId !== null)

  return (
    <div onClick={closeQuickAdd} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div 
        ref={modalRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 p-6">
          <h3 className="text-lg font-bold">New Transaction</h3>
          <button 
            onClick={closeQuickAdd}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {errorMessage && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-sm text-rose-600 dark:text-rose-400">
              {errorMessage}
            </div>
          )}

          {/* Amount Display */}
          <div className="text-center space-y-2">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Transaction Amount</span>
            <div className={`text-4xl md:text-5xl font-black tracking-tight ${type === 'expense' ? 'text-zinc-900 dark:text-white' : 'text-emerald-500'}`}>
              {type === 'expense' ? '-' : '+'}{getCurrencySymbol(currency)}{amountStr}
            </div>

            {/* Income/Expense Toggle */}
            <div className="inline-flex rounded-2xl bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200/50 dark:border-zinc-800/50">
              <button
                onClick={() => setType('expense')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                  type === 'expense' 
                    ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-950 dark:text-white' 
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                <ArrowDownLeft size={14} className="text-rose-500" />
                Expense
              </button>
              <button
                onClick={() => setType('income')}
                className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition cursor-pointer ${
                  type === 'income' 
                    ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-950 dark:text-white' 
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                <ArrowUpRight size={14} className="text-emerald-500" />
                Income
              </button>
            </div>
          </div>

          {/* Numpad (Implied Decimal) */}
          <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '00', 'backspace'].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleNumpadClick(key)}
                className="flex h-12 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/40 dark:border-zinc-800/40 text-base font-bold active:bg-zinc-200 dark:active:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 transition cursor-pointer"
              >
                {key === 'backspace' ? '⌫' : key}
              </button>
            ))}
          </div>

          {/* Details Form */}
          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-900">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Account</label>
                <select
                  value={accountId}
                  onChange={(e) => setAccountId(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.balance, currency)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Category</label>
                <select
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                >
                  <option value="">Uncategorized</option>
                  {categories.filter(c => c.parentId === null).map(parent => {
                    const children = categories.filter(c => c.parentId === parent.id)
                    if (children.length === 0) return null
                    return (
                      <optgroup key={parent.id} label={parent.name}>
                        {children.map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                      </optgroup>
                    )
                  })}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Merchant</label>
              <input
                type="text"
                placeholder="e.g. Starbucks, Whole Foods"
                value={merchant}
                onChange={(e) => handleMerchantChange(e.target.value)}
                className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-4 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Description (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Morning latte, grocery trip"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-4 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Date</label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 pl-10 pr-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Tags (Comma-separated)</label>
                <div className="relative">
                  <Tag className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                  <input
                    type="text"
                    placeholder="e.g. vacation2026, work"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 pl-10 pr-3.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-zinc-100 dark:border-zinc-900 p-6 bg-zinc-50/50 dark:bg-zinc-900/10">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-500/10 cursor-pointer disabled:opacity-50"
          >
            {isSubmitting ? 'Adding...' : 'Save Transaction'}
          </button>
        </div>
      </div>
    </div>
  )
}
