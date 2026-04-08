'use client'

import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Spinner } from '@/components/ui/spinner'
import { ArrowRight, Play, RefreshCw, AlertCircle } from 'lucide-react'
import { useBotStore } from '@/lib/solana/store'
import { scanForOpportunities } from '@/lib/solana/jupiter'
import { executeFlashLoanArbitrage, simulateArbitrage } from '@/lib/solana/flash-loan'
import { POPULAR_TOKENS } from '@/lib/solana/types'
import type { ArbitrageOpportunity, TradeHistory } from '@/lib/solana/types'

export function OpportunitiesTable() {
  const { publicKey, signTransaction, connected } = useWallet()
  const { connection } = useConnection()
  const {
    opportunities,
    setOpportunities,
    updateOpportunityStatus,
    addTrade,
    isScanning,
    setIsScanning,
    setLastScanTime,
    config,
    updateStats
  } = useBotStore()

  const handleScan = async () => {
    if (!connected) return

    setIsScanning(true)
    try {
      const selectedTokens = POPULAR_TOKENS.filter(t =>
        config.selectedTokens.includes(t.address)
      )

      const newOpportunities = await scanForOpportunities(
        selectedTokens,
        config.flashLoanAmount,
        config.minProfitThreshold
      )

      setOpportunities(newOpportunities)
      setLastScanTime(Date.now())
    } catch (error) {
      console.error('Scan error:', error)
    } finally {
      setIsScanning(false)
    }
  }

  const handleExecute = async (opportunity: ArbitrageOpportunity) => {
    if (!publicKey || !signTransaction) return

    updateOpportunityStatus(opportunity.id, 'executing')

    try {
      // First simulate to verify profitability
      const simulation = await simulateArbitrage(
        opportunity,
        publicKey.toString(),
        connection
      )

      if (!simulation.success) {
        updateOpportunityStatus(opportunity.id, 'failed')
        const failedTrade: TradeHistory = {
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          inputToken: opportunity.inputToken,
          outputToken: opportunity.outputToken,
          inputAmount: opportunity.inputAmount,
          outputAmount: 0,
          profit: 0,
          profitPercentage: 0,
          txSignature: '',
          status: 'failed',
          flashLoanAmount: opportunity.inputAmount,
          gasUsed: 0
        }
        addTrade(failedTrade)
        updateStats()
        return
      }

      // Execute the actual arbitrage
      const result = await executeFlashLoanArbitrage(
        opportunity,
        publicKey.toString(),
        signTransaction,
        connection
      )

      if (result.success) {
        updateOpportunityStatus(opportunity.id, 'completed')
        const successTrade: TradeHistory = {
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          inputToken: opportunity.inputToken,
          outputToken: opportunity.outputToken,
          inputAmount: opportunity.inputAmount,
          outputAmount: opportunity.inputAmount + (result.profit || 0),
          profit: result.profit || 0,
          profitPercentage: opportunity.profitPercentage,
          txSignature: result.signature || '',
          status: 'success',
          flashLoanAmount: opportunity.inputAmount,
          gasUsed: opportunity.estimatedGas
        }
        addTrade(successTrade)
      } else {
        updateOpportunityStatus(opportunity.id, 'failed')
        const failedTrade: TradeHistory = {
          id: `trade-${Date.now()}`,
          timestamp: Date.now(),
          inputToken: opportunity.inputToken,
          outputToken: opportunity.outputToken,
          inputAmount: opportunity.inputAmount,
          outputAmount: 0,
          profit: 0,
          profitPercentage: 0,
          txSignature: '',
          status: 'failed',
          flashLoanAmount: opportunity.inputAmount,
          gasUsed: 0
        }
        addTrade(failedTrade)
      }
      updateStats()
    } catch (error) {
      console.error('Execution error:', error)
      updateOpportunityStatus(opportunity.id, 'failed')
    }
  }

  const getStatusBadge = (status: ArbitrageOpportunity['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline" className="border-primary/50 text-primary">Pending</Badge>
      case 'executing':
        return <Badge variant="outline" className="border-chart-3/50 text-chart-3">Executing</Badge>
      case 'completed':
        return <Badge variant="outline" className="border-primary/50 text-primary">Completed</Badge>
      case 'failed':
        return <Badge variant="outline" className="border-destructive/50 text-destructive">Failed</Badge>
    }
  }

  const pendingOpportunities = opportunities.filter(o => o.status === 'pending')

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <CardTitle className="text-lg font-medium">Arbitrage Opportunities</CardTitle>
        <Button
          onClick={handleScan}
          disabled={!connected || isScanning}
          size="sm"
          className="gap-2"
        >
          {isScanning ? (
            <>
              <Spinner className="h-4 w-4" />
              Scanning...
            </>
          ) : (
            <>
              <RefreshCw className="h-4 w-4" />
              Scan for Opportunities
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {!connected ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <AlertCircle className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Connect your wallet to scan for opportunities</p>
          </div>
        ) : pendingOpportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <RefreshCw className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No opportunities found</p>
            <p className="mt-1 text-sm text-muted-foreground">Click scan to search for arbitrage opportunities</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-sm text-muted-foreground">
                  <th className="pb-3 font-medium">Pair</th>
                  <th className="pb-3 font-medium">Route</th>
                  <th className="pb-3 font-medium text-right">Amount</th>
                  <th className="pb-3 font-medium text-right">Expected Profit</th>
                  <th className="pb-3 font-medium text-right">Profit %</th>
                  <th className="pb-3 font-medium text-center">Status</th>
                  <th className="pb-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {pendingOpportunities.map((opp) => (
                  <tr key={opp.id} className="border-b border-border/50 last:border-0">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{opp.inputToken.symbol}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{opp.outputToken.symbol}</span>
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        {opp.route.slice(0, 3).map((r, i) => (
                          <span key={i}>
                            {r.dex}
                            {i < Math.min(opp.route.length - 1, 2) && ' → '}
                          </span>
                        ))}
                        {opp.route.length > 3 && <span>+{opp.route.length - 3}</span>}
                      </div>
                    </td>
                    <td className="py-3 text-right font-mono">
                      {opp.inputAmount.toFixed(4)} {opp.inputToken.symbol}
                    </td>
                    <td className="py-3 text-right font-mono text-primary">
                      +{opp.expectedProfit.toFixed(6)} {opp.inputToken.symbol}
                    </td>
                    <td className="py-3 text-right font-mono text-primary">
                      +{opp.profitPercentage.toFixed(3)}%
                    </td>
                    <td className="py-3 text-center">
                      {getStatusBadge(opp.status)}
                    </td>
                    <td className="py-3 text-right">
                      <Button
                        size="sm"
                        onClick={() => handleExecute(opp)}
                        disabled={opp.status !== 'pending'}
                        className="gap-1"
                      >
                        <Play className="h-3 w-3" />
                        Execute
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
