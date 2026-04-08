import { NextRequest, NextResponse } from 'next/server'
import { scanForOpportunities } from '@/lib/solana/jupiter'
import { POPULAR_TOKENS } from '@/lib/solana/types'
import type { TokenInfo } from '@/lib/solana/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const amount = Number(searchParams.get('amount')) || 10
    const minProfit = Number(searchParams.get('minProfit')) || 0.5
    const tokensParam = searchParams.get('tokens')

    let selectedTokens: TokenInfo[] = POPULAR_TOKENS.slice(0, 4)

    if (tokensParam) {
      const tokenAddresses = tokensParam.split(',')
      selectedTokens = POPULAR_TOKENS.filter(t =>
        tokenAddresses.includes(t.address)
      )
    }

    const opportunities = await scanForOpportunities(
      selectedTokens,
      amount,
      minProfit
    )

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      count: opportunities.length,
      opportunities
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tokens, amount = 10, minProfit = 0.5 } = body

    let selectedTokens: TokenInfo[] = POPULAR_TOKENS.slice(0, 4)

    if (tokens && Array.isArray(tokens)) {
      selectedTokens = POPULAR_TOKENS.filter(t =>
        tokens.includes(t.address) || tokens.includes(t.symbol)
      )
    }

    const opportunities = await scanForOpportunities(
      selectedTokens,
      amount,
      minProfit
    )

    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      count: opportunities.length,
      opportunities
    })
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
