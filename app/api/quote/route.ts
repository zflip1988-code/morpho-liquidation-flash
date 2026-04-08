import { NextRequest, NextResponse } from 'next/server'
import { getJupiterQuote, findArbitrageOpportunity } from '@/lib/solana/jupiter'
import { POPULAR_TOKENS } from '@/lib/solana/types'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const inputMint = searchParams.get('inputMint')
    const outputMint = searchParams.get('outputMint')
    const amount = searchParams.get('amount')

    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: inputMint, outputMint, amount'
        },
        { status: 400 }
      )
    }

    const quote = await getJupiterQuote(inputMint, outputMint, Number(amount))

    if (!quote) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get quote from Jupiter'
        },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      quote
    })
  } catch (error) {
    console.error('Quote API Error:', error)
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
    const { inputToken, outputToken, amount = 10, minProfit = 0.5 } = body

    // Find tokens by symbol or address
    const baseToken = POPULAR_TOKENS.find(
      t => t.symbol === inputToken || t.address === inputToken
    )
    const quoteToken = POPULAR_TOKENS.find(
      t => t.symbol === outputToken || t.address === outputToken
    )

    if (!baseToken || !quoteToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid input or output token'
        },
        { status: 400 }
      )
    }

    const opportunity = await findArbitrageOpportunity(
      baseToken,
      quoteToken,
      amount,
      minProfit
    )

    if (!opportunity) {
      return NextResponse.json({
        success: true,
        profitable: false,
        message: 'No profitable arbitrage opportunity found for this pair'
      })
    }

    return NextResponse.json({
      success: true,
      profitable: true,
      opportunity
    })
  } catch (error) {
    console.error('Quote API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
