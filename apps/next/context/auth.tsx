import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useEffect,
  useCallback,
} from 'react'
import { verifyMessage } from 'viem'
import { useAccount, useSignMessage } from 'wagmi'

interface AuthContextType {
  address: string | undefined
  isAuthenticated: boolean
  verifyAddress: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { address } = useAccount()
  const [authenticatedAddress, setAuthenticatedAddress] = useState<string | undefined>()
  const { signMessageAsync } = useSignMessage()

  const verifyAddress = useCallback(async () => {
    if (!address) return
    const message = `Login to anoncast. ${new Date().toISOString().split('T')[0]}`
    let signature = localStorage.getItem('signature')
    if (!signature) {
      signature = await signMessageAsync({ message })
    }
    const verifiedAddress = await verifyMessage({
      address,
      message,
      signature: signature as `0x${string}`,
    })
    if (verifiedAddress) {
      setAuthenticatedAddress(address)
      localStorage.setItem('signature', signature)
    } else {
      localStorage.removeItem('signature')
    }
  }, [signMessageAsync, address])

  useEffect(() => {
    verifyAddress()
  }, [verifyAddress])

  return (
    <AuthContext.Provider
      value={{
        address: authenticatedAddress,
        isAuthenticated: !!authenticatedAddress,
        verifyAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
