'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useDashboard } from '@/contexts/dashboard-context'
import { 
  LayoutDashboard, 
  PieChart, 
  Receipt, 
  Calendar, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  LogOut, 
  Sparkles,
  Wallet,
  User as UserIcon
} from 'lucide-react'

export default function Sidebar() {
  const pathname = usePathname()
  const { user, signOut } = useAuth()
  const { isSidebarCollapsed, setSidebarCollapsed, openQuickAdd } = useDashboard()

  const navItems = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Accounts', href: '/dashboard/accounts', icon: Wallet },
    { name: 'Budgeting', href: '/dashboard/budget', icon: PieChart },
    { name: 'Transactions', href: '/dashboard/transactions', icon: Receipt },
    { name: 'Bills & Subs', href: '/dashboard/bills', icon: Calendar },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  ]

  const toggleSidebar = () => {
    setSidebarCollapsed(!isSidebarCollapsed)
  }

  const userInitials = user?.user_metadata?.full_name
    ? user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()
    : 'US'

  return (
    <aside 
      className={`hidden md:flex flex-col border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-all duration-300 ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      } relative z-20`}
    >
      {/* Sidebar Collapse Toggle Button */}
      <button 
        onClick={toggleSidebar}
        className="absolute -right-3 top-10 flex h-6 w-6 items-center justify-center rounded-full border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-500 hover:text-zinc-900 dark:hover:text-white shadow-sm hover:shadow transition duration-200 cursor-pointer"
      >
        {isSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Brand Logo */}
      <div className="flex h-20 items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-3 group">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-violet-600 to-indigo-600 shadow-md shadow-indigo-500/20 group-hover:scale-105 transition duration-200">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          {!isSidebarCollapsed && (
            <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-400 bg-clip-text text-transparent">
              Ex-Track
            </span>
          )}
        </Link>
      </div>

      {/* Quick Add Button */}
      <div className="px-4 py-2">
        <button
          onClick={openQuickAdd}
          className={`w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-violet-500/15 transition duration-200 cursor-pointer ${
            isSidebarCollapsed ? 'p-3' : 'py-3 px-4'
          }`}
        >
          <Plus size={18} />
          {!isSidebarCollapsed && <span>Add Transaction</span>}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-6">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))
          const Icon = item.icon
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium transition duration-200 group ${
                isActive 
                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-600 dark:text-violet-400' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-950 dark:hover:text-white'
              }`}
            >
              <Icon size={18} className={`transition duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-105'}`} />
              {!isSidebarCollapsed && <span>{item.name}</span>}
            </Link>
          )
        })}
      </nav>

      {/* User Footer Profile & Settings */}
      <div className="border-t border-zinc-200 dark:border-zinc-800 p-4 space-y-2">
        <div className={`flex items-center gap-3 ${isSidebarCollapsed ? 'justify-center' : ''}`}>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-sm font-bold text-violet-600 dark:text-violet-400">
            {userInitials}
          </div>
          {!isSidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold truncate text-zinc-900 dark:text-zinc-100">
                {user?.user_metadata?.full_name || 'Guest User'}
              </p>
              <p className="text-xs truncate text-zinc-400">
                {user?.email || 'guest@ex-track.com'}
              </p>
            </div>
          )}
        </div>
        
        <button
          onClick={signOut}
          className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition duration-200 cursor-pointer ${
            isSidebarCollapsed ? 'justify-center' : ''
          }`}
        >
          <LogOut size={16} />
          {!isSidebarCollapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  )
}
