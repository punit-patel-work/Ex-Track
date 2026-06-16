'use client'

import React, { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { MockTransaction, MockCategory } from '@/utils/local-storage-db'

interface CashFlowChartProps {
  transactions: MockTransaction[]
  categories: MockCategory[]
}

interface MonthlyFlow {
  month: string
  Income: number
  Expense: number
}

export default function CashFlowChart({ transactions, categories }: CashFlowChartProps) {
  const [chartData, setChartData] = useState<MonthlyFlow[]>([])
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    const today = new Date()
    const monthsData: MonthlyFlow[] = []

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

    // Find income categories
    const incomeCatIds = categories
      .filter(c => {
        const parent = categories.find(p => p.id === c.parentId)
        return parent?.name === 'Income' || c.name === 'Income'
      })
      .map(c => c.id)

    // Calculate totals for the last 3 months
    for (let i = 2; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
      const year = d.getFullYear()
      const month = d.getMonth()

      // Filter transactions
      const monthTxs = transactions.filter(t => {
        const txDate = new Date(t.date)
        return txDate.getFullYear() === year && txDate.getMonth() === month
      })

      // Aggregate income vs expense
      let incomeVal = 0
      let expenseVal = 0

      monthTxs.forEach(tx => {
        const amt = Number(tx.amount)
        if (tx.categoryId && incomeCatIds.includes(tx.categoryId)) {
          incomeVal += amt
        } else if (amt < 0) {
          expenseVal += Math.abs(amt)
        }
      })

      monthsData.push({
        month: `${monthNames[month]}`,
        Income: Number(incomeVal.toFixed(2)),
        Expense: Number(expenseVal.toFixed(2)),
      })
    }

    setChartData(monthsData)
  }, [transactions, categories])

  if (!mounted) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl">
        <span className="text-xs text-zinc-400">Loading Cash Flow Chart...</span>
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-3xl p-6 shadow-sm space-y-6 flex flex-col">
      <div className="space-y-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400">Cash Flow History</span>
        <h3 className="font-extrabold text-zinc-900 dark:text-white text-base">Monthly Income vs. Expense</h3>
      </div>

      {/* Chart Canvas */}
      <div className="h-[280px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.3} className="dark:stroke-zinc-800" />
            <XAxis 
              dataKey="month" 
              tickLine={false} 
              axisLine={false}
              tick={{ fill: '#a1a1aa', fontSize: 10, fontWeight: 600 }}
            />
            <YAxis 
              tickLine={false}
              axisLine={false}
              tickFormatter={value => `$${value}`}
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
            <Legend 
              verticalAlign="bottom" 
              height={36} 
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '11px', fontWeight: 600 }}
            />
            <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Expense" fill="#ec4899" radius={[4, 4, 0, 0]} maxBarSize={40} />
          </BarChart>
        </ResponsiveContainer>
      </div>

    </div>
  )
}
