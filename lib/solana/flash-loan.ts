import {
  Connection,
  PublicKey,
  Transaction,
  TransactionInstruction,
  SystemProgram,
  LAMPORTS_PER_SOL
} from '@solana/web3.js'
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token'
import type { ArbitrageOpportunity } from './types'
import { FLASH_LOAN_MASTERY_CONFIG } from './types'
import { getJupiterQuote, getSwapTransaction } from './jupiter'

const FLASH_LOAN_PROGRAM_ID = new PublicKey(FLASH_LOAN_MASTERY_CONFIG.programId)
const FLASH_LOAN_POOL = new PublicKey(FLASH_LOAN_MASTERY_CONFIG.poolAddress)

// Flash Loan Mastery instruction discriminators
const BORROW_INSTRUCTION = Buffer.from([0]) // Borrow instruction
const REPAY_INSTRUCTION = Buffer.from([1])  // Repay instruction

export interface FlashLoanResult {
  success: boolean
  signature?: string
  error?: string
  profit?: number
}

export async function createBorrowInstruction(
  borrower: PublicKey,
  tokenMint: PublicKey,
  amount: bigint,
  connection: Connection
): Promise<TransactionInstruction> {
  const borrowerTokenAccount = await getAssociatedTokenAddress(tokenMint, borrower)
  const poolTokenAccount = await getAssociatedTokenAddress(tokenMint, FLASH_LOAN_POOL, true)

  // Encode amount as little-endian u64
  const amountBuffer = Buffer.alloc(8)
  amountBuffer.writeBigUInt64LE(amount)

  const data = Buffer.concat([BORROW_INSTRUCTION, amountBuffer])

  return new TransactionInstruction({
    programId: FLASH_LOAN_PROGRAM_ID,
    keys: [
      { pubkey: borrower, isSigner: true, isWritable: true },
      { pubkey: FLASH_LOAN_POOL, isSigner: false, isWritable: true },
      { pubkey: poolTokenAccount, isSigner: false, isWritable: true },
      { pubkey: borrowerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data
  })
}

export async function createRepayInstruction(
  borrower: PublicKey,
  tokenMint: PublicKey,
  amount: bigint,
  fee: bigint,
  connection: Connection
): Promise<TransactionInstruction> {
  const borrowerTokenAccount = await getAssociatedTokenAddress(tokenMint, borrower)
  const poolTokenAccount = await getAssociatedTokenAddress(tokenMint, FLASH_LOAN_POOL, true)

  // Encode amount + fee as little-endian u64
  const amountBuffer = Buffer.alloc(8)
  amountBuffer.writeBigUInt64LE(amount)
  const feeBuffer = Buffer.alloc(8)
  feeBuffer.writeBigUInt64LE(fee)

  const data = Buffer.concat([REPAY_INSTRUCTION, amountBuffer, feeBuffer])

  return new TransactionInstruction({
    programId: FLASH_LOAN_PROGRAM_ID,
    keys: [
      { pubkey: borrower, isSigner: true, isWritable: true },
      { pubkey: FLASH_LOAN_POOL, isSigner: false, isWritable: true },
      { pubkey: poolTokenAccount, isSigner: false, isWritable: true },
      { pubkey: borrowerTokenAccount, isSigner: false, isWritable: true },
      { pubkey: tokenMint, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    ],
    data
  })
}

export async function executeFlashLoanArbitrage(
  opportunity: ArbitrageOpportunity,
  walletPublicKey: string,
  signTransaction: (tx: Transaction) => Promise<Transaction>,
  connection: Connection
): Promise<FlashLoanResult> {
  try {
    const borrower = new PublicKey(walletPublicKey)
    const inputMint = new PublicKey(opportunity.inputToken.address)
    const outputMint = new PublicKey(opportunity.outputToken.address)

    const decimals = Math.pow(10, opportunity.inputToken.decimals)
    const borrowAmount = BigInt(Math.floor(opportunity.inputAmount * decimals))
    const feeAmount = BigInt(Math.floor(opportunity.flashLoanFee * decimals))

    // 1. Create borrow instruction
    const borrowIx = await createBorrowInstruction(
      borrower,
      inputMint,
      borrowAmount,
      connection
    )

    // 2. Get Jupiter swap transactions
    // First swap: input -> output
    const forwardQuote = await getJupiterQuote(
      opportunity.inputToken.address,
      opportunity.outputToken.address,
      Number(borrowAmount)
    )

    if (!forwardQuote) {
      return { success: false, error: 'Failed to get forward swap quote' }
    }

    const forwardSwapTx = await getSwapTransaction(forwardQuote, walletPublicKey)
    if (!forwardSwapTx) {
      return { success: false, error: 'Failed to get forward swap transaction' }
    }

    // Second swap: output -> input (completing the arbitrage)
    const reverseQuote = await getJupiterQuote(
      opportunity.outputToken.address,
      opportunity.inputToken.address,
      Number(forwardQuote.outAmount)
    )

    if (!reverseQuote) {
      return { success: false, error: 'Failed to get reverse swap quote' }
    }

    const reverseSwapTx = await getSwapTransaction(reverseQuote, walletPublicKey)
    if (!reverseSwapTx) {
      return { success: false, error: 'Failed to get reverse swap transaction' }
    }

    // 3. Create repay instruction (amount + fee)
    const repayIx = await createRepayInstruction(
      borrower,
      inputMint,
      borrowAmount,
      feeAmount,
      connection
    )

    // 4. Combine all into a single atomic transaction
    const transaction = new Transaction()

    // Add borrow instruction
    transaction.add(borrowIx)

    // Deserialize and add Jupiter swap instructions
    const forwardTx = Transaction.from(Buffer.from(forwardSwapTx, 'base64'))
    transaction.add(...forwardTx.instructions)

    const reverseTx = Transaction.from(Buffer.from(reverseSwapTx, 'base64'))
    transaction.add(...reverseTx.instructions)

    // Add repay instruction
    transaction.add(repayIx)

    // Get recent blockhash
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash()
    transaction.recentBlockhash = blockhash
    transaction.feePayer = borrower

    // Sign the transaction
    const signedTx = await signTransaction(transaction)

    // Send and confirm
    const signature = await connection.sendRawTransaction(signedTx.serialize(), {
      skipPreflight: false,
      preflightCommitment: 'confirmed'
    })

    await connection.confirmTransaction({
      signature,
      blockhash,
      lastValidBlockHeight
    }, 'confirmed')

    return {
      success: true,
      signature,
      profit: opportunity.expectedProfit
    }
  } catch (error) {
    console.error('Flash loan arbitrage execution error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export async function simulateArbitrage(
  opportunity: ArbitrageOpportunity,
  walletPublicKey: string,
  connection: Connection
): Promise<{ success: boolean; estimatedProfit: number; error?: string }> {
  try {
    // Simulate by checking if quotes are still valid
    const decimals = Math.pow(10, opportunity.inputToken.decimals)
    const inputAmount = Math.floor(opportunity.inputAmount * decimals)

    const forwardQuote = await getJupiterQuote(
      opportunity.inputToken.address,
      opportunity.outputToken.address,
      inputAmount
    )

    if (!forwardQuote) {
      return { success: false, estimatedProfit: 0, error: 'Forward quote unavailable' }
    }

    const reverseQuote = await getJupiterQuote(
      opportunity.outputToken.address,
      opportunity.inputToken.address,
      Number(forwardQuote.outAmount)
    )

    if (!reverseQuote) {
      return { success: false, estimatedProfit: 0, error: 'Reverse quote unavailable' }
    }

    const finalAmount = Number(reverseQuote.outAmount) / decimals
    const profit = finalAmount - opportunity.inputAmount - opportunity.flashLoanFee

    return {
      success: profit > 0,
      estimatedProfit: profit,
      error: profit <= 0 ? 'No longer profitable' : undefined
    }
  } catch (error) {
    return {
      success: false,
      estimatedProfit: 0,
      error: error instanceof Error ? error.message : 'Simulation failed'
    }
  }
}

export function calculateRequiredRepayment(
  borrowAmount: number,
  feeRate: number = FLASH_LOAN_MASTERY_CONFIG.feeRate
): number {
  return borrowAmount * (1 + feeRate)
}
