'use client'

import React, { createContext, useContext, useState } from 'react'

interface DashboardContextType {
  isSidebarCollapsed: boolean
  setSidebarCollapsed: (val: boolean) => void
  isQuickAddOpen: boolean
  setQuickAddOpen: (val: boolean) => void
  openQuickAdd: () => void
  closeQuickAdd: () => void
  isAddAccountOpen: boolean
  setAddAccountOpen: (val: boolean) => void
  openAddAccount: () => void
  closeAddAccount: () => void
  currency: string
  setCurrency: (val: string) => void
}

const DashboardContext = createContext<DashboardContextType | undefined>(undefined)

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const [isSidebarCollapsed, setSidebarCollapsedState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ex_track_sidebar_collapsed') === 'true'
    }
    return false
  })
  const setSidebarCollapsed = (val: boolean) => {
    setSidebarCollapsedState(val)
    if (typeof window !== 'undefined') {
      localStorage.setItem('ex_track_sidebar_collapsed', String(val))
    }
  }

  const [isQuickAddOpen, setQuickAddOpen] = useState(false)
  const [isAddAccountOpen, setIsAddAccountOpen] = useState(false)
  
  const [currency, setCurrencyState] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ex_track_currency') || 'USD'
    }
    return 'USD'
  })
  const setCurrency = (val: string) => {
    setCurrencyState(val)
    if (typeof window !== 'undefined') {
      localStorage.setItem('ex_track_currency', val)
    }
  }

  const openQuickAdd = () => setQuickAddOpen(true)
  const closeQuickAdd = () => setQuickAddOpen(false)

  const openAddAccount = () => setIsAddAccountOpen(true)
  const closeAddAccount = () => setIsAddAccountOpen(false)

  return (
    <DashboardContext.Provider
      value={{
        isSidebarCollapsed,
        setSidebarCollapsed,
        isQuickAddOpen,
        setQuickAddOpen,
        openQuickAdd,
        closeQuickAdd,
        isAddAccountOpen,
        setAddAccountOpen: setIsAddAccountOpen,
        openAddAccount,
        closeAddAccount,
        currency,
        setCurrency,
      }}
    >
      {children}
    </DashboardContext.Provider>
  )
}

export function useDashboard() {
  const context = useContext(DashboardContext)
  if (context === undefined) {
    throw new Error('useDashboard must be used within a DashboardProvider')
  }
  return context
}
