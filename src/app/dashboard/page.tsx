'use client'

import React, { useState } from 'react'
import { useFinanceData } from '@/hooks/use-finance-data'
import { useAuth } from '@/contexts/auth-context'
import { useDashboard } from '@/contexts/dashboard-context'
import NetWorthChart from '@/components/dashboard/net-worth-chart'
import CashFlowChart from '@/components/dashboard/cash-flow-chart'
import { formatCurrency } from '@/utils/currency'
import { 
  DollarSign, 
  RefreshCw, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  ArrowRight, 
  Calendar, 
  Tv, 
  Sparkles,
  Zap,
  Info,
  ChevronRight,
  Plus,
  Building2,
  Wallet,
  CreditCard,
  Coins,
  CheckCircle2
} from 'lucide-react'
import Link from 'next/link'

export default function DashboardPage() {
  const { user } = useAuth()
  const { openAddAccount, currency } = useDashboard()
  const { 
    accounts, 
    transactions, 
    categories, 
    recurringRules, 
    loading 
  } = useFinanceData()

  // Onboarding Guide Checklist state — persisted to localStorage
  const [showGuide, setShowGuide] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ex_track_guide_dismissed') !== 'true'
    }
    return true
  })

  const dismissGuide = () => {
    setShowGuide(false)
    localStorage.setItem('ex_track_guide_dismissed', 'true')
  }

  // Checklist completion states
  const hasAccounts = accounts.length > 0
  const hasBudgets = categories.some(c => c.monthlyTarget !== null && Number(c.monthlyTarget) > 0)
  const hasTransactions = transactions.length > 0
  const hasLinkedFeeds = accounts.some(a => a.plaidItemId !== null)

  const getAccountIcon = (type: string) => {
    switch (type) {
      case 'CHECKING': return <Wallet size={16} className="text-violet-500" />
      case 'SAVINGS': return <Coins size={16} className="text-emerald-500" />
      case 'CREDIT': return <CreditCard size={16} className="text-rose-500" />
      case 'INVESTMENT': return <TrendingUp size={16} className="text-indigo-500" />
      case 'MANUAL_ASSET': return <Building2 size={16} className="text-amber-500" />
      case 'MANUAL_LIABILITY': return <TrendingDown size={16} className="text-red-500" />
      default: return <Wallet size={16} className="text-zinc-500" />
    }
  }

  // 1. Calculate General KPI Balances
  const totalAssets = accounts
    .filter(a => ['CHECKING', 'SAVINGS', 'INVESTMENT', 'MANUAL_ASSET'].includes(a.type))
    .reduce((acc, curr) => acc + Number(curr.balance), 0)

  const totalLiabilities = accounts
    .filter(a => ['CREDIT', 'MANUAL_LIABILITY'].includes(a.type))
    .reduce((acc, curr) => acc + Math.abs(Number(curr.balance)), 0)

  const netWorth = totalAssets - totalLiabilities

  // 2. Safe-to-Spend Math:
  const checkingAcc = accounts.find(a => a.type === 'CHECKING')
  const checkingBalance = checkingAcc ? Number(checkingAcc.balance) : 0

  const upcomingBillsTotal = recurringRules
    .filter(r => {
      const dueDate = new Date(r.nextExpectedDate)
      const diffTime = dueDate.getTime() - new Date().getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 15
    })
    .reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0)

  const childCategories = categories.filter(c => c.parentId !== null)
  const currentMonthTxs = transactions.filter(t => {
    const d = new Date(t.date)
    const now = new Date()
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()
  })

  const remainingCategoryBudgetTotal = childCategories.reduce((acc, cat) => {
    const target = Number(cat.monthlyTarget || 0)
    const spent = currentMonthTxs
      .filter(t => t.categoryId === cat.id)
      .reduce((s, tx) => s + Math.abs(Number(tx.amount)), 0)
    
    const remaining = Math.max(0, target - spent)
    return acc + remaining
  }, 0)

  const safeToSpend = Math.max(0, checkingBalance - upcomingBillsTotal - remainingCategoryBudgetTotal)

  const recentTxs = transactions.slice(0, 5)

  const linkedAccounts = accounts.filter(a => a.plaidItemId !== null && a.plaidItemId !== undefined)
  const hasLinkedAccounts = linkedAccounts.length > 0

  // Dynamic next bill calculation for dashboard alert
  const nextBill = recurringRules
    .filter(r => {
      const dueDate = new Date(r.nextExpectedDate)
      const diffDays = Math.ceil((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
      return diffDays >= 0 && diffDays <= 30
    })
    .sort((a, b) => new Date(a.nextExpectedDate).getTime() - new Date(b.nextExpectedDate).getTime())[0] || null
  const nextBillDays = nextBill ? Math.max(0, Math.ceil((new Date(nextBill.nextExpectedDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))) : null

  // Helper to format dates for readability
  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-violet-600 border-t-transparent" />
          <span className="text-sm font-semibold text-zinc-500">Loading your dashboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8 font-sans">
      {/* Header and Welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">
            Hello, {user?.user_metadata?.full_name || 'Guest User'}
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Here is your financial status sheet for today.</p>
        </div>

        {/* Unified Link Button */}
        <div className="flex items-center gap-3">
          <button
            onClick={openAddAccount}
            className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-violet-500/10 py-3.5 px-6 text-sm cursor-pointer transition duration-200"
          >
            <Plus className="h-4 w-4" />
            Link Bank Feed / Account
          </button>
        </div>
      </div>

      {/* Onboarding Checklist Guide */}
      {showGuide && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500 animate-pulse" />
              <h3 className="font-extrabold text-zinc-900 dark:text-white text-sm">Getting Started Checklist</h3>
            </div>
            <button 
              onClick={dismissGuide}
              className="text-xs text-zinc-400 hover:text-zinc-500 transition cursor-pointer"
            >
              Dismiss Guide
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
            
            {/* Step 1: Link Accounts */}
            <div className="flex items-start gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl">
              {hasAccounts ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">1</div>
              )}
              <div>
                <p className={`text-xs font-bold ${hasAccounts ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-white'}`}>Link Accounts</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Link popular accounts (Chase Checking, Amex) to seed data.
                </p>
                {!hasAccounts && (
                  <button 
                    onClick={openAddAccount}
                    className="text-[10px] font-bold text-violet-600 hover:underline mt-1 cursor-pointer"
                  >
                    Link Now →
                  </button>
                )}
              </div>
            </div>

            {/* Step 2: Set Budget Targets */}
            <div className="flex items-start gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl">
              {hasBudgets ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">2</div>
              )}
              <div>
                <p className={`text-xs font-bold ${hasBudgets ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-white'}`}>Set Budget Targets</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Define category spending targets for Zero-Based Budgeting.
                </p>
                {!hasBudgets && (
                  <Link 
                    href="/dashboard/budget"
                    className="text-[10px] font-bold text-violet-600 hover:underline mt-1 inline-block"
                  >
                    Go to Budgets →
                  </Link>
                )}
              </div>
            </div>

            {/* Step 3: Verify Predicted Bills */}
            <div className="flex items-start gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl">
              {recurringRules.length > 0 ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">3</div>
              )}
              <div>
                <p className={`text-xs font-bold ${recurringRules.length > 0 ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-white'}`}>Verify Subscriptions</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Check upcoming autopays and subscription billing alarms.
                </p>
                {recurringRules.length === 0 && (
                  <Link 
                    href="/dashboard/bills"
                    className="text-[10px] font-bold text-violet-600 hover:underline mt-1 inline-block"
                  >
                    Go to Bills →
                  </Link>
                )}
              </div>
            </div>

            {/* Step 4: Add Transactions */}
            <div className="flex items-start gap-3 p-3.5 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/40 dark:border-zinc-800/40 rounded-2xl">
              {hasTransactions ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              ) : (
                <div className="h-5 w-5 rounded-full border-2 border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-400 shrink-0">4</div>
              )}
              <div>
                <p className={`text-xs font-bold ${hasTransactions ? 'text-zinc-400 line-through' : 'text-zinc-900 dark:text-white'}`}>Log First Expense</p>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                  Input a transaction manually or upload statements via CSV.
                </p>
                {!hasTransactions && (
                  <Link 
                    href="/dashboard/transactions"
                    className="text-[10px] font-bold text-violet-600 hover:underline mt-1 inline-block"
                  >
                    Go to Ledger →
                  </Link>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Primary KPI Dash Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
        
        {/* Net Worth Summary */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Net Worth</span>
            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">
              <TrendingUp size={10} />
              Steady
            </span>
          </div>
          <div>
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white">
              {formatCurrency(netWorth, currency)}
            </h2>
            <div className="text-[10px] text-zinc-400 mt-1.5 flex justify-between">
              <span>Assets: {formatCurrency(totalAssets, currency)}</span>
              <span>Debt: {formatCurrency(totalLiabilities, currency)}</span>
            </div>
          </div>
        </div>

        {/* Safe To Spend Discretionary Widget */}
        <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 border border-transparent rounded-3xl p-6 shadow-lg shadow-indigo-500/15 flex flex-col justify-between h-36 text-white relative overflow-hidden">
          <div className="absolute top-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-white/10 blur-xl pointer-events-none" />
          <div className="flex justify-between items-start z-10">
            <span className="text-[10px] font-bold uppercase tracking-wider text-white/70">Safe-to-Spend</span>
            <span className="bg-white/10 text-white rounded-full p-1 border border-white/10">
              <ShieldCheck size={14} />
            </span>
          </div>
          <div className="z-10">
            <h2 className="text-3xl font-black">{formatCurrency(safeToSpend, currency)}</h2>
            <div className="text-[9px] text-white/70 mt-1.5 flex gap-1 items-center">
              <Info size={11} className="shrink-0" />
              <span>Factored upcoming bills ({formatCurrency(upcomingBillsTotal, currency)}) & budgets</span>
            </div>
          </div>
        </div>

        {/* Plaid Feed Status Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between h-36">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Live Accounts Sync</span>
          <div className="space-y-1">
            {hasLinkedAccounts ? (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="font-bold text-zinc-900 dark:text-white text-sm truncate max-w-[180px]">
                    {linkedAccounts.map(a => a.name.split(' ')[0]).join(', ')}
                  </span>
                </div>
                <p className="text-[10px] text-zinc-400 leading-normal">
                  Plaid feeds synced. Click to manage.
                </p>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-zinc-400" />
                  <span className="font-bold text-zinc-500 dark:text-zinc-400 text-sm">No Live Feeds Connected</span>
                </div>
                <button
                  onClick={openAddAccount}
                  className="text-[10px] font-bold text-violet-600 dark:text-violet-400 hover:underline text-left cursor-pointer"
                >
                  Connect Chase or Amex now →
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recharts area NW curve */}
        <NetWorthChart transactions={transactions} accounts={accounts} />

        {/* Recharts monthly Cash Flow bars */}
        <CashFlowChart transactions={transactions} categories={categories} />

      </div>

      {/* Bottom Layout Split: Accounts, Recent Transactions & Bill Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Accounts & Balances Panel */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-extrabold text-zinc-900 dark:text-white">Accounts & Balances</h3>
            <div className="flex items-center gap-2.5">
              <button
                onClick={openAddAccount}
                className="flex items-center gap-0.5 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-500 cursor-pointer"
              >
                <Plus size={14} />
                Link
              </button>
              <span className="text-zinc-300 dark:text-zinc-700">|</span>
              <Link 
                href="/dashboard/accounts"
                className="text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-white"
              >
                View Cards
              </Link>
            </div>
          </div>

          <div className="flex-grow divide-y divide-zinc-100 dark:divide-zinc-800 overflow-y-auto max-h-[320px] pr-1 no-scrollbar">
            {accounts.map(acc => {
              const isCredit = acc.type === 'CREDIT' || acc.type === 'MANUAL_LIABILITY'
              return (
                <Link 
                  key={acc.id} 
                  href={`/dashboard/accounts?id=${acc.id}`}
                  className="py-3.5 flex items-center justify-between text-sm hover:bg-zinc-50 dark:hover:bg-zinc-900/50 rounded-xl px-2 -mx-2 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-800 border border-zinc-200/40 dark:border-zinc-800/40">
                      {getAccountIcon(acc.type)}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold truncate text-zinc-900 dark:text-white">{acc.name}</p>
                      <p className="text-[10px] text-zinc-400 uppercase tracking-wider">{acc.type.replace('_', ' ')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`font-black ${isCredit ? 'text-rose-500' : 'text-zinc-900 dark:text-white'}`}>
                      ${Number(acc.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        {/* Recent Ledger Panel */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-extrabold text-zinc-900 dark:text-white">Recent Transactions</h3>
            <Link 
              href="/dashboard/transactions" 
              className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-500"
            >
              See Ledger
              <ArrowRight size={13} />
            </Link>
          </div>

          <div className="divide-y divide-zinc-100 dark:divide-zinc-800 overflow-y-auto max-h-[320px] pr-1 no-scrollbar">
            {recentTxs.map(tx => {
              const isExpense = Number(tx.amount) < 0
              return (
                <div key={tx.id} className="py-3.5 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-3 min-w-0">
                    <span 
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white text-[10px]"
                      style={{ backgroundColor: tx.categoryColor || '#9ca3af' }}
                    >
                      {tx.merchant ? tx.merchant[0].toUpperCase() : '?'}
                    </span>
                    <div className="min-w-0">
                      <p className="font-bold truncate text-zinc-900 dark:text-white">{tx.merchant}</p>
                      <p className="text-[10px] text-zinc-400">{formatDate(tx.date)} • {tx.accountName}</p>
                    </div>
                  </div>
                  <span className={`font-black ${isExpense ? 'text-zinc-900 dark:text-white' : 'text-emerald-500'}`}>
                    {isExpense ? '-' : '+'}${Math.abs(Number(tx.amount)).toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Bill Alerts & Price Hikes Panel */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <Zap size={16} className="text-violet-500" />
            <h3 className="font-extrabold text-zinc-900 dark:text-white text-sm">Upcoming Bill Alerts</h3>
          </div>

          <div className="space-y-4">
            
            {/* Price Hike Warning alert */}
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-2xl p-4 flex gap-3 text-xs leading-normal">
              <Tv className="h-5 w-5 text-rose-500 shrink-0" />
              <div>
                <p className="font-bold text-rose-600 dark:text-rose-400">Subscription Price Hike Flagged</p>
                <p className="text-zinc-400 mt-1">
                  Netflix subscription billed $15.49 on Chase Checking is predicted to increase to $17.99 next month (+16%).
                </p>
              </div>
            </div>

            {/* Impending bill warning — dynamic */}
            {nextBill ? (
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 rounded-2xl p-4 flex gap-3 text-xs leading-normal">
                <Calendar className="h-5 w-5 text-violet-500 shrink-0" />
                <div>
                  <p className="font-bold text-zinc-900 dark:text-white">Impending Auto-Pay Billing</p>
                  <p className="text-zinc-400 mt-1">
                    {nextBill.name} of ${Math.abs(nextBill.amount).toFixed(2)} to {nextBill.matchingMerchant} auto-pays in {nextBillDays} day{nextBillDays !== 1 ? 's' : ''} ({new Date(nextBill.nextExpectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}).
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-900 rounded-2xl p-4 flex gap-3 text-xs leading-normal">
                <Calendar className="h-5 w-5 text-emerald-500 shrink-0" />
                <div>
                  <p className="font-bold text-zinc-900 dark:text-white">All Clear</p>
                  <p className="text-zinc-400 mt-1">No impending auto-pay charges detected in the next 30 days.</p>
                </div>
              </div>
            )}

            <Link 
              href="/dashboard/bills" 
              className="w-full flex items-center justify-between rounded-xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/40 dark:border-zinc-800/40 py-2.5 px-4 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition duration-200 cursor-pointer"
            >
              <span>View Predicted Bills Calendar</span>
              <ChevronRight size={14} />
            </Link>

          </div>
        </div>

      </div>
    </div>
  )
}
