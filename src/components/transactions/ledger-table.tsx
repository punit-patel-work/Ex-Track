'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useFinanceData } from '@/hooks/use-finance-data'
import { MockTransaction } from '@/utils/local-storage-db'
import { useSearchParams } from 'next/navigation'
import { useDashboard } from '@/contexts/dashboard-context'
import { formatCurrency } from '@/utils/currency'
import { 
  Search, 
  ArrowUpDown, 
  ChevronLeft, 
  ChevronRight, 
  Tag as TagIcon, 
  CheckSquare, 
  Square,
  Sparkles,
  Inbox,
  Edit,
  Trash
} from 'lucide-react'

interface LedgerTableProps {
  onSelectTransaction: (tx: MockTransaction) => void
  selectedTransactionId?: string
}

type SortField = 'date' | 'merchant' | 'category' | 'amount'
type SortOrder = 'asc' | 'desc'

export default function LedgerTable({ onSelectTransaction, selectedTransactionId }: LedgerTableProps) {
  const { transactions, categories, accounts, editTransaction, removeTransaction } = useFinanceData()
  const { currency } = useDashboard()
  const searchParams = useSearchParams()
  const accountParam = searchParams.get('account') || ''
  
  // Filtering & Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [filterAccount, setFilterAccount] = useState(accountParam)
  const [filterCategory, setFilterCategory] = useState('')
  const [selectedTag, setSelectedTag] = useState('')

  useEffect(() => {
    if (accountParam) {
      setFilterAccount(accountParam)
    }
  }, [accountParam])
  
  // Keyboard reference to search bar
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('date')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  // Batch action selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [batchCategory, setBatchCategory] = useState('')

  // Bind keyboard search focus
  useEffect(() => {
    const handleSearchShortcut = (e: KeyboardEvent) => {
      // Focus search if user presses '/' or 'S' (case insensitive), provided no input is focused
      const activeElement = document.activeElement?.tagName.toLowerCase()
      const isInputFocused = activeElement === 'input' || activeElement === 'select' || activeElement === 'textarea'
      
      if (!isInputFocused && (e.key === '/' || e.key.toLowerCase() === 's')) {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }

    window.addEventListener('keydown', handleSearchShortcut)
    return () => window.removeEventListener('keydown', handleSearchShortcut)
  }, [])

  // Filter transaction records
  const filteredTxs = transactions.filter(tx => {
    const matchesSearch = 
      tx.merchant.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))

    const matchesAccount = !filterAccount || tx.accountId === filterAccount
    const matchesCategory = !filterCategory || tx.categoryId === filterCategory
    const matchesTag = !selectedTag || tx.tags.includes(selectedTag)

    return matchesSearch && matchesAccount && matchesCategory && matchesTag
  })

  // Sort transaction records
  const sortedTxs = [...filteredTxs].sort((a, b) => {
    let aVal: any = (a as any)[sortField] || ''
    let bVal: any = (b as any)[sortField] || ''

    if (sortField === 'category') {
      aVal = a.categoryName || ''
      bVal = b.categoryName || ''
    } else if (sortField === 'amount') {
      aVal = Number(a.amount)
      bVal = Number(b.amount)
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1
    return 0
  })

  // Paginated records
  const totalPages = Math.ceil(sortedTxs.length / itemsPerPage) || 1
  const paginatedTxs = sortedTxs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
    setCurrentPage(1)
  }

  // Row selection helpers
  const handleSelectRow = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    )
  }

  const handleSelectAllRows = () => {
    const paginatedIds = paginatedTxs.map(t => t.id)
    const allSelected = paginatedIds.every(id => selectedIds.includes(id))
    
    if (allSelected) {
      // Deselect all on this page
      setSelectedIds(prev => prev.filter(id => !paginatedIds.includes(id)))
    } else {
      // Select all on this page
      setSelectedIds(prev => [...new Set([...prev, ...paginatedIds])])
    }
  }

  // Batch actions
  const handleBatchCategorize = async (catId: string) => {
    if (!catId || selectedIds.length === 0) return
    
    for (const id of selectedIds) {
      await editTransaction(id, { categoryId: catId })
    }
    
    setSelectedIds([])
    setBatchCategory('')
  }

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return
    if (!confirm(`Are you sure you want to delete ${selectedIds.length} transactions?`)) return

    for (const id of selectedIds) {
      await removeTransaction(id)
    }
    setSelectedIds([])
  }

  // Extract unique tags for filtering buttons
  const allTags = Array.from(
    new Set(transactions.flatMap(tx => tx.tags))
  ).slice(0, 8)

  return (
    <div className="flex-1 flex flex-col space-y-6 min-w-0">
      
      {/* Search and filters bar */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          
          {/* Fuzzy Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-400" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search merchants, tags, memos... (Press '/' to focus)"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 py-2.5 pl-10 pr-4 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
            />
          </div>

          {/* Account Filter */}
          <div>
            <select
              value={filterAccount}
              onChange={(e) => {
                setFilterAccount(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="">All Accounts</option>
              {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value)
                setCurrentPage(1)
              }}
              className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white cursor-pointer focus:outline-none focus:ring-1 focus:ring-violet-500"
            >
              <option value="">All Categories</option>
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

        {/* Quick Tag Pills */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mr-2">Quick Tags:</span>
            <button
              onClick={() => setSelectedTag('')}
              className={`rounded-full px-3 py-1 text-xs font-semibold border transition cursor-pointer ${
                !selectedTag 
                  ? 'bg-violet-600 text-white border-transparent' 
                  : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              All
            </button>
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)}
                className={`rounded-full px-3 py-1 text-xs font-semibold border transition cursor-pointer flex items-center gap-1 ${
                  tag === selectedTag 
                    ? 'bg-violet-600 text-white border-transparent' 
                    : 'bg-zinc-50 dark:bg-zinc-950 text-zinc-500 border-zinc-200 dark:border-zinc-800 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <TagIcon size={10} />
                #{tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Main Table Container */}
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl overflow-hidden shadow-sm relative">
        
        {/* Desktop View */}
        <div className="hidden md:block overflow-x-auto">
          {paginatedTxs.length === 0 ? (
            <div className="py-24 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-800 text-zinc-400">
                <Inbox size={22} />
              </div>
              <div>
                <h4 className="font-bold text-lg text-zinc-900 dark:text-white">No transactions found</h4>
                <p className="text-xs text-zinc-400 mt-1">Try updating your filters or search criteria.</p>
              </div>
            </div>
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-50/50 dark:bg-zinc-900/50 border-b border-zinc-100 dark:border-zinc-800 text-xs font-bold uppercase tracking-wider text-zinc-400 select-none">
                <tr>
                  <th className="p-4 w-12 text-center">
                    <button 
                      onClick={handleSelectAllRows}
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                    >
                      {paginatedTxs.every(t => selectedIds.includes(t.id)) ? (
                        <CheckSquare className="h-4 w-4 text-violet-500" />
                      ) : (
                        <Square className="h-4 w-4" />
                      )}
                    </button>
                  </th>
                  <th onClick={() => handleSort('date')} className="p-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition">
                    <div className="flex items-center gap-1.5">
                      Date
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('merchant')} className="p-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition">
                    <div className="flex items-center gap-1.5">
                      Merchant
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th onClick={() => handleSort('category')} className="p-4 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition">
                    <div className="flex items-center gap-1.5">
                      Category
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                  <th className="p-4">Account</th>
                  <th onClick={() => handleSort('amount')} className="p-4 text-right cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800/40 transition">
                    <div className="flex items-center justify-end gap-1.5">
                      Amount
                      <ArrowUpDown size={12} />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 bg-white dark:bg-zinc-900">
                {paginatedTxs.map((tx) => {
                  const isExpense = Number(tx.amount) < 0
                  const displayAmt = Math.abs(Number(tx.amount)).toFixed(2)
                  const isSelected = selectedIds.includes(tx.id)
                  const isActiveDetail = selectedTransactionId === tx.id

                  return (
                    <tr 
                      key={tx.id} 
                      className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-950/20 transition cursor-pointer group ${
                        isActiveDetail ? 'bg-violet-500/[0.03] text-violet-600 dark:text-violet-400' : ''
                      } ${isSelected ? 'bg-violet-500/[0.02]' : ''}`}
                    >
                      <td className="p-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => handleSelectRow(tx.id)}
                          className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4 text-violet-500" />
                          ) : (
                            <Square className="h-4 w-4 group-hover:opacity-100 opacity-60" />
                          )}
                        </button>
                      </td>
                      <td className="p-4 font-semibold text-xs text-zinc-500" onClick={() => onSelectTransaction(tx)}>
                        {tx.date}
                      </td>
                      <td className="p-4 font-bold text-zinc-900 dark:text-white" onClick={() => onSelectTransaction(tx)}>
                        <div className="flex flex-col">
                          <span>{tx.merchant}</span>
                          {tx.description && tx.description !== tx.merchant && (
                            <span className="text-xs font-medium text-zinc-400">{tx.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4" onClick={() => onSelectTransaction(tx)}>
                        <span 
                          className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
                          style={{ 
                            backgroundColor: (tx.categoryColor || '#9ca3af') + '15',
                            color: tx.categoryColor || '#9ca3af'
                          }}
                        >
                          <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: tx.categoryColor || '#9ca3af' }} />
                          {tx.categoryName}
                        </span>
                      </td>
                      <td className="p-4 font-medium text-zinc-500" onClick={() => onSelectTransaction(tx)}>
                        {tx.accountName}
                      </td>
                      <td className="p-4 text-right" onClick={() => onSelectTransaction(tx)}>
                        <span className={`font-black ${isExpense ? 'text-zinc-900 dark:text-white' : 'text-emerald-500'}`}>
                          {isExpense ? '-' : '+'}{formatCurrency(Math.abs(Number(tx.amount)), currency)}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Mobile Swipeable Card Layout */}
        <div className="md:hidden divide-y divide-zinc-100 dark:divide-zinc-800">
          {paginatedTxs.length === 0 ? (
            <div className="py-16 text-center space-y-3">
              <Inbox size={22} className="mx-auto text-zinc-400" />
              <h4 className="font-bold text-sm text-zinc-900 dark:text-white">No transactions found</h4>
            </div>
          ) : (
            paginatedTxs.map((tx) => {
              const isExpense = Number(tx.amount) < 0
              const displayAmt = Math.abs(Number(tx.amount)).toFixed(2)
              const merchantInitial = tx.merchant ? tx.merchant[0].toUpperCase() : '?'
              const isSelected = selectedTransactionId === tx.id

              return (
                <div
                  key={tx.id}
                  onClick={() => onSelectTransaction(tx)}
                  className={`p-4 flex items-center justify-between active:bg-zinc-50 dark:active:bg-zinc-900 cursor-pointer transition ${
                    isSelected ? 'bg-violet-500/[0.03]' : 'bg-white dark:bg-zinc-900'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white font-bold shadow-sm"
                      style={{ backgroundColor: tx.categoryColor || '#8b5cf6' }}
                    >
                      {merchantInitial}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm truncate text-zinc-900 dark:text-white">{tx.merchant}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-semibold text-zinc-400">{tx.date}</span>
                        <span className="h-1 w-1 rounded-full bg-zinc-300 dark:bg-zinc-700" />
                        <span className="text-[10px] font-semibold truncate max-w-[100px]" style={{ color: tx.categoryColor || '#9ca3af' }}>
                          {tx.categoryName}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right ml-4">
                    <p className={`font-black text-sm ${isExpense ? 'text-zinc-900 dark:text-white' : 'text-emerald-500'}`}>
                      {isExpense ? '-' : '+'}{formatCurrency(Math.abs(Number(tx.amount)), currency)}
                    </p>
                    <p className="text-[10px] font-semibold text-zinc-400 mt-0.5">{tx.accountName}</p>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Table Footer / Pagination */}
        {sortedTxs.length > 0 && (
          <div className="border-t border-zinc-100 dark:border-zinc-800 p-4 bg-zinc-50/50 dark:bg-zinc-900/10 flex items-center justify-between text-xs font-semibold text-zinc-400 select-none">
            <span className="hidden sm:inline">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, sortedTxs.length)} of {sortedTxs.length} items
            </span>
            <span className="sm:hidden">
              Page {currentPage} of {totalPages}
            </span>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-900 dark:hover:text-white transition disabled:opacity-40 cursor-pointer"
              >
                <ChevronLeft size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-850 hover:text-zinc-900 dark:hover:text-white transition disabled:opacity-40 cursor-pointer"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Batch Action Bar Overlay */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-xl bg-slate-900 border border-zinc-800 text-white rounded-2xl px-6 py-4 shadow-xl flex flex-wrap items-center justify-between gap-4 animate-slide-up">
          <div className="flex items-center gap-2">
            <CheckSquare className="h-5 w-5 text-violet-400 shrink-0" />
            <span className="text-sm font-bold">{selectedIds.length} Selected</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Batch Categorization Selector */}
            <select
              value={batchCategory}
              onChange={(e) => handleBatchCategorize(e.target.value)}
              className="rounded-xl bg-zinc-800 border border-zinc-700 py-1.5 px-3 text-xs text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
            >
              <option value="">Bulk Categorize...</option>
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

            <button
              onClick={handleBatchDelete}
              className="flex items-center gap-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 py-2 px-4 text-xs font-semibold transition cursor-pointer"
            >
              <Trash size={12} />
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-zinc-400 hover:text-white cursor-pointer"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
