'use client'

import React, { useState, useEffect } from 'react'
import { useFinanceData } from '@/hooks/use-finance-data'
import { MockTransaction } from '@/utils/local-storage-db'
import { useDashboard } from '@/contexts/dashboard-context'
import { formatCurrency, getCurrencySymbol } from '@/utils/currency'
import { X, Calendar, Edit2, Trash2, Split, Plus, Trash, HelpCircle, Check, ArrowRight } from 'lucide-react'

interface DetailsPanelProps {
  transaction: MockTransaction
  onClose: () => void
}

interface SplitItem {
  id: string
  categoryId: string
  amount: number
  description: string
}

export default function DetailsPanel({ transaction, onClose }: DetailsPanelProps) {
  const { accounts, categories, editTransaction, removeTransaction, splitTransaction } = useFinanceData()
  const { currency } = useDashboard()
  
  // Edit mode
  const [isEditing, setIsEditing] = useState(false)
  const [merchant, setMerchant] = useState('')
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState(0)
  const [date, setDate] = useState('')
  const [accountId, setAccountId] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [tags, setTags] = useState('')
  
  // Split mode
  const [isSplitting, setIsSplitting] = useState(false)
  const [splits, setSplits] = useState<SplitItem[]>([])
  
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Sync state on transaction change
  useEffect(() => {
    setMerchant(transaction.merchant)
    setDescription(transaction.description)
    setAmount(Math.abs(Number(transaction.amount)))
    setDate(transaction.date)
    setAccountId(transaction.accountId)
    setCategoryId(transaction.categoryId || '')
    setTags(transaction.tags.join(', '))
    
    // Reset views
    setIsEditing(false)
    setIsSplitting(false)
    setSplits([])
    setError(null)
  }, [transaction])

  const handleUpdate = async () => {
    if (!merchant) {
      setError('Merchant name is required.')
      return
    }
    if (amount <= 0) {
      setError('Amount must be greater than 0.')
      return
    }

    setSaving(true)
    setError(null)

    // Reconstruct amount signs
    const isExpense = Number(transaction.amount) < 0
    const finalAmount = isExpense ? -amount : amount

    const res = await editTransaction(transaction.id, {
      merchant,
      description: description || merchant,
      amount: finalAmount,
      date,
      accountId,
      categoryId: categoryId || null,
      tags: tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [],
    })

    setSaving(false)
    if (res.success) {
      setIsEditing(false)
    } else {
      setError(res.error || 'Failed to update transaction.')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this transaction?')) return
    setSaving(true)
    const res = await removeTransaction(transaction.id)
    setSaving(false)
    if (res.success) {
      onClose()
    } else {
      setError(res.error || 'Failed to delete transaction.')
    }
  }

  // Initialize splits with parent transaction info
  const handleStartSplit = () => {
    setIsSplitting(true)
    const defaultSplits: SplitItem[] = [
      {
        id: 'split-1',
        categoryId: transaction.categoryId || '',
        amount: Math.abs(Number(transaction.amount)) / 2,
        description: transaction.description + ' (Split 1)',
      },
      {
        id: 'split-2',
        categoryId: '',
        amount: Math.abs(Number(transaction.amount)) / 2,
        description: transaction.description + ' (Split 2)',
      },
    ]
    setSplits(defaultSplits)
  }

  const addSplitRow = () => {
    const remaining = Math.max(0, getRemainingToAllocate())
    const nextRow: SplitItem = {
      id: 'split-' + Math.random().toString(36).substring(2, 9),
      categoryId: '',
      amount: remaining,
      description: transaction.description + ` (Split ${splits.length + 1})`,
    }
    setSplits([...splits, nextRow])
  }

  const removeSplitRow = (id: string) => {
    if (splits.length <= 2) return
    setSplits(splits.filter(s => s.id !== id))
  }

  const updateSplitRow = (id: string, field: keyof SplitItem, value: any) => {
    const next = [...splits]
    const idx = next.findIndex(s => s.id === id)
    if (idx !== -1) {
      next[idx] = { ...next[idx], [field]: value }
      setSplits(next)
    }
  }

  // Calculate transaction totals
  const getSplitsTotal = () => splits.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0)
  const getRemainingToAllocate = () => {
    const parentVal = Math.abs(Number(transaction.amount))
    const childVal = getSplitsTotal()
    return Number((parentVal - childVal).toFixed(2))
  }

  const handleSaveSplits = async () => {
    const remaining = getRemainingToAllocate()
    if (remaining !== 0) {
      setError(`Cannot save splits. Remaining amount to allocate must be $0.00. Current: ${remaining > 0 ? '+' : ''}$${remaining}`)
      return
    }

    const invalid = splits.some(s => !s.categoryId || s.amount <= 0)
    if (invalid) {
      setError('Please specify a category and a positive amount for every split row.')
      return
    }

    setSaving(true)
    setError(null)

    // Map amounts to match expense/income direction
    const isExpense = Number(transaction.amount) < 0
    const finalSplits = splits.map(s => ({
      categoryId: s.categoryId,
      amount: isExpense ? -Number(s.amount) : Number(s.amount),
      description: s.description,
    }))

    // 1. Create splits child transactions
    const splitRes = await splitTransaction(transaction.id, finalSplits)
    
    // 2. Adjust parent transaction: set its amount to the first split, and map its category. 
    // Or we can delete/mark the parent as split. 
    // In our system, the parent transaction remains but its amount can be deleted or set to 0 to avoid double counting, OR the parent transaction is updated to represent the first split and we save other splits as child items.
    // Let's perform a clean split: update parent to split item 1, and add others as children.
    if (splitRes.success) {
      // Update parent to splits[0]
      const parentIsExpense = Number(transaction.amount) < 0
      const parentAmt = parentIsExpense ? -splits[0].amount : splits[0].amount
      
      await editTransaction(transaction.id, {
        categoryId: splits[0].categoryId,
        amount: parentAmt,
        description: splits[0].description,
      })

      setSaving(false)
      onClose()
    } else {
      setError(splitRes.error || 'Failed to split transaction.')
      setSaving(false)
    }
  }

  const isExpense = Number(transaction.amount) < 0
  const displayAmount = Math.abs(Number(transaction.amount)).toFixed(2)
  const childCategories = categories.filter(c => c.parentId !== null)

  return (
    <div className="w-full md:w-[420px] shrink-0 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col h-full overflow-hidden">
      {/* Panel Header */}
      <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-800 p-5">
        <div>
          <h3 className="font-bold text-zinc-900 dark:text-white">Transaction Details</h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">ID: {transaction.id.substring(0, 8)}...</p>
        </div>
        <button 
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
        >
          <X size={15} />
        </button>
      </div>

      {/* Panel Scroll Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-6 no-scrollbar">
        {error && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-xs text-rose-600 dark:text-rose-400">
            {error}
          </div>
        )}

        {/* View / Edit Mode */}
        {!isSplitting ? (
          <>
            {/* Amount and quick details */}
            <div className="text-center bg-zinc-50 dark:bg-zinc-950 rounded-3xl p-6 border border-zinc-150 dark:border-zinc-900 space-y-2">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">{transaction.accountName}</span>
              <div className={`text-4xl font-extrabold tracking-tight ${isExpense ? 'text-zinc-900 dark:text-white' : 'text-emerald-500'}`}>
                {isExpense ? '-' : '+'}{formatCurrency(displayAmount, currency)}
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-zinc-900 rounded-full text-xs border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-500">
                <Calendar size={12} />
                {transaction.date}
              </div>
            </div>

            {/* Editing Form / Details list */}
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Merchant</label>
                <input
                  type="text"
                  value={merchant}
                  disabled={!isEditing}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-950 disabled:bg-transparent border border-zinc-200 dark:border-zinc-800 disabled:border-transparent py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Description</label>
                <input
                  type="text"
                  value={description}
                  disabled={!isEditing}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-950 disabled:bg-transparent border border-zinc-200 dark:border-zinc-800 disabled:border-transparent py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Category</label>
                  <select
                    value={categoryId}
                    disabled={!isEditing}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-950 disabled:bg-transparent border border-zinc-200 dark:border-zinc-800 disabled:border-transparent disabled:appearance-none py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
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

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Account</label>
                  <select
                    value={accountId}
                    disabled={!isEditing}
                    onChange={(e) => setAccountId(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-950 disabled:bg-transparent border border-zinc-200 dark:border-zinc-800 disabled:border-transparent disabled:appearance-none py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    {accounts.map(acc => (
                      <option key={acc.id} value={acc.id}>{acc.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Tags</label>
                <input
                  type="text"
                  value={tags}
                  disabled={!isEditing}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g. work, reimbursable"
                  className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-950 disabled:bg-transparent border border-zinc-200 dark:border-zinc-800 disabled:border-transparent py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-6 border-t border-zinc-100 dark:border-zinc-800 space-y-2">
              {isEditing ? (
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 py-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer text-center"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdate}
                    disabled={saving}
                    className="flex-1 rounded-2xl bg-violet-600 hover:bg-violet-500 text-white py-3 text-xs font-semibold shadow-sm cursor-pointer text-center"
                  >
                    {saving ? 'Saving...' : 'Save Updates'}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setIsEditing(true)}
                      className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 py-3 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer"
                    >
                      <Edit2 size={13} />
                      Edit Details
                    </button>
                    {!transaction.splitParentId && (
                      <button
                        onClick={handleStartSplit}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 py-3 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer"
                      >
                        <Split size={13} />
                        Split Category
                      </button>
                    )}
                  </div>
                  <button
                    onClick={handleDelete}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-1.5 rounded-2xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 py-3 text-xs font-semibold cursor-pointer border border-rose-500/20"
                  >
                    <Trash2 size={13} />
                    Delete Transaction
                  </button>
                </div>
              )}
            </div>
          </>
        ) : (
          /* Split Category Wizard */
          <div className="space-y-6">
            <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-4 space-y-1.5 text-xs text-violet-600 dark:text-violet-400">
              <div className="font-bold flex items-center gap-1">
                <Split size={14} />
                Split Transaction (${displayAmount})
              </div>
              <p className="leading-relaxed">
                Allocate the total amount across multiple categories. Sum of splits must equal the total.
              </p>
            </div>

            {/* Split Rows */}
            <div className="space-y-4">
              {splits.map((split, idx) => (
                <div key={split.id} className="p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 rounded-2xl space-y-3 relative">
                  {splits.length > 2 && (
                    <button
                      onClick={() => removeSplitRow(split.id)}
                      className="absolute right-2 top-2 h-6 w-6 text-zinc-400 hover:text-rose-500 transition cursor-pointer"
                    >
                      <Trash size={12} />
                    </button>
                  )}
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Split #{idx + 1}</span>
                  
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-0.5">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Category</label>
                        <select
                          value={split.categoryId}
                          onChange={(e) => updateSplitRow(split.id, 'categoryId', e.target.value)}
                          className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2 px-2 text-xs text-zinc-900 dark:text-white cursor-pointer"
                        >
                          <option value="">Select category...</option>
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

                      <div className="space-y-0.5">
                        <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Amount ({getCurrencySymbol(currency)})</label>
                        <input
                          type="number"
                          step="0.01"
                          value={split.amount}
                          onChange={(e) => updateSplitRow(split.id, 'amount', parseFloat(e.target.value) || 0)}
                          className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2 px-2 text-xs text-zinc-950 dark:text-white font-bold"
                        />
                      </div>
                    </div>

                    <div className="space-y-0.5">
                      <label className="text-[10px] text-zinc-500 uppercase tracking-wider">Memo / Item Description</label>
                      <input
                        type="text"
                        placeholder="Splitted item details"
                        value={split.description}
                        onChange={(e) => updateSplitRow(split.id, 'description', e.target.value)}
                        className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2 px-2 text-xs text-zinc-950 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Sum allocations */}
            <div className="border-t border-zinc-150 dark:border-zinc-800 pt-4 text-xs font-semibold text-zinc-500 space-y-2">
              <div className="flex justify-between">
                <span>Sum of Splits:</span>
                <span className="font-bold text-zinc-900 dark:text-white">{formatCurrency(getSplitsTotal(), currency)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Remaining to Allocate:</span>
                <span className={`font-bold text-sm ${getRemainingToAllocate() === 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {getRemainingToAllocate() > 0 ? '+' : ''}{formatCurrency(getRemainingToAllocate(), currency)}
                </span>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <button
                onClick={addSplitRow}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-zinc-200 dark:border-zinc-800 py-2.5 text-xs font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer"
              >
                <Plus size={14} />
                Add Split Category Row
              </button>

              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => setIsSplitting(false)}
                  className="flex-1 rounded-xl border border-zinc-200 dark:border-zinc-800 py-3 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSplits}
                  disabled={saving || getRemainingToAllocate() !== 0}
                  className="flex-1 rounded-xl bg-violet-600 hover:bg-violet-500 text-white py-3 text-xs font-semibold shadow-sm cursor-pointer disabled:opacity-50 text-center"
                >
                  {saving ? 'Splitting...' : 'Commit Splits'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
