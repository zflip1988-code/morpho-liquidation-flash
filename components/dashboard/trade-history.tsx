'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ArrowRight, ExternalLink, History, Trash2 } from 'lucide-react'
import { useBotStore } from '@/lib/solana/store'

export function TradeHistory() {
  const { tradeHistory, clearTradeHistory } = useBotStore()

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="flex items-center gap-2 text-lg font-medium">
          <History className="h-5 w-5" />
          Trade History
        </CardTitle>
        {tradeHistory.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearTradeHistory}
            className="gap-2 text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            Clear
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {tradeHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <History className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No trades yet</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your executed trades will appear here
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {tradeHistory.map((trade) => (
              <div
                key={trade.id}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{trade.inputToken.symbol}</span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{trade.outputToken.symbol}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {formatTime(trade.timestamp)}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-mono text-sm">
                      {trade.inputAmount.toFixed(4)} {trade.inputToken.symbol}
                    </p>
                    <p className={`font-mono text-xs ${
                      trade.status === 'success' ? 'text-primary' : 'text-destructive'
                    }`}>
                      {trade.status === 'success'
                        ? `+${trade.profit.toFixed(6)} (${trade.profitPercentage.toFixed(2)}%)`
                        : 'Failed'
                      }
                    </p>
                  </div>

                  <Badge
                    variant="outline"
                    className={
                      trade.status === 'success'
                        ? 'border-primary/50 text-primary'
                        : 'border-destructive/50 text-destructive'
                    }
                  >
                    {trade.status === 'success' ? 'Success' : 'Failed'}
                  </Badge>

                  {trade.txSignature && (
                    <a
                      href={`https://solscan.io/tx/${trade.txSignature}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
