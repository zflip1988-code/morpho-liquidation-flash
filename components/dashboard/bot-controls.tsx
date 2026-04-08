'use client'

import { useEffect, useRef } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Play, Square, Settings, Zap, AlertTriangle } from 'lucide-react'
import { useBotStore } from '@/lib/solana/store'
import { scanForOpportunities } from '@/lib/solana/jupiter'
import { executeFlashLoanArbitrage } from '@/lib/solana/flash-loan'
import { POPULAR_TOKENS } from '@/lib/solana/types'
import type { TradeHistory } from '@/lib/solana/types'

export function BotControls() {
  const { publicKey, signTransaction, connected } = useWallet()
  const { connection } = useConnection()
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  const {
    config,
    setConfig,
    isRunning,
    setIsRunning,
    setOpportunities,
    opportunities,
    updateOpportunityStatus,
    addTrade,
    setIsScanning,
    setLastScanTime,
    updateStats
  } = useBotStore()

  // Auto-execute loop
  useEffect(() => {
    if (!isRunning || !connected || !publicKey || !signTransaction) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      return
    }

    const runBot = async () => {
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

        // Auto-execute if enabled
        if (config.autoExecute && newOpportunities.length > 0) {
          const bestOpp = newOpportunities[0]
          if (bestOpp.profitPercentage >= config.minProfitThreshold) {
            updateOpportunityStatus(bestOpp.id, 'executing')

            const result = await executeFlashLoanArbitrage(
              bestOpp,
              publicKey.toString(),
              signTransaction,
              connection
            )

            const trade: TradeHistory = {
              id: `trade-${Date.now()}`,
              timestamp: Date.now(),
              inputToken: bestOpp.inputToken,
              outputToken: bestOpp.outputToken,
              inputAmount: bestOpp.inputAmount,
              outputAmount: result.success ? bestOpp.inputAmount + (result.profit || 0) : 0,
              profit: result.profit || 0,
              profitPercentage: result.success ? bestOpp.profitPercentage : 0,
              txSignature: result.signature || '',
              status: result.success ? 'success' : 'failed',
              flashLoanAmount: bestOpp.inputAmount,
              gasUsed: bestOpp.estimatedGas
            }

            addTrade(trade)
            updateOpportunityStatus(bestOpp.id, result.success ? 'completed' : 'failed')
            updateStats()
          }
        }
      } catch (error) {
        console.error('Bot error:', error)
      } finally {
        setIsScanning(false)
      }
    }

    // Run immediately
    runBot()

    // Then run every 30 seconds
    intervalRef.current = setInterval(runBot, 30000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [isRunning, connected, publicKey, signTransaction, config, connection])

  const handleToggleBot = () => {
    if (!connected) return
    setIsRunning(!isRunning)
  }

  const handleTokenToggle = (address: string) => {
    const current = config.selectedTokens
    const updated = current.includes(address)
      ? current.filter(t => t !== address)
      : [...current, address]
    setConfig({ selectedTokens: updated })
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <Settings className="h-5 w-5" />
            Bot Configuration
          </CardTitle>
          <Button
            onClick={handleToggleBot}
            disabled={!connected}
            variant={isRunning ? 'destructive' : 'default'}
            className="gap-2"
          >
            {isRunning ? (
              <>
                <Square className="h-4 w-4" />
                Stop Bot
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Start Bot
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Warning Banner */}
        <div className="flex items-start gap-3 rounded-lg border border-chart-3/30 bg-chart-3/10 p-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-chart-3" />
          <div className="text-sm">
            <p className="font-medium text-chart-3">Risk Warning</p>
            <p className="mt-1 text-muted-foreground">
              Flash loan arbitrage involves significant risks. Only trade with amounts you can afford to lose.
              Failed transactions may still incur gas fees.
            </p>
          </div>
        </div>

        {/* Flash Loan Amount */}
        <div className="space-y-2">
          <Label htmlFor="flashLoanAmount">Flash Loan Amount (SOL)</Label>
          <Input
            id="flashLoanAmount"
            type="number"
            min="1"
            max="1000"
            step="1"
            value={config.flashLoanAmount}
            onChange={(e) => setConfig({ flashLoanAmount: Number(e.target.value) })}
            className="font-mono"
            disabled={isRunning}
          />
          <p className="text-xs text-muted-foreground">
            Amount to borrow for each arbitrage trade (fee: 0.09%)
          </p>
        </div>

        {/* Min Profit Threshold */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Minimum Profit Threshold</Label>
            <span className="text-sm font-mono text-primary">{config.minProfitThreshold}%</span>
          </div>
          <Slider
            value={[config.minProfitThreshold]}
            onValueChange={(v) => setConfig({ minProfitThreshold: v[0] })}
            min={0.1}
            max={5}
            step={0.1}
            disabled={isRunning}
          />
          <p className="text-xs text-muted-foreground">
            Only execute trades with profit above this percentage
          </p>
        </div>

        {/* Max Slippage */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Maximum Slippage</Label>
            <span className="text-sm font-mono text-foreground">{config.maxSlippage}%</span>
          </div>
          <Slider
            value={[config.maxSlippage]}
            onValueChange={(v) => setConfig({ maxSlippage: v[0] })}
            min={0.1}
            max={5}
            step={0.1}
            disabled={isRunning}
          />
        </div>

        {/* Auto Execute */}
        <div className="flex items-center justify-between rounded-lg border border-border p-3">
          <div className="flex items-center gap-3">
            <Zap className="h-5 w-5 text-primary" />
            <div>
              <p className="text-sm font-medium">Auto Execute</p>
              <p className="text-xs text-muted-foreground">
                Automatically execute profitable opportunities
              </p>
            </div>
          </div>
          <Switch
            checked={config.autoExecute}
            onCheckedChange={(checked) => setConfig({ autoExecute: checked })}
            disabled={isRunning}
          />
        </div>

        {/* Token Selection */}
        <div className="space-y-3">
          <Label>Tokens to Monitor</Label>
          <div className="flex flex-wrap gap-2">
            {POPULAR_TOKENS.map((token) => (
              <Badge
                key={token.address}
                variant={config.selectedTokens.includes(token.address) ? 'default' : 'outline'}
                className={`cursor-pointer transition-colors ${
                  config.selectedTokens.includes(token.address)
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-secondary'
                } ${isRunning ? 'pointer-events-none opacity-50' : ''}`}
                onClick={() => !isRunning && handleTokenToggle(token.address)}
              >
                {token.symbol}
              </Badge>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Select tokens to scan for arbitrage opportunities
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
