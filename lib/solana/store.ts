import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ArbitrageOpportunity, TradeHistory, BotConfig, PortfolioBalance } from './types'
import { POPULAR_TOKENS } from './types'

interface BotStore {
  // Bot Configuration
  config: BotConfig
  setConfig: (config: Partial<BotConfig>) => void

  // Arbitrage Opportunities
  opportunities: ArbitrageOpportunity[]
  setOpportunities: (opportunities: ArbitrageOpportunity[]) => void
  addOpportunity: (opportunity: ArbitrageOpportunity) => void
  updateOpportunityStatus: (id: string, status: ArbitrageOpportunity['status']) => void
  clearOpportunities: () => void

  // Trade History
  tradeHistory: TradeHistory[]
  addTrade: (trade: TradeHistory) => void
  clearTradeHistory: () => void

  // Portfolio
  portfolio: PortfolioBalance[]
  setPortfolio: (portfolio: PortfolioBalance[]) => void

  // Bot State
  isRunning: boolean
  setIsRunning: (running: boolean) => void
  isScanning: boolean
  setIsScanning: (scanning: boolean) => void
  lastScanTime: number | null
  setLastScanTime: (time: number) => void

  // Stats
  totalProfit: number
  totalTrades: number
  successfulTrades: number
  updateStats: () => void
}

const defaultConfig: BotConfig = {
  minProfitThreshold: 0.5,
  maxSlippage: 1.0,
  flashLoanAmount: 10,
  autoExecute: false,
  selectedTokens: POPULAR_TOKENS.slice(0, 4).map(t => t.address),
  rpcEndpoint: 'https://api.mainnet-beta.solana.com'
}

export const useBotStore = create<BotStore>()(
  persist(
    (set, get) => ({
      // Config
      config: defaultConfig,
      setConfig: (newConfig) =>
        set((state) => ({ config: { ...state.config, ...newConfig } })),

      // Opportunities
      opportunities: [],
      setOpportunities: (opportunities) => set({ opportunities }),
      addOpportunity: (opportunity) =>
        set((state) => ({
          opportunities: [opportunity, ...state.opportunities].slice(0, 50)
        })),
      updateOpportunityStatus: (id, status) =>
        set((state) => ({
          opportunities: state.opportunities.map((o) =>
            o.id === id ? { ...o, status } : o
          )
        })),
      clearOpportunities: () => set({ opportunities: [] }),

      // Trade History
      tradeHistory: [],
      addTrade: (trade) =>
        set((state) => {
          const newHistory = [trade, ...state.tradeHistory].slice(0, 100)
          return { tradeHistory: newHistory }
        }),
      clearTradeHistory: () => set({ tradeHistory: [] }),

      // Portfolio
      portfolio: [],
      setPortfolio: (portfolio) => set({ portfolio }),

      // Bot State
      isRunning: false,
      setIsRunning: (running) => set({ isRunning: running }),
      isScanning: false,
      setIsScanning: (scanning) => set({ isScanning: scanning }),
      lastScanTime: null,
      setLastScanTime: (time) => set({ lastScanTime: time }),

      // Stats
      totalProfit: 0,
      totalTrades: 0,
      successfulTrades: 0,
      updateStats: () => {
        const history = get().tradeHistory
        const totalProfit = history.reduce((acc, t) => acc + (t.status === 'success' ? t.profit : 0), 0)
        const totalTrades = history.length
        const successfulTrades = history.filter((t) => t.status === 'success').length
        set({ totalProfit, totalTrades, successfulTrades })
      }
    }),
    {
      name: 'flash-loan-bot-storage',
      partialize: (state) => ({
        config: state.config,
        tradeHistory: state.tradeHistory
      })
    }
  )
)
