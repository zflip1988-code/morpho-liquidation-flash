'use client'

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { LAMPORTS_PER_SOL } from '@solana/web3.js'
import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Wallet, TrendingUp, Activity, Clock } from 'lucide-react'
import { useBotStore } from '@/lib/solana/store'

export function StatsCards() {
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const { totalProfit, totalTrades, successfulTrades, opportunities, lastScanTime } = useBotStore()
  const [balance, setBalance] = useState<number>(0)

  useEffect(() => {
    async function fetchBalance() {
      if (publicKey && connected) {
        try {
          const bal = await connection.getBalance(publicKey)
          setBalance(bal / LAMPORTS_PER_SOL)
        } catch (error) {
          console.error('Error fetching balance:', error)
        }
      }
    }

    fetchBalance()
    const interval = setInterval(fetchBalance, 10000)
    return () => clearInterval(interval)
  }, [publicKey, connected, connection])

  const stats = [
    {
      label: 'Wallet Balance',
      value: connected ? `${balance.toFixed(4)} SOL` : '-- SOL',
      subValue: connected ? `$${(balance * 145).toFixed(2)} USD` : '',
      icon: Wallet,
      color: 'text-chart-4'
    },
    {
      label: 'Total Profit',
      value: `${totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(4)} SOL`,
      subValue: `$${(totalProfit * 145).toFixed(2)} USD`,
      icon: TrendingUp,
      color: totalProfit >= 0 ? 'text-primary' : 'text-destructive'
    },
    {
      label: 'Active Opportunities',
      value: opportunities.filter(o => o.status === 'pending').length.toString(),
      subValue: `${opportunities.length} total scanned`,
      icon: Activity,
      color: 'text-chart-3'
    },
    {
      label: 'Trade Success Rate',
      value: totalTrades > 0 ? `${((successfulTrades / totalTrades) * 100).toFixed(1)}%` : '0%',
      subValue: `${successfulTrades}/${totalTrades} trades`,
      icon: Clock,
      color: 'text-accent'
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.label} className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className={`mt-1 text-2xl font-mono font-semibold ${stat.color}`}>
                  {stat.value}
                </p>
                {stat.subValue && (
                  <p className="mt-0.5 text-xs text-muted-foreground">{stat.subValue}</p>
                )}
              </div>
              <div className={`rounded-lg bg-secondary p-2 ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
