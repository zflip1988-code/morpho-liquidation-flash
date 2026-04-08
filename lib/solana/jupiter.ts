import type { TokenInfo, SwapRoute, ArbitrageOpportunity } from './types'
import { POPULAR_TOKENS, FLASH_LOAN_MASTERY_CONFIG } from './types'

const JUPITER_API_BASE = 'https://quote-api.jup.ag/v6'

export interface JupiterQuote {
  inputMint: string
  inAmount: string
  outputMint: string
  outAmount: string
  otherAmountThreshold: string
  swapMode: string
  slippageBps: number
  priceImpactPct: string
  routePlan: JupiterRoutePlan[]
}

interface JupiterRoutePlan {
  swapInfo: {
    ammKey: string
    label: string
    inputMint: string
    outputMint: string
    inAmount: string
    outAmount: string
    feeAmount: string
    feeMint: string
  }
  percent: number
}

export async function getJupiterQuote(
  inputMint: string,
  outputMint: string,
  amount: number,
  slippageBps: number = 50
): Promise<JupiterQuote | null> {
  try {
    const url = new URL(`${JUPITER_API_BASE}/quote`)
    url.searchParams.set('inputMint', inputMint)
    url.searchParams.set('outputMint', outputMint)
    url.searchParams.set('amount', amount.toString())
    url.searchParams.set('slippageBps', slippageBps.toString())
    url.searchParams.set('onlyDirectRoutes', 'false')

    const response = await fetch(url.toString())
    if (!response.ok) return null

    return await response.json()
  } catch (error) {
    console.error('Jupiter quote error:', error)
    return null
  }
}

export async function getSwapTransaction(
  quoteResponse: JupiterQuote,
  userPublicKey: string
): Promise<string | null> {
  try {
    const response = await fetch(`${JUPITER_API_BASE}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto'
      })
    })

    if (!response.ok) return null

    const { swapTransaction } = await response.json()
    return swapTransaction
  } catch (error) {
    console.error('Jupiter swap transaction error:', error)
    return null
  }
}

export function parseRoutePlan(routePlan: JupiterRoutePlan[]): SwapRoute[] {
  return routePlan.map(route => {
    const inputToken = POPULAR_TOKENS.find(t => t.address === route.swapInfo.inputMint)
    const outputToken = POPULAR_TOKENS.find(t => t.address === route.swapInfo.outputMint)

    return {
      dex: route.swapInfo.label,
      inputToken: inputToken?.symbol || route.swapInfo.inputMint.slice(0, 8),
      outputToken: outputToken?.symbol || route.swapInfo.outputMint.slice(0, 8),
      inputAmount: Number(route.swapInfo.inAmount),
      outputAmount: Number(route.swapInfo.outAmount),
      priceImpact: 0
    }
  })
}

export async function findArbitrageOpportunity(
  baseToken: TokenInfo,
  quoteToken: TokenInfo,
  amount: number,
  minProfitPercentage: number = 0.5
): Promise<ArbitrageOpportunity | null> {
  try {
    // Get forward quote: base -> quote
    const baseDecimals = Math.pow(10, baseToken.decimals)
    const inputAmount = Math.floor(amount * baseDecimals)

    const forwardQuote = await getJupiterQuote(
      baseToken.address,
      quoteToken.address,
      inputAmount
    )

    if (!forwardQuote) return null

    // Get reverse quote: quote -> base (to complete the arbitrage loop)
    const reverseQuote = await getJupiterQuote(
      quoteToken.address,
      baseToken.address,
      Number(forwardQuote.outAmount)
    )

    if (!reverseQuote) return null

    // Calculate profit
    const finalAmount = Number(reverseQuote.outAmount) / baseDecimals
    const profit = finalAmount - amount
    const flashLoanFee = amount * FLASH_LOAN_MASTERY_CONFIG.feeRate
    const netProfit = profit - flashLoanFee
    const profitPercentage = (netProfit / amount) * 100

    // Check if profitable
    if (profitPercentage < minProfitPercentage) return null

    const routes: SwapRoute[] = [
      ...parseRoutePlan(forwardQuote.routePlan),
      ...parseRoutePlan(reverseQuote.routePlan)
    ]

    return {
      id: `arb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      inputToken: baseToken,
      outputToken: quoteToken,
      inputAmount: amount,
      expectedProfit: netProfit,
      profitPercentage,
      route: routes,
      timestamp: Date.now(),
      status: 'pending',
      flashLoanFee,
      estimatedGas: 0.002 // ~0.002 SOL estimated
    }
  } catch (error) {
    console.error('Arbitrage detection error:', error)
    return null
  }
}

export async function scanForOpportunities(
  tokens: TokenInfo[],
  baseAmount: number = 10,
  minProfitPercentage: number = 0.5
): Promise<ArbitrageOpportunity[]> {
  const opportunities: ArbitrageOpportunity[] = []
  const pairs: [TokenInfo, TokenInfo][] = []

  // Generate token pairs
  for (let i = 0; i < tokens.length; i++) {
    for (let j = i + 1; j < tokens.length; j++) {
      pairs.push([tokens[i], tokens[j]])
    }
  }

  // Check each pair concurrently (with rate limiting)
  const batchSize = 3
  for (let i = 0; i < pairs.length; i += batchSize) {
    const batch = pairs.slice(i, i + batchSize)
    const results = await Promise.all(
      batch.map(([base, quote]) =>
        findArbitrageOpportunity(base, quote, baseAmount, minProfitPercentage)
      )
    )

    for (const result of results) {
      if (result) {
        opportunities.push(result)
      }
    }

    // Rate limit: wait 200ms between batches
    if (i + batchSize < pairs.length) {
      await new Promise(resolve => setTimeout(resolve, 200))
    }
  }

  // Sort by profit percentage (highest first)
  return opportunities.sort((a, b) => b.profitPercentage - a.profitPercentage)
}
