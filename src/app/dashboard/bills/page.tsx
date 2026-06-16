'use client'

import React, { useState, useEffect } from 'react'
import { useFinanceData } from '@/hooks/use-finance-data'
import { useAuth } from '@/contexts/auth-context'
import { MockRecurringRule } from '@/utils/local-storage-db'
import { useDashboard } from '@/contexts/dashboard-context'
import { formatCurrency, getCurrencySymbol } from '@/utils/currency'
import { Calendar as CalendarIcon, Info, Sparkles, Check, AlertTriangle, Plus, Tv, Power, HelpCircle, Moon, Trash2, X } from 'lucide-react'

export default function BillsPage() {
  const { recurringRules, categories, addRecurringRule, removeRecurringRule } = useFinanceData()
  const { currency } = useDashboard()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newBill, setNewBill] = useState({
    name: '',
    interval: 'MONTHLY' as string,
    amount: '',
    nextExpectedDate: new Date().toISOString().split('T')[0],
    matchingMerchant: '',
    categoryId: '',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [daysInMonth, setDaysInMonth] = useState<number[]>([])
  const [currentDate] = useState(() => new Date())
  const [activeBill, setActiveBill] = useState<MockRecurringRule | null>(null)

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June', 
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const currentYear = currentDate.getFullYear()
  const currentMonthIdx = currentDate.getMonth()

  // Generate calendar days for current month
  const firstDayOffset = new Date(currentYear, currentMonthIdx, 1).getDay() // 0=Sun, 6=Sat
  useEffect(() => {
    const totalDays = new Date(currentYear, currentMonthIdx + 1, 0).getDate()
    const days = []
    for (let d = 1; d <= totalDays; d++) {
      days.push(d)
    }
    setDaysInMonth(days)
  }, [currentYear, currentMonthIdx])

  // Get bills due on a specific day of the current month
  const getBillsForDay = (day: number) => {
    return recurringRules.filter(r => {
      const d = new Date(r.nextExpectedDate)
      return d.getFullYear() === currentYear && d.getMonth() === currentMonthIdx && d.getDate() === day
    })
  }

  // Calculate bill metrics
  const totalBillsVal = recurringRules.reduce((acc, curr) => acc + Math.abs(Number(curr.amount)), 0)
  const subscriptionsCount = recurringRules.filter(r => Math.abs(r.amount) < 100).length // Heuristic: small items are subs

  // Dynamic "Next Impending Bill" calculation
  const nextBill = recurringRules
    .filter(r => new Date(r.nextExpectedDate) >= currentDate)
    .sort((a, b) => new Date(a.nextExpectedDate).getTime() - new Date(b.nextExpectedDate).getTime())[0] || null
  const nextBillDaysUntil = nextBill ? Math.max(0, Math.ceil((new Date(nextBill.nextExpectedDate).getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))) : null

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-zinc-900 dark:text-white">Bills & Subscriptions</h1>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Scan historical statements, track active subscriptions, and predict billing dates.</p>
      </div>

      {/* Primary KPI Dash Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Bills Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Total Monthly Bills</span>
          <p className="text-2xl font-black mt-1 text-rose-500">{formatCurrency(totalBillsVal, currency)}</p>
          <span className="text-[10px] text-zinc-400 block mt-1.5">Factored rent, utilities, cell bills</span>
        </div>

        {/* Add Bill Button */}
        <button
          onClick={() => setShowAddForm(true)}
          className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 border-0 rounded-3xl p-6 shadow-lg shadow-violet-500/10 flex flex-col items-center justify-center cursor-pointer transition group"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 mb-2 group-hover:scale-110 transition">
            <Plus className="h-5 w-5 text-white" />
          </div>
          <span className="text-xs font-bold text-white">Add Bill / Sub</span>
        </button>

        {/* Subs count Card */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Active Subscriptions</span>
          <p className="text-2xl font-black mt-1 text-zinc-850 dark:text-white">{subscriptionsCount}</p>
          <span className="text-[10px] text-zinc-400 block mt-1.5">Streaming, SaaS memberships, licenses</span>
        </div>

        {/* Next Due Alert */}
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Next Impending Bill</span>
          {nextBill ? (
            <div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                <span className="font-extrabold text-sm text-zinc-900 dark:text-white">{nextBill.name} ({formatCurrency(Math.abs(nextBill.amount), currency)})</span>
              </div>
              <span className="text-[10px] text-zinc-400 block mt-1">{nextBill.matchingMerchant} • Due in {nextBillDaysUntil} day{nextBillDaysUntil !== 1 ? 's' : ''}</span>
            </div>
          ) : (
            <div>
              <span className="font-extrabold text-sm text-zinc-400 mt-1 block">No upcoming bills</span>
            </div>
          )}
        </div>
      </div>

      {/* Main layout calendar split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Predicted Bills Calendar Grid (occupies 2 cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <h3 className="font-extrabold text-zinc-900 dark:text-white">Predicted Bills Calendar</h3>
            <span className="text-xs font-bold text-violet-600 dark:text-violet-400">{monthNames[currentMonthIdx]} {currentYear}</span>
          </div>

          {/* Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold">
            {/* Week Headers */}
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(w => (
              <div key={w} className="text-[10px] text-zinc-400 uppercase tracking-wider py-1">{w}</div>
            ))}

            {/* Empty spacer cells for weekday offset */}
            {Array.from({ length: firstDayOffset }).map((_, i) => (
              <div key={`spacer-${i}`} className="h-16" />
            ))}

            {/* Days of month */}
            {daysInMonth.map(day => {
              const dayBills = getBillsForDay(day)
              const hasBills = dayBills.length > 0
              
              return (
                <div 
                  key={day}
                  onClick={() => hasBills && setActiveBill(dayBills[0])}
                  className={`h-16 border border-zinc-100 dark:border-zinc-850 rounded-2xl flex flex-col items-center justify-between p-1.5 cursor-pointer transition ${
                    hasBills 
                      ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 font-extrabold' 
                      : 'hover:bg-zinc-50 dark:hover:bg-zinc-850 text-zinc-500'
                  }`}
                >
                  <span className="text-[10px]">{day}</span>
                  {hasBills && (
                    <div className="w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-violet-400" />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Side Panel: Scheduled List & Alerts */}
        <div className="space-y-6">
          
          {/* Detailed Bills list */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="font-extrabold text-zinc-900 dark:text-white text-sm">Impending Autopay Schedule</h4>
            
            <div className="divide-y divide-zinc-100 dark:divide-zinc-850">
              {recurringRules.map(rule => {
                const isSmallSub = Math.abs(rule.amount) < 100
                return (
                  <div key={rule.id} className="py-3 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center bg-zinc-50 dark:bg-zinc-950 rounded-lg text-zinc-400">
                        {isSmallSub ? <Tv size={13} /> : <Power size={13} />}
                      </span>
                      <div>
                        <p className="font-bold text-zinc-900 dark:text-white">{rule.name}</p>
                        <p className="text-[10px] text-zinc-400">Due {rule.nextExpectedDate} • {rule.interval.toLowerCase()}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-zinc-950 dark:text-white">
                        ${Math.abs(rule.amount).toFixed(2)}
                      </span>
                      <button
                        onClick={async () => {
                          if (confirm(`Delete "${rule.name}" recurring rule?`)) {
                            await removeRecurringRule(rule.id)
                          }
                        }}
                        className="flex h-6 w-6 items-center justify-center rounded-lg text-zinc-300 hover:text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              })}
              {recurringRules.length === 0 && (
                <p className="py-4 text-center text-xs text-zinc-400">No recurring bills yet. Add one to start tracking!</p>
              )}
            </div>
          </div>

          {/* Active Bill Inspector */}
          {activeBill && (
            <div className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-850 rounded-3xl p-6 space-y-3 animate-fade-in relative">
              <button 
                onClick={() => setActiveBill(null)}
                className="absolute right-3 top-3 text-xs text-zinc-400 hover:text-zinc-950 dark:hover:text-white cursor-pointer"
              >
                Clear
              </button>
              <h4 className="font-bold text-zinc-950 dark:text-white text-sm">Predicted Bill Details</h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Merchant Name:</span>
                  <span className="font-semibold">{activeBill.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Interval Schedule:</span>
                  <span className="font-semibold">{activeBill.interval}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Expected Date:</span>
                  <span className="font-semibold">{activeBill.nextExpectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Expected Charge:</span>
                  <span className="font-black text-rose-500">${Math.abs(activeBill.amount).toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Subscription warnings */}
          {recurringRules.length > 3 && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 flex gap-3 text-xs leading-normal">
              <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-600 dark:text-amber-400">Subscription Review Suggested</p>
                <p className="text-zinc-400 mt-1">
                  You have {recurringRules.length} recurring charges. Consider reviewing to identify any unused subscriptions.
                </p>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* Add Bill/Subscription Modal */}
      {showAddForm && (
        <div onClick={() => setShowAddForm(false)} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-zinc-100 dark:border-zinc-900 p-6">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Add Bill / Subscription</h3>
              <button onClick={() => setShowAddForm(false)} className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-100 dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition cursor-pointer">
                <X size={16} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {formError && (
                <div className="rounded-2xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs text-rose-600 dark:text-rose-400">{formError}</div>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Name</label>
                <input
                  type="text"
                  placeholder="e.g. Netflix, Rent, Gym"
                  value={newBill.name}
                  onChange={(e) => setNewBill({ ...newBill, name: e.target.value })}
                  className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Amount ({getCurrencySymbol(currency)})</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="15.99"
                    value={newBill.amount}
                    onChange={(e) => setNewBill({ ...newBill, amount: e.target.value })}
                    className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Interval</label>
                  <select
                    value={newBill.interval}
                    onChange={(e) => setNewBill({ ...newBill, interval: e.target.value })}
                    className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                  >
                    <option value="DAILY">Daily</option>
                    <option value="WEEKLY">Weekly</option>
                    <option value="BIWEEKLY">Biweekly</option>
                    <option value="MONTHLY">Monthly</option>
                    <option value="YEARLY">Yearly</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Next Due Date</label>
                  <input
                    type="date"
                    value={newBill.nextExpectedDate}
                    onChange={(e) => setNewBill({ ...newBill, nextExpectedDate: e.target.value })}
                    className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Category</label>
                  <select
                    value={newBill.categoryId}
                    onChange={(e) => setNewBill({ ...newBill, categoryId: e.target.value })}
                    className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500 cursor-pointer"
                  >
                    <option value="">None</option>
                    {categories.filter(c => c.parentId !== null).map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Merchant / Payee</label>
                <input
                  type="text"
                  placeholder="e.g. Netflix, Inc."
                  value={newBill.matchingMerchant}
                  onChange={(e) => setNewBill({ ...newBill, matchingMerchant: e.target.value })}
                  className="w-full rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 py-2.5 px-3.5 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-violet-500"
                />
              </div>
              <button
                onClick={async () => {
                  if (!newBill.name || !newBill.amount || !newBill.matchingMerchant) {
                    setFormError('Name, amount, and merchant are required.')
                    return
                  }
                  setIsSubmitting(true)
                  setFormError(null)
                  const res = await addRecurringRule({
                    name: newBill.name,
                    interval: newBill.interval,
                    amount: -Math.abs(parseFloat(newBill.amount)),
                    nextExpectedDate: newBill.nextExpectedDate,
                    matchingMerchant: newBill.matchingMerchant,
                    categoryId: newBill.categoryId || undefined,
                  })
                  setIsSubmitting(false)
                  if (res.success) {
                    setShowAddForm(false)
                    setNewBill({ name: '', interval: 'MONTHLY', amount: '', nextExpectedDate: new Date().toISOString().split('T')[0], matchingMerchant: '', categoryId: '' })
                  } else {
                    setFormError(res.error || 'Failed to create recurring rule.')
                  }
                }}
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold py-3 text-sm cursor-pointer transition shadow-lg shadow-violet-500/10 disabled:opacity-50"
              >
                {isSubmitting ? 'Creating...' : 'Add Recurring Bill'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
