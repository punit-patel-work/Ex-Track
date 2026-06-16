'use client'

import React, { useState, useEffect } from 'react'
import { useFinanceData } from '@/hooks/use-finance-data'
import { useDashboard } from '@/contexts/dashboard-context'
import { 
  X, 
  Search, 
  Lock, 
  RefreshCw, 
  CheckCircle2, 
  Plus, 
  Info,
  CreditCard,
  Wallet,
  Coins,
  TrendingUp,
  Building2,
  TrendingDown
} from 'lucide-react'

const PRESETS = [
  { id: 'custom', name: 'Custom / None', type: 'CHECKING', defaultName: '', currency: 'USD' },
  { id: 'chase', name: 'Chase Bank', type: 'CHECKING', defaultName: 'Chase Checking', currency: 'USD' },
  { id: 'amex', name: 'American Express (Amex)', type: 'CREDIT', defaultName: 'Amex Gold Card', currency: 'USD' },
  { id: 'citi', name: 'Citibank', type: 'CREDIT', defaultName: 'Citi Double Cash', currency: 'USD' },
  { id: 'capitalone', name: 'Capital One', type: 'CREDIT', defaultName: 'Capital One Venture', currency: 'USD' },
  { id: 'wellsfargo', name: 'Wells Fargo', type: 'CHECKING', defaultName: 'Wells Fargo Checking', currency: 'USD' },
  { id: 'ally', name: 'Ally Bank', type: 'SAVINGS', defaultName: 'Ally Savings', currency: 'USD' },
  { id: 'apple', name: 'Apple Card', type: 'CREDIT', defaultName: 'Apple Card', currency: 'USD' },
  { id: 'vanguard', name: 'Vanguard', type: 'INVESTMENT', defaultName: 'Vanguard Brokerage', currency: 'USD' },
  { id: 'fidelity', name: 'Fidelity', type: 'INVESTMENT', defaultName: 'Fidelity Account', currency: 'USD' },
  { id: 'schwab', name: 'Charles Schwab', type: 'INVESTMENT', defaultName: 'Schwab Brokerage', currency: 'USD' },
]

export default function AddAccountModal() {
  const { isAddAccountOpen, closeAddAccount } = useDashboard()
  const { accounts, categories, addAccount, addTransaction } = useFinanceData()

  const [activeModalTab, setActiveModalTab] = useState<'plaid' | 'manual'>('plaid')
  const [newAccountName, setNewAccountName] = useState('')
  const [newAccountType, setNewAccountType] = useState<'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' | 'MANUAL_ASSET' | 'MANUAL_LIABILITY'>('CHECKING')
  const [newAccountBalance, setNewAccountBalance] = useState('0.00')
  const [newAccountCurrency, setNewAccountCurrency] = useState('USD')
  const [selectedPreset, setSelectedPreset] = useState('custom')
  
  const [isSubmittingAccount, setIsSubmittingAccount] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)

  // Plaid link simulation states
  const [plaidStep, setPlaidStep] = useState<'select' | 'auth' | 'success'>('select')
  const [selectedPlaidBank, setSelectedPlaidBank] = useState<string | null>(null)
  const [plaidUsername, setPlaidUsername] = useState('user_sandbox')
  const [plaidPassword, setPlaidPassword] = useState('••••••••')
  const [linkingPlaid, setLinkingPlaid] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  // Reset state when opening/closing
  useEffect(() => {
    if (!isAddAccountOpen) {
      setAccountError(null)
      setPlaidStep('select')
      setSelectedPlaidBank(null)
      setNewAccountName('')
      setNewAccountBalance('0.00')
      setSelectedPreset('custom')
      setSyncMessage(null)
    }
  }, [isAddAccountOpen])

  if (!isAddAccountOpen) return null

  const seedNewPlaidAccountTransactions = async (accountId: string, bank: string) => {
    const grocCat = categories.find(c => c.name.toLowerCase().includes('groceries'))
    const restCat = categories.find(c => c.name.toLowerCase().includes('restaurants'))
    const transportCat = categories.find(c => c.name.toLowerCase().includes('transit') || c.name.toLowerCase().includes('gas'))
    const entertainmentCat = categories.find(c => c.name.toLowerCase().includes('entertainment') || c.name.toLowerCase().includes('subscriptions'))
    const incomeCat = categories.find(c => c.name.toLowerCase().includes('salary') || c.name.toLowerCase().includes('income'))

    const nowStr = new Date().toISOString().split('T')[0]
    
    let sampleTxs = []
    if (bank === 'Chase') {
      sampleTxs = [
        { accountId, categoryId: grocCat?.id || null, amount: -84.20, date: nowStr, description: 'Chase checking grocery spend', merchant: 'Whole Foods Market', pendingStatus: false, tags: ['essential'] },
        { accountId, categoryId: incomeCat?.id || null, amount: 2500.00, date: nowStr, description: 'Acme Corp Payroll deposit', merchant: 'Acme Corp', pendingStatus: false, tags: ['salary'] }
      ]
    } else if (bank === 'American Express (Amex)') {
      sampleTxs = [
        { accountId, categoryId: restCat?.id || null, amount: -120.40, date: nowStr, description: 'Amex dinner date charge', merchant: 'Trattoria Bella', pendingStatus: false, tags: ['dining'] },
        { accountId, categoryId: entertainmentCat?.id || null, amount: -15.49, date: nowStr, description: 'Amex Netflix fee', merchant: 'Netflix.com', pendingStatus: false, tags: ['subscriptions'] }
      ]
    } else if (bank === 'Ally Bank') {
      sampleTxs = [
        { accountId, categoryId: incomeCat?.id || null, amount: 14.85, date: nowStr, description: 'Ally savings interest', merchant: 'Ally Bank', pendingStatus: false, tags: ['interest'] }
      ]
    } else if (bank === 'Vanguard') {
      sampleTxs = [
        { accountId, categoryId: incomeCat?.id || null, amount: 120.00, date: nowStr, description: 'Vanguard brokerage dividend', merchant: 'Vanguard Group', pendingStatus: false, tags: ['dividend'] }
      ]
    } else {
      sampleTxs = [
        { accountId, categoryId: grocCat?.id || null, amount: -32.50, date: nowStr, description: 'Mock bank charge', merchant: 'Local Convenience', pendingStatus: false, tags: [] }
      ]
    }

    for (const tx of sampleTxs) {
      await addTransaction(tx)
    }
  }

  const handleLinkPlaidAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlaidBank) return
    setLinkingPlaid(true)
    setAccountError(null)

    // Simulate link delay
    await new Promise(resolve => setTimeout(resolve, 2000))

    let name = ''
    let type: 'CHECKING' | 'SAVINGS' | 'CREDIT' | 'INVESTMENT' = 'CHECKING'
    let balance = 0

    switch (selectedPlaidBank) {
      case 'Chase':
        name = 'Chase Checking'
        type = 'CHECKING'
        balance = 4850.23
        break
      case 'American Express (Amex)':
        name = 'Amex Gold Card'
        type = 'CREDIT'
        balance = -824.50
        break
      case 'Bank of America':
        name = 'BofA Checking'
        type = 'CHECKING'
        balance = 3200.00
        break
      case 'Wells Fargo':
        name = 'Wells Fargo Checking'
        type = 'CHECKING'
        balance = 1950.00
        break
      case 'Ally Bank':
        name = 'Ally Savings'
        type = 'SAVINGS'
        balance = 15450.00
        break
      case 'Vanguard':
        name = 'Vanguard Brokerage'
        type = 'INVESTMENT'
        balance = 28400.00
        break
      default:
        name = `${selectedPlaidBank} Account`
        type = 'CHECKING'
        balance = 1000.00
    }

    // Check if account already exists
    const exists = accounts.some(a => a.name === name)
    if (exists) {
      setAccountError(`Your ${name} is already linked to Ex-Track!`)
      setLinkingPlaid(false)
      return
    }

    const res = await addAccount(name, type, balance, 'USD')
    setLinkingPlaid(false)
    if (res.success && res.account) {
      // Seed transactions
      await seedNewPlaidAccountTransactions(res.account.id, selectedPlaidBank)
      setPlaidStep('success')
      setSyncMessage(`Successfully linked ${name} and synchronized initial transactions!`)
    } else {
      setAccountError(res.error || 'Failed to connect sandbox feeds.')
    }
  }

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAccountName) {
      setAccountError('Account name is required')
      return
    }
    setIsSubmittingAccount(true)
    setAccountError(null)
    const balanceVal = parseFloat(newAccountBalance) || 0
    const res = await addAccount(newAccountName, newAccountType, balanceVal, newAccountCurrency)
    if (res.success) {
      setNewAccountName('')
      setNewAccountBalance('0.00')
      closeAddAccount()
    } else {
      setAccountError(res.error || 'Failed to create account')
    }
    setIsSubmittingAccount(false)
  }

  const handlePresetChange = (presetId: string) => {
    setSelectedPreset(presetId)
    const preset = PRESETS.find(p => p.id === presetId)
    if (preset) {
      setNewAccountName(preset.defaultName)
      if (presetId !== 'custom') {
        setNewAccountType(preset.type as any)
      }
      setNewAccountCurrency(preset.currency)
    }
  }

  return (
    <div onClick={closeAddAccount} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-lg rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 p-6 shrink-0">
          <h3 className="text-lg font-bold">Link or Add Account</h3>
          <button 
            onClick={closeAddAccount}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Tabs Selector */}
        {plaidStep !== 'success' && (
          <div className="px-6 pt-4 shrink-0">
            <div className="flex rounded-2xl bg-zinc-100 dark:bg-zinc-900 p-1 border border-zinc-200/50 dark:border-zinc-800/50">
              <button
                onClick={() => {
                  setActiveModalTab('plaid')
                  setPlaidStep('select')
                }}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
                  activeModalTab === 'plaid' 
                    ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-950 dark:text-white' 
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                Link Bank (Plaid Sandbox)
              </button>
              <button
                onClick={() => setActiveModalTab('manual')}
                className={`flex-1 rounded-xl py-2 text-xs font-semibold transition cursor-pointer ${
                  activeModalTab === 'manual' 
                    ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-950 dark:text-white' 
                    : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
                }`}
              >
                Add Manual Account
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Form Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar">
          {accountError && (
            <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3.5 text-sm text-rose-500">
              {accountError}
            </div>
          )}

          {activeModalTab === 'plaid' ? (
            /* Tab 1: Simulated Plaid Flow */
            <div>
              {plaidStep === 'select' && (
                <div className="space-y-4">
                  <p className="text-xs text-zinc-400">
                    Securely connect bank accounts or credit cards using our simulated Plaid sandbox. Selecting an institution imports historical transaction records.
                  </p>

                  <div className="relative">
                    <Search className="absolute left-3.5 top-3 h-4 w-4 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="Search popular banks..."
                      disabled
                      className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 pl-10 pr-4 text-xs text-zinc-400 placeholder-zinc-500 cursor-not-allowed"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {[
                      { name: 'Chase', bg: 'bg-blue-600 text-white', logo: 'C' },
                      { name: 'American Express (Amex)', bg: 'bg-amber-600 text-white', logo: 'A' },
                      { name: 'Bank of America', bg: 'bg-red-600 text-white', logo: 'B' },
                      { name: 'Wells Fargo', bg: 'bg-yellow-600 text-white', logo: 'W' },
                      { name: 'Ally Bank', bg: 'bg-indigo-950 text-white border border-indigo-900', logo: 'a' },
                      { name: 'Vanguard', bg: 'bg-rose-950 text-white', logo: 'V' }
                    ].map(bank => (
                      <button
                        key={bank.name}
                        onClick={() => {
                          setSelectedPlaidBank(bank.name)
                          setPlaidStep('auth')
                        }}
                        className="flex flex-col items-center justify-center p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800/80 transition cursor-pointer gap-2 group text-center"
                      >
                        <span className={`h-10 w-10 flex items-center justify-center rounded-xl font-black text-lg ${bank.bg} group-hover:scale-105 transition`}>
                          {bank.logo}
                        </span>
                        <span className="text-xs font-bold text-zinc-900 dark:text-white truncate w-full">{bank.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {plaidStep === 'auth' && selectedPlaidBank && (
                <form onSubmit={handleLinkPlaidAccount} className="space-y-4">
                  <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-950 border border-zinc-200/40 dark:border-zinc-800/40 p-4 space-y-3">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
                      <Lock className="h-4 w-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white">Plaid Sandbox Connector</p>
                        <p className="text-[10px] text-zinc-400">Connecting to {selectedPlaidBank}</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Username</label>
                      <input
                        type="text"
                        required
                        value={plaidUsername}
                        onChange={e => setPlaidUsername(e.target.value)}
                        className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3 text-xs text-zinc-900 dark:text-white"
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider">Password</label>
                      <input
                        type="password"
                        required
                        value={plaidPassword}
                        onChange={e => setPlaidPassword(e.target.value)}
                        className="w-full rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3 text-xs text-zinc-900 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setPlaidStep('select')}
                      className="flex-1 rounded-2xl border border-zinc-200 dark:border-zinc-800 py-3 text-xs font-bold text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={linkingPlaid}
                      className="flex-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3 text-xs font-bold text-white hover:from-violet-500 hover:to-indigo-500 cursor-pointer disabled:opacity-50"
                    >
                      {linkingPlaid ? (
                        <>
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                          Connecting...
                        </>
                      ) : (
                        'Authorize Link'
                      )}
                    </button>
                  </div>
                </form>
              )}

              {plaidStep === 'success' && selectedPlaidBank && (
                <div className="text-center py-6 space-y-4">
                  <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-zinc-900 dark:text-white">Connection Successful!</h4>
                    <p className="text-xs text-zinc-400 px-4">
                      {selectedPlaidBank} sandbox bank account was linked successfully. Initial transactions have been fetched and categorized.
                    </p>
                  </div>
                  <button
                    onClick={closeAddAccount}
                    className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-xs font-bold text-white hover:from-violet-500 hover:to-indigo-500 cursor-pointer"
                  >
                    Return to Board
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Tab 2: Manual Account Creation with presets */
            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Choose Bank Preset</label>
                <select
                  value={selectedPreset}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                >
                  {PRESETS.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Account Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chase Checking, Amex Platinum"
                  value={newAccountName}
                  onChange={(e) => setNewAccountName(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Account Type</label>
                  <select
                    value={newAccountType}
                    disabled={selectedPreset !== 'custom'}
                    onChange={(e) => setNewAccountType(e.target.value as any)}
                    className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="CHECKING">Checking</option>
                    <option value="SAVINGS">Savings</option>
                    <option value="CREDIT">Credit Card</option>
                    <option value="INVESTMENT">Investment</option>
                    <option value="MANUAL_ASSET">Manual Asset</option>
                    <option value="MANUAL_LIABILITY">Manual Liability</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Currency</label>
                  <select
                    value={newAccountCurrency}
                    disabled={selectedPreset !== 'custom'}
                    onChange={(e) => setNewAccountCurrency(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-3 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="INR">INR (₹)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {newAccountType === 'CREDIT' || newAccountType === 'MANUAL_LIABILITY' ? 'Current Balance (Negative for Debt)' : 'Initial Balance'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  placeholder="0.00"
                  value={newAccountBalance}
                  onChange={(e) => setNewAccountBalance(e.target.value)}
                  className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-3 px-4 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
                <span className="text-[10px] text-zinc-400 mt-1 flex gap-1 items-center">
                  <Info size={11} className="shrink-0" />
                  <span>For Credit Cards, enter negative values (e.g. -824.50) to represent debt.</span>
                </span>
              </div>

              <button
                type="submit"
                disabled={isSubmittingAccount}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-semibold text-white hover:from-violet-500 hover:to-indigo-500 shadow-md shadow-violet-500/10 cursor-pointer disabled:opacity-50"
              >
                {isSubmittingAccount ? 'Creating...' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
