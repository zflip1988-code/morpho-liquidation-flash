'use client'

import { useEffect, useState } from 'react'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js'
import { getAssociatedTokenAddress, getAccount } from '@solana/spl-token'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react'
import { POPULAR_TOKENS } from '@/lib/solana/types'
import type { PortfolioBalance } from '@/lib/solana/types'

// Approximate prices (in production, fetch from API)
const TOKEN_PRICES: Record<string, number> = {
  SOL: 145,
  USDC: 1,
  USDT: 1,
  mSOL: 160,
  BONK: 0.000025,
  JUP: 1.2,
  ETH: 3200,
  stSOL: 155
}

export function Portfolio() {
  const { publicKey, connected } = useWallet()
  const { connection } = useConnection()
  const [balances, setBalances] = useState<PortfolioBalance[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchBalances() {
      if (!publicKey || !connected) {
        setBalances([])
        return
      }

      setLoading(true)

      try {
        const portfolioBalances: PortfolioBalance[] = []

        // Get SOL balance
        const solBalance = await connection.getBalance(publicKey)
        const solToken = POPULAR_TOKENS.find(t => t.symbol === 'SOL')!
        portfolioBalances.push({
          token: solToken,
          balance: solBalance / LAMPORTS_PER_SOL,
          usdValue: (solBalance / LAMPORTS_PER_SOL) * TOKEN_PRICES.SOL,
          change24h: 2.5 // Mock 24h change
        })

        // Get SPL token balances
        for (const token of POPULAR_TOKENS.filter(t => t.symbol !== 'SOL')) {
          try {
            const tokenMint = new PublicKey(token.address)
            const ata = await getAssociatedTokenAddress(tokenMint, publicKey)

            try {
              const accountInfo = await getAccount(connection, ata)
              const balance = Number(accountInfo.amount) / Math.pow(10, token.decimals)

              if (balance > 0) {
                portfolioBalances.push({
                  token,
                  balance,
                  usdValue: balance * (TOKEN_PRICES[token.symbol] || 0),
                  change24h: Math.random() * 10 - 5 // Mock 24h change
                })
              }
            } catch {
              // Token account doesn't exist, skip
            }
          } catch (error) {
            console.error(`Error fetching ${token.symbol} balance:`, error)
          }
        }

        setBalances(portfolioBalances)
      } catch (error) {
        console.error('Error fetching balances:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBalances()
    const interval = setInterval(fetchBalances, 30000)
    return () => clearInterval(interval)
  }, [publicKey, connected, connection])

  const totalValue = balances.reduce((acc, b) => acc + b.usdValue, 0)

  if (!connected) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <Wallet className="h-5 w-5" />
            Portfolio
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Wallet className="mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Connect your wallet to view portfolio</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg font-medium">
            <Wallet className="h-5 w-5" />
            Portfolio
          </CardTitle>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="text-lg font-mono font-semibold text-foreground">
              ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : balances.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <p className="text-muted-foreground">No tokens found</p>
          </div>
        ) : (
          <div className="space-y-3">
            {balances.map((balance) => (
              <div
                key={balance.token.address}
                className="flex items-center justify-between rounded-lg border border-border p-3"
              >
                <div className="flex items-center gap-3">
                  {balance.token.logoURI && (
                    <img
                      src={balance.token.logoURI}
                      alt={balance.token.symbol}
                      className="h-8 w-8 rounded-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  <div>
                    <p className="font-medium">{balance.token.symbol}</p>
                    <p className="text-xs text-muted-foreground">{balance.token.name}</p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="font-mono text-sm">
                    {balance.balance.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 6
                    })}
                  </p>
                  <div className="flex items-center justify-end gap-1">
                    <span className="text-xs text-muted-foreground">
                      ${balance.usdValue.toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                    <span className={`flex items-center text-xs ${
                      balance.change24h >= 0 ? 'text-primary' : 'text-destructive'
                    }`}>
                      {balance.change24h >= 0 ? (
                        <TrendingUp className="h-3 w-3 mr-0.5" />
                      ) : (
                        <TrendingDown className="h-3 w-3 mr-0.5" />
                      )}
                      {Math.abs(balance.change24h).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
