'use client'

import React, { useState, useEffect } from 'react'
import { useFinanceData } from '@/hooks/use-finance-data'
import { MockCategory } from '@/utils/local-storage-db'
import { useDashboard } from '@/contexts/dashboard-context'
import { formatCurrency } from '@/utils/currency'
import CategoryIcon from '@/components/ui/category-icon'
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Check, 
  Plus, 
  Edit, 
  Edit3,
  Calendar, 
  Info,
  ArrowRight
} from 'lucide-react'

export default function BudgetPage() {
  const { transactions, categories, editCategory, addCategory } = useFinanceData()
  const { currency } = useDashboard()
  
  // Date Selector state (defaults to current month)
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() } // 0-indexed month
  })

  // Edit target state
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null)
  const [editTargetValue, setEditTargetValue] = useState('')
  const [editRolloverValue, setEditRolloverValue] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Quick category creation state
  const [showAddQuickCategory, setShowAddQuickCategory] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [newCatParent, setNewCatParent] = useState('')
  const [newCatTarget, setNewCatTarget] = useState('')

  // Calculate year/month ranges
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const nextMonth = () => {
    setSelectedMonth(prev => {
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { year: prev.year, month: prev.month + 1 }
    })
  }

  const prevMonth = () => {
    setSelectedMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { year: prev.year, month: prev.month - 1 }
    })
  }

  // Helper to filter transactions of a specific year/month
  const getTransactionsForMonth = (year: number, month: number) => {
    return transactions.filter(t => {
      const d = new Date(t.date)
      return d.getFullYear() === year && d.getMonth() === month
    })
  }

  // 1. Get current month details
  const currentTxs = getTransactionsForMonth(selectedMonth.year, selectedMonth.month)
  
  // 2. Calculate Total Income for the month (positive transactions in salary/interest categories)
  const incomeCategoryIds = categories.filter(c => {
    // Parent is Income
    const parent = categories.find(p => p.id === c.parentId)
    return parent?.name === 'Income' || c.name === 'Income'
  }).map(c => c.id)

  const totalIncome = currentTxs
    .filter(t => t.categoryId && incomeCategoryIds.includes(t.categoryId))
    .reduce((acc, curr) => acc + Number(curr.amount), 0)

  // 3. Category Rollover Calculations
  // To get rollover for month M, we must calculate the carryover balance of month M-1
  const prevMonthDate = selectedMonth.month === 0 
    ? { year: selectedMonth.year - 1, month: 11 } 
    : { year: selectedMonth.year, month: selectedMonth.month - 1 }

  const prevTxs = getTransactionsForMonth(prevMonthDate.year, prevMonthDate.month)

  const getRolloverAmount = (cat: MockCategory): number => {
    if (!cat.rolloverEnabled) return 0
    
    // Calculate spent in prev month
    const prevSpent = prevTxs
      .filter(t => t.categoryId === cat.id)
      .reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0)

    const prevTarget = Number(cat.monthlyTarget || 0)
    
    // Remaining in previous month
    const remainder = prevTarget - prevSpent
    return Number(remainder.toFixed(2))
  }

  // 4. Budget limits and ZBB Math
  // Parent Categories (excluding Income)
  const budgetParents = categories.filter(c => c.parentId === null && c.name !== 'Income')
  
  // Child categories (for actual budgeting rows)
  const childCategories = categories.filter(c => c.parentId !== null && !incomeCategoryIds.includes(c.id))

  const totalBudgeted = childCategories.reduce((acc, curr) => acc + Number(curr.monthlyTarget || 0), 0)
  const leftToAllocate = totalIncome - totalBudgeted

  const handleEditTarget = (cat: MockCategory) => {
    setEditingCategoryId(cat.id)
    setEditTargetValue(String(cat.monthlyTarget || '0'))
    setEditRolloverValue(cat.rolloverEnabled)
  }

  const handleSaveTarget = async (id: string) => {
    const targetVal = parseFloat(editTargetValue)
    if (isNaN(targetVal) || targetVal < 0) return

    setIsSubmitting(true)
    await editCategory(id, {
      monthlyTarget: targetVal,
      rolloverEnabled: editRolloverValue,
    })
    setIsSubmitting(false)
    setEditingCategoryId(null)
  }

  const handleAddQuickCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName || !newCatParent) return
    
    const target = parseFloat(newCatTarget) || 0

    setIsSubmitting(true)
    await addCategory({
      name: newCatName,
      parentId: newCatParent,
      monthlyTarget: target,
      color: '#c084fc', // Default purple
      icon: 'Tag',
      rolloverEnabled: false,
    })
    setIsSubmitting(false)
    setNewCatName('')
    setNewCatTarget('')
    setShowAddQuickCategory(false)
  }

  return (
    <div className="space-y-8">
      {/* Header & Date Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">Budgeting</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Review allocations, set spending goals, and monitor rollover limits.</p>
        </div>

        {/* Month Selector */}
        <div className="inline-flex items-center gap-1 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-1 shadow-sm">
          <button 
            onClick={prevMonth}
            className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer transition"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="px-4 text-sm font-bold flex items-center gap-1.5 text-zinc-850 dark:text-white">
            <Calendar size={14} className="text-violet-500" />
            {monthNames[selectedMonth.month]} {selectedMonth.year}
          </div>
          <button 
            onClick={nextMonth}
            className="p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-white rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-850 cursor-pointer transition"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {/* Zero-Based Budgeting Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Income Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Monthly Income</span>
          <p className="text-2xl font-black mt-1 text-emerald-500">{formatCurrency(totalIncome, currency)}</p>
          <span className="text-[10px] text-zinc-400 block mt-1.5">Direct deposits, salaries, interest</span>
        </div>

        {/* Allocated Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Assigned to Categories</span>
          <p className="text-2xl font-black mt-1 text-zinc-850 dark:text-white">{formatCurrency(totalBudgeted, currency)}</p>
          <span className="text-[10px] text-zinc-400 block mt-1.5">Aggregated monthly category limits</span>
        </div>

        {/* Zero Based Target Card */}
        <div className={`border rounded-3xl p-6 shadow-sm relative overflow-hidden ${
          leftToAllocate === 0 
            ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
            : leftToAllocate > 0 
              ? 'bg-violet-500/10 border-violet-500/20 text-violet-600 dark:text-violet-400' 
              : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
        }`}>
          <span className={`text-[10px] font-bold uppercase tracking-wider ${
            leftToAllocate === 0 ? 'text-emerald-500' : leftToAllocate > 0 ? 'text-violet-500' : 'text-rose-500'
          }`}>
            Zero-Based Budget Pool
          </span>
          <p className="text-2xl font-black mt-1">
            {leftToAllocate === 0 ? `Balanced (${formatCurrency(0, currency)})` : leftToAllocate > 0 ? `+${formatCurrency(leftToAllocate, currency)} Left` : `-${formatCurrency(Math.abs(leftToAllocate), currency)} Over`}
          </p>
          
          <div className="text-[10px] flex items-center gap-1.5 mt-1.5 text-zinc-400">
            <Info size={12} className="shrink-0" />
            <span>
              {leftToAllocate === 0 
                ? 'Perfect! Every dollar has a defined spending job.' 
                : leftToAllocate > 0 
                  ? 'Assign remaining dollars to savings, debt, or food limits.' 
                  : 'Reduce category targets to align with monthly income.'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Budget layout lists */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Category Budget Target Sheets */}
        <div className="lg:col-span-2 space-y-6">
          {budgetParents.map(parent => {
            // Get children of this parent
            const children = childCategories.filter(c => c.parentId === parent.id)
            if (children.length === 0) return null

            return (
              <div 
                key={parent.id} 
                className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm space-y-4"
              >
                {/* Parent Header */}
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2.5">
                    <div 
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-white"
                      style={{ backgroundColor: parent.color || '#9ca3af' }}
                    >
                      <CategoryIcon name={parent.icon || 'Folder'} size={15} />
                    </div>
                    <h3 className="font-extrabold text-zinc-900 dark:text-white text-base">{parent.name}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      {formatCurrency(children.reduce((acc, child) => acc + currentTxs.filter(t => t.categoryId === child.id).reduce((sum, t) => sum + Math.abs(Number(t.amount)), 0), 0), currency)}
                    </span>
                    <span className="text-[10px] text-zinc-400 font-semibold ml-1">
                      / {formatCurrency(children.reduce((acc, curr) => acc + Number(curr.monthlyTarget || 0), 0), currency)}
                    </span>
                  </div>
                </div>

                {/* Children rows */}
                <div className="space-y-5">
                  {children.map(child => {
                    const spent = currentTxs
                      .filter(t => t.categoryId === child.id)
                      .reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0)

                    const target = Number(child.monthlyTarget || 0)
                    const rollover = getRolloverAmount(child)
                    
                    // Effective total spending limit (Target + Rollover Carryover)
                    const effectiveLimit = target + rollover
                    const left = effectiveLimit - spent
                    const progressPercent = effectiveLimit > 0 ? Math.min(100, (spent / effectiveLimit) * 100) : 0

                    const isEditing = editingCategoryId === child.id

                    return (
                      <div key={child.id} className="space-y-2">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <div className="flex items-center gap-2 min-w-0">
                            <span 
                              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-[10px]"
                              style={{ 
                                backgroundColor: (child.color || '#9ca3af') + '20',
                                color: child.color || '#9ca3af'
                              }}
                            >
                              <CategoryIcon name={child.icon || 'Tag'} size={12} />
                            </span>
                            <span className="font-bold truncate text-zinc-900 dark:text-white">{child.name}</span>
                            
                            {rollover !== 0 && (
                              <span className={`text-[9px] font-semibold rounded-md px-1.5 py-0.5 border ${
                                rollover > 0 
                                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400' 
                                  : 'bg-rose-500/10 border-rose-500/20 text-rose-600 dark:text-rose-400'
                              }`}>
                                {rollover > 0 ? '+' : ''}{formatCurrency(rollover, currency)} Carryover
                              </span>
                            )}
                          </div>

                          {/* Budgets & Edit Button */}
                          <div className="flex items-center gap-3 select-none">
                            {isEditing ? (
                              <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                <input
                                  type="number"
                                  value={editTargetValue}
                                  onChange={e => setEditTargetValue(e.target.value)}
                                  className="w-16 rounded-lg bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 text-xs text-right font-semibold outline-none focus:ring-1 focus:ring-violet-500"
                                />
                                <label className="flex items-center gap-1 text-[10px] text-zinc-400">
                                  <input
                                    type="checkbox"
                                    checked={editRolloverValue}
                                    onChange={e => setEditRolloverValue(e.target.checked)}
                                    className="rounded border-zinc-200 dark:border-zinc-800"
                                  />
                                  Roll
                                </label>
                                <button
                                  onClick={() => handleSaveTarget(child.id)}
                                  className="h-5 w-5 rounded bg-emerald-500 text-white flex items-center justify-center hover:bg-emerald-600 cursor-pointer"
                                >
                                  <Check size={10} />
                                </button>
                              </div>
                            ) : (
                              <div className="text-right">
                                <span className="font-medium text-zinc-400 mr-1.5 text-xs">spent {formatCurrency(spent, currency)} of</span>
                                <span className="font-black text-zinc-900 dark:text-white">{formatCurrency(effectiveLimit, currency)}</span>
                                <button 
                                  onClick={() => handleEditTarget(child)}
                                  className="ml-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
                                >
                                  <Edit3 size={12} />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Progress Bar & Balances */}
                        <div className="space-y-1.5">
                          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-300 ${
                                spent > effectiveLimit 
                                  ? 'bg-rose-500' 
                                  : spent > effectiveLimit * 0.85 
                                    ? 'bg-amber-500' 
                                    : 'bg-violet-500'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-between items-center text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                            <span>{progressPercent.toFixed(0)}% Utilized</span>
                            <span className={left >= 0 ? 'text-zinc-500' : 'text-rose-500 font-bold'}>
                              {left >= 0 ? `${formatCurrency(left, currency)} Remaining` : `${formatCurrency(Math.abs(left), currency)} Over Budget`}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* Side Panel Actions & Category Creator */}
        <div className="space-y-6">
          
          {/* Quick Category Setup */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="font-bold text-zinc-900 dark:text-white text-sm">Category Quick-Add</h4>
            <p className="text-xs text-zinc-400">Need another sub-category? Initialize it instantly here.</p>

            <form onSubmit={handleAddQuickCategory} className="space-y-3 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Sub-category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Gym, Pet Supplies"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3.5 text-xs text-zinc-950 dark:text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Parent Category</label>
                <select
                  required
                  value={newCatParent}
                  onChange={e => setNewCatParent(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3.5 text-xs text-zinc-950 dark:text-white cursor-pointer"
                >
                  <option value="">Select parent...</option>
                  {categories.filter(c => c.parentId === null && c.name !== 'Income').map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Monthly Limit ($)</label>
                <input
                  type="number"
                  placeholder="e.g. 150"
                  value={newCatTarget}
                  onChange={e => setNewCatTarget(e.target.value)}
                  className="w-full rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3.5 text-xs text-zinc-950 dark:text-white"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold py-2.5 text-xs cursor-pointer shadow hover:from-violet-500 hover:to-indigo-500 transition disabled:opacity-50"
              >
                <Plus size={14} />
                Create Sub-category
              </button>
            </form>
          </div>

          {/* Rollover Logic Explainer */}
          <div className="bg-gradient-to-tr from-violet-950/20 to-indigo-950/10 border border-violet-900/30 rounded-3xl p-6 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-violet-900/20">
              <Info size={14} className="text-violet-400" />
              <h4 className="font-bold text-violet-400 text-sm text-zinc-900 dark:text-white">Carryover (Rollover) Rules</h4>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              If carryover is enabled, unused balances from the previous month (May) are added to June&apos;s spending limit. Over-spent balances carry over as deficits, reducing the current month&apos;s available spending.
            </p>
          </div>

        </div>

      </div>
    </div>
  )
}
