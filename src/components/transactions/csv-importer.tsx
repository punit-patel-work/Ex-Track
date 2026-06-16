'use client'

import React, { useState, useRef } from 'react'
import { useFinanceData } from '@/hooks/use-finance-data'
import { Upload, HelpCircle, Check, ArrowRight, AlertTriangle, Play, RefreshCw, X } from 'lucide-react'

interface CSVRow {
  [key: string]: string
}

interface MappedTransaction {
  date: string
  merchant: string
  amount: number
  description: string
  categoryId: string
  accountId: string
  tags: string[]
}

export default function CSVImporter({ onClose }: { onClose: () => void }) {
  const { accounts, categories, addTransaction } = useFinanceData()
  const [step, setStep] = useState<1 | 2 | 3>(1) // 1: Upload, 2: Map, 3: Preview/Staging
  const [csvHeaders, setCsvHeaders] = useState<string[]>([])
  const [csvRows, setCsvRows] = useState<CSVRow[]>([])
  const [selectedAccount, setSelectedAccount] = useState('')

  // Mapping state: maps system fields to CSV headers
  const [mapping, setMapping] = useState({
    date: '',
    merchant: '',
    amount: '',
    description: '',
  })

  // Staging state
  const [stagedTransactions, setStagedTransactions] = useState<MappedTransaction[]>([])
  const [selectedRows, setSelectedRows] = useState<boolean[]>([])
  const [importing, setImporting] = useState(false)
  const [importResults, setImportResults] = useState<{ success: number; failed: number } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // Initialize selected account
  React.useEffect(() => {
    if (accounts.length > 0 && !selectedAccount) {
      setSelectedAccount(accounts[0].id)
    }
  }, [accounts, selectedAccount])

  // Simple CSV Parser (handles double quotes and commas)
  const parseCSV = (text: string) => {
    const lines: string[][] = []
    let row: string[] = []
    let inQuotes = false
    let currentField = ''

    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const nextChar = text[i + 1]

      if (char === '"') {
        inQuotes = !inQuotes
      } else if (char === ',' && !inQuotes) {
        row.push(currentField.trim())
        currentField = ''
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++ // Skip double line endings
        row.push(currentField.trim())
        if (row.some(field => field !== '')) {
          lines.push(row)
        }
        row = []
        currentField = ''
      } else {
        currentField += char
      }
    }
    // Push remaining
    if (currentField || row.length > 0) {
      row.push(currentField.trim())
      lines.push(row)
    }

    if (lines.length < 2) return

    const headers = lines[0]
    const parsedRows = lines.slice(1).map(line => {
      const rowObj: CSVRow = {}
      headers.forEach((header, index) => {
        rowObj[header] = line[index] || ''
      })
      return rowObj
    })

    setCsvHeaders(headers)
    setCsvRows(parsedRows)
    autoMapHeaders(headers)
    setStep(2)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(file)
  }

  const loadSampleCSV = () => {
    const sampleText = `Transaction Date,Payee Description,Amount Charged,Memo
2026-06-01,Uber Trip,24.50,Late night taxi
2026-06-02,Starbucks Coffee,5.85,Cappuccino
2026-06-03,Whole Foods Market,114.20,Weekly groceries
2026-06-04,Netflix.com,15.49,Monthly subscription
2026-06-05,Employer Direct Deposit,-2500.00,Semi-monthly salary`
    parseCSV(sampleText)
  }

  // Guess mappings based on header name keywords
  const autoMapHeaders = (headers: string[]) => {
    const newMapping = { date: '', merchant: '', amount: '', description: '' }
    headers.forEach(h => {
      const lower = h.toLowerCase()
      if (lower.includes('date')) newMapping.date = h
      else if (lower.includes('merchant') || lower.includes('payee') || lower.includes('desc') || lower.includes('name')) newMapping.merchant = h
      else if (lower.includes('amount') || lower.includes('charge') || lower.includes('price') || lower.includes('value')) newMapping.amount = h
      else if (lower.includes('memo') || lower.includes('note') || lower.includes('info') || lower.includes('description')) newMapping.description = h
    })
    
    // Fallback if empty
    if (!newMapping.description && newMapping.merchant) newMapping.description = newMapping.merchant
    setMapping(newMapping)
  }

  const handleCreateStaging = () => {
    // Generate mapped transactions
    const mapped: MappedTransaction[] = csvRows.map(row => {
      // Clean amount: strip $ or commas, check signs. 
      // Note: standard bank exports represent expenses as negative, but some cards show charges as positive.
      // We assume standard: negative = expenses (outflow), positive = deposits (inflow).
      let cleanAmount = row[mapping.amount]?.replace(/[$\s,]/g, '') || '0'
      let numAmount = parseFloat(cleanAmount)
      
      // If bank export shows expenses as positive numbers, we invert them if the description or standard card rules apply
      // Let's keep it direct: if numeric, map it.
      
      return {
        date: row[mapping.date] || new Date().toISOString().split('T')[0],
        merchant: row[mapping.merchant] || 'Unknown Merchant',
        amount: isNaN(numAmount) ? 0 : numAmount,
        description: row[mapping.description] || row[mapping.merchant] || 'Imported Transaction',
        categoryId: '', // Manual / auto-matched in staging
        accountId: selectedAccount,
        tags: ['imported'],
      }
    })

    // Auto classify categories
    const childCategories = categories.filter(c => c.parentId !== null)
    const classified = mapped.map(tx => {
      const desc = tx.merchant.toLowerCase()
      let catId = ''
      
      if (desc.includes('uber') || desc.includes('lyft') || desc.includes('transit')) {
        catId = childCategories.find(c => c.name.toLowerCase().includes('uber') || c.name.toLowerCase().includes('transit'))?.id || ''
      } else if (desc.includes('food') || desc.includes('grocery') || desc.includes('whole foods') || desc.includes('walmart')) {
        catId = childCategories.find(c => c.name.toLowerCase().includes('groceries'))?.id || ''
      } else if (desc.includes('coffee') || desc.includes('starbucks') || desc.includes('restaurant') || desc.includes('dining')) {
        catId = childCategories.find(c => c.name.toLowerCase().includes('restaurants'))?.id || ''
      } else if (desc.includes('netflix') || desc.includes('spotify') || desc.includes('subscription')) {
        catId = childCategories.find(c => c.name.toLowerCase().includes('subscriptions'))?.id || ''
      } else if (desc.includes('salary') || desc.includes('employer') || desc.includes('paycheck')) {
        catId = childCategories.find(c => c.name.toLowerCase().includes('salary'))?.id || ''
      }
      
      return { ...tx, categoryId: catId }
    })

    setStagedTransactions(classified)
    setSelectedRows(new Array(classified.length).fill(true))
    setStep(3)
  }

  const handleImport = async () => {
    setImporting(true)
    let success = 0
    let failed = 0

    for (let i = 0; i < stagedTransactions.length; i++) {
      if (!selectedRows[i]) continue

      const tx = stagedTransactions[i]
      const res = await addTransaction({
        accountId: tx.accountId,
        categoryId: tx.categoryId || null,
        amount: tx.amount,
        date: tx.date,
        description: tx.description,
        merchant: tx.merchant,
        tags: tx.tags,
        pendingStatus: false,
      })

      if (res.success) success++
      else failed++
    }

    setImportResults({ success, failed })
    setImporting(false)
  }

  const toggleRow = (index: number) => {
    const next = [...selectedRows]
    next[index] = !next[index]
    setSelectedRows(next)
  }

  const toggleAllRows = () => {
    const allSelected = selectedRows.every(r => r)
    setSelectedRows(new Array(selectedRows.length).fill(!allSelected))
  }

  const updateStagedRow = (index: number, field: keyof MappedTransaction, value: any) => {
    const next = [...stagedTransactions]
    next[index] = { ...next[index], [field]: value }
    setStagedTransactions(next)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="w-full max-w-4xl rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 p-6">
          <div>
            <h3 className="text-lg font-bold">Import Transactions CSV</h3>
            <p className="text-xs text-zinc-500">Upload any bank or credit card statements to bulk import transactions.</p>
          </div>
          <button 
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-950 dark:hover:text-white transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          
          {/* STEP 1: Upload */}
          {step === 1 && (
            <div className="space-y-6">
              <div className="space-y-2 max-w-md">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Target Bank Account</label>
                <select
                  value={selectedAccount}
                  onChange={(e) => setSelectedAccount(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                >
                  {accounts.map(acc => (
                    <option key={acc.id} value={acc.id}>{acc.name} (${Number(acc.balance).toFixed(2)})</option>
                  ))}
                </select>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-3xl p-12 text-center hover:border-violet-500 dark:hover:border-violet-500 transition duration-200 cursor-pointer group bg-zinc-50/50 dark:bg-zinc-900/10 space-y-4"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  accept=".csv" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400 group-hover:scale-105 transition duration-200">
                  <Upload size={24} />
                </div>
                <div>
                  <p className="font-bold text-zinc-800 dark:text-zinc-200">Drag & Drop statement file here</p>
                  <p className="text-xs text-zinc-400 mt-1">Accepts standard .csv table formats</p>
                </div>
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={loadSampleCSV}
                  className="flex items-center gap-1.5 text-sm font-semibold text-violet-600 dark:text-violet-400 hover:text-violet-500 cursor-pointer"
                >
                  <Play size={14} />
                  Load Sandbox Sample Statement
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Map Fields */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-4 flex gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-600 dark:text-amber-400 leading-relaxed">
                  <strong>Verify CSV Column Mapping:</strong> We detected headers from your CSV. Map them to matching transaction ledger fields. Leave optional fields if they don&apos;t apply.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Transaction Date <span className="text-rose-500">*</span></label>
                    <select
                      value={mapping.date}
                      onChange={(e) => setMapping({...mapping, date: e.target.value})}
                      className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-3.5 text-sm text-zinc-900 dark:text-white"
                    >
                      <option value="">Select column...</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Merchant / Payee Name <span className="text-rose-500">*</span></label>
                    <select
                      value={mapping.merchant}
                      onChange={(e) => setMapping({...mapping, merchant: e.target.value})}
                      className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-3.5 text-sm text-zinc-900 dark:text-white"
                    >
                      <option value="">Select column...</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Amount Charged / Paid <span className="text-rose-500">*</span></label>
                    <select
                      value={mapping.amount}
                      onChange={(e) => setMapping({...mapping, amount: e.target.value})}
                      className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-3.5 text-sm text-zinc-900 dark:text-white"
                    >
                      <option value="">Select column...</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Memo / Description (Optional)</label>
                    <select
                      value={mapping.description}
                      onChange={(e) => setMapping({...mapping, description: e.target.value})}
                      className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-3.5 text-sm text-zinc-900 dark:text-white"
                    >
                      <option value="">Select column...</option>
                      {csvHeaders.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-900 pt-6">
                <button
                  onClick={() => setStep(1)}
                  className="rounded-2xl border border-zinc-200 dark:border-zinc-800 px-6 py-3 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                >
                  Back
                </button>
                <button
                  onClick={handleCreateStaging}
                  disabled={!mapping.date || !mapping.merchant || !mapping.amount}
                  className="rounded-2xl bg-violet-600 hover:bg-violet-500 text-white px-6 py-3 text-sm font-semibold shadow-md shadow-violet-500/10 cursor-pointer disabled:opacity-50"
                >
                  Configure Preview
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Preview and Edit Staged Transactions */}
          {step === 3 && (
            <div className="space-y-6">
              {importResults ? (
                <div className="rounded-2xl bg-violet-500/10 border border-violet-500/20 p-6 text-center space-y-4 max-w-md mx-auto">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 dark:bg-violet-950 text-violet-600 dark:text-violet-400">
                    <Check size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Import Complete!</h4>
                    <p className="text-sm text-zinc-500 mt-1">
                      Imported {importResults.success} transactions successfully. Failed: {importResults.failed}.
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold py-2.5 cursor-pointer text-sm"
                  >
                    Go back to Ledger
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex justify-between items-center text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                    <span>Staging Area ({stagedTransactions.filter((_, idx) => selectedRows[idx]).length} / {stagedTransactions.length} Selected)</span>
                    <button onClick={toggleAllRows} className="text-violet-600 dark:text-violet-400 hover:underline cursor-pointer">
                      {selectedRows.every(r => r) ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <div className="border border-zinc-200 dark:border-zinc-800 rounded-3xl overflow-hidden max-h-[40vh] overflow-y-auto no-scrollbar">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                        <tr>
                          <th className="p-4 w-12"><input type="checkbox" checked={selectedRows.every(r => r)} onChange={toggleAllRows} className="cursor-pointer" /></th>
                          <th className="p-4">Date</th>
                          <th className="p-4">Merchant</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800 bg-white dark:bg-zinc-950">
                        {stagedTransactions.map((tx, idx) => (
                          <tr key={idx} className={`hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30 ${!selectedRows[idx] ? 'opacity-40' : ''}`}>
                            <td className="p-4">
                              <input 
                                type="checkbox" 
                                checked={selectedRows[idx]} 
                                onChange={() => toggleRow(idx)} 
                                className="cursor-pointer"
                              />
                            </td>
                            <td className="p-3">
                              <input 
                                type="date" 
                                value={tx.date} 
                                onChange={(e) => updateStagedRow(idx, 'date', e.target.value)}
                                className="bg-transparent border-0 border-b border-transparent focus:border-violet-500 py-1 text-xs outline-none focus:ring-0 w-28 cursor-pointer"
                              />
                            </td>
                            <td className="p-3">
                              <input 
                                type="text" 
                                value={tx.merchant} 
                                onChange={(e) => updateStagedRow(idx, 'merchant', e.target.value)}
                                className="bg-transparent border-0 border-b border-transparent focus:border-violet-500 py-1 text-xs outline-none focus:ring-0 w-full"
                              />
                            </td>
                            <td className="p-3">
                              <select
                                value={tx.categoryId}
                                onChange={(e) => updateStagedRow(idx, 'categoryId', e.target.value)}
                                className="bg-transparent border-0 border-b border-transparent focus:border-violet-500 py-1 text-xs outline-none focus:ring-0 w-full cursor-pointer"
                              >
                                <option value="">Uncategorized</option>
                                {categories.filter(c => c.parentId !== null).map(c => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-3">
                              <input 
                                type="number" 
                                step="0.01"
                                value={tx.amount} 
                                onChange={(e) => updateStagedRow(idx, 'amount', parseFloat(e.target.value) || 0)}
                                className="bg-transparent border-0 border-b border-transparent focus:border-violet-500 py-1 text-xs outline-none focus:ring-0 w-20 font-semibold"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="flex justify-end gap-3 border-t border-zinc-100 dark:border-zinc-900 pt-6">
                    <button
                      onClick={() => setStep(2)}
                      disabled={importing}
                      className="rounded-2xl border border-zinc-200 dark:border-zinc-800 px-6 py-3 text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer disabled:opacity-50"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleImport}
                      disabled={importing || stagedTransactions.filter((_, idx) => selectedRows[idx]).length === 0}
                      className="rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white px-6 py-3 text-sm font-semibold shadow-md shadow-violet-500/10 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                    >
                      {importing ? (
                        <>
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          Import Transactions
                          <ArrowRight className="h-4 w-4" />
                        </>
                      )}
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
