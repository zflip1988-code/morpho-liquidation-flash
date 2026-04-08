import { NextResponse } from 'next/server'
import { POPULAR_TOKENS, FLASH_LOAN_MASTERY_CONFIG } from '@/lib/solana/types'

export async function GET() {
  return NextResponse.json({
    success: true,
    tokens: POPULAR_TOKENS,
    flashLoanConfig: FLASH_LOAN_MASTERY_CONFIG,
    supportedDEXs: [
      'Raydium',
      'Orca',
      'Meteora',
      'Phoenix',
      'Lifinity',
      'Saber',
      'Mercurial'
    ]
  })
}
