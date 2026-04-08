'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { TrendingUp } from 'lucide-react'
import { useBotStore } from '@/lib/solana/store'

export function ProfitChart() {
  const { tradeHistory, totalProfit } = useBotStore()

  const chartData = useMemo(() => {
    if (tradeHistory.length === 0) {
      // Generate placeholder data
      return Array.from({ length: 12 }, (_, i) => ({
        time: new Date(Date.now() - (11 - i) * 3600000).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        profit: 0,
        cumulative: 0
      }))
    }

    // Sort trades by timestamp (oldest first)
    const sortedTrades = [...tradeHistory].sort((a, b) => a.timestamp - b.timestamp)

    let cumulative = 0
    return sortedTrades.map(trade => {
      cumulative += trade.status === 'success' ? trade.profit : 0
      return {
        time: new Date(trade.timestamp).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        profit: trade.status === 'success' ? trade.profit : 0,
        cumulative
      }
    })
  }, [tradeHistory])

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <TrendingUp className="h-5 w-5" />
            Profit Over Time
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Cumulative Profit</p>
            <p className={`text-lg font-mono font-semibold ${
              totalProfit >= 0 ? 'text-primary' : 'text-destructive'
            }`}>
              {totalProfit >= 0 ? '+' : ''}{totalProfit.toFixed(4)} SOL
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="oklch(0.65 0.2 145)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="oklch(0.65 0.2 145)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="time"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'oklch(0.65 0 0)', fontSize: 11 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'oklch(0.65 0 0)', fontSize: 11 }}
                tickFormatter={(value) => `${value.toFixed(3)}`}
                dx={-10}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'oklch(0.16 0.015 260)',
                  border: '1px solid oklch(0.25 0.02 260)',
                  borderRadius: '8px',
                  padding: '8px 12px'
                }}
                labelStyle={{ color: 'oklch(0.95 0 0)', marginBottom: '4px' }}
                itemStyle={{ color: 'oklch(0.65 0.2 145)' }}
                formatter={(value: number) => [`${value.toFixed(6)} SOL`, 'Cumulative']}
              />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke="oklch(0.65 0.2 145)"
                strokeWidth={2}
                fill="url(#profitGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}
