'use client'

import { DashboardHeader } from '@/components/dashboard/header'
import { StatsCards } from '@/components/dashboard/stats-cards'
import { OpportunitiesTable } from '@/components/dashboard/opportunities-table'
import { BotControls } from '@/components/dashboard/bot-controls'
import { TradeHistory } from '@/components/dashboard/trade-history'
import { Portfolio } from '@/components/dashboard/portfolio'
import { ProfitChart } from '@/components/dashboard/profit-chart'

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="space-y-6">
          {/* Stats Overview */}
          <StatsCards />

          {/* Main Content Grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Opportunities Table - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              <OpportunitiesTable />
              <ProfitChart />
              <TradeHistory />
            </div>

            {/* Bot Controls & Portfolio - 1 column */}
            <div className="lg:col-span-1 space-y-6">
              <BotControls />
              <Portfolio />
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              Flash Loan Arbitrage Bot - Built on Solana
            </p>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <a
                href="https://github.com/moshthepitt/flash-loan-mastery"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Flash Loan Mastery
              </a>
              <span>|</span>
              <a
                href="https://jup.ag"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground transition-colors"
              >
                Jupiter DEX
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
