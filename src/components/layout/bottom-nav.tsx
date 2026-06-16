'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useDashboard } from '@/contexts/dashboard-context'
import { 
  LayoutDashboard, 
  PieChart, 
  Receipt, 
  Plus,
  Wallet,
  CalendarClock,
  Settings,
  MoreHorizontal,
  X
} from 'lucide-react'

export default function BottomNav() {
  const pathname = usePathname()
  const { openQuickAdd } = useDashboard()
  const [showMore, setShowMore] = useState(false)

  const primaryNav = [
    { name: 'Home', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Accounts', href: '/dashboard/accounts', icon: Wallet },
    { name: 'Placeholder', href: '#', icon: Plus }, // Placeholder for central FAB
    { name: 'Ledger', href: '/dashboard/transactions', icon: Receipt },
    { name: 'More', href: '#more', icon: MoreHorizontal },
  ]

  const moreItems = [
    { name: 'Budget', href: '/dashboard/budget', icon: PieChart },
    { name: 'Bills', href: '/dashboard/bills', icon: CalendarClock },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  return (
    <>
      {/* "More" popup menu */}
      {showMore && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setShowMore(false)}>
          <div className="absolute bottom-20 right-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-2 min-w-[160px] animate-fade-in" onClick={(e) => e.stopPropagation()}>
            {moreItems.map(item => {
              const isActive = pathname === item.href || pathname.startsWith(item.href)
              const Icon = item.icon
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={() => setShowMore(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition text-sm ${
                    isActive
                      ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 font-bold'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span className="font-semibold">{item.name}</span>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      <div className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-20 bg-white/70 dark:bg-zinc-950/70 border-t border-zinc-200/50 dark:border-zinc-800/50 backdrop-blur-lg pb-safe">
        <div className="grid h-full grid-cols-5 relative max-w-md mx-auto items-center justify-items-center">
          {primaryNav.map((item, idx) => {
            if (idx === 2) {
              // Central Quick-Add Floating Action Button (FAB)
              return (
                <div key="fab" className="relative -top-4 col-start-3">
                  <button
                    onClick={openQuickAdd}
                    aria-label="Add Transaction"
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:scale-105 active:scale-95 transition duration-150 border-4 border-slate-50 dark:border-zinc-950 cursor-pointer"
                  >
                    <Plus className="h-6 w-6" />
                  </button>
                </div>
              )
            }

            // "More" button
            if (item.href === '#more') {
              const isMoreActive = moreItems.some(m => pathname === m.href || pathname.startsWith(m.href))
              return (
                <button
                  key="more-btn"
                  onClick={() => setShowMore(!showMore)}
                  className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl transition duration-150 cursor-pointer ${
                    isMoreActive || showMore
                      ? 'text-violet-600 dark:text-violet-400' 
                      : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-950 dark:hover:text-white'
                  }`}
                >
                  {showMore ? <X className="h-5 w-5" /> : <MoreHorizontal className="h-5 w-5" />}
                  <span className="text-[10px] font-semibold mt-1 uppercase tracking-wider scale-90">More</span>
                </button>
              )
            }

            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
            const Icon = item.icon
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex h-12 w-12 flex-col items-center justify-center rounded-xl transition duration-150 ${
                  isActive 
                    ? 'text-violet-600 dark:text-violet-400' 
                    : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-950 dark:hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-semibold mt-1 uppercase tracking-wider scale-90">{item.name}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </>
  )
}
