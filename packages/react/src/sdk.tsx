import { AnonWorldSDK } from '@anonworld/sdk'
import { createContext, useContext, ReactNode, useMemo } from 'react'

interface SDKContextValue {
  sdk: AnonWorldSDK
}

export const SDKContext = createContext<SDKContextValue | undefined>(undefined)

export const SDKProvider = ({
  children,
  apiUrl,
}: { children: ReactNode; apiUrl?: string }) => {
  const sdk = useMemo(() => new AnonWorldSDK(apiUrl), [apiUrl])

  return <SDKContext.Provider value={{ sdk }}>{children}</SDKContext.Provider>
}

export const useSDK = () => {
  const context = useContext(SDKContext)
  if (!context) {
    throw new Error('useSDK must be used within an SDKProvider')
  }
  return context
}
