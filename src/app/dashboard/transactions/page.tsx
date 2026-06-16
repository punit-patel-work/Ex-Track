'use client'

import React, { useState, Suspense } from 'react'
import LedgerTable from '@/components/transactions/ledger-table'
import DetailsPanel from '@/components/transactions/details-panel'
import CSVImporter from '@/components/transactions/csv-importer'
import { MockTransaction } from '@/utils/local-storage-db'
import { Receipt, FileSpreadsheet, Plus, HelpCircle, RefreshCw } from 'lucide-react'
import { useDashboard } from '@/contexts/dashboard-context'

export default function TransactionsPage() {
  const { openQuickAdd } = useDashboard()
  const [selectedTx, setSelectedTx] = useState<MockTransaction | null>(null)
  const [isCsvImporting, setIsCsvImporting] = useState(false)

  const handleSelectTransaction = (tx: MockTransaction) => {
    // Toggle selector if already active
    if (selectedTx?.id === tx.id) {
      setSelectedTx(null)
    } else {
      setSelectedTx(tx)
    }
  }

  return (
    <div className="flex flex-col h-full space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">Ledger</h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Review your statements, categorize transactions, and import statements.</p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCsvImporting(true)}
            className="flex items-center justify-center gap-1.5 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 py-3 px-4 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-850 hover:text-zinc-950 dark:hover:text-white transition duration-200 cursor-pointer shadow-sm"
          >
            <FileSpreadsheet size={15} />
            Import CSV
          </button>
          
          <button
            onClick={openQuickAdd}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-violet-500/10 py-3 px-4 text-xs cursor-pointer transition"
          >
            <Plus size={15} />
            New Transaction
          </button>
        </div>
      </div>

      {/* Main Ledger Split Layout */}
      <div className="flex-1 flex flex-col md:flex-row gap-6 items-start">
        
        {/* Table Ledger Panel with Suspense */}
        <Suspense fallback={
          <div className="flex-1 flex items-center justify-center p-12 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-[32px] min-h-[400px]">
            <div className="flex flex-col items-center gap-3">
              <RefreshCw className="h-6 w-6 animate-spin text-violet-600" />
              <span className="text-xs text-zinc-400 font-semibold">Loading transaction ledger...</span>
            </div>
          </div>
        }>
          <LedgerTable 
            onSelectTransaction={handleSelectTransaction} 
            selectedTransactionId={selectedTx?.id} 
          />
        </Suspense>

        {/* Context Details Side Panel */}
        {selectedTx && (
          <DetailsPanel 
            transaction={selectedTx} 
            onClose={() => setSelectedTx(null)} 
          />
        )}

      </div>

      {/* CSV Importer Modal */}
      {isCsvImporting && (
        <CSVImporter onClose={() => setIsCsvImporting(false)} />
      )}

    </div>
  )
}
