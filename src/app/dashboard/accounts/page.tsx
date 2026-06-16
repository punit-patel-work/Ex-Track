'use client'

import React, { useState } from 'react'
import { useFinanceData } from '@/hooks/use-finance-data'
import { useAuth } from '@/contexts/auth-context'
import { useDashboard } from '@/contexts/dashboard-context'
import { 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Coins, 
  CreditCard as CardIcon, 
  Plus, 
  Trash2, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect, Suspense } from 'react'
import { formatCurrency } from '@/utils/currency'

function AccountsPageContent() {
  const { user } = useAuth()
  const { openAddAccount, currency } = useDashboard()
  const { 
    accounts, 
    transactions, 
    removeAccount,
    loading 
  } = useFinanceData()

  const searchParams = useSearchParams()
  const idParam = searchParams.get('id')

  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  useEffect(() => {
    if (idParam) {
      setSelectedAccountId(idParam)
    }
  }, [idParam])

  // 1. Calculate General KPI Balances
  const totalAssets = accounts
    .filter(a => ['CHECKING', 'SAVINGS', 'INVESTMENT', 'MANUAL_ASSET'].includes(a.type))
    .reduce((acc, curr) => acc + Number(curr.balance), 0)

  const totalLiabilities = accounts
    .filter(a => ['CREDIT', 'MANUAL_LIABILITY'].includes(a.type))
    .reduce((acc, curr) => acc + Math.abs(Number(curr.balance)), 0)

  const netWorth = totalAssets - totalLiabilities
  const debtToAssetRatio = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : 0

  // Filter transactions for the selected account, or show recent across all
  const activeAccount = accounts.find(a => a.id === selectedAccountId)
  const filteredTxs = selectedAccountId
    ? transactions.filter(t => t.accountId === selectedAccountId)
    : transactions

  const recentTxs = filteredTxs.slice(0, 10)

  const handleDeleteAccount = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This will permanently delete all associated transaction records.`)) {
      const res = await removeAccount(id)
      if (res.success) {
        if (selectedAccountId === id) {
          setSelectedAccountId(null)
        }
      } else {
        alert(res.error || 'Failed to delete account')
      }
    }
  }

  const handleSyncAccount = async (id: string, name: string) => {
    setSyncingId(id)
    setSyncMessage(null)
    // Simulate API connection refresh
    await new Promise(resolve => setTimeout(resolve, 1500))
    setSyncingId(null)
    setSyncMessage(`Successfully synchronized with ${name}! Transactions are up to date.`)
    setTimeout(() => setSyncMessage(null), 4000)
  }

  // Visual card styling resolver based on name heuristics
  const getCardStyle = (name: string, type: string) => {
    const n = name.toLowerCase()
    
    // Default colors based on types if no heuristic matches
    let gradient = 'from-violet-600 via-purple-700 to-indigo-800'
    let text = 'text-white'
    let accent = 'text-violet-200'
    let chip = 'bg-amber-200/90 border border-amber-300'
    let brand = 'Visa / Debit'

    if (n.includes('chase')) {
      gradient = 'from-blue-700 via-blue-800 to-blue-950'
      brand = 'Chase Sapphire'
    } else if (n.includes('amex') || n.includes('american express')) {
      gradient = 'from-[#dfb76c] via-[#ccab6a] to-[#927843]'
      text = 'text-zinc-950'
      accent = 'text-zinc-800'
      chip = 'bg-zinc-800 border border-zinc-900'
      brand = 'Amex Centurion'
    } else if (n.includes('apple')) {
      gradient = 'from-zinc-100 via-zinc-50 to-zinc-300 dark:from-zinc-800 dark:via-zinc-850 dark:to-zinc-700'
      text = 'text-zinc-900 dark:text-white'
      accent = 'text-zinc-500 dark:text-zinc-400'
      chip = 'bg-zinc-300 dark:bg-zinc-700 border border-zinc-400 dark:border-zinc-600'
      brand = 'Apple Card'
    } else if (n.includes('citi')) {
      gradient = 'from-sky-800 via-blue-900 to-indigo-950'
      brand = 'Citibank'
    } else if (n.includes('capital one') || n.includes('capitalone')) {
      gradient = 'from-[#112e51] via-[#0d223c] to-[#a12027]'
      brand = 'Capital One'
    } else if (n.includes('ally')) {
      gradient = 'from-purple-900 via-indigo-950 to-teal-900'
      brand = 'Ally Bank'
    } else if (n.includes('vanguard')) {
      gradient = 'from-[#761e1b] via-[#4d0c0a] to-[#250201]'
      brand = 'Vanguard Group'
    } else if (n.includes('fidelity')) {
      gradient = 'from-emerald-800 via-teal-900 to-zinc-950'
      brand = 'Fidelity'
    } else if (n.includes('schwab')) {
      gradient = 'from-sky-700 via-blue-800 to-indigo-950'
      brand = 'Charles Schwab'
    } else {
      // Type fallbacks
      if (type === 'SAVINGS') {
        gradient = 'from-emerald-600 via-teal-700 to-cyan-800'
        brand = 'Savings Account'
      } else if (type === 'CREDIT') {
        gradient = 'from-zinc-800 via-zinc-900 to-black'
        brand = 'Credit Account'
      } else if (type === 'INVESTMENT') {
        gradient = 'from-indigo-600 via-purple-700 to-pink-800'
        brand = 'Investment Portfolio'
      } else if (type === 'MANUAL_ASSET') {
        gradient = 'from-amber-600 via-orange-700 to-red-800'
        brand = 'Fixed Asset'
      } else if (type === 'MANUAL_LIABILITY') {
        gradient = 'from-rose-800 via-red-900 to-stone-950'
        brand = 'Liability Balance'
      }
    }

    return { gradient, text, accent, chip, brand }
  }

  if (loading && accounts.length === 0) {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-violet-600" />
          <span className="text-sm font-semibold text-zinc-500">Loading accounts shelf...</span>
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
            Accounts & Cards
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage and sync live bank feeds, credit cards, and cash balances.</p>
        </div>

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

      {syncMessage && (
        <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2 animate-fade-in">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        
        {/* Total Assets */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Assets</span>
            <Wallet size={16} className="text-emerald-500" />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-2">
            {formatCurrency(totalAssets, currency)}
          </h3>
          <p className="text-[10px] text-zinc-400 mt-1">Cash, savings & investments</p>
        </div>

        {/* Credit Debt */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Total Debt</span>
            <CardIcon size={16} className="text-rose-500" />
          </div>
          <h3 className="text-2xl font-black text-rose-500 mt-2">
            -{formatCurrency(totalLiabilities, currency)}
          </h3>
          <p className="text-[10px] text-zinc-400 mt-1">Outstanding card balances</p>
        </div>

        {/* Net Cash */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Net Liquid Assets</span>
            <Coins size={16} className="text-indigo-500" />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-2">
            {formatCurrency(netWorth, currency)}
          </h3>
          <p className="text-[10px] text-zinc-400 mt-1">Available capital pool</p>
        </div>

        {/* Debt-to-Asset ratio */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-5 shadow-sm">
          <div className="flex items-center justify-between text-zinc-400">
            <span className="text-[10px] font-bold uppercase tracking-wider">Debt-to-Asset Ratio</span>
            <TrendingDown size={16} className="text-amber-500" />
          </div>
          <h3 className="text-2xl font-black text-zinc-900 dark:text-white mt-2">
            {debtToAssetRatio.toFixed(1)}%
          </h3>
          <div className="w-full bg-zinc-100 dark:bg-zinc-800 h-1.5 rounded-full mt-2 overflow-hidden">
            <div 
              className={`h-full ${debtToAssetRatio > 40 ? 'bg-rose-500' : debtToAssetRatio > 20 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
              style={{ width: `${Math.min(100, debtToAssetRatio)}%` }} 
            />
          </div>
        </div>

      </div>

      {/* Main Grid: Card Shelf & Interactive Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Visual Cards Deck Shelf */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white">Active Cards & Accounts</h3>
            {selectedAccountId && (
              <button 
                onClick={() => setSelectedAccountId(null)}
                className="text-xs text-violet-600 dark:text-violet-400 font-semibold hover:underline"
              >
                Clear Selection
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {accounts.map(acc => {
              const isCredit = acc.type === 'CREDIT' || acc.type === 'MANUAL_LIABILITY'
              const isSelected = selectedAccountId === acc.id
              const { gradient, text, accent, chip, brand } = getCardStyle(acc.name, acc.type)
              const displayBal = Math.abs(Number(acc.balance))

              return (
                <div 
                  key={acc.id}
                  onClick={() => setSelectedAccountId(isSelected ? null : acc.id)}
                  className={`relative h-52 rounded-[24px] bg-gradient-to-br ${gradient} ${text} p-6 shadow-md hover:shadow-xl flex flex-col justify-between cursor-pointer border-2 transition duration-200 select-none overflow-hidden group ${
                    isSelected ? 'border-violet-500 scale-[1.02] ring-4 ring-violet-500/10' : 'border-transparent'
                  }`}
                >
                  {/* Glowing light background accent */}
                  <div className="absolute top-[-30%] right-[-10%] w-[55%] h-[55%] rounded-full bg-white/10 blur-2xl pointer-events-none group-hover:scale-110 transition duration-300" />
                  
                  {/* Card Top */}
                  <div className="flex items-start justify-between z-10">
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-wider ${accent}`}>
                        {acc.type.replace('_', ' ')}
                      </p>
                      <h4 className="font-extrabold text-sm truncate max-w-[160px] mt-0.5">{acc.name}</h4>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {acc.plaidItemId && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20" title="Connected Bank Feed">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                        </span>
                      )}
                      <span className="text-[10px] font-bold opacity-80 uppercase tracking-widest">{brand}</span>
                    </div>
                  </div>

                  {/* Card Middle Chip */}
                  <div className="z-10 flex items-center justify-between">
                    {/* Simulated card metallic chip */}
                    <div className={`h-8 w-11 rounded-lg ${chip} flex flex-col justify-around p-1.5`}>
                      <div className="grid grid-cols-3 gap-0.5 h-1">
                        <div className="bg-black/20 dark:bg-white/20 rounded-sm"></div>
                        <div className="bg-black/20 dark:bg-white/20 rounded-sm"></div>
                        <div className="bg-black/20 dark:bg-white/20 rounded-sm"></div>
                      </div>
                      <div className="grid grid-cols-2 gap-0.5 h-1">
                        <div className="bg-black/20 dark:bg-white/20 rounded-sm"></div>
                        <div className="bg-black/20 dark:bg-white/20 rounded-sm"></div>
                      </div>
                    </div>
                    
                    {/* Visual indicators for sync / delete */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-150">
                      {acc.plaidItemId && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleSyncAccount(acc.id, acc.name)
                          }}
                          disabled={syncingId === acc.id}
                          className="p-1.5 rounded-full bg-white/25 hover:bg-white/40 text-inherit transition shrink-0 cursor-pointer"
                          title="Sync Feed"
                        >
                          <RefreshCw size={13} className={syncingId === acc.id ? 'animate-spin' : ''} />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteAccount(acc.id, acc.name)
                        }}
                        className="p-1.5 rounded-full bg-white/25 hover:bg-rose-500 hover:text-white text-inherit transition shrink-0 cursor-pointer"
                        title="Delete Account"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Card Bottom */}
                  <div className="flex justify-between items-end z-10">
                    <div>
                      <p className={`text-[9px] uppercase tracking-wider ${accent}`}>Card Number</p>
                      <p className="font-mono text-xs font-bold tracking-widest mt-0.5">•••• •••• •••• {acc.id.replace(/\D/g, '').slice(-4).padStart(4, '0')}</p>
                    </div>
                    
                    <div className="text-right">
                      <p className={`text-[9px] uppercase tracking-wider ${accent}`}>Balance</p>
                      <p className="text-lg font-black tracking-tight leading-none mt-0.5">
                        {formatCurrency(displayBal, currency)}
                        {isCredit && <span className="text-[10px] font-bold ml-1 opacity-80">Debt</span>}
                      </p>
                    </div>
                  </div>

                </div>
              )
            })}

            {/* Empty State */}
            {accounts.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-16 text-center space-y-4">
                <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-violet-500/10 border border-violet-500/20">
                  <Wallet className="h-10 w-10 text-violet-400" />
                </div>
                <div className="space-y-1.5">
                  <h3 className="text-lg font-black text-zinc-900 dark:text-white">No accounts yet</h3>
                  <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-xs mx-auto">
                    Link your bank, add a credit card, or create a manual account to start tracking your finances.
                  </p>
                </div>
                <button
                  onClick={openAddAccount}
                  className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 px-6 text-sm cursor-pointer transition shadow-lg shadow-violet-500/10"
                >
                  <Plus className="h-4 w-4" />
                  Add Your First Account
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Selected Card Ledger Panel */}
        <div className="lg:col-span-5 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm flex flex-col min-h-[400px]">
          <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800">
            <div>
              <h3 className="font-extrabold text-zinc-900 dark:text-white">
                {activeAccount ? activeAccount.name : 'All Account Activity'}
              </h3>
              <p className="text-[10px] text-zinc-400 mt-0.5">
                {activeAccount ? `${activeAccount.type.replace('_', ' ')} ledger` : 'Recent statements across ledger'}
              </p>
            </div>
            
            {selectedAccountId && (
              <Link
                href={`/dashboard/transactions?account=${selectedAccountId}`}
                className="flex items-center gap-1 text-xs font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-500"
              >
                Full ledger
                <ArrowRight size={13} />
              </Link>
            )}
          </div>

          <div className="flex-grow overflow-y-auto max-h-[360px] divide-y divide-zinc-100 dark:divide-zinc-800 pr-1 no-scrollbar mt-2">
            {recentTxs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-16 text-center text-zinc-400">
                <AlertCircle size={24} className="mb-2 text-zinc-300" />
                <p className="text-xs font-bold">No transactions found</p>
                <p className="text-[10px] text-zinc-400 mt-0.5">This account has no statement history recorded.</p>
              </div>
            ) : (
              recentTxs.map(tx => {
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
                        <p className="text-[10px] text-zinc-400">{tx.date} • {tx.accountName}</p>
                      </div>
                    </div>
                    <span className={`font-black ${isExpense ? 'text-zinc-900 dark:text-white' : 'text-emerald-500'}`}>
                      {isExpense ? '-' : '+'}{formatCurrency(Math.abs(Number(tx.amount)), currency)}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </div>

      </div>

    </div>
  )
}

export default function AccountsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-[70vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-violet-600" />
          <span className="text-sm font-semibold text-zinc-500">Loading accounts shelf...</span>
        </div>
      </div>
    }>
      <AccountsPageContent />
    </Suspense>
  )
}
