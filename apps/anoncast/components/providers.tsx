'use client'

import '@rainbow-me/rainbowkit/styles.css'

import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { base } from 'wagmi/chains'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { ThemeProvider } from 'next-themes'
import { SDKProvider } from '@anonworld/react'

const config = getDefaultConfig({
  appName: 'anoncast',
  projectId: '302e299e8d6c292b6aeb9f313321e134',
  chains: [base],
  ssr: true,
})

const queryClient = new QueryClient()

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      forcedTheme="dark"
      disableTransitionOnChange
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <SDKProvider apiUrl={process.env.NEXT_PUBLIC_API_URL}>
            <RainbowKitProvider>{children}</RainbowKitProvider>
          </SDKProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ThemeProvider>
  )
}
