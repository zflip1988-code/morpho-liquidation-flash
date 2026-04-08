import { NextRequest, NextResponse } from 'next/server'
import { getJupiterQuote } from '@/lib/solana/jupiter'
import { POPULAR_TOKENS, FLASH_LOAN_MASTERY_CONFIG } from '@/lib/solana/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { inputToken, outputToken, amount } = body

    if (!inputToken || !outputToken || !amount) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: inputToken, outputToken, amount'
        },
        { status: 400 }
      )
    }

    // Find tokens
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

    const decimals = Math.pow(10, baseToken.decimals)
    const inputAmount = Math.floor(amount * decimals)

    // Get forward quote
    const forwardQuote = await getJupiterQuote(
      baseToken.address,
      quoteToken.address,
      inputAmount
    )

    if (!forwardQuote) {
      return NextResponse.json({
        success: true,
        simulation: {
          profitable: false,
          error: 'Forward quote unavailable',
          inputAmount: amount,
          inputToken: baseToken.symbol,
          outputToken: quoteToken.symbol
        }
      })
    }

    // Get reverse quote
    const reverseQuote = await getJupiterQuote(
      quoteToken.address,
      baseToken.address,
      Number(forwardQuote.outAmount)
    )

    if (!reverseQuote) {
      return NextResponse.json({
        success: true,
        simulation: {
          profitable: false,
          error: 'Reverse quote unavailable',
          inputAmount: amount,
          inputToken: baseToken.symbol,
          outputToken: quoteToken.symbol,
          forwardOutput: Number(forwardQuote.outAmount) / Math.pow(10, quoteToken.decimals)
        }
      })
    }

    // Calculate profit
    const finalAmount = Number(reverseQuote.outAmount) / decimals
    const grossProfit = finalAmount - amount
    const flashLoanFee = amount * FLASH_LOAN_MASTERY_CONFIG.feeRate
    const estimatedGas = 0.002 // ~0.002 SOL
    const netProfit = grossProfit - flashLoanFee - estimatedGas
    const profitPercentage = (netProfit / amount) * 100

    return NextResponse.json({
      success: true,
      simulation: {
        profitable: netProfit > 0,
        inputAmount: amount,
        inputToken: baseToken.symbol,
        outputToken: quoteToken.symbol,
        forwardOutput: Number(forwardQuote.outAmount) / Math.pow(10, quoteToken.decimals),
        finalOutput: finalAmount,
        grossProfit,
        flashLoanFee,
        estimatedGas,
        netProfit,
        profitPercentage,
        forwardRoute: forwardQuote.routePlan.map(r => ({
          dex: r.swapInfo.label,
          percent: r.percent
        })),
        reverseRoute: reverseQuote.routePlan.map(r => ({
          dex: r.swapInfo.label,
          percent: r.percent
        }))
      }
    })
  } catch (error) {
    console.error('Simulate API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
