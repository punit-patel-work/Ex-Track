'use client'

import React, { useState, useEffect } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { MockTransaction, MockAccount } from '@/utils/local-storage-db'
import { TrendingUp, TrendingDown, DollarSign } from 'lucide-react'

interface NetWorthChartProps {
  transactions: MockTransaction[]
  accounts: MockAccount[]
}

interface ChartDataPoint {
  date: string
  Assets: number
  Liabilities: number
  'Net Worth': number
}

export default function NetWorthChart({ transactions, accounts }: NetWorthChartProps) {
  const [timeline, setTimeline] = useState<'1M' | '3M' | '1Y'>('3M')
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [netWorthChange, setNetWorthChange] = useState({ value: 0, percent: 0, isPositive: true })
  
  // Hydration safety
  const [mounted, setMounted] = useState(false)
  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (accounts.length === 0) return

    // Calculate baseline balances
    const assetTypes = ['CHECKING', 'SAVINGS', 'INVESTMENT', 'MANUAL_ASSET']
    
    // Starting balance (today)
    let currentAssets = accounts
      .filter(a => assetTypes.includes(a.type))
      .reduce((acc, curr) => acc + Number(curr.balance), 0)

    let currentLiabilities = accounts
      .filter(a => a.type === 'CREDIT' || a.type === 'MANUAL_LIABILITY')
      .reduce((acc, curr) => acc + Math.abs(Number(curr.balance)), 0)

    // Build timeline points (daily)
    const pointsCount = timeline === '1M' ? 30 : timeline === '3M' ? 90 : 365
    const today = new Date()
    const points: ChartDataPoint[] = []

    // Sort transactions by date descending to roll back balances backwards
    const sortedTxs = [...transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    
    let tempAssets = currentAssets
    let tempLiabilities = currentLiabilities
    let txIdx = 0

    for (let i = 0; i < pointsCount; i++) {
      const currentDate = new Date()
      currentDate.setDate(today.getDate() - i)
      const dateStr = currentDate.toISOString().split('T')[0]

      // Subtract transactions that happened AFTER this date to reverse time
      while (txIdx < sortedTxs.length) {
        const tx = sortedTxs[txIdx]
        const txTime = new Date(tx.date).getTime()
        const currentMidnight = new Date(dateStr).getTime()

        if (txTime > currentMidnight) {
          // If transaction happened after this point, reverse its effect on our running balance
          const acc = accounts.find(a => a.id === tx.accountId)
          const isAsset = acc ? assetTypes.includes(acc.type) : true

          if (isAsset) {
            tempAssets -= Number(tx.amount) // Reverse increment
          } else {
            tempLiabilities -= Math.abs(Number(tx.amount)) // Reverse card increment
          }
          txIdx++
        } else {
          break
        }
      }

      points.push({
        date: new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Assets: Math.max(0, Number(tempAssets.toFixed(2))),
        Liabilities: Math.max(0, Number(tempLiabilities.toFixed(2))),
        'Net Worth': Number((tempAssets - tempLiabilities).toFixed(2)),
      })
    }

    // Reverse to display chronologically (left-to-right)
    const chronologicalPoints = points.reverse()
    setChartData(chronologicalPoints)

    // Calculate changes
    if (chronologicalPoints.length >= 2) {
      const startNW = chronologicalPoints[0]['Net Worth']
      const endNW = chronologicalPoints[chronologicalPoints.length - 1]['Net Worth']
      const diff = endNW - startNW
      const pct = startNW !== 0 ? (diff / Math.abs(startNW)) * 100 : 0
      
      setNetWorthChange({
        value: Number(Math.abs(diff).toFixed(2)),
        percent: Number(Math.abs(pct).toFixed(2)),
        isPositive: diff >= 0
      })
    }
  }, [transactions, accounts, timeline])

  if (!mounted) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl">
        <span className="text-xs text-zinc-400">Loading Net Worth Chart...</span>
      </div>
    )
  }

  const currentNetWorth = chartData.length > 0 ? chartData[chartData.length - 1]['Net Worth'] : 0

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm space-y-6 flex flex-col">
      {/* Title & Timeline Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Holistic Net Worth</span>
          <div className="flex items-baseline gap-2">
            <h2 className="text-3xl font-black text-zinc-900 dark:text-white">${currentNetWorth.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</h2>
            <span className={`flex items-center gap-0.5 text-xs font-bold ${netWorthChange.isPositive ? 'text-emerald-500' : 'text-rose-500'}`}>
              {netWorthChange.isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {netWorthChange.isPositive ? '+' : '-'}${netWorthChange.value.toLocaleString()} ({netWorthChange.percent}%)
            </span>
          </div>
        </div>

        {/* Timeline Toggler */}
        <div className="inline-flex rounded-xl bg-zinc-50 dark:bg-zinc-950 p-1 border border-zinc-200/50 dark:border-zinc-850">
          {(['1M', '3M', '1Y'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTimeline(t)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                timeline === t
                  ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white'
                  : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="colorNW" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.3} className="dark:stroke-zinc-800" />
            <XAxis 
              dataKey="date" 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickFormatter={value => `$${value >= 1000 ? (value / 1000).toFixed(0) + 'k' : value}`}
              tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }}
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                color: '#fff',
                fontSize: '11px',
                fontWeight: 650,
                backdropFilter: 'blur(8px)'
              }}
              formatter={(value: any) => [`$${Number(value).toLocaleString()}`, undefined]}
            />
            <Area 
              type="monotone" 
              dataKey="Net Worth" 
              stroke="#8b5cf6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorNW)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
