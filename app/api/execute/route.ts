import { NextRequest, NextResponse } from 'next/server'
import { getJupiterQuote, getSwapTransaction } from '@/lib/solana/jupiter'
import { calculateRequiredRepayment } from '@/lib/solana/flash-loan'
import { POPULAR_TOKENS, FLASH_LOAN_MASTERY_CONFIG } from '@/lib/solana/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { inputToken, outputToken, amount, walletAddress } = body

    if (!inputToken || !outputToken || !amount || !walletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required parameters: inputToken, outputToken, amount, walletAddress'
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
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get forward swap quote'
        },
        { status: 404 }
      )
    }

    // Get reverse quote
    const reverseQuote = await getJupiterQuote(
      quoteToken.address,
      baseToken.address,
      Number(forwardQuote.outAmount)
    )

    if (!reverseQuote) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to get reverse swap quote'
        },
        { status: 404 }
      )
    }

    // Calculate profit
    const finalAmount = Number(reverseQuote.outAmount) / decimals
    const profit = finalAmount - amount
    const flashLoanFee = amount * FLASH_LOAN_MASTERY_CONFIG.feeRate
    const netProfit = profit - flashLoanFee
    const profitPercentage = (netProfit / amount) * 100

    // Get swap transactions
    const forwardSwapTx = await getSwapTransaction(forwardQuote, walletAddress)
    const reverseSwapTx = await getSwapTransaction(reverseQuote, walletAddress)

    if (!forwardSwapTx || !reverseSwapTx) {
      return NextResponse.json(
        {
          success: false,
          error: 'Failed to build swap transactions'
        },
        { status: 500 }
      )
    }

    // Return the transactions for client-side signing
    return NextResponse.json({
      success: true,
      data: {
        forwardSwapTx,
        reverseSwapTx,
        calculations: {
          inputAmount: amount,
          expectedOutput: finalAmount,
          profit: netProfit,
          profitPercentage,
          flashLoanFee,
          requiredRepayment: calculateRequiredRepayment(amount)
        },
        flashLoanConfig: {
          programId: FLASH_LOAN_MASTERY_CONFIG.programId,
          poolAddress: FLASH_LOAN_MASTERY_CONFIG.poolAddress,
          feeRate: FLASH_LOAN_MASTERY_CONFIG.feeRate
        }
      }
    })
  } catch (error) {
    console.error('Execute API Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
