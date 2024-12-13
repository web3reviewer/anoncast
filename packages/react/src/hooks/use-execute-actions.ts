import { useState } from 'react'
import { useSDK } from '../sdk'
import { useAccount } from 'wagmi'
import { PerformAction, PerformActionData } from '@anonworld/sdk/types'

export type ExecuteActionsStatus =
  | {
      status: 'idle' | 'loading' | 'success'
    }
  | {
      status: 'error'
      error: string
    }

export const useExecuteActions = ({
  onSuccess,
  onError,
}: {
  onSuccess?: (
    response: {
      success: boolean
      hash?: string
      tweetId?: string
    }[]
  ) => void
  onError?: (error: string) => void
} = {}) => {
  const { sdk, credentials } = useSDK()
  const [status, setStatus] = useState<ExecuteActionsStatus>({ status: 'idle' })
  const { address } = useAccount()

  const executeActions = async (
    actions: { actionId: string; data: PerformActionData }[]
  ) => {
    try {
      if (!address) {
        throw new Error('Not connected')
      }

      setStatus({ status: 'loading' })

      const formattedActions: PerformAction[] = []
      for (const { actionId, data } of actions) {
        const credentialId =
          actionId === 'e6138573-7b2f-43ab-b248-252cdf5eaeee'
            ? 'erc20-balance:8453:0x0db510e79909666d6dec7f5e49370838c16d950f:5000000000000000000000'
            : 'erc20-balance:8453:0x0db510e79909666d6dec7f5e49370838c16d950f:2000000000000000000000000'

        let credential = credentials.get(credentialId)
        if (!credential) {
          credential = await credentials.add(credentialId)
        }

        if (!credential) {
          continue
        }

        formattedActions.push({
          actionId,
          data,
          credentials: [credential],
        })
      }

      const response = await sdk.executeActions(formattedActions)

      if (!response.data?.results[0].success) {
        throw new Error('Failed to perform actions')
      }

      setStatus({ status: 'success' })
      onSuccess?.(response.data.results)
    } catch (e) {
      console.error(e)
      setStatus({ status: 'error', error: 'Failed to perform action' })
      onError?.('Failed to perform action')
    }
  }

  return {
    executeActions,
    status,
  }
}
