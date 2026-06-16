'use client'

import React from 'react'
import Sidebar from '@/components/layout/sidebar'
import BottomNav from '@/components/layout/bottom-nav'
import QuickAddModal from '@/components/layout/quick-add-modal'
import AddAccountModal from '@/components/dashboard/add-account-modal'
import { DashboardProvider } from '@/contexts/dashboard-context'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardProvider>
      <div className="flex min-h-screen bg-zinc-50 dark:bg-zinc-950 font-sans">
        {/* Desktop Collapsible Left Sidebar */}
        <Sidebar />

        {/* Content Area */}
        <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
          <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full">
            {children}
          </main>
        </div>

        {/* Mobile Bottom Navigation */}
        <BottomNav />

        {/* Manual entry ATM numpad dialog */}
        <QuickAddModal />

        {/* Plaid Link Sandbox & Manual Account Simulator */}
        <AddAccountModal />
      </div>
    </DashboardProvider>
  )
}
