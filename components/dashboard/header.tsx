'use client'

import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import { Zap, Activity } from 'lucide-react'
import { useBotStore } from '@/lib/solana/store'

export function DashboardHeader() {
  const { connected, publicKey } = useWallet()
  const { isRunning, totalProfit, successfulTrades, totalTrades } = useBotStore()

  return (
    <header className="flex items-center justify-between border-b border-border bg-card px-6 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-semibold text-foreground">Flash Loan Arbitrage</h1>
          <p className="text-sm text-muted-foreground">Solana DEX Arbitrage Bot</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        {connected && (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Activity className={`h-4 w-4 ${isRunning ? 'text-primary animate-pulse' : 'text-muted-foreground'}`} />
              <span className="text-sm text-muted-foreground">
                {isRunning ? 'Bot Active' : 'Bot Inactive'}
              </span>
            </div>
            <div className="h-6 w-px bg-border" />
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Total Profit</p>
              <p className={`text-sm font-mono font-medium ${totalProfit >= 0 ? 'text-primary' : 'text-destructive'}`}>
                {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(4)} SOL
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Success Rate</p>
              <p className="text-sm font-mono font-medium text-foreground">
                {totalTrades > 0 ? ((successfulTrades / totalTrades) * 100).toFixed(1) : '0'}%
              </p>
            </div>
          </div>
        )}

        <WalletMultiButton className="!bg-primary !text-primary-foreground hover:!bg-primary/90 !rounded-lg !h-10 !px-4 !text-sm !font-medium" />
      </div>
    </header>
  )
}
