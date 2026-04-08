export interface TokenInfo {
  address: string
  symbol: string
  name: string
  decimals: number
  logoURI?: string
}

export interface ArbitrageOpportunity {
  id: string
  inputToken: TokenInfo
  outputToken: TokenInfo
  inputAmount: number
  expectedProfit: number
  profitPercentage: number
  route: SwapRoute[]
  timestamp: number
  status: 'pending' | 'executing' | 'completed' | 'failed'
  flashLoanFee: number
  estimatedGas: number
}

export interface SwapRoute {
  dex: string
  inputToken: string
  outputToken: string
  inputAmount: number
  outputAmount: number
  priceImpact: number
}

export interface TradeHistory {
  id: string
  timestamp: number
  inputToken: TokenInfo
  outputToken: TokenInfo
  inputAmount: number
  outputAmount: number
  profit: number
  profitPercentage: number
  txSignature: string
  status: 'success' | 'failed'
  flashLoanAmount: number
  gasUsed: number
}

export interface PortfolioBalance {
  token: TokenInfo
  balance: number
  usdValue: number
  change24h: number
}

export interface BotConfig {
  minProfitThreshold: number
  maxSlippage: number
  flashLoanAmount: number
  autoExecute: boolean
  selectedTokens: string[]
  rpcEndpoint: string
}

export interface FlashLoanMasteryConfig {
  programId: string
  poolAddress: string
  feeRate: number
}

export const POPULAR_TOKENS: TokenInfo[] = [
  {
    address: 'So11111111111111111111111111111111111111112',
    symbol: 'SOL',
    name: 'Solana',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png'
  },
  {
    address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png'
  },
  {
    address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.svg'
  },
  {
    address: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
    symbol: 'mSOL',
    name: 'Marinade Staked SOL',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png'
  },
  {
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    symbol: 'BONK',
    name: 'Bonk',
    decimals: 5,
    logoURI: 'https://arweave.net/hQiPZOsRZXGXBJd_82PhVdlM_hACsT_q6wqwf5cSY7I'
  },
  {
    address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    symbol: 'JUP',
    name: 'Jupiter',
    decimals: 6,
    logoURI: 'https://static.jup.ag/jup/icon.png'
  },
  {
    address: '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
    symbol: 'ETH',
    name: 'Wrapped Ether (Wormhole)',
    decimals: 8,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs/logo.png'
  },
  {
    address: '7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj',
    symbol: 'stSOL',
    name: 'Lido Staked SOL',
    decimals: 9,
    logoURI: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/7dHbWXmci3dT8UFYWYZweBLXgycu7Y3iL6trKn1Y7ARj/logo.png'
  }
]

export const FLASH_LOAN_MASTERY_CONFIG: FlashLoanMasteryConfig = {
  programId: 'F1aShdFvR4pjE1KtvqfBqsXcNT5vNwwbd3v9B1Kk4jhL',
  poolAddress: 'FLMvqFXdm4kqLECR6yh9kvShDdGsK5WE5KqS68SbVKmk',
  feeRate: 0.0009 // 0.09% fee
}
